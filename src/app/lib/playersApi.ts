import type { PlayerProfile, UpsertPlayerInput } from '../types/player';
import {
  matchesPlayerSearch,
  nicknameKey,
  playerIdentityKeys,
  playerNameMatchKey,
} from '../types/player';
import { supabase } from './supabaseClient';

type PlayerRow = {
  id: string;
  nickname: string;
  nickname_key: string;
  full_name: string | null;
  companion_nick: string | null;
};

type PlayerAliasRow = {
  alias_key: string;
  alias: string;
  player_id: string;
};

function generatePlayerId(): string {
  return `plr-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function isMissingAliasTable(message: string): boolean {
  return (
    message.includes('player_aliases') &&
    (message.includes('does not exist') || message.includes('schema cache'))
  );
}

function formatPlayerError(message: string): string {
  if (isMissingAliasTable(message)) {
    return 'A tabela de aliases ainda não existe no banco. Aplique a migração 20260925130000_add_player_aliases.';
  }
  if (message.includes('permission denied for schema public')) {
    return 'Sem permissão no banco. Rode prisma/fix-supabase-permissions.sql no Supabase SQL Editor.';
  }
  return message;
}

function rowToProfile(
  row: PlayerRow,
  aliases: string[] = []
): PlayerProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    fullName: row.full_name,
    companionNick: row.companion_nick,
    aliases,
  };
}

export async function fetchPlayers(): Promise<PlayerProfile[]> {
  const [playersResult, aliasesResult] = await Promise.all([
    supabase
      .from('players')
      .select('id, nickname, nickname_key, full_name, companion_nick')
      .order('nickname', { ascending: true }),
    supabase
      .from('player_aliases')
      .select('alias_key, alias, player_id')
      .order('alias', { ascending: true }),
  ]);
  if (playersResult.error) {
    throw new Error(formatPlayerError(playersResult.error.message));
  }
  if (!Array.isArray(playersResult.data)) {
    return [];
  }
  if (aliasesResult.error) {
    console.warn(
      'Could not load player aliases; continuing with registered nicknames.',
      formatPlayerError(aliasesResult.error.message)
    );
    return (playersResult.data as PlayerRow[]).map((row) => rowToProfile(row));
  }

  const aliasesByPlayer = new Map<string, string[]>();
  for (const row of (aliasesResult.data ?? []) as PlayerAliasRow[]) {
    const aliases = aliasesByPlayer.get(row.player_id) ?? [];
    aliases.push(row.alias);
    aliasesByPlayer.set(row.player_id, aliases);
  }

  return (playersResult.data as PlayerRow[]).map((row) =>
    rowToProfile(row, aliasesByPlayer.get(row.id) ?? [])
  );
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
  const q = query.trim();
  if (!q) {
    return all.slice(0, 50);
  }
  return all.filter((p) => matchesPlayerSearch(p, q)).slice(0, 50);
}

export async function savePlayerAlias(
  playerId: string,
  rawAlias: string
): Promise<void> {
  const alias = rawAlias.trim();
  const aliasKey = playerNameMatchKey(alias);
  if (!alias || !aliasKey) {
    throw new Error('O alias do jogador não pode ficar vazio.');
  }

  const profiles = await fetchPlayers();
  const target = profiles.find((profile) => profile.id === playerId);
  if (!target) {
    throw new Error('Jogador não encontrado. Atualize a lista e tente novamente.');
  }

  const conflict = profiles.find(
    (profile) =>
      profile.id !== playerId && playerIdentityKeys(profile).has(aliasKey)
  );
  if (conflict) {
    throw new Error(
      `“${alias}” já está associado a ${conflict.nickname}. Resolva esse conflito antes de importar.`
    );
  }

  const currentAlias = target.aliases?.find(
    (value) => playerNameMatchKey(value) === aliasKey
  );
  if (currentAlias === alias) {
    return;
  }

  if (currentAlias) {
    const { error } = await supabase
      .from('player_aliases')
      .update({ alias })
      .eq('alias_key', aliasKey)
      .eq('player_id', playerId);
    if (error) {
      throw new Error(formatPlayerError(error.message));
    }
    return;
  }

  const { error } = await supabase.from('player_aliases').insert({
    alias_key: aliasKey,
    alias,
    player_id: playerId,
  });
  if (error) {
    if (error.code === '23505') {
      throw new Error(
        `“${alias}” acabou de ser associado a outro jogador. Atualize a lista e tente novamente.`
      );
    }
    throw new Error(formatPlayerError(error.message));
  }
}

export async function updatePlayerProfile(
  playerId: string,
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

  const profiles = await fetchPlayers();
  const current = profiles.find((profile) => profile.id === playerId);
  if (!current) {
    throw new Error('Jogador não encontrado. Atualize a lista e tente novamente.');
  }

  const duplicateNickname = profiles.find(
    (profile) => nicknameKey(profile.nickname) === key
  );
  if (duplicateNickname && duplicateNickname.id !== playerId) {
    throw new Error(`O apelido “${nickname}” já está cadastrado.`);
  }

  const matchKey = playerNameMatchKey(nickname);
  const conflictingProfile = profiles.find(
    (profile) =>
      profile.id !== playerId && playerIdentityKeys(profile).has(matchKey)
  );
  if (conflictingProfile) {
    throw new Error(
      `“${nickname}” já está associado a ${conflictingProfile.nickname}. Resolva esse conflito antes de salvar.`
    );
  }

  const companion = input.companionNick?.trim() || null;
  const nicknameChanged =
    playerNameMatchKey(current.nickname) !== playerNameMatchKey(nickname);
  if (nicknameChanged) {
    await savePlayerAlias(playerId, current.nickname);
  }

  const { data, error } = await supabase
    .from('players')
    .update({
      nickname,
      nickname_key: key,
      full_name: fullName,
      companion_nick: companion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId)
    .select('id, nickname, nickname_key, full_name, companion_nick')
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error(`O apelido “${nickname}” já está cadastrado.`);
    }
    throw new Error(formatPlayerError(error.message));
  }

  const aliases = new Set(current.aliases ?? []);
  if (nicknameChanged) {
    aliases.add(current.nickname);
  }
  return rowToProfile(data as PlayerRow, [...aliases]);
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

  const profiles = await fetchPlayers();
  const existing = profiles.find(
    (profile) => nicknameKey(profile.nickname) === key
  );
  const matchKey = playerNameMatchKey(nickname);
  const conflictingProfile = profiles.find(
    (profile) =>
      profile.id !== existing?.id &&
      playerIdentityKeys(profile).has(matchKey)
  );
  if (conflictingProfile) {
    throw new Error(
      `“${nickname}” já está associado a ${conflictingProfile.nickname}. Escolha esse jogador ou resolva o conflito.`
    );
  }

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
    return rowToProfile(data as PlayerRow, existing.aliases);
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
