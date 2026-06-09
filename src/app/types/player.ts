export interface PlayerProfile {
  id: string;
  nickname: string;
  fullName: string | null;
  companionNick: string | null;
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

export function matchesPlayerSearch(
  profile: PlayerProfile,
  query: string
): boolean {
  const q = normalizeSearchText(query.trim());
  if (!q) {
    return true;
  }
  return (
    normalizeSearchText(profile.nickname).includes(q) ||
    (profile.fullName
      ? normalizeSearchText(profile.fullName).includes(q)
      : false) ||
    (profile.companionNick
      ? normalizeSearchText(profile.companionNick).includes(q)
      : false)
  );
}
