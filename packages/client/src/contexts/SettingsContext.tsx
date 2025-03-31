import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useAudioLoop } from '@/hooks/useAudioLoop';
import { AudioSettings } from '@/utils/types';

type SettingsContextType = {
  isPlaying: boolean;
  setVolume: (v: number) => void;
  toggle: () => void;
  volume: number;
};

const SettingsContext = createContext<SettingsContextType>({
  isPlaying: false,
  setVolume: () => undefined,
  toggle: () => undefined,
  volume: 0,
});

export type SettingsProviderProps = {
  children: ReactNode;
};

export const SettingsProvider = ({
  children,
}: SettingsProviderProps): JSX.Element => {
  const { isPlaying, play, setIsPlaying, setVolume, toggle, volume } =
    useAudioLoop('/assets/sounds/bg-music.mp3', {
      initialVolume: 0.5,
    });

  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    const handleUserInteraction = () => {
      let savedSettings = localStorage.getItem('audioSettings');

      if (!savedSettings) {
        const defaultSettings = {
          musicEnabled: true,
          musicVolume: 50,
          sfxEnabled: true,
          sfxVolume: 50,
        };
        localStorage.setItem('audioSettings', JSON.stringify(defaultSettings));
        savedSettings = localStorage.getItem('audioSettings');
      }

      if (savedSettings && !userInteracted) {
        try {
          const settings: AudioSettings = JSON.parse(savedSettings);
          const _isPlaying = settings.musicEnabled;

          setIsPlaying(_isPlaying);
          setUserInteracted(true);

          if (_isPlaying) {
            setVolume(settings.musicVolume / 100);
            play(); // auto-play if music is enabled
          }
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('keydown', handleUserInteraction);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to parse saved audio settings', e);
        }
      }
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [play, setIsPlaying, setVolume, userInteracted]);

  return (
    <SettingsContext.Provider
      value={{
        isPlaying,
        setVolume,
        toggle,
        volume,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType =>
  useContext(SettingsContext);
