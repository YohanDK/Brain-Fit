-- Néophyte : duels en trois manches entre deux membres d'un même cercle.
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après cercle.sql et amis.sql).
-- Sans ce script, l'onglet Amis fonctionne comme avant : le bouton « Duel » annonce simplement qu'il arrive bientôt.
--
-- Déroulé : A choisit la famille de la manche 1 et la joue ; B la joue à son tour, puis choisit et joue la manche 2 ;
-- A joue la manche 2, puis choisit et joue la manche 3 ; B joue la manche 3. Cinq questions par manche,
-- les mêmes pour les deux (tirées avec la graine). Plus de bonnes réponses gagne ; à égalité, le plus rapide.

create table if not exists public.duels (
  id bigint generated always as identity primary key,
  code text not null references public.circles (code) on delete cascade,
  a uuid not null default auth.uid() references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  seed text not null check (seed ~ '^[a-z0-9]{4,12}$'),
  -- [{"f":"soph","a":[1,0,1,1,0],"ta":412,"b":null,"tb":null}, …] ; t en dixièmes de seconde
  manches jsonb not null,
  tour uuid,                       -- à qui de jouer ; null quand le duel est fini
  fini boolean not null default false,
  abandon uuid,                    -- celui qui a abandonné, le cas échéant
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (a <> b)
);
create index if not exists duels_a on public.duels (a, updated_at desc);
create index if not exists duels_b on public.duels (b, updated_at desc);
-- un seul duel en cours entre deux personnes : la revanche vient après
create unique index if not exists duels_un_en_cours
  on public.duels (least(a, b), greatest(a, b)) where not fini;

alter table public.duels enable row level security;

drop policy if exists "duels: voir les siens" on public.duels;
drop policy if exists "duels: lancer" on public.duels;

create policy "duels: voir les siens" on public.duels
  for select to authenticated using (a = (select auth.uid()) or b = (select auth.uid()));

-- lancer un duel : on a déjà joué sa première manche, c'est au tour de l'autre
create policy "duels: lancer" on public.duels
  for insert to authenticated with check (
    a = (select auth.uid())
    and public.is_circle_member(code)
    and public.is_member_of(code, b)
    and tour = b and not fini and abandon is null
    and jsonb_typeof(manches) = 'array' and jsonb_array_length(manches) = 1
    and manches -> 0 ->> 'f' in ('chrono', 'ortho', 'soph', 'cit', 'fermi', 'ia', 'calc')
    and jsonb_typeof(manches -> 0 -> 'a') = 'array' and jsonb_array_length(manches -> 0 -> 'a') = 5
    and coalesce(manches -> 0 ->> 'b', '') = '');

grant select, insert on public.duels to authenticated;

-- jouer son tour : remplit sa part de la dernière manche, ou ouvre la suivante (p_famille) ; tout passe par ici
create or replace function public.duel_jouer(p_id bigint, p_marks smallint[], p_temps integer, p_famille text default null)
returns public.duels
language plpgsql security definer set search_path = '' as $$
declare
  d public.duels; me uuid := auth.uid(); moi text; lui text; n int; der jsonb;
begin
  select * into d from public.duels where id = p_id for update;
  if d.id is null or me not in (d.a, d.b) then raise exception 'duel introuvable'; end if;
  if d.fini or d.tour is distinct from me then raise exception 'pas ton tour'; end if;
  if array_length(p_marks, 1) is distinct from 5 or exists (select 1 from unnest(p_marks) x where x not in (0, 1)) then
    raise exception 'manche invalide'; end if;
  if p_temps is null or p_temps < 0 or p_temps > 36000 then raise exception 'temps invalide'; end if;
  moi := case when me = d.a then 'a' else 'b' end; lui := case when moi = 'a' then 'b' else 'a' end;
  n := jsonb_array_length(d.manches); der := d.manches -> (n - 1);

  if der -> moi is null or jsonb_typeof(der -> moi) = 'null' then
    -- répondre à la manche choisie par l'autre
    if p_famille is not null then raise exception 'manche en attente'; end if;
    der := der || jsonb_build_object(moi, to_jsonb(p_marks), 't' || moi, p_temps);
    d.manches := jsonb_set(d.manches, array[(n - 1)::text], der);
    if n = 3 then d.fini := true; d.tour := null; end if;   -- la dernière manche est jouée par les deux
  else
    -- ouvrir la manche suivante : sa famille n'a pas encore été jouée
    if n >= 3 or p_famille not in ('chrono', 'ortho', 'soph', 'cit', 'fermi', 'ia', 'calc')
       or exists (select 1 from jsonb_array_elements(d.manches) m where m ->> 'f' = p_famille) then
      raise exception 'famille invalide'; end if;
    d.manches := d.manches || jsonb_build_array(jsonb_build_object('f', p_famille, moi, to_jsonb(p_marks), 't' || moi, p_temps, lui, null, 't' || lui, null));
    d.tour := case when moi = 'a' then d.b else d.a end;
  end if;
  update public.duels set manches = d.manches, tour = d.tour, fini = d.fini, updated_at = now() where id = d.id;
  return d;
end $$;
revoke all on function public.duel_jouer(bigint, smallint[], integer, text) from public, anon;
grant execute on function public.duel_jouer(bigint, smallint[], integer, text) to authenticated;

-- abandonner : l'autre gagne ; possible à tout moment par chacun des deux
create or replace function public.duel_abandonner(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.duels set fini = true, tour = null, abandon = auth.uid(), updated_at = now()
   where id = p_id and not fini and auth.uid() in (a, b);
end $$;
revoke all on function public.duel_abandonner(bigint) from public, anon;
grant execute on function public.duel_abandonner(bigint) to authenticated;

-- ménage : les duels finis depuis plus de 30 jours ne servent plus
delete from public.duels where fini and updated_at < now() - interval '30 days';
