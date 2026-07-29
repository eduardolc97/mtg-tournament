import { normalizePauperRecord, type PauperRecord } from './pauperScoring';

const MAX_DIGIT = 9;

export const PAUPER_RECORD_MASK_PLACEHOLDER = '0/0/0';
export const PAUPER_PERFORMANCE_PLACEHOLDER = '0';

function clampDigit(n: number): number {
  return Math.min(MAX_DIGIT, Math.max(0, Math.floor(n)));
}

export function formatPauperRecordMask(record: PauperRecord): string {
  const normalized = normalizePauperRecord(record);
  if (
    normalized.wins === 0 &&
    normalized.losses === 0 &&
    normalized.draws === 0
  ) {
    return '';
  }
  return `${normalized.wins}/${normalized.losses}/${normalized.draws}`;
}

export function applyPauperRecordMaskInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 3);
  if (digits.length === 0) {
    return '';
  }
  if (digits.length === 1) {
    return digits;
  }
  if (digits.length === 2) {
    return `${digits[0]}/${digits[1]}`;
  }
  return `${digits[0]}/${digits[1]}/${digits[2]}`;
}

export function parsePauperRecordMask(
  masked: string,
  performancePct: number | null = null
): PauperRecord {
  const digits = masked.replace(/\D/g, '').slice(0, 3);
  const wins = digits[0] !== undefined ? clampDigit(parseInt(digits[0], 10)) : 0;
  const losses =
    digits[1] !== undefined ? clampDigit(parseInt(digits[1], 10)) : 0;
  const draws =
    digits[2] !== undefined ? clampDigit(parseInt(digits[2], 10)) : 0;
  return normalizePauperRecord({ wins, losses, draws, performancePct });
}

export function applyPerformanceMaskInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 3);
  if (digits.length === 0) {
    return '';
  }
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) {
    return '';
  }
  return String(Math.min(100, n));
}

export function parsePerformanceMask(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.min(100, Math.max(0, n));
}

export function formatPerformanceMask(record: PauperRecord): string {
  if (record.performancePct === null || record.performancePct === undefined) {
    return '';
  }
  return String(Math.round(record.performancePct));
}

export function mergePauperRecordFromMasks(
  recordMask: string,
  performanceMask: string
): PauperRecord {
  return parsePauperRecordMask(recordMask, parsePerformanceMask(performanceMask));
}
