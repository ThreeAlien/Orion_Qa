import { cn } from "@/lib/utils";
import { type BugSeverity, SEVERITY_LABEL } from "@/lib/types";

const styles: Record<BugSeverity, string> = {
  P0: "bg-red-50 text-red-700 border-red-200",
  P1: "bg-orange-50 text-orange-700 border-orange-200",
  P2: "bg-amber-50 text-amber-700 border-amber-200",
  P3: "bg-slate-100 text-slate-700 border-slate-200",
};

export function SeverityChip({
  severity,
  className,
}: {
  severity: BugSeverity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-mono font-semibold",
        styles[severity],
        className
      )}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
