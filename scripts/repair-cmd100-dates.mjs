import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/)
  .filter((line) => /^[A-Z_]+=/.test(line))
  .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
const base = new URL('/rest/v1/tournaments', env.VITE_SUPABASE_URL);
const headers = {
  apikey: env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY}`,
};

async function listRows() {
  const url = new URL(base);
  url.searchParams.set('select', 'id,created_at,modality');
  url.searchParams.set('modality', 'eq.weekly_cmd100');
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Read failed: HTTP ${response.status}`);
  return response.json();
}

const rows = await listRows();
const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long' });
const nonThursdays = rows.filter((row) => weekday.format(new Date(`${row.created_at}Z`)) !== 'Thursday').map((row) => row.id);
const changes = rows.flatMap((row) => {
  // The restored "Junho 1" tournament is the first Thursday of June 2026.
  if (row.id === 'tournament-junho-1-2026') {
    const corrected = '2026-06-04T22:00:00.000Z';
    if (row.created_at === '2026-06-04T22:00:00') return [];
    if (row.created_at !== '2026-06-01T22:00:00') {
      throw new Error(`Unexpected date for restored tournament: ${row.created_at}`);
    }
    return [{ id: row.id, old: row.created_at, corrected }];
  }
  const match = /^tournament-(\d{13})$/.exec(row.id);
  if (!match) return [];
  const original = new Date(Number(match[1]));
  const stored = new Date(`${row.created_at}Z`);
  if (Number.isNaN(original.getTime()) || Number.isNaN(stored.getTime())) {
    throw new Error(`Invalid timestamp for ${row.id}`);
  }
  if (Math.abs(original.getTime() - stored.getTime()) < 60_000) return [];
  return [{ id: row.id, old: row.created_at, corrected: original.toISOString() }];
});

console.log(JSON.stringify({ checked: rows.length, changes: changes.length, nonThursdays, rows: changes }, null, 2));
if (!process.argv.includes('--apply') || changes.length === 0) process.exit(0);

const backupPath = join(tmpdir(), `mtg-cmd100-created-at-${Date.now()}.json`);
writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), changes }, null, 2), { flag: 'wx' });
console.log(`Backup: ${backupPath}`);

for (const change of changes) {
  const url = new URL(base);
  url.searchParams.set('select', 'id,created_at');
  url.searchParams.set('id', `eq.${change.id}`);
  url.searchParams.set('created_at', `eq.${change.old}`);
  url.searchParams.set('modality', 'eq.weekly_cmd100');
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ created_at: change.corrected }),
  });
  if (!response.ok) throw new Error(`Update failed for ${change.id}: HTTP ${response.status}`);
  const updated = await response.json();
  if (updated.length !== 1) throw new Error(`Expected one updated row for ${change.id}, got ${updated.length}`);
}

const after = await listRows();
for (const change of changes) {
  const row = after.find((item) => item.id === change.id);
  if (!row || Math.abs(new Date(`${row.created_at}Z`).getTime() - new Date(change.corrected).getTime()) > 1) {
    throw new Error(`Verification failed for ${change.id}`);
  }
}
console.log(`Verified ${changes.length} corrected CMD100 dates.`);
