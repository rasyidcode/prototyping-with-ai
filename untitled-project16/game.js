// Game Configuration & Constants
const SCREEN_WIDTH = 480;
const SCREEN_HEIGHT = 800;
const ROAD_MAX_X = 90; // Boundary limit of road in world space
const CAMERA_DEPTH = 250; // Focal length / screen depth
const HORIZON_Y = 280; // Y coordinate of horizon on screen
const GROUND_Y = 780; // Y coordinate of bottom of road on screen
const BASE_FORWARD_SPEED = 7.5;

// Audio Context State
let audioCtx = null;
let bgmIntervalId = null;
let soundEnabled = true;

// Player & Game State
let gameState = 'MENU'; // MENU, RUNNING, BOSS_FIGHT, GAMEOVER
let currentLevel = 1;
let totalCoins = 0;
let levelCoinsEarned = 0;
let playerX = 0; // Current steering position in world space
let targetPlayerX = 0;
let playerZ = 0; // Distance traveled along the road
let levelLength = 4000;
let gameSpeed = 0;
let winState = false;

// Upgrades State (Levels 1 to 7)
let upgArmyLvl = 1;
let upgPowerLvl = 1;
let upgCoinsLvl = 1;

// Upgrade details
const UPGRADE_MAX = 7;
const UPGRADE_ARMY_VALS = [1, 3, 5, 8, 12, 18, 25];
const UPGRADE_ARMY_COSTS = [50, 100, 220, 450, 800, 1500, 0];
const UPGRADE_POWER_VALS = [1, 2, 3, 5, 8, 12, 20];
const UPGRADE_POWER_COSTS = [75, 150, 300, 550, 900, 1800, 0];
const UPGRADE_COIN_VALS = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
const UPGRADE_COIN_COSTS = [100, 200, 400, 800, 1400, 2500, 0];

// Entity Managers
let stickmen = [];
let roadEntities = []; // Gates, obstacles, rivals, castle, boss
let sceneryEntities = []; // Side poles, road lines, stars
let particles = [];
let floatingTexts = [];

// Touch & Mouse Control
let isDragging = false;
let startDragX = 0;
let startPlayerX = 0;

// Camera configuration
const camera = {
  x: 0,
  z: 0,
  targetX: 0,
  shake: 0
};

// Canvas References
let canvas, ctx;

// Synthwave Sun Animation
let sunCycle = 0;

// Dom Elements
const menuScreen = document.getElementById('menu-screen');
const resultScreen = document.getElementById('result-screen');
const tutorialOverlay = document.getElementById('tutorial-overlay');
const playBtn = document.getElementById('play-btn');
const restartBtn = document.getElementById('restart-btn');
const continueBtn = document.getElementById('continue-btn');
const soundToggleBtn = document.getElementById('sound-toggle');
const soundOnIcon = document.getElementById('sound-on-icon');
const soundOffIcon = document.getElementById('sound-off-icon');

// HUD elements
const hudCrowdCount = document.getElementById('hud-crowd-count');
const hudLevelText = document.getElementById('hud-level-text');
const hudProgressBar = document.getElementById('level-progress-bar');
const hudCoinCount = document.getElementById('hud-coin-count');

// Upgrade buttons & text
const menuCoinCount = document.getElementById('menu-coin-count');
const upgArmyLvlText = document.getElementById('upg-army-lvl');
const upgArmyCost = document.getElementById('upg-army-cost');
const upgArmyBtn = document.getElementById('upg-army-btn');

const upgPowerLvlText = document.getElementById('upg-power-lvl');
const upgPowerCost = document.getElementById('upg-power-cost');
const upgPowerBtn = document.getElementById('upg-power-btn');

const upgCoinsLvlText = document.getElementById('upg-coins-lvl');
const upgCoinsCost = document.getElementById('upg-coins-cost');
const upgCoinsBtn = document.getElementById('upg-coins-btn');

// Result Screen details
const resultTitle = document.getElementById('result-title');
const resultSubtitle = document.getElementById('result-subtitle');
const statArmySize = document.getElementById('stat-army-size');
const statCoinsEarned = document.getElementById('stat-coins-earned');

// Initialize Game
window.onload = function() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  
  // Set dimensions
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Load Saved Progress
  loadSaveData();
  updateShopUI();

  // Setup Event Listeners
  setupInputListeners();
  
  // Start Main Loop
  requestAnimationFrame(gameLoop);

  // Setup stars in scenery
  initStars();
};

// Projection Math: Convert 3D world coords to 2D screen coords
function project(worldX, worldY, worldZ) {
  // relative Z to camera
  const relativeZ = worldZ - camera.z;
  
  // If behind camera, return offscreen coordinates
  if (relativeZ <= 0) {
    return { x: -9999, y: -9999, scale: 0 };
  }
  
  const scale = CAMERA_DEPTH / (relativeZ + CAMERA_DEPTH);
  const relativeX = worldX - camera.x;
  
  const screenX = (SCREEN_WIDTH / 2) + (relativeX * scale * 2.2);
  const screenY = HORIZON_Y + (GROUND_Y - HORIZON_Y) * scale - (worldY * scale * 2.2);
  
  return {
    x: screenX,
    y: screenY,
    scale: scale
  };
}

// ----------------------------------------------------
// ENTITY CLASSES
// ----------------------------------------------------

class Stickman {
  constructor(x, z, isRival = false) {
    this.x = x;
    this.z = z;
    this.y = 0; // Ground height
    this.vx = 0;
    this.vz = 0;
    this.vy = 0; // Vertical velocity for falling/jumping
    this.isRival = isRival;
    this.radius = 4;
    this.height = 20;
    this.color = isRival ? '#ff007f' : '#00f0ff';
    this.runCycle = Math.random() * Math.PI * 2;
    this.state = 'RUNNING'; // RUNNING, FALLING, DEAD, CHARGING
    this.damage = 1;
  }

  update() {
    if (this.state === 'DEAD') return;

    if (this.state === 'FALLING') {
      this.vy -= 0.5; // Gravity
      this.y += this.vy;
      this.z += gameSpeed * 0.3; // keep moving forward slightly
      if (this.y < -300) {
        this.state = 'DEAD';
      }
      return;
    }

    // Animation cycle
    this.runCycle += (gameSpeed * 0.05 + 0.1);

    if (!this.isRival) {
      // Flocking mechanics for Player Army
      let targetX = playerX;
      let targetZ = playerZ;

      if (gameState === 'BOSS_FIGHT') {
        // Charging the King Boss at the end of the track
        targetX = 0;
        targetZ = levelLength + 150;
      }

      // 1. Move towards target
      let dx = targetX - this.x;
      let dz = targetZ - this.z;
      
      // Dynamic spacing depending on army size
      const maxSpread = Math.min(60, 15 + Math.sqrt(stickmen.length) * 4);

      // Simple attraction
      this.vx += dx * 0.04;
      this.vz += dz * 0.04;

      // 2. Repel from other friendly stickmen
      for (let other of stickmen) {
        if (other === this || other.state !== 'RUNNING') continue;
        let rx = this.x - other.x;
        let rz = this.z - other.z;
        let distSq = rx * rx + rz * rz;
        let minD = 12; // Avoid overlaps
        if (distSq < minD * minD && distSq > 0.01) {
          let dist = Math.sqrt(distSq);
          let force = (minD - dist) * 0.15;
          this.vx += (rx / dist) * force;
          this.vz += (rz / dist) * force;
        }
      }

      // Clamp velocities
      const maxV = 8;
      const speedSq = this.vx * this.vx + this.vz * this.vz;
      if (speedSq > maxV * maxV) {
        let s = Math.sqrt(speedSq);
        this.vx = (this.vx / s) * maxV;
        this.vz = (this.vz / s) * maxV;
      }

      // Update positions
      this.x += this.vx;
      this.z += this.vz;

      // Dampen velocity
      this.vx *= 0.7;
      this.vz *= 0.7;

      // Fall off road check
      let currentLaneW = getRoadWidthAtZ(this.z);
      if (Math.abs(this.x) > currentLaneW) {
        // Falling off edge!
        this.state = 'FALLING';
        this.vy = 2; // Jump up slightly before falling
        playGatePassSound(false);
      }
    } else {
      // Rival behavior
      if (this.state === 'CHARGING') {
        // Run towards player crowd center
        let dx = playerX - this.x;
        let dz = playerZ - this.z;
        let dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.01) {
          this.x += (dx / dist) * 2.5;
          this.z += (dz / dist) * 2.5;
        }
      }
      // Simple drift logic to stay inside lane if idle
      let currentLaneW = getRoadWidthAtZ(this.z);
      if (this.x < -currentLaneW + 10) this.x += 1;
      if (this.x > currentLaneW - 10) this.x -= 1;
    }
  }

  draw() {
    const proj = project(this.x, this.y, this.z);
    if (proj.scale <= 0 || proj.x < -50 || proj.x > SCREEN_WIDTH + 50 || proj.y < -50 || proj.y > SCREEN_HEIGHT + 100) {
      return;
    }

    const scale = proj.scale;
    const wX = proj.x;
    const wY = proj.y;

    const r = this.radius * scale * 2.2;
    const h = this.height * scale * 2.2;

    if (h < 2) return; // Too small

    ctx.save();
    ctx.lineWidth = Math.max(1.5, 3 * scale);
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    
    // Add light glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8 * scale;

    // Running cycle angles
    const speedFactor = this.state === 'FALLING' ? 0.3 : 1;
    const swing = Math.sin(this.runCycle) * 0.6 * speedFactor;
    const cosSwing = Math.cos(this.runCycle) * 0.6 * speedFactor;

    // 1. Head
    const headY = wY - h;
    const headRadius = r * 0.7;
    ctx.beginPath();
    ctx.arc(wX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Spine / Torso
    const pelvisY = wY - h * 0.35;
    ctx.beginPath();
    ctx.moveTo(wX, headY + headRadius);
    ctx.lineTo(wX, pelvisY);
    ctx.stroke();

    // 3. Arms
    const shoulderY = headY + headRadius + 2;
    const armLen = h * 0.35;
    // Arm 1
    ctx.beginPath();
    ctx.moveTo(wX, shoulderY);
    ctx.lineTo(wX + Math.sin(swing) * armLen, shoulderY + Math.cos(swing) * armLen);
    ctx.stroke();
    // Arm 2
    ctx.beginPath();
    ctx.moveTo(wX, shoulderY);
    ctx.lineTo(wX + Math.sin(-swing) * armLen, shoulderY + Math.cos(-swing) * armLen);
    ctx.stroke();

    // 4. Legs
    const legLen = h * 0.45;
    if (this.state === 'FALLING') {
      // Flailing legs
      ctx.beginPath();
      ctx.moveTo(wX, pelvisY);
      ctx.lineTo(wX - r * 1.5, pelvisY + legLen * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wX, pelvisY);
      ctx.lineTo(wX + r * 1.5, pelvisY + legLen * 0.8);
      ctx.stroke();
    } else {
      // Leg 1
      ctx.beginPath();
      ctx.moveTo(wX, pelvisY);
      const kneeX1 = wX + swing * r * 2;
      const kneeY1 = pelvisY + legLen * 0.5;
      const footX1 = kneeX1 + cosSwing * r;
      const footY1 = wY;
      ctx.lineTo(kneeX1, kneeY1);
      ctx.lineTo(footX1, footY1);
      ctx.stroke();

      // Leg 2
      ctx.beginPath();
      ctx.moveTo(wX, pelvisY);
      const kneeX2 = wX - swing * r * 2;
      const kneeY2 = pelvisY + legLen * 0.5;
      const footX2 = kneeX2 - cosSwing * r;
      const footY2 = wY;
      ctx.lineTo(kneeX2, kneeY2);
      ctx.lineTo(footX2, footY2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// Interactive objects on road
class Gate {
  constructor(z, leftSide) {
    this.z = z;
    this.leftSide = leftSide; // True for left, False for right lane
    this.width = 65;
    this.x = leftSide ? -45 : 45;
    this.height = 70;
    this.active = true;

    // Generate random operator
    // 0: Addition, 1: Multiplication, 2: Subtraction, 3: Division
    const rand = Math.random();
    if (rand < 0.45) {
      this.op = '+';
      this.val = Math.floor(Math.random() * 15) + 5 + Math.floor(currentLevel * 1.5);
    } else if (rand < 0.7) {
      this.op = 'x';
      this.val = Math.random() < 0.65 ? 2 : 3;
    } else if (rand < 0.88) {
      this.op = '-';
      this.val = Math.floor(Math.random() * 8) + 3 + Math.floor(currentLevel * 0.8);
    } else {
      this.op = '÷';
      this.val = 2;
    }

    // Determine colors
    this.isPositive = (this.op === '+' || this.op === 'x');
    this.color = this.isPositive ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 0, 127, 0.25)';
    this.strokeColor = this.isPositive ? '#00f0ff' : '#ff007f';
  }

  checkCollision() {
    if (!this.active) return;
    
    // Check if player is crossing the gate Z threshold
    if (playerZ >= this.z - 15 && playerZ <= this.z + 15) {
      // Check if crowd matches horizontal limits
      // Calculate how many stickmen pass through this gate
      // If majority of crowd matches this side, trigger gate.
      // E.g. playerX is on the same side
      const fitsLeft = (playerX < 0 && this.leftSide);
      const fitsRight = (playerX >= 0 && !this.leftSide);

      if (fitsLeft || fitsRight) {
        this.active = false;
        // Deactivate peer gate at the same Z coordinate
        for (let other of roadEntities) {
          if (other instanceof Gate && other !== this && Math.abs(other.z - this.z) < 1.0) {
            other.active = false;
          }
        }
        applyGateMath(this.op, this.val, this.x, this.z);
        // Play audio
        playGatePassSound(this.isPositive);
      }
    }
  }

  draw() {
    if (!this.active) return;
    const proj = project(this.x, 0, this.z);
    
    if (proj.scale <= 0) return;
    const scale = proj.scale;
    const wX = proj.x;
    const wY = proj.y;

    const w = this.width * scale * 2.2;
    const h = this.height * scale * 2.2;

    ctx.save();
    
    // Draw gate base gradient
    const grad = ctx.createLinearGradient(wX - w/2, wY - h, wX - w/2, wY);
    grad.addColorStop(0, this.color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    
    ctx.shadowColor = this.strokeColor;
    ctx.shadowBlur = 15 * scale;
    
    // Border arch
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(wX - w/2, wY);
    ctx.lineTo(wX - w/2, wY - h + 10 * scale);
    ctx.quadraticCurveTo(wX - w/2, wY - h, wX - w/2 + 10 * scale, wY - h);
    ctx.lineTo(wX + w/2 - 10 * scale, wY - h);
    ctx.quadraticCurveTo(wX + w/2, wY - h, wX + w/2, wY - h + 10 * scale);
    ctx.lineTo(wX + w/2, wY);
    ctx.fill();
    ctx.stroke();

    // Draw text inside arch
    const fontStr = `bold ${Math.floor(18 * scale * 2.2)}px 'Bungee', sans-serif`;
    ctx.font = fontStr;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10 * scale;
    ctx.fillText(`${this.op}${this.val}`, wX, wY - h * 0.5);

    ctx.restore();
  }
}

class Obstacle {
  constructor(z, type) {
    this.z = z;
    this.type = type; // 'SPIN_BLADE', 'PENDULUM', 'NARROW_BRIDGE'
    this.x = 0;
    this.r = 25;
    this.rotation = 0;
    this.swing = 0;
    this.active = true;

    if (type === 'SPIN_BLADE') {
      this.x = (Math.random() - 0.5) * 80;
      this.moveSpeed = 1 + Math.random() * 2;
      this.moveDirection = Math.random() < 0.5 ? -1 : 1;
      this.r = 20;
    } else if (type === 'PENDULUM') {
      this.x = 0;
      this.swingSpeed = 0.02 + Math.random() * 0.02;
      this.r = 15;
      this.chainLength = 180;
    } else if (type === 'NARROW_BRIDGE') {
      this.r = 0; // Collision handled differently
      this.length = 350; // Z span
    }
  }

  update() {
    if (this.type === 'SPIN_BLADE') {
      this.rotation += 0.2;
      // Oscillate left right
      this.x += this.moveDirection * this.moveSpeed;
      let wLimit = getRoadWidthAtZ(this.z) - this.r;
      if (Math.abs(this.x) > wLimit) {
        this.moveDirection *= -1;
        this.x = Math.max(-wLimit, Math.min(wLimit, this.x));
      }
    } else if (this.type === 'PENDULUM') {
      this.swing += this.swingSpeed;
      // swing ranges from -Math.PI/3 to Math.PI/3
      const angle = Math.sin(this.swing) * (Math.PI / 2.5);
      this.x = Math.sin(angle) * this.chainLength * 0.45; // projected swing width
    }

    // Check collision with player army stickmen
    if (this.type === 'NARROW_BRIDGE') {
      // Width shrinking logic is handled globally in getRoadWidthAtZ
      return;
    }

    for (let s of stickmen) {
      if (s.state !== 'RUNNING') continue;
      
      let obY = 0;
      if (this.type === 'PENDULUM') {
        const angle = Math.sin(this.swing) * (Math.PI / 2.5);
        obY = (1 - Math.cos(angle)) * this.chainLength * 0.25; // rise of axe
      }

      let dx = s.x - this.x;
      let dz = s.z - this.z;
      let dy = s.y - obY;
      let distSq = dx * dx + dz * dz + dy * dy;
      
      const collideDist = this.r + s.radius;
      if (distSq < collideDist * collideDist) {
        s.state = 'DEAD';
        spawnParticles(s.x, s.y + 10, s.z, '#00f0ff', 8);
        camera.shake = 8;
        playClashSound();
      }
    }
  }

  draw() {
    const proj = project(this.x, 0, this.z);
    if (proj.scale <= 0) return;
    const scale = proj.scale;
    const wX = proj.x;
    const wY = proj.y;

    ctx.save();

    if (this.type === 'SPIN_BLADE') {
      const radius = this.r * scale * 2.2;
      
      ctx.translate(wX, wY);
      ctx.rotate(this.rotation);

      // Shadow/Glow
      ctx.shadowColor = '#ff5f00';
      ctx.shadowBlur = 10 * scale;

      // Draw metallic blade circle
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#ff7b00';
      ctx.lineWidth = Math.max(2, 3 * scale);
      
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sharp serrated teeth
      const teethCount = 8;
      ctx.fillStyle = '#ff7b00';
      for (let i = 0; i < teethCount; i++) {
        ctx.rotate((Math.PI * 2) / teethCount);
        ctx.beginPath();
        ctx.moveTo(radius - 2, -radius * 0.1);
        ctx.lineTo(radius + 6 * scale, 0);
        ctx.lineTo(radius - 2, radius * 0.1);
        ctx.closePath();
        ctx.fill();
      }

      // Blade center
      ctx.fillStyle = '#090a15';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.stroke();

    } else if (this.type === 'PENDULUM') {
      // Swing center origin is at X=0, Y=sky, Z=z
      const skyProj = project(0, 220, this.z);
      const angle = Math.sin(this.swing) * (Math.PI / 2.5);
      
      // Calculate axe world coords
      const axeY = 220 - Math.cos(angle) * this.chainLength;
      const axeX = Math.sin(angle) * this.chainLength;
      
      const axeProj = project(axeX, axeY, this.z);
      
      if (skyProj.scale > 0 && axeProj.scale > 0) {
        // Draw Chain
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = Math.max(1, 2 * axeProj.scale);
        ctx.beginPath();
        ctx.moveTo(skyProj.x, skyProj.y);
        ctx.lineTo(axeProj.x, axeProj.y);
        ctx.stroke();

        // Draw Axe Blade
        ctx.save();
        ctx.translate(axeProj.x, axeProj.y);
        ctx.rotate(angle);

        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12 * axeProj.scale;
        
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(1, 2 * axeProj.scale);

        // Blade crescent
        const bladeSize = this.r * axeProj.scale * 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, bladeSize, -Math.PI/3, Math.PI/3);
        ctx.quadraticCurveTo(-bladeSize * 0.2, bladeSize * 0.5, 0, 0);
        ctx.quadraticCurveTo(-bladeSize * 0.2, -bladeSize * 0.5, 0, -bladeSize * 0.866);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    } else if (this.type === 'NARROW_BRIDGE') {
      // Highlight the bridge segment
      // Handled visually in road drawing, but draw a subtle warning barricade at entry
      const startProj = project(0, 0, this.z);
      if (startProj.scale > 0) {
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = Math.max(2, 5 * startProj.scale);
        ctx.shadowColor = '#e11d48';
        ctx.shadowBlur = 10 * startProj.scale;
        
        // Barricade indicators
        const w = 90 * startProj.scale * 2.2;
        ctx.beginPath();
        ctx.moveTo(startProj.x - w/2, startProj.y);
        ctx.lineTo(startProj.x - w/6, startProj.y - 12 * startProj.scale);
        ctx.moveTo(startProj.x + w/2, startProj.y);
        ctx.lineTo(startProj.x + w/6, startProj.y - 12 * startProj.scale);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

class RivalCrowd {
  constructor(z, armySize) {
    this.z = z;
    this.size = armySize;
    this.x = 0;
    this.active = true;
    this.rivals = [];
    this.charging = false;

    // Spawn rivals in cluster
    for (let i = 0; i < this.size; i++) {
      let rX = (Math.random() - 0.5) * 50;
      let rZ = this.z + (Math.random() - 0.5) * 40;
      this.rivals.push(new Stickman(rX, rZ, true));
    }
  }

  update() {
    if (!this.active) return;

    // Start charging when player gets close
    if (!this.charging && Math.abs(playerZ - this.z) < 220) {
      this.charging = true;
      for (let r of this.rivals) {
        r.state = 'CHARGING';
      }
    }

    // Update active rivals
    for (let r of this.rivals) {
      r.update();
    }

    // Handle collision clashes between Player stickmen and Rival stickmen
    for (let p of stickmen) {
      if (p.state !== 'RUNNING') continue;

      for (let r of this.rivals) {
        if (r.state !== 'RUNNING' && r.state !== 'CHARGING') continue;

        let dx = p.x - r.x;
        let dz = p.z - r.z;
        let dSq = dx * dx + dz * dz;

        if (dSq < 16 * 16) {
          // Clash elimination! Both die
          p.state = 'DEAD';
          r.state = 'DEAD';
          
          spawnParticles((p.x + r.x)/2, 10, (p.z + r.z)/2, '#ff007f', 6);
          spawnParticles((p.x + r.x)/2, 10, (p.z + r.z)/2, '#00f0ff', 6);
          
          camera.shake = Math.min(15, camera.shake + 2.5);
          playClashSound();
          break; // Outer loop break is handled automatically because p is now dead
        }
      }
    }

    // Filter dead rivals
    this.rivals = this.rivals.filter(r => r.state !== 'DEAD');

    if (this.rivals.length === 0) {
      this.active = false;
    }
  }

  draw() {
    if (!this.active) return;
    
    // Sort rivals by Z for proper 3D rendering
    this.rivals.sort((a, b) => b.z - a.z);
    
    for (let r of this.rivals) {
      r.draw();
    }

    // Draw standard overhead size label
    if (this.rivals.length > 0) {
      const leader = this.rivals[0];
      const proj = project(this.x, 30, this.z);
      if (proj.scale > 0) {
        ctx.save();
        ctx.font = `bold ${Math.floor(13 * proj.scale * 2.2)}px var(--font-body)`;
        ctx.fillStyle = '#ff007f';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 6 * proj.scale;
        ctx.fillText(this.rivals.length, proj.x, proj.y);
        ctx.restore();
      }
    }
  }
}

class Castle {
  constructor(z) {
    this.z = z;
    this.bossMaxHp = 50 + currentLevel * 30;
    this.bossHp = this.bossMaxHp;
    this.bossX = 0;
    this.bossY = 0;
    this.bossScale = 5.0; // Giant size
    this.bossState = 'IDLE'; // IDLE, HURT, DEAD
    this.bossHurtTimer = 0;
    this.bossRunCycle = 0;
    this.castleHpWidth = 140;
    this.celebrated = false;
  }

  update() {
    if (this.bossState === 'DEAD') {
      if (!this.celebrated) {
        this.celebrated = true;
        winState = true;
        levelCoinsEarned = Math.floor((50 + currentLevel * 20) * UPGRADE_COIN_VALS[upgCoinsLvl-1]);
        totalCoins += levelCoinsEarned;
        saveProgress();
        
        // Victory effects
        playVictorySound();
        spawnConfetti();
        
        // Transition UI screen after delay
        setTimeout(() => {
          endGame(true);
        }, 2200);
      }
      return;
    }

    // Trigger Boss Fight state when player gets within range
    if (gameState === 'RUNNING' && Math.abs(playerZ - this.z) < 140) {
      gameState = 'BOSS_FIGHT';
      gameSpeed = 0; // stop forward background scrolling
    }

    if (this.bossHurtTimer > 0) {
      this.bossHurtTimer--;
      if (this.bossHurtTimer === 0) this.bossState = 'IDLE';
    }

    // Boss damage calculation by player stickmen
    if (gameState === 'BOSS_FIGHT') {
      // Loop player army and clash them with boss
      for (let s of stickmen) {
        if (s.state !== 'RUNNING') continue;
        
        let dx = s.x - this.bossX;
        let dz = s.z - (this.z + 100);
        let distSq = dx * dx + dz * dz;

        if (distSq < (25 * 25)) {
          // Sacrifice stickman to damage boss
          s.state = 'DEAD';
          spawnParticles(s.x, s.y + 15, s.z, '#00f0ff', 10);
          
          let dmg = UPGRADE_POWER_VALS[upgPowerLvl - 1];
          this.bossHp -= dmg;
          this.bossState = 'HURT';
          this.bossHurtTimer = 10;
          
          // Spawn damage floating text
          spawnFloatingText(`-${dmg}`, this.bossX + (Math.random() - 0.5) * 20, 90, this.z + 100, '#ef4444', 24);
          
          playBossHurtSound();
          camera.shake = 12;

          if (this.bossHp <= 0) {
            this.bossHp = 0;
            this.bossState = 'DEAD';
            spawnParticles(this.bossX, 50, this.z + 100, '#ff007f', 40);
            camera.shake = 25;
            break;
          }
        }
      }
    }
  }

  draw() {
    const proj = project(0, 0, this.z);
    if (proj.scale <= 0) return;
    const scale = proj.scale;
    const wX = proj.x;
    const wY = proj.y;

    ctx.save();

    // 1. Draw Castle Wall Background
    const wallW = 400 * scale * 2.2;
    const wallH = 180 * scale * 2.2;

    ctx.shadowBlur = 10 * scale;
    ctx.shadowColor = '#475569';
    
    // Draw walls
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(2, 4 * scale);

    ctx.beginPath();
    ctx.moveTo(wX - wallW / 2, wY);
    ctx.lineTo(wX - wallW / 2, wY - wallH);
    // Castellations / Battlements
    let step = wallW / 13;
    for (let i = 0; i < 13; i++) {
      let curX = wX - wallW/2 + i * step;
      ctx.lineTo(curX, wY - wallH - (i % 2 === 0 ? 15 * scale : 0));
      ctx.lineTo(curX + step, wY - wallH - (i % 2 === 0 ? 15 * scale : 0));
    }
    ctx.lineTo(wX + wallW / 2, wY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Castle Gate door
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = Math.max(1, 2 * scale);
    const gateW = 80 * scale * 2.2;
    const gateH = 90 * scale * 2.2;
    ctx.beginPath();
    ctx.moveTo(wX - gateW/2, wY);
    ctx.lineTo(wX - gateW/2, wY - gateH + 20 * scale);
    ctx.quadraticCurveTo(wX - gateW/2, wY - gateH, wX, wY - gateH);
    ctx.quadraticCurveTo(wX + gateW/2, wY - gateH, wX + gateW/2, wY - gateH + 20 * scale);
    ctx.lineTo(wX + gateW/2, wY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // 2. Draw Giant King Stickman
    if (this.bossState !== 'DEAD') {
      const bossProj = project(this.bossX, this.bossY, this.z + 100);
      if (bossProj.scale > 0) {
        const bScale = bossProj.scale * this.bossScale;
        const bx = bossProj.x;
        const by = bossProj.y;

        const r = 4 * bScale * 2.2;
        const h = 20 * bScale * 2.2;

        ctx.save();
        ctx.lineWidth = Math.max(3, 5 * bossProj.scale);
        
        const bColor = this.bossState === 'HURT' ? '#ef4444' : '#ff007f';
        ctx.strokeStyle = bColor;
        ctx.fillStyle = bColor;
        ctx.shadowColor = bColor;
        ctx.shadowBlur = 20 * bossProj.scale;

        // Animate idle breath
        const idleSwing = Math.sin(Date.now() * 0.005) * 0.1;

        // Head
        const headY = by - h;
        const headR = r * 0.7;
        ctx.beginPath();
        ctx.arc(bx, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // King's Golden Crown
        ctx.fillStyle = '#eab308';
        ctx.strokeStyle = '#eab308';
        ctx.shadowBlur = 15 * bossProj.scale;
        ctx.beginPath();
        ctx.moveTo(bx - headR * 1.1, headY - headR * 0.7);
        ctx.lineTo(bx - headR * 0.8, headY - headR * 1.5);
        ctx.lineTo(bx - headR * 0.3, headY - headR * 1.0);
        ctx.lineTo(bx, headY - headR * 1.8);
        ctx.lineTo(bx + headR * 0.3, headY - headR * 1.0);
        ctx.lineTo(bx + headR * 0.8, headY - headR * 1.5);
        ctx.lineTo(bx + headR * 1.1, headY - headR * 0.7);
        ctx.closePath();
        ctx.fill();

        // Restore body strokes
        ctx.strokeStyle = bColor;
        ctx.fillStyle = bColor;

        // Spine
        const pelvisY = by - h * 0.35;
        ctx.beginPath();
        ctx.moveTo(bx, headY + headR);
        ctx.lineTo(bx, pelvisY);
        ctx.stroke();

        // Arms (holding giant sword)
        const shoulderY = headY + headR + 4;
        ctx.beginPath();
        ctx.moveTo(bx, shoulderY);
        ctx.lineTo(bx - r * 2.5, shoulderY + r * 1.5);
        ctx.moveTo(bx, shoulderY);
        ctx.lineTo(bx + r * 2.5, shoulderY + r * 1.5);
        ctx.stroke();

        // Giant Sword
        ctx.save();
        ctx.translate(bx - r * 2.5, shoulderY + r * 1.5);
        ctx.rotate(-Math.PI / 4 + idleSwing);
        
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#fff';
        ctx.shadowColor = '#e2e8f0';
        ctx.shadowBlur = 10 * bossProj.scale;
        
        // Blade
        ctx.beginPath();
        ctx.rect(-2 * bossProj.scale, -45 * bossProj.scale, 4 * bossProj.scale, 45 * bossProj.scale);
        ctx.fill();
        ctx.stroke();
        // Guard / Hilt
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-6 * bossProj.scale, -3 * bossProj.scale, 12 * bossProj.scale, 3 * bossProj.scale);
        ctx.restore();

        // Legs
        ctx.beginPath();
        ctx.moveTo(bx, pelvisY);
        ctx.lineTo(bx - r * 1.5, by);
        ctx.moveTo(bx, pelvisY);
        ctx.lineTo(bx + r * 1.5, by);
        ctx.stroke();

        ctx.restore();

        // Boss Health Bar Overlay
        const hpBarW = this.castleHpWidth * bossProj.scale;
        const hpBarH = 10 * bossProj.scale;
        const barX = bx - hpBarW / 2;
        const barY = headY - 40 * bossProj.scale;

        ctx.save();
        // Background black
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, barY, hpBarW, hpBarH);
        
        // Fill red HP
        const hpPct = Math.max(0, this.bossHp / this.bossMaxHp);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(barX, barY, hpBarW * hpPct, hpBarH);
        
        // Draw HP text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(10 * bossProj.scale * 2.2)}px var(--font-body)`;
        ctx.textAlign = 'center';
        ctx.fillText(`KING STICKMAN: ${this.bossHp}/${this.bossMaxHp}`, bx, barY - 6 * bossProj.scale);
        ctx.restore();
      }
    }
  }
}

// Visual Effects
class Particle {
  constructor(x, y, z, color, isConfetti = false) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.color = color;
    this.isConfetti = isConfetti;
    
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = isConfetti ? (Math.random() * 4 + 4) : (Math.random() * 6 - 2);
    this.vz = (Math.random() - 0.5) * 8;

    this.gravity = isConfetti ? -0.15 : -0.25;
    this.life = 0;
    this.maxLife = Math.floor(Math.random() * 30) + 20;
    this.size = Math.random() * 3 + 2;
    this.alpha = 1.0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
    this.vy += this.gravity;
    
    this.life++;
    this.alpha = 1.0 - (this.life / this.maxLife);
    if (this.y < 0) {
      this.y = 0;
      this.vy = -this.vy * 0.4; // Bounce
      this.vx *= 0.8;
      this.vz *= 0.8;
    }
  }

  draw() {
    const proj = project(this.x, this.y, this.z);
    if (proj.scale <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10 * proj.scale;
    ctx.shadowColor = this.color;
    
    const sz = this.size * proj.scale * 2.2;
    if (this.isConfetti) {
      ctx.fillRect(proj.x - sz/2, proj.y - sz/2, sz, sz);
    } else {
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, sz, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class FloatingText {
  constructor(text, x, y, z, color, size = 18) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.z = z;
    this.color = color;
    this.size = size;
    this.life = 0;
    this.maxLife = 40;
    this.vy = 1.5;
  }

  update() {
    this.y += this.vy;
    this.life++;
  }

  draw() {
    const proj = project(this.x, this.y, this.z);
    if (proj.scale <= 0) return;
    
    ctx.save();
    const alpha = 1.0 - (this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.font = `bold ${Math.floor(this.size * proj.scale * 2.2)}px 'Bungee', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, proj.x, proj.y);
    ctx.restore();
  }
}

// Side road indicators for depth
class SidePole {
  constructor(z, leftSide) {
    this.z = z;
    this.leftSide = leftSide;
    this.height = 80;
    this.color = '#38bdf8';
  }

  draw() {
    // The pole stands at the edge of the road
    const laneW = getRoadWidthAtZ(this.z);
    const x = this.leftSide ? -laneW - 5 : laneW + 5;
    
    const baseProj = project(x, 0, this.z);
    const topProj = project(x, this.height, this.z);

    if (baseProj.scale <= 0) return;

    ctx.save();
    
    // Light glow styling
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, 2 * baseProj.scale);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10 * baseProj.scale;
    
    // Pole line
    ctx.beginPath();
    ctx.moveTo(baseProj.x, baseProj.y);
    ctx.lineTo(topProj.x, topProj.y);
    ctx.stroke();

    // Small glowing lamp sphere on top
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(topProj.x, topProj.y, 4 * topProj.scale * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Star decoration background
const starCoords = [];
function initStars() {
  for (let i = 0; i < 60; i++) {
    starCoords.push({
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * HORIZON_Y,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random()
    });
  }
}

function getRoadWidthAtZ(z) {
  // Check if we are inside a NARROW_BRIDGE segment
  for (let e of roadEntities) {
    if (e instanceof Obstacle && e.type === 'NARROW_BRIDGE') {
      const bridgeStart = e.z;
      const bridgeEnd = e.z + e.length;
      
      // Interpolate width on approach/exit
      const transitionLen = 100;
      if (z >= bridgeStart && z <= bridgeEnd) {
        // Core bridge narrow zone
        return 22; // Very narrow
      } else if (z >= bridgeStart - transitionLen && z < bridgeStart) {
        // Entering transition
        let pct = (z - (bridgeStart - transitionLen)) / transitionLen; // 0 to 1
        return ROAD_MAX_X - pct * (ROAD_MAX_X - 22);
      } else if (z > bridgeEnd && z <= bridgeEnd + transitionLen) {
        // Exiting transition
        let pct = (z - bridgeEnd) / transitionLen; // 0 to 1
        return 22 + pct * (ROAD_MAX_X - 22);
      }
    }
  }
  return ROAD_MAX_X;
}

// ----------------------------------------------------
// CORE PHYSICS & SIMULATION INTERFACE
// ----------------------------------------------------

function applyGateMath(op, val, gateX, gateZ) {
  const currentCount = stickmen.length;
  let targetCount = currentCount;

  if (op === '+') {
    targetCount = currentCount + val;
  } else if (op === 'x') {
    targetCount = currentCount * val;
  } else if (op === '-') {
    targetCount = Math.max(0, currentCount - val);
  } else if (op === '÷') {
    targetCount = Math.max(0, Math.floor(currentCount / val));
  }

  // Adjust army sizes
  const difference = targetCount - currentCount;
  
  if (difference > 0) {
    // Limit spawn bursts to avoid heavy lag, but update the logic representation
    const spawnVisualLimit = Math.min(difference, 40);
    for (let i = 0; i < spawnVisualLimit; i++) {
      let spawnOffset = 25;
      let sX = gateX + (Math.random() - 0.5) * spawnOffset;
      let sZ = gateZ + (Math.random() - 0.5) * spawnOffset;
      stickmen.push(new Stickman(sX, sZ));
    }
    // Handle the remaining count if we exceeded the visual limit
    if (difference > spawnVisualLimit) {
      const rest = difference - spawnVisualLimit;
      for (let i = 0; i < rest; i++) {
        stickmen.push(new Stickman(playerX + (Math.random() - 0.5) * 30, playerZ + (Math.random() - 0.5) * 10));
      }
    }
    // Spawn floating feedback numbers
    spawnFloatingText(`+${difference}`, gateX, 35, gateZ, '#00f0ff', 22);
  } else if (difference < 0) {
    const removeCount = Math.abs(difference);
    // Mark random stickmen as dead
    for (let i = 0; i < removeCount; i++) {
      if (stickmen.length === 0) break;
      const index = Math.floor(Math.random() * stickmen.length);
      const s = stickmen[index];
      s.state = 'DEAD';
      spawnParticles(s.x, s.y + 10, s.z, '#ff007f', 4);
      stickmen.splice(index, 1);
    }
    spawnFloatingText(`-${removeCount}`, gateX, 35, gateZ, '#ff007f', 22);
  }
}

function spawnParticles(x, y, z, color, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, z, color));
  }
}

function spawnConfetti() {
  for (let i = 0; i < 50; i++) {
    let pX = (Math.random() - 0.5) * 120;
    let pY = Math.random() * 50 + 60;
    let pZ = levelLength + 100;
    const colors = ['#39ff14', '#00f0ff', '#ff007f', '#ffb703', '#a855f7'];
    const randColor = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(pX, pY, pZ, randColor, true));
  }
}

function spawnFloatingText(text, x, y, z, color, size) {
  floatingTexts.push(new FloatingText(text, x, y, z, color, size));
}

// Procedural Level Generation
function generateLevel(levelNum) {
  roadEntities = [];
  sceneryEntities = [];
  stickmen = [];
  particles = [];
  floatingTexts = [];
  
  playerX = 0;
  targetPlayerX = 0;
  playerZ = 0;
  
  levelLength = 3200 + levelNum * 800;

  // Camera settings
  camera.x = 0;
  camera.z = -120;
  camera.targetX = 0;

  // 1. Spawning Side Lights/Poles for depth along entire length
  for (let z = 100; z < levelLength; z += 180) {
    // Left side pole, right side pole
    sceneryEntities.push(new SidePole(z, true));
    sceneryEntities.push(new SidePole(z, false));
  }

  // 2. Procedural elements distribution (Z starting from 500 up to levelLength - 500)
  let nextElementZ = 550;
  while (nextElementZ < levelLength - 400) {
    const rand = Math.random();

    if (rand < 0.35) {
      // Spawn Gate Pair
      roadEntities.push(new Gate(nextElementZ, true));
      roadEntities.push(new Gate(nextElementZ, false));
      nextElementZ += 550;
    } else if (rand < 0.65) {
      // Spawn Obstacle
      const typeRand = Math.random();
      if (typeRand < 0.4) {
        roadEntities.push(new Obstacle(nextElementZ, 'SPIN_BLADE'));
      } else if (typeRand < 0.75) {
        roadEntities.push(new Obstacle(nextElementZ, 'PENDULUM'));
      } else {
        // Bridges are longer, push next element out
        roadEntities.push(new Obstacle(nextElementZ, 'NARROW_BRIDGE'));
        nextElementZ += 200; // bridge length offsets
      }
      nextElementZ += 450;
    } else {
      // Spawn Rivals
      const crowdScale = 6 + Math.floor(levelNum * 2.8);
      roadEntities.push(new RivalCrowd(nextElementZ, crowdScale));
      nextElementZ += 500;
    }
  }

  // 3. Castle & Boss at the End
  roadEntities.push(new Castle(levelLength));

  // 4. Starting Army spawning based on shop upgrade
  const startingCount = UPGRADE_ARMY_VALS[upgArmyLvl - 1];
  for (let i = 0; i < startingCount; i++) {
    // Ring dispersion formula around player start (0,0)
    let angle = (i / startingCount) * Math.PI * 2;
    let radius = Math.sqrt(Math.random()) * 20;
    let px = Math.sin(angle) * radius;
    let pz = Math.cos(angle) * radius * 0.5; // squeeze z dispersion
    stickmen.push(new Stickman(px, pz));
  }

  // Reset Level HUD info
  hudLevelText.textContent = `LVL ${levelNum}`;
  hudProgressBar.style.width = '0%';
}

// ----------------------------------------------------
// GRAPHICS RENDER LOOP
// ----------------------------------------------------

function gameLoop() {
  updateGamePhysics();
  drawScene();
  requestAnimationFrame(gameLoop);
}

function updateGamePhysics() {
  if (gameState === 'RUNNING') {
    // Accelerate to base speed
    gameSpeed += (BASE_FORWARD_SPEED - gameSpeed) * 0.1;
    playerZ += gameSpeed;

    // Follow camera
    camera.z += (playerZ - 120 - camera.z) * 0.1;
    
    // Steering player
    playerX += (targetPlayerX - playerX) * 0.15;
    camera.targetX = playerX * 0.6;
    camera.x += (camera.targetX - camera.x) * 0.1;

    // Boundary clamp player position
    const currentW = getRoadWidthAtZ(playerZ);
    if (Math.abs(targetPlayerX) > currentW - 10) {
      targetPlayerX = Math.sign(targetPlayerX) * (currentW - 10);
    }

    // Update level progress bar
    const progress = Math.min(100, (playerZ / levelLength) * 100);
    hudProgressBar.style.width = `${progress}%`;

    // Fail state: If everyone died
    if (stickmen.length === 0) {
      triggerDefeat();
    }
  } else if (gameState === 'BOSS_FIGHT') {
    // Decelerate speed to 0
    gameSpeed *= 0.9;
    
    // Shift camera slightly closer to watch boss fight
    camera.z += (levelLength - 180 - camera.z) * 0.05;
    camera.x += (0 - camera.x) * 0.05;

    // Check defeat during boss fight
    if (stickmen.length === 0 && !winState) {
      // Wait shortly to verify if king was also defeated
      setTimeout(() => {
        const castleObj = roadEntities.find(e => e instanceof Castle);
        if (castleObj && castleObj.bossHp > 0 && gameState === 'BOSS_FIGHT') {
          triggerDefeat();
        }
      }, 500);
    }
  } else {
    // In menu or gameover, speed is zero
    gameSpeed = 0;
  }

  // Decelerate camera shake
  if (camera.shake > 0) camera.shake *= 0.9;

  // Update Stickmen Crowd
  for (let s of stickmen) {
    s.update();
  }
  // Filter dead stickmen
  stickmen = stickmen.filter(s => s.state !== 'DEAD');
  hudCrowdCount.textContent = stickmen.length;

  // Update Elements on Road
  for (let e of roadEntities) {
    if (e.update) e.update();
    if (e instanceof Gate) e.checkCollision();
  }

  // Update Particles
  for (let p of particles) {
    p.update();
  }
  particles = particles.filter(p => p.alpha > 0);

  // Update Floating text
  for (let ft of floatingTexts) {
    ft.update();
  }
  floatingTexts = floatingTexts.filter(ft => ft.life < ft.maxLife);

  // Rotate synthwave sun cycle
  sunCycle += 0.01;
}

function drawScene() {
  ctx.save();
  
  // Camera Shake transformation
  if (camera.shake > 0.5) {
    let shakeX = (Math.random() - 0.5) * camera.shake;
    let shakeY = (Math.random() - 0.5) * camera.shake;
    ctx.translate(shakeX, shakeY);
  }

  // 1. Draw Sky Background
  ctx.fillStyle = '#090a15';
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  
  const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  skyGrad.addColorStop(0, '#0c0728');
  skyGrad.addColorStop(0.5, '#1e0847');
  skyGrad.addColorStop(1, '#ff0055');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, SCREEN_WIDTH, HORIZON_Y);

  // 2. Draw Stars
  ctx.fillStyle = '#ffffff';
  for (let star of starCoords) {
    ctx.globalAlpha = star.alpha * (0.5 + 0.5 * Math.sin(Date.now() * 0.002 + star.alpha * 10));
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1.0;

  // 3. Draw Synthwave Retro Sun at horizon
  const sunR = 85;
  const sunX = SCREEN_WIDTH / 2 - camera.x * 0.2; // slight parallax
  const sunY = HORIZON_Y;
  
  ctx.save();
  const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY);
  sunGrad.addColorStop(0, '#ff007f');
  sunGrad.addColorStop(0.5, '#f59e0b');
  sunGrad.addColorStop(1, '#ffeb3b');
  ctx.fillStyle = sunGrad;
  
  ctx.shadowColor = '#ff007f';
  ctx.shadowBlur = 30;
  
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, Math.PI, 0); // half circle above horizon
  ctx.fill();
  ctx.restore();

  // Sun horizontal scan lines
  ctx.fillStyle = '#0c0728';
  for (let i = 1; i < 9; i++) {
    let lineH = 2.5 + i * 0.6;
    let lineY = HORIZON_Y - (i * 9) - (sunCycle * 12) % 9;
    if (lineY > HORIZON_Y - sunR) {
      ctx.fillRect(sunX - sunR - 10, lineY, sunR * 2 + 20, lineH);
    }
  }

  // 4. Draw Horizon glowing divider
  const horizonGrad = ctx.createLinearGradient(0, HORIZON_Y - 2, 0, HORIZON_Y + 5);
  horizonGrad.addColorStop(0, '#ff007f');
  horizonGrad.addColorStop(0.5, '#00f0ff');
  horizonGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = horizonGrad;
  ctx.fillRect(0, HORIZON_Y - 2, SCREEN_WIDTH, 7);

  // 5. Draw Road Surface
  // Road projects from z = camera.z to z = camera.z + 1000
  const segmentStep = 40;
  const viewDistance = 1000;
  const startZ = Math.floor(camera.z / segmentStep) * segmentStep;
  
  // Draw floor backdrop
  ctx.fillStyle = '#07080f';
  ctx.fillRect(0, HORIZON_Y, SCREEN_WIDTH, GROUND_Y - HORIZON_Y);

  // Draw perspective grid / lines along the road
  for (let z = startZ + viewDistance; z >= startZ; z -= segmentStep) {
    if (z < camera.z) continue;

    const rW1 = getRoadWidthAtZ(z);
    const rW2 = getRoadWidthAtZ(z + segmentStep);

    const proj1 = project(0, 0, z);
    const proj2 = project(0, 0, z + segmentStep);

    if (proj1.scale <= 0 || proj2.scale <= 0) continue;

    const w1 = rW1 * proj1.scale * 2.2;
    const w2 = rW2 * proj2.scale * 2.2;

    // Alternating road tiles for high speed visual feedback
    ctx.fillStyle = (Math.floor(z / segmentStep) % 2 === 0) ? '#111324' : '#0e101d';
    
    ctx.beginPath();
    ctx.moveTo(proj1.x - w1, proj1.y);
    ctx.lineTo(proj2.x - w2, proj2.y);
    ctx.lineTo(proj2.x + w2, proj2.y);
    ctx.lineTo(proj1.x + w1, proj1.y);
    ctx.closePath();
    ctx.fill();

    // Side Borders (neon rails)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = Math.max(1, 2 * proj1.scale);
    ctx.shadowBlur = 8 * proj1.scale;
    ctx.shadowColor = '#00f0ff';

    ctx.beginPath();
    ctx.moveTo(proj1.x - w1, proj1.y);
    ctx.lineTo(proj2.x - w2, proj2.y);
    ctx.stroke();

    ctx.strokeStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.beginPath();
    ctx.moveTo(proj1.x + w1, proj1.y);
    ctx.lineTo(proj2.x + w2, proj2.y);
    ctx.stroke();
    
    // Clear shadow blur for next elements
    ctx.shadowBlur = 0;

    // Draw dashed lane dividers in the middle
    if (Math.floor(z / (segmentStep * 2.5)) % 2 === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = Math.max(1.5, 3 * proj1.scale);
      ctx.beginPath();
      ctx.moveTo(proj1.x, proj1.y);
      ctx.lineTo(proj2.x, proj2.y);
      ctx.stroke();
    }
  }

  // 6. Draw Scenery details (Side Light Poles)
  for (let pole of sceneryEntities) {
    if (pole.z > camera.z && pole.z < camera.z + viewDistance) {
      pole.draw();
    }
  }

  // 7. Draw Road Entities (Gates, Obstacles, Rivals, Castle)
  // Sort entities by Z descending so items furthest away draw first (painter's algorithm)
  const renderList = [];
  
  for (let e of roadEntities) {
    if (e.z > camera.z - 50 && e.z < camera.z + viewDistance) {
      renderList.push(e);
    }
  }
  
  // Also include player stickmen in the depth sorting render list
  for (let s of stickmen) {
    if (s.z > camera.z && s.z < camera.z + viewDistance) {
      renderList.push(s);
    }
  }

  renderList.sort((a, b) => b.z - a.z);

  for (let entity of renderList) {
    entity.draw();
  }

  // 8. Draw Particles
  for (let p of particles) {
    p.draw();
  }

  // 9. Draw Floating text overlays
  for (let ft of floatingTexts) {
    ft.draw();
  }

  ctx.restore();
}

// ----------------------------------------------------
// UI, INPUT & UPGRADES STATE HANDLERS
// ----------------------------------------------------

function resizeCanvas() {
  const container = document.getElementById('game-container');
  const rect = container.getBoundingClientRect();
  
  // Set canvas logical coordinates to match the CSS scale
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;
}

function setupInputListeners() {
  // Play button click
  playBtn.addEventListener('click', () => {
    initAudio();
    startGame();
  });

  // Retry / Continue button clicks
  restartBtn.addEventListener('click', () => {
    initAudio();
    startGame();
  });
  
  continueBtn.addEventListener('click', () => {
    initAudio();
    if (winState) {
      currentLevel++;
      saveProgress();
    }
    startGame();
  });

  // Steering Controls
  canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'RUNNING') return;
    isDragging = true;
    startDragX = e.clientX;
    startPlayerX = targetPlayerX;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || gameState !== 'RUNNING') return;
    const deltaX = e.clientX - startDragX;
    
    // Scale delta horizontal speed relative to container size
    const containerW = canvas.clientWidth;
    const movementRatio = deltaX / containerW;
    
    // Update player steering target (clamped)
    const currentW = getRoadWidthAtZ(playerZ);
    targetPlayerX = startPlayerX + movementRatio * (ROAD_MAX_X * 2.3);
    targetPlayerX = Math.max(-currentW + 10, Math.min(currentW - 10, targetPlayerX));
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch Support
  canvas.addEventListener('touchstart', (e) => {
    if (gameState !== 'RUNNING') return;
    isDragging = true;
    startDragX = e.touches[0].clientX;
    startPlayerX = targetPlayerX;
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || gameState !== 'RUNNING') return;
    const deltaX = e.touches[0].clientX - startDragX;
    const containerW = canvas.clientWidth;
    const movementRatio = deltaX / containerW;
    
    const currentW = getRoadWidthAtZ(playerZ);
    targetPlayerX = startPlayerX + movementRatio * (ROAD_MAX_X * 2.3);
    targetPlayerX = Math.max(-currentW + 10, Math.min(currentW - 10, targetPlayerX));
  });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Keyboard Support (A/D & Left/Right Arrows)
  window.addEventListener('keydown', (e) => {
    if (gameState !== 'RUNNING') return;
    const step = 8;
    const currentW = getRoadWidthAtZ(playerZ);
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      targetPlayerX = Math.max(-currentW + 10, targetPlayerX - step);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      targetPlayerX = Math.min(currentW - 10, targetPlayerX + step);
    }
  });

  // Sound Toggle Click
  soundToggleBtn.addEventListener('click', toggleSound);

  // Shop Upgrades Listeners
  upgArmyBtn.addEventListener('click', () => buyUpgrade('ARMY'));
  upgPowerBtn.addEventListener('click', () => buyUpgrade('POWER'));
  upgCoinsBtn.addEventListener('click', () => buyUpgrade('COINS'));
}

function startGame() {
  gameState = 'RUNNING';
  winState = false;
  
  menuScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
  tutorialOverlay.classList.remove('hidden');

  // Generate map
  generateLevel(currentLevel);

  // Update HUD
  hudCoinCount.textContent = totalCoins;
  
  // Stop tutorial prompt after 2.5 seconds
  setTimeout(() => {
    tutorialOverlay.classList.add('hidden');
  }, 3500);

  // Start BGM loop
  startBgm();
}

function triggerDefeat() {
  gameState = 'GAMEOVER';
  winState = false;
  levelCoinsEarned = Math.floor((10 + Math.floor(playerZ / 100)) * UPGRADE_COIN_VALS[upgCoinsLvl-1]);
  totalCoins += levelCoinsEarned;
  saveProgress();
  
  playDefeatSound();
  
  setTimeout(() => {
    endGame(false);
  }, 1000);
}

function endGame(victory) {
  gameState = 'GAMEOVER';
  stopBgm();

  // Populate Statistics
  statArmySize.textContent = stickmen.length;
  statCoinsEarned.textContent = `+${levelCoinsEarned}`;
  
  hudCoinCount.textContent = totalCoins;
  menuCoinCount.textContent = totalCoins;

  if (victory) {
    resultTitle.textContent = "VICTORY!";
    resultTitle.className = "win-title";
    resultSubtitle.textContent = "The Castle has fallen!";
    continueBtn.style.display = "inline-flex";
  } else {
    resultTitle.textContent = "DEFEAT!";
    resultTitle.className = "lose-title";
    resultSubtitle.textContent = "Your crowd was overwhelmed!";
    continueBtn.style.display = "none";
  }

  updateShopUI();
  resultScreen.classList.remove('hidden');
}

// ----------------------------------------------------
// WEB AUDIO SYNTHESIZER SOUND GENERATION
// ----------------------------------------------------

function initAudio() {
  if (audioCtx === null) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume in case browser suspended it
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playGatePassSound(isPositive) {
  if (!soundEnabled || !audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const t = audioCtx.currentTime;
  
  if (isPositive) {
    // Chime: 2 successive minor/major notes rising
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
    
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.25);
  } else {
    // Descending fail chime
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(165, t + 0.2);
    
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}

let lastClashTime = 0;
function playClashSound() {
  if (!soundEnabled || !audioCtx) return;
  const now = Date.now();
  if (now - lastClashTime < 80) return; // Debounce clash sounds to avoid distortion
  lastClashTime = now;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const t = audioCtx.currentTime;
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

  osc.start(t);
  osc.stop(t + 0.09);
}

function playBossHurtSound() {
  if (!soundEnabled || !audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const t = audioCtx.currentTime;
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

  osc.start(t);
  osc.stop(t + 0.3);
}

function playVictorySound() {
  if (!soundEnabled || !audioCtx) return;

  const t = audioCtx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord progression (C4, E4, G4, C5)
  
  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + idx * 0.1);
    
    gain.gain.setValueAtTime(0, t + idx * 0.1);
    gain.gain.linearRampToValueAtTime(0.12, t + idx * 0.1 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.4);
    
    osc.start(t + idx * 0.1);
    osc.stop(t + idx * 0.1 + 0.4);
  });
}

function playDefeatSound() {
  if (!soundEnabled || !audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const t = audioCtx.currentTime;
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.linearRampToValueAtTime(110, t + 0.4);
  osc.frequency.linearRampToValueAtTime(55, t + 0.8);

  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

  osc.start(t);
  osc.stop(t + 0.9);
}

// Synthesized energetic retro BGM sequence loop
let bgmStepIndex = 0;
function startBgm() {
  if (!soundEnabled || !audioCtx) return;
  stopBgm(); // Safeguard duplicates

  const notes = [
    110, 110, 130, 110, 146, 146, 130, 110, // A minor bass line
    98,  98,  110, 98,  116, 116, 98,  82
  ];

  bgmStepIndex = 0;
  bgmIntervalId = setInterval(() => {
    if (!soundEnabled || gameState !== 'RUNNING') return;
    
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(notes[bgmStepIndex % notes.length] / 2, t); // Drop 1 octave for deep bass
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.18);
    
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    
    osc.start(t);
    osc.stop(t + 0.2);

    bgmStepIndex++;
  }, 200); // 150 BPM speed
}

function stopBgm() {
  if (bgmIntervalId) {
    clearInterval(bgmIntervalId);
    bgmIntervalId = null;
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    soundOnIcon.style.display = 'inline';
    soundOffIcon.style.display = 'none';
    initAudio();
    if (gameState === 'RUNNING') startBgm();
  } else {
    soundOnIcon.style.display = 'none';
    soundOffIcon.style.display = 'inline';
    stopBgm();
  }
}

// ----------------------------------------------------
// LOCAL STORAGE & UPGRADE HANDLERS
// ----------------------------------------------------

function saveProgress() {
  localStorage.setItem('stickman_coins', totalCoins);
  localStorage.setItem('stickman_level', currentLevel);
  localStorage.setItem('stickman_upg_army', upgArmyLvl);
  localStorage.setItem('stickman_upg_power', upgPowerLvl);
  localStorage.setItem('stickman_upg_coins', upgCoinsLvl);
}

function loadSaveData() {
  const sCoins = localStorage.getItem('stickman_coins');
  const sLevel = localStorage.getItem('stickman_level');
  const sUpgArmy = localStorage.getItem('stickman_upg_army');
  const sUpgPower = localStorage.getItem('stickman_upg_power');
  const sUpgCoins = localStorage.getItem('stickman_upg_coins');

  if (sCoins !== null) totalCoins = parseInt(sCoins);
  if (sLevel !== null) currentLevel = parseInt(sLevel);
  if (sUpgArmy !== null) upgArmyLvl = parseInt(sUpgArmy);
  if (sUpgPower !== null) upgPowerLvl = parseInt(sUpgPower);
  if (sUpgCoins !== null) upgCoinsLvl = parseInt(sUpgCoins);

  hudCoinCount.textContent = totalCoins;
  menuCoinCount.textContent = totalCoins;
  hudLevelText.textContent = `LVL ${currentLevel}`;
}

function updateShopUI() {
  // Update Coin Displays
  menuCoinCount.textContent = totalCoins;
  hudCoinCount.textContent = totalCoins;

  // ARMY upgrade
  upgArmyLvlText.textContent = `Lvl ${upgArmyLvl}${upgArmyLvl >= UPGRADE_MAX ? ' (MAX)' : ''}`;
  if (upgArmyLvl >= UPGRADE_MAX) {
    upgArmyCost.textContent = 'MAX';
    upgArmyBtn.disabled = true;
  } else {
    const cost = UPGRADE_ARMY_COSTS[upgArmyLvl - 1];
    upgArmyCost.textContent = cost;
    upgArmyBtn.disabled = totalCoins < cost;
  }

  // POWER upgrade
  upgPowerLvlText.textContent = `Lvl ${upgPowerLvl}${upgPowerLvl >= UPGRADE_MAX ? ' (MAX)' : ''}`;
  if (upgPowerLvl >= UPGRADE_MAX) {
    upgPowerCost.textContent = 'MAX';
    upgPowerBtn.disabled = true;
  } else {
    const cost = UPGRADE_POWER_COSTS[upgPowerLvl - 1];
    upgPowerCost.textContent = cost;
    upgPowerBtn.disabled = totalCoins < cost;
  }

  // COINS upgrade
  upgCoinsLvlText.textContent = `Lvl ${upgCoinsLvl}${upgCoinsLvl >= UPGRADE_MAX ? ' (MAX)' : ''}`;
  if (upgCoinsLvl >= UPGRADE_MAX) {
    upgCoinsCost.textContent = 'MAX';
    upgCoinsBtn.disabled = true;
  } else {
    const cost = UPGRADE_COIN_COSTS[upgCoinsLvl - 1];
    upgCoinsCost.textContent = cost;
    upgCoinsBtn.disabled = totalCoins < cost;
  }
}

function buyUpgrade(type) {
  initAudio();
  if (type === 'ARMY' && upgArmyLvl < UPGRADE_MAX) {
    const cost = UPGRADE_ARMY_COSTS[upgArmyLvl - 1];
    if (totalCoins >= cost) {
      totalCoins -= cost;
      upgArmyLvl++;
      playVictorySound();
    }
  } else if (type === 'POWER' && upgPowerLvl < UPGRADE_MAX) {
    const cost = UPGRADE_POWER_COSTS[upgPowerLvl - 1];
    if (totalCoins >= cost) {
      totalCoins -= cost;
      upgPowerLvl++;
      playVictorySound();
    }
  } else if (type === 'COINS' && upgCoinsLvl < UPGRADE_MAX) {
    const cost = UPGRADE_COIN_COSTS[upgCoinsLvl - 1];
    if (totalCoins >= cost) {
      totalCoins -= cost;
      upgCoinsLvl++;
      playVictorySound();
    }
  }

  saveProgress();
  updateShopUI();
}
