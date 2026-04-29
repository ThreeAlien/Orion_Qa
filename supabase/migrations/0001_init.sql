-- Orion QA — schema 初始化
-- 在 Supabase Dashboard → SQL Editor 整段執行

-- ============================================
-- 1. profiles：對應 auth.users，補使用者資料
-- ============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 自動把新登入的使用者寫進 profiles（第一個註冊的設為 admin）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.profiles;
  insert into public.profiles (id, email, full_name, avatar_url, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    is_first
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 2. modules：功能模組（threeAlien_web 13 大模組 + 其他）
-- ============================================
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.modules (code, name, sort_order) values
  ('home-manage', '首頁佈局', 10),
  ('menu-manage', '選單管理', 20),
  ('article-manage', '文章管理', 30),
  ('product-manage', '商品管理', 40),
  ('image-manage', '圖片管理', 50),
  ('form-manage', '表單管理', 60),
  ('global-manage', '全站設定', 70),
  ('user-manage', '使用者管理', 80),
  ('language-manage', '語言管理', 90),
  ('newsletter-manage', '電子報管理', 100),
  ('customer-manage', '客戶名單', 110),
  ('dm-manage', '電子書 / DM', 120),
  ('permission-manage', '權限管理', 130),
  ('auth-login', '登入 / 認證', 140),
  ('common-home', '主版面 / 側邊欄', 150),
  ('other', '其他', 999)
on conflict (code) do nothing;

-- ============================================
-- 3. bugs：問題單
-- ============================================
create table if not exists public.bugs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  module_id uuid references public.modules(id) on delete set null,
  severity text not null default 'P2' check (severity in ('P0','P1','P2','P3')),
  status text not null default 'pending' check (status in ('pending','in_progress','done')),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bugs_status_idx on public.bugs(status);
create index if not exists bugs_module_idx on public.bugs(module_id);
create index if not exists bugs_assignee_idx on public.bugs(assignee_id);
create index if not exists bugs_created_idx on public.bugs(created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bugs_set_updated on public.bugs;
create trigger bugs_set_updated
  before update on public.bugs
  for each row execute function public.touch_updated_at();

-- ============================================
-- 4. comments：bug 下方留言
-- ============================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  bug_id uuid not null references public.bugs(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_bug_idx on public.comments(bug_id, created_at);

-- ============================================
-- 5. RLS — 登入即可讀寫，但只有作者 / 處理人 / admin 能改
-- ============================================
alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.bugs enable row level security;
alter table public.comments enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- modules：所有登入者可讀；只有 admin 可寫
drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules
  for select to authenticated using (true);

drop policy if exists modules_admin_write on public.modules;
create policy modules_admin_write on public.modules
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- bugs：所有登入者可讀寫，但 update / delete 限作者 / 處理人 / admin
drop policy if exists bugs_select on public.bugs;
create policy bugs_select on public.bugs
  for select to authenticated using (true);

drop policy if exists bugs_insert on public.bugs;
create policy bugs_insert on public.bugs
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists bugs_update on public.bugs;
create policy bugs_update on public.bugs
  for update to authenticated
  using (
    reporter_id = auth.uid()
    or assignee_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists bugs_delete on public.bugs;
create policy bugs_delete on public.bugs
  for delete to authenticated
  using (
    reporter_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- comments：登入可讀；自己留言可改 / 刪
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated using (true);

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments
  for update to authenticated
  using (author_id = auth.uid());

drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ============================================
-- 6. Storage：bug-attachments bucket
-- 在 Supabase Dashboard 建一個 public bucket: bug-attachments
-- 然後跑這段 RLS：
-- ============================================
-- 註：bucket 要在 Dashboard 建好再跑下面（或用 supabase CLI）

-- 任何登入使用者可上傳 / 讀取自己的 bucket 物件
-- 物件 path 設計：{user_id}/{timestamp}-{filename}
do $$
begin
  if exists (select 1 from storage.buckets where id = 'bug-attachments') then
    -- 讀（public bucket 已可讀，這裡額外保險）
    drop policy if exists "bug-attachments select" on storage.objects;
    create policy "bug-attachments select" on storage.objects
      for select to authenticated, anon
      using (bucket_id = 'bug-attachments');

    -- 寫：只有登入者，且 path 第一段是自己的 uid
    drop policy if exists "bug-attachments insert" on storage.objects;
    create policy "bug-attachments insert" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'bug-attachments'
        and (storage.foldername(name))[1] = auth.uid()::text
      );

    -- 刪：自己的物件
    drop policy if exists "bug-attachments delete" on storage.objects;
    create policy "bug-attachments delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'bug-attachments'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
