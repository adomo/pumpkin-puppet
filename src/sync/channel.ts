import { PuppetTransform, AppConfig, CornerOffsets, FaceStyle, ShowMode, VideoConfig, VideoCrop, VideoLayout } from './storage';

export type PuppetSlot = 'left' | 'center' | 'right';
export type CornerKey = 'tl' | 'tr' | 'bl' | 'br';

export type SyncMessage =
  | { type: 'SET_SHOW_MODE'; mode: ShowMode }
  | { type: 'SET_FOCUS'; slot: PuppetSlot }
  | { type: 'SET_FACE_STYLE'; slot: PuppetSlot; style: FaceStyle }
  | { type: 'TRIGGER_ACTION'; action: string; slot?: PuppetSlot | 'all' }
  | { type: 'AUDIO_METER'; rawRms: number; smoothed: number; isArmed: boolean }
  | { type: 'SET_GATE'; gate: number }
  | { type: 'SET_SMOOTHNESS'; smoothness: number }
  | { type: 'SET_DELAY'; castDelayMs: number }
  | { type: 'UPDATE_TRANSFORM'; slot: PuppetSlot; transform: PuppetTransform }
  | { type: 'SET_CORNER'; slot: PuppetSlot; corner: CornerKey; dx: number; dy: number }
  | { type: 'SET_ALL_CORNERS'; slot: PuppetSlot; corners: CornerOffsets }
  | { type: 'RESET_TRANSFORM'; slot: PuppetSlot }
  | { type: 'RESET_KEYSTONE'; slot: PuppetSlot }
  | { type: 'SET_ACTIVE_PROFILE'; profileId: string }
  | { type: 'SAVE_NEW_PROFILE'; name: string }
  | { type: 'DELETE_PROFILE'; profileId: string }
  | { type: 'TOGGLE_MAPPING_MODE'; active?: boolean }
  | { type: 'SET_MAPPING_CORNER_TARGET'; corner: 'none' | CornerKey }
  | { type: 'SET_MONITOR'; enabled: boolean }
  | { type: 'TOGGLE_SONG'; active?: boolean }
  | { type: 'SONG_CUE'; slot: PuppetSlot | 'all'; open: number }
  | {
      type: 'TIMELINE_CUE';
      puppet: PuppetSlot | 'all';
      open?: number;
      hold?: number;
      look?: 'left' | 'center' | 'right';
      eyes?: 'blink' | 'wide' | 'shut' | 'normal';
      action?: string;
      text?: string;
    }
  | {
      type: 'TIMELINE_STATUS';
      isPlaying: boolean;
      currentTime: number;
      duration: number;
      title: string;
      currentText?: string;
    }
  | { type: 'VIDEO_LOAD'; config: Partial<VideoConfig> }
  | { type: 'VIDEO_PLAY' }
  | { type: 'VIDEO_PAUSE' }
  | { type: 'VIDEO_STOP' }
  | { type: 'VIDEO_SEEK'; time: number }
  | { type: 'VIDEO_SET_VOLUME'; volume: number; muted: boolean }
  | { type: 'VIDEO_SET_CROP'; slot: PuppetSlot; crop: VideoCrop }
  | { type: 'VIDEO_SET_LAYOUT'; layout: VideoLayout }
  | { type: 'VIDEO_SET_FEATHER'; edgeFeather: number }
  | { type: 'VIDEO_SET_LOOP'; loop: boolean }
  | {
      type: 'VIDEO_STATUS';
      isPlaying: boolean;
      currentTime: number;
      duration: number;
    }
  | { type: 'TOGGLE_DIAGNOSTIC'; diag: 'grid' | 'black-card' | 'blackout' | 'mapping' }
  | { type: 'LOAD_SVG'; svgContent: string }
  | { type: 'SYNC_STATE_REQ' }
  | { type: 'RTC_OFFER'; sdp: RTCSessionDescriptionInit }
  | { type: 'RTC_ANSWER'; sdp: RTCSessionDescriptionInit }
  | { type: 'RTC_ICE'; candidate: RTCIceCandidateInit; role: 'desk' | 'stage' }
  | { type: 'RTC_REQUEST' }
  | { type: 'SET_VOICE_VOLUME'; volume: number }
  | { type: 'SET_VOICE_TRANSMIT'; enabled: boolean }
  | {
      type: 'SYNC_STATE_RESP';
      focus: PuppetSlot;
      config: AppConfig;
      gridOn: boolean;
      blackCardOn: boolean;
      blackoutOn: boolean;
      mappingModeOn: boolean;
      activeCorner: 'none' | CornerKey;
      isArmed: boolean;
    };

const CHANNEL_NAME = 'pumpkin_puppet_sync_channel';

export class SyncBus {
  private channel: BroadcastChannel;
  private listeners: Array<(msg: SyncMessage) => void> = [];

  constructor() {
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event) => {
      const msg = event.data as SyncMessage;
      this.listeners.forEach((fn) => fn(msg));
    };
  }

  send(msg: SyncMessage): void {
    try {
      this.channel.postMessage(msg);
    } catch (err) {
      console.warn('Failed to postMessage on SyncBus', err);
    }
  }

  on(fn: (msg: SyncMessage) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  close(): void {
    this.channel.close();
  }
}

export const syncBus = new SyncBus();
