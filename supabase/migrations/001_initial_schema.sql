-- Profiles table (auto-created on auth.users insert via trigger)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'franchisee' check (role in ('admin', 'franchisee')),
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'franchisee')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Templates table
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Submissions table
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.templates(id) on delete set null,
  user_id uuid references public.profiles(id) on delete cascade,
  format_name text not null,
  file_url text not null,
  selections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.submissions enable row level security;

-- Profiles: users can read their own, admins can read all
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can read all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Templates: anyone authenticated can read active, admins can CRUD all
create policy "Authenticated can read active templates" on public.templates
  for select using (status = 'active' or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert templates" on public.templates
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update templates" on public.templates
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete templates" on public.templates
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Submissions: users can read/create their own, admins can read all
create policy "Users can read own submissions" on public.submissions
  for select using (auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can create submissions" on public.submissions
  for insert with check (auth.uid() = user_id);

-- Storage buckets
insert into storage.buckets (id, name, public) values ('templates', 'templates', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('exports', 'exports', true) on conflict do nothing;

-- Storage policies
create policy "Anyone can read template assets" on storage.objects
  for select using (bucket_id = 'templates');

create policy "Admins can upload template assets" on storage.objects
  for insert with check (
    bucket_id = 'templates' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Anyone can read exports" on storage.objects
  for select using (bucket_id = 'exports');

create policy "Authenticated can upload exports" on storage.objects
  for insert with check (
    bucket_id = 'exports' and auth.uid() is not null
  );
