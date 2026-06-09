import { User } from 'lucide-react';

export function PlayerProfileSummary({
  nickname,
  fullName,
  companionNick,
  compact = false,
}: {
  nickname: string;
  fullName?: string | null;
  companionNick?: string | null;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'min-w-0 space-y-0.5' : 'pl-6 space-y-0.5'}>
      {!compact ? (
        <span className="flex items-center gap-2 text-sm text-white">
          <User className="h-4 w-4 shrink-0 text-slate-400" />
          {nickname}
        </span>
      ) : (
        <p className="text-white truncate">{nickname}</p>
      )}
      <p
        className={`truncate text-xs ${
          fullName ? 'text-slate-400' : 'text-slate-600 italic'
        }`}
      >
        {fullName ?? 'Nome completo não cadastrado'}
      </p>
      {companionNick ? (
        <p className="text-xs text-purple-400/90 truncate">
          Companion: {companionNick}
        </p>
      ) : (
        !compact && (
          <p className="text-xs text-slate-600 truncate">Companion: —</p>
        )
      )}
    </div>
  );
}
