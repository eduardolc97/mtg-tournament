import type { PlayerProfile } from '../types/player';
import { playerIdentityKeys, playerNameMatchKey } from '../types/player';

export type PlayerNameMatchStatus =
  | 'recognized'
  | 'possible_match'
  | 'new_player'
  | 'duplicate_line'
  | 'ambiguous_match';

export interface PlayerNameImportLine {
  id: number;
  name: string;
  matchKey: string;
  status: PlayerNameMatchStatus;
  matches: PlayerProfile[];
  duplicateOf?: number;
}

function editDistance(left: string, right: string): number {
  const a = Array.from(left);
  const b = Array.from(right);
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost
      );
    }
    previous = current;
  }

  return previous[b.length];
}

function similarity(left: string, right: string): number {
  const longestLength = Math.max(
    Array.from(left).length,
    Array.from(right).length
  );
  if (longestLength === 0) {
    return 1;
  }
  return 1 - editDistance(left, right) / longestLength;
}

function possibleMatches(
  matchKey: string,
  players: PlayerProfile[]
): PlayerProfile[] {
  if (Array.from(matchKey).length < 4) {
    return [];
  }

  return players
    .map((profile) => ({
      profile,
      score: Math.max(
        ...[...playerIdentityKeys(profile)].map((key) =>
          similarity(matchKey, key)
        ),
        0
      ),
    }))
    .filter(({ score }) => score >= 0.72)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.profile.nickname.localeCompare(b.profile.nickname, 'pt-BR')
    )
    .slice(0, 3)
    .map(({ profile }) => profile);
}

export function classifyPlayerNameLines(
  pastedNames: string,
  players: PlayerProfile[]
): PlayerNameImportLine[] {
  const firstLineByKey = new Map<string, number>();
  const lines = pastedNames
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  return lines.map((name, id) => {
    const matchKey = playerNameMatchKey(name);
    const duplicateOf = firstLineByKey.get(matchKey);
    if (duplicateOf !== undefined) {
      return {
        id,
        name,
        matchKey,
        status: 'duplicate_line',
        matches: [],
        duplicateOf,
      };
    }
    firstLineByKey.set(matchKey, id);

    const exactMatches = players.filter((profile) =>
      playerIdentityKeys(profile).has(matchKey)
    );
    if (exactMatches.length === 1) {
      return { id, name, matchKey, status: 'recognized', matches: exactMatches };
    }
    if (exactMatches.length > 1) {
      return { id, name, matchKey, status: 'ambiguous_match', matches: exactMatches };
    }

    const suggestions = possibleMatches(matchKey, players);
    if (suggestions.length > 0) {
      return {
        id,
        name,
        matchKey,
        status: suggestions.length === 1 ? 'possible_match' : 'ambiguous_match',
        matches: suggestions,
      };
    }

    return { id, name, matchKey, status: 'new_player', matches: [] };
  });
}
