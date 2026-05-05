"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type RemoveMemberResult =
  | { ok: true }
  | { ok: false; error: string };

// 移除成員 = 刪 auth.users → cascade 刪 profiles row。
// 該 user 既有 reporter / assignee bug 跟 comments 因 onDelete: restrict / set null
// 在 RLS / FK 層處理（reporter restrict 會擋）。實際上 schema reporter 是 restrict,
// 移除前會被 FK 擋。所以實際只能砍「沒回報任何 bug 的成員」— 之後若需要可再決定怎麼處理 reporter。
export async function removeMember(
  userId: string
): Promise<RemoveMemberResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };
  if (user.id === userId) return { ok: false, error: "不能移除自己" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: "僅限管理員" };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Supabase admin client 無法初始化",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/members");
  revalidatePath("/bugs");
  return { ok: true };
}
