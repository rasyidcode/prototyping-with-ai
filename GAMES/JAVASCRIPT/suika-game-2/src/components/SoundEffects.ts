// Web Audio API Synthesizer for retro soccer game sounds
export class SoundEffects {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Lazy initialize AudioContext on first user gesture
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isSoundEnabled() {
    return this.enabled;
  }

  playDrop() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    
    // Short pitch slide down
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playMerge() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Quick sparkling arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const duration = 0.06;

    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const noteStart = now + index * duration;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.12, noteStart);
      gain.gain.linearRampToValueAtTime(0.01, noteStart + duration);

      osc.start(noteStart);
      osc.stop(noteStart + duration);
    });
  }

  playGameOver() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Descending sad minor sweep
    const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
    const duration = 0.15;

    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const noteStart = now + index * duration;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteStart);
      osc.frequency.linearRampToValueAtTime(freq - 20, noteStart + duration);

      gain.gain.setValueAtTime(0.15, noteStart);
      gain.gain.linearRampToValueAtTime(0.01, noteStart + duration * 1.5);

      osc.start(noteStart);
      osc.stop(noteStart + duration * 1.5);
    });
  }

  playRecord() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Triumphant soccer cheer / fanfare
    const notes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50];
    const timings = [0, 0.1, 0.2, 0.3, 0.45, 0.6];
    const durations = [0.08, 0.08, 0.08, 0.12, 0.12, 0.3];

    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const noteStart = now + timings[index];
      const duration = durations[index];

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.15, noteStart);
      gain.gain.linearRampToValueAtTime(0.01, noteStart + duration);

      osc.start(noteStart);
      osc.stop(noteStart + duration);
    });
  }
}

export const soundEffects = new SoundEffects();
