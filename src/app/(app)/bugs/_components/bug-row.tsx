import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { StatusChip } from "@/components/status-chip";
import { SeverityChip } from "@/components/severity-chip";
import { cn } from "@/lib/utils";
import type { Bug } from "@/lib/types";

export function BugRow({
  bug,
  currentUserId,
}: {
  bug: Bug;
  currentUserId: string | null;
}) {
  const isMine = !!currentUserId && bug.assignee?.id === currentUserId;

  return (
    <li
      className={cn(
        "border-l-4 transition-colors",
        isMine
          ? "border-l-primary bg-primary/[0.04]"
          : "border-l-transparent"
      )}
    >
      <Link
        href={`/bugs/${bug.id}`}
        className={cn(
          "block px-4 py-3.5 transition-colors",
          isMine ? "hover:bg-primary/10" : "hover:bg-muted/40"
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
              <span>
                {formatDistanceToNow(new Date(bug.created_at), {
                  addSuffix: true,
                  locale: zhTW,
                })}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
