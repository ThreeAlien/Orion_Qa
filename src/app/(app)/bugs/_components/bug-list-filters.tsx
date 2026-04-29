"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { STATUS_OPTIONS, SEVERITY_OPTIONS, type Module, type Profile } from "@/lib/types";

export function BugListFilters({
  modules,
  profiles,
}: {
  modules: Module[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.push(`/bugs?${next.toString()}`));
  }

  function clearAll() {
    start(() => router.push("/bugs"));
  }

  const hasFilters = ["status", "module", "severity", "assignee", "q"].some((k) =>
    params.get(k)
  );

  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          placeholder="搜尋標題…"
          defaultValue={params.get("q") ?? ""}
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              set("q", (e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>

      <Select
        value={params.get("status") ?? ""}
        onChange={(e) => set("status", e.target.value)}
        className="w-[120px]"
      >
        <option value="">全部狀態</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>

      <Select
        value={params.get("severity") ?? ""}
        onChange={(e) => set("severity", e.target.value)}
        className="w-[140px]"
      >
        <option value="">全部嚴重度</option>
        {SEVERITY_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>

      <Select
        value={params.get("module") ?? ""}
        onChange={(e) => set("module", e.target.value)}
        className="w-[160px]"
      >
        <option value="">全部模組</option>
        {modules.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>

      <Select
        value={params.get("assignee") ?? ""}
        onChange={(e) => set("assignee", e.target.value)}
        className="w-[160px]"
      >
        <option value="">全部處理人</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name || p.email}
          </option>
        ))}
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={pending}
        >
          <X size={14} />
          清除
        </Button>
      )}
    </div>
  );
}
