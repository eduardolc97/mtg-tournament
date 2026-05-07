import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

const INITIAL_SECONDS = 55 * 60;
const STORAGE_KEY = 'magicTournament.roundTimer.v1';

type PersistedShape = {
  endAt: number | null;
  pausedRemaining: number;
};

function persistToStorage(endAt: number | null, pausedRemaining: number) {
  try {
    const payload: PersistedShape = { endAt, pausedRemaining };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function loadPersisted(): {
  remaining: number;
  running: boolean;
  endAt: number | null;
  suppressEndToast: boolean;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        remaining: INITIAL_SECONDS,
        running: false,
        endAt: null,
        suppressEndToast: false,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    const endAt =
      typeof parsed.endAt === 'number' && Number.isFinite(parsed.endAt)
        ? parsed.endAt
        : null;
    const now = Date.now();

    if (endAt !== null && endAt > now) {
      const rem = Math.max(0, Math.ceil((endAt - now) / 1000));
      return {
        remaining: rem,
        running: true,
        endAt,
        suppressEndToast: false,
      };
    }

    if (endAt !== null && endAt <= now) {
      persistToStorage(null, 0);
      return {
        remaining: 0,
        running: false,
        endAt: null,
        suppressEndToast: true,
      };
    }

    const pr =
      typeof parsed.pausedRemaining === 'number' &&
      Number.isFinite(parsed.pausedRemaining)
        ? Math.max(0, Math.floor(parsed.pausedRemaining))
        : INITIAL_SECONDS;

    return {
      remaining: pr,
      running: false,
      endAt: null,
      suppressEndToast: pr === 0,
    };
  } catch {
    return {
      remaining: INITIAL_SECONDS,
      running: false,
      endAt: null,
      suppressEndToast: false,
    };
  }
}

function formatMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

interface RoundTimerContextValue {
  remaining: number;
  running: boolean;
  progress: number;
  formatDisplay: string;
  toggleRunning: () => void;
  reset: () => void;
}

const RoundTimerContext = createContext<RoundTimerContextValue | null>(null);

export function RoundTimerProvider({ children }: { children: ReactNode }) {
  const initialRef = useRef<ReturnType<typeof loadPersisted> | null>(null);
  if (initialRef.current === null) {
    initialRef.current = loadPersisted();
  }
  const loaded = initialRef.current;

  const endAtRef = useRef<number | null>(loaded.endAt);
  const endNotifiedRef = useRef(loaded.suppressEndToast);
  const remainingRef = useRef(loaded.remaining);
  const [remaining, setRemaining] = useState(loaded.remaining);
  const [running, setRunning] = useState(loaded.running);

  remainingRef.current = remaining;

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const tick = () => {
      const end = endAtRef.current;
      if (end == null) {
        return;
      }
      const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(rem);
      if (rem === 0) {
        endAtRef.current = null;
        persistToStorage(null, 0);
        setRunning(false);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining !== 0) {
      return;
    }
    setRunning(false);
    endAtRef.current = null;
    persistToStorage(null, 0);
    if (endNotifiedRef.current) {
      return;
    }
    endNotifiedRef.current = true;
    toast.warning('Tempo da rodada encerrado', {
      description: 'Os 55 minutos acabaram.',
    });
  }, [remaining]);

  const reset = useCallback(() => {
    endNotifiedRef.current = false;
    endAtRef.current = null;
    setRunning(false);
    setRemaining(INITIAL_SECONDS);
    persistToStorage(null, INITIAL_SECONDS);
  }, []);

  const toggleRunning = useCallback(() => {
    setRunning((wasRunning) => {
      if (wasRunning) {
        const end = endAtRef.current;
        if (end != null) {
          const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
          setRemaining(rem);
          persistToStorage(null, rem);
        }
        endAtRef.current = null;
        return false;
      }
      const rem = remainingRef.current;
      if (rem <= 0) {
        return false;
      }
      const end = Date.now() + rem * 1000;
      endAtRef.current = end;
      persistToStorage(end, rem);
      return true;
    });
  }, []);

  const progress = remaining / INITIAL_SECONDS;
  const formatDisplay = formatMmSs(remaining);

  const value = useMemo(
    () => ({
      remaining,
      running,
      progress,
      formatDisplay,
      toggleRunning,
      reset,
    }),
    [remaining, running, progress, formatDisplay, toggleRunning, reset]
  );

  return (
    <RoundTimerContext.Provider value={value}>
      {children}
    </RoundTimerContext.Provider>
  );
}

export function useRoundTimer() {
  const ctx = useContext(RoundTimerContext);
  if (!ctx) {
    throw new Error('useRoundTimer must be used within RoundTimerProvider');
  }
  return ctx;
}
