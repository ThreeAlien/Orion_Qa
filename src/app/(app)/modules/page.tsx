import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ModulesEditor } from "./_components/modules-editor";
import type { Module } from "@/lib/types";

export default async function ModulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold mb-2">需要管理員權限</h1>
          <p className="text-sm text-muted-foreground">
            模組管理只開放給管理員。請聯絡你們的 admin。
          </p>
        </div>
      </div>
    );
  }

  const { data: modules } = await supabase
    .from("modules")
    .select("id, code, name, is_active, sort_order")
    .order("sort_order");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">功能模組管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          管理 bug 回報時可選的功能模組分類
        </p>
      </header>

      <ModulesEditor initial={(modules ?? []) as Module[]} />
    </div>
  );
}
