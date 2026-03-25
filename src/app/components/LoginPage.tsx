import React, { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router';
import { KeyRound } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import {
  isAccessGateEnabled,
  isAccessSessionUnlocked,
  tokenMatchesInput,
  unlockAccessSession,
} from '../lib/accessSession';

type LoginLocationState = { from?: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LoginLocationState | null;
  const from =
    state?.from && state.from !== '/login' ? state.from : '/';

  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isAccessGateEnabled()) {
    return <Navigate to="/" replace />;
  }

  if (isAccessSessionUnlocked()) {
    return <Navigate to={from} replace />;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tokenMatchesInput(token)) {
      setError('Token inválido.');
      return;
    }
    unlockAccessSession();
    navigate(from, { replace: true });
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4">
      <Card className="w-full max-w-md border-purple-900/50 bg-slate-900/80 backdrop-blur text-white shadow-xl shadow-purple-950/40">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-purple-600/20 text-purple-300">
            <KeyRound className="size-6" aria-hidden />
          </div>
          <CardTitle className="text-xl text-white">Acesso</CardTitle>
          <CardDescription className="text-slate-400">
            Informe a senha de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert
                variant="destructive"
                className="border-red-900/60 bg-red-950/50 text-red-100"
              >
                <AlertDescription id="access-token-error">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="access-token" className="text-slate-200">
                Token
              </Label>
              <Input
                id="access-token"
                name="access-token"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(ev) => setToken(ev.target.value)}
                className="border-purple-900/50 bg-slate-950/80 text-white placeholder:text-slate-500"
                placeholder="Cole ou digite o token"
                aria-invalid={error != null}
                aria-describedby={error ? 'access-token-error' : undefined}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
