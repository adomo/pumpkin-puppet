export class HalloweenSynth {
  private ctx: AudioContext | null = null;
  private delayNode: DelayNode | null = null;
  private masterGain: GainNode | null = null;
  public castDelayMs: number = 0;

  // Song playback state
  public isSongPlaying: boolean = false;
  private songTimer: number | null = null;
  private songStep: number = 0;

  constructor(initialDelayMs: number = 0) {
    this.castDelayMs = initialDelayMs;
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.delayNode = this.ctx.createDelay(2.0);
      this.delayNode.delayTime.value = Math.max(0, this.castDelayMs / 1000);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;

      this.delayNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setDelay(ms: number): void {
    this.castDelayMs = ms;
    if (this.delayNode && this.ctx) {
      this.delayNode.delayTime.setTargetAtTime(Math.max(0, ms / 1000), this.ctx.currentTime, 0.05);
    }
  }

  public getDelayNode(): DelayNode | null {
    this.initContext();
    return this.delayNode;
  }

  // --- Sound Effects ---

  public playScream(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    // Pitch-shifting saw wave for spooky cartoon scream
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.65);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.delayNode!);

    osc.start(now);
    osc.stop(now + 0.7);
  }

  public playFlame(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    // Filtered noise for fire roar
    const bufferSize = ctx.sampleRate * 0.8;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.value = 1.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.delayNode!);

    whiteNoise.start(now);
  }

  public playFreeze(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    // Shimmering high chimes for frost
    [880, 1320, 1760, 2200].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.5);

      osc.connect(gain);
      gain.connect(this.delayNode!);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.55);
    });
  }

  public playLightning(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    // Electric zap buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.delayNode!);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playSoul(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    // Eerie undulating ghost whistle
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.9);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    osc.connect(gain);
    gain.connect(this.delayNode!);

    osc.start(now);
    osc.stop(now + 1.1);
  }

  public playSmoke(): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    // Soft airy hiss
    const bufferSize = ctx.sampleRate * 0.6;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.delayNode!);

    whiteNoise.start(now);
  }

  public playChime(freq: number): void {
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.delayNode!);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // --- Spooky Demo Song & 3-Pumpkin Conductor ---

  public toggleSong(onCue: (puppet: 'left' | 'center' | 'right' | 'all', open: number) => void): boolean {
    if (this.isSongPlaying) {
      this.stopSong(onCue);
      return false;
    } else {
      this.startDemoSong(onCue);
      return true;
    }
  }

  public stopSong(onCue: (puppet: 'left' | 'center' | 'right' | 'all', open: number) => void): void {
    this.isSongPlaying = false;
    if (this.songTimer) {
      clearInterval(this.songTimer);
      this.songTimer = null;
    }
    onCue('all', 0);
  }

  public startDemoSong(onCue: (puppet: 'left' | 'center' | 'right' | 'all', open: number) => void): void {
    const ctx = this.initContext();
    this.isSongPlaying = true;
    this.songStep = 0;

    // Spooky Halloween Organ Melody Notes (D minor Bach / Halloween theme vibe)
    // D4, F4, G4, A4, Bb4, A4, G4, F4, D4...
    const melody: Array<{
      note: number;
      puppet: 'left' | 'center' | 'right' | 'all';
      hold: number;
    }> = [
      { note: 293.66, puppet: 'center', hold: 0.35 }, // D4
      { note: 349.23, puppet: 'center', hold: 0.35 }, // F4
      { note: 392.00, puppet: 'left', hold: 0.35 },   // G4
      { note: 440.00, puppet: 'right', hold: 0.35 },  // A4
      { note: 466.16, puppet: 'center', hold: 0.5 },  // Bb4
      { note: 440.00, puppet: 'left', hold: 0.35 },   // A4
      { note: 392.00, puppet: 'right', hold: 0.35 },  // G4
      { note: 349.23, puppet: 'center', hold: 0.35 }, // F4
      { note: 293.66, puppet: 'all', hold: 0.7 },     // D4 (Harmonize All!)
      { note: 220.00, puppet: 'left', hold: 0.35 },   // A3
      { note: 293.66, puppet: 'center', hold: 0.35 }, // D4
      { note: 349.23, puppet: 'right', hold: 0.35 },  // F4
      { note: 440.00, puppet: 'all', hold: 0.8 }      // Chorus Chord!
    ];

    const stepMs = 380;
    this.songTimer = window.setInterval(() => {
      if (!this.isSongPlaying) return;

      const cue = melody[this.songStep % melody.length];
      const now = ctx.currentTime;

      // Play Spooky Organ Note
      const osc = ctx.createOscillator();
      const oscSub = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(cue.note, now);

      oscSub.type = 'sine';
      oscSub.frequency.setValueAtTime(cue.note / 2, now); // Sub bass

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + cue.hold);

      osc.connect(gain);
      oscSub.connect(gain);
      gain.connect(this.delayNode!);

      osc.start(now);
      oscSub.start(now);
      osc.stop(now + cue.hold + 0.05);
      oscSub.stop(now + cue.hold + 0.05);

      // Trigger Pumpkin Singing Cue!
      onCue(cue.puppet, 0.9);
      setTimeout(() => {
        onCue(cue.puppet, 0.1);
      }, cue.hold * 800);

      this.songStep++;
    }, stepMs);
  }
}

export const halloweenSynth = new HalloweenSynth();
