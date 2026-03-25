import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import { Button } from './ui/button';
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
      <div className="flex min-h-[100dvh] flex-col">
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
        <footer className="mt-auto flex justify-center px-4 pb-8 pt-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 bg-transparent text-slate-400 shadow-none hover:bg-transparent hover:text-white focus-visible:ring-0 dark:hover:bg-transparent"
            onClick={() => {
              clearAccessSession();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Sair
          </Button>
        </footer>
      </div>
    );
  }

  return <Outlet />;
}
