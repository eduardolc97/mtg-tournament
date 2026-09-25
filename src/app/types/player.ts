export interface PlayerProfile {
  id: string;
  nickname: string;
  fullName: string | null;
  companionNick: string | null;
  aliases?: string[];
}

export interface UpsertPlayerInput {
  nickname: string;
  fullName: string;
  companionNick?: string | null;
}

export function nicknameKey(nickname: string): string {
  return nickname.trim().toLowerCase();
}

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

export function playerNameMatchKey(name: string): string {
  const normalized = normalizeSearchText(name)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return normalized || normalizeSearchText(name).trim();
}

export function playerIdentityKeys(profile: PlayerProfile): Set<string> {
  return new Set(
    [profile.nickname, ...(profile.aliases ?? [])]
      .map(playerNameMatchKey)
      .filter(Boolean)
  );
}

export function matchesPlayerSearch(
  profile: PlayerProfile,
  query: string
): boolean {
  const q = playerNameMatchKey(query.trim());
  if (!q) {
    return true;
  }
  return [
    profile.nickname,
    ...(profile.aliases ?? []),
    profile.fullName ?? '',
    profile.companionNick ?? '',
  ].some((value) => playerNameMatchKey(value).includes(q));
}
