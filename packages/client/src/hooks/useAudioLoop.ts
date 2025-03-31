import { useEffect, useRef, useState } from 'react';

interface UseAudioLoopOptions {
  initialVolume?: number;
}

export const useAudioLoop = (
  url: string,
  { initialVolume = 0.5 }: UseAudioLoopOptions = {},
): {
  isPlaying: boolean;
  play: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (v: number) => void;
  toggle: () => void;
  volume: number;
} => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(initialVolume);

  const playBuffer = () => {
    if (!audioCtxRef.current || !bufferRef.current || !gainNodeRef.current)
      return;

    const ctx = audioCtxRef.current;
    const buffer = bufferRef.current;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    source.connect(gainNodeRef.current);
    source.start();

    // Schedule the next loop just before the current one ends
    const duration = buffer.duration;
    sourceTimerRef.current = window.setTimeout(
      playBuffer,
      (duration - 0.05) * 1000,
    );
  };

  const start = () => {
    if (!audioCtxRef.current || !bufferRef.current) return;

    setIsPlaying(true);
    playBuffer();
  };

  const stop = () => {
    if (!audioCtxRef.current) return;

    setIsPlaying(false);
    if (sourceTimerRef.current !== null) {
      clearTimeout(sourceTimerRef.current);
    }
    audioCtxRef.current.close();
    audioCtxRef.current = null;
  };

  const toggle = () => {
    return isPlaying ? stop() : initAndStart();
  };

  const setVolumeSafe = (v: number) => {
    setVolume(v);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        v,
        audioCtxRef.current!.currentTime,
      );
    }
  };

  const initAndStart = () => {
    const ctx = new (window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime); // start at 0
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3); // fade in over 3s
    gain.connect(ctx.destination);
    gainNodeRef.current = gain;

    fetch(url)
      .then(res => res.arrayBuffer())
      .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
      .then(buffer => {
        bufferRef.current = buffer;
        start();
      });
  };

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return {
    isPlaying,
    play: initAndStart,
    setIsPlaying: setIsPlaying,
    setVolume: setVolumeSafe,
    toggle,
    volume,
  };
};
