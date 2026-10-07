// High-Performance Visual Effects & Particle Engine for Projection Mapping

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'ember' | 'smoke' | 'spark' | 'frost' | 'shockwave';
  color: string;
  rotation?: number;
  vRot?: number;
  wobble?: number;
  wobbleSpeed?: number;
}

export interface LightningBranch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  subBranches?: LightningBranch[];
}

export class EffectsEngine {
  private particles: Particle[] = [];
  private ghostWisp: {
    active: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    time: number;
    life: number;
    trail: Array<{ x: number; y: number; alpha: number; size: number }>;
  } | null = null;

  private shockwaves: Array<{ radius: number; maxRadius: number; alpha: number; lineWidth: number }> = [];

  constructor() {}

  public update(dt: number, isFlaming: boolean, hasSmoke: boolean, isSoul: boolean): void {
    // 1. Fire Embers & Sparks Emitter
    if (isFlaming) {
      // Emit floating embers from mouth cavity (center (0, 75))
      const count = Math.random() < 0.6 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: (Math.random() - 0.5) * 80,
          y: 70 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 45,
          vy: -60 - Math.random() * 80,
          size: 2 + Math.random() * 3.5,
          maxSize: 4,
          alpha: 1.0,
          life: 0,
          maxLife: 1.2 + Math.random() * 1.0,
          type: 'ember',
          color: Math.random() > 0.4 ? '#ff9500' : '#ffea00',
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 4 + Math.random() * 6
        });
      }
    }

    // 2. Smoke Clouds Emitter
    if (hasSmoke) {
      this.particles.push({
        x: (Math.random() - 0.5) * 40,
        y: 65 + (Math.random() - 0.5) * 15,
        vx: (Math.random() - 0.5) * 25,
        vy: -40 - Math.random() * 35,
        size: 14 + Math.random() * 10,
        maxSize: 55 + Math.random() * 25,
        alpha: 0.75,
        life: 0,
        maxLife: 1.8 + Math.random() * 0.8,
        type: 'smoke',
        color: '#8b8b99',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 1.5
      });
    }

    // 3. Ghost / Soul Wisp Emitter & Physics
    if (isSoul && (!this.ghostWisp || !this.ghostWisp.active)) {
      this.ghostWisp = {
        active: true,
        x: 0,
        y: 70,
        vx: 0,
        vy: -75,
        time: 0,
        life: 0,
        trail: []
      };
    }

    if (this.ghostWisp && this.ghostWisp.active) {
      this.ghostWisp.time += dt;
      this.ghostWisp.life += dt;
      this.ghostWisp.x = Math.sin(this.ghostWisp.time * 5.2) * 55;
      this.ghostWisp.y += this.ghostWisp.vy * dt;

      // Add to ribbon trail
      this.ghostWisp.trail.unshift({
        x: this.ghostWisp.x,
        y: this.ghostWisp.y,
        alpha: 1.0,
        size: 26 - Math.min(18, this.ghostWisp.life * 8)
      });
      if (this.ghostWisp.trail.length > 25) {
        this.ghostWisp.trail.pop();
      }

      // Age trail
      for (const pt of this.ghostWisp.trail) {
        pt.alpha = Math.max(0, pt.alpha - dt * 1.3);
      }

      if (this.ghostWisp.life > 1.8) {
        this.ghostWisp.active = false;
        this.ghostWisp = null;
      }
    }

    // 4. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      const progress = p.life / p.maxLife;

      if (p.type === 'ember') {
        p.wobble = (p.wobble || 0) + (p.wobbleSpeed || 5) * dt;
        p.x += (p.vx + Math.sin(p.wobble) * 22) * dt;
        p.y += p.vy * dt;
        p.alpha = 1.0 - Math.pow(progress, 1.8);
        p.size = Math.max(0.5, p.size * (1 - dt * 0.4));
      } else if (p.type === 'smoke') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.size += (p.maxSize - p.size) * (dt * 1.6);
        p.alpha = Math.max(0, (1.0 - progress) * 0.55);
        if (p.rotation !== undefined && p.vRot !== undefined) {
          p.rotation += p.vRot * dt;
        }
      }
    }

    // 5. Update Scream Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += dt * 380;
      const progress = sw.radius / sw.maxRadius;
      sw.alpha = Math.max(0, 1.0 - progress);
      sw.lineWidth = Math.max(1, 12 * (1 - progress));
      if (sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  public triggerScreamShockwave(): void {
    this.shockwaves.push({
      radius: 20,
      maxRadius: 280,
      alpha: 1.0,
      lineWidth: 10
    });
    setTimeout(() => {
      this.shockwaves.push({
        radius: 20,
        maxRadius: 260,
        alpha: 0.85,
        lineWidth: 8
      });
    }, 120);
  }

  // --- 1. RENDER INTERNAL CAVITY EFFECTS (Clipped inside mouth) ---

  public renderCavityFlame(ctx: CanvasRenderingContext2D, open: number, idleTime: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const time = idleTime * 11;
    const brightness = Math.min(1.0, open * 1.4 + 0.4);

    // Dynamic Multi-tier animated flame tongues
    for (let layer = 0; layer < 3; layer++) {
      const tongueCount = 6;
      for (let i = 0; i < tongueCount; i++) {
        const u = i / (tongueCount - 1);
        const baseX = (u - 0.5) * 160;
        const wave = Math.sin(time + i * 1.7 + layer) * 18;
        const flameHeight = 45 + open * 55 + Math.cos(time * 1.3 + i) * 18 + (2 - layer) * 15;
        const flameX = baseX + wave;
        const flameY = 95 - flameHeight;

        const grad = ctx.createRadialGradient(flameX, flameY, 4, flameX, flameY + 15, flameHeight * 0.85);
        if (layer === 0) {
          // Inner core white-hot incandescent plasma
          grad.addColorStop(0, `rgba(255, 255, 230, ${brightness})`);
          grad.addColorStop(0.35, `rgba(255, 220, 80, ${brightness * 0.9})`);
          grad.addColorStop(1, 'rgba(255, 120, 0, 0)');
        } else if (layer === 1) {
          // Mid vibrant amber flame
          grad.addColorStop(0, `rgba(255, 180, 0, ${brightness * 0.85})`);
          grad.addColorStop(0.55, `rgba(255, 80, 0, ${brightness * 0.7})`);
          grad.addColorStop(1, 'rgba(200, 0, 0, 0)');
        } else {
          // Outer crimson roar
          grad.addColorStop(0, `rgba(255, 90, 0, ${brightness * 0.7})`);
          grad.addColorStop(0.65, `rgba(180, 20, 0, ${brightness * 0.5})`);
          grad.addColorStop(1, 'rgba(80, 0, 0, 0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(baseX - 25, 105);
        ctx.quadraticCurveTo(flameX + wave * 0.5, flameY + flameHeight * 0.5, flameX, flameY);
        ctx.quadraticCurveTo(flameX - wave * 0.5, flameY + flameHeight * 0.5, baseX + 25, 105);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  public renderCavityIce(ctx: CanvasRenderingContext2D, open: number, idleTime: number): void {
    ctx.save();
    // Cold cryogenic blue glow
    const grad = ctx.createLinearGradient(0, 40, 0, 120 + open * 40);
    grad.addColorStop(0, 'rgba(20, 120, 255, 0.75)');
    grad.addColorStop(0.5, 'rgba(100, 220, 255, 0.85)');
    grad.addColorStop(1, 'rgba(210, 245, 255, 0.95)');

    ctx.fillStyle = grad;
    ctx.fillRect(-150, 40, 300, 150);

    // Procedural crystalline frost icicles hanging from upper mouth
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const time = idleTime * 2;
    for (let x = -100; x <= 100; x += 18) {
      const len = 22 + Math.sin(x * 12.3 + time) * 12 + ((x % 36 === 0) ? 14 : 0);
      ctx.beginPath();
      ctx.moveTo(x - 5, 52);
      ctx.lineTo(x, 52 + len);
      ctx.lineTo(x + 5, 52);
      ctx.fillStyle = 'rgba(220, 250, 255, 0.9)';
      ctx.fill();
      ctx.stroke();

      // Sparkling frost ping dot
      if ((Math.sin(time * 3 + x) > 0.7)) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, 52 + len + 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // --- 2. RENDER VENTING & PROJECTED UNCLIPPED PARTICLES ---

  public renderVentingParticles(ctx: CanvasRenderingContext2D): void {
    if (this.particles.length === 0 && !this.ghostWisp && this.shockwaves.length === 0) return;

    ctx.save();

    // 1. Render Billowing Smoke Puffs
    for (const p of this.particles) {
      if (p.type === 'smoke') {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.rotation !== undefined) ctx.rotate(p.rotation);

        const grad = ctx.createRadialGradient(0, 0, p.size * 0.15, 0, 0, p.size);
        grad.addColorStop(0, `rgba(180, 175, 195, ${p.alpha * 0.8})`);
        grad.addColorStop(0.5, `rgba(110, 105, 125, ${p.alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(40, 35, 50, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 2. Additive Blending for Embers, Shockwaves, and Ghosts
    ctx.globalCompositeOperation = 'lighter';

    // Embers & Sparks
    for (const p of this.particles) {
      if (p.type === 'ember') {
        ctx.save();
        const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size * 2.8);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, p.color);
        grad.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Scream Acoustic Shockwaves
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 80, 20, ${sw.alpha * 0.9})`;
      ctx.lineWidth = sw.lineWidth;
      ctx.beginPath();
      ctx.ellipse(0, 75, sw.radius * 1.15, sw.radius * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Outer cyan reverberation ring
      ctx.strokeStyle = `rgba(0, 230, 255, ${sw.alpha * 0.5})`;
      ctx.lineWidth = Math.max(1, sw.lineWidth * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 75, (sw.radius - 8) * 1.15, (sw.radius - 8) * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Ghost / Soul Spirit
    if (this.ghostWisp && this.ghostWisp.active) {
      const gw = this.ghostWisp;

      // Draw Ribbon Trail
      for (let i = 0; i < gw.trail.length - 1; i++) {
        const pt = gw.trail[i];
        const next = gw.trail[i + 1];
        ctx.strokeStyle = `rgba(74, 222, 128, ${pt.alpha * 0.6})`;
        ctx.lineWidth = pt.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }

      // Spirit Orb Head
      const headGrad = ctx.createRadialGradient(gw.x, gw.y, 2, gw.x, gw.y, 28);
      headGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      headGrad.addColorStop(0.3, 'rgba(134, 239, 172, 0.9)');
      headGrad.addColorStop(0.7, 'rgba(34, 197, 94, 0.65)');
      headGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(gw.x, gw.y, 28, 0, Math.PI * 2);
      ctx.fill();

      // Ghost Spirit Hollow Eyes & Screaming Mouth
      ctx.fillStyle = '#052e16';
      ctx.beginPath();
      ctx.ellipse(gw.x - 7, gw.y - 4, 3.5, 6, -0.15, 0, Math.PI * 2);
      ctx.ellipse(gw.x + 7, gw.y - 4, 3.5, 6, 0.15, 0, Math.PI * 2);
      ctx.ellipse(gw.x, gw.y + 7, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- 3. RENDER PROCEDURAL BRANCHING LIGHTNING ---

  public renderLightningArcs(
    ctx: CanvasRenderingContext2D,
    leftEye: { x: number; y: number },
    rightEye: { x: number; y: number },
    mouthY: number
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Bolt 1: Jumping directly between the two pupils
    this.drawFractalBolt(ctx, leftEye.x, leftEye.y, rightEye.x, rightEye.y, 4, 22);

    // Bolt 2: Arcing from left eye down to mouth
    if (Math.random() > 0.25) {
      this.drawFractalBolt(ctx, leftEye.x, leftEye.y, -35, mouthY, 3, 18);
    }

    // Bolt 3: Arcing from right eye down to mouth
    if (Math.random() > 0.25) {
      this.drawFractalBolt(ctx, rightEye.x, rightEye.y, 35, mouthY, 3, 18);
    }

    ctx.restore();
  }

  private drawFractalBolt(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    depth: number,
    displacement: number
  ): void {
    const points = this.generateLightningPoints(x1, y1, x2, y2, depth, displacement);

    // Pass 1: Outer Neon Violet/Cyan Corona Glow
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'bevel';
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Pass 2: Electric Cyan Mid Filament
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Pass 3: Blinding Incandescent White Core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Terminal Spark Burst
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x1, y1, 5, 0, Math.PI * 2);
    ctx.arc(x2, y2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private generateLightningPoints(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    depth: number,
    displace: number
  ): Array<{ x: number; y: number }> {
    if (depth <= 0) {
      return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    }

    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displace;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * displace;

    const left = this.generateLightningPoints(x1, y1, midX, midY, depth - 1, displace * 0.55);
    const right = this.generateLightningPoints(midX, midY, x2, y2, depth - 1, displace * 0.55);

    return [...left.slice(0, -1), ...right];
  }
}
