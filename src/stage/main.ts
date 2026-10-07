import { StageRenderer } from './renderer';
import { Puppet, PuppetVideoSource } from './puppet';
import { StageKeyboard } from './keyboard';
import { MicEngine } from '../audio/mic';
import { syncBus, PuppetSlot, CornerKey, SyncMessage } from '../sync/channel';
import { loadConfig, saveConfig, DEFAULT_TRANSFORMS, DEFAULT_CORNERS, AppConfig } from '../sync/storage';
import { faceLoader } from './face-loader';
import { halloweenSynth } from '../audio/synth';
import { VideoManager } from './video-manager';

class StageApp {
  private canvas: HTMLCanvasElement;
  private renderer: StageRenderer;
  private mic: MicEngine;
  private config: AppConfig;
  private videoManager: VideoManager;

  private puppets: Record<PuppetSlot, Puppet>;
  private focusedSlot: PuppetSlot = 'center';
  private activeCorner: 'none' | CornerKey = 'none';

  private lastTime: number = performance.now();

  constructor() {
    const canvas = document.getElementById('stage-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas #stage-canvas not found');
    }
    this.canvas = canvas;
    this.renderer = new StageRenderer(this.canvas);

    // Load persisted state
    this.config = loadConfig();

    // Create 3 puppets
    this.puppets = {
      left: new Puppet('left', this.config.transforms.left),
      center: new Puppet('center', this.config.transforms.center),
      right: new Puppet('right', this.config.transforms.right)
    };
    this.setFocus('center');

    // Create Mic Engine
    this.mic = new MicEngine(this.config.gate, this.config.smoothness);

    // Create Video Player Manager
    this.videoManager = new VideoManager();
    this.videoManager.load(this.config.videoConfig.url, this.config.videoConfig.loop);
    this.videoManager.setVolume(this.config.videoConfig.volume, this.config.videoConfig.muted);
    if (this.config.showMode === 'video') {
      this.videoManager.play();
    }

    // Setup input & sync
    this.setupKeyboard();
    this.setupSyncBus();

    // Start 60 FPS loop
    requestAnimationFrame((t) => this.loop(t));

    // Ensure canvas has focus for immediate keyboard capture
    window.addEventListener('click', () => {
      this.canvas.focus();
    });
    this.canvas.focus();
  }

  private setFocus(slot: PuppetSlot): void {
    this.focusedSlot = slot;
    (Object.keys(this.puppets) as PuppetSlot[]).forEach((s) => {
      this.puppets[s].isFocused = s === slot;
    });

    syncBus.send({ type: 'SET_FOCUS', slot });
  }

  private cycleCorner(): void {
    const order: Array<'none' | CornerKey> = ['none', 'tl', 'tr', 'br', 'bl'];
    const idx = order.indexOf(this.activeCorner);
    const next = order[(idx + 1) % order.length];
    this.activeCorner = next;
    this.renderer.setActiveCorner(next);
    syncBus.send({ type: 'SET_MAPPING_CORNER_TARGET', corner: next });
  }

  private selectCorner(corner: 'none' | CornerKey): void {
    this.activeCorner = corner;
    this.renderer.setActiveCorner(corner);
    syncBus.send({ type: 'SET_MAPPING_CORNER_TARGET', corner });
  }

  private nudgeActiveCorner(dx: number, dy: number): void {
    if (this.activeCorner === 'none') return;
    const tf = this.puppets[this.focusedSlot].transform;
    tf.corners[this.activeCorner][0] += dx;
    tf.corners[this.activeCorner][1] += dy;
    saveConfig(this.config);
    syncBus.send({ type: 'UPDATE_TRANSFORM', slot: this.focusedSlot, transform: tf });
  }

  private resetKeystone(slot: PuppetSlot): void {
    const tf = this.puppets[slot].transform;
    tf.corners = JSON.parse(JSON.stringify(DEFAULT_CORNERS));
    saveConfig(this.config);
    syncBus.send({ type: 'UPDATE_TRANSFORM', slot, transform: tf });
  }

  private setupKeyboard(): void {
    new StageKeyboard({
      onFocus: (slot) => this.setFocus(slot),
      onTalkToggle: () => this.handleTalkToggle(),
      onFlameToggle: () => {
        this.puppets[this.focusedSlot].triggerFlame();
        halloweenSynth.playFlame();
      },
      onEyeFlames: (active) => {
        this.puppets[this.focusedSlot].setEyeFlames(active);
        if (active) halloweenSynth.playFlame();
      },
      onFreezeToggle: () => {
        this.puppets[this.focusedSlot].triggerFreeze();
        halloweenSynth.playFreeze();
      },
      onSmoke: () => {
        this.puppets[this.focusedSlot].interior = 'smoke';
        halloweenSynth.playSmoke();
        setTimeout(() => {
          if (this.puppets[this.focusedSlot].interior === 'smoke') {
            this.puppets[this.focusedSlot].interior = 'none';
          }
        }, 1200);
      },
      onLightning: () => {
        this.puppets[this.focusedSlot].triggerLightning();
        halloweenSynth.playLightning();
      },
      onSoul: () => {
        this.puppets[this.focusedSlot].overlay = 'soul';
        halloweenSynth.playSoul();
        setTimeout(() => {
          if (this.puppets[this.focusedSlot].overlay === 'soul') {
            this.puppets[this.focusedSlot].overlay = 'none';
          }
        }, 1600);
      },
      onScream: () => {
        this.puppets[this.focusedSlot].triggerScream();
        halloweenSynth.playScream();
      },
      onSleepToggle: () => {
        this.puppets[this.focusedSlot].triggerSleep();
      },
      onWink: () => {
        this.puppets[this.focusedSlot].triggerWink();
      },
      onLook: (dir) => {
        this.puppets[this.focusedSlot].setLook(dir);
      },
      onCallResponse: () => {
        this.handleCallAndResponse();
      },
      onSongToggle: () => {
        halloweenSynth.toggleSong((puppet, open) => {
          this.handleSongCue(puppet, open);
        });
      },
      onBlackout: () => {
        this.renderer.triggerBlackout();
        syncBus.send({ type: 'TOGGLE_DIAGNOSTIC', diag: 'blackout' });
      },
      onReset: () => {
        this.puppets[this.focusedSlot].reset();
        this.renderer.blackoutActive = false;
      },
      onGateChange: (delta) => {
        this.config.gate = Math.max(0, Math.min(1.0, this.config.gate + delta));
        this.mic.setGate(this.config.gate);
        saveConfig(this.config);
        syncBus.send({ type: 'SET_GATE', gate: this.config.gate });
      },
      onDelayChange: (delta) => {
        this.config.castDelayMs = Math.max(0, Math.min(1500, this.config.castDelayMs + delta));
        saveConfig(this.config);
        syncBus.send({ type: 'SET_DELAY', castDelayMs: this.config.castDelayMs });
      },
      onToggleGrid: () => {
        this.renderer.toggleGrid();
        syncBus.send({ type: 'TOGGLE_DIAGNOSTIC', diag: 'grid' });
      },
      onToggleBlackCard: () => {
        this.renderer.toggleBlackCard();
        syncBus.send({ type: 'TOGGLE_DIAGNOSTIC', diag: 'black-card' });
      },
      onToggleMappingMode: () => {
        const on = this.renderer.toggleMappingMode();
        syncBus.send({ type: 'TOGGLE_MAPPING_MODE', active: on });
      },
      onCycleCorner: () => this.cycleCorner(),
      onSelectCorner: (c) => this.selectCorner(c),
      onNudgeCorner: (dx, dy) => this.nudgeActiveCorner(dx, dy),
      onResetKeystone: () => this.resetKeystone(this.focusedSlot),
      isCornerActive: () => this.renderer.mappingModeVisible && this.activeCorner !== 'none',
      isMappingActive: () => this.renderer.mappingModeVisible,
      onNudge: (dx, dy) => {
        const tf = this.puppets[this.focusedSlot].transform;
        tf.x += dx;
        tf.y += dy;
        saveConfig(this.config);
        syncBus.send({ type: 'UPDATE_TRANSFORM', slot: this.focusedSlot, transform: tf });
      },
      onScaleChange: (delta) => {
        const tf = this.puppets[this.focusedSlot].transform;
        const newScaleX = Math.max(0.2, Math.min(3.0, +(tf.scaleX + delta).toFixed(2)));
        const newScaleY = Math.max(0.2, Math.min(3.0, +(tf.scaleY + delta).toFixed(2)));
        tf.scaleX = newScaleX;
        tf.scaleY = newScaleY;
        saveConfig(this.config);
        syncBus.send({ type: 'UPDATE_TRANSFORM', slot: this.focusedSlot, transform: tf });
      },
      onScaleYChange: (delta) => {
        const tf = this.puppets[this.focusedSlot].transform;
        tf.scaleY = Math.max(0.2, Math.min(3.0, +(tf.scaleY + delta).toFixed(2)));
        saveConfig(this.config);
        syncBus.send({ type: 'UPDATE_TRANSFORM', slot: this.focusedSlot, transform: tf });
      },
      onRotateChange: (delta) => {
        const tf = this.puppets[this.focusedSlot].transform;
        tf.rotation = (tf.rotation + delta) % 360;
        saveConfig(this.config);
        syncBus.send({ type: 'UPDATE_TRANSFORM', slot: this.focusedSlot, transform: tf });
      }
    });
  }

  private async handleTalkToggle(): Promise<void> {
    await this.mic.toggle();
    this.broadcastState();
  }

  private handleCallAndResponse(): void {
    const sequence: PuppetSlot[] = ['left', 'center', 'right'];
    sequence.forEach((slot, idx) => {
      setTimeout(() => {
        const p = this.puppets[slot];
        p.setMouthOpen(0.8);
        halloweenSynth.playChime(320 + idx * 80);
        setTimeout(() => p.setMouthOpen(0), 160);
      }, idx * 200);
    });
  }

  private handleSongCue(puppet: 'left' | 'center' | 'right' | 'all', open: number): void {
    const slots: PuppetSlot[] = ['left', 'center', 'right'];
    if (puppet === 'all') {
      slots.forEach((s) => this.puppets[s].setMouthOpen(open));
    } else {
      slots.forEach((s) => {
        this.puppets[s].setMouthOpen(s === puppet ? open : 0.05);
      });
    }
  }

  private handleTimelineCue(cue: {
    puppet: PuppetSlot | 'all';
    open?: number;
    hold?: number;
    look?: 'left' | 'center' | 'right';
    eyes?: 'blink' | 'wide' | 'shut' | 'normal';
    action?: string;
    text?: string;
  }): void {
    const slots: PuppetSlot[] = cue.puppet === 'all'
      ? ['left', 'center', 'right']
      : [cue.puppet];

    slots.forEach((s) => {
      const p = this.puppets[s];
      if (cue.look) {
        p.setLook(cue.look);
      }
      if (cue.eyes) {
        p.setEyes(cue.eyes);
      }
      if (typeof cue.open === 'number') {
        p.setMouthOpen(cue.open);
        if (cue.hold && cue.hold > 0) {
          setTimeout(() => {
            p.setMouthOpen(0);
            if (cue.eyes === 'wide') {
              p.setEyes('normal');
            }
          }, cue.hold * 1000);
        }
      }
      if (cue.action) {
        this.executeAction(cue.action, s);
      }
    });
  }

  private setupSyncBus(): void {
    syncBus.on((msg: SyncMessage) => {
      switch (msg.type) {
        case 'TIMELINE_CUE':
          this.handleTimelineCue(msg);
          break;
        case 'AUDIO_METER':
          if (!this.mic.isArmed) {
            const slots: PuppetSlot[] = ['left', 'center', 'right'];
            slots.forEach((s) => {
              if (s === this.focusedSlot) {
                this.puppets[s].setMouthOpen(msg.smoothed);
              } else {
                this.puppets[s].setMouthOpen(0);
              }
            });
          }
          break;
        case 'SET_MONITOR':
          this.mic.setMonitor(msg.enabled);
          break;
        case 'TOGGLE_SONG':
          halloweenSynth.toggleSong((puppet, open) => {
            this.handleSongCue(puppet, open);
          });
          break;
        case 'SONG_CUE':
          this.handleSongCue(msg.slot, msg.open);
          break;
        case 'SYNC_STATE_REQ':
          this.broadcastState();
          break;
        case 'SET_FOCUS':
          this.setFocus(msg.slot);
          break;
        case 'TRIGGER_ACTION':
          this.executeAction(msg.action, msg.slot);
          break;
        case 'SET_GATE':
          this.config.gate = msg.gate;
          this.mic.setGate(msg.gate);
          saveConfig(this.config);
          break;
        case 'SET_SMOOTHNESS':
          this.config.smoothness = msg.smoothness;
          this.mic.setSmoothness(msg.smoothness);
          saveConfig(this.config);
          break;
        case 'SET_DELAY':
          this.config.castDelayMs = msg.castDelayMs;
          saveConfig(this.config);
          break;
        case 'SET_FACE_STYLE':
          this.puppets[msg.slot].transform.faceStyle = msg.style;
          this.config.transforms[msg.slot].faceStyle = msg.style;
          saveConfig(this.config);
          break;
        case 'UPDATE_TRANSFORM':
          this.puppets[msg.slot].transform = { ...msg.transform };
          this.config.transforms[msg.slot] = { ...msg.transform };
          saveConfig(this.config);
          break;
        case 'SET_CORNER':
          this.puppets[msg.slot].transform.corners[msg.corner] = [msg.dx, msg.dy];
          this.config.transforms[msg.slot].corners[msg.corner] = [msg.dx, msg.dy];
          saveConfig(this.config);
          break;
        case 'SET_ALL_CORNERS':
          this.puppets[msg.slot].transform.corners = { ...msg.corners };
          this.config.transforms[msg.slot].corners = { ...msg.corners };
          saveConfig(this.config);
          break;
        case 'RESET_TRANSFORM':
          this.puppets[msg.slot].transform = JSON.parse(JSON.stringify(DEFAULT_TRANSFORMS[msg.slot]));
          this.config.transforms[msg.slot] = JSON.parse(JSON.stringify(DEFAULT_TRANSFORMS[msg.slot]));
          saveConfig(this.config);
          break;
        case 'RESET_KEYSTONE':
          this.resetKeystone(msg.slot);
          break;
        case 'TOGGLE_MAPPING_MODE':
          this.renderer.mappingModeVisible = msg.active ?? !this.renderer.mappingModeVisible;
          break;
        case 'SET_MAPPING_CORNER_TARGET':
          this.selectCorner(msg.corner);
          break;
        case 'SET_ACTIVE_PROFILE':
          if (this.config.profiles[msg.profileId]) {
            this.config.activeProfileId = msg.profileId;
            const prof = this.config.profiles[msg.profileId];
            (['left', 'center', 'right'] as PuppetSlot[]).forEach((slot) => {
              this.puppets[slot].transform = JSON.parse(JSON.stringify(prof.transforms[slot]));
              this.config.transforms[slot] = JSON.parse(JSON.stringify(prof.transforms[slot]));
            });
            saveConfig(this.config);
            this.broadcastState();
          }
          break;
        case 'SAVE_NEW_PROFILE': {
          const id = 'prof_' + Date.now();
          this.config.profiles[id] = {
            id,
            name: msg.name,
            transforms: JSON.parse(JSON.stringify(this.config.transforms))
          };
          this.config.activeProfileId = id;
          saveConfig(this.config);
          this.broadcastState();
          break;
        }
        case 'DELETE_PROFILE':
          if (msg.profileId !== 'default' && this.config.profiles[msg.profileId]) {
            delete this.config.profiles[msg.profileId];
            this.config.activeProfileId = 'default';
            saveConfig(this.config);
            this.broadcastState();
          }
          break;
        case 'TOGGLE_DIAGNOSTIC':
          if (msg.diag === 'grid') this.renderer.toggleGrid();
          if (msg.diag === 'black-card') this.renderer.toggleBlackCard();
          if (msg.diag === 'mapping') this.renderer.toggleMappingMode();
          if (msg.diag === 'blackout') {
            if (this.renderer.blackoutActive) {
              this.renderer.blackoutActive = false;
            } else {
              this.renderer.triggerBlackout();
            }
          }
          break;
        case 'LOAD_SVG':
          faceLoader.loadSvgString(msg.svgContent).catch((err) => {
            console.error('Failed to parse uploaded SVG:', err);
          });
          break;
        case 'SET_SHOW_MODE':
          if (this.config.showMode !== msg.mode) {
            this.config.showMode = msg.mode;
            saveConfig(this.config);
            if (msg.mode === 'video') {
              this.videoManager.play();
            } else {
              this.videoManager.pause();
            }
            this.broadcastState();
          }
          break;
        case 'VIDEO_LOAD':
          Object.assign(this.config.videoConfig, msg.config);
          saveConfig(this.config);
          if (msg.config.url) {
            this.videoManager.load(msg.config.url, this.config.videoConfig.loop);
            if (this.config.showMode === 'video') {
              this.videoManager.play();
            }
          }
          this.broadcastState();
          break;
        case 'VIDEO_PLAY':
          this.videoManager.play();
          break;
        case 'VIDEO_PAUSE':
          this.videoManager.pause();
          break;
        case 'VIDEO_STOP':
          this.videoManager.stop();
          break;
        case 'VIDEO_SEEK':
          this.videoManager.seek(msg.time);
          break;
        case 'VIDEO_SET_VOLUME':
          this.config.videoConfig.volume = msg.volume;
          this.config.videoConfig.muted = msg.muted;
          this.videoManager.setVolume(msg.volume, msg.muted);
          saveConfig(this.config);
          break;
        case 'VIDEO_SET_LOOP':
          this.config.videoConfig.loop = msg.loop;
          this.videoManager.setLoop(msg.loop);
          saveConfig(this.config);
          break;
        case 'VIDEO_SET_LAYOUT':
          this.config.videoConfig.layout = msg.layout;
          saveConfig(this.config);
          this.broadcastState();
          break;
        case 'VIDEO_SET_FEATHER':
          this.config.videoConfig.edgeFeather = msg.edgeFeather;
          saveConfig(this.config);
          break;
        case 'VIDEO_SET_CROP':
          this.config.videoConfig.crops[msg.slot] = { ...msg.crop };
          saveConfig(this.config);
          break;
      }
    });
  }

  private executeAction(action: string, slotTarget?: PuppetSlot | 'all'): void {
    const targets = slotTarget === 'all'
      ? (['left', 'center', 'right'] as PuppetSlot[])
      : [slotTarget || this.focusedSlot];

    targets.forEach((slot) => {
      const p = this.puppets[slot];
      switch (action) {
        case 'talk':
          this.handleTalkToggle();
          break;
        case 'flame':
          p.triggerFlame();
          halloweenSynth.playFlame();
          break;
        case 'eyeflame':
          p.setEyeFlames(true);
          halloweenSynth.playFlame();
          setTimeout(() => p.setEyeFlames(false), 1200);
          break;
        case 'freeze':
          p.triggerFreeze();
          halloweenSynth.playFreeze();
          break;
        case 'smoke':
          p.interior = 'smoke';
          halloweenSynth.playSmoke();
          setTimeout(() => { p.interior = 'none'; }, 1200);
          break;
        case 'lightning':
          p.triggerLightning();
          halloweenSynth.playLightning();
          break;
        case 'soul':
          p.overlay = 'soul';
          halloweenSynth.playSoul();
          setTimeout(() => { p.overlay = 'none'; }, 1600);
          break;
        case 'scream':
          p.triggerScream();
          halloweenSynth.playScream();
          break;
        case 'sleep':
          p.triggerSleep();
          break;
        case 'wink':
          p.triggerWink();
          break;
        case 'look-left':
          p.setLook('left');
          break;
        case 'look-center':
          p.setLook('center');
          break;
        case 'look-right':
          p.setLook('right');
          break;
        case 'call-response':
          this.handleCallAndResponse();
          break;
        case 'song':
          halloweenSynth.toggleSong((puppet, open) => {
            this.handleSongCue(puppet, open);
          });
          break;
      }
    });
  }

  private broadcastState(): void {
    syncBus.send({
      type: 'SYNC_STATE_RESP',
      focus: this.focusedSlot,
      config: this.config,
      gridOn: this.renderer.gridVisible,
      blackCardOn: this.renderer.blackCardVisible,
      blackoutOn: this.renderer.blackoutActive,
      mappingModeOn: this.renderer.mappingModeVisible,
      activeCorner: this.activeCorner,
      isArmed: this.mic.isArmed
    });
  }

  private loop(now: number): void {
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.mic.isArmed) {
      const level = this.mic.tick();
      (Object.keys(this.puppets) as PuppetSlot[]).forEach((s) => {
        if (s === this.focusedSlot) {
          this.puppets[s].setMouthOpen(level);
        } else {
          this.puppets[s].setMouthOpen(0);
        }
      });
    }

    let videoSources: Partial<Record<PuppetSlot, PuppetVideoSource>> | undefined = undefined;
    if (this.config.showMode === 'video') {
      videoSources = {};
      const layout = this.config.videoConfig.layout;
      const vEl = this.videoManager.getVideoElement();
      const feather = this.config.videoConfig.edgeFeather;

      if (layout === 'tri-split') {
        const slots: PuppetSlot[] = ['left', 'center', 'right'];
        slots.forEach((s) => {
          videoSources![s] = {
            video: vEl,
            crop: this.config.videoConfig.crops[s],
            edgeFeather: feather
          };
        });
      } else if (layout === 'single') {
        // Full video on focused slot
        videoSources[this.focusedSlot] = {
          video: vEl,
          crop: { x: 0, y: 0, w: 1, h: 1 },
          edgeFeather: feather
        };
      }
    }

    this.renderer.render(
      this.puppets,
      this.focusedSlot,
      dt,
      now,
      videoSources,
      this.config.showMode
    );

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new StageApp();
});
