import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center px-4">
      <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur max-w-md w-full">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-20 h-20 text-purple-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">404</h1>
          <p className="text-slate-300 text-lg mb-2">Página não encontrada</p>
          <p className="text-slate-500 mb-8">
            A página que você está procurando não existe.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
