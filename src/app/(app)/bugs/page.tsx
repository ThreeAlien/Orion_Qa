import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BugListFilters } from "./_components/bug-list-filters";
import { BugRow } from "./_components/bug-row";
import { BackfillButton } from "./_components/backfill-button";
import { cn } from "@/lib/utils";
import type { Bug, Module, Profile } from "@/lib/types";

type SearchParams = Promise<{
  status?: string;
  module?: string;
  severity?: string;
  assignee?: string;
  q?: string;
  view?: "active" | "archived";
}>;

export default async function BugListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const view = params.view === "archived" ? "archived" : "active";
  const supabase = await createClient();

  // 抓登入者 id + admin 旗標：列表用來標出「指派給我」的 row、admin 看得到 backfill 按鈕
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  let isAdmin = false;
  let unsyncedCount = 0;
  if (currentUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", currentUserId)
      .maybeSingle();
    isAdmin = !!profile?.is_admin;
    if (isAdmin) {
      // 算「有處理人」的全部數量（給 backfill / 重整按鈕 label 用）
      const { count, error: countErr } = await supabase
        .from("bugs")
        .select("id", { count: "exact", head: true })
        .not("assignee_id", "is", null);
      if (!countErr) {
        unsyncedCount = count ?? 0;
      }
    }
  }

  let query = supabase
    .from("bugs")
    .select(
      `
      id, title, description, status, severity, archived, archived_at, created_at, updated_at, external_task_id,
      module:modules(id, code, name),
      reporter:profiles!bugs_reporter_id_fkey(id, email, full_name, avatar_url),
      assignee:profiles!bugs_assignee_id_fkey(id, email, full_name, avatar_url)
    `
    );

  // 封存區依封存時間排序，進行中依建立時間
  query =
    view === "archived"
      ? query.eq("archived", true).order("archived_at", { ascending: false })
      : query.eq("archived", false).order("created_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.module) query = query.eq("module_id", params.module);
  if (params.severity) query = query.eq("severity", params.severity);
  if (params.assignee) query = query.eq("assignee_id", params.assignee);
  if (params.q) query = query.ilike("title", `%${params.q}%`);

  const [
    { data: bugs, error },
    { data: modules },
    { data: profiles },
    { count: activeCount },
    { count: archivedCount },
  ] = await Promise.all([
    query,
    supabase
      .from("modules")
      .select("id, code, name, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("profiles").select("id, email, full_name, avatar_url"),
    supabase
      .from("bugs")
      .select("id", { count: "exact", head: true })
      .eq("archived", false),
    supabase
      .from("bugs")
      .select("id", { count: "exact", head: true })
      .eq("archived", true),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">問題列表</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {view === "archived" ? "封存區 ・ " : ""}共 {bugs?.length ?? 0} 筆
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && view === "active" && (
            <BackfillButton pendingCount={unsyncedCount} />
          )}
          {view === "active" && (
            <Link href="/bugs/new">
              <Button>
                <Plus size={16} />
                回報新問題
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="mb-3 inline-flex rounded-lg border border-border bg-card p-1 text-sm">
        <Link
          href="/bugs"
          className={cn(
            "px-3 py-1.5 rounded-md transition-colors",
            view === "active"
              ? "bg-primary text-white font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          進行中 <span className="tabular-nums">({activeCount ?? 0})</span>
        </Link>
        <Link
          href="/bugs?view=archived"
          className={cn(
            "px-3 py-1.5 rounded-md transition-colors",
            view === "archived"
              ? "bg-primary text-white font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          封存區 <span className="tabular-nums">({archivedCount ?? 0})</span>
        </Link>
      </div>

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
                view={view}
              />
            ))}
          </ul>
        ) : view === "archived" ? (
          <div className="px-6 py-16 text-center text-muted-foreground text-sm">
            封存區是空的 — 已測試完畢的問題單封存後會出現在這裡，可隨時還原
          </div>
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
