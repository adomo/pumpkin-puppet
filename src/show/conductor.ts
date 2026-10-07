import { syncBus, PuppetSlot } from '../sync/channel';
import { halloweenSynth } from '../audio/synth';

export interface ShowCue {
  t: number; // Timestamp in seconds
  puppet: PuppetSlot | 'all';
  open?: number;
  hold?: number;
  look?: 'left' | 'center' | 'right';
  eyes?: 'blink' | 'wide' | 'shut' | 'normal';
  action?: string;
  text?: string;
}

export interface ShowTimeline {
  title: string;
  bpm?: number;
  description?: string;
  audio?: string;
  cues: ShowCue[];
}

export class ShowConductor {
  private timeline: ShowTimeline | null = null;
  private isPlaying: boolean = false;
  private isLooping: boolean = false;
  private currentTime: number = 0;
  private duration: number = 0;
  private currentCueIndex: number = 0;
  private lastClockTime: number = 0;
  private animFrameId: number | null = null;

  // Audio track synchronization (optional)
  private audioElement: HTMLAudioElement | null = null;
  private hasAudioTrack: boolean = false;

  // Listeners
  private onTickListeners: Array<(currentTime: number, duration: number, activeText: string) => void> = [];
  private onStateListeners: Array<(isPlaying: boolean) => void> = [];
  private activeSubtitle: string = '';

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.addEventListener('ended', () => {
      if (this.isLooping) {
        this.seek(0);
        this.play();
      } else {
        this.stop();
      }
    });
  }

  public async loadFromUrl(url: string): Promise<ShowTimeline> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load timeline from ${url}: ${res.statusText}`);
    }
    const data = await res.json() as ShowTimeline;
    return this.loadTimeline(data);
  }

  public loadFromJsonString(jsonStr: string): ShowTimeline {
    const data = JSON.parse(jsonStr) as ShowTimeline;
    return this.loadTimeline(data);
  }

  public loadTimeline(data: ShowTimeline): ShowTimeline {
    this.stop();
    // Sort cues chronologically
    const sortedCues = [...(data.cues || [])].sort((a, b) => a.t - b.t);
    this.timeline = {
      ...data,
      cues: sortedCues
    };

    // Calculate duration (last cue time + 1.5s buffer)
    const lastCueTime = sortedCues.length > 0 ? sortedCues[sortedCues.length - 1].t : 10;
    this.duration = Math.max(5, lastCueTime + 1.5);
    this.currentTime = 0;
    this.currentCueIndex = 0;
    this.activeSubtitle = '';

    // If audio element has audio loaded and its duration is longer, adopt it
    if (this.hasAudioTrack && this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration)) {
      this.duration = Math.max(this.duration, this.audioElement.duration);
    }

    this.notifyTick();
    return this.timeline;
  }

  public loadAudioFile(file: File): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      if (!this.audioElement) {
        this.audioElement = new Audio();
      }
      this.audioElement.src = url;
      this.audioElement.onloadedmetadata = () => {
        this.hasAudioTrack = true;
        if (this.audioElement && this.audioElement.duration && !isNaN(this.audioElement.duration)) {
          this.duration = Math.max(this.duration, this.audioElement.duration);
        }
        this.notifyTick();
        resolve();
      };
      this.audioElement.onerror = () => {
        console.warn('Failed to load audio track metadata');
        this.hasAudioTrack = false;
        resolve();
      };
    });
  }

  public clearAudio(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    this.hasAudioTrack = false;
    if (this.timeline && this.timeline.cues.length > 0) {
      const last = this.timeline.cues[this.timeline.cues.length - 1].t;
      this.duration = last + 1.5;
    }
    this.notifyTick();
  }

  public play(): void {
    if (!this.timeline || this.timeline.cues.length === 0) return;
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.lastClockTime = performance.now();

    if (this.hasAudioTrack && this.audioElement) {
      this.audioElement.currentTime = this.currentTime;
      this.audioElement.play().catch((err) => {
        console.warn('Audio playback error (user interaction might be needed):', err);
      });
    }

    this.notifyState();
    this.scheduleLoop();
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.hasAudioTrack && this.audioElement) {
      this.audioElement.pause();
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.notifyState();
  }

  public stop(): void {
    this.pause();
    this.currentTime = 0;
    this.currentCueIndex = 0;
    this.activeSubtitle = '';

    if (this.hasAudioTrack && this.audioElement) {
      this.audioElement.currentTime = 0;
    }

    // Reset mouths and look directions on stage
    syncBus.send({
      type: 'TIMELINE_CUE',
      puppet: 'all',
      open: 0,
      look: 'center',
      eyes: 'normal'
    });

    this.notifyTick();
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(targetSeconds: number): void {
    this.currentTime = Math.max(0, Math.min(this.duration, targetSeconds));
    if (this.hasAudioTrack && this.audioElement) {
      this.audioElement.currentTime = this.currentTime;
    }

    // Re-index cues to find the next cue to execute
    if (this.timeline) {
      this.currentCueIndex = this.timeline.cues.findIndex((c) => c.t >= this.currentTime);
      if (this.currentCueIndex === -1) {
        this.currentCueIndex = this.timeline.cues.length;
      }
    }

    this.notifyTick();
  }

  public setLoop(loop: boolean): void {
    this.isLooping = loop;
  }

  public getLoop(): boolean {
    return this.isLooping;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getDuration(): number {
    return this.duration;
  }

  public getTimeline(): ShowTimeline | null {
    return this.timeline;
  }

  public onTick(fn: (currentTime: number, duration: number, activeText: string) => void): () => void {
    this.onTickListeners.push(fn);
    return () => {
      this.onTickListeners = this.onTickListeners.filter((l) => l !== fn);
    };
  }

  public onStateChange(fn: (isPlaying: boolean) => void): () => void {
    this.onStateListeners.push(fn);
    return () => {
      this.onStateListeners = this.onStateListeners.filter((l) => l !== fn);
    };
  }

  private scheduleLoop(): void {
    if (!this.isPlaying) return;

    this.animFrameId = requestAnimationFrame((now) => {
      this.tick(now);
      this.scheduleLoop();
    });
  }

  private tick(now: number): void {
    if (!this.isPlaying || !this.timeline) return;

    if (this.hasAudioTrack && this.audioElement && !this.audioElement.paused) {
      this.currentTime = this.audioElement.currentTime;
    } else {
      const dt = (now - this.lastClockTime) / 1000;
      this.lastClockTime = now;
      this.currentTime += dt;
    }

    // Process all cues up to currentTime
    while (
      this.currentCueIndex < this.timeline.cues.length &&
      this.timeline.cues[this.currentCueIndex].t <= this.currentTime
    ) {
      const cue = this.timeline.cues[this.currentCueIndex];
      this.dispatchCue(cue);
      this.currentCueIndex++;
    }

    // Check for show completion
    if (this.currentTime >= this.duration) {
      if (this.isLooping) {
        this.seek(0);
        if (this.hasAudioTrack && this.audioElement) {
          this.audioElement.currentTime = 0;
          this.audioElement.play().catch(() => {});
        }
      } else {
        this.stop();
        return;
      }
    }

    this.notifyTick();
  }

  private dispatchCue(cue: ShowCue): void {
    if (cue.text) {
      const speaker = cue.puppet.toUpperCase();
      this.activeSubtitle = `[${speaker}] ${cue.text}`;
    }

    // Send broadcast cue to stage
    syncBus.send({
      type: 'TIMELINE_CUE',
      puppet: cue.puppet,
      open: cue.open,
      hold: cue.hold,
      look: cue.look,
      eyes: cue.eyes,
      action: cue.action,
      text: cue.text
    });

    // If no external audio track is loaded, trigger procedural synth accents for cues!
    if (!this.hasAudioTrack) {
      if (cue.action === 'flame') halloweenSynth.playFlame();
      if (cue.action === 'freeze') halloweenSynth.playFreeze();
      if (cue.action === 'lightning') halloweenSynth.playLightning();
      if (cue.action === 'scream') halloweenSynth.playScream();

      // For speech/singing without audio track, synthesize gentle musical chime
      if (typeof cue.open === 'number' && cue.open > 0.4) {
        const freqMap: Record<PuppetSlot | 'all', number> = {
          left: 260,
          center: 330,
          right: 392,
          all: 440
        };
        const baseFreq = freqMap[cue.puppet] || 330;
        halloweenSynth.playChime(baseFreq + (Math.random() - 0.5) * 40);
      }
    }
  }

  private notifyTick(): void {
    this.onTickListeners.forEach((fn) =>
      fn(this.currentTime, this.duration, this.activeSubtitle)
    );

    syncBus.send({
      type: 'TIMELINE_STATUS',
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      title: this.timeline?.title || '',
      currentText: this.activeSubtitle
    });
  }

  private notifyState(): void {
    this.onStateListeners.forEach((fn) => fn(this.isPlaying));
  }
}

export const showConductor = new ShowConductor();
