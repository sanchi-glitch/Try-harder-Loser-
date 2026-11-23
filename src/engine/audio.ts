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
    } else if (this.musicPlaying && this.musicTimer === null) {
      this.startMusicLoop();
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
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio(): void {
    this.ensureContext();
  }

  public startMusic(): void {
    this.musicPlaying = true;
    if (this.settings.muted || this.settings.musicVolume <= 0.01) return;
    this.startMusicLoop();
  }

  public stopMusic(): void {
    this.musicPlaying = false;
    this.stopMusicLoop();
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

      const idx = this.musicStep % melody.length;
      const note = melody[idx];
      const bassNote = bass[idx];
      const vol = this.settings.musicVolume * 0.09;
      const now = ctx.currentTime;

      if (note > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, now);
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
