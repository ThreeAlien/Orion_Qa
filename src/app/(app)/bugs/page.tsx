import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BugListFilters } from "./_components/bug-list-filters";
import { BugRow } from "./_components/bug-row";
import { BackfillButton } from "./_components/backfill-button";
import type { Bug, Module, Profile } from "@/lib/types";

type SearchParams = Promise<{
  status?: string;
  module?: string;
  severity?: string;
  assignee?: string;
  q?: string;
}>;

export default async function BugListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // 抓登入者 id + admin 旗標：列表用來標出「指派給我」的 row、admin 看得到 backfill 按鈕
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  let isAdmin = false;
  let unsyncedCount = 0;
  let dbgInfo = "";
  if (currentUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", currentUserId)
      .maybeSingle();
    isAdmin = !!profile?.is_admin;
    if (isAdmin) {
      const { count } = await supabase
        .from("bugs")
        .select("id", { count: "exact", head: true })
        .not("assignee_id", "is", null)
        .is("external_task_id", null);
      unsyncedCount = count ?? 0;

      const { data: dbgBugs } = await supabase
        .from("bugs")
        .select("id, assignee_id, external_task_id");
      const total = dbgBugs?.length ?? 0;
      const hasAssignee =
        dbgBugs?.filter((b) => b.assignee_id !== null).length ?? 0;
      const hasExternal =
        dbgBugs?.filter((b) => b.external_task_id !== null).length ?? 0;
      const externalNullKeyExists =
        dbgBugs && dbgBugs[0]
          ? "external_task_id" in dbgBugs[0]
          : false;
      dbgInfo = ` total=${total} hasAssignee=${hasAssignee} hasExternal=${hasExternal} colExists=${externalNullKeyExists}`;
    }
  }

  let query = supabase
    .from("bugs")
    .select(
      `
      id, title, description, status, severity, created_at, updated_at,
      module:modules(id, code, name),
      reporter:profiles!bugs_reporter_id_fkey(id, email, full_name, avatar_url),
      assignee:profiles!bugs_assignee_id_fkey(id, email, full_name, avatar_url)
    `
    )
    .order("created_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.module) query = query.eq("module_id", params.module);
  if (params.severity) query = query.eq("severity", params.severity);
  if (params.assignee) query = query.eq("assignee_id", params.assignee);
  if (params.q) query = query.ilike("title", `%${params.q}%`);

  const [{ data: bugs, error }, { data: modules }, { data: profiles }] =
    await Promise.all([
      query,
      supabase
        .from("modules")
        .select("id, code, name, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("profiles").select("id, email, full_name, avatar_url"),
    ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">問題列表</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            共 {bugs?.length ?? 0} 筆
            <span data-testid="dbg" className="ml-2 text-xs opacity-50">
              [dbg admin={String(isAdmin)} unsynced={unsyncedCount}
              {dbgInfo}]
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && <BackfillButton pendingCount={unsyncedCount} />}
          <Link href="/bugs/new">
            <Button>
              <Plus size={16} />
              回報新問題
            </Button>
          </Link>
        </div>
      </header>

      <BugListFilters
        modules={(modules ?? []) as Module[]}
        profiles={(profiles ?? []) as Profile[]}
      />

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          載入失敗：{error.message}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border bg-card overflow-hidden">
        {bugs && bugs.length > 0 ? (
          <ul className="divide-y divide-border">
            {(bugs as unknown as Bug[]).map((bug) => (
              <BugRow
                key={bug.id}
                bug={bug}
                currentUserId={currentUserId}
              />
            ))}
          </ul>
        ) : (
          <div className="px-6 py-16 text-center text-muted-foreground text-sm">
            還沒有任何問題單
            <div className="mt-3">
              <Link href="/bugs/new">
                <Button size="sm">回報第一個問題</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
