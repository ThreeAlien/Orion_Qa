"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OrionLogo } from "@/components/orion-logo";
import { Button } from "@/components/ui/button";

export function LoginCard() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/bugs";
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function loginWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setLoading(false);
      alert("登入失敗：" + error.message);
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-8 backdrop-blur">
      <div className="flex flex-col items-center gap-3 mb-8">
        <OrionLogo size={56} />
        <h1 className="text-2xl font-semibold tracking-tight">
          Orion <span className="text-primary">QA</span>
        </h1>
        <p className="text-sm text-muted-foreground text-center">
          ThreeAlien CMS 後台前端 QA 回報系統
        </p>
      </div>

      <Button
        onClick={loginWithGoogle}
        disabled={loading}
        size="lg"
        variant="secondary"
        className="w-full"
      >
        <GoogleIcon />
        {loading ? "登入中…" : "使用 Google 登入"}
      </Button>

      {error && (
        <p className="text-sm text-red-600 mt-4 text-center">
          登入失敗，請重試
        </p>
      )}

      <p className="mt-8 text-xs text-muted-foreground text-center">
        登入即同意紀錄你的 Google 帳號 email、姓名、頭像
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
