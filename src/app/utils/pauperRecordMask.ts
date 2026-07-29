import { normalizePauperRecord, type PauperRecord } from './pauperScoring';

const MAX_DIGIT = 9;
const MAX_PERFORMANCE_DIGITS = 4;

export const PAUPER_RECORD_MASK_PLACEHOLDER = '0/0/0';
export const PAUPER_PERFORMANCE_PLACEHOLDER = '0,00';

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

function performanceDigitsToNumber(digits: string): number {
  if (digits.length === 0) {
    return 0;
  }
  const raw = parseInt(digits, 10) / 100;
  return Math.min(100, Math.max(0, raw));
}

export function formatPerformancePercentDisplay(value: number): string {
  const capped = Math.min(100, Math.max(0, value));
  const rounded = Math.round(capped * 100) / 100;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  const [intPart, decPart] = rounded.toFixed(2).split('.');
  const decTrimmed = decPart.replace(/0+$/, '');
  if (decTrimmed === '') {
    return intPart;
  }
  return `${intPart},${decTrimmed}`;
}

export function formatPerformanceFromDigits(digits: string): string {
  if (digits.length === 0) {
    return '';
  }
  return formatPerformancePercentDisplay(performanceDigitsToNumber(digits));
}

export function applyPerformanceMaskInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, MAX_PERFORMANCE_DIGITS);
  return formatPerformanceFromDigits(digits);
}

export function parsePerformanceMask(raw: string): number | null {
  const trimmed = raw.replace(/%/g, '').trim();
  if (trimmed === '') {
    return null;
  }

  if (trimmed.includes(',')) {
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(normalized);
    if (!Number.isFinite(n)) {
      return null;
    }
    return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
  }

  if (trimmed.includes('.')) {
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n)) {
      return null;
    }
    return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length > 0) {
    return performanceDigitsToNumber(digits.slice(0, MAX_PERFORMANCE_DIGITS));
  }

  const n = parseFloat(trimmed);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.min(100, Math.max(0, n));
}

export function formatPerformanceMask(record: PauperRecord): string {
  if (record.performancePct === null || record.performancePct === undefined) {
    return '';
  }
  return formatPerformancePercentDisplay(record.performancePct);
}

export function mergePauperRecordFromMasks(
  recordMask: string,
  performanceMask: string
): PauperRecord {
  return parsePauperRecordMask(recordMask, parsePerformanceMask(performanceMask));
}
