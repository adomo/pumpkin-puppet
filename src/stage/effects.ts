// High-Performance Visual Effects & Particle Engine for Projection Mapping
// Features: Boundary-Breaking Volumetric VFX (Flames, Smoke, Frost, Lightning) + Authentic Tea Light Candle Outline

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
    // 1. Boundary-Breaking Fire Embers & Sparks Emitter
    if (isFlaming) {
      // Emit floating buoyant embers that drift high past the stem into the night air
      const count = Math.random() < 0.75 ? 3 : 1;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: (Math.random() - 0.5) * 90,
          y: 65 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 55,
          vy: -90 - Math.random() * 110, // Fast buoyant lift past the pumpkin stem
          size: 2.2 + Math.random() * 4,
          maxSize: 4.5,
          alpha: 1.0,
          life: 0,
          maxLife: 1.5 + Math.random() * 1.2,
          type: 'ember',
          color: Math.random() > 0.35 ? '#ff9500' : (Math.random() > 0.5 ? '#ffea00' : '#ff4500'),
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 4.5 + Math.random() * 7
        });
      }
    }

    // 2. Boundary-Breaking Heavy Cascading Smoke / Fog
    if (hasSmoke) {
      // 2a. Heavy dry-ice fog pouring DOWNWARD over the chin onto the porch / table
      const count = Math.random() < 0.65 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const isFalling = Math.random() < 0.65;
        this.particles.push({
          x: (Math.random() - 0.5) * 50,
          y: isFalling ? 75 + Math.random() * 15 : 60,
          vx: (Math.random() - 0.5) * (isFalling ? 55 : 30),
          vy: isFalling ? 42 + Math.random() * 45 : -35 - Math.random() * 25, // Downward waterfall roll or rising wisp
          size: 15 + Math.random() * 10,
          maxSize: 65 + Math.random() * 30,
          alpha: 0.8,
          life: 0,
          maxLife: 2.0 + Math.random() * 1.0,
          type: 'smoke',
          color: '#8b8b99',
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 1.4
        });
      }
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
        p.alpha = 1.0 - Math.pow(progress, 1.6);
        p.size = Math.max(0.6, p.size * (1 - dt * 0.35));
      } else if (p.type === 'smoke') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Fog rolls horizontally as it spreads out
        p.vx *= (1 + dt * 0.3);
        p.size += (p.maxSize - p.size) * (dt * 1.6);
        p.alpha = Math.max(0, (1.0 - progress) * 0.6);
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

  // --- 1. RENDER AUTHENTIC TEA LIGHT CANDLE OUTLINE & FLAME ORIGIN ---

  public renderTeaLightCandle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    candleFlicker: number,
    open: number,
    idleTime: number
  ): void {
    ctx.save();

    // 1. Warm radial ambient light cast from candle onto cavity floor & walls
    const lightRad = (75 + open * 35) * candleFlicker;
    const lightGrad = ctx.createRadialGradient(cx, cy - 8, 2, cx, cy - 8, lightRad);
    lightGrad.addColorStop(0, `rgba(255, 235, 120, ${Math.min(1.0, 0.95 * candleFlicker)})`);
    lightGrad.addColorStop(0.35, `rgba(255, 140, 20, ${Math.min(1.0, 0.75 * candleFlicker)})`);
    lightGrad.addColorStop(0.7, `rgba(180, 50, 0, ${Math.min(1.0, 0.45 * candleFlicker)})`);
    lightGrad.addColorStop(1, 'rgba(40, 5, 0, 0)');
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, lightRad * 1.3, lightRad * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. The Tea Light Cup Body (thin aluminum/acrylic cylinder)
    const cupW = 36;
    const cupH = 10;
    const rimH = 9;

    // Cup shadow at base
    ctx.fillStyle = 'rgba(10, 2, 0, 0.85)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + cupH + 1, cupW * 0.52, rimH * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cup cylinder body
    const metalGrad = ctx.createLinearGradient(cx - cupW / 2, cy, cx + cupW / 2, cy);
    metalGrad.addColorStop(0, '#52525b');
    metalGrad.addColorStop(0.25, '#a1a1aa');
    metalGrad.addColorStop(0.5, '#e4e4e7');
    metalGrad.addColorStop(0.75, '#71717a');
    metalGrad.addColorStop(1, '#3f3f46');

    ctx.fillStyle = metalGrad;
    ctx.beginPath();
    ctx.rect(cx - cupW / 2, cy, cupW, cupH);
    ctx.fill();

    // Cup bottom rounded base
    ctx.beginPath();
    ctx.ellipse(cx, cy + cupH, cupW / 2, rimH / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#3f3f46';
    ctx.fill();
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Cup top metallic rim ellipse
    ctx.beginPath();
    ctx.ellipse(cx, cy, cupW / 2, rimH / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#27272a';
    ctx.fill();
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Amber rim glow reflection
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cupW / 2 - 0.8, rimH / 2 - 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Translucent Paraffin Wax Pool inside cup
    ctx.beginPath();
    ctx.ellipse(cx, cy, cupW / 2 - 2, rimH / 2 - 1.5, 0, 0, Math.PI * 2);
    const waxGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, cupW / 2 - 2);
    waxGrad.addColorStop(0, '#fef3c7');
    waxGrad.addColorStop(0.65, '#fde68a');
    waxGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = waxGrad;
    ctx.fill();

    // 5. Braided Dark Wick
    const wickH = 6.5;
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - wickH);
    ctx.stroke();

    // Red ember glow at wick tip
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy - wickH, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 6. Dancing Organic Candle Flame Teardrop
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const sway = Math.sin(idleTime * 14.2) * 2.2 + Math.cos(idleTime * 23.5) * 1.2;
    const flameH = (19 + Math.sin(idleTime * 17.8) * 3) * candleFlicker;
    const flameW = 8.5 * (0.9 + candleFlicker * 0.1);
    const wickTipY = cy - wickH;
    const flameTipY = wickTipY - flameH;

    // Translucent blue foot at the base of the flame
    ctx.fillStyle = 'rgba(59, 130, 246, 0.75)';
    ctx.beginPath();
    ctx.ellipse(cx, wickTipY - 1, 4.5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer golden-amber luminous envelope
    const flameGrad = ctx.createRadialGradient(cx + sway * 0.4, wickTipY - flameH * 0.4, 2, cx + sway * 0.2, wickTipY - flameH * 0.45, flameH * 0.85);
    flameGrad.addColorStop(0, 'rgba(255, 255, 220, 1.0)');
    flameGrad.addColorStop(0.3, 'rgba(255, 190, 40, 0.95)');
    flameGrad.addColorStop(0.7, 'rgba(245, 100, 10, 0.75)');
    flameGrad.addColorStop(1, 'rgba(200, 30, 0, 0)');

    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(cx - flameW, wickTipY);
    ctx.bezierCurveTo(cx - flameW * 1.1, wickTipY - flameH * 0.35, cx + sway - flameW * 0.3, flameTipY + flameH * 0.25, cx + sway, flameTipY);
    ctx.bezierCurveTo(cx + sway + flameW * 0.3, flameTipY + flameH * 0.25, cx + flameW * 1.1, wickTipY - flameH * 0.35, cx + flameW, wickTipY);
    ctx.closePath();
    ctx.fill();

    // Incandescent white-hot inner teardrop core
    const coreH = flameH * 0.58;
    const coreW = flameW * 0.48;
    ctx.fillStyle = 'rgba(255, 255, 245, 0.98)';
    ctx.beginPath();
    ctx.moveTo(cx - coreW, wickTipY);
    ctx.bezierCurveTo(cx - coreW, wickTipY - coreH * 0.4, cx + sway * 0.6 - 1, wickTipY - coreH + 1, cx + sway * 0.6, wickTipY - coreH);
    ctx.bezierCurveTo(cx + sway * 0.6 + 1, wickTipY - coreH + 1, cx + coreW, wickTipY - coreH * 0.4, cx + coreW, wickTipY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  // --- 2. BOUNDARY-BREAKING FLAMES: ERUPTING OVER LIPS, CHEEKS & FOREHEAD ---

  public renderCavityFlame(ctx: CanvasRenderingContext2D, open: number, idleTime: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const time = idleTime * 12;
    const brightness = Math.min(1.0, open * 1.4 + 0.45);

    // Dynamic Multi-tier boundary-breaking fire tongues climbing up past nose & forehead
    const layers = [
      { tongues: 7, baseSpread: 170, hMult: 1.25, c1: '255, 255, 220', c2: '255, 200, 60', c3: '255, 100, 0' },
      { tongues: 9, baseSpread: 210, hMult: 1.5, c1: '255, 180, 20', c2: '255, 90, 0', c3: '180, 20, 0' },
      { tongues: 11, baseSpread: 240, hMult: 1.85, c1: '255, 100, 0', c2: '200, 30, 0', c3: '80, 0, 0' }
    ];

    for (let lIdx = 0; lIdx < layers.length; lIdx++) {
      const cfg = layers[lIdx];
      for (let i = 0; i < cfg.tongues; i++) {
        const u = i / (cfg.tongues - 1);
        const baseX = (u - 0.5) * cfg.baseSpread;
        const wave = Math.sin(time + i * 1.6 + lIdx) * 22;
        // Tall boundary-breaking height that climbs UP over the lips, past nose, toward forehead
        const flameHeight = (65 + open * 75 + Math.cos(time * 1.4 + i) * 22) * cfg.hMult;
        const flameX = baseX + wave;
        const flameY = 95 - flameHeight; // Climbs from mouth (y=95) up to y=-70..-130!

        const grad = ctx.createRadialGradient(flameX, flameY, 4, flameX, flameY + flameHeight * 0.4, flameHeight * 0.9);
        grad.addColorStop(0, `rgba(${cfg.c1}, ${brightness * 0.95})`);
        grad.addColorStop(0.4, `rgba(${cfg.c2}, ${brightness * 0.8})`);
        grad.addColorStop(1, `rgba(${cfg.c3}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(baseX - 30, 95);
        ctx.quadraticCurveTo(flameX + wave * 0.6, flameY + flameHeight * 0.5, flameX, flameY);
        ctx.quadraticCurveTo(flameX - wave * 0.6, flameY + flameHeight * 0.5, baseX + 30, 95);
        ctx.fill();
      }
    }

    // Dynamic light spill: warm orange aura casting across the entire physical pumpkin skin
    const rindGlow = ctx.createRadialGradient(0, 40, 20, 0, 40, 200);
    rindGlow.addColorStop(0, `rgba(255, 150, 0, ${0.45 * brightness})`);
    rindGlow.addColorStop(0.5, `rgba(220, 60, 0, ${0.25 * brightness})`);
    rindGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rindGlow;
    ctx.beginPath();
    ctx.arc(0, 40, 200, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- 3. BOUNDARY-BREAKING EYE FLAMES: BLOWTORCH JETS SHOOTING PAST TEMPLES ---

  public renderEyeFlames(ctx: CanvasRenderingContext2D, cx: number, cy: number, idleTime: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const time = idleTime * 15;

    // Direct fire jets curling outward past temples into open air
    const isRight = cx > 0;
    const templeDirection = isRight ? 1 : -1;

    for (let i = 0; i < 7; i++) {
      // Fire jets shoot outward sideways and upward
      const jetProgress = i / 6;
      const fx = cx + templeDirection * (jetProgress * 65 + Math.sin(time + i * 1.8) * 16);
      const fy = cy - jetProgress * 95 - Math.cos(time + i * 1.3) * 12;
      const rad = 16 + Math.sin(time + i) * 7;

      const grad = ctx.createRadialGradient(fx, fy, 2, fx, fy, rad);
      grad.addColorStop(0, 'rgba(255, 255, 220, 0.98)');
      grad.addColorStop(0.35, 'rgba(255, 160, 0, 0.88)');
      grad.addColorStop(0.7, 'rgba(220, 40, 0, 0.5)');
      grad.addColorStop(1, 'rgba(150, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx, fy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- 4. BOUNDARY-BREAKING CRYOGENIC FREEZE: CREEPING FROST DENDRITES & HANGING ICICLES ---

  public renderCavityIce(ctx: CanvasRenderingContext2D, open: number, idleTime: number): void {
    ctx.save();

    // 1. Cryogenic bioluminescent cyan-blue interior glow
    const grad = ctx.createRadialGradient(0, 75, 10, 0, 75, 150 + open * 50);
    grad.addColorStop(0, 'rgba(220, 250, 255, 0.95)');
    grad.addColorStop(0.4, 'rgba(56, 189, 248, 0.85)');
    grad.addColorStop(0.8, 'rgba(3, 105, 161, 0.6)');
    grad.addColorStop(1, 'rgba(2, 44, 80, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 75, 160, 0, Math.PI * 2);
    ctx.fill();

    // 2. Hanging Sharp Crystalline Icicles from upper mouth & lower chin
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const time = idleTime * 2.2;

    // Upper mouth icicles
    for (let x = -110; x <= 110; x += 16) {
      const len = 28 + Math.sin(x * 12.3 + time) * 14 + ((x % 32 === 0) ? 18 : 0);
      ctx.beginPath();
      ctx.moveTo(x - 5, 50);
      ctx.lineTo(x, 50 + len);
      ctx.lineTo(x + 5, 50);
      ctx.fillStyle = 'rgba(225, 250, 255, 0.92)';
      ctx.fill();
      ctx.stroke();

      // Sparkling diamond glint
      if (Math.sin(time * 3.5 + x) > 0.65) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, 50 + len + 2, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Lower chin icicles (Hanging DOWN outside the pumpkin toward the table!)
    for (let x = -85; x <= 85; x += 22) {
      const chinLen = 22 + Math.cos(x * 9.1 + time) * 12;
      ctx.beginPath();
      ctx.moveTo(x - 4, 115);
      ctx.lineTo(x, 115 + chinLen);
      ctx.lineTo(x + 4, 115);
      ctx.fillStyle = 'rgba(210, 245, 255, 0.85)';
      ctx.fill();
      ctx.stroke();
    }

    // 3. Creeping Frost Dendrites crawling OUTWARD across pumpkin rind
    this.renderFrostDendrites(ctx, time);

    ctx.restore();
  }

  private renderFrostDendrites(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    const shimmer = 0.75 + Math.sin(time * 3.2) * 0.15;
    ctx.strokeStyle = `rgba(215, 245, 255, ${shimmer})`;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    // Dendrite clusters crawling out from mouth corners and eye corners
    const origins = [
      { x: -120, y: 70, angle: Math.PI * 0.95 },
      { x: 120, y: 70, angle: Math.PI * 0.05 },
      { x: -80, y: -60, angle: Math.PI * 0.65 },
      { x: 80, y: -60, angle: Math.PI * 0.35 }
    ];

    for (const orig of origins) {
      this.drawDendriteBranch(ctx, orig.x, orig.y, orig.angle, 35, 3);
    }

    // Glacial cyan rim aura enveloping pumpkin contour
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + Math.cos(time * 2.1) * 0.1})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 20, 185, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawDendriteBranch(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    len: number,
    depth: number
  ): void {
    if (depth <= 0 || len < 6) return;

    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Secondary crystalline forks
    this.drawDendriteBranch(ctx, x2, y2, angle + 0.5, len * 0.65, depth - 1);
    this.drawDendriteBranch(ctx, x2, y2, angle - 0.5, len * 0.65, depth - 1);
  }

  // --- 5. RENDER VENTING PARTICLES (CASCADING FOG & BUOYANT EMBERS) ---

  public renderVentingParticles(ctx: CanvasRenderingContext2D): void {
    if (this.particles.length === 0 && !this.ghostWisp && this.shockwaves.length === 0) return;

    ctx.save();

    // 1. Render Billowing Heavy Fog / Smoke
    for (const p of this.particles) {
      if (p.type === 'smoke') {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.rotation !== undefined) ctx.rotate(p.rotation);

        const grad = ctx.createRadialGradient(0, 0, p.size * 0.15, 0, 0, p.size);
        // Particles near mouth (y < 95) underlit with amber candle glow!
        if (p.y < 95) {
          grad.addColorStop(0, `rgba(255, 180, 80, ${p.alpha * 0.75})`);
          grad.addColorStop(0.4, `rgba(200, 140, 90, ${p.alpha * 0.55})`);
          grad.addColorStop(1, 'rgba(80, 50, 40, 0)');
        } else {
          // Cascading cool ghost fog on chin and porch
          grad.addColorStop(0, `rgba(210, 215, 230, ${p.alpha * 0.75})`);
          grad.addColorStop(0.5, `rgba(130, 135, 155, ${p.alpha * 0.45})`);
          grad.addColorStop(1, 'rgba(40, 40, 55, 0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 2. Additive Blending for Embers, Shockwaves, and Ghosts
    ctx.globalCompositeOperation = 'lighter';

    // Rising Buoyant Embers drifting past pumpkin stem
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

  // --- 6. BOUNDARY-BREAKING HIGH-VOLTAGE LIGHTNING DISCHARGES ---

  public renderLightningArcs(
    ctx: CanvasRenderingContext2D,
    leftEye: { x: number; y: number },
    rightEye: { x: number; y: number },
    mouthY: number
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Bolt bridging directly between the two eyes
    this.drawFractalBolt(ctx, leftEye.x, leftEye.y, rightEye.x, rightEye.y, 4, 22);

    // 2. Bolt arcing from left eye down to mouth
    if (Math.random() > 0.25) {
      this.drawFractalBolt(ctx, leftEye.x, leftEye.y, -35, mouthY, 3, 18);
    }

    // 3. Bolt arcing from right eye down to mouth
    if (Math.random() > 0.25) {
      this.drawFractalBolt(ctx, rightEye.x, rightEye.y, 35, mouthY, 3, 18);
    }

    // 4. BOUNDARY-BREAKING AIR DISCHARGES: Shooting outward past cheeks & temples into open dark space!
    // Left temple discharge
    this.drawFractalBolt(ctx, leftEye.x, leftEye.y, -185, leftEye.y + (Math.random() - 0.5) * 45, 4, 26);
    // Right temple discharge
    this.drawFractalBolt(ctx, rightEye.x, rightEye.y, 185, rightEye.y + (Math.random() - 0.5) * 45, 4, 26);

    // 5. Strobe flash on uncarved physical pumpkin skin
    ctx.fillStyle = 'rgba(216, 180, 254, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 20, 190, 0, Math.PI * 2);
    ctx.fill();

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

    // Pass 1: Outer Neon Violet Corona Glow
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
