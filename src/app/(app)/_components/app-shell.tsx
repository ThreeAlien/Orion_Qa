"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bug, Layers, LogOut } from "lucide-react";
import { OrionLogo } from "@/components/orion-logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const navItems = [
  { href: "/bugs", label: "問題列表", icon: Bug },
  { href: "/modules", label: "功能模組", icon: Layers, adminOnly: true },
];

export function AppShell({
  profile,
  children,
}: {
  profile: Pick<Profile, "id" | "email" | "full_name" | "avatar_url" | "is_admin">;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-night text-white flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/bugs" className="flex items-center gap-2.5">
            <OrionLogo size={32} />
            <span className="font-semibold tracking-tight text-lg">
              Orion <span className="text-accent">QA</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || profile.is_admin)
            .map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                    active
                      ? "bg-primary/20 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold">
                {(profile.full_name || profile.email)[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {profile.full_name || profile.email}
                {profile.is_admin && (
                  <span className="ml-1 text-[10px] text-accent">ADMIN</span>
                )}
              </div>
              <div className="text-xs text-white/50 truncate">
                {profile.email}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            登出
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-background">{children}</main>
    </div>
  );
}
