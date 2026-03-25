import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import {
  clearAccessSession,
  isAccessGateEnabled,
  isAccessSessionUnlocked,
} from '../lib/accessSession';

export default function RequireAccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const gateOn = isAccessGateEnabled();
  const unlocked = isAccessSessionUnlocked();

  if (gateOn && !unlocked) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  if (gateOn && unlocked) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
        <footer className="flex shrink-0 justify-center px-4 pb-8 pt-6">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border-0 bg-transparent px-3 py-2 text-sm font-medium text-slate-400 shadow-none transition-colors hover:bg-transparent hover:text-white focus-visible:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/45 active:bg-transparent"
            onClick={() => {
              clearAccessSession();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            Sair
          </button>
        </footer>
      </div>
    );
  }

  return <Outlet />;
}
