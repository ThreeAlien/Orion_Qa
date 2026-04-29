"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownRender } from "@/components/markdown-render";
import type { Comment } from "@/lib/types";

export function CommentSection({
  bugId,
  comments,
  currentUserId,
}: {
  bugId: string;
  comments: Comment[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("comments").insert({
      bug_id: bugId,
      author_id: currentUserId,
      body,
    });
    setBusy(false);
    if (error) {
      alert("送出失敗：" + error.message);
      return;
    }
    setBody("");
    router.refresh();
  }

  async function remove(commentId: string) {
    if (!confirm("刪除這則留言？")) return;
    const supabase = createClient();
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }
    router.refresh();
  }

  return (
    <section>
      <h2 className="text-base font-semibold mb-3">
        留言 <span className="text-muted-foreground font-normal">({comments.length})</span>
      </h2>

      <ul className="space-y-3 mb-4">
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                {c.author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.author.avatar_url}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                    {(c.author?.full_name || c.author?.email || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="text-sm">
                  <span className="font-medium">
                    {c.author?.full_name || c.author?.email}
                  </span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {format(new Date(c.created_at), "yyyy/MM/dd HH:mm")}
                  </span>
                </div>
              </div>
              {c.author_id === currentUserId && (
                <button
                  onClick={() => remove(c.id)}
                  className="text-xs text-muted-foreground hover:text-red-600 inline-flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  刪除
                </button>
              )}
            </div>
            <MarkdownRender source={c.body} />
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="space-y-2">
        <MarkdownEditor
          value={body}
          onChange={setBody}
          placeholder="寫下你的留言…支援 Markdown 跟貼圖"
          minRows={6}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !body.trim()} size="sm">
            {busy && <Loader2 size={14} className="animate-spin" />}
            送出留言
          </Button>
        </div>
      </form>
    </section>
  );
}
