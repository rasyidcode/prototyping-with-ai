// audio.js - Web Audio API Synthesizer for FPS Game Sound Effects

class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.muted = false;
        this.volumeLevel = 0.5; // Default 50%
    }

    init() {
        if (this.ctx) return;
        
        // Create AudioContext
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        
        // Master Volume Gain node
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.gain.setValueAtTime(this.volumeLevel, this.ctx.currentTime);
        this.masterVolume.connect(this.ctx.destination);
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(volume) {
        this.volumeLevel = Math.max(0, Math.min(1, volume));
        if (this.masterVolume && this.ctx) {
            this.masterVolume.gain.linearRampToValueAtTime(this.muted ? 0 : this.volumeLevel, this.ctx.currentTime + 0.1);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterVolume && this.ctx) {
            this.masterVolume.gain.setValueAtTime(this.muted ? 0 : this.volumeLevel, this.ctx.currentTime);
        }
        return this.muted;
    }

    // Play synthesized sound based on gun type
    playShoot(type) {
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;

        switch (type) {
            case 'pistol':
                this.synthesizePistol(now);
                break;
            case 'rifle':
                this.synthesizeRifle(now);
                break;
            case 'shotgun':
                this.synthesizeShotgun(now);
                break;
            case 'sniper':
                this.synthesizeSniper(now);
                break;
            case 'plasma':
                this.synthesizePlasma(now);
                break;
        }
    }

    synthesizePistol(time) {
        // Noise buffer for the gunshot blast
        const bufferSize = this.ctx.sampleRate * 0.1; // 100ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1000, time);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, time + 0.1);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.0, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        // Core tone
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

        oscGain.gain.setValueAtTime(0.8, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

        // Connections
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterVolume);

        osc.connect(oscGain);
        oscGain.connect(this.masterVolume);

        noise.start(time);
        osc.start(time);
        noise.stop(time + 0.15);
        osc.stop(time + 0.15);
    }

    synthesizeRifle(time) {
        // Rifle shot: shorter, sharper, slightly higher pitch
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, time);
        osc.frequency.exponentialRampToValueAtTime(80, time + 0.06);

        oscGain.gain.setValueAtTime(0.6, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.06);

        // Sub blast
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(120, time);
        sub.frequency.exponentialRampToValueAtTime(30, time + 0.08);
        subGain.gain.setValueAtTime(0.7, time);
        subGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

        // High frequency transient pop
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(2000, time);
        clickOsc.frequency.exponentialRampToValueAtTime(200, time + 0.02);
        clickGain.gain.setValueAtTime(0.4, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.02);

        osc.connect(oscGain);
        oscGain.connect(this.masterVolume);

        sub.connect(subGain);
        subGain.connect(this.masterVolume);

        clickOsc.connect(clickGain);
        clickGain.connect(this.masterVolume);

        osc.start(time);
        sub.start(time);
        clickOsc.start(time);

        osc.stop(time + 0.1);
        sub.stop(time + 0.1);
        clickOsc.stop(time + 0.1);
    }

    synthesizeShotgun(time) {
        // Shotgun blast: complex noise, heavy sub-bass, longer decay
        const bufferSize = this.ctx.sampleRate * 0.3; // 300ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800, time);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, time + 0.25);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.5, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.28);

        // Heavy sub thump
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(100, time);
        sub.frequency.exponentialRampToValueAtTime(20, time + 0.2);
        
        subGain.gain.setValueAtTime(1.2, time);
        subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterVolume);

        sub.connect(subGain);
        subGain.connect(this.masterVolume);

        noise.start(time);
        sub.start(time);
        noise.stop(time + 0.3);
        sub.stop(time + 0.3);
    }

    synthesizeSniper(time) {
        // Sniper: loud high-frequency ring + deep, long-decay boom
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.4);
        oscGain.gain.setValueAtTime(1.2, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

        // High frequency metal tail
        const ring = this.ctx.createOscillator();
        const ringGain = this.ctx.createGain();
        ring.type = 'sine';
        ring.frequency.setValueAtTime(1500, time);
        ring.frequency.exponentialRampToValueAtTime(800, time + 0.35);
        ringGain.gain.setValueAtTime(0.3, time);
        ringGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        // Noise body
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(600, time);
        noiseFilter.frequency.exponentialRampToValueAtTime(60, time + 0.3);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc.connect(oscGain);
        oscGain.connect(this.masterVolume);

        ring.connect(ringGain);
        ringGain.connect(this.masterVolume);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterVolume);

        osc.start(time);
        ring.start(time);
        noise.start(time);

        osc.stop(time + 0.5);
        ring.stop(time + 0.5);
        noise.stop(time + 0.5);
    }

    synthesizePlasma(time) {
        // Plasma: sci-fi charge and release sweep
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.25);

        oscGain.gain.setValueAtTime(0.8, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

        // FM modulation for "wobble"
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        mod.frequency.setValueAtTime(60, time); // 60Hz wobble
        modGain.gain.setValueAtTime(200, time); // wobble amplitude

        mod.connect(modGain);
        modGain.connect(osc.frequency);

        osc.connect(oscGain);
        oscGain.connect(this.masterVolume);

        osc.start(time);
        mod.start(time);
        osc.stop(time + 0.3);
        mod.stop(time + 0.3);
    }

    // Play Target Hit metallic sound
    playHit() {
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;

        // Metallic bell-like ping using FM synthesis (2 oscillators)
        const carrier = this.ctx.createOscillator();
        const modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const carrierGain = this.ctx.createGain();

        // Target metallic "ping" settings
        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(987.77, now); // B5 note for nice high pitch

        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(1975.54, now); // Harmonic ratio
        
        modGain.gain.setValueAtTime(500, now);
        modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        carrierGain.gain.setValueAtTime(0.4, now);
        carrierGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        // Connections
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(carrierGain);
        carrierGain.connect(this.masterVolume);

        // Start & Stop
        modulator.start(now);
        carrier.start(now);
        modulator.stop(now + 0.2);
        carrier.stop(now + 0.2);
    }

    // Play Empty weapon trigger click
    playClick() {
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.02);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.masterVolume);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    // Play reload mechanical sound
    playReload() {
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;

        // First click (magazine eject)
        this.synthesizeMechanicalClick(now, 600, 300, 0.06, 0.2);
        
        // Second click (magazine insert)
        this.synthesizeMechanicalClick(now + 0.3, 400, 800, 0.08, 0.25);
    }

    synthesizeMechanicalClick(time, startFreq, endFreq, duration, volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime((startFreq + endFreq) / 2, time);

        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume);

        osc.start(time);
        osc.stop(time + duration + 0.05);
    }

    // Play Level-Up musical chime
    playLevelUp() {
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        // Pentatonic scale arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
        
        notes.forEach((freq, idx) => {
            const noteTime = now + idx * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteTime);
            
            gain.gain.setValueAtTime(0.15, noteTime);
            gain.gain.setValueAtTime(0.15, noteTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2);

            osc.connect(gain);
            gain.connect(this.masterVolume);

            osc.start(noteTime);
            osc.stop(noteTime + 0.35);
        });
    }
}

// Global single instance of SoundManager
const sounds = new SoundManager();
window.gameSounds = sounds;
