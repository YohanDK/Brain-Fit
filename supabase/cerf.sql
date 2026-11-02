-- Néophyte : le cerf de chacun dans le classement du cercle (pelage, niveau, attributs portés).
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après cercle.sql).
-- Sans ce script, le cercle fonctionne comme avant : chacun y voit simplement le cerf de base.

alter table public.circle_members
  add column if not exists cerf jsonb check (cerf is null or (jsonb_typeof(cerf) = 'object' and pg_column_size(cerf) < 400));
