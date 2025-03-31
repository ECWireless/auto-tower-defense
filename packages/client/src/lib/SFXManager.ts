type SFXMap = { [key: string]: AudioBuffer };
type SourceMap = { [key: string]: AudioBufferSourceNode };

export class SFXManager {
  private audioCtx: AudioContext;
  private sfxBuffers: SFXMap = {};
  private activeSources: SourceMap = {};
  private volume: number = 1;
  private muted: boolean = false;

  constructor() {
    this.audioCtx = new (window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitAudioContext)();
  }

  async load(name: string, url: string): Promise<void> {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    this.sfxBuffers[name] = audioBuffer;
  }

  play(name: string, options: { preventOverlap?: boolean } = {}): void {
    if (this.muted || !this.sfxBuffers[name]) return;

    // Optionally prevent overlap of the same sound
    if (options.preventOverlap && this.activeSources[name]) {
      return; // skip if already playing
    }

    const bufferSource = this.audioCtx.createBufferSource();
    bufferSource.buffer = this.sfxBuffers[name];

    const gain = this.audioCtx.createGain();
    gain.gain.value = this.volume;

    bufferSource.connect(gain);
    gain.connect(this.audioCtx.destination);
    bufferSource.start(0);

    // Track this sound as active if needed
    if (options.preventOverlap) {
      this.activeSources[name] = bufferSource;

      bufferSource.onended = () => {
        delete this.activeSources[name];
      };
    }
  }

  setVolume(v: number): void {
    this.volume = v;
  }

  setMuted(mute: boolean): void {
    this.muted = mute;
  }
}
