import { cn } from "@/lib/utils";
import { type BugStatus, STATUS_LABEL } from "@/lib/types";

const styles: Record<BugStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-50 text-primary border-blue-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function StatusChip({
  status,
  className,
}: {
  status: BugStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium",
        styles[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
