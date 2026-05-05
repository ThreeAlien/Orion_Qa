"use server";

// 把 bug 處理人變動同步到 Orion PM。
// 觸發點：bug-detail.tsx 改 assignee；bug-form.tsx 建單時帶 assignee。
// 規則：
//   1. 有 assignee + 沒 external_task_id → POST 建卡，寫回 id（不依賴 status，指派當下就建）
//   2. 已有 external_task_id → PATCH PM 卡 assignee（含改 null = 拔掉處理人）
//   3. 其他組合（沒 assignee 也沒卡）→ 不打 PM
// 失敗不 throw，回 { ok: false, error }，由 client 顯示 toast，不擋主流程。

import { createClient } from "@/lib/supabase/server";
import type { BugSeverity, BugStatus } from "@/lib/types";

const PRIORITY_BY_SEVERITY: Record<BugSeverity, "LOW" | "MEDIUM" | "HIGH"> = {
  P0: "HIGH",
  P1: "HIGH",
  P2: "MEDIUM",
  P3: "LOW",
};

// 推算 PM 卡 status：
//   - QA bug status === 'done' → DONE
//   - QA bug status === 'pending_acceptance' → WAITING_REVIEW（QA 端標待驗收）
//   - 沒處理人 → TODO
//   - 指派給 reporter（修完丟回去驗收）→ WAITING_REVIEW
//   - 指派給其他人（修中）→ IN_PROGRESS
function pmStatusFromBug(
  qaStatus: BugStatus,
  newAssigneeId: string | null,
  reporterId: string
): "TODO" | "IN_PROGRESS" | "WAITING_REVIEW" | "DONE" {
  if (qaStatus === "done") return "DONE";
  if (qaStatus === "pending_acceptance") return "WAITING_REVIEW";
  if (newAssigneeId === null) return "TODO";
  if (newAssigneeId === reporterId) return "WAITING_REVIEW";
  return "IN_PROGRESS";
}

export type SyncBugInput = {
  bugId: string;
  externalTaskId: string | null;
  newStatus: BugStatus;
  newAssigneeId: string | null;
  reporterId: string;
  title: string;
  description: string;
  severity: BugSeverity;
};

export type SyncBugResult =
  | { ok: true; action: "none" | "created" | "updated"; taskId?: string }
  | { ok: false; error: string };

export async function syncBugToPm(
  input: SyncBugInput
): Promise<SyncBugResult> {
  // 用 == null / != null 同時涵蓋 null 與 undefined
  // （server 端 select 沒帶 external_task_id 欄位時會是 undefined）
  const shouldCreate =
    input.newAssigneeId !== null && input.externalTaskId == null;
  const shouldUpdate = input.externalTaskId != null;

  if (!shouldCreate && !shouldUpdate) {
    return { ok: true, action: "none" };
  }

  const baseUrl = process.env.PM_API_BASE_URL;
  const apiKey = process.env.PM_API_KEY;
  if (!baseUrl || !apiKey) {
    console.error("[syncBugToPm] PM_API_BASE_URL / PM_API_KEY 未設定");
    return { ok: false, error: "PM API 環境變數未設定" };
  }

  const supabase = await createClient();

  // Pre-flight: 確認 bugs 表已有 external_task_id 欄位（migration 0002 跑了）。
  // 沒跑就直接 abort — 否則 POST PM 會成功但 QA 寫回失敗，下次又重建一張。
  const { error: schemaErr } = await supabase
    .from("bugs")
    .select("external_task_id")
    .limit(1);
  if (schemaErr) {
    console.error("[syncBugToPm] schema 缺欄位", schemaErr);
    return {
      ok: false,
      error:
        "Supabase 缺 bugs.external_task_id 欄位，請先跑 migration 0002 add column 那段",
    };
  }

  // assigneeId → email（null = 拔掉處理人）
  let assigneeEmail: string | null = null;
  if (input.newAssigneeId) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", input.newAssigneeId)
      .maybeSingle();
    if (error || !profile) {
      console.error(
        "[syncBugToPm] 找不到 profile",
        input.newAssigneeId,
        error
      );
      return { ok: false, error: "找不到處理人 profile" };
    }
    assigneeEmail = profile.email;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const pmStatus = pmStatusFromBug(
    input.newStatus,
    input.newAssigneeId,
    input.reporterId
  );

  // PM 卡 description 故意保持精簡 — 只放 QA detail link。
  // 原因：PM description 不支援 markdown 渲染，塞 QA 原文 md 反而醜。
  // 看 detail 點 link 回 QA 看正規 markdown 渲染。
  const qaDetailUrl = `https://orion-qa.vercel.app/bugs/${input.bugId}`;
  const pmDescription = `🔗 來源：${qaDetailUrl}`;

  if (shouldCreate) {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/external/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: input.title,
          description: pmDescription,
          assigneeEmail,
          priority: PRIORITY_BY_SEVERITY[input.severity],
          status: pmStatus,
        }),
        cache: "no-store",
      });
    } catch (e) {
      console.error("[syncBugToPm] POST 連線失敗", e);
      return { ok: false, error: "PM 建卡連線失敗" };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[syncBugToPm] POST non-2xx", res.status, text);
      return { ok: false, error: `PM 建卡失敗 (${res.status})` };
    }
    const data = (await res.json().catch(() => null)) as
      | { ok: boolean; id?: string }
      | null;
    if (!data?.ok || !data.id) {
      console.error("[syncBugToPm] POST 回應異常", data);
      return { ok: false, error: "PM 建卡回應異常" };
    }

    const { error: updErr } = await supabase
      .from("bugs")
      .update({ external_task_id: data.id })
      .eq("id", input.bugId);
    if (updErr) {
      console.error("[syncBugToPm] 寫回 external_task_id 失敗", updErr);
      return { ok: false, error: "PM 卡已建立但寫回 id 失敗" };
    }
    return { ok: true, action: "created", taskId: data.id };
  }

  // shouldUpdate
  let res: Response;
  try {
    res = await fetch(
      `${baseUrl}/api/external/tasks/${input.externalTaskId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          assigneeEmail,
          status: pmStatus,
          description: pmDescription,
        }),
        cache: "no-store",
      }
    );
  } catch (e) {
    console.error("[syncBugToPm] PATCH 連線失敗", e);
    return { ok: false, error: "PM 改派連線失敗" };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[syncBugToPm] PATCH non-2xx", res.status, text);
    return { ok: false, error: `PM 改派失敗 (${res.status})` };
  }
  return { ok: true, action: "updated", taskId: input.externalTaskId! };
}
