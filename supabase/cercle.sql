-- Brain Fit : cercle d'amis et classement de la semaine, et effacement de ses données.
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après setup.sql).
-- Seuls le pseudo, les XP de la semaine et la série sont partagés, et seulement entre membres d'un même cercle.

create table if not exists public.circles (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  name text not null check (char_length(name) between 1 and 40),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  code text not null references public.circles (code) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pseudo text not null check (char_length(pseudo) between 2 and 24),
  week date,
  xp integer not null default 0 check (xp between 0 and 100000),
  streak integer not null default 0 check (streak between 0 and 10000),
  updated_at timestamptz not null default now(),
  primary key (code, user_id)
);

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;

-- « suis-je membre de ce cercle ? », lu sans repasser par les règles de la table elle-même
create or replace function public.is_circle_member(c text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circle_members m where m.code = c and m.user_id = (select auth.uid()));
$$;
revoke all on function public.is_circle_member(text) from public, anon;
grant execute on function public.is_circle_member(text) to authenticated;

drop policy if exists "cercles: créer" on public.circles;
drop policy if exists "cercles: voir les siens" on public.circles;
drop policy if exists "membres: voir son cercle" on public.circle_members;
drop policy if exists "membres: entrer" on public.circle_members;
drop policy if exists "membres: se mettre à jour" on public.circle_members;
drop policy if exists "membres: partir" on public.circle_members;
drop policy if exists "docs: effacer les siens" on public.docs;

create policy "cercles: créer" on public.circles
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "cercles: voir les siens" on public.circles
  for select to authenticated using (created_by = (select auth.uid()) or public.is_circle_member(code));

-- on entre dans un cercle avec son code : un code inconnu est refusé par la clé étrangère
create policy "membres: voir son cercle" on public.circle_members
  for select to authenticated using (user_id = (select auth.uid()) or public.is_circle_member(code));
create policy "membres: entrer" on public.circle_members
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "membres: se mettre à jour" on public.circle_members
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "membres: partir" on public.circle_members
  for delete to authenticated using (user_id = (select auth.uid()));

-- chacun peut effacer ses propres données
create policy "docs: effacer les siens" on public.docs
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert on public.circles to authenticated;
grant select, insert, update, delete on public.circle_members to authenticated;
grant delete on public.docs to authenticated;
