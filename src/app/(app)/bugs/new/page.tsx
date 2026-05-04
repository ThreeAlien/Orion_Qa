import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BugForm } from "../_components/bug-form";
import type { Module, Profile } from "@/lib/types";

export default async function NewBugPage() {
  const supabase = await createClient();
  const [{ data: modules }, { data: profiles }] = await Promise.all([
    supabase
      .from("modules")
      .select("id, code, name, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("profiles").select("id, email, full_name, avatar_url"),
  ]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        href="/bugs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={14} />
        回列表
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">
        回報新問題
      </h1>
      <BugForm
        modules={(modules ?? []) as Module[]}
        profiles={(profiles ?? []) as Profile[]}
      />
    </div>
  );
}
