-- Néophyte : plafond d'échanges avec le coach, par compte et par jour (heure de Paris).
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run ». Le relancer ne change rien à ce qui existe.
-- Sans ce script, le coach ne marche que pour toi, sans plafond : à lancer avant d'ouvrir le coach à d'autres comptes que le tien.
-- Plafonds : COACH_MAX_JOUR pour toi (30 par défaut), COACH_MAX_TESTEUR par testeur (8), COACH_MAX_TOTAL_JOUR pour tous les testeurs ensemble (300).

create table if not exists public.coach_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  jour date not null,
  n integer not null default 0,
  primary key (user_id, jour)
);
-- illisible et non modifiable depuis le site : seule la fonction « coach » (clé serveur) y touche
alter table public.coach_usage enable row level security;
revoke all on public.coach_usage from anon, authenticated;

-- compte un échange et dit s'il reste dans le plafond ; au-delà, rien n'est compté
create or replace function public.coach_consommer(p_user uuid, p_max integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  j date := (now() at time zone 'Europe/Paris')::date;
  v integer;
begin
  insert into public.coach_usage as u (user_id, jour, n) values (p_user, j, 1)
  on conflict (user_id, jour) do update set n = u.n + 1 where u.n < p_max
  returning n into v;
  return v is not null;
end $$;
revoke all on function public.coach_consommer(uuid, integer) from public, anon, authenticated;
grant execute on function public.coach_consommer(uuid, integer) to service_role;

-- testeurs choisis : un e-mail par ligne (celui de leur compte Néophyte, e-mail confirmé). Seule la fonction « coach » la lit.
create table if not exists public.coach_testeurs (
  email text primary key check (email = lower(email)),
  note text,
  ajoute_le timestamptz not null default now()
);
alter table public.coach_testeurs enable row level security;
revoke all on public.coach_testeurs from anon, authenticated;

-- Ajouter un testeur (relançable) :
--   insert into public.coach_testeurs (email, note) values (lower('prenom@exemple.fr'), 'Prénom') on conflict do nothing;
-- Retirer un testeur :
--   delete from public.coach_testeurs where email = lower('prenom@exemple.fr');
-- Voir la liste :
--   select * from public.coach_testeurs order by ajoute_le;

-- ménage : les compteurs de plus de 90 jours ne servent plus
delete from public.coach_usage where jour < current_date - 90;

-- Pour voir qui utilise le plus le coach ces 7 derniers jours :
--   select user_id, sum(n) from public.coach_usage where jour > current_date - 7 group by 1 order by 2 desc;
