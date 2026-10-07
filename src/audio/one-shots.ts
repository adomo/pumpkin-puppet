import { syncBus, PuppetSlot } from '../sync/channel';
import { MicEngine } from './mic';

export interface OneShotClip {
  id: string;
  label: string;
  category: 'react' | 'ask' | 'bits' | 'bye' | 'spooky';
  text: string;
  duration: number; // in seconds
  character: 'goofy' | 'sly' | 'both';
}

export const GOOFY_CLIPS: OneShotClip[] = [
  // React
  { id: 'laugh', label: '😆 Hyuck Laugh', category: 'react', text: 'Hyuck hyuck hyuck!', duration: 1.4, character: 'goofy' },
  { id: 'giggle', label: '🤭 Squeaky Giggle', category: 'react', text: 'Hee-hee-hee!', duration: 1.1, character: 'goofy' },
  { id: 'gasp', label: '😲 Silly Gasp', category: 'react', text: '*Gasps loudly*', duration: 0.9, character: 'goofy' },
  { id: 'whoa', label: '🌀 Whoaaaa!', category: 'react', text: 'Whoaaaa buddy!', duration: 1.5, character: 'goofy' },
  { id: 'agreement', label: '👍 Yup Yup!', category: 'react', text: 'Yup yup yup!', duration: 1.0, character: 'goofy' },
  { id: 'playful_boo', label: '👻 Booo-hoo!', category: 'react', text: 'Boooo-hoo!', duration: 1.3, character: 'goofy' },
  // Ask
  { id: 'name', label: '❓ What\'s Your Name?', category: 'ask', text: 'Hey, what\'s your name?', duration: 1.6, character: 'goofy' },
  { id: 'brave', label: '💪 Are You Brave?', category: 'ask', text: 'Are you brave or scaredy-cat?', duration: 1.7, character: 'goofy' },
  { id: 'trick_or_treat', label: '🍬 Trick or Treat!', category: 'ask', text: 'Trick or treat, smell my feet!', duration: 1.8, character: 'goofy' },
  { id: 'secret', label: '🤫 Tell Secret!', category: 'ask', text: 'Psst! Tell me a spooky secret!', duration: 1.7, character: 'goofy' },
  { id: 'knock_knock', label: '🚪 Knock Knock!', category: 'ask', text: 'Knock knock! Who\'s there?', duration: 1.5, character: 'goofy' },
  // Bits
  { id: 'joke', label: '🃏 Squished Joke', category: 'bits', text: 'Why did the pumpkin roll? To get squished!', duration: 1.9, character: 'goofy' },
  { id: 'costume', label: '👑 Nice Costume!', category: 'bits', text: 'Ooh, I love your costume!', duration: 1.6, character: 'goofy' },
  { id: 'candy', label: '🍭 Smell Like Candy', category: 'bits', text: 'Mmm! You smell like sweet candy!', duration: 1.7, character: 'goofy' },
  { id: 'boing', label: '🤪 Cartoon Boing', category: 'bits', text: '*Boiiiing!*', duration: 1.0, character: 'goofy' },
  { id: 'raspberry', label: '👅 Sputter / Fart', category: 'bits', text: '*Pfffttt!*', duration: 0.9, character: 'goofy' },
  // Bye
  { id: 'see_ya', label: '👋 See Ya Next Year!', category: 'bye', text: 'See you next Halloween!', duration: 1.6, character: 'goofy' },
  { id: 'yawn', label: '🥱 Big Yawn', category: 'bye', text: '*Big sleepy yawn*', duration: 1.5, character: 'goofy' },
  { id: 'goodnight', label: '🌙 Nighty Night!', category: 'bye', text: 'Night night, don\'t let the bats bite!', duration: 1.8, character: 'goofy' }
];

export const SLY_DEFAULT_CLIPS: OneShotClip[] = [
  // React
  { id: 'laugh', label: '😏 Sarcastic Laugh', category: 'react', text: 'Heh heh heh...', duration: 1.4, character: 'sly' },
  { id: 'giggle', label: '😼 Smirking Snicker', category: 'react', text: 'Heh... amateur.', duration: 1.1, character: 'sly' },
  { id: 'gasp', label: '🤨 Sharp Intake', category: 'react', text: '*Sharp mocking gasp*', duration: 0.9, character: 'sly' },
  { id: 'whoa', label: '🕶️ Whoa Now...', category: 'react', text: 'Whoa now, take it easy...', duration: 1.5, character: 'sly' },
  { id: 'agreement', label: '👌 Naturally', category: 'react', text: 'Naturally.', duration: 0.9, character: 'sly' },
  { id: 'playful_boo', label: '🦇 Low Booo...', category: 'react', text: 'Boooo...', duration: 1.3, character: 'sly' },
  // Ask
  { id: 'name', label: '❓ Who Approaches?', category: 'ask', text: 'And who approaches my porch?', duration: 1.7, character: 'sly' },
  { id: 'brave', label: '👁️ Think You\'re Brave?', category: 'ask', text: 'Think you\'re brave enough?', duration: 1.6, character: 'sly' },
  { id: 'trick_or_treat', label: '🔮 Choose Wisely', category: 'ask', text: 'Trick or treat... choose wisely.', duration: 1.8, character: 'sly' },
  { id: 'secret', label: '🗝️ I Know Your Secret', category: 'ask', text: 'I already know your secrets...', duration: 1.7, character: 'sly' },
  { id: 'knock_knock', label: '🚪 Who Dares?', category: 'ask', text: 'Knock knock... who dares?', duration: 1.5, character: 'sly' },
  // Bits
  { id: 'joke', label: '💀 No Stomach Joke', category: 'bits', text: 'I\'d tell a skeleton joke, but you have no stomach for it.', duration: 2.0, character: 'sly' },
  { id: 'costume', label: '🎭 Curious Disguise', category: 'bits', text: 'A curious disguise... or is it real?', duration: 1.8, character: 'sly' },
  { id: 'candy', label: '🍫 Hand Over Candy', category: 'bits', text: 'Hand over the chocolate and nobody gets cursed.', duration: 1.9, character: 'sly' },
  { id: 'snicker', label: '🧛 Fang Hiss', category: 'bits', text: '*Hiss and sinister grin*', duration: 1.2, character: 'sly' },
  // Bye
  { id: 'see_ya', label: '⏳ Until Next Year', category: 'bye', text: 'Until we haunt again...', duration: 1.6, character: 'sly' },
  { id: 'goodnight', label: '🕯️ Pleasant Nightmares', category: 'bye', text: 'Pleasant nightmares, mortals...', duration: 1.8, character: 'sly' }
];

export const SLY_SPOOKY_CLIPS: OneShotClip[] = [
  { id: 'whisper', label: '👁️ Phantom Whisper', category: 'spooky', text: '*Eerie whisper* I see you...', duration: 1.8, character: 'sly' },
  { id: 'threat', label: '🎃 Don\'t Roll Off!', category: 'spooky', text: 'Don\'t make me roll off this porch!', duration: 1.9, character: 'sly' },
  { id: 'sting', label: '⚡ Horror Sting Stab', category: 'spooky', text: '*Dissonant organ horror sting*', duration: 1.5, character: 'sly' },
  { id: 'creak', label: '🚪 Dungeon Gate Creak', category: 'spooky', text: '*Rusted iron crypt creak*', duration: 1.8, character: 'sly' },
  { id: 'cackle', label: '😈 Deep Villain Cackle', category: 'spooky', text: 'Mwah-ha-ha-ha-ha!', duration: 1.9, character: 'sly' }
];

interface ActiveTrack {
  stop: () => void;
  timer: number;
}

export class OneShotEngine {
  private micEngine: MicEngine;
  private activeLeft: ActiveTrack | null = null;
  private activeRight: ActiveTrack | null = null;
  public isSpookyBankEnabled: boolean = false;
  private audioBufferCache: Map<string, AudioBuffer | null> = new Map();

  constructor(micEngine: MicEngine) {
    this.micEngine = micEngine;
  }

  public setSpookyBank(enabled: boolean): void {
    this.isSpookyBankEnabled = enabled;
  }

  private async fetchAudioClip(ctx: AudioContext, slot: 'left' | 'right', clipId: string): Promise<AudioBuffer | null> {
    const key = `${slot}_${clipId}`;
    if (this.audioBufferCache.has(key)) {
      return this.audioBufferCache.get(key) || null;
    }

    const possibleUrls = [
      `/sounds/${slot}_${clipId}.mp3`,
      `/sounds/${slot}_${clipId}.wav`,
      `/sounds/${clipId}.mp3`,
      `/sounds/${clipId}.wav`
    ];

    for (const url of possibleUrls) {
      try {
        const resp = await fetch(url, { method: 'HEAD' });
        if (resp.ok) {
          const fileResp = await fetch(url);
          const arrayBuf = await fileResp.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          this.audioBufferCache.set(key, audioBuf);
          return audioBuf;
        }
      } catch (_) {}
    }

    this.audioBufferCache.set(key, null);
    return null;
  }

  public async play(slot: 'left' | 'right', clipId: string): Promise<void> {
    this.stop(slot);

    const isGoofy = slot === 'left';
    let clip: OneShotClip | undefined;

    if (isGoofy) {
      clip = GOOFY_CLIPS.find((c) => c.id === clipId);
    } else {
      if (this.isSpookyBankEnabled) {
        clip = SLY_SPOOKY_CLIPS.find((c) => c.id === clipId);
      }
      if (!clip) {
        clip = SLY_DEFAULT_CLIPS.find((c) => c.id === clipId);
      }
    }

    if (!clip) return;

    const ctx = this.micEngine.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    const auxGain = this.micEngine.getAuxInputNode();

    // Check if a pre-recorded audio file exists in /sounds/, otherwise fall back to procedural synthesis
    let stopAudio: () => void = () => {};
    const recordedBuffer = await this.fetchAudioClip(ctx, slot, clip.id);
    if (recordedBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = recordedBuffer;
      src.connect(auxGain);
      src.start();
      stopAudio = () => {
        try { src.stop(); src.disconnect(); } catch (_) {}
      };
    } else {
      stopAudio = isGoofy
        ? this.synthesizeGoofy(ctx, auxGain, clip.id)
        : this.synthesizeSly(ctx, auxGain, clip.id, clip.category === 'spooky');
    }

    // Animate mouth on Stage via syncBus
    const stopMouth = this.startMouthAnimation(slot, clip.duration, clip.text);

    const stopTrack = () => {
      stopAudio();
      stopMouth();
    };

    const timer = window.setTimeout(() => {
      if (slot === 'left' && this.activeLeft?.timer === timer) {
        this.activeLeft = null;
      }
      if (slot === 'right' && this.activeRight?.timer === timer) {
        this.activeRight = null;
      }
    }, clip.duration * 1000 + 100);

    const track: ActiveTrack = { stop: stopTrack, timer };
    if (slot === 'left') this.activeLeft = track;
    if (slot === 'right') this.activeRight = track;
  }

  public playBoth(clipId: string): void {
    this.play('left', clipId);
    // Add tiny 120ms offset for natural comic banter/call-and-response
    setTimeout(() => {
      this.play('right', clipId);
    }, 120);
  }

  public stop(slot?: 'left' | 'right' | 'all'): void {
    if (!slot || slot === 'all' || slot === 'left') {
      if (this.activeLeft) {
        clearTimeout(this.activeLeft.timer);
        this.activeLeft.stop();
        this.activeLeft = null;
        syncBus.send({ type: 'TIMELINE_CUE', puppet: 'left', open: 0 });
      }
    }
    if (!slot || slot === 'all' || slot === 'right') {
      if (this.activeRight) {
        clearTimeout(this.activeRight.timer);
        this.activeRight.stop();
        this.activeRight = null;
        syncBus.send({ type: 'TIMELINE_CUE', puppet: 'right', open: 0 });
      }
    }
  }

  // --- Real-time Mouth Animation Sequencer ---

  private startMouthAnimation(slot: PuppetSlot, duration: number, text: string): () => void {
    const stepInterval = 110; // ~9Hz speech syllable flaps
    const totalSteps = Math.ceil((duration * 1000) / stepInterval);
    let step = 0;

    syncBus.send({
      type: 'TIMELINE_CUE',
      puppet: slot,
      open: 0.8,
      hold: 0.12,
      text: `[${slot.toUpperCase()}] ${text}`
    });

    const intervalId = window.setInterval(() => {
      step++;
      if (step >= totalSteps) {
        clearInterval(intervalId);
        syncBus.send({ type: 'TIMELINE_CUE', puppet: slot, open: 0 });
        return;
      }

      // Natural speech cadence mouth pulse
      const isSyllablePeak = (step % 2 === 0);
      const targetOpen = isSyllablePeak ? (0.6 + Math.random() * 0.35) : 0.15;

      syncBus.send({
        type: 'TIMELINE_CUE',
        puppet: slot,
        open: targetOpen,
        hold: 0.12
      });
    }, stepInterval);

    return () => {
      clearInterval(intervalId);
      syncBus.send({ type: 'TIMELINE_CUE', puppet: slot, open: 0 });
    };
  }

  // --- Goofy Bucktooth Procedural Synthesizer ---

  private synthesizeGoofy(ctx: AudioContext, destination: GainNode, clipId: string): () => void {
    const now = ctx.currentTime;
    const nodes: AudioNode[] = [];

    // Master bus for this one-shot
    const clipGain = ctx.createGain();
    clipGain.gain.setValueAtTime(0.85, now);
    clipGain.connect(destination);
    nodes.push(clipGain);

    if (clipId === 'boing') {
      // Cartoon jaw-harp boing: exponential sweep + high vibrato
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.9);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(14, now);
      lfoGain.gain.setValueAtTime(45, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.8, now + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

      osc.connect(filter);
      filter.connect(env);
      env.connect(clipGain);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 1.0);
      osc.stop(now + 1.0);
      nodes.push(osc, lfo, lfoGain, filter, env);
    } else if (clipId === 'raspberry') {
      // Silly cartoon raspberry: buzzy lip flap + filtered pink noise
      const bufferSize = ctx.sampleRate * 0.8;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(650, now);
      noiseFilter.Q.value = 2.5;

      const buzz = ctx.createOscillator();
      buzz.type = 'sawtooth';
      buzz.frequency.setValueAtTime(110, now);
      buzz.frequency.linearRampToValueAtTime(75, now + 0.7);

      // 22Hz chopper LFO for lip sputter
      const chopper = ctx.createOscillator();
      const chopperGain = ctx.createGain();
      chopper.type = 'square';
      chopper.frequency.setValueAtTime(22, now);
      chopperGain.gain.setValueAtTime(0.5, now);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.7, now + 0.05);
      env.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      noise.connect(noiseFilter);
      buzz.connect(noiseFilter);
      noiseFilter.connect(env);
      env.connect(clipGain);

      buzz.start(now);
      noise.start(now);
      buzz.stop(now + 0.85);
      noise.stop(now + 0.85);
      nodes.push(buzz, noise, noiseFilter, env);
    } else {
      // Playful comedic cartoon formant voice pattern ("Hyuck", "Yup", lines)
      const baseFreq = clipId.includes('laugh') || clipId.includes('giggle') ? 340 : 280;
      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 1.1];

      notes.forEach((freq, idx) => {
        const t = now + idx * 0.22;
        const osc = ctx.createOscillator();
        const formant1 = ctx.createBiquadFilter();
        const formant2 = ctx.createBiquadFilter();
        const env = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.1);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.9, t + 0.2);

        // Vocal formants for comedic cartoon vowel /a/ -> /u/
        formant1.type = 'bandpass';
        formant1.frequency.setValueAtTime(750, t);
        formant1.Q.value = 3.5;

        formant2.type = 'bandpass';
        formant2.frequency.setValueAtTime(1850, t);
        formant2.Q.value = 4.0;

        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.55, t + 0.03);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.connect(formant1);
        osc.connect(formant2);
        formant1.connect(env);
        formant2.connect(env);
        env.connect(clipGain);

        osc.start(t);
        osc.stop(t + 0.23);
        nodes.push(osc, formant1, formant2, env);
      });
    }

    return () => {
      try {
        clipGain.gain.setValueAtTime(0, ctx.currentTime);
        clipGain.disconnect();
      } catch (_) {}
    };
  }

  // --- Sly & Mischievous Procedural Synthesizer ---

  private synthesizeSly(ctx: AudioContext, destination: GainNode, clipId: string, isSpooky: boolean): () => void {
    const now = ctx.currentTime;
    const nodes: AudioNode[] = [];

    const clipGain = ctx.createGain();
    clipGain.gain.setValueAtTime(0.9, now);
    clipGain.connect(destination);
    nodes.push(clipGain);

    if (clipId === 'sting') {
      // Dissonant pipe organ horror chord stab
      const freqs = [130.81, 155.56, 185.00, 246.94]; // C3 minor diminished
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(0.3, now + 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        osc.connect(env);
        env.connect(clipGain);

        osc.start(now);
        osc.stop(now + 1.45);
        nodes.push(osc, env);
      });
    } else if (clipId === 'creak') {
      // Rusty iron gate creak: FM friction modulation
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();

      carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(320, now);
      carrier.frequency.linearRampToValueAtTime(480, now + 0.8);
      carrier.frequency.linearRampToValueAtTime(260, now + 1.6);

      mod.type = 'sine';
      mod.frequency.setValueAtTime(48, now);
      modGain.gain.setValueAtTime(140, now);
      mod.connect(modGain);
      modGain.connect(carrier.frequency);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.Q.value = 5.0;

      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.6, now + 0.1);
      env.gain.exponentialRampToValueAtTime(0.01, now + 1.7);

      carrier.connect(filter);
      filter.connect(env);
      env.connect(clipGain);

      carrier.start(now);
      mod.start(now);
      carrier.stop(now + 1.75);
      mod.stop(now + 1.75);
      nodes.push(carrier, mod, modGain, filter, env);
    } else if (clipId === 'whisper') {
      // Hollow phantom whisper: filtered noise formant sweep
      const bufferSize = ctx.sampleRate * 1.6;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.linearRampToValueAtTime(1600, now + 0.8);
      filter.frequency.linearRampToValueAtTime(800, now + 1.5);
      filter.Q.value = 6.0;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.7, now + 0.2);
      env.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

      noise.connect(filter);
      filter.connect(env);
      env.connect(clipGain);

      noise.start(now);
      noise.stop(now + 1.65);
      nodes.push(noise, filter, env);
    } else {
      // Sarcastic smirking tone: deeper formants (F1: 340Hz, F2: 1200Hz) with sub-rumble
      const baseFreq = isSpooky ? 120 : 160;
      const syllables = isSpooky ? [baseFreq, baseFreq * 1.1, baseFreq * 0.9, baseFreq * 0.8] : [baseFreq, baseFreq * 1.15, baseFreq * 0.95];

      syllables.forEach((freq, idx) => {
        const t = now + idx * 0.26;
        const osc = ctx.createOscillator();
        const sub = ctx.createOscillator();
        const formant = ctx.createBiquadFilter();
        const env = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.linearRampToValueAtTime(freq * 0.88, t + 0.22);

        sub.type = 'sine';
        sub.frequency.setValueAtTime(freq / 2, t);

        formant.type = 'bandpass';
        formant.frequency.setValueAtTime(420, t);
        formant.Q.value = 3.0;

        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.65, t + 0.04);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(formant);
        sub.connect(env);
        formant.connect(env);
        env.connect(clipGain);

        osc.start(t);
        sub.start(t);
        osc.stop(t + 0.26);
        sub.stop(t + 0.26);
        nodes.push(osc, sub, formant, env);
      });
    }

    return () => {
      try {
        clipGain.gain.setValueAtTime(0, ctx.currentTime);
        clipGain.disconnect();
      } catch (_) {}
    };
  }
}
