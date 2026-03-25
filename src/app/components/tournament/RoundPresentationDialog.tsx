import {
  normalizeTournamentModality,
  type TournamentModality,
} from '../../constants/tournamentModality';
import type { Round } from '../../types/tournament';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface RoundPresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentName: string;
  round: Round;
  modality?: TournamentModality;
}

export default function RoundPresentationDialog({
  open,
  onOpenChange,
  tournamentName,
  round,
  modality: modalityProp,
}: RoundPresentationDialogProps) {
  const doubles =
    normalizeTournamentModality(modalityProp) === 'doubles_cmd';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!fixed !inset-0 !left-0 !top-0 !flex !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-[clamp(0.375rem,0.25rem+1vmin,0.875rem)] rounded-none border-slate-800 bg-slate-950 p-[clamp(0.5rem,0.3rem+1.25vmin,1.25rem)] pt-[clamp(2.75rem,1.75rem+4vmin,4rem)]"
        closeClassName="text-white opacity-95 hover:opacity-100 hover:bg-white/15 data-[state=open]:text-white [&_svg]:size-[clamp(1.125rem,0.75rem+1.25vmin,1.5rem)]"
      >
        <DialogHeader className="shrink-0 space-y-[clamp(0.125rem,0.5vmin,0.375rem)] pb-[clamp(0.25rem,0.5vmin,0.5rem)] text-center">
          <DialogTitle className="leading-tight text-white text-[clamp(1.125rem,0.65rem+2.25vmin,2rem)]">
            Rodada {round.number}
          </DialogTitle>
          <p className="line-clamp-2 text-slate-400 text-[clamp(0.8125rem,0.55rem+0.9vmin,1.0625rem)]">
            {tournamentName}
          </p>
          <DialogDescription className="sr-only">
            Mesas e jogadores da rodada {round.number} para leitura em grupo.
          </DialogDescription>
        </DialogHeader>

        <div
          className="grid min-h-0 flex-1 auto-rows-min content-start overflow-y-auto text-[clamp(0.875rem,0.48rem+1.2vmin,1.1875rem)] [gap:clamp(0.375rem,0.2rem+1vmin,1rem)] [grid-template-columns:repeat(auto-fill,minmax(clamp(12rem,4.5rem+14vmin,22rem),1fr))]"
        >
          {round.tables.map((table, tableIndex) => (
            <div
              key={table.id}
              className="flex min-h-0 flex-col rounded-xl border border-slate-700/80 bg-slate-900/60 [padding:clamp(0.45rem,0.25rem+1vmin,1rem)]"
            >
              <h3 className="mb-[clamp(0.35rem,0.2rem+0.75vmin,0.65rem)] text-center font-bold text-purple-300 text-[1.35em] leading-tight">
                Mesa {tableIndex + 1}
              </h3>
              {doubles && table.players.length === 4 ? (
                <div className="grid grid-cols-2 [gap:clamp(0.35rem,0.15rem+0.85vmin,0.85rem)]">
                  <div className="min-w-0">
                    <p className="mb-[clamp(0.125rem,0.35vmin,0.35rem)] text-center font-semibold uppercase tracking-wide text-purple-400 text-[0.82em] leading-tight">
                      Dupla 1
                    </p>
                    <ul className="flex flex-col [gap:clamp(0.125rem,0.35vmin,0.35rem)]">
                      <li className="break-words text-center font-medium leading-snug text-white text-[1em]">
                        {table.players[0].name}
                      </li>
                      <li className="break-words text-center font-medium leading-snug text-white text-[1em]">
                        {table.players[1].name}
                      </li>
                    </ul>
                  </div>
                  <div className="min-w-0">
                    <p className="mb-[clamp(0.125rem,0.35vmin,0.35rem)] text-center font-semibold uppercase tracking-wide text-cyan-400 text-[0.82em] leading-tight">
                      Dupla 2
                    </p>
                    <ul className="flex flex-col [gap:clamp(0.125rem,0.35vmin,0.35rem)]">
                      <li className="break-words text-center font-medium leading-snug text-white text-[1em]">
                        {table.players[2].name}
                      </li>
                      <li className="break-words text-center font-medium leading-snug text-white text-[1em]">
                        {table.players[3].name}
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <ul className="flex flex-col [gap:clamp(0.2rem,0.35vmin,0.45rem)]">
                  {table.players.map((player) => (
                    <li
                      key={player.id}
                      className="break-words text-center font-medium leading-snug text-white text-[1em]"
                    >
                      {player.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
