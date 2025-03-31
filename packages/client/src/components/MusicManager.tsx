import { useEffect, useState } from 'react';

import { useAudioLoop } from '@/hooks/useAudioLoop';

export const MusicManager: React.FC = () => {
  const { isPlaying, play, toggle, volume, setVolume } = useAudioLoop(
    '/assets/bg-music.mp3',
    {
      initialVolume: 0.5,
    },
  );
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    const handleUserInteraction = () => {
      if (!userInteracted) {
        setUserInteracted(true);
        if (!isPlaying) {
          play(); // auto-play if music is enabled
        }
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      }
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [isPlaying, play, userInteracted]);

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-50 p-3 rounded-lg text-white text-sm space-y-2 z-50">
      <button onClick={toggle}>{isPlaying ? '🔇 Mute' : '🔊 Play'}</button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={e => setVolume(parseFloat(e.target.value))}
        className="w-24"
      />
    </div>
  );
};
