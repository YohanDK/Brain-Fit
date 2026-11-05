-- Néophyte : un cercle plus vivant. Le fil du cercle et ses réactions, les piques amicales, les questions maison,
-- et la notification « à toi de jouer ».
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après amis.sql, duels.sql et rappels.sql).
-- Le relancer ne change rien à ce qui existe. Sans ce script, l'onglet Amis fonctionne comme avant :
-- ces encarts ne s'affichent simplement pas.

-- ───────────── 1. Le fil du cercle : les exploits de chacun, et des réactions d'un geste ─────────────
-- Pas de texte libre : un type d'exploit, un nombre et une référence courte, mis en phrase par la page.
create table if not exists public.circle_events (
  id bigint generated always as identity primary key,
  code text not null references public.circles (code) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('niveau', 'badge', 'record', 'serie', 'duel', 'sansfaute', 'objectif', 'plume')),
  n integer check (n is null or n between 0 and 100000),
  ref text check (ref is null or ref ~ '^[A-Za-z0-9_.:-]{1,40}$'),
  day date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists circle_events_code on public.circle_events (code, created_at desc);
-- pas de doublon : un même exploit (type + référence) une fois par jour
create unique index if not exists circle_events_un_par_jour
  on public.circle_events (code, user_id, kind, coalesce(ref, ''), day);

create table if not exists public.circle_reactions (
  event_id bigint not null references public.circle_events (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('bravo', 'cerf', 'feu', 'chapeau', 'rire')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- le cercle d'un exploit, pour les réactions
create or replace function public.event_code(e bigint) returns text
language sql stable security definer set search_path = '' as $$
  select code from public.circle_events where id = e;
$$;
revoke all on function public.event_code(bigint) from public, anon;
grant execute on function public.event_code(bigint) to authenticated;

alter table public.circle_events enable row level security;
alter table public.circle_reactions enable row level security;

drop policy if exists "fil: lire" on public.circle_events;
drop policy if exists "fil: publier" on public.circle_events;
drop policy if exists "fil: effacer" on public.circle_events;
drop policy if exists "réactions: lire" on public.circle_reactions;
drop policy if exists "réactions: réagir" on public.circle_reactions;
drop policy if exists "réactions: changer" on public.circle_reactions;
drop policy if exists "réactions: retirer" on public.circle_reactions;

create policy "fil: lire" on public.circle_events
  for select to authenticated using (public.is_circle_member(code));
create policy "fil: publier" on public.circle_events
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.is_circle_member(code) and day = current_date);
create policy "fil: effacer" on public.circle_events
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "réactions: lire" on public.circle_reactions
  for select to authenticated using (public.is_circle_member(public.event_code(event_id)));
create policy "réactions: réagir" on public.circle_reactions
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.is_circle_member(public.event_code(event_id)));
create policy "réactions: changer" on public.circle_reactions
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "réactions: retirer" on public.circle_reactions
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.circle_events to authenticated;
grant select, insert, update, delete on public.circle_reactions to authenticated;

-- ───────────── 2. Les piques amicales : une phrase choisie dans une liste, jamais de texte libre ─────────────
alter table public.circle_nudges add column if not exists pique smallint check (pique is null or pique between 0 and 50);
alter table public.circle_nudges drop constraint if exists circle_nudges_kind_check;
alter table public.circle_nudges add constraint circle_nudges_kind_check check (kind in ('bravo', 'courage', 'defi', 'pique'));
alter table public.circle_nudges drop constraint if exists circle_nudges_pique_check2;
alter table public.circle_nudges add constraint circle_nudges_pique_check2 check ((kind = 'pique') = (pique is not null));

-- ───────────── 3. Les questions maison : on écrit une question pour piéger un ami (ou tout le cercle) ─────────────
create table if not exists public.circle_questions (
  id bigint generated always as identity primary key,
  code text not null references public.circles (code) on delete cascade,
  from_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  to_id uuid references auth.users (id) on delete cascade,      -- vide : tout le cercle
  question text not null check (char_length(question) between 8 and 300),
  opts jsonb not null check (jsonb_typeof(opts) = 'array' and jsonb_array_length(opts) between 2 and 4),
  bonne smallint not null check (bonne between 0 and 3),
  expl text check (expl is null or char_length(expl) <= 300),
  created_at timestamptz not null default now(),
  check (bonne < jsonb_array_length(opts)),
  check (to_id is null or to_id <> from_id)
);
create index if not exists circle_questions_code on public.circle_questions (code, created_at desc);

create table if not exists public.circle_answers (
  question_id bigint not null references public.circle_questions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  choix smallint not null check (choix between 0 and 3),
  juste boolean not null,
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

-- options : des phrases courtes
create or replace function public.question_opts_ok(o jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(jsonb_typeof(x) = 'string' and char_length(x #>> '{}') between 1 and 120), false)
  from jsonb_array_elements(o) x;
$$;
alter table public.circle_questions drop constraint if exists circle_questions_opts_ok;
alter table public.circle_questions add constraint circle_questions_opts_ok check (public.question_opts_ok(opts));

create or replace function public.question_visible(q bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circle_questions c
    where c.id = q and public.is_circle_member(c.code)
      and (c.from_id = (select auth.uid()) or c.to_id = (select auth.uid()) or c.to_id is null));
$$;
revoke all on function public.question_visible(bigint) from public, anon;
grant execute on function public.question_visible(bigint) to authenticated;

-- combien de questions posées depuis 24 h (lu hors des règles de la table, pour éviter qu'elle se cite elle-même)
create or replace function public.questions_du_jour() returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.circle_questions where from_id = (select auth.uid()) and created_at > now() - interval '1 day';
$$;
revoke all on function public.questions_du_jour() from public, anon;
grant execute on function public.questions_du_jour() to authenticated;

alter table public.circle_questions enable row level security;
alter table public.circle_answers enable row level security;

drop policy if exists "questions: voir" on public.circle_questions;
drop policy if exists "questions: poser" on public.circle_questions;
drop policy if exists "questions: retirer" on public.circle_questions;
drop policy if exists "réponses: voir" on public.circle_answers;

create policy "questions: voir" on public.circle_questions
  for select to authenticated using (
    public.is_circle_member(code) and (from_id = (select auth.uid()) or to_id = (select auth.uid()) or to_id is null));
-- trois questions par jour au plus, pour un membre du cercle
create policy "questions: poser" on public.circle_questions
  for insert to authenticated with check (
    from_id = (select auth.uid()) and public.is_circle_member(code)
    and (to_id is null or public.is_member_of(code, to_id))
    and public.questions_du_jour() < 3);
create policy "questions: retirer" on public.circle_questions
  for delete to authenticated using (from_id = (select auth.uid()));
-- on voit les réponses aux questions qu'on voit (l'auteur voit qui s'est fait piéger)
create policy "réponses: voir" on public.circle_answers
  for select to authenticated using (user_id = (select auth.uid()) or public.question_visible(question_id));

-- la bonne réponse reste cachée : la colonne « bonne » n'est pas lisible, seul question_repondre la donne
revoke all on public.circle_questions from anon, authenticated;
grant select (id, code, from_id, to_id, question, opts, created_at) on public.circle_questions to authenticated;
grant insert (code, to_id, question, opts, bonne, expl) on public.circle_questions to authenticated;
grant delete on public.circle_questions to authenticated;
revoke all on public.circle_answers from anon, authenticated;
grant select on public.circle_answers to authenticated;

-- répondre une fois pour toutes ; renvoie la bonne réponse et l'explication
create or replace function public.question_repondre(p_id bigint, p_choix smallint)
returns table (bonne smallint, expl text, juste boolean)
language plpgsql security definer set search_path = '' as $$
declare q public.circle_questions; me uuid := auth.uid(); deja smallint;
begin
  select * into q from public.circle_questions where id = p_id;
  if q.id is null or not public.question_visible(p_id) or q.from_id = me then raise exception 'question introuvable'; end if;
  if p_choix is null or p_choix < 0 or p_choix >= jsonb_array_length(q.opts) then raise exception 'choix invalide'; end if;
  select a.choix into deja from public.circle_answers a where a.question_id = p_id and a.user_id = me;
  if deja is null then
    insert into public.circle_answers (question_id, user_id, choix, juste) values (p_id, me, p_choix, p_choix = q.bonne);
    deja := p_choix;
  end if;
  return query select q.bonne, q.expl, deja = q.bonne;
end $$;
revoke all on function public.question_repondre(bigint, smallint) from public, anon;
grant execute on function public.question_repondre(bigint, smallint) to authenticated;

-- l'auteur relit sa propre question avec la réponse
create or replace function public.mes_questions() returns table (id bigint, bonne smallint, expl text)
language sql stable security definer set search_path = '' as $$
  select id, bonne, expl from public.circle_questions where from_id = (select auth.uid()) and created_at > now() - interval '30 days';
$$;
revoke all on function public.mes_questions() from public, anon;
grant execute on function public.mes_questions() to authenticated;

-- ───────────── 4. L'objectif commun du cercle : les jours d'entraînement de chacun, cette semaine ─────────────
alter table public.circle_members add column if not exists jours smallint not null default 0 check (jours between 0 and 7);

-- ───────────── 5. « À toi de jouer » : une notification quand un ami t'attend ─────────────
-- Réglage par appareil, sur les appareils où les rappels sont activés (Réglages › Rappels). Jamais entre 21 h 30 et 8 h.
alter table public.rappels
  add column if not exists amis boolean not null default true,
  add column if not exists dernier_amis timestamptz not null default now();

create or replace function public.rappel_amis(p_endpoint text, p_on boolean) returns void
language sql security definer set search_path = '' as $$
  update public.rappels set amis = p_on, dernier_amis = case when p_on and not amis then now() else dernier_amis end
   where endpoint = p_endpoint and user_id = (select auth.uid());
$$;
revoke all on function public.rappel_amis(text, boolean) from public, anon;
grant execute on function public.rappel_amis(text, boolean) to authenticated;

-- ménage : au-delà de 30 jours, le fil et les questions ne servent plus
delete from public.circle_events where created_at < now() - interval '30 days';
delete from public.circle_questions where created_at < now() - interval '30 days';
