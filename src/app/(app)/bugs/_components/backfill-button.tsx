"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { backfillPmCards, type BackfillResult } from "../_actions/backfill";

// 一鍵把「有處理人但還沒在 PM 開卡」的歷史 bug 補建到 Orion PM。
// 只 admin 看得到（page 端把關）。
export function BackfillButton({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BackfillResult | null>(null);

  if (pendingCount === 0 && !result) return null;

  async function run() {
    setBusy(true);
    setResult(null);
    const r = await backfillPmCards();
    setBusy(false);
    setResult(r);
    if (r.ok && r.created > 0) router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <div className="text-xs flex flex-col items-end gap-0.5 max-w-md">
          <span
            className={
              result.ok && result.failed === 0
                ? "text-emerald-600"
                : result.failed > 0
                ? "text-amber-600"
                : "text-red-600"
            }
          >
            {result.message ??
              `已建 ${result.created} / ${result.total}${
                result.failed > 0 ? `，失敗 ${result.failed}` : ""
              }`}
          </span>
          {result.errors?.slice(0, 3).map((e) => (
            <span
              key={e.bugId}
              className="text-red-600 truncate max-w-[420px]"
              title={`${e.title} — ${e.error}`}
            >
              · {e.title.slice(0, 30)}：{e.error}
            </span>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={run}
        disabled={busy}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        {busy ? "同步中…" : `同步 ${pendingCount} 筆未連結卡`}
      </Button>
    </div>
  );
}
