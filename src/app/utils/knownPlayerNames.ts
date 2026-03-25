import type { Tournament } from '../types/tournament';
import { playerNameKey } from './monthlyLeague';

export function collectKnownPlayerDisplayNames(
  tournaments: Tournament[]
): string[] {
  const map = new Map<string, string>();
  for (const t of tournaments) {
    for (const p of t.players) {
      const trimmed = p.name.trim();
      const key = playerNameKey(trimmed);
      if (!key) {
        continue;
      }
      if (!map.has(key)) {
        map.set(key, trimmed);
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );
}

export function mergePresetAndTournamentPlayerNames(
  preset: string[],
  tournaments: Tournament[]
): string[] {
  const map = new Map<string, string>();
  for (const raw of preset) {
    const trimmed = raw.trim();
    const key = playerNameKey(trimmed);
    if (key && !map.has(key)) {
      map.set(key, trimmed);
    }
  }
  for (const t of tournaments) {
    for (const p of t.players) {
      const trimmed = p.name.trim();
      const key = playerNameKey(trimmed);
      if (key) {
        map.set(key, trimmed);
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );
}
