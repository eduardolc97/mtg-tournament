-- Run once in Supabase SQL Editor (Dashboard → SQL → New query)

grant usage on schema public to anon, authenticated;
grant all privileges on all tables in schema public to anon, authenticated;
grant all privileges on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant all on tables to anon, authenticated;

alter default privileges in schema public
  grant all on sequences to anon, authenticated;

-- Explicit grants (idempotent)
grant select, insert, update, delete on public.tournaments to anon, authenticated;
grant select, insert, update, delete on public.players to anon, authenticated;
grant select, insert, update, delete on public.player_aliases to anon, authenticated;
grant select, insert, update, delete on public.tournament_participants to anon, authenticated;
