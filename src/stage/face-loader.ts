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

export class FaceLoader {
  private customLayers: FaceLayerImages | null = null;

  public async loadSvgString(svgString: string): Promise<FaceLayerImages> {
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

    this.customLayers = loadedLayers;
    return loadedLayers;
  }

  public getLayers(): FaceLayerImages | null {
    return this.customLayers;
  }

  public clearCustom(): void {
    this.customLayers = null;
  }
}

export const faceLoader = new FaceLoader();
