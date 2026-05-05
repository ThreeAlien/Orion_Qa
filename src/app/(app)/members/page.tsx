import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberRow } from "./_components/member-row";
import type { Profile } from "@/lib/types";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: selfProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!selfProfile?.is_admin) redirect("/bugs");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, is_admin, created_at")
    .order("created_at", { ascending: true });

  const list = (profiles ?? []) as Profile[];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">成員管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          共 {list.length} 位成員 · 任何人用 Google 帳號登入即自動加入
        </p>
      </header>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {list.length > 0 ? (
          <ul className="divide-y divide-border">
            {list.map((p) => (
              <MemberRow key={p.id} profile={p} isMe={p.id === user.id} />
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">
            還沒有任何成員
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-muted-foreground space-y-1">
        <p>
          · 加入流程：成員自己用 Google 帳號從登入頁進入即可，第一個註冊的會自動取得 admin
        </p>
        <p>
          · 移除動作會刪掉 Supabase auth.users 對應 row，user 之後重新登入會以新身份建立 profile
        </p>
        <p>
          · 若該 user 是某 bug 的「回報人」，FK 會擋下移除（reporter on delete restrict），請先把那些 bug 刪掉或改回報人
        </p>
      </div>
    </div>
  );
}
