"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Save, Trash2, X, Loader2, Archive, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { syncBugToPm } from "../_actions/sync-pm";
import { archiveBug, unarchiveBug } from "../_actions/archive";
import { revalidateBugList } from "../_actions/revalidate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownRender } from "@/components/markdown-render";
import { StatusChip } from "@/components/status-chip";
import { SeverityChip } from "@/components/severity-chip";
import {
  STATUS_OPTIONS,
  SEVERITY_OPTIONS,
  type Bug,
  type BugSeverity,
  type BugStatus,
  type Comment,
  type Module,
  type Profile,
} from "@/lib/types";
import { CommentSection } from "./comment-section";

export function BugDetail({
  bug,
  comments,
  modules,
  profiles,
  currentUserId,
}: {
  bug: Bug;
  comments: Comment[];
  modules: Module[];
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(bug.title);
  const [description, setDescription] = useState(bug.description);
  const [moduleId, setModuleId] = useState(bug.module_id ?? "");
  const [severity, setSeverity] = useState<BugSeverity>(bug.severity);
  const [status, setStatus] = useState<BugStatus>(bug.status);
  const [assigneeId, setAssigneeId] = useState(bug.assignee_id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  // syncMsg 3.5 秒自動消失
  useEffect(() => {
    if (!syncMsg) return;
    const t = setTimeout(() => setSyncMsg(null), 3500);
    return () => clearTimeout(t);
  }, [syncMsg]);

  const isReporter = bug.reporter_id === currentUserId;

  // 把改動後的狀態 / 處理人推到 Orion PM。Server action 自己判斷要不要建卡 / PATCH。
  async function syncToPm(args: {
    newStatus: BugStatus;
    newAssigneeId: string | null;
  }) {
    const result = await syncBugToPm({
      bugId: bug.id,
      externalTaskId: bug.external_task_id,
      newStatus: args.newStatus,
      newAssigneeId: args.newAssigneeId,
      reporterId: bug.reporter_id,
      title: bug.title,
      description: bug.description,
      severity: bug.severity,
    });
    if (!result.ok) {
      setSyncMsg({ kind: "error", text: `PM 同步失敗：${result.error}` });
      return;
    }
    if (result.action === "created") {
      setSyncMsg({ kind: "success", text: "已在 Orion PM 建立任務卡" });
      router.refresh();
    } else if (result.action === "updated") {
      setSyncMsg({ kind: "success", text: "已同步處理人到 Orion PM" });
    }
  }

  async function patch(fields: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("bugs").update(fields).eq("id", bug.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return false;
    }
    // 失效 /bugs 列表 RSC cache，回列表才看得到新 status / assignee
    await revalidateBugList();
    router.refresh();
    return true;
  }

  async function saveAll() {
    if (!title.trim()) {
      setError("標題不可空白");
      return;
    }
    const ok = await patch({
      title: title.trim(),
      description,
      module_id: moduleId || null,
      severity,
    });
    if (ok) setEditing(false);
  }

  async function changeStatus(s: BugStatus) {
    setStatus(s);
    const ok = await patch({ status: s });
    if (ok) await syncToPm({ newStatus: s, newAssigneeId: assigneeId || null });
  }

  async function changeAssignee(id: string) {
    const newId = id || null;
    setAssigneeId(id);
    const ok = await patch({ assignee_id: newId });
    if (ok) await syncToPm({ newStatus: status, newAssigneeId: newId });
  }

  async function changeSeverity(s: BugSeverity) {
    setSeverity(s);
    await patch({ severity: s });
  }

  async function deleteBug() {
    if (!confirm("確定要刪除這個問題單？此動作無法復原")) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("bugs").delete().eq("id", bug.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    await revalidateBugList();
    router.push("/bugs");
    router.refresh();
  }

  async function handleArchive() {
    if (!confirm("確定要封存這個問題單？（封存區可隨時還原）")) return;
    setBusy(true);
    setError(null);
    const result = await archiveBug(bug.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.pmError) {
      setSyncMsg({ kind: "error", text: `已封存，但 PM 同步失敗：${result.pmError}` });
    } else if (result.pmSynced) {
      setSyncMsg({ kind: "success", text: "已封存，並同步 PM 卡片" });
    } else {
      setSyncMsg({ kind: "success", text: "已封存" });
    }
    router.refresh();
  }

  async function handleUnarchive() {
    setBusy(true);
    setError(null);
    const result = await unarchiveBug(bug.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.pmError) {
      setSyncMsg({ kind: "error", text: `已還原，但 PM 同步失敗：${result.pmError}` });
    } else if (result.pmSynced) {
      setSyncMsg({ kind: "success", text: "已還原，並同步 PM 卡片" });
    } else {
      setSyncMsg({ kind: "success", text: "已還原" });
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          {editing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold h-auto py-2"
            />
          ) : (
            <h1 className="text-xl font-semibold tracking-tight leading-snug">
              {bug.title}
            </h1>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>
              回報：{bug.reporter?.full_name || bug.reporter?.email}
            </span>
            <span>
              建立於 {format(new Date(bug.created_at), "yyyy/MM/dd HH:mm", { locale: zhTW })}
            </span>
            {bug.updated_at !== bug.created_at && (
              <span>
                最後更新 {format(new Date(bug.updated_at), "yyyy/MM/dd HH:mm")}
              </span>
            )}
          </div>
        </div>

        {/* Inline metadata: status / severity / module / assignee */}
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-border bg-muted/30">
          <Meta label="狀態">
            {editing ? null : <StatusChip status={status} />}
            <Select
              value={status}
              onChange={(e) => changeStatus(e.target.value as BugStatus)}
              disabled={busy}
              className="h-8 text-xs mt-1"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Meta>

          <Meta label="嚴重程度">
            {editing ? null : <SeverityChip severity={severity} />}
            <Select
              value={severity}
              onChange={(e) => changeSeverity(e.target.value as BugSeverity)}
              disabled={busy}
              className="h-8 text-xs mt-1"
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Meta>

          <Meta label="功能模組">
            {editing ? (
              <Select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="h-8 text-xs"
              >
                <option value="">— 未指定 —</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="text-sm">
                {bug.module?.name ?? "—"}
              </span>
            )}
          </Meta>

          <Meta label="處理人">
            <Select
              value={assigneeId}
              onChange={(e) => changeAssignee(e.target.value)}
              disabled={busy}
              className="h-8 text-xs"
            >
              <option value="">— 未指派 —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </option>
              ))}
            </Select>
          </Meta>
        </div>

        {/* Description */}
        <div className="p-5">
          {editing ? (
            <MarkdownEditor value={description} onChange={setDescription} />
          ) : (
            <MarkdownRender source={description || "_（無描述）_"} />
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-xs text-red-600">儲存失敗：{error}</span>
            )}
            {syncMsg && (
              <span
                className={`text-xs ${
                  syncMsg.kind === "success"
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              >
                {syncMsg.text}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setTitle(bug.title);
                    setDescription(bug.description);
                    setModuleId(bug.module_id ?? "");
                    setSeverity(bug.severity);
                    setError(null);
                  }}
                  disabled={busy}
                >
                  <X size={14} />
                  取消
                </Button>
                <Button size="sm" onClick={saveAll} disabled={busy}>
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  儲存
                </Button>
              </>
            ) : (
              <>
                {isReporter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deleteBug}
                    disabled={busy}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    刪除
                  </Button>
                )}
                {bug.archived ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUnarchive}
                    disabled={busy}
                  >
                    <RotateCcw size={14} />
                    還原
                  </Button>
                ) : bug.status === "done" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleArchive}
                    disabled={busy}
                  >
                    <Archive size={14} />
                    封存
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  <Edit3 size={14} />
                  編輯
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <CommentSection
        bugId={bug.id}
        comments={comments}
        currentUserId={currentUserId}
      />
    </div>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}
