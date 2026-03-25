import { createBrowserRouter } from 'react-router';
import Dashboard from './components/Dashboard';
import CreateTournament from './components/CreateTournament';
import TournamentView from './components/TournamentView';
import MonthlyLeaguePage from './components/MonthlyLeaguePage';
import NotFound from './components/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Dashboard,
  },
  {
    path: '/create',
    Component: CreateTournament,
  },
  {
    path: '/tournament/:id',
    Component: TournamentView,
  },
  {
    path: '/liga',
    Component: MonthlyLeaguePage,
  },
  {
    path: '*',
    Component: NotFound,
  },
]);