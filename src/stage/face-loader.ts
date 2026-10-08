import { PuppetSlot } from '../sync/channel';
import { FaceStyle } from '../sync/storage';

export interface FaceLayerImages {
  mouthInterior?: HTMLImageElement;
  teeth?: HTMLImageElement;
  lips?: HTMLImageElement;
  eyeL?: HTMLImageElement;
  eyeR?: HTMLImageElement;
  pupilL?: HTMLImageElement;
  pupilR?: HTMLImageElement;
  lidL?: HTMLImageElement;
  lidR?: HTMLImageElement;
  browL?: HTMLImageElement;
  browR?: HTMLImageElement;
}

export interface RasterFaceLayers {
  head: HTMLImageElement;
  jaw: HTMLImageElement;
  base: HTMLImageElement;
  lx: number;
  rx: number;
  baseSplitY: number;
  candleY: number;
  eyeL: { x: number; y: number };
  eyeR: { x: number; y: number };
}

export class FaceLoader {
  private customLayers: FaceLayerImages | null = null;
  private slotLayers: Partial<Record<PuppetSlot, FaceLayerImages>> = {};
  private v2Presets: Partial<Record<'v2_classic' | 'v2_goofy' | 'v2_sly', FaceLayerImages>> = {};
  private rasterPresets: Partial<Record<'v2_classic' | 'v2_goofy' | 'v2_sly', RasterFaceLayers>> = {};

  constructor() {
    this.preloadV2Presets();
    this.preloadRasterPresets();
  }

  public async preloadRasterPresets(): Promise<void> {
    const list = [
      { key: 'v2_classic' as const, name: 'classic', lx: 70, rx: 330, baseSplitY: 226, candleY: 265, eyeL: { x: -66, y: -48 }, eyeR: { x: 66, y: -48 } },
      { key: 'v2_goofy' as const, name: 'goofy', lx: 90, rx: 310, baseSplitY: 210, candleY: 255, eyeL: { x: -68, y: -48 }, eyeR: { x: 68, y: -48 } },
      { key: 'v2_sly' as const, name: 'sly', lx: 60, rx: 340, baseSplitY: 238, candleY: 260, eyeL: { x: -64, y: -48 }, eyeR: { x: 64, y: -48 } },
    ];

    for (const item of list) {
      try {
        const [head, jaw, base] = await Promise.all([
          this.loadImage(`/faces/raster/${item.name}_head.png`),
          this.loadImage(`/faces/raster/${item.name}_jaw.png`),
          this.loadImage(`/faces/raster/${item.name}_base_400.png`)
        ]);
        this.rasterPresets[item.key] = {
          head,
          jaw,
          base,
          lx: item.lx,
          rx: item.rx,
          baseSplitY: item.baseSplitY,
          candleY: item.candleY,
          eyeL: item.eyeL,
          eyeR: item.eyeR
        };
      } catch (err) {
        console.warn(`Could not preload raster face ${item.name}:`, err);
      }
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  public async preloadV2Presets(): Promise<void> {
    const presets: Array<{ key: 'v2_classic' | 'v2_goofy' | 'v2_sly'; url: string }> = [
      { key: 'v2_classic', url: '/faces/classic_v2.svg' },
      { key: 'v2_goofy', url: '/faces/goofy_v2.svg' },
      { key: 'v2_sly', url: '/faces/sly_v2.svg' }
    ];

    for (const p of presets) {
      try {
        const resp = await fetch(p.url);
        if (resp.ok) {
          const text = await resp.text();
          const layers = await this.parseSvgToLayers(text);
          this.v2Presets[p.key] = layers;
        }
      } catch (err) {
        console.warn(`Could not preload ${p.key}:`, err);
      }
    }
  }

  public async loadSvgString(svgString: string, slot?: PuppetSlot): Promise<FaceLayerImages> {
    const layers = await this.parseSvgToLayers(svgString);
    if (slot) {
      this.slotLayers[slot] = layers;
    }
    this.customLayers = layers;
    return layers;
  }

  public async parseSvgToLayers(svgString: string): Promise<FaceLayerImages> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) {
      throw new Error('Invalid SVG: No <svg> root element found');
    }

    const viewBox = svgEl.getAttribute('viewBox') || '0 0 400 400';
    const width = svgEl.getAttribute('width') || '400';
    const height = svgEl.getAttribute('height') || '400';

    const groupNames: Array<keyof FaceLayerImages> = [
      'mouthInterior',
      'teeth',
      'lips',
      'eyeL',
      'eyeR',
      'pupilL',
      'pupilR',
      'lidL',
      'lidR',
      'browL',
      'browR'
    ];

    const idMap: Record<keyof FaceLayerImages, string> = {
      mouthInterior: 'mouth-interior',
      teeth: 'teeth',
      lips: 'lips',
      eyeL: 'eye-l',
      eyeR: 'eye-r',
      pupilL: 'pupil-l',
      pupilR: 'pupil-r',
      lidL: 'lid-l',
      lidR: 'lid-r',
      browL: 'brow-l',
      browR: 'brow-r'
    };

    const loadedLayers: FaceLayerImages = {};

    for (const key of groupNames) {
      const id = idMap[key];
      const el = doc.getElementById(id);
      if (el) {
        const miniSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
            ${el.outerHTML}
          </svg>
        `;
        const blob = new Blob([miniSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        loadedLayers[key] = img;
      }
    }

    return loadedLayers;
  }

  public getLayers(slot?: PuppetSlot, style?: FaceStyle): FaceLayerImages | null {
    if (style === 'v2_classic') return this.v2Presets.v2_classic || null;
    if (style === 'v2_goofy') return this.v2Presets.v2_goofy || null;
    if (style === 'v2_sly') return this.v2Presets.v2_sly || null;

    if (slot && this.slotLayers[slot]) {
      return this.slotLayers[slot]!;
    }
    return this.customLayers;
  }

  public getRasterLayers(slot?: PuppetSlot, style?: FaceStyle): RasterFaceLayers | null {
    const s = style || (slot === 'left' ? 'v2_sly' : slot === 'right' ? 'v2_goofy' : 'v2_classic');
    if (s === 'v2_classic') return this.rasterPresets.v2_classic || null;
    if (s === 'v2_goofy') return this.rasterPresets.v2_goofy || null;
    if (s === 'v2_sly') return this.rasterPresets.v2_sly || null;
    return null;
  }

  public clearCustom(): void {
    this.customLayers = null;
    this.slotLayers = {};
  }
}

export const faceLoader = new FaceLoader();
