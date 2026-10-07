import { syncBus } from '../sync/channel';

export class VideoManager {
  private video: HTMLVideoElement;
  private isLoaded: boolean = false;
  private lastStatusBroadcast: number = 0;

  constructor() {
    this.video = document.createElement('video');
    this.video.id = 'stage-projection-video';
    this.video.playsInline = true;
    this.video.crossOrigin = 'anonymous';
    this.video.preload = 'auto';
    this.video.loop = true;
    this.video.muted = false;

    // Keep hidden offscreen while maintaining active playback context
    this.video.style.position = 'fixed';
    this.video.style.top = '-9999px';
    this.video.style.left = '-9999px';
    this.video.style.width = '1px';
    this.video.style.height = '1px';
    this.video.style.opacity = '0';
    this.video.style.pointerEvents = 'none';

    document.body.appendChild(this.video);

    this.setupListeners();
  }

  private setupListeners(): void {
    this.video.addEventListener('loadedmetadata', () => {
      this.isLoaded = true;
      this.broadcastStatus();
    });

    this.video.addEventListener('timeupdate', () => {
      const now = performance.now();
      // Throttle broadcast to ~10Hz
      if (now - this.lastStatusBroadcast > 90) {
        this.lastStatusBroadcast = now;
        this.broadcastStatus();
      }
    });

    this.video.addEventListener('play', () => this.broadcastStatus());
    this.video.addEventListener('pause', () => this.broadcastStatus());
    this.video.addEventListener('ended', () => this.broadcastStatus());
    this.video.addEventListener('error', (e) => {
      console.warn('Stage video error:', this.video.error || e);
    });
  }

  public load(url: string, loop: boolean = true): void {
    if (!url) return;
    try {
      const currentFull = this.video.src ? new URL(this.video.src, window.location.href).href : '';
      const targetFull = new URL(url, window.location.href).href;
      if (currentFull === targetFull) {
        this.video.loop = loop;
        return;
      }
    } catch (_) {
      if (this.video.src === url || this.video.currentSrc === url) return;
    }

    this.isLoaded = false;
    this.video.src = url;
    this.video.loop = loop;
    this.video.load();
  }

  private targetVolume: number = 0.85;
  private targetMuted: boolean = false;

  public async play(): Promise<void> {
    if (!this.video.paused && !this.video.ended && this.video.readyState >= 2) {
      return; // Already playing smoothly
    }
    try {
      this.video.muted = this.targetMuted;
      this.video.volume = this.targetVolume;
      await this.video.play();
      this.broadcastStatus();
    } catch (err) {
      console.warn('Video unmuted playback blocked by browser autoplay policy:', err);
      // Fallback: start video visually muted, but keep targetMuted so unlockAudio restores sound on user tap!
      try {
        this.video.muted = true;
        await this.video.play();
        this.broadcastStatus();
      } catch (innerErr) {
        console.error('Muted video playback also failed:', innerErr);
      }
    }
  }

  public unlockAudio(): void {
    if (this.video) {
      this.video.muted = this.targetMuted;
      this.video.volume = this.targetVolume;
      if (!this.video.paused) {
        this.video.play().catch(() => {});
      }
    }
  }

  public pause(): void {
    this.video.pause();
    this.broadcastStatus();
  }

  public stop(): void {
    this.video.pause();
    this.video.currentTime = 0;
    this.broadcastStatus();
  }

  public seek(timeSeconds: number): void {
    if (!Number.isFinite(timeSeconds)) return;
    const dur = this.video.duration || 0;
    this.video.currentTime = Math.max(0, Math.min(dur, timeSeconds));
    this.broadcastStatus();
  }

  public setVolume(volume: number, muted: boolean): void {
    this.targetVolume = Math.max(0, Math.min(1.0, volume));
    this.targetMuted = muted;
    this.video.volume = this.targetVolume;
    this.video.muted = muted;
  }

  public setLoop(loop: boolean): void {
    this.video.loop = loop;
  }

  public getVideoElement(): HTMLVideoElement {
    return this.video;
  }

  public isReady(): boolean {
    return this.isLoaded && this.video.readyState >= 2;
  }

  public isPlaying(): boolean {
    return !this.video.paused && !this.video.ended && this.video.readyState >= 2;
  }

  public getCurrentTime(): number {
    return this.video.currentTime || 0;
  }

  public getDuration(): number {
    return this.video.duration || 0;
  }

  public broadcastStatus(): void {
    syncBus.send({
      type: 'VIDEO_STATUS',
      isPlaying: !this.video.paused && !this.video.ended,
      currentTime: this.video.currentTime || 0,
      duration: this.video.duration || 0
    });
  }
}
