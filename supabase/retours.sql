-- Néophyte : « Signaler un problème » (phase de test). À coller une seule fois dans Supabase › SQL Editor, puis « Run ».
-- Chaque testeur connecté envoie un commentaire, le contexte de l'écran et, s'il la laisse, une capture.
-- Les messages se lisent dans Table Editor › retours ; les captures dans Storage › retours (colonne « capture » = chemin du fichier).
-- Personne d'autre que le propriétaire du projet ne peut lire les retours des autres.

create table if not exists public.retours (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  message text not null check (char_length(message) between 3 and 2000),
  contexte jsonb not null default '{}'::jsonb check (pg_column_size(contexte) <= 4000),
  capture text check (capture is null or capture like (user_id::text || '/%')),
  created_at timestamptz not null default now(),
  traite boolean not null default false
);

alter table public.retours enable row level security;

drop policy if exists "retours: envoyer" on public.retours;
drop policy if exists "retours: revoir les siens" on public.retours;

create policy "retours: envoyer" on public.retours
  for insert to authenticated with check ((select auth.uid()) = user_id and traite = false);
create policy "retours: revoir les siens" on public.retours
  for select to authenticated using ((select auth.uid()) = user_id);

grant select, insert on public.retours to authenticated;

-- pas plus de 20 retours par personne et par jour
create or replace function public.retours_limite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.retours where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'trop de retours aujourd''hui';
  end if;
  return new;
end $$;
drop trigger if exists retours_limite on public.retours;
create trigger retours_limite before insert on public.retours
  for each row execute function public.retours_limite();

-- le dossier privé des captures : images seulement, 2 Mo au plus chacune
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('retours', 'retours', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- combien de captures cette personne a-t-elle déjà déposées aujourd'hui ?
create or replace function public.retours_captures_du_jour() returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from storage.objects
  where bucket_id = 'retours' and name like ((select auth.uid())::text || '/%') and created_at > now() - interval '1 day';
$$;
revoke all on function public.retours_captures_du_jour() from public, anon;
grant execute on function public.retours_captures_du_jour() to authenticated;

-- chacun dépose ses captures dans son propre sous-dossier (son identifiant), sans pouvoir les relire ni celles des autres
drop policy if exists "retours: déposer une capture" on storage.objects;
create policy "retours: déposer une capture" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'retours'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.retours_captures_du_jour() < 20
  );
