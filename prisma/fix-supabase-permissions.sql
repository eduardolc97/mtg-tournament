-- Fix: "permission denied for schema public" (42501)
-- Run in Supabase → SQL Editor

grant usage on schema public to anon, authenticated;
grant all privileges on all tables in schema public to anon, authenticated;
grant all privileges on all sequences in schema public to anon, authenticated;

grant select, insert, update, delete on public.tournaments to anon, authenticated;
grant select, insert, update, delete on public.players to anon, authenticated;
grant select, insert, update, delete on public.tournament_participants to anon, authenticated;
