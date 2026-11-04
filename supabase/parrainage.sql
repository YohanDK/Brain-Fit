-- Néophyte : le parrainage. Chaque compte a un lien d'invitation ; qui s'inscrit par ce lien devient son filleul.
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après setup.sql). Sans ce script, l'appli
-- fonctionne comme avant : le panneau « Parrainer » dit simplement que le parrainage n'est pas encore ouvert.
--
-- Contre la triche (faux comptes) : seul le premier cadeau vient dès l'inscription d'un filleul ; tous les paliers
-- suivants ne comptent que les filleuls ACTIFS, c'est-à-dire venus au moins 3 jours différents faire un exercice.
-- Un compte ne choisit son parrain qu'une fois, dans les 14 jours après son inscription, jamais lui-même ni son
-- propre filleul ; les codes faux sont comptés (10 par jour au plus) pour qu'aucun script ne devine les codes.
-- Le parrain ne voit que des nombres (inscrits, actifs) : jamais l'e-mail, le pseudo ou les progrès de ses filleuls.

-- 1. un code par compte, et qui a parrainé qui
create table if not exists public.parrain_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.parrainages (
  filleul_id uuid primary key references auth.users (id) on delete cascade,
  parrain_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  check (filleul_id <> parrain_id)
);
create index if not exists parrainages_parrain on public.parrainages (parrain_id);
create table if not exists public.parrain_essais (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists parrain_essais_user on public.parrain_essais (user_id, at);

-- illisibles depuis le site : on n'y touche que par les fonctions ci-dessous
alter table public.parrain_codes enable row level security;
alter table public.parrainages enable row level security;
alter table public.parrain_essais enable row level security;
revoke all on public.parrain_codes, public.parrainages, public.parrain_essais from anon, authenticated;

-- 2. les jours actifs d'un compte (au moins un exercice coché ce jour-là), comme dans « Qui revient ? »
create or replace function public.jours_actifs(u uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.docs d, jsonb_each(case when jsonb_typeof(d.data->'days') = 'object' then d.data->'days' else '{}'::jsonb end) k
  where d.user_id = u and d.name = 'progress'
    and k.key ~ '^\d{4}-\d{2}-\d{2}$'
    and jsonb_typeof(k.value->'done') = 'object'
    and exists (select 1 from jsonb_each(k.value->'done') x where x.value not in ('false'::jsonb, 'null'::jsonb, '0'::jsonb));
$$;
revoke all on function public.jours_actifs(uuid) from public, anon, authenticated;

-- 3. mon code (créé au premier appel)
create or replace function public.mon_code_parrain() returns text
language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  c text;
  a constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if moi is null then raise exception 'connexion requise'; end if;
  select p.code into c from public.parrain_codes p where p.user_id = moi;
  if c is not null then return c; end if;
  loop
    c := '';
    for i in 1..8 loop c := c || substr(a, 1 + floor(random() * 32)::int, 1); end loop;
    begin
      insert into public.parrain_codes (user_id, code) values (moi, c);
      return c;
    exception when unique_violation then
      select p.code into c from public.parrain_codes p where p.user_id = moi;
      if c is not null then return c; end if;
    end;
  end loop;
end $$;
revoke all on function public.mon_code_parrain() from public, anon;
grant execute on function public.mon_code_parrain() to authenticated;

-- 4. devenir le filleul de quelqu'un : 'ok', 'deja', 'inconnu', 'soi', 'trop_tard' ou 'essais'
create or replace function public.devenir_filleul(p_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  c text := upper(trim(coalesce(p_code, '')));
  parrain uuid;
begin
  if moi is null then raise exception 'connexion requise'; end if;
  if exists (select 1 from public.parrainages where filleul_id = moi) then return 'deja'; end if;
  if (select u.created_at from auth.users u where u.id = moi) < now() - interval '14 days' then return 'trop_tard'; end if;
  if (select count(*) from public.parrain_essais e where e.user_id = moi and e.at > now() - interval '1 day') >= 10 then return 'essais'; end if;
  select p.user_id into parrain from public.parrain_codes p where c ~ '^[A-Z0-9]{8}$' and p.code = c;
  if parrain is null then
    insert into public.parrain_essais (user_id) values (moi);
    return 'inconnu';
  end if;
  if parrain = moi then return 'soi'; end if;
  -- pas de boucle : on ne parraine pas son propre parrain
  if exists (select 1 from public.parrainages where filleul_id = parrain and parrain_id = moi) then return 'soi'; end if;
  insert into public.parrainages (filleul_id, parrain_id) values (moi, parrain) on conflict do nothing;
  return 'ok';
end $$;
revoke all on function public.devenir_filleul(text) from public, anon;
grant execute on function public.devenir_filleul(text) to authenticated;

-- 5. où j'en suis : mon code, mes filleuls inscrits et actifs, et si j'ai moi-même un parrain
create or replace function public.mon_parrainage() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  c text;
  ins int;
  act int;
begin
  if moi is null then raise exception 'connexion requise'; end if;
  select p.code into c from public.parrain_codes p where p.user_id = moi;
  select count(*)::int, count(*) filter (where public.jours_actifs(f.filleul_id) >= 3)::int into ins, act
    from public.parrainages f where f.parrain_id = moi;
  return jsonb_build_object(
    'code', c,
    'inscrits', ins,
    'actifs', act,
    'filleul', exists (select 1 from public.parrainages f where f.filleul_id = moi)
  );
end $$;
revoke all on function public.mon_parrainage() from public, anon;
grant execute on function public.mon_parrainage() to authenticated;

-- ménage : les codes faux de plus de 7 jours ne servent plus
delete from public.parrain_essais where at < now() - interval '7 days';
