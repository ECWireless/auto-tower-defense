import { useCallback, useEffect, useRef } from 'react';

import { SFXManager } from '@/lib/SFXManager';

export function useSFX(): {
  play: (name: string) => void;
  setMuted: (muted: boolean) => void;
  setVolume: (v: number) => void;
} {
  const sfxRef = useRef<SFXManager | null>(null);

  useEffect(() => {
    const sfx = new SFXManager();
    sfxRef.current = sfx;

    // Load your sounds here
    sfx.load('click', '/assets/sounds/click.wav');
    sfx.load('laserShoot', '/assets/sounds/laserShoot.wav');
    sfx.load('explosion', '/assets/sounds/explosion.wav');
    sfx.load('powerUp', '/assets/sounds/powerUp.wav');

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
}
