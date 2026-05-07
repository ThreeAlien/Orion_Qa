"use server";

// 封存 / 還原 bug。
// 動作：
//   1. 更新 Supabase bugs.archived + archived_at
//   2. 同步 Orion PM：若有 external_task_id，PATCH PM 卡 archived 同步狀態
// PM 同步失敗不擋主流程，回 ok: false + error 給 client 顯示 toast。

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ArchiveResult =
  | { ok: true; pmSynced: boolean; pmError?: string }
  | { ok: false; error: string };

async function patchPmArchived(
  externalTaskId: string,
  archived: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const baseUrl = process.env.PM_API_BASE_URL;
  const apiKey = process.env.PM_API_KEY;
  if (!baseUrl || !apiKey) {
    return { ok: false, error: "PM API 環境變數未設定" };
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/external/tasks/${externalTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ archived }),
      cache: "no-store",
    });
  } catch (e) {
    console.error("[archive] PM PATCH 連線失敗", e);
    return { ok: false, error: "PM 連線失敗" };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[archive] PM PATCH non-2xx", res.status, text);
    return { ok: false, error: `PM 同步失敗 (${res.status})` };
  }
  return { ok: true };
}

async function setBugArchived(
  bugId: string,
  archived: boolean
): Promise<ArchiveResult> {
  const supabase = await createClient();

  // 先取 external_task_id 以決定要不要 sync PM
  const { data: bug, error: fetchErr } = await supabase
    .from("bugs")
    .select("external_task_id")
    .eq("id", bugId)
    .maybeSingle();
  if (fetchErr || !bug) {
    return { ok: false, error: "找不到該問題單" };
  }

  const { error: updErr } = await supabase
    .from("bugs")
    .update({
      archived,
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq("id", bugId);
  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  // 失效列表 cache
  revalidatePath("/bugs");
  revalidatePath(`/bugs/${bugId}`);

  // PM 同步：有對應卡才打
  if (!bug.external_task_id) {
    return { ok: true, pmSynced: false };
  }
  const pmResult = await patchPmArchived(bug.external_task_id, archived);
  if (!pmResult.ok) {
    return { ok: true, pmSynced: false, pmError: pmResult.error };
  }
  return { ok: true, pmSynced: true };
}

export async function archiveBug(bugId: string): Promise<ArchiveResult> {
  return setBugArchived(bugId, true);
}

export async function unarchiveBug(bugId: string): Promise<ArchiveResult> {
  return setBugArchived(bugId, false);
}
