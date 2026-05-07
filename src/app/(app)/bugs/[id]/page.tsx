import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BugDetail } from "../_components/bug-detail";
import type { Bug, Comment, Module, Profile } from "@/lib/types";

export default async function BugDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: bug, error },
    { data: comments },
    { data: modules },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("bugs")
      .select(
        `
        id, title, description, status, severity, module_id, reporter_id, assignee_id,
        external_task_id, archived, archived_at, created_at, updated_at,
        module:modules(id, code, name),
        reporter:profiles!bugs_reporter_id_fkey(id, email, full_name, avatar_url),
        assignee:profiles!bugs_assignee_id_fkey(id, email, full_name, avatar_url)
      `
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("comments")
      .select(
        `id, bug_id, body, created_at, author_id,
         author:profiles!comments_author_id_fkey(id, email, full_name, avatar_url)`
      )
      .eq("bug_id", id)
      .order("created_at"),
    supabase
      .from("modules")
      .select("id, code, name, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("profiles").select("id, email, full_name, avatar_url"),
  ]);

  if (error || !bug) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/bugs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={14} />
        回列表
      </Link>

      <BugDetail
        bug={bug as unknown as Bug}
        comments={(comments ?? []) as unknown as Comment[]}
        modules={(modules ?? []) as Module[]}
        profiles={(profiles ?? []) as Profile[]}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}
