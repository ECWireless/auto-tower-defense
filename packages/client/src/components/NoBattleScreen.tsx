import { AlertTriangle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { BackgroundAnimation } from '@/components/BackgroundAnimation';
import { Button } from '@/components/ui/button';

export const NoBattleScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-black flex flex-col min-h-screen relative text-white">
      <BackgroundAnimation />
      <div className="flex flex-1 items-center justify-center p-4 pt-16 z-1">
        <div className="max-w-md w-full">
          <div className="bg-gray-900 border border-red-900/50 overflow-hidden rounded-lg shadow-lg">
            <div className="flex flex-col p-4 items-center">
              <AlertTriangle className="h-16 mb-4 text-red-500 w-16" />
              <h2 className="font-bold mb-2 sm:text-2xl text-red-400 text-xl">
                Battle Not Found
              </h2>
              <p className="mb-6 text-center text-gray-300">
                The battle with the provided ID does not exist.
              </p>
              <div className="flex mt-4">
                <Button
                  className="border-cyan-500 text-cyan-400 hover:bg-cyan-950/50 hover:text-cyan-300"
                  onClick={() => navigate('/')}
                  variant="outline"
                >
                  <Home className="h-4 mr-2 w-4" />
                  Return Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
