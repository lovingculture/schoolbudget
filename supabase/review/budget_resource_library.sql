alter table public.profiles add column if not exists is_admin boolean not null default false;

create table if not exists public.budget_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 150),
  description text not null default '',
  category text not null check (category in ('guide', 'template', 'reference')),
  school_year integer not null check (school_year between 2000 and 2100),
  original_filename text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null check (size_bytes between 1 and 31457280),
  is_public boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budget_resources enable row level security;
grant select on public.budget_resources to authenticated;
grant insert, update, delete on public.budget_resources to authenticated;

create policy "authenticated read public resources" on public.budget_resources
for select to authenticated using (is_public = true or exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));

create policy "admins insert resources" on public.budget_resources
for insert to authenticated with check (created_by = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));

create policy "admins update resources" on public.budget_resources
for update to authenticated using (exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
)) with check (exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));

create policy "admins delete resources" on public.budget_resources
for delete to authenticated using (exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('budget-resources', 'budget-resources', true, 31457280, array[
  'application/pdf', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/haansofthwp', 'application/hwp+zip', 'application/octet-stream'
]) on conflict (id) do update set public = excluded.public,
file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "admins insert budget resource files" on storage.objects
for insert to authenticated with check (bucket_id = 'budget-resources' and exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));

create policy "admins update budget resource files" on storage.objects
for update to authenticated using (bucket_id = 'budget-resources' and exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
)) with check (bucket_id = 'budget-resources' and exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));

create policy "admins delete budget resource files" on storage.objects
for delete to authenticated using (bucket_id = 'budget-resources' and exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));
