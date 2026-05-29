export class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicInterval: any = null;
  private currentPadOscillators: OscillatorNode[] = [];
  private currentPadGainNodes: GainNode[] = [];
  private isMusicPlaying: boolean = false;

  constructor() {}

  private initContext(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(mute: boolean): void {
    this.isMuted = mute;
    if (mute) {
      this.stopAmbientMusic();
    } else if (this.isMusicPlaying) {
      this.startAmbientMusic();
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  // A bubble pop sound for dropping fruit
  public playDrop(): void {
    this.initContext();
    if (this.isMuted || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Warm sine wave
    osc.type = 'sine';
    
    // Pitch sweep: quick slide from low to high frequency (gives pop bubble sound)
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

    // Gain envelope: fast attack, quick decay
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // An uplifting chime/merge sound, pitched higher based on level
  public playMerge(level: number): void {
    this.initContext();
    if (this.isMuted || !this.ctx) return;

    const baseFreq = 220 * Math.pow(1.18, level); // Pentatonic-like scaling

    // Synthesize dual harmonics for a rich, beautiful chime
    this.playTone(baseFreq, 0.15, 0.4); // Fundamental
    this.playTone(baseFreq * 1.5, 0.08, 0.35); // Fifth
    this.playTone(baseFreq * 2.0, 0.05, 0.25); // Octave

    // Extra sparkling synth pop on top for large merges
    if (level >= 4) {
      setTimeout(() => {
        this.playTone(baseFreq * 2.5, 0.04, 0.15);
        this.playTone(baseFreq * 3.0, 0.04, 0.1);
      }, 50);
    }
  }

  private playTone(freq: number, volume: number, duration: number): void {
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    // Dynamic triangle wave with lowpass filter for warmth
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.05, this.ctx.currentTime + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, this.ctx.currentTime + duration);

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  // Dramatic descending synth minor chords for Game Over
  public playGameOver(): void {
    this.initContext();
    if (this.isMuted || !this.ctx) return;

    this.stopAmbientMusic();

    const now = this.ctx.currentTime;
    // A minor triad down pitch glide: A3 (220Hz), C4 (261Hz), E4 (329Hz)
    const chord = [220, 261.63, 329.63];

    chord.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      // Depressing glide down
      osc.frequency.linearRampToValueAtTime(freq * 0.7, now + 1.8);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 1.8);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc.start(now);
      osc.stop(now + 2.1);
    });
  }

  // Cozy Lo-Fi Ambient Synthesizer Music Pad Loop
  public startAmbientMusic(): void {
    this.isMusicPlaying = true;
    this.initContext();
    if (this.isMuted || !this.ctx || this.musicInterval) return;

    // Peaceful soft progression: Cmaj7 - Fmaj7 - Am7 - G6
    const progressions = [
      [130.81, 164.81, 196.00, 246.94], // Cmaj7 (C3, E3, G3, B3)
      [174.61, 220.00, 261.63, 311.13], // Fmaj7 (F3, A3, C4, E4)
      [110.00, 164.81, 220.00, 261.63], // Am7 (A2, E3, A3, C4)
      [98.00, 146.83, 196.00, 246.94]   // G6 (G2, D3, G3, B3)
    ];

    let chordIndex = 0;
    const playChord = () => {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const chord = progressions[chordIndex];
      chordIndex = (chordIndex + 1) % progressions.length;

      // Stop previous pad notes safely
      this.clearActivePads();

      const duration = 6.0; // Seconds per chord
      
      chord.forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        // Soft triangle wave for retro pad feel
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        
        // Very subtle vibrato pitch modulation
        osc.frequency.linearRampToValueAtTime(freq * 1.002, now + duration * 0.5);
        osc.frequency.linearRampToValueAtTime(freq, now + duration);

        // Highly filtered lowpass
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, now);
        
        // Slow attack, steady hold, slow release
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 1.5); // Warm ambient volume
        gain.gain.setValueAtTime(0.04, now + duration - 1.5);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        osc.start(now);
        osc.stop(now + duration + 0.1);

        this.currentPadOscillators.push(osc);
        this.currentPadGainNodes.push(gain);
      });
    };

    // Play first chord immediately
    playChord();
    
    // Cycle every 5.5 seconds to overlap smoothly
    this.musicInterval = setInterval(playChord, 5500);
  }

  public stopAmbientMusic(): void {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.clearActivePads();
  }

  private clearActivePads(): void {
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.currentPadGainNodes.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5); // Gentle fade-out
      } catch (e) {}
    });
    this.currentPadOscillators.forEach((osc) => {
      try {
        osc.stop(now + 0.6);
      } catch (e) {}
    });

    this.currentPadOscillators = [];
    this.currentPadGainNodes = [];
  }
}
