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
