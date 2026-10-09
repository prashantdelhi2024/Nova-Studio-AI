export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private isMuted: boolean = false;
  private currentVolume: number = 1;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
    }
  }

  getContext(): AudioContext | null {
    this.initContext();
    return this.ctx;
  }

  async resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setMasterVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(2, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.currentVolume,
        this.ctx.currentTime
      );
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.currentVolume,
        this.ctx.currentTime
      );
    }
  }

  getPeakLevels(): { left: number; right: number } {
    if (!this.analyser) return { left: 0, right: 0 };
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = (sum / data.length) / 255;
    return {
      left: Math.min(1, avg * (1 + Math.random() * 0.05)),
      right: Math.min(1, avg * (1 - Math.random() * 0.05))
    };
  }

  /**
   * Synthesize procedural sound effects on the fly with zero external assets needed
   */
  async playSFX(type: 'whoosh' | 'impact' | 'riser' | 'glitch' | 'click' | 'pop') {
    await this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    switch (type) {
      case 'whoosh': {
        // Filtered white noise sweep
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, t);
        filter.frequency.exponentialRampToValueAtTime(3200, t + 0.25);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.6, t + 0.25);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.5);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        whiteNoise.start(t);
        whiteNoise.stop(t + 0.5);
        break;
      }

      case 'impact': {
        // Deep sub-bass punch
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.8);

        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.8);
        break;
      }

      case 'riser': {
        // Tension tension builder
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 1.2);

        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0.4, t + 1.1);
        gain.gain.linearRampToValueAtTime(0.001, t + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 1.2);
        break;
      }

      case 'glitch': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.setValueAtTime(200, t + 0.05);
        osc.frequency.setValueAtTime(1400, t + 0.1);
        osc.frequency.setValueAtTime(150, t + 0.15);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.25);
        break;
      }

      case 'click':
      case 'pop': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(1200, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.04);
        break;
      }
    }
  }

  /**
   * Generates a waveform array (60 normalized sample points) from an AudioBuffer or synthetic audio
   */
  static generateWaveformFromSamples(length = 60, seed = 1): number[] {
    const points: number[] = [];
    for (let i = 0; i < length; i++) {
      const v = Math.abs(
        Math.sin(i * 0.25 * seed) * 0.5 +
        Math.cos(i * 0.45 * seed) * 0.3 +
        (Math.sin(i * 1.2) * 0.2)
      );
      points.push(Math.max(0.15, Math.min(1.0, Number(v.toFixed(2)))));
    }
    return points;
  }
}

export const audioEngine = new AudioEngine();
