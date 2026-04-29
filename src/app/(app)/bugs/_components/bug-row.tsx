import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { StatusChip } from "@/components/status-chip";
import { SeverityChip } from "@/components/severity-chip";
import type { Bug } from "@/lib/types";

export function BugRow({ bug }: { bug: Bug }) {
  return (
    <li>
      <Link
        href={`/bugs/${bug.id}`}
        className="block px-4 py-3.5 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-start gap-3">
          <SeverityChip severity={bug.severity} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3 className="font-medium text-sm truncate flex-1">
                {bug.title}
              </h3>
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
