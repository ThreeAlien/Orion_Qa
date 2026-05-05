"use server";

// 把「有處理人但還沒對應 PM 卡」的 bug 一次補建到 Orion PM。
// admin only。給歷史資料 + 邏輯改版前留下的 bug 用。
// 之後新建 / 改派的 bug 會在當下自動 sync，不需要再跑這個。

import { createClient } from "@/lib/supabase/server";
import { syncBugToPm, type SyncBugResult } from "./sync-pm";
import type { BugSeverity, BugStatus } from "@/lib/types";

export type BackfillResult = {
  ok: boolean;
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: { bugId: string; title: string; error: string }[];
  message?: string;
};

export async function backfillPmCards(): Promise<BackfillResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      message: "未登入",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return {
      ok: false,
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      message: "僅限管理員",
    };
  }

  // 全部「有處理人」的 bug：未連結的會 POST 新建，已連結的會 PATCH 更新
  // （讓 description / status 跟著最新邏輯重整一次）
  const { data: bugs, error } = await supabase
    .from("bugs")
    .select(
      "id, title, description, severity, status, reporter_id, assignee_id, external_task_id"
    )
    .not("assignee_id", "is", null);

  if (error) {
    return {
      ok: false,
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      message: `查詢失敗：${error.message}`,
    };
  }

  if (!bugs || bugs.length === 0) {
    return {
      ok: true,
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      message: "沒有有處理人的 bug",
    };
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: { bugId: string; title: string; error: string }[] = [];

  for (const bug of bugs) {
    const result: SyncBugResult = await syncBugToPm({
      bugId: bug.id,
      externalTaskId: bug.external_task_id,
      newStatus: bug.status as BugStatus,
      newAssigneeId: bug.assignee_id,
      reporterId: bug.reporter_id,
      title: bug.title,
      description: bug.description ?? "",
      severity: bug.severity as BugSeverity,
    });
    if (result.ok && result.action === "created") {
      created++;
    } else if (result.ok && result.action === "updated") {
      updated++;
    } else if (!result.ok) {
      failed++;
      errors.push({ bugId: bug.id, title: bug.title, error: result.error });
    }
  }

  return {
    ok: true,
    total: bugs.length,
    created,
    updated,
    failed,
    errors,
  };
}
