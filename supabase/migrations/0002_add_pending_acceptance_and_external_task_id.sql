-- Orion QA — 加「待驗收」狀態 + external_task_id（同步 Orion PM 卡片用）
-- 在 Supabase Dashboard → SQL Editor 整段執行

-- ============================================
-- 1. 替換 bugs.status 的 CHECK constraint，多一個 'pending_acceptance'
-- 由低到高順序：pending → in_progress → pending_acceptance → done
-- ============================================
do $$
declare
  cname text;
begin
  -- 找出 status 欄位現有的 CHECK constraint 名稱（inline 寫法是匿名）
  select conname into cname
  from pg_constraint
  where conrelid = 'public.bugs'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if cname is not null then
    execute format('alter table public.bugs drop constraint %I', cname);
  end if;
end $$;

alter table public.bugs
  add constraint bugs_status_check
  check (status in ('pending','in_progress','pending_acceptance','done'));

-- ============================================
-- 2. 加 external_task_id：對應 Orion PM 那張任務卡的 id
-- 進「待驗收」+ 有 assignee 時，server action 會 POST PM API 開卡，回填這個欄位
-- 之後同一張 bug 改 assignee → PATCH PM 卡（用這個 id）
-- ============================================
alter table public.bugs
  add column if not exists external_task_id text;

create index if not exists bugs_external_task_id_idx on public.bugs(external_task_id);

-- ============================================
-- Rollback（需要時手動執行）
-- ============================================
-- alter table public.bugs drop constraint if exists bugs_status_check;
-- alter table public.bugs add constraint bugs_status_check
--   check (status in ('pending','in_progress','done'));
-- alter table public.bugs drop column if exists external_task_id;
