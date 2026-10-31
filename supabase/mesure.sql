-- Néophyte : le compteur anonyme (qui revient le lendemain, la deuxième semaine, après un mois ?).
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run ».
-- Chaque ligne ne contient que deux dates et une étiquette : ni identifiant, ni compte, ni heure.
-- Les résultats se lisent dans Table Editor › retention (par jour d'arrivée) et › actifs (par jour).
create table if not exists public.activite (
  cohorte date,                -- jour de la première visite ; vide pour les habitués d'avant le compteur
  jour date not null,          -- jour de la visite
  retour smallint check (retour in (0, 1, 7, 30)),
  -- 0 : premier jour ; 1 : revenu le lendemain ; 7 : revenu entre le 7e et le 13e jour ; 30 : revenu entre le 30e et le 36e jour
  check (cohorte is null or (cohorte >= date '2026-10-01' and cohorte <= jour)),
  check (retour is null or cohorte is not null)
);
create index if not exists activite_jour on public.activite (jour);

alter table public.activite enable row level security;
drop policy if exists "activite: compter" on public.activite;
-- n'importe quel visiteur peut ajouter une ligne du jour, personne ne peut en lire
create policy "activite: compter" on public.activite
  for insert to anon, authenticated
  with check (jour between current_date - 1 and current_date + 1);
grant insert on public.activite to anon, authenticated;

-- garde-fou contre un envoi en masse : 20 000 lignes par jour au plus
create or replace function public.activite_limite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.activite where jour = new.jour) >= 20000 then
    raise exception 'compteur plein pour aujourd''hui';
  end if;
  return new;
end $$;
drop trigger if exists activite_limite on public.activite;
create trigger activite_limite before insert on public.activite
  for each row execute function public.activite_limite();

-- par jour d'arrivée : combien sont venus, et quelle part est revenue
create or replace view public.retention with (security_invoker = true) as
select cohorte as arrivee,
  count(*) filter (where retour = 0) as nouveaux,
  count(*) filter (where retour = 1) as j1,
  count(*) filter (where retour = 7) as j7,
  count(*) filter (where retour = 30) as j30,
  round(100.0 * count(*) filter (where retour = 1) / nullif(count(*) filter (where retour = 0), 0)) as pct_j1,
  round(100.0 * count(*) filter (where retour = 7) / nullif(count(*) filter (where retour = 0), 0)) as pct_j7,
  round(100.0 * count(*) filter (where retour = 30) / nullif(count(*) filter (where retour = 0), 0)) as pct_j30
from public.activite
where cohorte is not null
group by cohorte
order by cohorte desc;

-- par jour : combien d'appareils ont ouvert Néophyte, dont combien de nouveaux
create or replace view public.actifs with (security_invoker = true) as
select jour, count(*) as actifs, count(*) filter (where retour = 0) as nouveaux
from public.activite
group by jour
order by jour desc;

revoke all on public.retention, public.actifs from anon, authenticated;

-- les lignes de plus de deux ans s'effacent (à lancer de temps en temps, ou via Database › Cron)
-- delete from public.activite where jour < current_date - interval '2 years';
