"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MarkdownEditor } from "@/components/markdown-editor";
import {
  SEVERITY_OPTIONS,
  type Module,
  type BugSeverity,
  type Profile,
} from "@/lib/types";
import { syncBugToPm } from "../_actions/sync-pm";
import { revalidateBugList } from "../_actions/revalidate";

const TEMPLATE = `## 重現步驟
1.
2.
3.

## 預期結果


## 實際結果

`;

export function BugForm({
  modules,
  profiles,
}: {
  modules: Module[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [severity, setSeverity] = useState<BugSeverity>("P2");
  const [assigneeId, setAssigneeId] = useState("");
  const [description, setDescription] = useState(TEMPLATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("請填寫標題");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("登入逾時，請重新登入");
      setSubmitting(false);
      return;
    }

    const newAssigneeId = assigneeId || null;
    const { data, error: insertError } = await supabase
      .from("bugs")
      .insert({
        title: title.trim(),
        description,
        module_id: moduleId || null,
        severity,
        status: "pending",
        reporter_id: user.id,
        assignee_id: newAssigneeId,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "建立失敗");
      setSubmitting(false);
      return;
    }

    // 有指派處理人 → 同步到 PM 開卡（失敗不擋建單流程）
    if (newAssigneeId) {
      await syncBugToPm({
        bugId: data.id,
        externalTaskId: null,
        newStatus: "pending",
        newAssigneeId,
        reporterId: user.id,
        title: title.trim(),
        description,
        severity,
      });
    }

    await revalidateBugList();
    router.push(`/bugs/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="標題" required>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="一句話描述問題，例：文章列表分頁器在 1440px 對齊跑掉"
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="功能模組">
          <Select
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="嚴重程度">
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as BugSeverity)}
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="處理人（指派後 PM 自動開卡）">
        <Select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
        >
          <option value="">— 暫不指派 —</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name || p.email}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="描述（支援 Markdown / Ctrl+V 貼圖）">
        <MarkdownEditor value={description} onChange={setDescription} />
      </Field>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={submitting}
        >
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? "送出中…" : "建立問題"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
