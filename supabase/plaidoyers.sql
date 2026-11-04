-- Néophyte : « Qui a raison ? », le problème du jour du cercle.
-- Chacun écrit sa réponse et son raisonnement ; une fois sa copie rendue, on lit celles des autres, sans les noms,
-- et on vote pour la plus convaincante. Puis les auteurs et la solution apparaissent.
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après cercle.sql et amis.sql).
-- Sans ce script, l'onglet Amis fonctionne comme avant : l'encart « Qui a raison ? » ne s'affiche pas.

create table if not exists public.plaidoyers (
  code text not null references public.circles (code) on delete cascade,
  day date not null default current_date,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  qid text not null check (qid ~ '^[a-z0-9]{2,12}$'),
  texte text not null check (char_length(texte) between 10 and 800),
  created_at timestamptz not null default now(),
  primary key (code, day, user_id)
);

create table if not exists public.plaidoyer_votes (
  code text not null references public.circles (code) on delete cascade,
  day date not null default current_date,
  voter uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pour uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (code, day, voter),
  check (voter <> pour)
);

-- « ai-je déjà rendu ma copie ce jour-là ? » : on ne lit les autres qu'après avoir écrit la sienne
create or replace function public.a_plaide(c text, d date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.plaidoyers p where p.code = c and p.day = d and p.user_id = (select auth.uid()));
$$;
revoke all on function public.a_plaide(text, date) from public, anon;
grant execute on function public.a_plaide(text, date) to authenticated;

-- la copie visée existe bien ce jour-là, dans ce cercle
create or replace function public.plaidoyer_existe(c text, d date, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.plaidoyers p where p.code = c and p.day = d and p.user_id = u);
$$;
revoke all on function public.plaidoyer_existe(text, date, uuid) from public, anon;
grant execute on function public.plaidoyer_existe(text, date, uuid) to authenticated;

alter table public.plaidoyers enable row level security;
alter table public.plaidoyer_votes enable row level security;

drop policy if exists "plaidoyers: lire" on public.plaidoyers;
drop policy if exists "plaidoyers: écrire" on public.plaidoyers;
drop policy if exists "plaidoyers: effacer" on public.plaidoyers;
drop policy if exists "votes: lire" on public.plaidoyer_votes;
drop policy if exists "votes: voter" on public.plaidoyer_votes;

-- sa propre copie toujours ; celles des autres membres une fois la sienne rendue ce jour-là
create policy "plaidoyers: lire" on public.plaidoyers
  for select to authenticated using (
    user_id = (select auth.uid())
    or (public.is_circle_member(code) and public.a_plaide(code, day)));
-- une copie par jour, le jour même, rendue une fois pour toutes (pas de retouche après avoir lu les autres)
create policy "plaidoyers: écrire" on public.plaidoyers
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.is_circle_member(code) and day = current_date);
create policy "plaidoyers: effacer" on public.plaidoyers
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "votes: lire" on public.plaidoyer_votes
  for select to authenticated using (
    voter = (select auth.uid())
    or (public.is_circle_member(code) and public.a_plaide(code, day)));
-- une voix par jour, après avoir rendu sa copie, pour la copie d'un autre
create policy "votes: voter" on public.plaidoyer_votes
  for insert to authenticated with check (
    voter = (select auth.uid()) and day = current_date
    and public.is_circle_member(code) and public.a_plaide(code, day)
    and public.plaidoyer_existe(code, day, pour));

grant select, insert, delete on public.plaidoyers to authenticated;
grant select, insert on public.plaidoyer_votes to authenticated;

-- ménage : au-delà de 30 jours, les copies ne servent plus
delete from public.plaidoyer_votes where day < current_date - 30;
delete from public.plaidoyers where day < current_date - 30;
