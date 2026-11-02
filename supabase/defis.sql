-- Néophyte : défis entre amis du cercle (énigme du jour, meilleur Éclair de la semaine).
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après cercle.sql).
-- Sans ce script, le cercle fonctionne comme avant : ces deux scores ne s'affichent simplement pas.

alter table public.circle_members
  add column if not exists enig_day date,
  add column if not exists enig smallint check (enig between 0 and 5),
  add column if not exists eclair_week date,
  add column if not exists eclair integer not null default 0 check (eclair between 0 and 500);
