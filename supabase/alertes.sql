-- Néophyte : une alerte sur ton téléphone à chaque « Signaler un problème » (et à chaque « Je conteste »),
-- et la page « Retours » du site, que seul le propriétaire peut ouvrir (Réglages, ou le lien de l'alerte).
-- À coller dans Supabase › SQL Editor, puis « Run » (après retours.sql). Le relancer ne change pas ton canal.
-- L'alerte passe par ntfy.sh, un service de notifications gratuit et sans compte : installe l'appli « ntfy »
-- (App Store ou Google Play), puis abonne-toi au nom de canal affiché tout en bas, une fois le script lancé.
-- Par discrétion, l'alerte ne contient ni le message du testeur ni sa capture : seulement « nouveau signalement »
-- et un lien vers la page « Retours » du site, où tu lis le tout.

create extension if not exists pg_net with schema extensions;

-- réglages privés : aucun utilisateur du site ne peut les lire (RLS sans règle)
create table if not exists public.alertes_config (
  id boolean primary key default true check (id),
  canal text not null default 'neophyte-' || replace(gen_random_uuid()::text, '-', ''),
  email text,           -- facultatif : une adresse qui reçoit aussi l'alerte (ntfy.sh en envoie quelques-unes par jour)
  actif boolean not null default true
);
alter table public.alertes_config add column if not exists proprietaire uuid references auth.users (id) on delete set null;
alter table public.alertes_config enable row level security;
revoke all on public.alertes_config from anon, authenticated;
insert into public.alertes_config (id) values (true) on conflict (id) do nothing;

create or replace function public.alerte_signalement() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.alertes_config;
  quoi text;
begin
  select * into c from public.alertes_config where id;
  if c is null or not c.actif then return new; end if;
  quoi := case when tg_table_name = 'retours' then
            case when new.capture is not null then 'Nouveau signalement avec capture d''écran' else 'Nouveau signalement' end
          else 'Nouvelle réponse contestée' end;
  perform net.http_post(
    url := 'https://ntfy.sh',
    body := jsonb_strip_nulls(jsonb_build_object(
      'topic', c.canal,
      'title', 'Néophyte',
      'message', quoi || '. Touche pour le lire.',
      'tags', jsonb_build_array('triangular_flag_on_post'),
      'click', 'https://yohandk.github.io/Brain-Fit/#retours',
      'email', c.email
    ))
  );
  return new;
exception when others then
  return new; -- une alerte ratée ne doit jamais bloquer l'envoi du testeur
end $$;

drop trigger if exists alerte_retours on public.retours;
create trigger alerte_retours after insert on public.retours
  for each row execute function public.alerte_signalement();

do $$ begin
  if to_regclass('public.signalements') is not null then
    execute 'drop trigger if exists alerte_signalements on public.signalements';
    execute 'create trigger alerte_signalements after insert on public.signalements for each row execute function public.alerte_signalement()';
  end if;
end $$;

-- la page « Retours » : le propriétaire lit tous les retours et leurs captures, et les marque traités
create or replace function public.est_proprietaire() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select c.proprietaire = (select auth.uid()) from public.alertes_config c where c.id), false);
$$;
revoke all on function public.est_proprietaire() from public, anon;
grant execute on function public.est_proprietaire() to authenticated;

drop policy if exists "retours: le propriétaire lit tout" on public.retours;
drop policy if exists "retours: le propriétaire marque traité" on public.retours;
create policy "retours: le propriétaire lit tout" on public.retours
  for select to authenticated using (public.est_proprietaire());
create policy "retours: le propriétaire marque traité" on public.retours
  for update to authenticated using (public.est_proprietaire()) with check (public.est_proprietaire());
grant update (traite) on public.retours to authenticated;

do $$ begin
  if to_regclass('public.signalements') is not null then
    execute 'drop policy if exists "signalements: le propriétaire lit tout" on public.signalements';
    execute 'drop policy if exists "signalements: le propriétaire marque traité" on public.signalements';
    execute 'create policy "signalements: le propriétaire lit tout" on public.signalements for select to authenticated using (public.est_proprietaire())';
    execute 'create policy "signalements: le propriétaire marque traité" on public.signalements for update to authenticated using (public.est_proprietaire()) with check (public.est_proprietaire())';
    execute 'grant update (traite) on public.signalements to authenticated';
  end if;
end $$;

drop policy if exists "retours: le propriétaire voit les captures" on storage.objects;
create policy "retours: le propriétaire voit les captures" on storage.objects
  for select to authenticated using (bucket_id = 'retours' and public.est_proprietaire());

-- le nom de ton canal, à saisir dans l'appli ntfy (garde-le pour toi : qui le connaît reçoit les alertes)
select canal as "Ton canal ntfy" from public.alertes_config;

-- Pour ouvrir la page « Retours » avec ton compte (à faire une fois, avec l'adresse de ton compte Néophyte) :
--   update public.alertes_config set proprietaire = (select id from auth.users where email = 'ton@adresse.fr');
-- Pour recevoir aussi un e-mail : update public.alertes_config set email = 'ton@adresse.fr';
-- Pour couper les alertes :      update public.alertes_config set actif = false;
