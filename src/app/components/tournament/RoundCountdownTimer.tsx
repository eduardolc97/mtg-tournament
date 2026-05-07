import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import { useRoundTimer } from '../../context/RoundTimerContext';

interface RoundCountdownTimerProps {
  variant?: 'default' | 'fullscreen';
}

export default function RoundCountdownTimer({
  variant = 'default',
}: RoundCountdownTimerProps) {
  const {
    running,
    progress,
    formatDisplay,
    toggleRunning,
    reset,
    remaining,
  } = useRoundTimer();

  const inner = (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-4 sm:text-left">
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300',
              variant === 'default' && 'size-12 sm:size-11',
              variant === 'fullscreen' &&
                'size-11 sm:size-12 [@media(orientation:landscape)_and_(max-height:500px)]:size-10'
            )}
          >
            <Timer
              className={cn(
                variant === 'default' && 'size-6 sm:size-5',
                variant === 'fullscreen' &&
                  'size-6 sm:size-6 [@media(orientation:landscape)_and_(max-height:500px)]:size-5'
              )}
              aria-hidden
            />
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <p
              className={cn(
                'font-medium uppercase tracking-wide text-slate-400',
                variant === 'default' && 'text-xs sm:text-[0.8rem]',
                variant === 'fullscreen' && 'text-[0.7rem] sm:text-xs'
              )}
            >
              Temporizador da rodada
            </p>
            <p
              className={cn(
                'font-mono font-bold tabular-nums tracking-tight text-white',
                variant === 'default' &&
                  'text-[clamp(2.25rem,6vw+1rem,3.75rem)] leading-none sm:text-[clamp(2.5rem,4vw+1.5rem,4rem)]',
                variant === 'fullscreen' &&
                  'text-[clamp(2rem,5vmin+1.25rem,4.5rem)] leading-none [@media(orientation:landscape)_and_(max-height:500px)]:text-[clamp(1.75rem,4vmin+1rem,3.25rem)]'
              )}
              aria-live="polite"
              aria-label={`Tempo restante: ${formatDisplay}`}
            >
              {formatDisplay}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:shrink-0 sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="bg-purple-600/80 text-white hover:bg-purple-500"
            onClick={toggleRunning}
            disabled={remaining === 0}
            aria-pressed={running}
          >
            {running ? (
              <>
                <Pause className="mr-1.5 size-4" aria-hidden />
                Pausar
              </>
            ) : (
              <>
                <Play className="mr-1.5 size-4" aria-hidden />
                Iniciar
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white"
            onClick={reset}
          >
            <RotateCcw className="mr-1.5 size-4" aria-hidden />
            Zerar
          </Button>
        </div>
      </div>
      <div
        className={cn(
          'h-1.5 overflow-hidden rounded-full bg-slate-800',
          variant === 'default' && 'mt-3',
          variant === 'fullscreen' && 'mt-2.5'
        )}
        role="presentation"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </>
  );

  if (variant === 'fullscreen') {
    return (
      <div className="shrink-0 rounded-xl border border-slate-700/90 bg-slate-900/85 px-[clamp(0.5rem,0.35rem+1vmin,1rem)] py-[clamp(0.45rem,0.3rem+0.9vmin,0.85rem)] shadow-lg shadow-black/20 backdrop-blur-sm">
        {inner}
      </div>
    );
  }

  return (
    <Card className="mb-4 border-purple-900/50 bg-slate-900/60 backdrop-blur [@media(orientation:landscape)_and_(max-height:500px)]:mb-3">
      <CardContent className="py-3 sm:py-4">{inner}</CardContent>
    </Card>
  );
}
