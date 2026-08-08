export type BattleSoundEvent =
  | 'ui'
  | 'switch'
  | 'spawn'
  | 'kill'
  | 'overload'
  | 'boss'
  | 'warning'
  | 'victory'
  | 'defeat';

interface AmbientVoice {
  sources: AudioScheduledSourceNode[];
  gain: GainNode;
}

export class BattleAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private compressor?: DynamicsCompressorNode;
  private ambient?: AmbientVoice;
  private battleObserver?: MutationObserver;
  private observedLiveMonsters = 0;
  private observedDeathSignatures = new Set<string>();
  private muted = false;
  private battleActive = false;

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    this.applyMasterGain();
    return this.muted;
  }

  setBattleActive(active: boolean): void {
    this.battleActive = active;
    if (!active) {
      this.stopAmbient();
      this.stopBattleDomObserver();
      return;
    }
    if (!this.muted) {
      this.unlock();
      this.startAmbient();
    }
  }

  unlock(): void {
    if (this.muted) return;
    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) return;
    if (!this.context) {
      this.context = new AudioContextCtor();
      this.createOutputBus();
    }
    if (this.context.state === 'suspended') void this.context.resume();
    this.battleActive = true;
    this.startAmbient();
    this.startBattleDomObserver();
  }

  play(event: BattleSoundEvent): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.context;
    if (!ctx) return;

    if (event === 'victory' || event === 'defeat') {
      this.battleActive = false;
      this.stopAmbient();
      this.stopBattleDomObserver();
    }

    const now = ctx.currentTime;
    if (event === 'ui') {
      this.tone(560, 0.045, 0.028, 'sine', now);
      this.tone(900, 0.028, 0.012, 'sine', now + 0.014);
    } else if (event === 'switch') {
      this.noise(0.055, 0.032, now, 900, 4200);
      this.sweep(170, 285, 0.085, 0.055, 'square', now);
      this.tone(420, 0.065, 0.026, 'triangle', now + 0.055);
    } else if (event === 'spawn') {
      this.noise(0.11, 0.025, now, 130, 1200);
      this.sweep(118, 235, 0.16, 0.035, 'sawtooth', now);
      this.tone(310, 0.08, 0.018, 'triangle', now + 0.07);
    } else if (event === 'kill') {
      this.noise(0.14, 0.052, now, 380, 6500);
      this.sweep(780, 150, 0.18, 0.045, 'sawtooth', now);
      this.tone(1180, 0.07, 0.025, 'sine', now + 0.025);
    } else if (event === 'overload') {
      this.tone(68, 0.24, 0.085, 'sine', now);
      this.sweep(260, 1180, 0.18, 0.06, 'sawtooth', now + 0.015);
      this.noise(0.27, 0.078, now + 0.025, 700, 6800);
      this.sweep(1450, 410, 0.21, 0.038, 'square', now + 0.11);
      this.tone(1620, 0.055, 0.02, 'sine', now + 0.19);
    } else if (event === 'boss') {
      this.tone(46, 0.62, 0.095, 'sawtooth', now);
      this.tone(69, 0.54, 0.062, 'triangle', now + 0.035);
      this.noise(0.48, 0.05, now, 45, 520);
      this.sweep(135, 74, 0.52, 0.038, 'sawtooth', now + 0.1);
    } else if (event === 'warning') {
      this.warningPulse(now);
      this.warningPulse(now + 0.19);
    } else if (event === 'victory') {
      this.noise(0.28, 0.022, now, 1200, 7600);
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        this.tone(frequency, 0.3, index === 4 ? 0.042 : 0.032, 'sine', now + index * 0.105);
      });
      this.tone(196, 0.74, 0.026, 'triangle', now + 0.1);
    } else if (event === 'defeat') {
      this.noise(0.34, 0.035, now, 70, 700);
      [220, 174.61, 138.59, 103.83].forEach((frequency, index) => {
        this.sweep(frequency, frequency * 0.78, 0.31, 0.052, 'sawtooth', now + index * 0.14);
      });
    }
  }

  destroy(): void {
    this.stopBattleDomObserver();
    this.stopAmbient();
    if (this.context) void this.context.close();
    this.context = undefined;
    this.master = undefined;
    this.compressor = undefined;
  }

  private createOutputBus(): void {
    const ctx = this.context;
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0.0001 : 0.78;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;

    master.connect(compressor);
    compressor.connect(ctx.destination);
    this.master = master;
    this.compressor = compressor;
  }

  private applyMasterGain(): void {
    const ctx = this.context;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
    master.gain.exponentialRampToValueAtTime(this.muted ? 0.0001 : 0.78, now + 0.045);
    if (this.muted) this.stopAmbient();
    else if (this.battleActive) this.startAmbient();
  }

  private output(node: AudioNode): void {
    if (this.master) node.connect(this.master);
    else if (this.context) node.connect(this.context.destination);
  }

  private startAmbient(): void {
    const ctx = this.context;
    if (!ctx || this.ambient || this.muted || !this.battleActive) return;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 0.6);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 260;
    lowpass.Q.value = 0.7;
    gain.connect(lowpass);
    this.output(lowpass);

    const base = ctx.createOscillator();
    base.type = 'sine';
    base.frequency.value = 46;
    const baseGain = ctx.createGain();
    baseGain.gain.value = 0.72;
    base.connect(baseGain);
    baseGain.connect(gain);

    const harmonic = ctx.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.value = 92;
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.value = 0.25;
    harmonic.connect(harmonicGain);
    harmonicGain.connect(gain);

    const pulse = ctx.createOscillator();
    pulse.type = 'sine';
    pulse.frequency.value = 0.62;
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.value = 0.0045;
    pulse.connect(pulseDepth);
    pulseDepth.connect(gain.gain);

    base.start();
    harmonic.start();
    pulse.start();
    this.ambient = { sources: [base, harmonic, pulse], gain };
  }

  private stopAmbient(): void {
    const ctx = this.context;
    const ambient = this.ambient;
    if (!ctx || !ambient) {
      this.ambient = undefined;
      return;
    }

    const now = ctx.currentTime;
    ambient.gain.gain.cancelScheduledValues(now);
    ambient.gain.gain.setValueAtTime(Math.max(0.0001, ambient.gain.gain.value), now);
    ambient.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    for (const source of ambient.sources) {
      try {
        source.stop(now + 0.14);
      } catch {
        // The voice may already have been stopped by browser shutdown.
      }
    }
    this.ambient = undefined;
  }

  private startBattleDomObserver(): void {
    if (this.battleObserver || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    const root = document.querySelector('.battle-root') ?? document.body;
    if (!root) return;

    this.captureBattleDomState(false);
    this.battleObserver = new MutationObserver(() => this.captureBattleDomState(true));
    this.battleObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  private stopBattleDomObserver(): void {
    this.battleObserver?.disconnect();
    this.battleObserver = undefined;
    this.observedLiveMonsters = 0;
    this.observedDeathSignatures.clear();
  }

  private captureBattleDomState(emitSounds: boolean): void {
    if (typeof document === 'undefined') return;
    const monsters = [...document.querySelectorAll<SVGGElement>('.battle-monster')];
    const liveMonsters = monsters.filter((monster) => !monster.classList.contains('battle-monster--death'));
    const deathSignatures = new Set(
      monsters
        .filter((monster) => monster.classList.contains('battle-monster--death'))
        .map((monster) => {
          const sprite = monster.querySelector<SVGImageElement>('.battle-monster__sprite');
          const href = sprite?.getAttribute('href') ?? '';
          return `${monster.getAttribute('transform') ?? ''}|${href}`;
        })
    );

    if (emitSounds && this.battleActive) {
      if (liveMonsters.length > this.observedLiveMonsters) this.play('spawn');
      if ([...deathSignatures].some((signature) => !this.observedDeathSignatures.has(signature))) this.play('kill');
    }

    this.observedLiveMonsters = liveMonsters.length;
    this.observedDeathSignatures = deathSignatures;
  }

  private warningPulse(startsAt: number): void {
    this.tone(820, 0.105, 0.042, 'square', startsAt);
    this.tone(1230, 0.085, 0.018, 'sine', startsAt + 0.012);
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
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), startsAt);
    this.envelope(gain, startsAt, duration, volume);
    oscillator.connect(gain);
    this.output(gain);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.03);
  }

  private sweep(
    fromFrequency: number,
    toFrequency: number,
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
    oscillator.frequency.setValueAtTime(Math.max(20, fromFrequency), startsAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, toFrequency), startsAt + duration);
    this.envelope(gain, startsAt, duration, volume);
    oscillator.connect(gain);
    this.output(gain);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.03);
  }

  private noise(
    duration: number,
    volume: number,
    startsAt: number,
    highpassFrequency: number,
    lowpassFrequency: number
  ): void {
    const ctx = this.context;
    if (!ctx) return;
    const sampleCount = Math.max(1, Math.ceil(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const decay = 1 - index / channel.length;
      channel[index] = (Math.random() * 2 - 1) * (0.42 + decay * 0.58);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = Math.max(20, highpassFrequency);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = Math.max(highpass.frequency.value + 40, lowpassFrequency);
    const gain = ctx.createGain();
    this.envelope(gain, startsAt, duration, volume, 0.006);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    this.output(gain);
    source.start(startsAt);
    source.stop(startsAt + duration + 0.02);
  }

  private envelope(
    gain: GainNode,
    startsAt: number,
    duration: number,
    volume: number,
    attackSeconds = 0.012
  ): void {
    const peakAt = Math.min(startsAt + attackSeconds, startsAt + duration * 0.4);
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), peakAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  }
}
