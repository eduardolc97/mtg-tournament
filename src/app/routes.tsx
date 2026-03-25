import { createBrowserRouter } from 'react-router';
import Dashboard from './components/Dashboard';
import CreateTournament from './components/CreateTournament';
import TournamentView from './components/TournamentView';
import MonthlyLeaguePage from './components/MonthlyLeaguePage';
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
      { path: 'liga', Component: MonthlyLeaguePage },
      { path: '*', Component: NotFound },
    ],
  },
]);