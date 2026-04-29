"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Module } from "@/lib/types";

export function ModulesEditor({ initial }: { initial: Module[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    setBusy("add");
    setError(null);
    const supabase = createClient();
    const maxOrder = Math.max(0, ...initial.map((m) => m.sort_order));
    const { error } = await supabase.from("modules").insert({
      code: newCode.trim(),
      name: newName.trim(),
      sort_order: maxOrder + 10,
      is_active: true,
    });
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    setNewCode("");
    setNewName("");
    setAdding(false);
    router.refresh();
  }

  async function toggleActive(m: Module) {
    setBusy(m.id);
    const supabase = createClient();
    await supabase
      .from("modules")
      .update({ is_active: !m.is_active })
      .eq("id", m.id);
    setBusy(null);
    router.refresh();
  }

  async function rename(m: Module, name: string) {
    if (name === m.name || !name.trim()) return;
    setBusy(m.id);
    const supabase = createClient();
    await supabase.from("modules").update({ name }).eq("id", m.id);
    setBusy(null);
    router.refresh();
  }

  async function remove(m: Module) {
    if (!confirm(`刪除模組「${m.name}」？已歸類到此模組的 bug 會變成「未指定」`))
      return;
    setBusy(m.id);
    const supabase = createClient();
    const { error } = await supabase.from("modules").delete().eq("id", m.id);
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ul className="divide-y divide-border">
          {initial.map((m) => (
            <li
              key={m.id}
              className="px-4 py-3 flex items-center gap-3"
            >
              <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0 min-w-[140px]">
                {m.code}
              </code>
              <Input
                defaultValue={m.name}
                onBlur={(e) => rename(m, e.target.value)}
                disabled={busy === m.id}
                className="h-9"
              />
              <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={m.is_active}
                  onChange={() => toggleActive(m)}
                  disabled={busy === m.id}
                />
                啟用
              </label>
              <button
                onClick={() => remove(m)}
                disabled={busy === m.id}
                className="text-muted-foreground hover:text-red-600 p-1 shrink-0"
              >
                {busy === m.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {adding ? (
        <form
          onSubmit={add}
          className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">
                代號 (英文 / 連字號)
              </span>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="例：billing-manage"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">
                顯示名稱
              </span>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例：金流管理"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setNewCode("");
                setNewName("");
              }}
            >
              取消
            </Button>
            <Button type="submit" size="sm" disabled={busy === "add"}>
              {busy === "add" && <Loader2 size={14} className="animate-spin" />}
              新增
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={14} />
          新增模組
        </Button>
      )}
    </div>
  );
}
