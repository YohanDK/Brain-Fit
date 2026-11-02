-- Néophyte : une alerte sur ton téléphone à chaque « Signaler un problème » (et à chaque « Je conteste »).
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après retours.sql).
-- L'alerte passe par ntfy.sh, un service de notifications gratuit et sans compte : installe l'appli « ntfy »
-- (App Store ou Google Play), puis abonne-toi au nom de canal affiché tout en bas, une fois le script lancé.
-- Par discrétion, l'alerte ne contient ni le message du testeur ni sa capture : seulement « nouveau signalement »
-- et un lien vers Supabase, où tu lis le tout.

create extension if not exists pg_net with schema extensions;

-- réglages privés : aucun utilisateur du site ne peut les lire (RLS sans règle)
create table if not exists public.alertes_config (
  id boolean primary key default true check (id),
  canal text not null default 'neophyte-' || replace(gen_random_uuid()::text, '-', ''),
  email text,           -- facultatif : une adresse qui reçoit aussi l'alerte (ntfy.sh en envoie quelques-unes par jour)
  actif boolean not null default true
);
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
      'message', quoi || '. Ouvre Supabase pour le lire.',
      'tags', jsonb_build_array('triangular_flag_on_post'),
      'click', 'https://supabase.com/dashboard/project/kmcelzkxnxeqwwpvyycm/editor',
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

-- le nom de ton canal, à saisir dans l'appli ntfy (garde-le pour toi : qui le connaît reçoit les alertes)
select canal as "Ton canal ntfy" from public.alertes_config;

-- Pour recevoir aussi un e-mail : update public.alertes_config set email = 'ton@adresse.fr';
-- Pour couper les alertes :      update public.alertes_config set actif = false;
