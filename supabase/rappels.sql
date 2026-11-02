-- Néophyte : les rappels par notification (séance du jour, série en danger).
-- À coller dans Supabase › SQL Editor, puis « Run » (après setup.sql). Le relancer ne change rien à ce qui existe.
-- Chacun active ou coupe ses rappels dans Réglages › Rappels. Pour tout couper ou tout enlever, voir en bas du fichier.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- un abonnement par appareil : l'adresse d'envoi fournie par le navigateur, ses deux clés, l'heure choisie
create table if not exists public.rappels (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  heure time not null default '19:00',
  serie boolean not null default true,          -- relance à 21 h si une série d'au moins 2 jours est en danger
  fuseau text not null default 'Europe/Paris',
  dernier_rappel date,
  dernier_serie date,
  cree_le timestamptz not null default now()
);
create index if not exists rappels_user on public.rappels (user_id);
alter table public.rappels enable row level security;

drop policy if exists "rappels: lire les siens" on public.rappels;
drop policy if exists "rappels: retirer les siens" on public.rappels;
create policy "rappels: lire les siens" on public.rappels
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "rappels: retirer les siens" on public.rappels
  for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.rappels from anon, authenticated;
grant select, delete on public.rappels to authenticated;

-- s'abonner ou changer d'heure : passe par cette fonction, qui reprend l'appareil s'il servait à un autre compte
create or replace function public.rappel_inscrire(p_endpoint text, p_p256dh text, p_auth text, p_heure time, p_serie boolean, p_fuseau text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  tz text := case when exists (select 1 from pg_catalog.pg_timezone_names where name = p_fuseau) then p_fuseau else 'Europe/Paris' end;
  maintenant timestamp := now() at time zone tz;
begin
  if moi is null then raise exception 'connexion requise'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'abonnement invalide';
  end if;
  if (select count(*) from public.rappels where user_id = moi and endpoint <> p_endpoint) >= 10 then
    raise exception 'trop d''appareils';
  end if;
  delete from public.rappels where endpoint = p_endpoint and user_id <> moi;
  insert into public.rappels as r (endpoint, user_id, p256dh, auth, heure, serie, fuseau, dernier_rappel)
  -- si l'heure est déjà passée aujourd'hui, le premier rappel attend demain
  values (p_endpoint, moi, p_p256dh, p_auth, p_heure, p_serie, tz, case when maintenant::time >= p_heure then maintenant::date end)
  on conflict (endpoint) do update set
    p256dh = excluded.p256dh, auth = excluded.auth, serie = excluded.serie, fuseau = excluded.fuseau,
    heure = excluded.heure,
    dernier_rappel = case when r.heure = excluded.heure then r.dernier_rappel else excluded.dernier_rappel end;
end $$;
revoke all on function public.rappel_inscrire(text, text, text, time, boolean, text) from public, anon;
grant execute on function public.rappel_inscrire(text, text, text, time, boolean, text) to authenticated;

-- réglages privés (aucun utilisateur ne peut les lire) : clés VAPID, créées par la fonction au premier appel,
-- jeton que seul pg_cron présente, et l'interrupteur général
create table if not exists public.rappels_config (
  id boolean primary key default true check (id),
  vapid jsonb,
  jeton text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  actif boolean not null default true
);
alter table public.rappels_config enable row level security;
revoke all on public.rappels_config from anon, authenticated;
insert into public.rappels_config (id) values (true) on conflict (id) do nothing;

-- tous les quarts d'heure, la fonction « rappels » fait sa tournée
select cron.schedule('neophyte-rappels', '*/15 * * * *', $job$
  select net.http_post(
    url := 'https://kmcelzkxnxeqwwpvyycm.supabase.co/functions/v1/rappels',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-jeton', (select jeton from public.rappels_config where id)),
    body := '{}'::jsonb
  );
$job$);

-- ───────────── Interrupteurs ─────────────
-- Suspendre tous les envois (les abonnements sont gardés) :
--   update public.rappels_config set actif = false;
-- Les reprendre :
--   update public.rappels_config set actif = true;
-- Cacher le réglage sur le site : rappels:false dans public/config.js.
--
-- Tout enlever (aucune autre table n'en dépend) :
--   select cron.unschedule('neophyte-rappels');
--   drop function if exists public.rappel_inscrire(text, text, text, time, boolean, text);
--   drop table if exists public.rappels, public.rappels_config;
