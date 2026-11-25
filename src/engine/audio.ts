import type { GameSettings } from '../types/game';

class AudioManager {
  private ctx: AudioContext | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private settings: GameSettings = {
    musicVolume: 0.35,
    sfxVolume: 0.75,
    muted: false,
    vibration: true,
    touchControls: 'auto',
    controlSensitivity: 1.0,
    unlockAllLevels: false,
  };
  private musicPlaying = false;
  private thudCurve: Float32Array<ArrayBuffer> | null = null;
  private currentLevelId = 1;
  private currentDeathStreak = 0;
  private atmosphereDucked = false;

  // Dynamic evolving background atmosphere layer (Web Audio continuous synthesis)
  private atmoMasterGain: GainNode | null = null;
  private atmoFilter: BiquadFilterNode | null = null;
  private atmoRootOsc: OscillatorNode | null = null;
  private atmoRootGain: GainNode | null = null;
  private atmoTensionOsc: OscillatorNode | null = null;
  private atmoTensionGain: GainNode | null = null;
  private atmoEerieOsc: OscillatorNode | null = null;
  private atmoEerieGain: GainNode | null = null;
  private atmoLfoOsc: OscillatorNode | null = null;
  private atmoLfoFilterGain: GainNode | null = null;
  private atmoLfoPitchGain: GainNode | null = null;
  private atmoStopTimer: number | null = null;

  private getDistortionCurve(amount = 26): Float32Array<ArrayBuffer> {
    if (this.thudCurve) return this.thudCurve;
    const samples = 1024;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    this.thudCurve = curve;
    return curve;
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    if (this.settings.muted || this.settings.musicVolume <= 0.01) {
      this.stopMusicLoop();
      this.stopAtmosphereLayer();
    } else if (this.musicPlaying) {
      if (this.musicTimer === null) {
        this.startMusicLoop();
      }
      this.ensureAtmosphereLayer();
      this.syncAtmosphereParams();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx
        .resume()
        .then(() => {
          if (this.musicPlaying && !this.settings.muted && this.settings.musicVolume > 0.01) {
            this.ensureAtmosphereLayer();
            this.syncAtmosphereParams();
          }
        })
        .catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio(): void {
    const ctx = this.ensureContext();
    if (ctx && this.musicPlaying && !this.settings.muted && this.settings.musicVolume > 0.01) {
      this.ensureAtmosphereLayer();
      this.syncAtmosphereParams();
    }
  }

  /**
   * Updates the dynamic background atmosphere layer to match the active level's
   * escalating difficulty (and optional death-streak tension boost).
   */
  public setAtmosphereLevel(levelId: number, deathStreak?: number): void {
    const nextLevel = Math.max(1, Math.min(100, Math.round(levelId)));
    const levelChanged = nextLevel !== this.currentLevelId;
    this.currentLevelId = nextLevel;
    if (typeof deathStreak === 'number') {
      this.currentDeathStreak = Math.max(0, Math.min(30, Math.round(deathStreak)));
    } else if (levelChanged) {
      this.currentDeathStreak = 0;
    }
    if (this.musicPlaying && !this.settings.muted && this.settings.musicVolume > 0.01) {
      this.ensureAtmosphereLayer();
      this.syncAtmosphereParams();
    }
  }

  public setAtmosphereDucked(ducked: boolean): void {
    if (this.atmosphereDucked === ducked) return;
    this.atmosphereDucked = ducked;
    this.syncAtmosphereParams();
  }

  public startMusic(): void {
    this.musicPlaying = true;
    if (this.settings.muted || this.settings.musicVolume <= 0.01) return;
    this.startMusicLoop();
    this.ensureAtmosphereLayer();
    this.syncAtmosphereParams();
  }

  public stopMusic(): void {
    this.musicPlaying = false;
    this.stopMusicLoop();
    this.stopAtmosphereLayer();
  }

  private getAtmosphereMetrics(): {
    progress: number;
    rootFreq: number;
    tensionFreq: number;
    tensionDetune: number;
    eerieFreq: number;
    filterFreq: number;
    filterQ: number;
    lfoRate: number;
    lfoFilterDepth: number;
    lfoPitchDepth: number;
    masterVol: number;
    rootVol: number;
    tensionVol: number;
    eerieVol: number;
  } {
    // Smooth non-linear escalation across Levels 1..100 (+ subtle extra dread on death streaks)
    const levelNorm = (this.currentLevelId - 1) / 99;
    const streakBoost = Math.min(0.12, (this.currentDeathStreak / 20) * 0.12);
    const progress = Math.min(1, Math.pow(levelNorm, 0.85) + streakBoost * (0.35 + levelNorm * 0.65));

    // Sub-drone slowly creeps upward in pitch as difficulty intensifies (C2 65.4Hz -> D#2 77.8Hz)
    const rootFreq = 65.41 * Math.pow(2, (progress * 3.0) / 12);

    // Tension voice shifts from calm fifth interval toward an unnerving tritone (ratio 1.498 -> 1.414)
    const tensionRatio = 1.498 - progress * 0.084;
    const tensionFreq = rootFreq * tensionRatio;
    // Slow ominous beating detune widens on deeper levels (3 -> 16 cents)
    const tensionDetune = 3 + progress * 13;

    // Eerie high glassy harmonic glides upward from C5 -> F#5 across higher chapters
    const eerieFreq = 523.25 * Math.pow(2, (progress * 6.0) / 12);

    // Filter gradually opens and gains subtle resonant edge
    const filterFreq = 185 + progress * 540;
    const filterQ = 1.2 + progress * 3.8;

    // Breathing LFO accelerates from slow ambient sway (0.14 Hz) to restless pulse (0.52 Hz)
    const lfoRate = 0.14 + progress * 0.38;
    const lfoFilterDepth = 24 + progress * 110;
    const lfoPitchDepth = 1.5 + progress * 11.5;

    const duckMult = this.atmosphereDucked ? 0.42 : 1;
    // Subtle volume bed that grows unmistakably heavier on harder levels without overpowering SFX
    const masterVol =
      this.settings.muted || this.settings.musicVolume <= 0.01
        ? 0.0001
        : this.settings.musicVolume * (0.032 + progress * 0.125) * duckMult;

    const rootVol = 0.82;
    // Tritone tension layer fades in progressively from Level 3 onward
    const tensionVol = 0.12 + Math.pow(progress, 1.15) * 0.56;
    // Eerie glassy overtone emerges gently past early levels (~Lv 12+)
    const eerieVol = Math.max(0, (progress - 0.12) / 0.88) * 0.19;

    return {
      progress,
      rootFreq,
      tensionFreq,
      tensionDetune,
      eerieFreq,
      filterFreq,
      filterQ,
      lfoRate,
      lfoFilterDepth,
      lfoPitchDepth,
      masterVol,
      rootVol,
      tensionVol,
      eerieVol,
    };
  }

  private ensureAtmosphereLayer(): void {
    if (this.atmoStopTimer !== null) {
      window.clearTimeout(this.atmoStopTimer);
      this.atmoStopTimer = null;
    }
    if (this.atmoMasterGain) return;

    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const m = this.getAtmosphereMetrics();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(m.filterFreq, now);
    filter.Q.setValueAtTime(m.filterQ, now);

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    // 1. Sub-harmonic root drone
    const rootOsc = ctx.createOscillator();
    const rootGain = ctx.createGain();
    rootOsc.type = 'sine';
    rootOsc.frequency.setValueAtTime(m.rootFreq, now);
    rootGain.gain.setValueAtTime(m.rootVol, now);
    rootOsc.connect(rootGain);
    rootGain.connect(filter);

    // 2. Detuned tritone tension voice
    const tensionOsc = ctx.createOscillator();
    const tensionGain = ctx.createGain();
    tensionOsc.type = 'triangle';
    tensionOsc.frequency.setValueAtTime(m.tensionFreq, now);
    tensionOsc.detune.setValueAtTime(m.tensionDetune, now);
    tensionGain.gain.setValueAtTime(m.tensionVol, now);
    tensionOsc.connect(tensionGain);
    tensionGain.connect(filter);

    // 3. Eerie high-register anxiety overtone (emerges on harder levels)
    const eerieOsc = ctx.createOscillator();
    const eerieGain = ctx.createGain();
    eerieOsc.type = 'sine';
    eerieOsc.frequency.setValueAtTime(m.eerieFreq, now);
    eerieGain.gain.setValueAtTime(m.eerieVol, now);
    eerieOsc.connect(eerieGain);
    eerieGain.connect(filter);

    // 4. Slow eerie LFO modulating filter breathing and microtonal pitch drift
    const lfoOsc = ctx.createOscillator();
    const lfoFilterGain = ctx.createGain();
    const lfoPitchGain = ctx.createGain();
    lfoOsc.type = 'sine';
    lfoOsc.frequency.setValueAtTime(m.lfoRate, now);
    lfoFilterGain.gain.setValueAtTime(m.lfoFilterDepth, now);
    lfoPitchGain.gain.setValueAtTime(m.lfoPitchDepth, now);
    lfoOsc.connect(lfoFilterGain);
    lfoOsc.connect(lfoPitchGain);
    lfoFilterGain.connect(filter.frequency);
    lfoPitchGain.connect(tensionOsc.detune);
    lfoPitchGain.connect(eerieOsc.detune);

    rootOsc.start(now);
    tensionOsc.start(now);
    eerieOsc.start(now);
    lfoOsc.start(now);

    masterGain.gain.setTargetAtTime(m.masterVol, now, 0.55);

    this.atmoMasterGain = masterGain;
    this.atmoFilter = filter;
    this.atmoRootOsc = rootOsc;
    this.atmoRootGain = rootGain;
    this.atmoTensionOsc = tensionOsc;
    this.atmoTensionGain = tensionGain;
    this.atmoEerieOsc = eerieOsc;
    this.atmoEerieGain = eerieGain;
    this.atmoLfoOsc = lfoOsc;
    this.atmoLfoFilterGain = lfoFilterGain;
    this.atmoLfoPitchGain = lfoPitchGain;
  }

  private syncAtmosphereParams(): void {
    const ctx = this.ctx;
    if (!ctx || !this.atmoMasterGain || !this.atmoFilter) return;

    const now = ctx.currentTime;
    const m = this.getAtmosphereMetrics();
    const tau = 0.42;

    this.atmoMasterGain.gain.setTargetAtTime(m.masterVol, now, tau);
    this.atmoFilter.frequency.setTargetAtTime(m.filterFreq, now, tau);
    this.atmoFilter.Q.setTargetAtTime(m.filterQ, now, tau);

    this.atmoRootOsc?.frequency.setTargetAtTime(m.rootFreq, now, tau);
    this.atmoRootGain?.gain.setTargetAtTime(m.rootVol, now, tau);

    this.atmoTensionOsc?.frequency.setTargetAtTime(m.tensionFreq, now, tau);
    this.atmoTensionOsc?.detune.setTargetAtTime(m.tensionDetune, now, tau);
    this.atmoTensionGain?.gain.setTargetAtTime(m.tensionVol, now, tau);

    this.atmoEerieOsc?.frequency.setTargetAtTime(m.eerieFreq, now, tau);
    this.atmoEerieGain?.gain.setTargetAtTime(m.eerieVol, now, tau);

    this.atmoLfoOsc?.frequency.setTargetAtTime(m.lfoRate, now, tau);
    this.atmoLfoFilterGain?.gain.setTargetAtTime(m.lfoFilterDepth, now, tau);
    this.atmoLfoPitchGain?.gain.setTargetAtTime(m.lfoPitchDepth, now, tau);
  }

  private stopAtmosphereLayer(): void {
    if (!this.atmoMasterGain) return;
    const ctx = this.ctx;
    const masterGain = this.atmoMasterGain;
    const nodes = [
      this.atmoRootOsc,
      this.atmoTensionOsc,
      this.atmoEerieOsc,
      this.atmoLfoOsc,
    ];
    const gains = [
      this.atmoMasterGain,
      this.atmoFilter,
      this.atmoRootGain,
      this.atmoTensionGain,
      this.atmoEerieGain,
      this.atmoLfoFilterGain,
      this.atmoLfoPitchGain,
    ];

    this.atmoMasterGain = null;
    this.atmoFilter = null;
    this.atmoRootOsc = null;
    this.atmoRootGain = null;
    this.atmoTensionOsc = null;
    this.atmoTensionGain = null;
    this.atmoEerieOsc = null;
    this.atmoEerieGain = null;
    this.atmoLfoOsc = null;
    this.atmoLfoFilterGain = null;
    this.atmoLfoPitchGain = null;

    if (ctx && ctx.state === 'running') {
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      this.atmoStopTimer = window.setTimeout(() => {
        for (const osc of nodes) {
          try {
            osc?.stop();
            osc?.disconnect();
          } catch {
            // Already stopped
          }
        }
        for (const node of gains) {
          try {
            node?.disconnect();
          } catch {
            // Already disconnected
          }
        }
        this.atmoStopTimer = null;
      }, 280);
    } else {
      for (const osc of nodes) {
        try {
          osc?.stop();
          osc?.disconnect();
        } catch {
          // Already stopped
        }
      }
      for (const node of gains) {
        try {
          node?.disconnect();
        } catch {
          // Already disconnected
        }
      }
    }
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null) return;
    // Playful, quirky minimalist minor-pentatonic mischief groove (138 BPM eighth notes)
    const melody = [
      261.63, 0, 311.13, 0, 349.23, 392.0, 0, 311.13,
      261.63, 0, 233.08, 0, 196.0, 233.08, 261.63, 0,
      392.0, 0, 349.23, 311.13, 0, 293.66, 311.13, 0,
      261.63, 0, 196.0, 0, 233.08, 0, 261.63, 0,
    ];
    const bass = [
      130.81, 0, 0, 0, 155.56, 0, 0, 0,
      116.54, 0, 0, 0, 98.0, 0, 116.54, 0,
      130.81, 0, 0, 0, 174.61, 0, 0, 0,
      155.56, 0, 146.83, 0, 130.81, 0, 98.0, 0,
    ];

    this.musicTimer = window.setInterval(() => {
      if (this.settings.muted || this.settings.musicVolume <= 0.01) return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;

      // Lazily ensure the continuous atmosphere drone is active once AudioContext runs
      if (!this.atmoMasterGain) {
        this.ensureAtmosphereLayer();
      }

      const idx = this.musicStep % melody.length;
      const note = melody[idx];
      const bassNote = bass[idx];
      const duckMult = this.atmosphereDucked ? 0.55 : 1;
      const levelProgress = Math.min(1, Math.max(0, (this.currentLevelId - 1) / 99));
      // Subtle haunted music-box micro-detune on harder stages
      const eerieDetuneCents =
        levelProgress > 0.15
          ? -((levelProgress - 0.15) / 0.85) * 16 +
            Math.sin(this.musicStep * 0.7) * levelProgress * 7
          : 0;
      const vol = this.settings.musicVolume * 0.09 * duckMult;
      const now = ctx.currentTime;

      if (note > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, now);
        if (eerieDetuneCents !== 0) {
          osc.detune.setValueAtTime(eerieDetuneCents, now);
        }
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(vol, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      }

      if (bassNote > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(bassNote, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(vol * 1.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }

      this.musicStep = (this.musicStep + 1) % melody.length;
    }, 215);
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private lastStrongVibrateAt = 0;
  private lastTouchHapticAt = 0;
  private lastMockSighAt = 0;

  public vibrate(pattern: number | number[]): void {
    if (!this.settings.vibration) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        const totalDuration = Array.isArray(pattern)
          ? pattern.reduce((sum, ms) => sum + ms, 0)
          : pattern;
        if (totalDuration >= 18) {
          this.lastStrongVibrateAt = performance.now();
        }
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore unsupported environments
    }
  }

  /**
   * Subtle, crisp haptic click for mobile touch controls (Left, Right, Jump).
   * Uses short millisecond pulses tuned per button without overriding stronger
   * gameplay impact vibrations (death, traps, bounce pads).
   */
  public vibrateTouchControl(control: 'left' | 'right' | 'jump'): void {
    if (!this.settings.vibration) return;
    try {
      if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
        return;
      }
      const now = performance.now();
      // Never cancel an active death/trap/bounce impact vibration
      if (now - this.lastStrongVibrateAt < 145) return;
      // Avoid rapid double-triggers within 24ms (still allow Jump to override a directional tick)
      if (control !== 'jump' && now - this.lastTouchHapticAt < 24) return;

      this.lastTouchHapticAt = now;
      const durationMs = control === 'jump' ? 14 : 8;
      navigator.vibrate(durationMs);
    } catch {
      // Ignore unsupported environments
    }
  }

  private sfxGain(): number {
    if (this.settings.muted) return 0;
    return this.settings.sfxVolume;
  }

  public playJump(): void {
    const g = this.sfxGain();
    if (g <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.11);
    gain.gain.setValueAtTime(g * 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playLand(): void {
    const g = this.sfxGain();
    if (g <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.07);
    gain.gain.setValueAtTime(g * 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playDeathThud(): void {
    const g = this.sfxGain();
    if (g <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Slightly distorted low-end impact bus (WaveShaper -> Lowpass -> Master Gain)
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.getDistortionCurve(28);
    shaper.oversample = '2x';

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1500, now);
    lowpass.frequency.exponentialRampToValueAtTime(220, now + 0.11);
    lowpass.Q.setValueAtTime(1.8, now);

    const thudMaster = ctx.createGain();
    thudMaster.gain.setValueAtTime(0.001, now);
    thudMaster.gain.linearRampToValueAtTime(g * 0.44, now + 0.004);
    thudMaster.gain.exponentialRampToValueAtTime(0.001, now + 0.145);

    shaper.connect(lowpass);
    lowpass.connect(thudMaster);
    thudMaster.connect(ctx.destination);

    // Sharp punchy sub-thud pitch drop (180Hz -> 34Hz in ~95ms)
    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(180, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(34, now + 0.095);
    bodyOsc.connect(shaper);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.15);

    // Tight high-impact slap transient (~32ms burst into the distortion stage)
    const slapSamples = Math.max(1, Math.floor(ctx.sampleRate * 0.032));
    const slapBuffer = ctx.createBuffer(1, slapSamples, ctx.sampleRate);
    const slapData = slapBuffer.getChannelData(0);
    for (let i = 0; i < slapSamples; i++) {
      const env = Math.pow(1 - i / slapSamples, 2.2);
      slapData[i] = (Math.random() * 2 - 1) * env;
    }
    const slapNoise = ctx.createBufferSource();
    slapNoise.buffer = slapBuffer;
    const slapGain = ctx.createGain();
    slapGain.gain.setValueAtTime(0.75, now);
    slapNoise.connect(slapGain);
    slapGain.connect(shaper);
    slapNoise.start(now);
  }

  public playDeath(): void {
    this.vibrate([35, 30, 55]);
    const g = this.sfxGain();
    if (g <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Immediate short, sharp, slightly distorted impact thud
    this.playDeathThud();

    // Descending comical sawtooth splat tucked slightly behind the initial thud
    const splatStart = now + 0.015;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(310, splatStart);
    osc.frequency.exponentialRampToValueAtTime(68, splatStart + 0.24);
    gain.gain.setValueAtTime(g * 0.14, splatStart);
    gain.gain.exponentialRampToValueAtTime(0.001, splatStart + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(splatStart);
    osc.stop(splatStart + 0.27);

    // Subtle crunch noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(g * 0.13, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    noise.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    // Randomly follow death impact with a subtle, mocking sigh or disappointed groan
    const nowMs = performance.now();
    const sighCooldownMs = 1750;
    const mockChance = this.currentDeathStreak >= 3 ? 0.58 : 0.45;
    if (nowMs - this.lastMockSighAt >= sighCooldownMs && Math.random() < mockChance) {
      this.lastMockSighAt = nowMs;
      const delaySec = 0.19 + Math.random() * 0.06;
      this.playMockingSighOrGroan(undefined, delaySec);
    }
  }

  /**
   * Synthesizes a subtle, mocking exhaled sigh or disappointed groan using
   * dual vocal-formant filters and gentle breath/pitch modulation.
   */
  public playMockingSighOrGroan(variant?: 'sigh' | 'groan', delaySec = 0): void {
    const g = this.sfxGain();
    if (g <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const chosen: 'sigh' | 'groan' = variant ?? (Math.random() < 0.54 ? 'sigh' : 'groan');
    const start = ctx.currentTime + Math.max(0, delaySec);
    // Subtle random pitch & duration variation so repeated mockery feels organic
    const pitchJitter = 0.93 + Math.random() * 0.14;

    if (chosen === 'sigh') {
      const dur = 0.58 + Math.random() * 0.14;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, start);
      master.gain.linearRampToValueAtTime(g * 0.15, start + 0.11);
      master.gain.exponentialRampToValueAtTime(g * 0.085, start + dur * 0.52);
      master.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      master.connect(ctx.destination);

      // Soft breathy exhale noise shaped by descending "haaaah" vocal formants
      const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const breathBuffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const breathData = breathBuffer.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < sampleCount; i++) {
        const white = Math.random() * 2 - 1;
        // One-pole softened pink-ish air texture
        prev = prev * 0.62 + white * 0.38;
        breathData[i] = prev;
      }

      const breathSrc = ctx.createBufferSource();
      breathSrc.buffer = breathBuffer;

      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(760 * pitchJitter, start);
      f1.frequency.exponentialRampToValueAtTime(390 * pitchJitter, start + dur);
      f1.Q.setValueAtTime(3.0, start);

      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(1580 * pitchJitter, start);
      f2.frequency.exponentialRampToValueAtTime(920 * pitchJitter, start + dur);
      f2.Q.setValueAtTime(4.2, start);

      const f1Gain = ctx.createGain();
      f1Gain.gain.setValueAtTime(0.85, start);
      const f2Gain = ctx.createGain();
      f2Gain.gain.setValueAtTime(0.42, start);

      breathSrc.connect(f1);
      breathSrc.connect(f2);
      f1.connect(f1Gain);
      f2.connect(f2Gain);
      f1Gain.connect(master);
      f2Gain.connect(master);

      // Faint voiced downward whisper undertone for weary human inflection
      const voiceOsc = ctx.createOscillator();
      voiceOsc.type = 'triangle';
      voiceOsc.frequency.setValueAtTime(242 * pitchJitter, start);
      voiceOsc.frequency.exponentialRampToValueAtTime(158 * pitchJitter, start + dur * 0.92);

      const voiceLp = ctx.createBiquadFilter();
      voiceLp.type = 'lowpass';
      voiceLp.frequency.setValueAtTime(620, start);

      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(0.0001, start);
      voiceGain.gain.linearRampToValueAtTime(0.28, start + 0.09);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, start + dur * 0.94);

      voiceOsc.connect(voiceLp);
      voiceLp.connect(voiceGain);
      voiceGain.connect(master);

      breathSrc.start(start);
      breathSrc.stop(start + dur + 0.02);
      voiceOsc.start(start);
      voiceOsc.stop(start + dur + 0.02);
      return;
    }

    // Variant B: Subtle disappointed low groan ("ugghhh...")
    const dur = 0.5 + Math.random() * 0.14;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, start);
    master.gain.linearRampToValueAtTime(g * 0.16, start + 0.065);
    master.gain.exponentialRampToValueAtTime(g * 0.11, start + dur * 0.56);
    master.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    master.connect(ctx.destination);

    // Warm vocal-cord sawtooth + triangle pair with lazy downward droop
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(164 * pitchJitter, start);
    osc1.frequency.exponentialRampToValueAtTime(104 * pitchJitter, start + dur);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(165.8 * pitchJitter, start);
    osc2.frequency.exponentialRampToValueAtTime(102.5 * pitchJitter, start + dur);

    // Subtle exasperated vibrato wobble
    const vibOsc = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vibOsc.type = 'sine';
    vibOsc.frequency.setValueAtTime(5.8, start);
    vibGain.gain.setValueAtTime(9, start);
    vibOsc.connect(vibGain);
    vibGain.connect(osc1.detune);
    vibGain.connect(osc2.detune);

    // "Uh" vocal formants for unmistakably disappointed groan timbre
    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(510 * pitchJitter, start);
    formant1.frequency.exponentialRampToValueAtTime(340 * pitchJitter, start + dur);
    formant1.Q.setValueAtTime(4.2, start);

    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(1140 * pitchJitter, start);
    formant2.frequency.exponentialRampToValueAtTime(840 * pitchJitter, start + dur);
    formant2.Q.setValueAtTime(4.8, start);

    const warmthLp = ctx.createBiquadFilter();
    warmthLp.type = 'lowpass';
    warmthLp.frequency.setValueAtTime(1250, start);

    const f1Gain = ctx.createGain();
    f1Gain.gain.setValueAtTime(0.9, start);
    const f2Gain = ctx.createGain();
    f2Gain.gain.setValueAtTime(0.32, start);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.setValueAtTime(0.52, start);
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.48, start);

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(formant1);
    osc1Gain.connect(formant2);
    osc2Gain.connect(formant1);
    osc2Gain.connect(formant2);
    formant1.connect(f1Gain);
    formant2.connect(f2Gain);
    f1Gain.connect(warmthLp);
    f2Gain.connect(warmthLp);
    warmthLp.connect(master);

    // Subtle breath air layered behind the groan
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const airBuffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const airData = airBuffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      airData[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const airSrc = ctx.createBufferSource();
    airSrc.buffer = airBuffer;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.setValueAtTime(900 * pitchJitter, start);
    airFilter.Q.setValueAtTime(2.6, start);
    const airGain = ctx.createGain();
    airGain.gain.setValueAtTime(0.24, start);
    airSrc.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(master);

    osc1.start(start);
    osc2.start(start);
    vibOsc.start(start);
    airSrc.start(start);
    osc1.stop(start + dur + 0.02);
    osc2.stop(start + dur + 0.02);
    vibOsc.stop(start + dur + 0.02);
    airSrc.stop(start + dur + 0.02);
  }

  public playCheckpoint(): void {
    this.vibrate(25);
    const g = this.sfxGain();
    if (g <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      gain.gain.setValueAtTime(g * 0.2, now + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.2);
    });
  }

  public playTrap(): void {
    this.vibrate(18);
    const g = this.sfxGain();
    if (g <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Playful spring/boing slide whistle prank sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.22);
    gain.gain.setValueAtTime(g * 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playBounce(): void {
    const g = this.sfxGain();
    if (g <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.16);
    gain.gain.setValueAtTime(g * 0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playLevelComplete(): void {
    this.vibrate([25, 40, 45]);
    const g = this.sfxGain();
    if (g <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.075;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(g * 0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public playButtonClick(): void {
    const g = this.sfxGain();
    if (g <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.045);
    gain.gain.setValueAtTime(g * 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }
}

export const audioManager = new AudioManager();
