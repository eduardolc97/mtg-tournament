import { Input } from '../ui/input';
import {
  computePauperTournamentPoints,
  normalizePauperRecord,
  type PauperRecord,
} from '../../utils/pauperScoring';

interface PauperRecordFieldsProps {
  record: PauperRecord;
  onChange: (record: PauperRecord) => void;
  pointsDoubled?: boolean;
  disabled?: boolean;
  showPoints?: boolean;
}

function parseNonNegativeInt(value: string): number {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return n;
}

function parsePerformanceInput(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const n = parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.min(100, Math.max(0, n));
}

export default function PauperRecordFields({
  record,
  onChange,
  pointsDoubled = false,
  disabled = false,
  showPoints = true,
}: PauperRecordFieldsProps) {
  const normalized = normalizePauperRecord(record);
  const points = computePauperTournamentPoints(normalized, pointsDoubled);

  const update = (patch: Partial<PauperRecord>) => {
    onChange(normalizePauperRecord({ ...normalized, ...patch }));
  };

  const inputClass =
    'h-9 w-14 bg-slate-800/50 border-slate-600 text-white text-center tabular-nums px-1';

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className="w-3 text-center">V</span>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          disabled={disabled}
          value={normalized.wins}
          onChange={(e) => update({ wins: parseNonNegativeInt(e.target.value) })}
          className={inputClass}
          aria-label="Vitórias"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className="w-3 text-center">D</span>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          disabled={disabled}
          value={normalized.losses}
          onChange={(e) => update({ losses: parseNonNegativeInt(e.target.value) })}
          className={inputClass}
          aria-label="Derrotas"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className="w-3 text-center">E</span>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          disabled={disabled}
          value={normalized.draws}
          onChange={(e) => update({ draws: parseNonNegativeInt(e.target.value) })}
          className={inputClass}
          aria-label="Empates"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className="whitespace-nowrap">Aprov.%</span>
        <Input
          type="number"
          min={0}
          max={100}
          step={0.01}
          inputMode="decimal"
          disabled={disabled}
          value={normalized.performancePct ?? ''}
          placeholder="0"
          onChange={(e) =>
            update({ performancePct: parsePerformanceInput(e.target.value) })
          }
          className="h-9 w-16 bg-slate-800/50 border-slate-600 text-white text-center tabular-nums px-1"
          aria-label="Aproveitamento percentual"
        />
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
