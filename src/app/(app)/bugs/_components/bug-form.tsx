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
} from "@/lib/types";

const TEMPLATE = `## 重現步驟
1.
2.
3.

## 預期結果


## 實際結果

`;

export function BugForm({ modules }: { modules: Module[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [severity, setSeverity] = useState<BugSeverity>("P2");
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

    const { data, error: insertError } = await supabase
      .from("bugs")
      .insert({
        title: title.trim(),
        description,
        module_id: moduleId || null,
        severity,
        status: "pending",
        reporter_id: user.id,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "建立失敗");
      setSubmitting(false);
      return;
    }

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
