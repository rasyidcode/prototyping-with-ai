export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterVolume = null;
    this.musicVolume = null;
    this.sfxVolume = null;
    this.musicInterval = null;
    this.isMuted = false;
    
    // Web Audio state
    this.unlocked = false;
  }
  
  init() {
    // Create AudioContext on-demand or after user gesture
    this._tryCreateContext();
  }
  
  playSlap() {
    if (!this._tryCreateContext() || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    
    // 1. Slap crack (Pitch sweep oscillator)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    // Rapid pitch sweep downwards to simulate strike impact
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
    
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    osc.connect(oscGain);
    oscGain.connect(this.sfxVolume);
    
    // 2. Slap splash (Noise burst)
    const bufferSize = this.ctx.sampleRate * 0.08; // 80ms noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, now);
    noiseFilter.Q.setValueAtTime(2.0, now);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxVolume);
    
    osc.start(now);
    noise.start(now);
    
    osc.stop(now + 0.15);
    noise.stop(now + 0.15);
  }
  
  playGroan() {
    if (!this._tryCreateContext() || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    const duration = 0.6 + Math.random() * 0.4;
    
    // Guttural zombie growl/groan
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(95 + Math.random() * 20, now);
    osc1.frequency.linearRampToValueAtTime(75, now + duration);
    
    // Slight detune for chorus/guttural effect
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(97 + Math.random() * 20, now);
    osc2.frequency.linearRampToValueAtTime(72, now + duration);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    filter.Q.setValueAtTime(4.0, now);
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxVolume);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  playMetalClink() {
    if (!this._tryCreateContext() || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1550, now);
    osc2.frequency.exponentialRampToValueAtTime(1000, now + 0.12);
    
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxVolume);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.22);
    osc2.stop(now + 0.22);
  }

  playExplosion() {
    if (!this._tryCreateContext() || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Low rumble osc
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.5);
    
    oscGain.gain.setValueAtTime(0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    
    // Low noise blast
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 0.4);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc.connect(oscGain);
    oscGain.connect(this.sfxVolume);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxVolume);
    
    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.6);
    noise.stop(now + 0.6);
  }

  playIceChime() {
    if (!this._tryCreateContext() || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
    
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = idx * 0.08;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0.25, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);
      
      osc.connect(gain);
      gain.connect(this.sfxVolume);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.45);
    });
  }

  playChargeUp(duration = 0.4) {
    if (!this._tryCreateContext() || this.isMuted) return null;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(900, now + duration);
    
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + duration);
    
    osc.connect(gain);
    gain.connect(this.sfxVolume);
    
    osc.start(now);
    
    return { osc, gain };
  }

  playShockwave() {
    if (!this._tryCreateContext() || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.45);
    
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    osc.connect(gain);
    gain.connect(this.sfxVolume);
    
    osc.start(now);
    osc.stop(now + 0.5);
  }
  
  playGameOver() {
    if (!this._tryCreateContext() || this.isMuted) return;
    this.stopMusic();
    
    const now = this.ctx.currentTime;
    
    // Dark descending chime sequence
    const notes = [220, 196, 174, 146]; // A3, G3, F3, D3
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + index * 0.25);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.25, now + index * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.25 + 0.5);
      
      osc.connect(gain);
      gain.connect(this.sfxVolume);
      
      osc.start(now + index * 0.25);
      osc.stop(now + index * 0.25 + 0.6);
    });
  }
  
  startMusic() {
    if (!this._tryCreateContext() || this.musicInterval || this.isMuted) return;
    
    console.log("Synthesizing spooky arcade background music...");
    const now = this.ctx.currentTime;
    
    // Retro horror synth beat
    // Bass notes: A1, A1, C2, D2, A1, A1, G1, F1 (spooky loop)
    const melody = [55, 55, 65.4, 73.4, 55, 55, 49, 43.7]; 
    let step = 0;
    
    // Play every 400ms (150 BPM)
    this.musicInterval = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      
      const noteTime = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(melody[step], noteTime);
      
      // Dynamic low-pass sweeps to sound dark and pulsing
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, noteTime);
      filter.frequency.exponentialRampToValueAtTime(600, noteTime + 0.15);
      
      gain.gain.setValueAtTime(0.35, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.35);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicVolume);
      
      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
      
      // Increment step
      step = (step + 1) % melody.length;
    }, 400);
  }
  
  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
      if (this.masterVolume) this.masterVolume.gain.setValueAtTime(0, this.ctx.currentTime);
    } else {
      if (this.masterVolume) this.masterVolume.gain.setValueAtTime(1, this.ctx.currentTime);
      this.startMusic();
    }
    return this.isMuted;
  }
  
  _tryCreateContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return true;
    }
    
    // Standard AudioContext creation
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    
    try {
      this.ctx = new AudioContextClass();
      
      // Master volume node
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterVolume.connect(this.ctx.destination);
      
      // Music node
      this.musicVolume = this.ctx.createGain();
      this.musicVolume.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicVolume.connect(this.masterVolume);
      
      // SFX node
      this.sfxVolume = this.ctx.createGain();
      this.sfxVolume.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxVolume.connect(this.masterVolume);
      
      this.unlocked = true;
      return true;
    } catch (e) {
      console.warn("Failed to initialize Web Audio API:", e);
      return false;
    }
  }
}
