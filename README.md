# Orion QA — 獵戶座測試平台

> 給 ThreeAlien CMS 後台前端 (`threeAlien_web`) 團隊用的 QA 回報系統。
> 取代原本的 Excel 工作流，支援 Markdown 描述、Ctrl+V 直接貼截圖、狀態指派、留言討論。

## 技術棧

| 層 | 用什麼 |
|----|-------|
| Framework | Next.js 16 (App Router) + TypeScript |
| 樣式 | Tailwind CSS 4 |
| 資料庫 | Supabase Postgres |
| 認證 | Supabase Auth + Google OAuth |
| 檔案儲存 | Supabase Storage (`bug-attachments` bucket) |
| 部署 | Vercel |

全部都用免費方案。

## 主要功能

- ✅ Google 登入（首位登入者自動成為 admin）
- ✅ Bug 列表：依狀態 / 模組 / 嚴重度 / 處理人篩選 + 標題搜尋
- ✅ 新增 / 編輯 bug：Markdown 描述（內建重現步驟模板）
- ✅ Ctrl+V 直接貼截圖、拖曳上傳、檔案選擇器
- ✅ 狀態：待處理 / 處理中 / 已完成（下拉切換即儲存）
- ✅ 嚴重度：P0 / P1 / P2 / P3
- ✅ 留言討論串（也支援 Markdown 跟貼圖）
- ✅ 模組管理（admin 才能進，可新增 / 改名 / 停用 / 刪除）

## 一次性設定步驟

### 1. Supabase 專案

1. 上 https://supabase.com/dashboard/projects → **New Project**（免費 plan 就夠）
   - Region 選 **Tokyo / Singapore** 比較近
2. 進入專案 → 左側 **SQL Editor** → **New query**
3. 把 `supabase/migrations/0001_init.sql` 整段貼進去 → **Run**
4. 左側 **Storage** → **New bucket**：
   - Name: `bug-attachments`
   - Public bucket: ✅ 勾起來（圖片要直接顯示）
   - Click **Save**
5. **再回 SQL Editor 把 `0001_init.sql` 跑一次**（這次會把 storage RLS 加上去，因為第一次 bucket 還不存在）

### 2. Google OAuth

1. 上 https://console.cloud.google.com/ → 建專案 (例如 `Orion QA`)
2. **APIs & Services** → **OAuth consent screen**
   - User Type 選 **External**
   - App name: `Orion QA`
   - User support email: 你的 email
   - Scopes: 加 `email`, `profile`, `openid`
   - Test users: 暫時加你自己（之後 publish）
3. **Credentials** → **Create credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Orion QA`
   - Authorized redirect URIs:
     ```
     https://<你的-supabase-project>.supabase.co/auth/v1/callback
     ```
     （從 Supabase Dashboard → Authentication → Providers → Google 那欄複製）
4. 拿到 **Client ID** + **Client Secret**
5. 回 Supabase Dashboard → **Authentication** → **Providers** → **Google**
   - 開啟 Enabled
   - 貼上 Client ID + Client Secret
   - **Save**

### 3. 本機跑起來

```bash
cd orion-qa
cp .env.local.example .env.local
# 編輯 .env.local，填入 Supabase Dashboard → Project Settings → API 的：
#   - Project URL    → NEXT_PUBLIC_SUPABASE_URL
#   - anon public    → NEXT_PUBLIC_SUPABASE_ANON_KEY
#   - NEXT_PUBLIC_SITE_URL=http://localhost:3000

bun install
bun run dev
```

開 http://localhost:3000 → 點 Google 登入。

> **第一個登入的 Google 帳號會自動成為 admin**（系統用 trigger 寫進去），可以管理模組。

### 4. 部署到 Vercel

1. 把專案 push 到 GitHub（看下面「GitHub 設定」）
2. 上 https://vercel.com → **Import Project** → 選你的 repo
3. **Environment Variables** 加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` ← 這個之後要改成你的正式網址 (e.g. `https://orion-qa.vercel.app`)
4. **Deploy**
5. 拿到正式網址後：
   - 回 Vercel 把 `NEXT_PUBLIC_SITE_URL` 改成正式網址 → **Redeploy**
   - 回 Supabase Dashboard → **Authentication** → **URL Configuration** → 把正式網址加進 **Redirect URLs**

## GitHub 設定（待補）

- 倉庫名稱：`Orion_QA`
- 組織：**待 weider 提供**

```bash
# 等組織名稱確認後執行：
cd orion-qa
git remote add origin https://github.com/<org>/Orion_QA.git
git push -u origin main
```

## 安全層（待補）

目前**任何 Google 帳號**都能登入。weider 之後會提供：
- email 網域白名單，或
- 邀請碼，或
- 「待審核」名單

實作會加在 `src/lib/supabase/middleware.ts` 的 `updateSession` 判斷裡。

## 專案結構

```
orion-qa/
├── src/
│   ├── app/
│   │   ├── (app)/                    # 受保護的路由群組（需登入）
│   │   │   ├── layout.tsx            # 含 sidebar 的 app shell
│   │   │   ├── bugs/                 # 問題列表 / 新增 / 詳情
│   │   │   ├── modules/              # 模組管理（admin only）
│   │   │   └── _components/
│   │   ├── auth/callback/route.ts    # OAuth callback
│   │   ├── login/                    # 登入頁（含星空背景）
│   │   ├── globals.css               # Orion 主題 tokens
│   │   ├── layout.tsx
│   │   └── page.tsx                  # 根路徑 → 轉 /bugs
│   ├── components/
│   │   ├── ui/                       # button / input / select / textarea
│   │   ├── markdown-editor.tsx       # 含 Ctrl+V 上傳
│   │   ├── markdown-render.tsx
│   │   ├── orion-logo.tsx            # 獵戶座腰帶 logo
│   │   ├── status-chip.tsx
│   │   └── severity-chip.tsx
│   ├── lib/
│   │   ├── supabase/                 # client / server / middleware
│   │   ├── types.ts                  # DB 型別 + status/severity 字典
│   │   └── utils.ts                  # cn()
│   └── middleware.ts                 # 登入 guard
└── supabase/
    └── migrations/
        └── 0001_init.sql             # schema + seed + RLS
```

## 已知警告

Next.js 16 把 `middleware.ts` 改名為 `proxy.ts`，目前還相容但會出警告。等 17 之前再 rename。
