-- Néophyte : l'avant-première sur invitation, jusqu'au lancement.
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après setup.sql et parrainage.sql).
--
-- Tant que l'avant-première est en cours, un compte ne se crée qu'avec :
--   • un code d'invitation que tu distribues (« École Saint-Jo : 30 places »), lien …/Brain-Fit/?invit=CODE ;
--   • ou le lien de parrainage d'un membre (…/?parrain=CODE), 3 places par membre.
-- Les comptes déjà créés ne sont pas touchés : seule la CRÉATION d'un nouveau compte est vérifiée.
-- Les visiteurs sans invitation peuvent laisser leur e-mail : ils seront prévenus de l'ouverture.
--
-- Au lancement, une seule ligne ouvre les portes à tous :
--   update public.acces_reglage set sur_invitation = false;

-- 1. le réglage : avant-première (true) ou ouvert à tous (false)
create table if not exists public.acces_reglage (
  id int primary key default 1 check (id = 1),
  sur_invitation boolean not null default true,
  places_par_parrain int not null default 3
);
insert into public.acces_reglage (id) values (1) on conflict (id) do nothing;

-- 2. les codes d'invitation, et qui est entré avec quel code
create table if not exists public.invitations (
  code text primary key check (code ~ '^[A-Z0-9-]{6,24}$'),
  groupe text not null default '',
  places int not null default 1 check (places >= 0),
  utilisees int not null default 0,
  expire date,
  created_at timestamptz not null default now()
);
create table if not exists public.invitation_usages (
  email text primary key,
  code text not null,
  sorte text not null check (sorte in ('invitation','parrain')),
  at timestamptz not null default now()
);
create index if not exists invitation_usages_code on public.invitation_usages (code);

-- 3. la liste d'attente (e-mail seulement, pour prévenir à l'ouverture)
create table if not exists public.liste_attente (
  email text primary key check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  at timestamptz not null default now()
);

-- illisibles depuis le site : on n'y touche que par les fonctions ci-dessous (et toi, dans le SQL Editor)
alter table public.acces_reglage enable row level security;
alter table public.invitations enable row level security;
alter table public.invitation_usages enable row level security;
alter table public.liste_attente enable row level security;
revoke all on public.acces_reglage, public.invitations, public.invitation_usages, public.liste_attente from anon, authenticated;

-- 4. que vaut ce code ? (le site le demande avant d'afficher « Créer mon compte »)
-- réponses : 'ouvert' (plus d'avant-première), 'ok' (invitation), 'parrain' (lien d'un membre), 'complet', 'inconnu'
create or replace function public.verifier_invitation(p_code text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.acces_reglage;
  c text := upper(trim(coalesce(p_code, '')));
  i public.invitations;
begin
  select * into r from public.acces_reglage where id = 1;
  if r is null or not r.sur_invitation then return 'ouvert'; end if;
  if c = '' or length(c) > 24 then return 'inconnu'; end if;
  select * into i from public.invitations where code = c;
  if i.code is not null then
    if i.utilisees >= i.places or (i.expire is not null and i.expire < current_date) then return 'complet'; end if;
    return 'ok';
  end if;
  if exists (select 1 from public.parrain_codes p where p.code = c) then
    if (select count(*) from public.invitation_usages u where u.code = c and u.sorte = 'parrain') >= r.places_par_parrain then return 'complet'; end if;
    return 'parrain';
  end if;
  return 'inconnu';
end $$;
revoke all on function public.verifier_invitation(text) from public;
grant execute on function public.verifier_invitation(text) to anon, authenticated;

-- 5. le verrou : à la création d'un compte, une invitation valide est exigée (et une place est prise)
create or replace function public.exiger_invitation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r public.acces_reglage;
  inv text := upper(trim(coalesce(new.raw_user_meta_data->>'invitation', '')));
  par text := upper(trim(coalesce(new.raw_user_meta_data->>'parrain', '')));
  pris text;
begin
  select * into r from public.acces_reglage where id = 1;
  if r is null or not r.sur_invitation then return new; end if;
  if inv <> '' then
    update public.invitations set utilisees = utilisees + 1
      where code = inv and utilisees < places and (expire is null or expire >= current_date)
      returning code into pris;
    if pris is not null then
      insert into public.invitation_usages (email, code, sorte) values (lower(new.email), pris, 'invitation') on conflict (email) do nothing;
      return new;
    end if;
  end if;
  -- le lien de parrainage d'un membre vaut invitation, dans la limite de ses places
  for pris in select x from unnest(array[par, inv]) x where x <> '' loop
    if exists (select 1 from public.parrain_codes p where p.code = pris)
       and (select count(*) from public.invitation_usages u where u.code = pris and u.sorte = 'parrain') < r.places_par_parrain then
      insert into public.invitation_usages (email, code, sorte) values (lower(new.email), pris, 'parrain') on conflict (email) do nothing;
      return new;
    end if;
  end loop;
  raise exception 'NEOPHYTE_INVITATION_REQUISE' using errcode = 'P0001';
end $$;
revoke all on function public.exiger_invitation() from public, anon, authenticated;
drop trigger if exists neophyte_exiger_invitation on auth.users;
create trigger neophyte_exiger_invitation before insert on auth.users
  for each row execute function public.exiger_invitation();

-- 6. s'inscrire sur la liste d'attente (un e-mail, une fois ; aucune lecture possible depuis le site)
create or replace function public.rejoindre_liste_attente(p_email text) returns text
language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(coalesce(p_email, '')));
begin
  if length(e) > 254 or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'invalide'; end if;
  -- frein contre les robots : 300 inscriptions par heure au plus pour tout le site
  if (select count(*) from public.liste_attente where at > now() - interval '1 hour') >= 300 then return 'plus_tard'; end if;
  insert into public.liste_attente (email) values (e) on conflict (email) do nothing;
  return 'ok';
end $$;
revoke all on function public.rejoindre_liste_attente(text) from public;
grant execute on function public.rejoindre_liste_attente(text) to anon, authenticated;

-- 7. pour toi, dans le SQL Editor : créer un code (aléatoire, difficile à deviner)
--    select public.creer_invitation('École Saint-Jo', 30);            → par exemple « STJO-7K2PQX »
--    select public.creer_invitation('Famille', 10, 'FAMILLE');        → préfixe au choix
--    select public.creer_invitation('Salon du livre', 50, 'SALON', '2026-12-31');  → avec date limite
create or replace function public.creer_invitation(p_groupe text, p_places int, p_prefixe text default '', p_expire date default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  a constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  pre text := upper(regexp_replace(coalesce(p_prefixe, ''), '[^A-Za-z0-9]', '', 'g'));
  c text;
begin
  pre := left(pre, 10);
  loop
    c := '';
    for k in 1..6 loop c := c || substr(a, 1 + floor(random() * length(a))::int, 1); end loop;
    if pre <> '' then c := pre || '-' || c; end if;
    exit when not exists (select 1 from public.invitations where code = c);
  end loop;
  insert into public.invitations (code, groupe, places, expire) values (c, coalesce(p_groupe, ''), greatest(0, p_places), p_expire);
  return c;
end $$;
revoke all on function public.creer_invitation(text, int, text, date) from public, anon, authenticated;

-- Requêtes utiles (SQL Editor) :
--   select code, groupe, utilisees || ' / ' || places as places, expire from public.invitations order by created_at;
--   select count(*) from public.liste_attente;            -- combien attendent
--   select email, at from public.liste_attente order by at;  -- la liste, pour les prévenir au lancement
--   update public.invitations set places = places + 10 where code = 'STJO-7K2PQX';  -- rallonger
