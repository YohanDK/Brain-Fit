-- Néophyte : durcissement après la revue « à la place d'un pirate » (novembre 2026).
-- À coller dans Supabase › SQL Editor, puis « Run », après les autres scripts. Le relancer ne change rien de plus.
-- Chaque bloc ne s'applique que si la table concernée existe : on peut le lancer même sans duels, plaidoyers ou rappels.

-- 1. Taille des sauvegardes : un compte ne peut pas remplir la base avec un document géant.
--    4 Mo par document (progrès ou textes) : une année d'usage intense en fait quelques centaines de Ko.
--    « not valid » : les lignes existantes ne sont pas revérifiées, seules les nouvelles écritures le sont.
alter table public.docs drop constraint if exists docs_taille;
alter table public.docs add constraint docs_taille check (pg_column_size(data) < 4194304) not valid;

-- 2. Cercles : 5 créations par compte et par jour au plus (pas de pluie de cercles fantômes).
create or replace function public.cercles_limite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.circles where created_by = new.created_by and created_at > now() - interval '1 day') >= 5 then
    raise exception 'trop de cercles aujourd''hui';
  end if;
  return new;
end $$;
drop trigger if exists cercles_limite on public.circles;
create trigger cercles_limite before insert on public.circles for each row execute function public.cercles_limite();

-- 3. Rappels : l'adresse d'envoi doit être celle d'un vrai service de notifications (Google, Mozilla, Apple, Microsoft),
--    sinon un compte pourrait faire envoyer des requêtes par le serveur vers n'importe quel site.
do $$ begin
  if to_regclass('public.rappels') is null then return; end if;
  execute $f$
  create or replace function public.rappel_inscrire(p_endpoint text, p_p256dh text, p_auth text, p_heure time, p_serie boolean, p_fuseau text)
  returns void language plpgsql security definer set search_path = '' as $b$
  declare
    moi uuid := auth.uid();
    tz text := case when exists (select 1 from pg_catalog.pg_timezone_names where name = p_fuseau) then p_fuseau else 'Europe/Paris' end;
    maintenant timestamp := now() at time zone tz;
  begin
    if moi is null then raise exception 'connexion requise'; end if;
    if p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
       or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
      raise exception 'abonnement invalide';
    end if;
    if (select count(*) from public.rappels where user_id = moi and endpoint <> p_endpoint) >= 10 then
      raise exception 'trop d''appareils';
    end if;
    delete from public.rappels where endpoint = p_endpoint and user_id <> moi;
    insert into public.rappels as r (endpoint, user_id, p256dh, auth, heure, serie, fuseau, dernier_rappel)
    values (p_endpoint, moi, p_p256dh, p_auth, p_heure, p_serie, tz, case when maintenant::time >= p_heure then maintenant::date end)
    on conflict (endpoint) do update set
      p256dh = excluded.p256dh, auth = excluded.auth, serie = excluded.serie, fuseau = excluded.fuseau,
      heure = excluded.heure,
      dernier_rappel = case when r.heure = excluded.heure then r.dernier_rappel else excluded.dernier_rappel end;
  end $b$;
  $f$;
  execute 'revoke all on function public.rappel_inscrire(text, text, text, time, boolean, text) from public, anon';
  execute 'grant execute on function public.rappel_inscrire(text, text, text, time, boolean, text) to authenticated';
  -- les abonnements déjà enregistrés vers une autre adresse sont retirés
  execute $q$delete from public.rappels where endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'$q$;
end $$;

-- 4. Duels : la première manche ne contient que des 0 et des 1, et un temps plausible (pas de 5 sur 5 en 0 seconde).
do $$ begin
  if to_regclass('public.duels') is null then return; end if;
  execute 'drop policy if exists "duels: lancer" on public.duels';
  execute $p$
  create policy "duels: lancer" on public.duels
    for insert to authenticated with check (
      a = (select auth.uid())
      and public.is_circle_member(code)
      and public.is_member_of(code, b)
      and tour = b and not fini and abandon is null
      and jsonb_typeof(manches) = 'array' and jsonb_array_length(manches) = 1
      and manches -> 0 ->> 'f' in ('chrono', 'ortho', 'soph', 'cit', 'fermi', 'ia', 'calc')
      and jsonb_typeof(manches -> 0 -> 'a') = 'array' and jsonb_array_length(manches -> 0 -> 'a') = 5
      and not exists (select 1 from jsonb_array_elements(manches -> 0 -> 'a') x where x not in ('0'::jsonb, '1'::jsonb))
      and jsonb_typeof(manches -> 0 -> 'ta') = 'number' and (manches -> 0 ->> 'ta')::numeric between 0 and 36000
      and coalesce(manches -> 0 ->> 'b', '') = '' and coalesce(manches -> 0 ->> 'tb', '') = '')
  $p$;
end $$;

-- 5. « Qui a raison ? » : on ne peut plus effacer sa copie le jour même pour la réécrire après avoir lu celles des autres.
do $$ begin
  if to_regclass('public.plaidoyers') is null then return; end if;
  execute 'drop policy if exists "plaidoyers: effacer" on public.plaidoyers';
  execute 'create policy "plaidoyers: effacer" on public.plaidoyers for delete to authenticated using (user_id = (select auth.uid()) and day < current_date)';
end $$;
