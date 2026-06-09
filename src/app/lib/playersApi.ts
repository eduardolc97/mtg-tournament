import type { PlayerProfile, UpsertPlayerInput } from '../types/player';
import { nicknameKey } from '../types/player';
import { supabase } from './supabaseClient';

type PlayerRow = {
  id: string;
  nickname: string;
  nickname_key: string;
  full_name: string | null;
  companion_nick: string | null;
};

function generatePlayerId(): string {
  return `plr-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function formatPlayerError(message: string): string {
  if (message.includes('permission denied for schema public')) {
    return 'Sem permissão no banco. Rode prisma/fix-supabase-permissions.sql no Supabase SQL Editor.';
  }
  return message;
}

function rowToProfile(row: PlayerRow): PlayerProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    fullName: row.full_name,
    companionNick: row.companion_nick,
  };
}

export async function fetchPlayers(): Promise<PlayerProfile[]> {
  const { data, error } = await supabase
    .from('players')
    .select('id, nickname, nickname_key, full_name, companion_nick')
    .order('nickname', { ascending: true });
  if (error) {
    throw new Error(formatPlayerError(error.message));
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return (data as PlayerRow[]).map(rowToProfile);
}

export async function fetchPlayerById(id: string): Promise<PlayerProfile | null> {
  const { data, error } = await supabase
    .from('players')
    .select('id, nickname, nickname_key, full_name, companion_nick')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw new Error(formatPlayerError(error.message));
  }
  if (!data) {
    return null;
  }
  return rowToProfile(data as PlayerRow);
}

export async function fetchPlayerByNicknameKey(
  key: string
): Promise<PlayerProfile | null> {
  const { data, error } = await supabase
    .from('players')
    .select('id, nickname, nickname_key, full_name, companion_nick')
    .eq('nickname_key', key)
    .maybeSingle();
  if (error) {
    throw new Error(formatPlayerError(error.message));
  }
  if (!data) {
    return null;
  }
  return rowToProfile(data as PlayerRow);
}

export async function searchPlayersByNickname(
  query: string
): Promise<PlayerProfile[]> {
  const all = await fetchPlayers();
  const q = query.trim().toLowerCase();
  if (!q) {
    return all.slice(0, 50);
  }
  return all
    .filter((p) => p.nickname.toLowerCase().includes(q))
    .slice(0, 50);
}

export async function upsertPlayer(
  input: UpsertPlayerInput
): Promise<PlayerProfile> {
  const nickname = input.nickname.trim();
  const fullName = input.fullName.trim();
  const key = nicknameKey(nickname);

  if (!nickname) {
    throw new Error('Apelido é obrigatório');
  }
  if (!fullName) {
    throw new Error('Nome completo é obrigatório');
  }

  const companion =
    input.companionNick !== undefined && input.companionNick !== null
      ? input.companionNick.trim() || null
      : null;

  const existing = await fetchPlayerByNicknameKey(key);

  if (existing) {
    const { data, error } = await supabase
      .from('players')
      .update({
        full_name: fullName,
        companion_nick: companion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id, nickname, nickname_key, full_name, companion_nick')
      .single();
    if (error) {
      throw new Error(formatPlayerError(error.message));
    }
    return rowToProfile(data as PlayerRow);
  }

  const { data, error } = await supabase
    .from('players')
    .insert({
      id: generatePlayerId(),
      nickname,
      nickname_key: key,
      full_name: fullName,
      companion_nick: companion,
    })
    .select('id, nickname, nickname_key, full_name, companion_nick')
    .single();
  if (error) {
    throw new Error(formatPlayerError(error.message));
  }
  return rowToProfile(data as PlayerRow);
}
