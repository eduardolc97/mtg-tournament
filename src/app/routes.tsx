import { createBrowserRouter, Navigate } from 'react-router';
import Dashboard from './components/Dashboard';
import CreateTournament from './components/CreateTournament';
import TournamentView from './components/TournamentView';
import MonthlyLeaguePage from './components/MonthlyLeaguePage';
import PauperLeaguePage from './components/PauperLeaguePage';
import NotFound from './components/NotFound';
import LoginPage from './components/LoginPage';
import RequireAccess from './components/RequireAccess';

export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  {
    Component: RequireAccess,
    children: [
      { index: true, Component: Dashboard },
      { path: 'create', Component: CreateTournament },
      { path: 'tournament/:id', Component: TournamentView },
      { path: 'liga', element: <Navigate to="/liga/cmd100" replace /> },
      { path: 'liga/cmd100', Component: MonthlyLeaguePage },
      { path: 'liga/pauper', Component: PauperLeaguePage },
      { path: '*', Component: NotFound },
    ],
  },
]);
