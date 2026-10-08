import { PuppetSlot, CornerKey } from '../sync/channel';
import { PuppetTransform, FaceStyle, VideoCrop, ShowMode } from '../sync/storage';
import { faceLoader, FaceLayerImages, RasterFaceLayers } from './face-loader';
import { EffectsEngine } from './effects';

export type LookDirection = 'left' | 'center' | 'right';
export type InteriorEffect = 'none' | 'flame' | 'ice' | 'smoke' | 'void';
export type OverlayEffect = 'none' | 'eye-flames' | 'frost-crust' | 'lightning' | 'soul';

export interface Point2D {
  x: number;
  y: number;
}

export interface PuppetVideoSource {
  video: HTMLVideoElement;
  crop: VideoCrop;
  edgeFeather: number;
}

export class Puppet {
  public slot: PuppetSlot;
  public transform: PuppetTransform;
  public isFocused: boolean = false;

  // Mouth state (0.0 = closed, 1.0 = wide open)
  public mouth: number = 0;
  public targetMouth: number = 0;
  public isLocked: boolean = false;

  // Eyes state
  public blinkAmount: number = 0;
  public isWide: boolean = false;
  public isAsleep: boolean = false;
  public lookDirection: LookDirection = 'center';
  public winkLeft: boolean = false;
  public winkRight: boolean = false;

  // Effects & states
  public interior: InteriorEffect = 'none';
  public overlay: OverlayEffect = 'none';

  // Timers & animations
  private nextBlinkTime: number = 0;
  private blinkProgress: number = -1;
  private shakeOffset: { x: number; y: number } = { x: 0, y: 0 };
  private screamEndTime: number = 0;
  private freezeProgress: number = 0;
  private thawProgress: number = 0;
  private eyeFlameActive: boolean = false;
  private eyeFlameReleaseTime: number = 0;
  private lightningCount: number = 0;
  private lightningTimer: number = 0;

  // Visual Effects & Particle Engine
  private effects: EffectsEngine = new EffectsEngine();

  // Natural Cartoon Physics & Saccades
  private idleTime: number = Math.random() * 1000;
  private saccadeOffset: { x: number; y: number } = { x: 0, y: 0 };
  private nextSaccadeTime: number = 0;
  private candleFlicker: number = 1.0;

  // Offscreen buffer for perspective keystone mesh warping
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private readonly BUFFER_SIZE = 400;

  constructor(slot: PuppetSlot, transform: PuppetTransform) {
    this.slot = slot;
    this.transform = transform;
    this.scheduleNextBlink();
    this.scheduleNextSaccade();

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.BUFFER_SIZE;
    this.offscreenCanvas.height = this.BUFFER_SIZE;
    const ctx = this.offscreenCanvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to create offscreen 2D context');
    this.offscreenCtx = ctx;
    this.offscreenCtx.imageSmoothingEnabled = false;
  }

  private scheduleNextBlink(): void {
    this.nextBlinkTime = performance.now() + 2200 + Math.random() * 3200;
  }

  private scheduleNextSaccade(): void {
    this.nextSaccadeTime = performance.now() + 1800 + Math.random() * 2800;
  }

  public update(dt: number, now: number): void {
    this.idleTime += dt;

    // Update dynamic particle and visual effects
    this.effects.update(
      dt,
      this.interior === 'flame' || this.eyeFlameActive,
      this.interior === 'smoke',
      this.overlay === 'soul'
    );

    // Organic candle flicker inside pumpkin
    this.candleFlicker =
      1.0 +
      Math.sin(this.idleTime * 13.5) * 0.05 +
      Math.cos(this.idleTime * 21.2) * 0.035 +
      (Math.random() - 0.5) * 0.03;

    // Scream shake
    if (now < this.screamEndTime) {
      const shakeMag = 7;
      this.shakeOffset.x = (Math.random() - 0.5) * 2 * shakeMag;
      this.shakeOffset.y = (Math.random() - 0.5) * 2 * shakeMag;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }

    // Freeze / Thaw transitions
    if (this.isLocked && this.freezeProgress < 1.0) {
      this.freezeProgress = Math.min(1.0, this.freezeProgress + dt / 0.4);
    }
    if (!this.isLocked && this.thawProgress > 0) {
      this.thawProgress = Math.max(0, this.thawProgress - dt / 0.5);
    }

    // Cartoon Eye Saccades (swift subtle pupil darting)
    if (now >= this.nextSaccadeTime) {
      this.saccadeOffset.x = (Math.random() - 0.5) * 8;
      this.saccadeOffset.y = (Math.random() - 0.5) * 5;
      this.scheduleNextSaccade();
    }

    // Sleep mode
    if (this.isAsleep) {
      this.blinkAmount = 1.0;
      this.targetMouth = 0.02;
    } else {
      // Snappy cartoon blinks: 70ms close, 20ms hold, 80ms open
      if (now >= this.nextBlinkTime && this.blinkProgress < 0) {
        this.blinkProgress = 0;
      }

      if (this.blinkProgress >= 0) {
        this.blinkProgress += dt / 0.17;
        if (this.blinkProgress <= 0.45) {
          this.blinkAmount = this.blinkProgress / 0.45;
        } else if (this.blinkProgress <= 0.55) {
          this.blinkAmount = 1.0;
        } else if (this.blinkProgress <= 1.0) {
          this.blinkAmount = 1.0 - (this.blinkProgress - 0.55) / 0.45;
        } else {
          this.blinkAmount = 0;
          this.blinkProgress = -1;
          this.scheduleNextBlink();
        }
      }
    }

    // Lightning double-strobe
    if (this.lightningCount > 0) {
      this.lightningTimer += dt;
      if (this.lightningTimer >= 0.08) {
        this.lightningTimer = 0;
        this.lightningCount--;
      }
    }

    // Eye flame tail
    if (!this.eyeFlameActive && this.eyeFlameReleaseTime > 0) {
      if (now > this.eyeFlameReleaseTime) {
        this.eyeFlameReleaseTime = 0;
        this.overlay = 'none';
      }
    }

    // Snappy speech attack & smooth release
    if (!this.isLocked) {
      let desired = this.targetMouth;
      if (desired < 0.01 && !this.isAsleep) {
        desired = 0.025 + Math.sin(this.idleTime * 1.8) * 0.015;
      }
      // Fast attack for cartoon punch (26), gentle spring release (14)
      const speed = desired > this.mouth ? 26 : 14;
      this.mouth += (desired - this.mouth) * Math.min(1.0, dt * speed);
    }
  }

  public setMouthOpen(val: number): void {
    if (!this.isLocked) {
      this.targetMouth = Math.max(0, Math.min(1.0, val));
    }
  }

  public triggerFlame(): void {
    this.interior = this.interior === 'flame' ? 'none' : 'flame';
  }

  public setEyeFlames(active: boolean): void {
    this.eyeFlameActive = active;
    if (active) {
      this.overlay = 'eye-flames';
      this.interior = 'flame';
      this.isWide = false;
    } else {
      this.eyeFlameReleaseTime = performance.now() + 1200;
    }
  }

  public triggerFreeze(): void {
    if (this.isLocked) {
      this.isLocked = false;
      this.thawProgress = 1.0;
      this.interior = 'none';
      this.overlay = 'none';
    } else {
      this.isLocked = true;
      this.freezeProgress = 0;
      this.interior = 'ice';
      this.overlay = 'frost-crust';
    }
  }

  public triggerScream(): void {
    this.isLocked = false;
    this.thawProgress = 0;
    this.interior = 'none';
    this.overlay = 'none';
    this.mouth = 1.0;
    this.targetMouth = 1.0;
    this.isWide = true;
    this.screamEndTime = performance.now() + 700;
    this.effects.triggerScreamShockwave();
    setTimeout(() => {
      this.isWide = false;
      this.targetMouth = 0;
    }, 700);
  }

  public triggerLightning(): void {
    this.lightningCount = 4;
    this.lightningTimer = 0;
  }

  public triggerSleep(): void {
    this.isAsleep = !this.isAsleep;
  }

  public triggerWink(): void {
    if (this.slot === 'left') {
      this.winkRight = true;
    } else if (this.slot === 'right') {
      this.winkLeft = true;
    } else {
      this.winkLeft = true;
    }
    setTimeout(() => {
      this.winkLeft = false;
      this.winkRight = false;
    }, 450);
  }

  public setLook(dir: LookDirection): void {
    this.lookDirection = dir;
  }

  public setEyes(mode: 'blink' | 'wide' | 'shut' | 'normal'): void {
    if (mode === 'wide') {
      this.isWide = true;
      this.blinkAmount = 0;
    } else if (mode === 'blink') {
      this.blinkProgress = 0;
    } else if (mode === 'shut') {
      this.blinkAmount = 1.0;
      this.isWide = false;
    } else {
      this.isWide = false;
      this.blinkAmount = 0;
    }
  }

  public reset(): void {
    this.mouth = 0;
    this.targetMouth = 0;
    this.isLocked = false;
    this.isWide = false;
    this.isAsleep = false;
    this.blinkAmount = 0;
    this.lookDirection = 'center';
    this.interior = 'none';
    this.overlay = 'none';
    this.eyeFlameActive = false;
    this.eyeFlameReleaseTime = 0;
    this.lightningCount = 0;
    this.winkLeft = false;
    this.winkRight = false;
  }

  public getScreenCorners(stageWidth: number, stageHeight: number): Record<CornerKey, Point2D> {
    const hw = 200 * this.transform.scaleX;
    const hh = 200 * this.transform.scaleY;
    const rad = (this.transform.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const cx = stageWidth / 2 + this.transform.x + this.shakeOffset.x;
    const cy = stageHeight / 2 + this.transform.y + this.shakeOffset.y;

    const c = this.transform.corners;
    const raw: Record<CornerKey, [number, number]> = {
      tl: [-hw + c.tl[0], -hh + c.tl[1]],
      tr: [hw + c.tr[0], -hh + c.tr[1]],
      br: [hw + c.br[0], hh + c.br[1]],
      bl: [-hw + c.bl[0], hh + c.bl[1]]
    };

    const out = {} as Record<CornerKey, Point2D>;
    for (const key of ['tl', 'tr', 'br', 'bl'] as CornerKey[]) {
      const [rx, ry] = raw[key];
      out[key] = {
        x: cx + rx * cos - ry * sin,
        y: cy + rx * sin + ry * cos
      };
    }
    return out;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    stageWidth: number,
    stageHeight: number,
    isMappingMode: boolean = false,
    activeCorner: 'none' | CornerKey = 'none',
    videoSource?: PuppetVideoSource,
    showMode: ShowMode = 'procedural'
  ): void {
    const octx = this.offscreenCtx;
    octx.fillStyle = '#000000';
    octx.fillRect(0, 0, this.BUFFER_SIZE, this.BUFFER_SIZE);

    if (showMode === 'video') {
      if (videoSource && videoSource.video.readyState >= 2) {
        const v = videoSource.video;
        const c = videoSource.crop;
        const vw = v.videoWidth || 1920;
        const vh = v.videoHeight || 1080;
        const sx = Math.max(0, Math.min(vw, c.x * vw));
        const sy = Math.max(0, Math.min(vh, c.y * vh));
        const sw = Math.max(1, Math.min(vw - sx, c.w * vw));
        const sh = Math.max(1, Math.min(vh - sy, c.h * vh));

        octx.drawImage(v, sx, sy, sw, sh, 0, 0, this.BUFFER_SIZE, this.BUFFER_SIZE);

        // Soft radial edge feathering / vignette so video blends seamlessly onto physical pumpkins
        if (videoSource.edgeFeather > 0) {
          octx.save();
          octx.globalCompositeOperation = 'destination-in';
          const cx = this.BUFFER_SIZE / 2;
          const cy = this.BUFFER_SIZE / 2;
          const outerR = this.BUFFER_SIZE / 2;
          const innerR = Math.max(0, outerR - videoSource.edgeFeather * 3.5);

          const grad = octx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
          grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
          grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.7)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          octx.fillStyle = grad;
          octx.fillRect(0, 0, this.BUFFER_SIZE, this.BUFFER_SIZE);
          octx.restore();
        }

        // Allow overlay effects (like flame, soul, scream) on top of video if triggered
        if (this.overlay !== 'none' || this.interior !== 'none') {
          octx.save();
          octx.translate(200, 200);
          this.renderOverlays(octx);
          this.effects.renderVentingParticles(octx);
          octx.restore();
        }
      }
    } else {
      octx.save();
      octx.translate(200, 200);

      const style = this.transform.faceStyle || (this.slot === 'left' ? 'goofy' : this.slot === 'right' ? 'sly' : 'classic');

      const rasterFace = faceLoader.getRasterLayers(this.slot, style);
      if (rasterFace) {
        this.renderRasterFace(octx, rasterFace, style);
      } else {
        const svgLayers = faceLoader.getLayers(this.slot, style);
        if (svgLayers) {
          this.renderCustomSvgLayers(octx, svgLayers);
        } else {
          // Render defined cartoon face layers
          const baseStyle = (style === 'v2_goofy' ? 'goofy' : style === 'v2_sly' ? 'sly' : style === 'v2_classic' ? 'classic' : style) as 'classic' | 'goofy' | 'sly';
          this.renderMouthLayer(octx, baseStyle);
          this.renderEyesLayer(octx, baseStyle);
          this.renderBrowsLayer(octx, baseStyle);
        }
      }
      this.renderOverlays(octx);

      // Venting Particles & Projected Effects (embers, smoke, ectoplasm ghost, scream shockwaves)
      this.effects.renderVentingParticles(octx);

      // Procedural Branching Fractal Lightning Arcs
      if (this.lightningCount > 0) {
        const eyeX = rasterFace ? rasterFace.eyeR.x : ((style === 'goofy' || style === 'v2_goofy') ? 68 : (style === 'sly' || style === 'v2_sly') ? 64 : 66);
        const eyeY = rasterFace ? rasterFace.eyeR.y : -48;
        this.effects.renderLightningArcs(octx, { x: -eyeX, y: eyeY }, { x: eyeX, y: eyeY }, 70);
      }

      octx.restore();
    }

    // Destination keystone warp
    const corners = this.getScreenCorners(stageWidth, stageHeight);
    const { tl, tr, br, bl } = corners;

    this.renderBilinearMesh(ctx, tl, tr, br, bl, this.offscreenCanvas, 8);

    if (isMappingMode && this.isFocused) {
      this.renderMappingOverlay(ctx, corners, activeCorner);
    }
  }

  private renderRasterFace(ctx: CanvasRenderingContext2D, raster: RasterFaceLayers, style: FaceStyle): void {
    const mouthOpen = Math.max(0, Math.min(1.0, this.mouth));
    const candleRelY = raster.candleY - 200; // in centered [-200, 200] coordinates

    // 1. Cavity Floor & Tea Light Candle Outline (authentic origin of internal flame)
    this.effects.renderTeaLightCandle(
      ctx,
      0,
      candleRelY,
      this.candleFlicker,
      mouthOpen,
      this.idleTime
    );

    // 2. Interior Cavity Effects (boundary-breaking fire tongues or creeping frost)
    if (this.interior === 'flame') {
      this.effects.renderCavityFlame(ctx, mouthOpen, this.idleTime);
    } else if (this.interior === 'ice' || this.isLocked || this.thawProgress > 0) {
      this.effects.renderCavityIce(ctx, mouthOpen, this.idleTime);
    }

    // 3. Lower Jaw: Photorealistic curved slice displacement
    if (mouthOpen < 0.005) {
      // Mouth closed: 100% exact photographic seam alignment
      ctx.drawImage(raster.jaw, -200, -200, 400, 400);
    } else {
      const dropMax = mouthOpen * 34;
      const numSlices = 24;
      const lx = raster.lx;
      const rx = raster.rx;
      const sliceW = (rx - lx) / numSlices;

      // Draw jaw parts outside [lx, rx] normally
      if (lx > 0) {
        ctx.drawImage(raster.jaw, 0, 0, lx, 400, -200, -200, lx, 400);
      }
      if (rx < 400) {
        ctx.drawImage(raster.jaw, rx, 0, 400 - rx, 400, rx - 200, -200, 400 - rx, 400);
      }

      // Draw curved slices along lower jaw arc
      for (let i = 0; i < numSlices; i++) {
        const sx = lx + i * sliceW;
        const u = (i + 0.5) / numSlices;
        const weight = Math.sin(Math.PI * u);
        const dyOffset = dropMax * weight;
        ctx.drawImage(raster.jaw, sx, 0, sliceW, 400, sx - 200, dyOffset - 200, sliceW, 400);
      }
    }

    // 4. Upper Head (eyes, nose, brow, upper teeth, and anchored lip corners)
    ctx.drawImage(raster.head, -200, -200, 400, 400);

    // 5. Interactive Eyelids (Blinking, Winking, Sleep)
    const currentBlink = (this.winkLeft || this.winkRight) ? 1.0 : this.blinkAmount;
    if (currentBlink > 0.05) {
      this.renderPhotoEyelids(ctx, raster, currentBlink);
    }

    // 6. Goofy Eye Pupil Tracking (Darting with speech saccades and look direction)
    if (style === 'v2_goofy') {
      this.renderGoofyPhotoPupils(ctx, raster);
    }
  }

  private renderPhotoEyelids(ctx: CanvasRenderingContext2D, raster: RasterFaceLayers, blink: number): void {
    ctx.save();
    const eyes = [
      { pt: raster.eyeL, isWinking: this.winkLeft },
      { pt: raster.eyeR, isWinking: this.winkRight }
    ];

    for (const eye of eyes) {
      const b = (eye.isWinking || this.isAsleep) ? 1.0 : blink;
      if (b <= 0.05) continue;

      ctx.save();
      ctx.translate(eye.pt.x, eye.pt.y);
      const lidH = 46 * b;

      // Carved eyelid cover
      ctx.fillStyle = '#080100';
      ctx.beginPath();
      ctx.rect(-34, -30, 68, lidH);
      ctx.fill();

      // Glowing carved lip along bottom edge of eyelid
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-32, -30 + lidH);
      ctx.quadraticCurveTo(0, -30 + lidH + 4, 32, -30 + lidH);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  private renderGoofyPhotoPupils(ctx: CanvasRenderingContext2D, raster: RasterFaceLayers): void {
    const pupilBaseX = this.lookDirection === 'left' ? -12 : (this.lookDirection === 'right' ? 12 : 0);
    const pupilX = pupilBaseX + this.saccadeOffset.x;
    const pupilY = this.saccadeOffset.y;
    if (Math.abs(pupilX) > 1 || Math.abs(pupilY) > 1) {
      ctx.save();
      ctx.fillStyle = '#0a0100';
      // Left eye pupil shift
      ctx.beginPath();
      ctx.arc(raster.eyeL.x + 8 + pupilX * 0.4, raster.eyeL.y + pupilY * 0.4, 7, 0, Math.PI * 2);
      ctx.fill();
      // Right eye pupil shift
      ctx.beginPath();
      ctx.arc(raster.eyeR.x - 8 + pupilX * 0.4, raster.eyeR.y + pupilY * 0.4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderCustomSvgLayers(ctx: CanvasRenderingContext2D, layersParam?: FaceLayerImages): void {
    const layers = layersParam || faceLoader.getLayers(this.slot, this.transform.faceStyle);
    if (!layers) return;

    const mouthOpen = Math.max(0, Math.min(1.0, this.mouth));
    const pinch = 1.0 - mouthOpen * 0.12;
    const mouthRaise = this.mouth * 12;
    const isWideRaise = this.isWide ? 15 : 0;
    const totalRaise = mouthRaise + isWideRaise;

    const eyeScale = this.isWide ? 1.25 : 1.0;
    const pupilBaseX =
      this.lookDirection === 'left' ? -16 : this.lookDirection === 'right' ? 16 : 0;
    const pupilX = pupilBaseX + this.saccadeOffset.x;
    const pupilY = this.saccadeOffset.y;

    // 1. Mouth Interior Cavity
    if (layers.mouthInterior) {
      ctx.save();
      ctx.translate(0, 70);
      ctx.scale(pinch, 0.2 + 0.8 * mouthOpen);
      ctx.translate(0, -70);
      ctx.drawImage(layers.mouthInterior, -200, -200, 400, 400);

      if (this.interior === 'flame') {
        this.renderMouthFlame(ctx, mouthOpen);
      } else if (this.interior === 'ice' || this.isLocked || this.thawProgress > 0) {
        this.renderMouthIce(ctx, mouthOpen);
      }
      ctx.restore();
    }

    // 2. Teeth
    if (layers.teeth) {
      ctx.save();
      ctx.translate(0, 70);
      ctx.scale(pinch, 0.6 + 0.4 * mouthOpen);
      ctx.translate(0, -70);
      ctx.drawImage(layers.teeth, -200, -200, 400, 400);
      ctx.restore();
    }

    // 3. Lips Outer Gouge
    if (layers.lips) {
      ctx.save();
      ctx.translate(0, 70);
      ctx.scale(pinch, 0.7 + 0.3 * mouthOpen);
      ctx.translate(0, -70);
      ctx.drawImage(layers.lips, -200, -200, 400, 400);
      ctx.restore();
    }

    // 4. Eye Sockets
    if (layers.eyeL) {
      ctx.save();
      ctx.translate(-66, -48);
      ctx.scale(eyeScale, eyeScale);
      ctx.translate(66, 48);
      ctx.drawImage(layers.eyeL, -200, -200, 400, 400);
      ctx.restore();
    }
    if (layers.eyeR) {
      ctx.save();
      ctx.translate(66, -48);
      ctx.scale(eyeScale, eyeScale);
      ctx.translate(-66, 48);
      ctx.drawImage(layers.eyeR, -200, -200, 400, 400);
      ctx.restore();
    }

    // 5. Pupils with Saccades & Look Direction
    if (layers.pupilL) {
      ctx.save();
      ctx.translate(pupilX, pupilY);
      ctx.drawImage(layers.pupilL, -200, -200, 400, 400);
      ctx.restore();
    }
    if (layers.pupilR) {
      ctx.save();
      ctx.translate(pupilX, pupilY);
      ctx.drawImage(layers.pupilR, -200, -200, 400, 400);
      ctx.restore();
    }

    // 6. Eyelids (Blink / Wink)
    const currentBlink = (this.winkLeft || this.winkRight) ? 1.0 : this.blinkAmount;
    if (currentBlink > 0.05) {
      if (layers.lidL) {
        ctx.save();
        ctx.globalAlpha = currentBlink;
        ctx.drawImage(layers.lidL, -200, -200, 400, 400);
        ctx.restore();
      }
      if (layers.lidR) {
        ctx.save();
        ctx.globalAlpha = currentBlink;
        ctx.drawImage(layers.lidR, -200, -200, 400, 400);
        ctx.restore();
      }
    }

    // 7. Eyebrows
    if (layers.browL) {
      ctx.save();
      ctx.translate(0, -totalRaise);
      ctx.drawImage(layers.browL, -200, -200, 400, 400);
      ctx.restore();
    }
    if (layers.browR) {
      ctx.save();
      ctx.translate(0, -totalRaise);
      ctx.drawImage(layers.browR, -200, -200, 400, 400);
      ctx.restore();
    }
  }

  // --- Cartoon Eye Rendering ---

  private renderEyesLayer(ctx: CanvasRenderingContext2D, style: FaceStyle): void {
    const eyeScale = this.isWide ? 1.25 : 1.0;
    const pupilBaseX =
      this.lookDirection === 'left' ? -16 : this.lookDirection === 'right' ? 16 : 0;
    const pupilX = pupilBaseX + this.saccadeOffset.x;
    const pupilY = this.saccadeOffset.y;

    // Eye Spacing
    const eyeX = style === 'goofy' ? 68 : style === 'sly' ? 64 : 66;
    const eyeY = -48;

    // Left Eye
    this.renderSingleEye(ctx, -eyeX, eyeY, eyeScale, pupilX, pupilY, this.winkLeft, false, style);
    // Right Eye
    this.renderSingleEye(ctx, eyeX, eyeY, eyeScale, pupilX, pupilY, this.winkRight, true, style);
  }

  private renderSingleEye(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    pupilX: number,
    pupilY: number,
    isWinking: boolean,
    isRightEye: boolean,
    style: FaceStyle
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    const flicker = this.candleFlicker;

    // 1. Trace Eye Socket Shape
    ctx.beginPath();
    if (style === 'goofy') {
      // Big friendly rounded cartoon eyes (slightly asymmetrical)
      const flip = isRightEye ? -1 : 1;
      const eyeScaleY = isRightEye ? 0.92 : 1.06;
      ctx.moveTo(-34 * flip, 18 * eyeScaleY);
      ctx.bezierCurveTo(-40 * flip, -18 * eyeScaleY, -16 * flip, -48 * eyeScaleY, 18 * flip, -44 * eyeScaleY);
      ctx.bezierCurveTo(42 * flip, -40 * eyeScaleY, 44 * flip, 0, 28 * flip, 24 * eyeScaleY);
      ctx.bezierCurveTo(0, 30 * eyeScaleY, -22 * flip, 26 * eyeScaleY, -34 * flip, 18 * eyeScaleY);
    } else if (style === 'sly') {
      // Scary demon jack eyes: angular sharp wedge cutouts tilted inward with fierce intensity
      const flip = isRightEye ? -1 : 1;
      ctx.moveTo(-44 * flip, 14);
      ctx.lineTo(-14 * flip, -42);
      ctx.lineTo(42 * flip, -12);
      ctx.lineTo(26 * flip, 22);
      ctx.lineTo(-12 * flip, 10);
    } else {
      // Classic Cartoon Jack: Arched top with carved bottom notch
      const flip = isRightEye ? -1 : 1;
      ctx.moveTo(-38 * flip, 18);
      ctx.bezierCurveTo(-36 * flip, -34, 10 * flip, -45, 36 * flip, -20);
      ctx.lineTo(38 * flip, 18);
      ctx.quadraticCurveTo(0, 10, -38 * flip, 18);
    }
    ctx.closePath();

    // 2. Carved Pumpkin Rind Depth (Dark orange gouge border)
    ctx.strokeStyle = '#b82e00';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 3. Glowing Inner Carved Highlight Rim
    ctx.strokeStyle = '#ff7500';
    ctx.lineWidth = 5;
    ctx.stroke();

    // 4. Inner Candle Lantern Glow (Radial Gradient)
    const isFlash = this.lightningCount % 2 === 1;
    if (isFlash) {
      ctx.fillStyle = '#ffffff';
    } else {
      const grad = ctx.createRadialGradient(0, -6, 2, 0, -6, 42);
      grad.addColorStop(0, `rgba(255, 245, 120, ${Math.min(1, flicker)})`);
      grad.addColorStop(0.65, `rgba(255, 160, 0, ${Math.min(1, flicker * 0.95)})`);
      grad.addColorStop(1, 'rgba(210, 80, 0, 0.9)');
      ctx.fillStyle = grad;
    }
    ctx.fill();

    // 5. Cartoon Pupil with Fiery Core & Specular Reflection Dot
    ctx.save();
    // Clip pupil to eye socket
    ctx.clip();

    const pX = Math.max(-20, Math.min(20, pupilX));
    const pY = Math.max(-18, Math.min(16, pupilY));

    if (style === 'sly') {
      // Sinister demonic glowing red iris & vertical slit pupil
      ctx.fillStyle = isFlash ? '#ffffff' : '#991b1b';
      ctx.beginPath();
      ctx.arc(pX, pY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isFlash ? '#ffffff' : '#ea580c';
      ctx.beginPath();
      ctx.arc(pX, pY, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Sharp vertical black slit
      ctx.fillStyle = isFlash ? '#ffffff' : '#000000';
      ctx.beginPath();
      ctx.ellipse(pX, pY, 2.6, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!isFlash) {
        // Piercing white pin-point glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pX + 3, pY - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Outer pupil shadow/core
      ctx.fillStyle = isFlash ? '#ffffff' : '#d12400';
      ctx.beginPath();
      ctx.arc(pX, pY, 11, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright pupil core
      ctx.fillStyle = isFlash ? '#ffffff' : '#ff4800';
      ctx.beginPath();
      ctx.arc(pX, pY, 7, 0, Math.PI * 2);
      ctx.fill();

      // Specular Highlight Glint (Makes eyes look alive & glossy)
      if (!isFlash) {
        ctx.fillStyle = '#ffffff';
        const glintR = style === 'goofy' ? 4.2 : 3;
        ctx.beginPath();
        ctx.arc(pX + 3.5, pY - 3.5, glintR, 0, Math.PI * 2);
        ctx.fill();

        // Second tiny micro-glint for extra cartoon sparkle
        ctx.beginPath();
        ctx.arc(pX - 2.5, pY + 3.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // Exit clip

    // 6. Cartoon Eyelid (Blink / Wink)
    const currentBlink = isWinking ? 1.0 : this.blinkAmount;
    if (currentBlink > 0.05) {
      ctx.save();
      ctx.fillStyle = '#000000';
      const lidY = -48 + currentBlink * 78;

      ctx.beginPath();
      ctx.rect(-50, -50, 100, lidY - (-50));
      ctx.fill();

      // Curved carved eyelid rim in black
      ctx.strokeStyle = '#ff7500';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-45, lidY);
      ctx.quadraticCurveTo(0, lidY + 6, 45, lidY);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  // --- Cartoon Eyebrow Rendering ---

  private renderBrowsLayer(ctx: CanvasRenderingContext2D, style: FaceStyle): void {
    // Secondary motion: brows raise when mouth opens or screams
    const mouthRaise = this.mouth * 12;
    const isWideRaise = this.isWide ? 15 : 0;
    const totalRaise = mouthRaise + isWideRaise;

    const browX = style === 'goofy' ? 68 : style === 'sly' ? 64 : 66;
    const browY = -88 - totalRaise;

    // Left Brow
    this.renderSingleBrow(ctx, -browX, browY, false, style);
    // Right Brow
    this.renderSingleBrow(ctx, browX, browY, true, style);
  }

  private renderSingleBrow(
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    isRight: boolean,
    style: FaceStyle
  ): void {
    ctx.save();
    ctx.translate(bx, by);

    const flip = isRight ? -1 : 1;

    ctx.beginPath();
    if (style === 'goofy') {
      // Big floppy bouncy curved cartoon brows that bob with dialogue
      ctx.moveTo(-38 * flip, 16);
      ctx.quadraticCurveTo(-10 * flip, -24, 34 * flip, -6);
      ctx.quadraticCurveTo(-10 * flip, -14, -38 * flip, 16);
    } else if (style === 'sly') {
      // Steeply angled menacing V-wedge demon brow plunging down
      ctx.moveTo(-44 * flip, -18);
      ctx.lineTo(36 * flip, 18);
      ctx.lineTo(26 * flip, 26);
      ctx.lineTo(-38 * flip, -4);
    } else {
      // Classic Expressive wedge brow
      ctx.moveTo(-42 * flip, 12);
      ctx.lineTo(32 * flip, -8);
      ctx.lineTo(26 * flip, -16);
      ctx.lineTo(-38 * flip, 2);
    }
    ctx.closePath();

    // Carved Rind Rim
    ctx.strokeStyle = '#b82e00';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Glowing Amber Fill
    ctx.fillStyle = '#ff8800';
    ctx.fill();

    ctx.restore();
  }

  // --- Cartoon Mouth & Teeth Rendering ---

  private renderMouthLayer(ctx: CanvasRenderingContext2D, style: FaceStyle): void {
    const mouthOpen = Math.max(0, Math.min(1.0, this.mouth));
    const jawDrop = mouthOpen * 60;
    // Volume conservation: mouth width narrows slightly as jaw drops wide
    const pinch = 1.0 - mouthOpen * 0.12;

    const flicker = this.candleFlicker;

    ctx.save();

    // 1. Define Outer Mouth Path (Upper & Lower Lips)
    ctx.beginPath();
    if (style === 'goofy') {
      // DOPEY SMILE: big, wide, happy, lovable lopsided dopey grin with chubby cheeks
      ctx.moveTo(-128 * pinch, 48);
      ctx.quadraticCurveTo(-110 * pinch, 28, -85 * pinch, 55);
      ctx.quadraticCurveTo(0, 68, 85 * pinch, 55);
      ctx.quadraticCurveTo(112 * pinch, 30, 128 * pinch, 48);
      ctx.bezierCurveTo(138 * pinch, 72 + jawDrop * 0.4, 78 * pinch, 116 + jawDrop, 0, 118 + jawDrop);
      ctx.bezierCurveTo(-78 * pinch, 116 + jawDrop, -138 * pinch, 72 + jawDrop * 0.4, -128 * pinch, 48);
    } else if (style === 'sly') {
      // SCARY FACE: MASSIVE SINISTER JACK-O'-LANTERN GRIN WITH CHEEK BARBS!
      ctx.moveTo(-142 * pinch, 28);
      ctx.quadraticCurveTo(-75 * pinch, 64, 0, 66);
      ctx.quadraticCurveTo(75 * pinch, 64, 142 * pinch, 28);
      ctx.lineTo(146 * pinch, 42);
      ctx.bezierCurveTo(105 * pinch, 96 + jawDrop, 60 * pinch, 122 + jawDrop, 0, 124 + jawDrop);
      ctx.bezierCurveTo(-60 * pinch, 122 + jawDrop, -105 * pinch, 96 + jawDrop, -146 * pinch, 42);
      ctx.closePath();
    } else {
      // Classic Curved Jack-o'-Lantern Grin
      ctx.moveTo(-120 * pinch, 58);
      ctx.quadraticCurveTo(0, 74, 120 * pinch, 58);
      ctx.quadraticCurveTo(130 * pinch, 68 + jawDrop * 0.4, 115 * pinch, 80 + jawDrop * 0.6);
      ctx.quadraticCurveTo(0, 105 + jawDrop, -115 * pinch, 80 + jawDrop * 0.6);
      ctx.quadraticCurveTo(-130 * pinch, 68 + jawDrop * 0.4, -120 * pinch, 58);
    }
    ctx.closePath();

    // 2. Carved Pumpkin Rind Depth (Wide dark orange carved gouge)
    ctx.strokeStyle = style === 'sly' ? '#600d00' : '#b82e00';
    ctx.lineWidth = style === 'sly' ? 16 : 14;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 3. Glowing Inner Carved Lip Highlight
    ctx.strokeStyle = '#ff7500';
    ctx.lineWidth = 6;
    ctx.stroke();

    // 4. Mouth Cavity Base & Effects (CLIPPED to mouth)
    ctx.save();
    ctx.clip();

    // Pure dark ember chamber
    ctx.fillStyle = '#140200';
    ctx.fillRect(-170, 30, 340, 180);

    // Warm Candle Glow Gradient inside mouth
    const grad = ctx.createRadialGradient(0, 75 + jawDrop * 0.5, 4, 0, 75 + jawDrop * 0.5, 110);
    grad.addColorStop(0, `rgba(255, 230, 90, ${Math.min(1, flicker * 0.9)})`);
    grad.addColorStop(0.5, `rgba(255, 90, 0, ${Math.min(1, flicker * 0.75)})`);
    grad.addColorStop(1, 'rgba(40, 0, 0, 0)');
    // Tea Light Candle Outline (origin of flame)
    this.effects.renderTeaLightCandle(ctx, 0, 100 + jawDrop * 0.35, flicker, mouthOpen, this.idleTime);

    // Interior Effects (Flame / Ice)
    if (this.interior === 'flame') {
      this.renderMouthFlame(ctx, mouthOpen);
    } else if (this.interior === 'ice' || this.isLocked || this.thawProgress > 0) {
      this.renderMouthIce(ctx, mouthOpen);
    }

    // 5. Stylized Cartoon Teeth
    this.renderTeeth(ctx, style, jawDrop, pinch);

    ctx.restore(); // Exit mouth clip

    ctx.restore();
  }

  private renderTeeth(
    ctx: CanvasRenderingContext2D,
    style: FaceStyle,
    jawDrop: number,
    pinch: number
  ): void {
    ctx.save();

    if (style === 'goofy') {
      // DOPEY TEETH: Two iconic prominent buck teeth in front, slightly askew, with missing gap and little bottom peg teeth
      ctx.fillStyle = '#fffdf0';
      ctx.strokeStyle = '#8a1f00';
      ctx.lineWidth = 3.5;

      // Left Buck Tooth (slightly askew inwards)
      ctx.save();
      ctx.translate(-14 * pinch, 64);
      ctx.rotate(0.04);
      ctx.beginPath();
      ctx.roundRect(-14 * pinch, 0, 25 * pinch, 34, [2, 2, 7, 7]);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Right Buck Tooth (slightly askew inwards)
      ctx.save();
      ctx.translate(14 * pinch, 64);
      ctx.rotate(-0.04);
      ctx.beginPath();
      ctx.roundRect(-11 * pinch, 0, 25 * pinch, 34, [2, 2, 7, 7]);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Little comical peg teeth on lower jaw (drops with jawDrop)
      ctx.beginPath();
      ctx.roundRect(-45 * pinch, 88 + jawDrop, 18 * pinch, 22, 4);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(30 * pinch, 88 + jawDrop, 20 * pinch, 24, 4);
      ctx.fill();
      ctx.stroke();
    } else if (style === 'sly') {
      // SCARY FACE: FULL MOUTHFUL OF 11 VICIOUS INTERLOCKING RAZOR FANGS!
      const fangGrad = ctx.createLinearGradient(0, 50, 0, 120);
      fangGrad.addColorStop(0, '#fffdf0');
      fangGrad.addColorStop(0.65, '#fff2a8');
      fangGrad.addColorStop(1, '#eab308');

      ctx.fillStyle = fangGrad;
      ctx.strokeStyle = '#600d00';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'miter';

      // --- TOP ROW: 6 SHARP FANGS OF ALTERNATING LENGTHS ---
      // Fang 1: Far Left Needle Fang
      ctx.beginPath();
      ctx.moveTo(-120 * pinch, 48); ctx.lineTo(-105 * pinch, 76); ctx.lineTo(-92 * pinch, 55);
      ctx.fill(); ctx.stroke();

      // Fang 2: Mid Left Piercing Fang
      ctx.beginPath();
      ctx.moveTo(-90 * pinch, 56); ctx.lineTo(-76 * pinch, 88); ctx.lineTo(-62 * pinch, 61);
      ctx.fill(); ctx.stroke();

      // Fang 3: Primary Left Vampire Dagger (Longest)
      ctx.beginPath();
      ctx.moveTo(-60 * pinch, 62); ctx.lineTo(-44 * pinch, 102); ctx.lineTo(-28 * pinch, 65);
      ctx.fill(); ctx.stroke();

      // Fang 4: Primary Right Vampire Dagger (Longest)
      ctx.beginPath();
      ctx.moveTo(28 * pinch, 65); ctx.lineTo(44 * pinch, 102); ctx.lineTo(60 * pinch, 62);
      ctx.fill(); ctx.stroke();

      // Fang 5: Mid Right Piercing Fang
      ctx.beginPath();
      ctx.moveTo(62 * pinch, 61); ctx.lineTo(76 * pinch, 88); ctx.lineTo(90 * pinch, 56);
      ctx.fill(); ctx.stroke();

      // Fang 6: Far Right Needle Fang
      ctx.beginPath();
      ctx.moveTo(92 * pinch, 55); ctx.lineTo(105 * pinch, 76); ctx.lineTo(120 * pinch, 48);
      ctx.fill(); ctx.stroke();

      // --- BOTTOM ROW: 5 INTERLOCKING RAZOR FANGS (move with jawDrop) ---
      // Fang B1: Far Left Bottom Fang
      ctx.beginPath();
      ctx.moveTo(-102 * pinch, 104 + jawDrop);
      ctx.lineTo(-88 * pinch, 76 + jawDrop * 0.65);
      ctx.lineTo(-74 * pinch, 108 + jawDrop);
      ctx.fill(); ctx.stroke();

      // Fang B2: Center-Left Bottom Fang
      ctx.beginPath();
      ctx.moveTo(-72 * pinch, 110 + jawDrop);
      ctx.lineTo(-58 * pinch, 74 + jawDrop * 0.65);
      ctx.lineTo(-44 * pinch, 112 + jawDrop);
      ctx.fill(); ctx.stroke();

      // Fang B3: Center Razor Fang (Pierces upward between main upper daggers)
      ctx.beginPath();
      ctx.moveTo(-20 * pinch, 116 + jawDrop);
      ctx.lineTo(0, 68 + jawDrop * 0.6);
      ctx.lineTo(20 * pinch, 116 + jawDrop);
      ctx.fill(); ctx.stroke();

      // Fang B4: Center-Right Bottom Fang
      ctx.beginPath();
      ctx.moveTo(44 * pinch, 112 + jawDrop);
      ctx.lineTo(58 * pinch, 74 + jawDrop * 0.65);
      ctx.lineTo(72 * pinch, 110 + jawDrop);
      ctx.fill(); ctx.stroke();

      // Fang B5: Far Right Bottom Fang
      ctx.beginPath();
      ctx.moveTo(74 * pinch, 108 + jawDrop);
      ctx.lineTo(88 * pinch, 76 + jawDrop * 0.65);
      ctx.lineTo(102 * pinch, 104 + jawDrop);
      ctx.fill(); ctx.stroke();
    } else {
      // Classic Cartoon Jack Teeth
      ctx.fillStyle = '#fff0a3';
      ctx.strokeStyle = '#992200';
      ctx.lineWidth = 3;

      // Top Left Tooth
      ctx.beginPath();
      ctx.roundRect(-55 * pinch, 60, 24 * pinch, 22, 3);
      ctx.fill();
      ctx.stroke();

      // Top Right Tooth
      ctx.beginPath();
      ctx.roundRect(30 * pinch, 60, 24 * pinch, 22, 3);
      ctx.fill();
      ctx.stroke();

      // Bottom Center Tooth
      ctx.beginPath();
      ctx.roundRect(-14 * pinch, 82 + jawDrop, 26 * pinch, 22, 3);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- Effects ---

  private renderMouthFlame(ctx: CanvasRenderingContext2D, open: number): void {
    this.effects.renderCavityFlame(ctx, open, this.idleTime);
  }

  private renderMouthIce(ctx: CanvasRenderingContext2D, open: number): void {
    this.effects.renderCavityIce(ctx, open, this.idleTime);
  }

  private renderOverlays(ctx: CanvasRenderingContext2D): void {
    if (this.overlay === 'eye-flames') {
      const style = this.transform.faceStyle || 'classic';
      const rasterFace = faceLoader.getRasterLayers(this.slot, style);
      const eyeX = rasterFace ? rasterFace.eyeR.x : (style === 'goofy' ? 68 : style === 'sly' ? 64 : 66);
      const eyeY = rasterFace ? rasterFace.eyeR.y : -48;
      this.effects.renderEyeFlames(ctx, -eyeX, eyeY, this.idleTime);
      this.effects.renderEyeFlames(ctx, eyeX, eyeY, this.idleTime);
    }
  }

  // --- Keystone Bilinear Mesh Warper ---

  private renderBilinearMesh(
    ctx: CanvasRenderingContext2D,
    pTL: Point2D,
    pTR: Point2D,
    pBR: Point2D,
    pBL: Point2D,
    sourceCanvas: HTMLCanvasElement,
    gridSteps: number = 8
  ): void {
    const sw = this.BUFFER_SIZE;
    const sh = this.BUFFER_SIZE;

    const getDestPoint = (u: number, v: number): Point2D => {
      const omu = 1 - u;
      const omv = 1 - v;
      return {
        x: omu * omv * pTL.x + u * omv * pTR.x + u * v * pBR.x + omu * v * pBL.x,
        y: omu * omv * pTL.y + u * omv * pTR.y + u * v * pBR.y + omu * v * pBL.y
      };
    };

    for (let i = 0; i < gridSteps; i++) {
      const u0 = i / gridSteps;
      const u1 = (i + 1) / gridSteps;
      const sx0 = u0 * sw;
      const sx1 = u1 * sw;

      for (let j = 0; j < gridSteps; j++) {
        const v0 = j / gridSteps;
        const v1 = (j + 1) / gridSteps;
        const sy0 = v0 * sh;
        const sy1 = v1 * sh;

        const q00 = getDestPoint(u0, v0);
        const q10 = getDestPoint(u1, v0);
        const q11 = getDestPoint(u1, v1);
        const q01 = getDestPoint(u0, v1);

        this.renderTriangleWarp(
          ctx, sourceCanvas,
          sx0, sy0, sx1, sy0, sx0, sy1,
          q00.x, q00.y, q10.x, q10.y, q01.x, q01.y
        );

        this.renderTriangleWarp(
          ctx, sourceCanvas,
          sx1, sy0, sx1, sy1, sx0, sy1,
          q10.x, q10.y, q11.x, q11.y, q01.x, q01.y
        );
      }
    }
  }

  private renderTriangleWarp(
    ctx: CanvasRenderingContext2D,
    image: HTMLCanvasElement,
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    u0: number, v0: number,
    u1: number, v1: number,
    u2: number, v2: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(u0, v0);
    ctx.lineTo(u1, v1);
    ctx.lineTo(u2, v2);
    ctx.closePath();
    ctx.clip();

    const delta = (x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2);
    if (Math.abs(delta) < 0.0001) {
      ctx.restore();
      return;
    }

    const m11 = ((u0 - u2) * (y1 - y2) - (u1 - u2) * (y0 - y2)) / delta;
    const m12 = ((v0 - v2) * (y1 - y2) - (v1 - v2) * (y0 - y2)) / delta;
    const m21 = ((x0 - x2) * (u1 - u2) - (x1 - x2) * (u0 - u2)) / delta;
    const m22 = ((x0 - x2) * (v1 - v2) - (x1 - x2) * (v0 - v2)) / delta;
    const dx = u0 - m11 * x0 - m21 * y0;
    const dy = v0 - m12 * x0 - m22 * y0;

    ctx.transform(m11, m12, m21, m22, dx, dy);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  }

  private renderMappingOverlay(
    ctx: CanvasRenderingContext2D,
    corners: Record<CornerKey, Point2D>,
    activeCorner: 'none' | CornerKey
  ): void {
    ctx.save();
    const { tl, tr, br, bl } = corners;

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.stroke();

    const cornerKeys: CornerKey[] = ['tl', 'tr', 'br', 'bl'];
    for (const key of cornerKeys) {
      const pt = corners[key];
      const isSelected = activeCorner === key;

      ctx.setLineDash([]);
      ctx.fillStyle = isSelected ? '#ff7518' : '#00ffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSelected ? 3 : 1.5;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isSelected ? 9 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = isSelected ? '#ff7518' : '#ffffff';
      const labelOffset =
        key === 'tl' ? [-26, -10] : key === 'tr' ? [12, -10] : key === 'br' ? [12, 18] : [-26, 18];
      ctx.fillText(key.toUpperCase(), pt.x + labelOffset[0], pt.y + labelOffset[1]);
    }

    ctx.restore();
  }
}
