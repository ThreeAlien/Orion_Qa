<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Orion QA — 給協作 AI 的快速說明

## 專案是什麼
weider 給 ThreeAlien CMS 後台前端 (`threeAlien_web`) 團隊用的 QA bug 回報平台，取代 Excel。

## 技術棧
- **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind 4
- **後端 / DB / 認證 / 圖檔儲存**: Supabase（一站式）
- **部署**: Vercel
- 全部跑免費 plan

## 重要連結
- **正式網址**: https://orion-qa.vercel.app
- **GitHub**: https://github.com/ThreeAlien/Orion_Qa（public）
- **Supabase project**: `lrbzmkzulfechjriprzj`
- **Vercel project**: `allwaysweiders-projects/orion-qa`

## 部署流程（最重要）
**push 到 `main` = Vercel 自動部署**。流程：

1. 編輯本機檔案（`~/Desktop/carry/orion-qa/`）
2. `git add -A && git commit -m "..."`
3. `git push`
4. Vercel 偵測 push → 自動 build & 部署 → 1-2 分鐘後正式網址更新

不需要手動跑 `vercel deploy`，也不需要碰 Vercel CLI（除非要改 env vars）。

部署進度看：https://vercel.com/allwaysweiders-projects/orion-qa

## 本機開發
```bash
cd ~/Desktop/carry/orion-qa
bun run dev   # http://localhost:3000
```

`.env.local` 不入 git（已在 .gitignore）。env 內容：
```
NEXT_PUBLIC_SUPABASE_URL=https://lrbzmkzulfechjriprzj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（前端 anon / publishable key，看 Supabase Dashboard）
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 同步到 Orion PM（bug 進「待驗收」+ 有處理人時自動建任務卡）
PM_API_BASE_URL=https://orion-pm.vercel.app
PM_API_KEY=（跟 Orion PM 端 EXTERNAL_API_KEY 同一把 token；只 server action 讀）
```

## 結構速查
```
src/
├── app/
│   ├── (app)/                # 受保護路由群組（要登入）
│   │   ├── layout.tsx        # 含 sidebar 的 shell
│   │   ├── bugs/             # 列表 / [id] 詳情 / new
│   │   ├── modules/          # 模組管理（admin only）
│   │   └── _components/
│   ├── auth/callback/        # OAuth 回調
│   ├── login/                # 登入頁（星空 + Google 按鈕）
│   └── page.tsx              # / → 轉 /bugs
├── components/
│   ├── ui/                   # button / input / select / textarea
│   ├── markdown-editor.tsx   # 含 Ctrl+V 直接貼圖上傳
│   ├── markdown-render.tsx   # 含 GFM
│   ├── orion-logo.tsx        # 獵戶座腰帶 logo
│   ├── status-chip.tsx
│   └── severity-chip.tsx
├── lib/
│   ├── supabase/             # client / server / middleware
│   ├── types.ts              # 型別 + status/severity 字典
│   └── utils.ts
└── middleware.ts             # 登入 gate
```

## DB schema
看 `supabase/migrations/0001_init.sql`。重點：
- 4 張表：`profiles` / `modules` / `bugs` / `comments`
- 第一個登入的人自動成 admin（trigger `handle_new_user`）
- 所有業務表都有 RLS：登入可讀；改動限作者 / 處理人 / admin
- `bug-attachments` storage bucket：path `{user_id}/...`，自己只能寫自己 folder

要動 schema 一定要在 `supabase/migrations/` 留 SQL（含 rollback 思維），不要直接從 Dashboard 改不留紀錄。

## 主色
`#1976d2`（沿用 threeAlien_web 後台標準藍）。tokens 在 `src/app/globals.css`。

## 待辦 / 已知狀態
- 登入無安全層（任何 Google 帳號都能進）— weider 確認過內部用就好
- Vercel 用 Hobby plan，所以 GitHub repo 是 public（沒有秘密在 code 裡）

## 改動規則
- 別寫死 ThreeAlien 客戶名稱在 UI（這是內部工具，但保持通用性思維）
- 別把 `service_role` key 放到 client / 環境變數（只用 anon / publishable key）
- 改完看一下能不能 build：`bun run build`
- 別新增不必要的 deps，讓專案保持輕量
- 中文 UI 文案：英文/數字前後加半形空格（例：`已 ` 5 ` 筆`），跟 weider 個人 CLAUDE.md 慣例一致
