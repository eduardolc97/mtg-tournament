import { RouterProvider } from 'react-router';
import { TournamentProvider } from './context/TournamentContext';
import { RoundTimerProvider } from './context/RoundTimerContext';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  return (
    <TournamentProvider>
      <RoundTimerProvider>
        <div className="dark">
          <RouterProvider router={router} />
          <Toaster position="top-center" theme="dark" />
        </div>
      </RoundTimerProvider>
    </TournamentProvider>
  );
}
