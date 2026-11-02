-- Néophyte : onglet Amis (classement depuis le début, encouragements et défis envoyés dans le cercle).
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après cercle.sql).
-- Sans ce script, l'onglet Amis fonctionne quand même : le classement général et les messages entre amis ne s'affichent simplement pas.

-- 1. le classement général : XP depuis le début et niveau
alter table public.circle_members
  add column if not exists xp_total integer not null default 0 check (xp_total between 0 and 10000000),
  add column if not exists niveau smallint not null default 1 check (niveau between 1 and 99);

-- 2. les gestes entre amis : bravo, courage, défi à l'Éclair (to_id vide = tout le cercle)
create table if not exists public.circle_nudges (
  id bigint generated always as identity primary key,
  code text not null references public.circles (code) on delete cascade,
  from_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  to_id uuid references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bravo', 'courage', 'defi')),
  seed text check (seed is null or seed ~ '^[a-z0-9]{4,12}$'),
  score smallint check (score is null or score between 0 and 500),
  day date not null default current_date,
  created_at timestamptz not null default now(),
  check ((kind = 'defi') = (seed is not null and score is not null)),
  check (to_id is null or to_id <> from_id)
);
create index if not exists circle_nudges_code on public.circle_nudges (code, created_at desc);
-- pas de pluie de messages : un geste de chaque sorte par ami et par jour
create unique index if not exists circle_nudges_un_par_jour
  on public.circle_nudges (code, from_id, coalesce(to_id, '00000000-0000-0000-0000-000000000000'::uuid), kind, day);

alter table public.circle_nudges enable row level security;

-- « cette personne est-elle dans ce cercle ? », pour n'écrire qu'à un membre
create or replace function public.is_member_of(c text, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circle_members m where m.code = c and m.user_id = u);
$$;
revoke all on function public.is_member_of(text, uuid) from public, anon;
grant execute on function public.is_member_of(text, uuid) to authenticated;

drop policy if exists "gestes: voir" on public.circle_nudges;
drop policy if exists "gestes: envoyer" on public.circle_nudges;
drop policy if exists "gestes: effacer" on public.circle_nudges;

-- on voit ce qu'on a envoyé, ce qu'on a reçu et ce qui est adressé à tout son cercle
create policy "gestes: voir" on public.circle_nudges
  for select to authenticated using (
    public.is_circle_member(code)
    and (from_id = (select auth.uid()) or to_id = (select auth.uid()) or to_id is null));
create policy "gestes: envoyer" on public.circle_nudges
  for insert to authenticated with check (
    from_id = (select auth.uid())
    and public.is_circle_member(code)
    and (to_id is null or public.is_member_of(code, to_id))
    and day = current_date);
create policy "gestes: effacer" on public.circle_nudges
  for delete to authenticated using (from_id = (select auth.uid()) or to_id = (select auth.uid()));

grant select, insert, delete on public.circle_nudges to authenticated;

-- ménage : les gestes de plus de 30 jours ne servent plus (à relancer de temps en temps, ou laisser tel quel)
delete from public.circle_nudges where created_at < now() - interval '30 days';
