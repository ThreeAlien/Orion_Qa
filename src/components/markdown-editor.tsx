"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Eye, Edit3, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRender } from "@/components/markdown-render";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const BUCKET = "bug-attachments";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minRows = 12,
}: Props) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  async function uploadAndInsert(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("未登入");

      const ext = file.name.split(".").pop() || "png";
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${user.id}/${Date.now()}-${safeName || `paste.${ext}`}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub.publicUrl;
      const md = `![${safeName}](${url})`;

      const ta = ref.current;
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = value.slice(0, start) + md + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
          ta.focus();
          const pos = start + md.length;
          ta.setSelectionRange(pos, pos);
        });
      } else {
        onChange(value + "\n" + md);
      }
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await uploadAndInsert(file);
          return;
        }
      }
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) {
      e.preventDefault();
      for (const f of files) {
        await uploadAndInsert(f);
      }
    }
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      if (f.type.startsWith("image/")) await uploadAndInsert(f);
    }
    e.target.value = "";
  }

  return (
    <div className="rounded-md border border-border bg-input overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-2 py-1.5">
        <div className="flex">
          <TabButton
            active={tab === "edit"}
            onClick={() => setTab("edit")}
            icon={<Edit3 size={14} />}
            label="編輯"
          />
          <TabButton
            active={tab === "preview"}
            onClick={() => setTab("preview")}
            icon={<Eye size={14} />}
            label="預覽"
          />
        </div>
        <div className="flex items-center gap-2">
          {uploading && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              上傳中…
            </span>
          )}
          <label className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted">
            <ImageIcon size={14} />
            插入圖片
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </label>
        </div>
      </div>

      {tab === "edit" ? (
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          placeholder={
            placeholder ||
            "在這裡描述問題…\n支援 Markdown、Ctrl+V 直接貼上截圖、拖曳圖片"
          }
          rows={minRows}
          className="border-0 rounded-none font-mono leading-relaxed resize-y min-h-[280px]"
        />
      ) : (
        <div className="p-4 min-h-[280px]">
          {value.trim() ? (
            <MarkdownRender source={value} />
          ) : (
            <p className="text-sm text-muted-foreground">（尚無內容）</p>
          )}
        </div>
      )}

      {uploadError && (
        <div className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          上傳失敗：{uploadError}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
