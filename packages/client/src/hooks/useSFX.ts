import { useCallback, useEffect, useRef } from 'react';

import { SFXManager } from '@/lib/SFXManager';

export const useSFX = (): {
  play: (name: string) => void;
  setMuted: (muted: boolean) => void;
  setVolume: (v: number) => void;
} => {
  const sfxRef = useRef<SFXManager | null>(null);

  useEffect(() => {
    const sfx = new SFXManager();
    sfxRef.current = sfx;

    // Load your sounds here
    sfx.load('click1', '/assets/sounds/click1.mp3');
    sfx.load('click2', '/assets/sounds/click2.mp3');
    sfx.load('click3', '/assets/sounds/click3.mp3');
    sfx.load('click4', '/assets/sounds/click4.wav');
    sfx.load('laserShoot', '/assets/sounds/laserShoot.mp3');
    sfx.load('explosion', '/assets/sounds/explosion.mp3');
    sfx.load('win', '/assets/sounds/win.mp3');

    return () => {
      // No teardown needed unless you want to manually close the context
    };
  }, []);

  const play = useCallback((name: string) => {
    sfxRef.current?.play(name, { preventOverlap: true });
  }, []);

  const setMuted = (muted: boolean) => {
    sfxRef.current?.setMuted(muted);
  };

  const setVolume = (v: number) => {
    sfxRef.current?.setVolume(v);
  };

  return { play, setMuted, setVolume };
};
