-- Néophyte : les signalements « Je conteste ». À coller une seule fois dans Supabase › SQL Editor, puis « Run ».
-- Chacun peut envoyer des signalements et revoir les siens ; seul le propriétaire du projet les lit tous (Table Editor).
create table if not exists public.signalements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  exercice text not null check (char_length(exercice) <= 40),
  question_id text check (char_length(question_id) <= 80),
  enonce text check (char_length(enonce) <= 600),
  message text not null check (char_length(message) between 3 and 1000),
  created_at timestamptz not null default now(),
  traite boolean not null default false
);

alter table public.signalements enable row level security;

drop policy if exists "signalements: envoyer" on public.signalements;
drop policy if exists "signalements: revoir les siens" on public.signalements;

create policy "signalements: envoyer" on public.signalements
  for insert to authenticated with check ((select auth.uid()) = user_id and traite = false);
create policy "signalements: revoir les siens" on public.signalements
  for select to authenticated using ((select auth.uid()) = user_id);

grant select, insert on public.signalements to authenticated;
grant usage on sequence public.signalements_id_seq to authenticated;

-- pas plus de 20 signalements par personne et par jour
create or replace function public.signalements_limite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.signalements where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'trop de signalements aujourd''hui';
  end if;
  return new;
end $$;
drop trigger if exists signalements_limite on public.signalements;
create trigger signalements_limite before insert on public.signalements
  for each row execute function public.signalements_limite();
