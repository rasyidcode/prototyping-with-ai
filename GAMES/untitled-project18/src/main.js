import * as THREE from 'three';
import './style.css';

// ==========================================
// PROCEDURAL AUDIO SYNTHESIZER
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.bgmTimer = null;
    this.nextNoteTime = 0.0;
    this.step = 0;
    this.tempo = 120.0; // BPM
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // sec
    this.isPlayingBgm = false;
    
    // Chord progression in A minor: Am, F, C, G
    this.chords = [
      [110.00, 220.00], // Am (A2, A3)
      [87.31, 174.61],  // F (F2, F3)
      [130.81, 261.63], // C (C3, C4)
      [98.00, 196.00]   // G (G2, G3)
    ];
    
    // A minor pentatonic scale for lead melody (A4, C5, D5, E5, G5, A5)
    this.leadScale = [440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
    
    // Retro lead riff sequence
    this.leadPattern = [
      0, -1, 2, 3, -1, 4, -1, 5,
      3, -1, 2, 0, -1, 1, -1, -1
    ];
  }
  
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.setupEngineSound();
    
    // Fetch stored audio preference (default to muted for user comfort / autoplay policies)
    const storedMute = localStorage.getItem('neon_horizon_muted');
    this.isMuted = storedMute !== 'false';
  }
  
  setupEngineSound() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    
    this.engineOsc.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    
    this.engineOsc.frequency.setValueAtTime(50, this.ctx.currentTime);
    this.engineOsc2.frequency.setValueAtTime(25, this.ctx.currentTime);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, this.ctx.currentTime);
    
    this.engineOsc.connect(filter);
    this.engineOsc2.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    
    this.engineOsc.start();
    this.engineOsc2.start();
  }
  
  setMuted(muted) {
    this.isMuted = muted;
    localStorage.setItem('neon_horizon_muted', muted);
    
    if (this.ctx) {
      if (this.isMuted) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        this.stopBGM();
      } else {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        this.engineGain.gain.setTargetAtTime(0.08, this.ctx.currentTime, 0.1);
        this.startBGM();
      }
    }
  }
  
  updateEngine(speedRatio, isBoosting) {
    if (!this.ctx || this.isMuted) return;
    
    const targetFreq = 50 + speedRatio * 150 + (isBoosting ? 90 : 0);
    const targetFreq2 = targetFreq / 2;
    
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.15);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq2, this.ctx.currentTime, 0.15);
    
    const targetGain = 0.05 + speedRatio * 0.05 + (isBoosting ? 0.04 : 0);
    this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
  }
  
  startBGM() {
    if (this.isMuted || this.isPlayingBgm) return;
    this.isPlayingBgm = true;
    this.nextNoteTime = this.ctx.currentTime;
    this.step = 0;
    this.scheduler();
  }
  
  stopBGM() {
    this.isPlayingBgm = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
  
  scheduler() {
    if (!this.isPlayingBgm) return;
    
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.step, this.nextNoteTime);
      this.advanceNote();
    }
    
    this.bgmTimer = setTimeout(() => this.scheduler(), this.lookahead);
  }
  
  advanceNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note steps
    this.step++;
  }
  
  scheduleNote(step, time) {
    const currentChordIndex = Math.floor((step / 32) % this.chords.length);
    const chord = this.chords[currentChordIndex];
    
    // 1. Kick (step % 4 === 0)
    if (step % 4 === 0) {
      this.playKick(time);
    }
    
    // 2. Snare / Hat (step % 4 === 2 is Snare, step % 2 === 1 is Hat)
    if (step % 4 === 2) {
      this.playSnare(time);
    } else if (step % 2 === 1) {
      this.playHihat(time);
    }
    
    // 3. Synth Bass (eighth notes)
    if (step % 2 === 0) {
      const isOctave = (step % 4 === 2);
      const freq = isOctave ? chord[1] : chord[0];
      this.playBass(freq, time);
    }
    
    // 4. Lead Riff (plays on phrase bars)
    const patternIdx = step % 16;
    const noteVal = this.leadPattern[patternIdx];
    if (noteVal !== -1 && Math.floor(step / 16) % 2 === 1) {
      const baseFreq = this.leadScale[noteVal];
      let chordShift = 1.0;
      if (currentChordIndex === 1) chordShift = 5/6; // Scale down for F
      if (currentChordIndex === 2) chordShift = 6/5; // Scale up for C
      if (currentChordIndex === 3) chordShift = 4/3; // Scale up for G
      this.playLead(baseFreq * chordShift, time);
    }
  }
  
  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);
    
    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.14);
    
    osc.start(time);
    osc.stop(time + 0.15);
  }
  
  playSnare(time) {
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, time);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.11);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(time);
    noise.stop(time + 0.13);
  }
  
  playHihat(time) {
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.035, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(time);
    noise.stop(time + 0.035);
  }
  
  playBass(frequency, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, time);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, time);
    filter.frequency.exponentialRampToValueAtTime(75, time + 0.1);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    
    osc.start(time);
    osc.stop(time + 0.13);
  }
  
  playLead(frequency, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, time);
    
    // Add vibrato
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(5.5, time);
    lfoGain.gain.setValueAtTime(3.5, time);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    
    // Retro delay echo
    const delay = this.ctx.createDelay(0.3);
    const delayGain = this.ctx.createGain();
    delay.delayTime.setValueAtTime(0.2, time);
    delayGain.gain.setValueAtTime(0.3, time);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    gain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(this.ctx.destination);
    delayGain.connect(delay); // feedback loop
    
    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    
    lfo.start(time);
    osc.start(time);
    lfo.stop(time + 0.23);
    osc.stop(time + 0.23);
  }
  
  playCollectSFX() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(659.25, now + 0.06); // E5
    osc1.frequency.setValueAtTime(783.99, now + 0.12); // G5
    
    osc2.frequency.setValueAtTime(1046.50, now); // C6
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.24);
    osc2.stop(now + 0.24);
  }
  
  playBoostSFX() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Wind/white noise sweep
    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(2500, now + 0.8);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Rising tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(550, now + 0.8);
    
    const oscFilter = this.ctx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.setValueAtTime(250, now);
    oscFilter.frequency.exponentialRampToValueAtTime(900, now + 0.8);
    
    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    
    oscGain.gain.setValueAtTime(0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    
    noise.start(now);
    osc.start(now);
    noise.stop(now + 1.3);
    osc.stop(now + 0.82);
  }
  
  playCrashSFX() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Low-frequency rumbling explosion
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(15, now + 1.3);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    
    // Noise blast
    const bufferSize = this.ctx.sampleRate * 1.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    
    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    
    osc.start(now);
    noise.start(now);
    osc.stop(now + 1.5);
    noise.stop(now + 1.5);
  }
}

// Instantiate Sound Engine
const audio = new SoundEngine();

// ==========================================
// GAME CORE STATE VARIABLES
// ==========================================
const GAME_STATE = {
  START: 'start',
  PLAYING: 'playing',
  GAMEOVER: 'gameover'
};

let currentGameState = GAME_STATE.START;
let difficultyMultiplier = 1.0;
let speed = 0.0;
const BASE_SPEED = 25.0; // Units/sec (baseline target)
const MAX_PLAYER_SPEED = 38.0;
const MIN_PLAYER_SPEED = 12.0;

let distanceScore = 0;
let crystalsCollected = 0;
let highScore = parseInt(localStorage.getItem('neon_horizon_highscore') || '0', 10);

// Nitro System
let nitroCharge = 0; // 0 to 100
let isBoosting = false;
let boostTimer = 0;
const BOOST_DURATION = 3.0; // Seconds

// Entities List
let playerCar = null;
const trafficCars = [];
const crystals = [];
const starParticles = [];

// Timers for spawning
let trafficSpawnTimer = 0;
let crystalSpawnTimer = 0;

// Setup Scene, Camera, Renderer
const container = document.getElementById('game-container');
const canvas = document.getElementById('game-canvas');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050512, 0.007);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Clock
const clock = new THREE.Clock();

// Keyboard inputs
const keyboard = {
  left: false,
  right: false,
  up: false,
  down: false,
  space: false
};

// Touch and Mouse control target X
let touchTargetX = null;

// Particle System Instance
class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.sharedGeom = new THREE.SphereGeometry(0.12, 4, 4);
    
    this.mats = {
      orange: new THREE.MeshBasicMaterial({ color: 0xffaa00 }),
      pink: new THREE.MeshBasicMaterial({ color: 0xff007f }),
      cyan: new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
      white: new THREE.MeshBasicMaterial({ color: 0xffffff })
    };
  }
  
  spawn(type, position, velocity, duration) {
    const mat = this.mats[type] || this.mats.cyan;
    const mesh = new THREE.Mesh(this.sharedGeom, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);
    
    this.pool.push({
      mesh,
      velocity: velocity.clone(),
      life: duration,
      maxLife: duration
    });
  }
  
  update(dt) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      
      const scale = Math.max(0, p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);
      
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.pool.splice(i, 1);
      }
    }
  }
  
  clear() {
    this.pool.forEach(p => this.scene.remove(p.mesh));
    this.pool = [];
  }
}

const particles = new ParticleSystem(scene);

// ==========================================
// ENVIRONMENT GENERATION
// ==========================================

// 1. Grid Road Scrolling Material
let roadTexture = null;
let roadMesh = null;

function createRoad() {
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 256;
  roadCanvas.height = 512;
  const rCtx = roadCanvas.getContext('2d');
  
  // Background asphalt color
  rCtx.fillStyle = '#060618';
  rCtx.fillRect(0, 0, 256, 512);
  
  // Draw glowing cyan side edges
  rCtx.strokeStyle = '#00f0ff';
  rCtx.lineWidth = 10;
  rCtx.beginPath();
  rCtx.moveTo(5, 0); rCtx.lineTo(5, 512);
  rCtx.moveTo(251, 0); rCtx.lineTo(251, 512);
  rCtx.stroke();
  
  // Draw glowing pink dashed lane markings
  rCtx.strokeStyle = '#ff007f';
  rCtx.lineWidth = 4;
  rCtx.setLineDash([40, 40]);
  rCtx.beginPath();
  rCtx.moveTo(85, 0); rCtx.lineTo(85, 512);
  rCtx.moveTo(170, 0); rCtx.lineTo(170, 512);
  rCtx.stroke();
  
  roadTexture = new THREE.CanvasTexture(roadCanvas);
  roadTexture.wrapS = THREE.RepeatWrapping;
  roadTexture.wrapT = THREE.RepeatWrapping;
  roadTexture.repeat.set(1, 4); // Repeat along height
  
  const roadMat = new THREE.MeshBasicMaterial({ map: roadTexture });
  const roadGeom = new THREE.PlaneGeometry(16, 250);
  roadMesh = new THREE.Mesh(roadGeom, roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.set(0, 0, -100);
  scene.add(roadMesh);
  
  // Adding physical neon barriers/railings on sides
  const railingGeom = new THREE.CylinderGeometry(0.12, 0.12, 250, 8);
  railingGeom.rotateX(Math.PI / 2);
  const railingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  
  const railL = new THREE.Mesh(railingGeom, railingMat);
  railL.position.set(-8, 0.2, -100);
  scene.add(railL);
  
  const railR = railL.clone();
  railR.position.x = 8;
  scene.add(railR);
}

// 2. Wireframe Mountains (Scrolling Terrain segments)
const mountainSegments = [];

function createMountains() {
  // Height displacement generator
  const terrainGeom = new THREE.PlaneGeometry(60, 250, 24, 60);
  const pos = terrainGeom.attributes.position;
  
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const distToRoad = Math.abs(x);
    
    if (distToRoad > 12) {
      // Displace height (Z coord of plane) using sine waves
      const factor = (distToRoad - 12) / 8;
      const height = (Math.sin(x * 0.15) * Math.cos(y * 0.08) * 8.5) +
                     (Math.sin(x * 0.4) * Math.sin(y * 0.25) * 1.5);
      pos.setZ(i, Math.max(0, height * factor));
    }
  }
  terrainGeom.computeVertexNormals();
  
  const mountainMat = new THREE.MeshBasicMaterial({
    color: 0x5a00aa,
    wireframe: true,
    transparent: true,
    opacity: 0.7
  });
  
  // We spawn two sets of mountains for infinite looping
  // Set 1
  const seg1Left = new THREE.Mesh(terrainGeom, mountainMat);
  seg1Left.rotation.x = -Math.PI / 2;
  seg1Left.position.set(-42, -0.2, -100);
  scene.add(seg1Left);
  
  const seg1Right = seg1Left.clone();
  seg1Right.position.x = 42;
  seg1Right.rotation.y = Math.PI; // Flip it for variation
  scene.add(seg1Right);
  
  // Set 2
  const seg2Left = seg1Left.clone();
  seg2Left.position.z = -350;
  scene.add(seg2Left);
  
  const seg2Right = seg1Right.clone();
  seg2Right.position.z = -350;
  scene.add(seg2Right);
  
  mountainSegments.push({ left: seg1Left, right: seg1Right });
  mountainSegments.push({ left: seg2Left, right: seg2Right });
}

// 3. Classic Synthwave Sun & Horizon Starfield
function createSkyBackground() {
  // Classic striped sun
  const sunCanvas = document.createElement('canvas');
  sunCanvas.width = 512;
  sunCanvas.height = 512;
  const sCtx = sunCanvas.getContext('2d');
  
  // Sunset radial gradient
  const grad = sCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#ffaa00'); // Orange/Yellow
  grad.addColorStop(0.5, '#ff007f'); // Vibrant Pink
  grad.addColorStop(1, '#bc00dd'); // Synth Purple
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 512, 512);
  
  // Slice out horizontal lines to create the retro vector sun lines
  sCtx.fillStyle = '#050512'; // Must match background fog color
  for (let y = 256; y < 512; y += 24) {
    const thickness = 2 + (y - 256) / 10;
    sCtx.fillRect(0, y, 512, thickness);
  }
  
  const sunTexture = new THREE.CanvasTexture(sunCanvas);
  const sunMat = new THREE.MeshBasicMaterial({ map: sunTexture, transparent: true });
  const sunGeom = new THREE.CircleGeometry(55, 64);
  const sun = new THREE.Mesh(sunGeom, sunMat);
  sun.position.set(0, 8, -240);
  scene.add(sun);
  
  // Stars that drift past
  const starGeom = new THREE.SphereGeometry(0.18, 4, 4);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  
  for (let i = 0; i < 120; i++) {
    const star = new THREE.Mesh(starGeom, starMat);
    star.position.set(
      (Math.random() - 0.5) * 120, // X
      2 + Math.random() * 45,       // Y
      -Math.random() * 250        // Z
    );
    scene.add(star);
    starParticles.push(star);
  }
}

// 4. Lights Setup
function setupLights() {
  const ambientLight = new THREE.AmbientLight(0x0e0e28, 1.2);
  scene.add(ambientLight);
  
  const moonLight = new THREE.DirectionalLight(0x502880, 1.0);
  moonLight.position.set(0, 50, -50);
  scene.add(moonLight);
}

// ==========================================
// CAR & ASSET CREATION
// ==========================================

// Create Player's cyber sports car
function createPlayer() {
  const carGroup = new THREE.Group();
  
  // Sleek car metallic purple material
  const bodyMat = new THREE.MeshPhongMaterial({
    color: 0x0f0c1b,
    shininess: 90,
    specular: 0x00f0ff
  });
  
  const glassMat = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.6,
    shininess: 100
  });
  
  const tireMat = new THREE.MeshPhongMaterial({
    color: 0x0a0a0f,
    shininess: 30
  });

  const neonRimMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff
  });

  // Base chassis box
  const mainChassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 3.2), bodyMat);
  mainChassis.position.y = 0.35;
  carGroup.add(mainChassis);
  
  // Wedge Hood
  const wedgeHood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 1.2), bodyMat);
  wedgeHood.position.set(0, 0.25, -1.6);
  wedgeHood.rotation.x = -0.15;
  carGroup.add(wedgeHood);
  
  // Cockpit canopy (Glassmorphic)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 1.5), glassMat);
  canopy.position.set(0, 0.68, -0.15);
  carGroup.add(canopy);

  // Rear Spoiler system
  const spoilerL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.1), bodyMat);
  spoilerL.position.set(-0.6, 0.6, 1.2);
  const spoilerR = spoilerL.clone();
  spoilerR.position.x = 0.6;
  carGroup.add(spoilerL);
  carGroup.add(spoilerR);

  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.45), bodyMat);
  spoilerWing.position.set(0, 0.78, 1.2);
  spoilerWing.rotation.x = 0.08;
  carGroup.add(spoilerWing);
  
  // Red Neon Tail Light bar
  const tailLight = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.07, 0.08), 
    new THREE.MeshBasicMaterial({ color: 0xff004f })
  );
  tailLight.position.set(0, 0.38, 1.61);
  carGroup.add(tailLight);

  // Headlights
  const headLightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.08, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  );
  headLightL.position.set(-0.6, 0.25, -2.15);
  const headLightR = headLightL.clone();
  headLightR.position.x = 0.6;
  carGroup.add(headLightL);
  carGroup.add(headLightR);

  // Headlight spot lighting shooting down the road!
  const leftBeam = new THREE.SpotLight(0x00f0ff, 8.0, 35.0, Math.PI / 7, 0.5, 1.0);
  leftBeam.position.set(-0.6, 0.3, -2.2);
  leftBeam.target.position.set(-0.6, 0.0, -25.0);
  carGroup.add(leftBeam);
  carGroup.add(leftBeam.target);

  const rightBeam = new THREE.SpotLight(0x00f0ff, 8.0, 35.0, Math.PI / 7, 0.5, 1.0);
  rightBeam.position.set(0.6, 0.3, -2.2);
  rightBeam.target.position.set(0.6, 0.0, -25.0);
  carGroup.add(rightBeam);
  carGroup.add(rightBeam.target);

  // Setup Dual Exhaust Pipes
  const exhaustGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8);
  exhaustGeom.rotateX(Math.PI / 2);
  const exhaustMat = new THREE.MeshPhongMaterial({ color: 0x22222a });
  
  const exhaustL = new THREE.Mesh(exhaustGeom, exhaustMat);
  exhaustL.position.set(-0.35, 0.18, 1.6);
  const exhaustR = exhaustL.clone();
  exhaustR.position.x = 0.35;
  carGroup.add(exhaustL);
  carGroup.add(exhaustR);

  // Wheels Configuration
  const wheelGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
  wheelGeom.rotateZ(Math.PI / 2);
  
  const rimGeom = new THREE.TorusGeometry(0.28, 0.05, 8, 20);
  rimGeom.rotateY(Math.PI / 2);
  
  const wheels = [];
  const positions = [
    [-0.9, 0.25, -1.0], // Front Left
    [0.9, 0.25, -1.0],  // Front Right
    [-0.9, 0.25, 1.0],  // Rear Left
    [0.9, 0.25, 1.0]    // Rear Right
  ];
  
  positions.forEach((pos) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(pos[0], pos[1], pos[2]);
    
    const tire = new THREE.Mesh(wheelGeom, tireMat);
    wGroup.add(tire);
    
    // Outer neon glowing rim
    const rim = new THREE.Mesh(rimGeom, neonRimMat);
    rim.position.x = pos[0] > 0 ? 0.02 : -0.02;
    wGroup.add(rim);
    
    carGroup.add(wGroup);
    wheels.push(wGroup);
  });

  // Adding Boost Flame cylinders at the rear
  const flameGeom = new THREE.ConeGeometry(0.25, 1.2, 8);
  flameGeom.rotateX(Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff00ff,
    transparent: true,
    opacity: 0.0 // Initially invisible
  });
  
  const flameL = new THREE.Mesh(flameGeom, flameMat);
  flameL.position.set(-0.35, 0.18, 2.3);
  const flameR = flameL.clone();
  flameR.position.x = 0.35;
  carGroup.add(flameL);
  carGroup.add(flameR);

  scene.add(carGroup);
  
  playerCar = {
    mesh: carGroup,
    wheels,
    exhausts: [exhaustL, exhaustR],
    flames: [flameL, flameR],
    flameMat,
    x: 0,
    y: 0,
    z: 0,
    targetX: 0
  };
}

// Spawns a futuristic traffic obstacle wedge
function spawnTrafficCar() {
  const laneIndex = Math.floor(Math.random() * 3); // 0 (left), 1 (center), 2 (right)
  const laneX = (laneIndex - 1) * 4.2; // -4.2, 0.0, 4.2
  
  const obColor = Math.random() > 0.5 ? 0xff007f : 0xffaa00; // Neon Pink or Orange
  const obMat = new THREE.MeshPhongMaterial({
    color: obColor,
    shininess: 60,
    emissive: obColor,
    emissiveIntensity: 0.2
  });
  
  const baseBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.2), obMat);
  baseBox.position.y = 0.35;
  
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.25, 0.8), obMat);
  nose.position.set(0, 0.22, 1.2);
  nose.rotation.x = 0.18;
  
  const obstacleGroup = new THREE.Group();
  obstacleGroup.add(baseBox);
  obstacleGroup.add(nose);
  
  // Neon tail glow bars
  const redTaillight = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.06, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  redTaillight.position.set(0, 0.4, -1.11);
  obstacleGroup.add(redTaillight);
  
  obstacleGroup.position.set(laneX, 0, -135);
  scene.add(obstacleGroup);
  
  trafficCars.push({
    mesh: obstacleGroup,
    x: laneX,
    z: -135,
    lane: laneIndex,
    speed: 5.0 + Math.random() * 8.0, // scrolls slower than baseline speed
    bobOffset: Math.random() * Math.PI
  });
}

// Spawns floating golden crystal collectibles
function spawnCrystal() {
  const laneIndex = Math.floor(Math.random() * 3);
  const laneX = (laneIndex - 1) * 4.2;
  
  // Octahedron geometry
  const geom = new THREE.OctahedronGeometry(0.5, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe600, // Golden neon yellow
  });
  const mesh = new THREE.Mesh(geom, mat);
  
  // Position slightly elevated
  mesh.position.set(laneX, 0.75, -135);
  scene.add(mesh);
  
  crystals.push({
    mesh,
    x: laneX,
    z: -135,
    lane: laneIndex
  });
}

// ==========================================
// USER INPUT LISTENERS
// ==========================================

// 1. Keyboard Listeners
window.addEventListener('keydown', (e) => {
  if (currentGameState !== GAME_STATE.PLAYING) return;
  switch (e.code) {
    case 'ArrowLeft':
    case 'KeyA':
      keyboard.left = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keyboard.right = true;
      break;
    case 'ArrowUp':
    case 'KeyW':
      keyboard.up = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      keyboard.down = true;
      break;
    case 'Space':
      keyboard.space = true;
      e.preventDefault();
      triggerNitro();
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowLeft':
    case 'KeyA':
      keyboard.left = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keyboard.right = false;
      break;
    case 'ArrowUp':
    case 'KeyW':
      keyboard.up = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      keyboard.down = false;
      break;
    case 'Space':
      keyboard.space = false;
      break;
  }
});

// 2. Mouse/Touch Cursor Controls (Follow client cursor)
function handlePointerMove(clientX) {
  if (currentGameState !== GAME_STATE.PLAYING) return;
  
  // Convert horizontal client X to normalize range [-1, 1]
  const normX = (clientX / window.innerWidth) * 2 - 1;
  touchTargetX = normX * 6.5; // Scale to road limit bounds
}

window.addEventListener('mousemove', (e) => {
  // Only use mouse steering if there's an active click (steer while dragging/clicking)
  if (e.buttons === 1) {
    handlePointerMove(e.clientX);
  }
});

window.addEventListener('mousedown', (e) => {
  if (currentGameState === GAME_STATE.PLAYING) {
    // Check if player clicked the Nitro panel container area
    const hudBottomRight = document.querySelector('.boost-container');
    if (hudBottomRight && hudBottomRight.contains(e.target)) {
      triggerNitro();
    } else {
      handlePointerMove(e.clientX);
    }
  }
});

window.addEventListener('mouseup', () => {
  touchTargetX = null;
});

// Touch Events for Mobile
window.addEventListener('touchstart', (e) => {
  if (currentGameState === GAME_STATE.PLAYING) {
    const touch = e.touches[0];
    const hudBottomRight = document.querySelector('.boost-container');
    if (hudBottomRight && hudBottomRight.contains(e.target)) {
      triggerNitro();
    } else {
      handlePointerMove(touch.clientX);
    }
  }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (currentGameState === GAME_STATE.PLAYING) {
    const touch = e.touches[0];
    handlePointerMove(touch.clientX);
    e.preventDefault(); // Prevent page pull scroll bounces
  }
}, { passive: false });

window.addEventListener('touchend', () => {
  touchTargetX = null;
}, { passive: true });

// Window Resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// GAME CORE LOGIC MECHANICS
// ==========================================

function triggerNitro() {
  if (nitroCharge >= 30 && !isBoosting) {
    isBoosting = true;
    boostTimer = BOOST_DURATION;
    nitroCharge = 0;
    
    // Play boost SFX and engine pitch soar
    audio.playBoostSFX();
    
    // Animate boost filling bar HUD
    document.getElementById('boost-bar-fill').classList.add('boosting');
    document.getElementById('boost-status').textContent = 'BOOSTING!';
    document.getElementById('boost-status').classList.add('boost-ready');
  }
}

function handleCollisions() {
  if (!playerCar) return;
  
  const playerX = playerCar.mesh.position.x;
  
  // 1. Check Collisions with Traffic Cars
  for (let i = trafficCars.length - 1; i >= 0; i--) {
    const tc = trafficCars[i];
    
    // Simple bounding proximity checks (Z near 0 is player position)
    if (Math.abs(tc.z) < 1.6 && Math.abs(tc.x - playerX) < 1.35) {
      if (isBoosting) {
        // SMASH OVERDRIVE: Destroy the traffic car and get points!
        scene.remove(tc.mesh);
        trafficCars.splice(i, 1);
        
        // Spawn smash explosion particles
        audio.playCrashSFX();
        
        const spawnPos = new THREE.Vector3(tc.x, 0.4, 0);
        for (let p = 0; p < 25; p++) {
          const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            Math.random() * 10 + 2,
            (Math.random() - 0.5) * 15
          );
          particles.spawn('orange', spawnPos, vel, 0.8);
        }
        
        // Score bonus
        distanceScore += 1000;
        continue;
      } else {
        // Normal collision = game crash
        triggerGameOver();
        return;
      }
    }
  }
  
  // 2. Check Overlaps with Crystals
  for (let i = crystals.length - 1; i >= 0; i--) {
    const cry = crystals[i];
    
    if (Math.abs(cry.z) < 1.4 && Math.abs(cry.x - playerX) < 1.1) {
      // Collect!
      scene.remove(cry.mesh);
      crystals.splice(i, 1);
      
      crystalsCollected++;
      audio.playCollectSFX();
      
      // Update charge
      if (!isBoosting) {
        nitroCharge = Math.min(100, nitroCharge + 15);
      }
      
      // Spark particles burst
      const spawnPos = new THREE.Vector3(cry.x, 0.6, 0);
      for (let p = 0; p < 15; p++) {
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          Math.random() * 6 + 1,
          (Math.random() - 0.5) * 8
        );
        particles.spawn('cyan', spawnPos, vel, 0.5);
      }
      
      // Points bonus
      distanceScore += 500;
    }
  }
}

// Reset entire level state for restart
function resetGame() {
  // Clear scene arrays
  trafficCars.forEach(tc => scene.remove(tc.mesh));
  trafficCars.length = 0;
  
  crystals.forEach(cry => scene.remove(cry.mesh));
  crystals.length = 0;
  
  particles.clear();
  
  // Reset values
  distanceScore = 0;
  crystalsCollected = 0;
  nitroCharge = 0;
  isBoosting = false;
  boostTimer = 0;
  speed = 0.0;
  touchTargetX = null;
  
  // Reset Player car positioning
  if (playerCar) {
    playerCar.mesh.position.set(0, 0, 0);
    playerCar.mesh.rotation.set(0, 0, 0);
    playerCar.x = 0;
  }
  
  trafficSpawnTimer = 0;
  crystalSpawnTimer = 0;
  
  // UI Hud values reset
  document.getElementById('boost-bar-fill').style.width = '0%';
  document.getElementById('boost-bar-fill').classList.remove('boosting');
  document.getElementById('boost-status').textContent = 'CHARGING';
  document.getElementById('boost-status').classList.remove('boost-ready');
}

function triggerGameOver() {
  currentGameState = GAME_STATE.GAMEOVER;
  audio.playCrashSFX();
  audio.stopBGM();
  
  // Collision debris explosion
  if (playerCar) {
    const crashPos = new THREE.Vector3(playerCar.mesh.position.x, 0.4, 0);
    for (let p = 0; p < 50; p++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        Math.random() * 15 + 3,
        (Math.random() - 0.5) * 22
      );
      particles.spawn('pink', crashPos, vel, 1.2);
      particles.spawn('white', crashPos, vel.multiplyScalar(0.7), 0.8);
    }
    
    // Hide car during crash representation
    playerCar.mesh.position.y = -50;
  }
  
  // Check High Score
  if (distanceScore > highScore) {
    highScore = distanceScore;
    localStorage.setItem('neon_horizon_highscore', highScore);
  }
  
  // Reveal Game over Screen
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('final-score').textContent = Math.floor(distanceScore);
  document.getElementById('final-crystals').textContent = crystalsCollected;
  document.getElementById('high-score').textContent = Math.floor(highScore);
  document.getElementById('game-over-screen').classList.remove('hidden');
}

// ==========================================
// RENDER & UPDATE TICK LOOP
// ==========================================

function update(dt) {
  if (currentGameState === GAME_STATE.PLAYING) {
    // 1. Calculate Target Speeds (depending on keys pressed)
    let targetSpeed = BASE_SPEED;
    if (keyboard.up) targetSpeed = MAX_PLAYER_SPEED;
    else if (keyboard.down) targetSpeed = MIN_PLAYER_SPEED;
    
    if (isBoosting) {
      targetSpeed = MAX_PLAYER_SPEED + 15.0; // Break limit!
      boostTimer -= dt;
      
      // Shake camera relative to extreme boost vibration
      camera.position.x += (Math.random() - 0.5) * 0.12;
      camera.position.y += (Math.random() - 0.5) * 0.12;
      
      // Exhaust Flame scales and glows
      playerCar.flameMat.opacity = 0.85 + Math.sin(clock.getElapsedTime() * 45) * 0.15;
      playerCar.flames.forEach(f => {
        const factor = 1.0 + Math.sin(clock.getElapsedTime() * 30) * 0.15;
        f.scale.set(factor, factor, factor);
      });
      
      if (boostTimer <= 0) {
        isBoosting = false;
        playerCar.flameMat.opacity = 0.0;
        document.getElementById('boost-bar-fill').classList.remove('boosting');
        document.getElementById('boost-status').classList.remove('boost-ready');
        document.getElementById('boost-status').textContent = 'CHARGING';
      }
    } else {
      playerCar.flameMat.opacity = 0.0;
    }
    
    // Interpolate player speed class
    speed += (targetSpeed - speed) * 4.0 * dt;
    
    // Scale distance based on speed and difficulty multipliers
    distanceScore += speed * dt * 10 * difficultyMultiplier;
    
    // 2. Handle Player Car Movement & Steering
    let steerVelocity = 0.0;
    if (keyboard.left) {
      steerVelocity = -6.8;
    } else if (keyboard.right) {
      steerVelocity = 6.8;
    }
    
    if (touchTargetX !== null) {
      // Interpolate steering towards touch/mouse position
      const diff = touchTargetX - playerCar.mesh.position.x;
      playerCar.mesh.position.x += diff * 12.0 * dt;
      // Synthesize fake steer velocity for tilting
      steerVelocity = Math.max(-6.8, Math.min(6.8, diff * 10));
    } else {
      playerCar.mesh.position.x += steerVelocity * dt;
    }
    
    // Lock player within road borders
    playerCar.mesh.position.x = Math.max(-5.2, Math.min(5.2, playerCar.mesh.position.x));
    
    // Apply realistic roll/yaw tilts on turns
    playerCar.mesh.rotation.z = -steerVelocity * 0.025; // Roll
    playerCar.mesh.rotation.y = -steerVelocity * 0.015; // Yaw
    
    // Animate spinning wheels
    const rotSpeed = speed * dt * 2.2;
    playerCar.wheels.forEach(w => w.rotation.x -= rotSpeed);
    
    // 3. Environment updates (Move background stars & scroll grid road)
    const worldScrollingOffset = speed * dt * difficultyMultiplier;
    if (roadTexture) {
      roadTexture.offset.y -= worldScrollingOffset * 0.015;
    }
    
    // Scroll Mountains
    mountainSegments.forEach(seg => {
      seg.left.position.z += worldScrollingOffset;
      seg.right.position.z += worldScrollingOffset;
      
      // Reset segment loop when it passes camera (Z coord > 130)
      if (seg.left.position.z > 130) {
        seg.left.position.z -= 500;
        seg.right.position.z -= 500;
      }
    });
    
    // Parallax background stars drifting
    starParticles.forEach(star => {
      star.position.z += worldScrollingOffset * 0.05; // Stars move slower
      if (star.position.z > 10) {
        star.position.z = -240 - Math.random() * 20;
        star.position.x = (Math.random() - 0.5) * 120;
      }
    });
    
    // 4. Emitters (Exhaust Particle generation)
    if (clock.getElapsedTime() > 0.02) {
      const isShift = isBoosting ? 4 : 1;
      for (let j = 0; j < isShift; j++) {
        playerCar.exhausts.forEach(ex => {
          const worldExPos = new THREE.Vector3();
          ex.getWorldPosition(worldExPos);
          
          const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            Math.random() * 1.2,
            Math.random() * 3 + (isBoosting ? 12 : 4) // Spray backwards
          );
          
          particles.spawn(
            isBoosting ? 'cyan' : 'orange', 
            worldExPos, 
            vel, 
            isBoosting ? 0.6 : 0.35
          );
        });
      }
    }
    
    // 5. Spawn Entities (Traffic and Collectibles)
    trafficSpawnTimer -= dt;
    if (trafficSpawnTimer <= 0) {
      spawnTrafficCar();
      // Spawn timer scales with difficulty class
      trafficSpawnTimer = (1.1 + Math.random() * 1.4) / difficultyMultiplier;
    }
    
    crystalSpawnTimer -= dt;
    if (crystalSpawnTimer <= 0) {
      spawnCrystal();
      crystalSpawnTimer = 1.0 + Math.random() * 1.5;
    }
    
    // 6. Update Traffic Obstacles
    for (let i = trafficCars.length - 1; i >= 0; i--) {
      const tc = trafficCars[i];
      // Relative movement: towards player
      tc.z += (worldScrollingOffset - tc.speed * dt);
      tc.mesh.position.z = tc.z;
      
      // Floating hover bobbing
      tc.mesh.position.y = 0.08 * Math.sin(clock.getElapsedTime() * 5 + tc.bobOffset);
      
      if (tc.z > 15) {
        scene.remove(tc.mesh);
        trafficCars.splice(i, 1);
      }
    }
    
    // 7. Update Crystals
    for (let i = crystals.length - 1; i >= 0; i--) {
      const cry = crystals[i];
      cry.z += worldScrollingOffset;
      cry.mesh.position.z = cry.z;
      
      // Rotate and hover animation
      cry.mesh.rotation.y += dt * 2.5;
      cry.mesh.position.y = 0.75 + Math.sin(clock.getElapsedTime() * 6) * 0.15;
      
      if (cry.z > 15) {
        scene.remove(cry.mesh);
        crystals.splice(i, 1);
      }
    }
    
    // Collision checking
    handleCollisions();
    
    // 8. Update HUD metrics
    document.getElementById('score-val').textContent = String(Math.floor(distanceScore)).padStart(5, '0');
    document.getElementById('crystals-val').textContent = crystalsCollected;
    
    const displaySpeed = Math.floor(speed * 4.8 * difficultyMultiplier);
    document.getElementById('speed-val').textContent = displaySpeed;
    
    // Boost bar fill
    if (!isBoosting) {
      document.getElementById('boost-bar-fill').style.width = `${nitroCharge}%`;
      if (nitroCharge >= 30) {
        document.getElementById('boost-status').textContent = 'READY (SPACE)';
        document.getElementById('boost-status').classList.add('boost-ready');
      } else {
        document.getElementById('boost-status').textContent = 'CHARGING';
        document.getElementById('boost-status').classList.remove('boost-ready');
      }
    } else {
      const boostPercent = (boostTimer / BOOST_DURATION) * 100;
      document.getElementById('boost-bar-fill').style.width = `${boostPercent}%`;
    }
    
    // Synth engine frequency update
    audio.updateEngine(speed / MAX_PLAYER_SPEED, isBoosting);
  }
  
  // 9. Camera positioning (Smooth tracking behind player)
  if (playerCar && currentGameState !== GAME_STATE.GAMEOVER) {
    const targetCamZ = 6.2 + (isBoosting ? 2.5 : 0.0); // Pull back when boosting
    const targetCamY = 2.4 + (isBoosting ? 0.3 : 0.0); // Pull higher when boosting
    
    // Follow with lag
    const curPlayerX = playerCar.mesh.position.x;
    camera.position.x += (curPlayerX * 0.68 - camera.position.x) * 6.5 * dt;
    camera.position.z += (targetCamZ - camera.position.z) * 5.0 * dt;
    camera.position.y += (targetCamY - camera.position.y) * 5.0 * dt;
    
    // Camera looks slightly ahead of player
    const lookAtX = curPlayerX * 0.45;
    camera.lookAt(lookAtX, 0.8, -12);
    
    // Dynamic tilt roll of camera based on steering direction
    camera.rotation.z = - (curPlayerX - camera.position.x) * 0.02;
    
    // FOV zooms out under boost speed
    const targetFov = isBoosting ? 75 : 60;
    if (camera.fov !== targetFov) {
      camera.fov += (targetFov - camera.fov) * 5 * dt;
      camera.updateProjectionMatrix();
    }
  } else if (currentGameState === GAME_STATE.GAMEOVER) {
    // Cinematic camera drift around crash wreckage
    camera.position.x += 1.8 * dt;
    camera.lookAt(0, 0.4, 0);
  }
  
  // Update overall particle list
  particles.update(dt);
}

function animate() {
  requestAnimationFrame(animate);
  
  const dt = Math.min(clock.getDelta(), 0.1); // Cap delta to avoid extreme steps on background tab freeze
  update(dt);
  
  renderer.render(scene, camera);
}

// ==========================================
// SCENE INITIALIZATION & SETUP
// ==========================================

function initGame() {
  createSkyBackground();
  createRoad();
  createMountains();
  setupLights();
  createPlayer();
  
  // Start animate loop
  animate();
}

// Run initial scene builds
initGame();

// ==========================================
// MENU INTERACTIVE UI BUTTONS
// ==========================================

// Handle Speed Class Multiplier choice
const diffButtons = document.querySelectorAll('.diff-btn');
diffButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    diffButtons.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    difficultyMultiplier = parseFloat(e.target.getAttribute('data-speed'));
  });
});

// Launch game from start menu
const startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', () => {
  // Start Audio Context on user event interaction (browser autoplay bypass)
  audio.init();
  audio.setMuted(audio.isMuted);
  
  // Transition screens
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  
  currentGameState = GAME_STATE.PLAYING;
  clock.getDelta(); // Clear elapsed history
});

// Reboot / Restart game loop
const restartBtn = document.getElementById('restart-btn');
restartBtn.addEventListener('click', () => {
  resetGame();
  
  document.getElementById('game-over-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  
  // Restore car visibility
  if (playerCar) playerCar.mesh.position.y = 0;
  
  // Trigger audio loop reboot
  audio.startBGM();
  
  currentGameState = GAME_STATE.PLAYING;
  clock.getDelta();
});

// Audio mute/unmute toggles
const audioToggleBtn = document.getElementById('audio-toggle');
const audioIcon = document.getElementById('audio-icon');

// Initialize visual toggle state from memory
const currentMutedVal = localStorage.getItem('neon_horizon_muted');
const startsMuted = currentMutedVal !== 'false';
audioIcon.textContent = startsMuted ? '🔇' : '🔊';

audioToggleBtn.addEventListener('click', () => {
  audio.init(); // ensure initialized
  const targetMuted = !audio.isMuted;
  audio.setMuted(targetMuted);
  
  audioIcon.textContent = targetMuted ? '🔇' : '🔊';
});
