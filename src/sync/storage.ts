export interface CornerOffsets {
  tl: [number, number];
  tr: [number, number];
  bl: [number, number];
  br: [number, number];
}

export type FaceStyle = 'classic' | 'goofy' | 'sly' | 'custom' | 'v2_classic' | 'v2_goofy' | 'v2_sly';

export interface PuppetTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees
  corners: CornerOffsets;
  faceStyle: FaceStyle;
}

export interface MappingProfile {
  id: string;
  name: string;
  transforms: Record<'left' | 'center' | 'right', PuppetTransform>;
}

export type ShowMode = 'procedural' | 'video';
export type VideoLayout = 'tri-split' | 'single' | 'slots';

export interface VideoCrop {
  x: number; // 0.0 to 1.0 (relative X start)
  y: number; // 0.0 to 1.0 (relative Y start)
  w: number; // 0.0 to 1.0 (relative width)
  h: number; // 0.0 to 1.0 (relative height)
}

export interface VideoConfig {
  url: string;
  name: string;
  layout: VideoLayout;
  loop: boolean;
  volume: number; // 0 to 1
  muted: boolean;
  edgeFeather: number; // 0 to 60px soft edge vignette on mapped pumpkins
  crops: Record<'left' | 'center' | 'right', VideoCrop>;
}

export interface AppConfig {
  gate: number;
  smoothness: number;
  castDelayMs: number;
  activeProfileId: string;
  profiles: Record<string, MappingProfile>;
  transforms: Record<'left' | 'center' | 'right', PuppetTransform>;
  showMode: ShowMode;
  videoConfig: VideoConfig;
}

const STORAGE_KEY = 'pumpkin_puppet_config_v3';

export const DEFAULT_CORNERS: CornerOffsets = {
  tl: [0, 0],
  tr: [0, 0],
  bl: [0, 0],
  br: [0, 0]
};

export const DEFAULT_TRANSFORMS: Record<'left' | 'center' | 'right', PuppetTransform> = {
  left: {
    x: -360,
    y: 0,
    scaleX: 0.9,
    scaleY: 0.9,
    rotation: 0,
    corners: { tl: [0, 0], tr: [0, 0], bl: [0, 0], br: [0, 0] },
    faceStyle: 'goofy'
  },
  center: {
    x: 0,
    y: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    rotation: 0,
    corners: { tl: [0, 0], tr: [0, 0], bl: [0, 0], br: [0, 0] },
    faceStyle: 'classic'
  },
  right: {
    x: 360,
    y: 0,
    scaleX: 0.9,
    scaleY: 0.9,
    rotation: 0,
    corners: { tl: [0, 0], tr: [0, 0], bl: [0, 0], br: [0, 0] },
    faceStyle: 'sly'
  }
};

const DEFAULT_PROFILE: MappingProfile = {
  id: 'default',
  name: 'Default 3-Pumpkin Setup',
  transforms: JSON.parse(JSON.stringify(DEFAULT_TRANSFORMS))
};

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  url: '/videos/sample-trio.mp4',
  name: 'sample-trio.mp4 (Built-in 3-Pumpkin Trio)',
  layout: 'tri-split',
  loop: true,
  volume: 0.85,
  muted: false,
  edgeFeather: 16,
  crops: {
    left: { x: 0.0, y: 0.0, w: 0.3333, h: 1.0 },
    center: { x: 0.3333, y: 0.0, w: 0.3334, h: 1.0 },
    right: { x: 0.6667, y: 0.0, w: 0.3333, h: 1.0 }
  }
};

export const DEFAULT_CONFIG: AppConfig = {
  gate: 0.006,
  smoothness: 0.25,
  castDelayMs: 0,
  activeProfileId: 'default',
  profiles: {
    default: DEFAULT_PROFILE
  },
  transforms: JSON.parse(JSON.stringify(DEFAULT_TRANSFORMS)),
  showMode: 'procedural',
  videoConfig: JSON.parse(JSON.stringify(DEFAULT_VIDEO_CONFIG))
};

function normalizeTransform(raw: Partial<PuppetTransform> & { scale?: number }, fallback: PuppetTransform): PuppetTransform {
  return {
    x: typeof raw?.x === 'number' ? raw.x : fallback.x,
    y: typeof raw?.y === 'number' ? raw.y : fallback.y,
    scaleX: typeof raw?.scaleX === 'number' ? raw.scaleX : (typeof raw?.scale === 'number' ? raw.scale : fallback.scaleX),
    scaleY: typeof raw?.scaleY === 'number' ? raw.scaleY : (typeof raw?.scale === 'number' ? raw.scale : fallback.scaleY),
    rotation: typeof raw?.rotation === 'number' ? raw.rotation : fallback.rotation,
    corners: {
      tl: Array.isArray(raw?.corners?.tl) ? [raw.corners.tl[0] || 0, raw.corners.tl[1] || 0] : [0, 0],
      tr: Array.isArray(raw?.corners?.tr) ? [raw.corners.tr[0] || 0, raw.corners.tr[1] || 0] : [0, 0],
      bl: Array.isArray(raw?.corners?.bl) ? [raw.corners.bl[0] || 0, raw.corners.bl[1] || 0] : [0, 0],
      br: Array.isArray(raw?.corners?.br) ? [raw.corners.br[0] || 0, raw.corners.br[1] || 0] : [0, 0]
    },
    faceStyle: (raw?.faceStyle === 'classic' || raw?.faceStyle === 'goofy' || raw?.faceStyle === 'sly' || raw?.faceStyle === 'custom' || raw?.faceStyle === 'v2_classic' || raw?.faceStyle === 'v2_goofy' || raw?.faceStyle === 'v2_sly')
      ? raw.faceStyle
      : fallback.faceStyle
  };
}

function normalizeVideoConfig(raw?: Partial<VideoConfig>): VideoConfig {
  const d = DEFAULT_VIDEO_CONFIG;
  if (!raw) return JSON.parse(JSON.stringify(d));
  return {
    url: typeof raw.url === 'string' && raw.url ? raw.url : d.url,
    name: typeof raw.name === 'string' ? raw.name : d.name,
    layout: (raw.layout === 'tri-split' || raw.layout === 'single' || raw.layout === 'slots') ? raw.layout : d.layout,
    loop: typeof raw.loop === 'boolean' ? raw.loop : d.loop,
    volume: typeof raw.volume === 'number' ? Math.max(0, Math.min(1, raw.volume)) : d.volume,
    muted: typeof raw.muted === 'boolean' ? raw.muted : d.muted,
    edgeFeather: typeof raw.edgeFeather === 'number' ? Math.max(0, Math.min(60, raw.edgeFeather)) : d.edgeFeather,
    crops: {
      left: {
        x: typeof raw.crops?.left?.x === 'number' ? raw.crops.left.x : d.crops.left.x,
        y: typeof raw.crops?.left?.y === 'number' ? raw.crops.left.y : d.crops.left.y,
        w: typeof raw.crops?.left?.w === 'number' ? raw.crops.left.w : d.crops.left.w,
        h: typeof raw.crops?.left?.h === 'number' ? raw.crops.left.h : d.crops.left.h
      },
      center: {
        x: typeof raw.crops?.center?.x === 'number' ? raw.crops.center.x : d.crops.center.x,
        y: typeof raw.crops?.center?.y === 'number' ? raw.crops.center.y : d.crops.center.y,
        w: typeof raw.crops?.center?.w === 'number' ? raw.crops.center.w : d.crops.center.w,
        h: typeof raw.crops?.center?.h === 'number' ? raw.crops.center.h : d.crops.center.h
      },
      right: {
        x: typeof raw.crops?.right?.x === 'number' ? raw.crops.right.x : d.crops.right.x,
        y: typeof raw.crops?.right?.y === 'number' ? raw.crops.right.y : d.crops.right.y,
        w: typeof raw.crops?.right?.w === 'number' ? raw.crops.right.w : d.crops.right.w,
        h: typeof raw.crops?.right?.h === 'number' ? raw.crops.right.h : d.crops.right.h
      }
    }
  };
}

export function loadConfig(): AppConfig {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check v2
      const v2Raw = localStorage.getItem('pumpkin_puppet_config_v2') || localStorage.getItem('pumpkin_puppet_config_v1');
      if (v2Raw) {
        const parsedV2 = JSON.parse(v2Raw);
        const migrated: AppConfig = {
          gate: parsedV2.gate ?? DEFAULT_CONFIG.gate,
          smoothness: parsedV2.smoothness ?? DEFAULT_CONFIG.smoothness,
          castDelayMs: parsedV2.castDelayMs ?? DEFAULT_CONFIG.castDelayMs,
          activeProfileId: parsedV2.activeProfileId || 'default',
          profiles: parsedV2.profiles || { default: DEFAULT_PROFILE },
          transforms: {
            left: normalizeTransform(parsedV2.transforms?.left, DEFAULT_TRANSFORMS.left),
            center: normalizeTransform(parsedV2.transforms?.center, DEFAULT_TRANSFORMS.center),
            right: normalizeTransform(parsedV2.transforms?.right, DEFAULT_TRANSFORMS.right)
          },
          showMode: 'procedural',
          videoConfig: JSON.parse(JSON.stringify(DEFAULT_VIDEO_CONFIG))
        };
        saveConfig(migrated);
        return migrated;
      }
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    const parsed = JSON.parse(raw);
    const profiles = parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : { default: DEFAULT_PROFILE };
    const activeProfileId = parsed.activeProfileId && profiles[parsed.activeProfileId] ? parsed.activeProfileId : 'default';

    return {
      gate: typeof parsed.gate === 'number' ? parsed.gate : DEFAULT_CONFIG.gate,
      smoothness: typeof parsed.smoothness === 'number' ? parsed.smoothness : DEFAULT_CONFIG.smoothness,
      castDelayMs: typeof parsed.castDelayMs === 'number' ? parsed.castDelayMs : DEFAULT_CONFIG.castDelayMs,
      activeProfileId,
      profiles,
      transforms: {
        left: normalizeTransform(parsed.transforms?.left, DEFAULT_TRANSFORMS.left),
        center: normalizeTransform(parsed.transforms?.center, DEFAULT_TRANSFORMS.center),
        right: normalizeTransform(parsed.transforms?.right, DEFAULT_TRANSFORMS.right)
      },
      showMode: parsed.showMode === 'video' ? 'video' : 'procedural',
      videoConfig: normalizeVideoConfig(parsed.videoConfig)
    };
  } catch (err) {
    console.warn('Failed to load config, using defaults', err);
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

export function saveConfig(cfg: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.warn('Failed to save config to localStorage', err);
  }
}
