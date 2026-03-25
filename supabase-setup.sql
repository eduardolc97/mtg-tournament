grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.tournaments to anon, authenticated;
grant select, insert, update, delete on public.preset_player_names to anon, authenticated;
grant usage, select on sequence public.preset_player_names_id_seq to anon, authenticated;
