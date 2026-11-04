-- Néophyte : qui revient ? À coller dans Supabase › SQL Editor, puis « Run » (après setup.sql et alertes.sql).
-- Pour le test avec les premiers testeurs : par compte, sans e-mail ni nom, le jour d'inscription, le premier
-- et le dernier jour actif, le nombre de jours actifs, et s'il est revenu 7 puis 30 jours après son premier jour.
-- Réservé au propriétaire (est_proprietaire, comme la page des retours) : la fonction refuse tout autre compte.
-- Un jour actif = au moins un exercice coché ce jour-là dans ses progrès. Les visiteurs sans compte ne sont pas comptés.

create or replace function public.assiduite()
returns table (rang int, moi boolean, inscrit date, premier date, dernier date, jours int, j7 boolean, j30 boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.est_proprietaire() then
    raise exception 'réservé au propriétaire' using errcode = '42501';
  end if;
  return query
  with act as (
    select d.user_id, (k.key)::date as jour
    from public.docs d, jsonb_each(case when jsonb_typeof(d.data->'days') = 'object' then d.data->'days' else '{}'::jsonb end) k
    where d.name = 'progress'
      and k.key ~ '^\d{4}-\d{2}-\d{2}$'
      and jsonb_typeof(k.value->'done') = 'object'
      and exists (select 1 from jsonb_each(k.value->'done') x where x.value not in ('false'::jsonb, 'null'::jsonb, '0'::jsonb))
  ), u as (
    select a.user_id, min(a.jour) as premier, max(a.jour) as dernier, count(*)::int as jours
    from act a group by a.user_id
  )
  select (row_number() over (order by au.created_at))::int,
         au.id = (select auth.uid()),
         au.created_at::date, u.premier, u.dernier, coalesce(u.jours, 0),
         exists (select 1 from act a where a.user_id = au.id and a.jour >= u.premier + 7),
         exists (select 1 from act a where a.user_id = au.id and a.jour >= u.premier + 30)
  from auth.users au
  left join u on u.user_id = au.id
  order by au.created_at;
end $$;

revoke all on function public.assiduite() from public, anon;
grant execute on function public.assiduite() to authenticated;
