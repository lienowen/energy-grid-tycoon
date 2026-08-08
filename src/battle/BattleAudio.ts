export type BattleSoundEvent = 'ui' | 'switch' | 'overload' | 'boss' | 'warning' | 'victory' | 'defeat';

export class BattleAudio {
  private context?: AudioContext;
  private muted = false;

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  unlock(): void {
    if (this.muted) return;
    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) return;
    this.context ??= new AudioContextCtor();
    if (this.context.state === 'suspended') void this.context.resume();
  }

  play(event: BattleSoundEvent): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.context;
    if (!ctx) return;

    const now = ctx.currentTime;
    if (event === 'ui') this.tone(520, 0.045, 0.035, 'sine', now);
    else if (event === 'switch') {
      this.tone(190, 0.07, 0.06, 'square', now);
      this.tone(330, 0.08, 0.04, 'square', now + 0.055);
    } else if (event === 'overload') {
      this.tone(82, 0.19, 0.11, 'sawtooth', now);
      this.tone(740, 0.12, 0.055, 'square', now + 0.035);
      this.tone(1180, 0.08, 0.035, 'square', now + 0.11);
    } else if (event === 'boss') {
      this.tone(62, 0.42, 0.12, 'sawtooth', now);
      this.tone(94, 0.36, 0.08, 'square', now + 0.08);
    } else if (event === 'warning') {
      this.tone(760, 0.1, 0.055, 'square', now);
      this.tone(760, 0.1, 0.055, 'square', now + 0.17);
    } else if (event === 'victory') {
      [392, 523, 659, 784].forEach((frequency, index) => this.tone(frequency, 0.18, 0.055, 'sine', now + index * 0.11));
    } else if (event === 'defeat') {
      [220, 174, 131].forEach((frequency, index) => this.tone(frequency, 0.25, 0.07, 'sawtooth', now + index * 0.14));
    }
  }

  destroy(): void {
    if (this.context) void this.context.close();
    this.context = undefined;
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    startsAt: number
  ): void {
    const ctx = this.context;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startsAt);
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startsAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.02);
  }
}
