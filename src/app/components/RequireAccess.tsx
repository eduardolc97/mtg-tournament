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
      <div className="relative min-h-[100dvh]">
        <div className="absolute top-3 right-3 z-[100] sm:top-4 sm:right-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-white/10 gap-1.5"
            onClick={() => {
              clearAccessSession();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Sair
          </Button>
        </div>
        <Outlet />
      </div>
    );
  }

  return <Outlet />;
}
