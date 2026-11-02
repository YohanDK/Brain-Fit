-- Néophyte : codes de cercle plus longs et essais limités pour rejoindre un cercle.
-- À coller une seule fois dans Supabase › SQL Editor, puis « Run » (après cercle.sql), AVANT de publier la version du site qui va avec.
-- Les cercles existants gardent leur code à 6 caractères ; les nouveaux en ont 8.
-- On ne rejoint plus un cercle par une simple écriture dans circle_members : on passe par rejoindre_cercle(),
-- qui compte les codes faux (10 par compte et par jour au plus), pour qu'aucun script ne puisse deviner les codes.

-- 1. codes de 6 à 10 caractères
alter table public.circles drop constraint if exists circles_code_check;
alter table public.circles add constraint circles_code_check check (code ~ '^[A-Z0-9]{6,10}$');

-- 2. les codes faux essayés, illisibles depuis le site
create table if not exists public.circle_join_tries (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists circle_join_tries_user on public.circle_join_tries (user_id, at);
alter table public.circle_join_tries enable row level security;
revoke all on public.circle_join_tries from anon, authenticated;

-- 3. entrer dans un cercle : vrai si le code existe (la personne y est alors inscrite), faux sinon
create or replace function public.rejoindre_cercle(p_code text, p_pseudo text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  c text := upper(trim(p_code));
begin
  if moi is null then raise exception 'connexion requise'; end if;
  if char_length(coalesce(trim(p_pseudo), '')) not between 2 and 24 then raise exception 'pseudo invalide'; end if;
  if exists (select 1 from public.circle_members m where m.code = c and m.user_id = moi) then return true; end if;
  if (select count(*) from public.circle_join_tries t where t.user_id = moi and t.at > now() - interval '1 day') >= 10 then
    raise exception 'trop d''essais';
  end if;
  if c !~ '^[A-Z0-9]{6,10}$' or not exists (select 1 from public.circles k where k.code = c) then
    insert into public.circle_join_tries (user_id) values (moi);
    return false;
  end if;
  insert into public.circle_members (code, user_id, pseudo) values (c, moi, trim(p_pseudo)) on conflict do nothing;
  return true;
end $$;
revoke all on function public.rejoindre_cercle(text, text) from public, anon;
grant execute on function public.rejoindre_cercle(text, text) to authenticated;

-- 4. écrire sa ligne : seulement dans un cercle qu'on a créé ou rejoint par la fonction ci-dessus
create or replace function public.is_circle_creator(c text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circles k where k.code = c and k.created_by = (select auth.uid()));
$$;
revoke all on function public.is_circle_creator(text) from public, anon;
grant execute on function public.is_circle_creator(text) to authenticated;

drop policy if exists "membres: entrer" on public.circle_members;
create policy "membres: entrer" on public.circle_members
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (public.is_circle_member(code) or public.is_circle_creator(code)));

-- on ne change pas de cercle en modifiant sa ligne : il faut le quitter puis en rejoindre un autre
drop policy if exists "membres: se mettre à jour" on public.circle_members;
create policy "membres: se mettre à jour" on public.circle_members
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_circle_member(code));

-- ménage : les essais de plus de 7 jours ne servent plus
delete from public.circle_join_tries where at < now() - interval '7 days';
