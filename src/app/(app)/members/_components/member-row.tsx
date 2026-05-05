"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { Profile } from "@/lib/types";
import { removeMember } from "../_actions/remove-member";

export function MemberRow({
  profile,
  isMe,
}: {
  profile: Profile;
  isMe: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    if (
      !confirm(
        `確定要移除「${profile.full_name || profile.email}」？\n` +
          `這個動作會刪掉登入帳號（auth.users），無法復原。`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const r = await removeMember(profile.id);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="px-4 py-3 flex items-center gap-3">
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt=""
          className="w-9 h-9 rounded-full shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold shrink-0">
          {(profile.full_name || profile.email)[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {profile.full_name || profile.email}
          </span>
          {profile.is_admin && (
            <span className="text-[10px] font-semibold text-accent">
              ADMIN
            </span>
          )}
          {isMe && (
            <span className="text-[10px] text-muted-foreground">（你自己）</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {profile.email}
        </div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
        加入於{" "}
        {format(new Date(profile.created_at), "yyyy/MM/dd", { locale: zhTW })}
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {!isMe && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={busy}
            className="text-red-600 hover:bg-red-50"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UserMinus size={14} />
            )}
            移除
          </Button>
        )}
        {error && (
          <span className="text-xs text-red-600 max-w-[200px] truncate" title={error}>
            {error}
          </span>
        )}
      </div>
    </li>
  );
}
