import { useState } from 'react';
import { Input } from '../ui/input';
import {
  computePauperTournamentPoints,
  normalizePauperRecord,
  type PauperRecord,
} from '../../utils/pauperScoring';
import {
  applyPauperRecordMaskInput,
  applyPerformanceMaskInput,
  formatPauperRecordMask,
  formatPerformanceMask,
  mergePauperRecordFromMasks,
  PAUPER_PERFORMANCE_PLACEHOLDER,
  PAUPER_RECORD_MASK_PLACEHOLDER,
} from '../../utils/pauperRecordMask';

interface PauperRecordFieldsProps {
  record: PauperRecord;
  onChange: (record: PauperRecord) => void;
  pointsDoubled?: boolean;
  disabled?: boolean;
  showPoints?: boolean;
  compact?: boolean;
}

export default function PauperRecordFields({
  record,
  onChange,
  pointsDoubled = false,
  disabled = false,
  showPoints = true,
  compact = false,
}: PauperRecordFieldsProps) {
  const normalized = normalizePauperRecord(record);
  const points = computePauperTournamentPoints(normalized, pointsDoubled);

  const [recordMask, setRecordMask] = useState(() =>
    formatPauperRecordMask(normalized)
  );
  const [performanceMask, setPerformanceMask] = useState(() =>
    formatPerformanceMask(normalized)
  );

  const emitChange = (nextRecordMask: string, nextPerformanceMask: string) => {
    onChange(mergePauperRecordFromMasks(nextRecordMask, nextPerformanceMask));
  };

  const recordInputClass = compact
    ? 'h-9 w-[5.5rem] bg-slate-800/50 border-slate-600 text-white text-center tabular-nums px-2 font-mono tracking-wider'
    : 'h-9 w-24 sm:w-28 bg-slate-800/50 border-slate-600 text-white text-center tabular-nums px-2 font-mono text-lg tracking-wider';

  const pctInputClass = compact
    ? 'h-9 w-[4.5rem] bg-slate-800/50 border-slate-600 text-white text-center tabular-nums px-1'
    : 'h-9 w-20 bg-slate-800/50 border-slate-600 text-white text-center tabular-nums px-1';

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className="whitespace-nowrap">V/D/E</span>
        <Input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={recordMask}
          placeholder={PAUPER_RECORD_MASK_PLACEHOLDER}
          maxLength={5}
          onChange={(e) => {
            const masked = applyPauperRecordMaskInput(e.target.value);
            setRecordMask(masked);
            emitChange(masked, performanceMask);
          }}
          onBlur={() => {
            if (recordMask.endsWith('/')) {
              const trimmed = recordMask.slice(0, -1);
              setRecordMask(trimmed);
              emitChange(trimmed, performanceMask);
            }
          }}
          className={recordInputClass}
          aria-label="Vitórias, derrotas e empates no formato V/D/E"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className="whitespace-nowrap">Aprov.</span>
        <div className="relative">
          <Input
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={performanceMask}
            placeholder={PAUPER_PERFORMANCE_PLACEHOLDER}
            onChange={(e) => {
              const masked = applyPerformanceMaskInput(e.target.value);
              setPerformanceMask(masked);
              emitChange(recordMask, masked);
            }}
            className={`${pctInputClass} pr-5`}
            aria-label="Aproveitamento percentual"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            %
          </span>
        </div>
      </label>
      {showPoints && (
        <span className="text-sm font-semibold tabular-nums text-purple-300 ml-1">
          {points} pts
          {pointsDoubled && (
            <span className="text-xs font-normal text-amber-400/90 ml-1">2×</span>
          )}
        </span>
      )}
    </div>
  );
}

export { normalizePauperRecord };
