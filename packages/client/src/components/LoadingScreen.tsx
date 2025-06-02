import { Loader2 } from 'lucide-react';

type LoadingScreenProps = {
  width: number;
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ width }) => {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <div className="flex justify-center items-center flex-1 p-4 pt-16">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="relative">
            <Loader2 className="h-16 w-16 text-cyan-400 animate-spin" />
            <div className="absolute inset-0 h-16 w-16 rounded-full blur-md bg-cyan-400/20 animate-pulse"></div>
          </div>
          <h2 className="text-xl font-bold text-cyan-400 mt-6 mb-2">
            Loading Game Data
          </h2>
          <p className="text-gray-300 text-center">Please wait...</p>
          <div className="mt-8 w-full max-w-xs bg-gray-800/50 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-cyan-500 to-pink-500 animate-[gradient-x_2s_ease-in-out_infinite] rounded-full"
              style={{
                width: `${width}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
