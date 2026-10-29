-- Brain Fit : à coller une seule fois dans Supabase › SQL Editor, puis « Run ».
-- Une ligne par document (progress, texts) et par personne ; chacun ne voit que ses propres lignes.
create table if not exists public.docs (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);

alter table public.docs enable row level security;

drop policy if exists "docs: lire les siens" on public.docs;
drop policy if exists "docs: créer les siens" on public.docs;
drop policy if exists "docs: modifier les siens" on public.docs;

create policy "docs: lire les siens" on public.docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "docs: créer les siens" on public.docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "docs: modifier les siens" on public.docs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.docs to authenticated;
