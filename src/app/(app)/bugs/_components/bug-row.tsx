"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type MouseEvent } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Archive, RotateCcw, Loader2 } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { SeverityChip } from "@/components/severity-chip";
import { cn } from "@/lib/utils";
import { archiveBug, unarchiveBug } from "../_actions/archive";
import type { Bug } from "@/lib/types";

export function BugRow({
  bug,
  currentUserId,
  view,
}: {
  bug: Bug;
  currentUserId: string | null;
  view: "active" | "archived";
}) {
  const isMine = !!currentUserId && bug.assignee?.id === currentUserId;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // 進行中 view：done 才能封存（避免誤封進行中的）
  const canArchive = view === "active" && bug.status === "done";
  const canUnarchive = view === "archived";

  function stop(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleArchive(e: MouseEvent) {
    stop(e);
    if (!confirm(`確定要封存「${bug.title}」？（封存區可隨時還原）`)) return;
    startTransition(async () => {
      const result = await archiveBug(bug.id);
      if (!result.ok) {
        alert(`封存失敗：${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  function handleUnarchive(e: MouseEvent) {
    stop(e);
    startTransition(async () => {
      const result = await unarchiveBug(bug.id);
      if (!result.ok) {
        alert(`還原失敗：${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li
      className={cn(
        "border-l-[6px] transition-colors",
        isMine
          ? "border-l-primary bg-blue-100/70"
          : "border-l-transparent"
      )}
    >
      <Link
        href={`/bugs/${bug.id}`}
        className={cn(
          "block px-4 py-3.5 transition-colors",
          isMine ? "hover:bg-blue-200/70" : "hover:bg-muted/40"
        )}
      >
        <div className="flex items-start gap-3">
          <SeverityChip severity={bug.severity} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3
                className={cn(
                  "text-sm truncate flex-1",
                  isMine ? "font-semibold text-primary" : "font-medium"
                )}
              >
                {bug.title}
              </h3>
              {isMine && (
                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary text-white text-[10px] font-semibold tracking-wide">
                  指派給我
                </span>
              )}
              <StatusChip status={bug.status} className="shrink-0" />
            </div>
            <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {bug.module && (
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  {bug.module.name}
                </span>
              )}
              <span>
                回報：{bug.reporter?.full_name || bug.reporter?.email || "?"}
              </span>
              {bug.assignee && (
                <span>
                  處理：{bug.assignee.full_name || bug.assignee.email}
                </span>
              )}
              {view === "archived" && bug.archived_at ? (
                <span>
                  封存於{" "}
                  {format(new Date(bug.archived_at), "yyyy/MM/dd", {
                    locale: zhTW,
                  })}
                </span>
              ) : (
                <span>
                  {formatDistanceToNow(new Date(bug.created_at), {
                    addSuffix: true,
                    locale: zhTW,
                  })}
                </span>
              )}
            </div>
          </div>

          {(canArchive || canUnarchive) && (
            <button
              type="button"
              onClick={canArchive ? handleArchive : handleUnarchive}
              disabled={pending}
              title={canArchive ? "封存（之後可還原）" : "還原回進行中"}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                canArchive
                  ? "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "bg-primary text-white hover:brightness-95",
                pending && "opacity-50 cursor-not-allowed"
              )}
            >
              {pending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : canArchive ? (
                <Archive size={12} />
              ) : (
                <RotateCcw size={12} />
              )}
              {canArchive ? "封存" : "還原"}
            </button>
          )}
        </div>
      </Link>
    </li>
  );
}
