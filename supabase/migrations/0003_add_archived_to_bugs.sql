-- Orion QA — bugs 加 archived 欄位（測試完畢的 bug 封存到「封存區」）
-- 在 Supabase Dashboard → SQL Editor 整段執行

-- ============================================
-- 1. 加 archived + archived_at
-- archived = false → 進行中（預設列表看的）
-- archived = true  → 封存區（已測完歸檔，不影響 status 欄位語意）
-- ============================================
alter table public.bugs
  add column if not exists archived boolean not null default false;

alter table public.bugs
  add column if not exists archived_at timestamptz;

-- 預設列表 where archived = false，加 partial index 加速主流程
create index if not exists bugs_archived_idx
  on public.bugs(archived)
  where archived = false;

-- 封存區依封存時間倒序顯示
create index if not exists bugs_archived_at_idx
  on public.bugs(archived_at desc)
  where archived = true;

-- ============================================
-- Rollback（需要時手動執行）
-- ============================================
-- drop index if exists bugs_archived_idx;
-- drop index if exists bugs_archived_at_idx;
-- alter table public.bugs drop column if exists archived_at;
-- alter table public.bugs drop column if exists archived;
