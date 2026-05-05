// Supabase service_role client — 僅 server side，繞過 RLS。
// 用於 admin 操作（如刪除 auth.users）。絕不可被 client component import。
// SUPABASE_SERVICE_ROLE_KEY 不可加 NEXT_PUBLIC_ 前綴。

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "缺 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，無法跑 admin 操作"
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
