export type StickmanGhostPose = 'run' | 'jump' | 'fall' | 'idle';

export interface StickmanGhostSample {
  x: number;
  y: number;
  vx: number;
  vy: number;
  squashX: number;
  squashY: number;
  lean: number;
  facing: 1 | -1;
  runCycle: number;
  pose: StickmanGhostPose;
  life: number;
  maxLife: number;
  intensity: number; // 0..1 normalized high-speed kinetic intensity
}

export interface StickmanGhostInput {
  x: number;
  y: number;
  vx: number;
  vy: number;
  squashX: number;
  squashY: number;
  facing: 1 | -1;
  runCycle: number;
  onGround: boolean;
  baseMoveSpeed: number;
  levelId: number;
  allowEmit: boolean;
}

export interface StickmanGhostLiveAnchor {
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Attached visual component for the stickman that emits a faint, lingering
 * afterimage ghost trail and continuous precision arc trace during high-speed
 * movement sequences (full-speed sprints, jump launches, bounce pads, and fast drops).
 */
export class StickmanGhostTrail {
  private samples: StickmanGhostSample[] = [];
  private emitAccum = 0;
  private momentumCharge = 0;

  public clear(): void {
    this.samples = [];
    this.emitAccum = 0;
    this.momentumCharge = 0;
  }

  public update(dt: number, input: StickmanGhostInput): void {
    // Decay and prune expired ghost samples
    for (let i = this.samples.length - 1; i >= 0; i--) {
      const s = this.samples[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.samples.splice(i, 1);
      }
    }

    if (!input.allowEmit) {
      this.momentumCharge = Math.max(0, this.momentumCharge - dt * 4.5);
      return;
    }

    const speed = Math.hypot(input.vx, input.vy);
    const absVx = Math.abs(input.vx);
    const absVy = Math.abs(input.vy);
    const highSpeedThreshold = input.onGround
      ? input.baseMoveSpeed * 0.72 // ~209 px/s sustained sprint
      : input.baseMoveSpeed * 0.62; // ~180 px/s airborne arc or vertical burst

    const isHighSpeed = speed >= highSpeedThreshold || absVy >= 250;

    if (!isHighSpeed) {
      this.momentumCharge = Math.max(0, this.momentumCharge - dt * 5.2);
      this.emitAccum = 0;
      return;
    }

    // Build momentum charge smoothly during sustained sprints, instantly on jump/bounce bursts
    const burstBoost = !input.onGround && absVy >= 320 ? 1 : 0;
    const targetCharge = Math.min(
      1,
      Math.max(
        burstBoost,
        (speed - highSpeedThreshold) / (input.baseMoveSpeed * 1.15),
      ),
    );
    const chargeRate = targetCharge > this.momentumCharge ? 11 : 4.5;
    this.momentumCharge += (targetCharge - this.momentumCharge) * Math.min(1, dt * chargeRate);

    const levelFactor = Math.min(1, Math.max(0, (input.levelId - 1) / 99));
    const speedRatio = Math.min(1, Math.max(0, (speed - highSpeedThreshold) / 420));
    const intensity = Math.min(
      1,
      Math.max(0.18, speedRatio * 0.75 + this.momentumCharge * 0.35 + levelFactor * 0.12),
    );

    // Tighter sampling cadence during peak-velocity arcs for crisp precision curves
    const emitInterval = Math.max(
      0.015,
      0.032 - intensity * 0.014 - levelFactor * 0.003,
    );

    this.emitAccum += dt;
    if (this.emitAccum < emitInterval) {
      return;
    }
    this.emitAccum = 0;

    // Maintain crisp spatial separation between lingering silhouettes
    const prev = this.samples[this.samples.length - 1];
    const minSpacing = speed > 420 ? 8 : 6.5;
    if (prev && Math.hypot(input.x - prev.x, input.y - prev.y) < minSpacing) {
      return;
    }

    const isRunning = input.onGround && absVx > 20;
    const isJumping = !input.onGround && input.vy < 0;
    const isFalling = !input.onGround && input.vy >= 0;
    const pose: StickmanGhostPose = isRunning
      ? 'run'
      : isJumping
        ? 'jump'
        : isFalling
          ? 'fall'
          : 'idle';

    const lean = isRunning
      ? (input.vx / input.baseMoveSpeed) * 0.15
      : Math.max(-0.18, Math.min(0.18, (input.vx / input.baseMoveSpeed) * 0.1));

    // Lingering faint fade-out window (0.28s -> 0.46s depending on velocity & stage precision)
    const maxLife = 0.28 + intensity * 0.13 + levelFactor * 0.05;

    this.samples.push({
      x: input.x,
      y: input.y,
      vx: input.vx,
      vy: input.vy,
      squashX: input.squashX,
      squashY: input.squashY,
      lean,
      facing: input.facing,
      runCycle: input.runCycle,
      pose,
      life: maxLife,
      maxLife,
      intensity,
    });

    const maxSamples = input.levelId >= 10 ? 16 : 13;
    while (this.samples.length > maxSamples) {
      this.samples.shift();
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    levelId: number,
    playerWidth: number,
    playerHeight: number,
    anchor?: StickmanGhostLiveAnchor,
  ): void {
    if (this.samples.length === 0) return;

    const levelFactor = Math.min(1, Math.max(0, (levelId - 1) / 99));
    const isPrecisionLevel = levelId >= 10;

    // 1. Continuous smooth trajectory ribbon anchored directly to the live stickman
    this.drawAttachedTraceRibbon(
      ctx,
      playerWidth,
      playerHeight,
      levelFactor,
      isPrecisionLevel,
      anchor,
    );

    // 2. Lingering pose-accurate stickman silhouettes & kinetic slipstream wisps
    for (let i = 0; i < this.samples.length; i++) {
      const g = this.samples[i];
      const t = Math.max(0, Math.min(1, g.life / g.maxLife));
      const fade = Math.pow(t, 1.65);
      const baseAlpha = (0.19 + g.intensity * 0.14 + levelFactor * 0.05) * fade;
      if (baseAlpha < 0.01) continue;

      const cx = g.x + playerWidth / 2;
      const bottomY = g.y + playerHeight;
      const speed = Math.hypot(g.vx, g.vy) || 1;
      const dirX = g.vx / speed;
      const dirY = g.vy / speed;

      // Subtle aerodynamic slipstream streaks trailing behind high-speed segments
      if (g.intensity > 0.3) {
        const streakLen = (8 + g.intensity * 16 + levelFactor * 5) * t;
        ctx.save();
        ctx.strokeStyle = `rgba(17, 17, 17, ${(baseAlpha * 0.38).toFixed(3)})`;
        ctx.lineWidth = 1.25;
        ctx.lineCap = 'round';
        ctx.beginPath();

        const headStartX = cx - dirX * 6;
        const headStartY = bottomY - 35 - dirY * 6;
        ctx.moveTo(headStartX, headStartY);
        ctx.lineTo(headStartX - dirX * streakLen, headStartY - dirY * streakLen);

        const torsoStartX = cx - dirX * 5;
        const torsoStartY = bottomY - 21 - dirY * 5;
        ctx.moveTo(torsoStartX, torsoStartY);
        ctx.lineTo(
          torsoStartX - dirX * (streakLen * 0.78),
          torsoStartY - dirY * (streakLen * 0.78),
        );
        ctx.stroke();
        ctx.restore();
      }

      const lineW = 1.7 + t * 1.05;

      // Faint crimson chromatic precision echo during peak velocity bursts / airborne arcs
      if (isPrecisionLevel || g.pose === 'jump' || g.pose === 'fall' || g.intensity > 0.58) {
        const crimsonAlpha = baseAlpha * (isPrecisionLevel ? 0.44 : 0.34);
        ctx.save();
        ctx.translate(cx - dirX * 3.2, bottomY - dirY * 2.4);
        ctx.scale(g.squashX, g.squashY);
        ctx.rotate(g.lean);
        this.drawGhostPose(
          ctx,
          g,
          `rgba(220, 38, 38, ${crimsonAlpha.toFixed(3)})`,
          null,
          Math.max(1.3, lineW - 0.35),
        );
        ctx.restore();
      }

      // Main charcoal ink silhouette ghost
      ctx.save();
      ctx.translate(cx, bottomY);
      ctx.scale(g.squashX, g.squashY);
      ctx.rotate(g.lean);
      this.drawGhostPose(
        ctx,
        g,
        `rgba(17, 17, 17, ${baseAlpha.toFixed(3)})`,
        `rgba(245, 243, 238, ${(baseAlpha * 0.45).toFixed(3)})`,
        lineW,
      );
      ctx.restore();
    }
  }

  private drawAttachedTraceRibbon(
    ctx: CanvasRenderingContext2D,
    playerWidth: number,
    playerHeight: number,
    levelFactor: number,
    isPrecisionLevel: boolean,
    anchor?: StickmanGhostLiveAnchor,
  ): void {
    const points: Array<{
      cx: number;
      cy: number;
      t: number;
      intensity: number;
    }> = this.samples.map((s) => ({
      cx: s.x + playerWidth / 2,
      cy: s.y + playerHeight - 22,
      t: Math.max(0, Math.min(1, s.life / s.maxLife)),
      intensity: s.intensity,
    }));

    // Seamlessly attach the newest segment to the live stickman torso
    if (anchor?.visible && points.length > 0) {
      const last = points[points.length - 1];
      const liveCx = anchor.x + playerWidth / 2;
      const liveCy = anchor.y + playerHeight - 22;
      if (Math.hypot(liveCx - last.cx, liveCy - last.cy) < 130) {
        points.push({
          cx: liveCx,
          cy: liveCy,
          t: 1,
          intensity: last.intensity,
        });
      }
    }

    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const dist = Math.hypot(b.cx - a.cx, b.cy - a.cy);
      if (dist > 145 || dist < 0.5) continue;

      const t = b.t;
      const fade = t * t;
      const ribbonAlpha = (0.055 + b.intensity * 0.075 + levelFactor * 0.025) * fade;
      if (ribbonAlpha < 0.007) continue;

      const useCrimson = isPrecisionLevel || b.intensity > 0.58;
      ctx.strokeStyle = useCrimson
        ? `rgba(220, 38, 38, ${ribbonAlpha.toFixed(3)})`
        : `rgba(17, 17, 17, ${ribbonAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.8 + t * 3.6;

      // Quadratic midpoint smoothing when a previous point exists for sleek jump arcs
      ctx.beginPath();
      if (i >= 2) {
        const prev = points[i - 2];
        const prevDist = Math.hypot(a.cx - prev.cx, a.cy - prev.cy);
        if (prevDist <= 145) {
          const midPrevX = (prev.cx + a.cx) * 0.5;
          const midPrevY = (prev.cy + a.cy) * 0.5;
          const midCurrX = (a.cx + b.cx) * 0.5;
          const midCurrY = (a.cy + b.cy) * 0.5;
          ctx.moveTo(midPrevX, midPrevY);
          ctx.quadraticCurveTo(a.cx, a.cy, midCurrX, midCurrY);
          if (i === points.length - 1) {
            ctx.lineTo(b.cx, b.cy);
          }
          ctx.stroke();
          continue;
        }
      }
      ctx.moveTo(a.cx, a.cy);
      ctx.lineTo(b.cx, b.cy);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawGhostPose(
    ctx: CanvasRenderingContext2D,
    g: StickmanGhostSample,
    strokeStyle: string,
    headFillStyle: string | null,
    lineWidth: number,
  ): void {
    const hipY = -15;
    const shoulderY = -28;
    const headY = -36;

    let leftFootX = -5;
    let leftFootY = 0;
    let rightFootX = 5;
    let rightFootY = 0;

    if (g.pose === 'run') {
      const s = Math.sin(g.runCycle);
      leftFootX = s * 9;
      leftFootY = Math.min(0, -Math.cos(g.runCycle) * 4);
      rightFootX = -s * 9;
      rightFootY = Math.min(0, Math.cos(g.runCycle) * 4);
    } else if (g.pose === 'jump') {
      leftFootX = -6 * g.facing;
      leftFootY = -5;
      rightFootX = 5 * g.facing;
      rightFootY = -2;
    } else if (g.pose === 'fall') {
      leftFootX = -7;
      leftFootY = -3;
      rightFootX = 7;
      rightFootY = -6;
    }

    let leftHandX = -7;
    let leftHandY = -18;
    let rightHandX = 7;
    let rightHandY = -18;

    if (g.pose === 'run') {
      const s = Math.sin(g.runCycle);
      leftHandX = -s * 8;
      leftHandY = -19;
      rightHandX = s * 8;
      rightHandY = -19;
    } else if (g.pose === 'jump') {
      leftHandX = -9;
      leftHandY = -33;
      rightHandX = 9;
      rightHandY = -33;
    } else if (g.pose === 'fall') {
      leftHandX = -11;
      leftHandY = -36;
      rightHandX = 11;
      rightHandY = -36;
    }

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(leftFootX, leftFootY);
    ctx.moveTo(0, hipY);
    ctx.lineTo(rightFootX, rightFootY);
    ctx.moveTo(0, hipY);
    ctx.lineTo(0, shoulderY);
    ctx.moveTo(0, shoulderY + 1);
    ctx.lineTo(leftHandX, leftHandY);
    ctx.moveTo(0, shoulderY + 1);
    ctx.lineTo(rightHandX, rightHandY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, headY, 8.8, 0, Math.PI * 2);
    if (headFillStyle) {
      ctx.fillStyle = headFillStyle;
      ctx.fill();
    }
    ctx.lineWidth = Math.max(1.3, lineWidth - 0.35);
    ctx.stroke();
  }
}
