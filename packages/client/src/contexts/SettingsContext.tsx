import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useAudioLoop } from '@/hooks/useAudioLoop';
import { useSFX } from '@/hooks/useSFX';
import { AudioSettings } from '@/utils/types';

type SettingsContextType = {
  isMusicPlaying: boolean;
  musicVolume: number;
  playSfx: (name: string) => void;
  setMusicVolume: (v: number) => void;
  setSfxMuted: (muted: boolean) => void;
  setSfxVolume: (v: number) => void;
  toggleMusic: () => void;
};

const SettingsContext = createContext<SettingsContextType>({
  isMusicPlaying: false,
  musicVolume: 0,
  playSfx: () => undefined,
  setMusicVolume: () => undefined,
  setSfxMuted: () => undefined,
  setSfxVolume: () => undefined,
  toggleMusic: () => undefined,
});

export type SettingsProviderProps = {
  children: ReactNode;
};

export const SettingsProvider = ({
  children,
}: SettingsProviderProps): JSX.Element => {
  const {
    isPlaying: isMusicPlaying,
    play: playMusic,
    setIsPlaying,
    setVolume: setMusicVolume,
    toggle: toggleMusic,
    volume: musicVolume,
  } = useAudioLoop('/assets/sounds/bg-music.mp3', {
    initialVolume: 0.5,
  });
  const {
    play: playSfx,
    setMuted: setSfxMuted,
    setVolume: setSfxVolume,
  } = useSFX();

  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    const handleUserInteraction = () => {
      let savedSettings = localStorage.getItem('audioSettings');

      if (!savedSettings) {
        const defaultSettings = {
          musicEnabled: true,
          musicVolume: 50,
          sfxEnabled: true,
          sfxVolume: 80,
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
            setMusicVolume(settings.musicVolume / 100);
            playMusic(); // auto-play if music is enabled
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
  }, [playMusic, setIsPlaying, setMusicVolume, userInteracted]);

  return (
    <SettingsContext.Provider
      value={{
        isMusicPlaying,
        playSfx,
        setMusicVolume,
        setSfxMuted,
        setSfxVolume,
        toggleMusic,
        musicVolume,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType =>
  useContext(SettingsContext);
