import { Puppet, PuppetVideoSource } from './puppet';
import { PuppetSlot, CornerKey } from '../sync/channel';
import { ShowMode } from '../sync/storage';

export class StageRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = window.innerWidth;
  private height: number = window.innerHeight;

  public gridVisible: boolean = false;
  public blackCardVisible: boolean = false;
  public blackoutActive: boolean = false;
  public mappingModeVisible: boolean = false;
  public activeCorner: 'none' | CornerKey = 'none';
  private blackoutFrames: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context');
    }
    this.ctx = ctx;

    this.ctx.imageSmoothingEnabled = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);

    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  public triggerBlackout(): void {
    this.blackoutActive = true;
    this.blackoutFrames = 2;
  }

  public toggleGrid(): boolean {
    this.gridVisible = !this.gridVisible;
    return this.gridVisible;
  }

  public toggleBlackCard(): boolean {
    this.blackCardVisible = !this.blackCardVisible;
    return this.blackCardVisible;
  }

  public toggleMappingMode(): boolean {
    this.mappingModeVisible = !this.mappingModeVisible;
    return this.mappingModeVisible;
  }

  public setActiveCorner(corner: 'none' | CornerKey): void {
    this.activeCorner = corner;
  }

  public render(
    puppets: Record<PuppetSlot, Puppet>,
    _focusedSlot: PuppetSlot,
    dt: number,
    now: number,
    videoSources?: Partial<Record<PuppetSlot, PuppetVideoSource>>,
    showMode: ShowMode = 'procedural'
  ): void {
    const ctx = this.ctx;

    // 1. Pure #000000 clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Blackout panic check
    if (this.blackoutActive) {
      this.blackoutFrames--;
      return;
    }

    // 3. Black-level test card (Key: K)
    if (this.blackCardVisible) {
      ctx.fillStyle = '#010101';
      ctx.fillRect(4, 4, 1, 1);
      return;
    }

    // 4. Render the 3 puppets (Left, Center, Right) with keystone warping
    const slots: PuppetSlot[] = ['left', 'center', 'right'];
    for (const slot of slots) {
      const puppet = puppets[slot];
      puppet.update(dt, now);
      puppet.render(
        ctx,
        this.width,
        this.height,
        this.mappingModeVisible,
        this.activeCorner,
        videoSources ? videoSources[slot] : undefined,
        showMode
      );
    }

    // 5. Calibration Grid (Key: H)
    if (this.gridVisible) {
      this.renderCalibrationGrid(ctx);
    }
  }

  private renderCalibrationGrid(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = '#334455';
    ctx.lineWidth = 1;

    const step = 80;
    for (let x = 0; x < this.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Center Stage Crosshair
    const cx = this.width / 2;
    const cy = this.height / 2;
    ctx.strokeStyle = '#ff7518';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy);
    ctx.lineTo(cx + 30, cy);
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(cx, cy + 30);
    ctx.stroke();

    // Alignment Targets for Left, Center, Right pumpkins
    const targets = [
      { name: 'LEFT', x: cx - 360, y: cy },
      { name: 'CENTER', x: cx, y: cy },
      { name: 'RIGHT', x: cx + 360, y: cy }
    ];

    ctx.font = '14px monospace';
    ctx.fillStyle = '#00ffff';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;

    for (const tgt of targets) {
      ctx.beginPath();
      ctx.arc(tgt.x, tgt.y, 140, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tgt.x, tgt.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillText(`PUPPET: ${tgt.name}`, tgt.x - 45, tgt.y - 150);
    }

    ctx.restore();
  }
}
