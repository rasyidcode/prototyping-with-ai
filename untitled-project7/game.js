/**
 * Zombie Line-Runner: Auto-Shooter
 * Core Game Engine Code
 */

// ==========================================================================
// 1. SOUND GENERATION SYSTEM (Web Audio API Synthesizer)
// ==========================================================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn("Web Audio API not supported on this browser.");
        }
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playShoot() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    playHit() {
        if (!this.ctx || this.muted) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.setValueAtTime(40, now + 0.06);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    playGatePass() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C chord arpeggio
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            gain.gain.setValueAtTime(0, now + idx * 0.05);
            gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.05 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.16);
        });
    }

    playGateShoot() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    playCoin() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5 note
        osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6 note

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    playExplosion() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

        // Add filter to make it sound muffled/boomy
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(40, now + 0.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    playBossAlarm() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const timeOffset = i * 0.25;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now + timeOffset);
            osc.frequency.linearRampToValueAtTime(380, now + timeOffset + 0.12);
            osc.frequency.linearRampToValueAtTime(220, now + timeOffset + 0.24);

            gain.gain.setValueAtTime(0, now + timeOffset);
            gain.gain.linearRampToValueAtTime(0.15, now + timeOffset + 0.02);
            gain.gain.linearRampToValueAtTime(0.15, now + timeOffset + 0.22);
            gain.gain.exponentialRampToValueAtTime(0.01, now + timeOffset + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + timeOffset);
            osc.stop(now + timeOffset + 0.25);
        }
    }

    playVictory() {
        if (!this.ctx || this.muted) return;
        this.resume();

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Beautiful C Major arpeggio
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const triggerTime = now + idx * 0.08;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, triggerTime);

            gain.gain.setValueAtTime(0, triggerTime);
            gain.gain.linearRampToValueAtTime(0.12, triggerTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, triggerTime + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(triggerTime);
            osc.stop(triggerTime + 0.4);
        });
    }
}

const SFX = new SoundEngine();

// ==========================================================================
// 2. DATA / UPGRADE SAVE-STATE MANAGER
// ==========================================================================
const UPGRADE_DATA = {
    fireRate: {
        title: "Fire Rate",
        base: 1.2,
        scale: 0.4,
        costs: [100, 250, 600, 1500, 3500],
        maxLvl: 5,
        unit: "/s"
    },
    damage: {
        title: "Bullet Damage",
        base: 10,
        scale: 5,
        costs: [150, 350, 800, 2000, 4500],
        maxLvl: 5,
        unit: ""
    },
    shield: {
        title: "Starting Shield",
        base: 0,
        scale: 40,
        costs: [200, 450, 1000, 2500, 5000],
        maxLvl: 5,
        unit: " HP"
    },
    coinMult: {
        title: "Coin Multiplier",
        base: 1.0,
        scale: 0.25,
        costs: [250, 500, 1200, 3000, 6000],
        maxLvl: 5,
        unit: "x"
    }
};

class SaveStateManager {
    constructor() {
        this.coins = 0;
        this.levelUnlocked = 1;
        this.upgrades = {
            fireRate: 1, // Current Level (1-5)
            damage: 1,
            shield: 1,
            coinMult: 1
        };
        this.load();
    }

    load() {
        try {
            const data = localStorage.getItem('zombie_runner_save');
            if (data) {
                const parsed = JSON.parse(data);
                this.coins = parsed.coins || 0;
                this.levelUnlocked = parsed.levelUnlocked || 1;
                this.upgrades = { ...this.upgrades, ...parsed.upgrades };
            }
        } catch (e) {
            console.error("Error loading save state", e);
        }
    }

    save() {
        try {
            const data = {
                coins: this.coins,
                levelUnlocked: this.levelUnlocked,
                upgrades: this.upgrades
            };
            localStorage.setItem('zombie_runner_save', JSON.stringify(data));
        } catch (e) {
            console.error("Error writing save state", e);
        }
    }

    getStatValue(statName) {
        const data = UPGRADE_DATA[statName];
        const lvl = this.upgrades[statName];
        return data.base + (lvl - 1) * data.scale;
    }

    getUpgradeCost(statName) {
        const lvl = this.upgrades[statName];
        const data = UPGRADE_DATA[statName];
        if (lvl >= data.maxLvl) return Infinity;
        return data.costs[lvl - 1];
    }

    buyUpgrade(statName) {
        const cost = this.getUpgradeCost(statName);
        if (this.coins >= cost) {
            this.coins -= cost;
            this.upgrades[statName]++;
            this.save();
            return true;
        }
        return false;
    }
}

const SAVE_STATE = new SaveStateManager();

// ==========================================================================
// 3. LEVELS DATABASE DEFINITION
// ==========================================================================
const LEVELS = [
    {
        num: 1,
        name: "Outbreak Suburbs",
        length: 1000,
        zombieHpMin: 5,
        zombieHpMax: 15,
        bgTheme: {
            road: '#34495e',
            grid: '#1abc9c',
            scenery: '#27ae60', // Grass green sides
            sky: '#0f172a'
        },
        boss: {
            name: "Goliath Spitter",
            hp: 1200,
            color: '#1abc9c',
            attackPattern: 'spits'
        }
    },
    {
        num: 2,
        name: "Toxic Waste Facility",
        length: 1200,
        zombieHpMin: 12,
        zombieHpMax: 35,
        bgTheme: {
            road: '#1a1f2c',
            grid: '#a855f7',
            scenery: '#1b3b22', // Dark bio-waste green
            sky: '#0a0a14'
        },
        boss: {
            name: "Toxic Abomination",
            hp: 2800,
            color: '#bf5af2',
            attackPattern: 'acid_spits'
        }
    },
    {
        num: 3,
        name: "Neon Quarantine Zone",
        length: 1500,
        zombieHpMin: 25,
        zombieHpMax: 70,
        bgTheme: {
            road: '#111827',
            grid: '#f43f5e',
            scenery: '#030712', // Pure black skyscrapers backdrop
            sky: '#090514'
        },
        boss: {
            name: "Sire of Screams",
            hp: 5500,
            color: '#ff375f',
            attackPattern: 'screams'
        }
    },
    {
        num: 4,
        name: "Scorched Highway",
        length: 1800,
        zombieHpMin: 50,
        zombieHpMax: 130,
        bgTheme: {
            road: '#45322b',
            grid: '#f97316',
            scenery: '#7c2d12', // Dusty red rock landscape
            sky: '#140c0a'
        },
        boss: {
            name: "Juggernaut Crasher",
            hp: 11000,
            color: '#ff9f0a',
            attackPattern: 'charges'
        }
    },
    {
        num: 5,
        name: "Alien Hive Core",
        length: 2200,
        zombieHpMin: 90,
        zombieHpMax: 260,
        bgTheme: {
            road: '#2b0f19',
            grid: '#ec4899',
            scenery: '#4d0725', // Deep purple glowing matrix organic nest
            sky: '#1a030d'
        },
        boss: {
            name: "Vile Hive Empress",
            hp: 24000,
            color: '#ff4f8b',
            attackPattern: 'hive_spikes'
        }
    }
];

// ==========================================================================
// 4. ENTITY ENGINE CLASSES (Bullets, Gates, Zombies, Boss, Particles)
// ==========================================================================

class Bullet {
    constructor(x, y, angle, damage, range) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.damage = damage;
        this.range = range;
        this.speed = 14;
        this.vx = Math.sin(angle) * this.speed;
        this.vy = -Math.cos(angle) * this.speed;
        this.width = 6;
        this.height = 18;
        this.dead = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Travel range check
        const dist = Math.hypot(this.x - this.startX, this.y - this.startY);
        if (dist > this.range || this.y < 0) {
            this.dead = true;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Neon core
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        ctx.restore();
    }
}

class Gate {
    constructor(y, lane, type, modifier, value) {
        this.y = y; // Relative track position
        this.lane = lane; // 0: Left, 1: Right (gates spawn in pairs: x centers = 145 and 315)
        this.type = type; // 'FIRE_RATE', 'DAMAGE', 'BULLETS', 'SHIELD'
        this.modifier = modifier; // '+', 'x', '-'
        this.value = value;
        this.width = 150;
        this.height = 36;
        this.x = lane === 0 ? 135 : 325; // 0 -> left side, 1 -> right side
        
        this.flashTimer = 0;
        this.destroyed = false;
        
        this.setupDisplay();
    }

    setupDisplay() {
        // Human friendly title
        const map = {
            'FIRE_RATE': 'FIRE RATE',
            'DAMAGE': 'DAMAGE',
            'BULLETS': 'BULLETS',
            'SHIELD': 'SHIELD'
        };
        this.label = map[this.type];
    }

    getDisplayText() {
        const valStr = Number(this.value.toFixed(1));
        return `${this.modifier}${valStr} ${this.label}`;
    }

    isPositive() {
        return this.modifier === '+' || this.modifier === 'x';
    }

    shootUpgrade(dmg) {
        this.flashTimer = 5;
        SFX.playGateShoot();
        
        // Increase values satisfyingly!
        if (this.isPositive()) {
            if (this.modifier === '+') {
                this.value += 0.2; // Add fire rate / damage slowly
            } else if (this.modifier === 'x') {
                this.value += 0.05; // Multiplier increments
            }
        } else {
            // Negative trap gates: Shooting them DECREASES their negative impact!
            if (this.modifier === '-') {
                this.value -= 0.5;
                if (this.value <= 0) {
                    this.destroyed = true; // Completely blow up the trap gate
                }
            }
        }
    }

    update(playerRunSpeed) {
        if (this.flashTimer > 0) this.flashTimer--;
    }

    render(ctx, drawY) {
        if (this.destroyed) return;
        
        ctx.save();
        
        const isPos = this.isPositive();
        const baseColor = isPos ? '57, 255, 20' : '255, 49, 49'; // green or red
        const glowBlur = this.flashTimer > 0 ? 25 : 12;
        
        // Draw Glass gate portal backdrop
        ctx.shadowColor = `rgba(${baseColor}, 0.7)`;
        ctx.shadowBlur = glowBlur;
        ctx.fillStyle = `rgba(${baseColor}, ${this.flashTimer > 0 ? 0.35 : 0.15})`;
        ctx.strokeStyle = `rgba(${baseColor}, 0.8)`;
        ctx.lineWidth = 3;
        
        // Rounded portal gate
        ctx.beginPath();
        ctx.roundRect(this.x - this.width/2, drawY - this.height/2, this.width, this.height, 12);
        ctx.fill();
        ctx.stroke();

        // Highlighting borders
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Inside Text details
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px var(--font-outfit)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getDisplayText(), this.x, drawY);

        ctx.restore();
    }
}

class Zombie {
    constructor(x, y, maxHp, speed, type) {
        this.x = x;
        this.y = y;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.speed = speed; // moves downwards
        this.type = type; // 'normal', 'runner', 'fat'
        
        this.dead = false;
        this.flashTimer = 0;
        this.bobTimer = Math.random() * 100;
        
        // Scale and parameters based on types
        if (type === 'runner') {
            this.radius = 16;
            this.color = '#ff3b30'; // vibrant neon red
            this.speedMult = 1.6;
        } else if (type === 'fat') {
            this.radius = 28;
            this.color = '#af52de'; // chunky toxic violet
            this.speedMult = 0.6;
        } else {
            this.radius = 20;
            this.color = '#34c759'; // undead normal green
            this.speedMult = 1.0;
        }
    }

    damage(dmg) {
        this.hp -= dmg;
        this.flashTimer = 6;
        SFX.playHit();
        if (this.hp <= 0) {
            this.dead = true;
        }
    }

    update(playerRunSpeed) {
        // Fall downwards based on its personal speed + player scrolling movement speed
        this.y += this.speed * this.speedMult + playerRunSpeed;
        this.bobTimer += 0.1;
        
        if (this.flashTimer > 0) this.flashTimer--;
    }

    render(ctx) {
        ctx.save();
        
        const bob = Math.sin(this.bobTimer) * 3;
        const currentY = this.y + bob;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.radius - 2, this.radius * 0.9, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body glow/flash
        if (this.flashTimer > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
        }

        // Draw zombie circular core head
        ctx.beginPath();
        ctx.arc(this.x, currentY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw angry glowing procedural zombie eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x - this.radius*0.35, currentY - this.radius*0.2, 3, 0, Math.PI*2);
        ctx.arc(this.x + this.radius*0.35, currentY - this.radius*0.2, 3, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x - this.radius*0.35, currentY - this.radius*0.2, 1, 0, Math.PI*2);
        ctx.arc(this.x + this.radius*0.35, currentY - this.radius*0.2, 1, 0, Math.PI*2);
        ctx.fill();

        // Draw small custom health bar
        if (this.hp < this.maxHp) {
            const barW = this.radius * 2;
            const barH = 5;
            const barX = this.x - barW / 2;
            const barY = currentY - this.radius - 10;
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(barX, barY, barW, barH);
            
            ctx.fillStyle = '#ff3b30';
            ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
        }

        ctx.restore();
    }
}

class Boss {
    constructor(name, maxHp, color, attackPattern) {
        this.name = name;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.color = color;
        this.attackPattern = attackPattern;
        
        this.x = 230; // Center
        this.y = -150; // Slide down from sky
        this.targetY = 180;
        
        this.width = 180;
        this.height = 100;
        this.radius = 65;
        this.bobTimer = 0;
        
        this.active = false;
        this.dead = false;
        this.flashTimer = 0;
        this.attackCooldown = 150; // frames
        this.shieldActive = false;
        this.shieldHp = 0;
        this.shieldAngle = 0;
    }

    damage(dmg) {
        if (this.shieldActive) {
            this.shieldHp -= dmg;
            this.flashTimer = 4;
            SFX.playHit();
            if (this.shieldHp <= 0) {
                this.shieldActive = false;
                SFX.playExplosion();
            }
            return;
        }

        this.hp -= dmg;
        this.flashTimer = 6;
        SFX.playHit();
        if (this.hp <= 0) {
            this.dead = true;
        }
    }

    update(projectilesList, zombiesList, screenShakeTrigger) {
        if (!this.active) return;
        
        // Slide into screen
        if (this.y < this.targetY) {
            this.y += 2.5;
        } else {
            // General floating bob pattern
            this.bobTimer += 0.04;
            this.y = this.targetY + Math.sin(this.bobTimer) * 12;
            this.x = 230 + Math.cos(this.bobTimer * 0.7) * 45;

            // Handle Shields rotation
            if (this.shieldActive) {
                this.shieldAngle += 0.04;
            }

            // Handle attack triggers
            this.attackCooldown--;
            if (this.attackCooldown <= 0) {
                this.triggerAttack(projectilesList, zombiesList, screenShakeTrigger);
                this.attackCooldown = 120 + Math.random() * 80;
            }
        }

        if (this.flashTimer > 0) this.flashTimer--;
    }

    triggerAttack(projectilesList, zombiesList, screenShakeTrigger) {
        SFX.playBossAlarm();
        
        const attackSelect = Math.random();

        if (attackSelect < 0.35) {
            // 1. Spikes storm targeting player lane
            for (let i = -2; i <= 2; i++) {
                const angle = i * 0.22;
                const spx = this.x;
                const spy = this.y + 40;
                projectilesList.push({
                    x: spx,
                    y: spy,
                    vx: Math.sin(angle) * 6.5,
                    vy: Math.cos(angle) * 6.5,
                    radius: 9,
                    color: '#ff3131',
                    isBossAttack: true,
                    damage: 25
                });
            }
        } else if (attackSelect < 0.7) {
            // 2. Summon runner assistants
            zombiesList.push(new Zombie(this.x - 60, this.y, 40, 2.5, 'runner'));
            zombiesList.push(new Zombie(this.x + 60, this.y, 40, 2.5, 'runner'));
        } else {
            // 3. Shockwave ground slam
            screenShakeTrigger(25);
            this.shieldActive = true;
            this.shieldHp = this.maxHp * 0.08; // 8% barrier
        }
    }

    render(ctx) {
        ctx.save();

        const currentX = this.x;
        const currentY = this.y;

        // Giant shadow below
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(currentX, 680, 110, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Flash or base glowing shield coloring
        if (this.flashTimer > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 30;
        } else {
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 20;
        }

        // Draw mechanical central structure core
        ctx.beginPath();
        ctx.arc(currentX, currentY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw glowing neon spikes on shoulder parts
        ctx.fillStyle = '#ff2d55';
        ctx.beginPath();
        ctx.moveTo(currentX - this.radius, currentY);
        ctx.lineTo(currentX - this.radius - 35, currentY - 20);
        ctx.lineTo(currentX - this.radius - 15, currentY + 30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(currentX + this.radius, currentY);
        ctx.lineTo(currentX + this.radius + 35, currentY - 20);
        ctx.lineTo(currentX + this.radius + 15, currentY + 30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw massive creepy cyclops single eye
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(currentX, currentY - 10, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff3131'; // Red pupil glow
        ctx.shadowColor = '#ff3131';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(currentX, currentY - 10, 8 + Math.abs(Math.sin(this.bobTimer*2))*4, 0, Math.PI * 2);
        ctx.fill();

        // Active Shield ring
        if (this.shieldActive) {
            ctx.save();
            ctx.translate(currentX, currentY);
            ctx.rotate(this.shieldAngle);
            
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 15;
            ctx.lineWidth = 4;
            ctx.setLineDash([40, 30]);
            
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Boss Name & Health bar floating
        const barW = 260;
        const barH = 14;
        const barX = 230 - barW / 2;
        const barY = 55;

        // Backdrop
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(10, 14, 28, 0.7)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX - 10, barY - 25, barW + 20, barH + 34, 10);
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px var(--font-outfit)';
        ctx.textAlign = 'center';
        ctx.fillText(this.name.toUpperCase(), 230, barY - 8);

        // Core Bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(barX, barY, barW, barH);
        
        ctx.fillStyle = '#ff3131';
        ctx.shadowColor = '#ff3131';
        ctx.shadowBlur = 8;
        ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);

        ctx.restore();
    }
}

// Particle Engine
class Particle {
    constructor(x, y, color, speedScale = 1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 4 + 2;
        this.vx = (Math.random() - 0.5) * 8 * speedScale;
        this.vy = (Math.random() - 0.5) * 8 * speedScale - (Math.random() * 3);
        this.gravity = 0.12;
        this.alpha = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
        this.dead = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= this.decay;
        if (this.alpha <= 0) {
            this.dead = true;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Float texts indicator particles
class FloatText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.alpha = 1.0;
        this.vy = -1.5;
        this.dead = false;
    }

    update() {
        this.y += this.vy;
        this.alpha -= 0.025;
        if (this.alpha <= 0) this.dead = true;
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;
        ctx.font = '800 12px var(--font-outfit)';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// Gold Coin pick particle
class CoinItem {
    constructor(x, y, val) {
        this.x = x;
        this.y = y;
        this.value = val;
        this.radius = 9;
        this.dead = false;
        this.bobTimer = Math.random() * 10;
        this.spinScale = 1.0;
        this.spinDir = -0.08;
    }

    update(playerX, playerY, playerRunSpeed) {
        // Fall downwards based on scenery movement
        this.y += playerRunSpeed;
        
        // Magnet effect when getting close
        const dist = Math.hypot(this.x - playerX, this.y - playerY);
        if (dist < 140) {
            const angle = Math.atan2(playerY - this.y, playerX - this.x);
            this.x += Math.cos(angle) * 8.5;
            this.y += Math.sin(angle) * 8.5;
        }

        // Coin rotation animations
        this.spinScale += this.spinDir;
        if (this.spinScale <= -1 || this.spinScale >= 1) {
            this.spinDir = -this.spinDir;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.spinScale, 1);
        
        // Render glowing golden coin
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 8px var(--font-outfit)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);

        ctx.restore();
    }
}


// ==========================================================================
// 5. CORE GAME LOOP & ENGINE CONTROLLER
// ==========================================================================
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.gameState = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER, VICTORY
        this.activeLevel = 1;
        
        // Camera systems
        this.cameraShake = 0;
        
        // Keyboard inputs
        this.keys = {};
        
        // Smooth Drag inputs
        this.dragStartX = 0;
        this.playerStartX = 0;
        this.isDragging = false;
        
        // Game track distance variables
        this.distanceRun = 0;
        this.scrollOffset = 0;
        
        // Active Entities lists
        this.bullets = [];
        this.gates = [];
        this.zombies = [];
        this.bossProjectiles = [];
        this.coins = [];
        this.particles = [];
        this.floatTexts = [];
        
        // Weapon timing logic
        this.timeSinceLastShot = 0;
        
        // Spawn interval timers
        this.zombieSpawnTimer = 0;
        this.gateSpawnTracker = 0;
        this.scenerySpawnTimer = 0;
        
        this.killsThisRun = 0;
        this.coinsThisRun = 0;
        
        this.sceneryObjects = []; // Side items for movement depth

        this.initDOM();
        this.initInput();
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
        
        // Trigger Level injection grid UI
        this.renderLevelsGrid();
        this.updateShopUI();
    }

    initDOM() {
        // Core Buttons
        document.getElementById('btn-play').addEventListener('click', () => this.startRun());
        document.getElementById('btn-shop-toggle').addEventListener('click', () => this.toggleScreen('screen-shop', true));
        document.getElementById('btn-shop-back').addEventListener('click', () => this.toggleScreen('screen-shop', false));
        
        // Resumes / Quits
        document.getElementById('btn-pause-hud').addEventListener('click', () => this.pauseGame());
        document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
        
        // Retries
        document.getElementById('btn-go-retry').addEventListener('click', () => this.startRun());
        document.getElementById('btn-go-menu').addEventListener('click', () => this.quitToMenu());
        
        // Victories
        document.getElementById('btn-vic-next').addEventListener('click', () => {
            this.activeLevel = Math.min(LEVELS.length, this.activeLevel + 1);
            this.startRun();
        });
        document.getElementById('btn-vic-menu').addEventListener('click', () => this.quitToMenu());
        
        // Audio toggler
        const audioBtn = document.getElementById('btn-audio-toggle');
        audioBtn.addEventListener('click', () => {
            const isMuted = SFX.toggleMute();
            audioBtn.textContent = isMuted ? '🔇' : '🔊';
        });

        // Setup individual Shop Upgrade Click Actions
        Object.keys(UPGRADE_DATA).forEach(key => {
            const btn = document.getElementById(`btn-up-${key.toLowerCase()}`);
            if (btn) {
                btn.addEventListener('click', () => this.purchaseUpgrade(key));
            }
        });
    }

    initInput() {
        // 1. Keyboard Arrow keys & standard keys
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                if (this.gameState === 'PLAYING') this.pauseGame();
                else if (this.gameState === 'PAUSED') this.resumeGame();
            }
            SFX.resume(); // Ensure audio unlocks
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // 2. Mouse Drag Controls
        const handleDown = (clientX) => {
            SFX.resume();
            if (this.gameState !== 'PLAYING') return;
            this.isDragging = true;
            this.dragStartX = clientX;
            this.playerStartX = this.player.x;
        };

        const handleMove = (clientX) => {
            if (!this.isDragging || this.gameState !== 'PLAYING') return;
            const deltaX = clientX - this.dragStartX;
            
            // Adjust sensitivity factor for satisfying response
            const sensitivity = 1.15;
            let targetX = this.playerStartX + deltaX * sensitivity;
            
            // Constrain player horizontally to road coordinates
            this.player.x = Math.max(70, Math.min(390, targetX));
        };

        const handleUp = () => {
            this.isDragging = false;
        };

        // Bind Mouse
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            handleDown(e.clientX - rect.left);
        });
        
        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            handleMove(e.clientX - rect.left);
        });
        
        window.addEventListener('mouseup', handleUp);

        // Bind Touch for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                const rect = this.canvas.getBoundingClientRect();
                handleDown(e.touches[0].clientX - rect.left);
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                const rect = this.canvas.getBoundingClientRect();
                handleMove(e.touches[0].clientX - rect.left);
            }
        });

        this.canvas.addEventListener('touchend', handleUp);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        // Virtual coordinates space 460 x 820
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.ctx.imageSmoothingEnabled = false;
    }

    // Dynamic Levels List Loader
    renderLevelsGrid() {
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';
        
        LEVELS.forEach(lvl => {
            const node = document.createElement('button');
            const isUnlocked = lvl.num <= SAVE_STATE.levelUnlocked;
            
            node.className = `level-node ${isUnlocked ? 'unlocked' : 'locked'} ${lvl.num === this.activeLevel ? 'active' : ''}`;
            node.disabled = !isUnlocked;
            
            node.innerHTML = `
                <span class="level-num">${lvl.num}</span>
                <span class="level-label">Level</span>
            `;
            
            node.addEventListener('click', () => {
                SFX.resume();
                document.querySelectorAll('.level-node').forEach(n => n.classList.remove('active'));
                node.classList.add('active');
                this.activeLevel = lvl.num;
            });
            
            grid.appendChild(node);
        });
        
        // Sync Top Coins HUD count
        document.getElementById('menu-total-coins').textContent = SAVE_STATE.coins;
        document.getElementById('shop-total-coins').textContent = SAVE_STATE.coins;
    }

    // Toggle screen layers nicely with transitions
    toggleScreen(id, show) {
        SFX.resume();
        const el = document.getElementById(id);
        if (show) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
        
        // Sync coin counters
        document.getElementById('menu-total-coins').textContent = SAVE_STATE.coins;
        document.getElementById('shop-total-coins').textContent = SAVE_STATE.coins;
    }

    // ==========================================================================
    // SHOP SYSTEMS
    // ==========================================================================
    updateShopUI() {
        Object.keys(UPGRADE_DATA).forEach(key => {
            const data = UPGRADE_DATA[key];
            const lvl = SAVE_STATE.upgrades[key];
            const maxLvl = data.maxLvl;
            
            const currentVal = SAVE_STATE.getStatValue(key);
            const nextVal = currentVal + data.scale;
            const cost = SAVE_STATE.getUpgradeCost(key);
            
            // Injections
            const currentEl = document.getElementById(`up-${key.toLowerCase()}-current`);
            const nextEl = document.getElementById(`up-${key.toLowerCase()}-next`);
            const costEl = document.getElementById(`up-${key.toLowerCase()}-cost`);
            const btn = document.getElementById(`btn-up-${key.toLowerCase()}`);
            
            if (lvl >= maxLvl) {
                currentEl.textContent = "MAXED";
                nextEl.textContent = "N/A";
                btn.className = "btn-upgrade maxed";
            } else {
                currentEl.textContent = `${currentVal.toFixed(1)}${data.unit}`;
                nextEl.textContent = `${nextVal.toFixed(1)}${data.unit}`;
                costEl.textContent = cost;
                
                if (SAVE_STATE.coins >= cost) {
                    btn.className = "btn-upgrade btn-buy";
                } else {
                    btn.className = "btn-upgrade btn-buy disabled";
                }
            }
        });
    }

    purchaseUpgrade(statName) {
        if (SAVE_STATE.buyUpgrade(statName)) {
            SFX.playGatePass();
            this.updateShopUI();
            this.renderLevelsGrid();
            this.updateQuickUpgradeUI(); // Sync Game-over quick upgrade as well
        }
    }

    updateQuickUpgradeUI() {
        const quickContainer = document.getElementById('quick-upgrade-item');
        quickContainer.innerHTML = '';

        // Pick one random non-maxed upgrade that user can afford or is close to affording
        const affordable = Object.keys(UPGRADE_DATA).filter(key => {
            return SAVE_STATE.upgrades[key] < UPGRADE_DATA[key].maxLvl;
        });

        if (affordable.length === 0) {
            quickContainer.innerHTML = '<span style="color:#64748b; font-size:0.8rem;">All Upgrades Maximized!</span>';
            return;
        }

        // Display the cheapest option
        affordable.sort((a, b) => SAVE_STATE.getUpgradeCost(a) - SAVE_STATE.getUpgradeCost(b));
        const key = affordable[0];
        const cost = SAVE_STATE.getUpgradeCost(key);
        const data = UPGRADE_DATA[key];

        const isAffordable = SAVE_STATE.coins >= cost;

        const btn = document.createElement('button');
        btn.className = `quick-card-btn ${!isAffordable ? 'disabled' : ''}`;
        btn.innerHTML = `
            <span>Upgrade Starting ${data.title}</span>
            <span class="cost">🪙 ${cost}</span>
        `;
        
        btn.addEventListener('click', () => {
            if (isAffordable) {
                this.purchaseUpgrade(key);
            }
        });

        quickContainer.appendChild(btn);
    }

    // ==========================================================================
    // LEVEL RUN GAME INITIALIZATION
    // ==========================================================================
    startRun() {
        SFX.resume();
        
        // Hide all overlaid screens
        document.getElementById('screen-menu').classList.add('hidden');
        document.getElementById('screen-shop').classList.add('hidden');
        document.getElementById('screen-gameover').classList.add('hidden');
        document.getElementById('screen-victory').classList.add('hidden');
        document.getElementById('screen-pause').classList.add('hidden');
        document.getElementById('btn-pause-hud').classList.remove('hidden');
        document.getElementById('game-hud').classList.remove('hidden');
        
        // Setup levels data
        this.lvlDef = LEVELS[this.activeLevel - 1];
        document.getElementById('hud-level-name').textContent = `LEVEL ${this.lvlDef.num}: ${this.lvlDef.name}`;

        // Initialize Player values from starting shop stats
        this.player = {
            x: 230,
            y: 720,
            radius: 18,
            shieldMax: SAVE_STATE.getStatValue('shield'),
            shield: SAVE_STATE.getStatValue('shield'),
            hpMax: 100,
            hp: 100,
            baseRunSpeed: 4.8,
            runSpeed: 4.8, // current forward scroll rate
            
            // Weapon stats modifications (growable in level runs!)
            fireRate: SAVE_STATE.getStatValue('fireRate'),
            damage: SAVE_STATE.getStatValue('damage'),
            range: 480,
            bulletCount: 1, // multiple angled projectile spreads
            
            flashTimer: 0
        };

        // Reset Run Variables
        this.distanceRun = 0;
        this.scrollOffset = 0;
        
        this.bullets = [];
        this.gates = [];
        this.zombies = [];
        this.bossProjectiles = [];
        this.coins = [];
        this.particles = [];
        this.floatTexts = [];
        this.sceneryObjects = [];
        
        this.timeSinceLastShot = 0;
        this.zombieSpawnTimer = 0;
        this.gateSpawnTracker = 0;
        this.scenerySpawnTimer = 0;
        
        this.killsThisRun = 0;
        this.coinsThisRun = 0;

        // Initialize scenery to start populated
        for (let i = 0; i < 6; i++) {
            this.sceneryObjects.push({
                x: Math.random() < 0.5 ? Math.random() * 40 : 420 + Math.random() * 40,
                y: Math.random() * 820,
                type: Math.random() < 0.6 ? 'barrier' : 'debris',
                height: 35,
                width: 35
            });
        }
        
        this.bossEntity = null;
        this.cameraShake = 0;
        
        this.gameState = 'PLAYING';
    }

    pauseGame() {
        if (this.gameState !== 'PLAYING') return;
        this.gameState = 'PAUSED';
        document.getElementById('screen-pause').classList.remove('hidden');
    }

    resumeGame() {
        if (this.gameState !== 'PAUSED') return;
        SFX.resume();
        this.gameState = 'PLAYING';
        document.getElementById('screen-pause').classList.add('hidden');
    }

    quitToMenu() {
        this.gameState = 'MENU';
        
        // Show menu layers, hide HUD & overlays
        document.getElementById('screen-menu').classList.remove('hidden');
        document.getElementById('btn-pause-hud').classList.add('hidden');
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('screen-gameover').classList.add('hidden');
        document.getElementById('screen-victory').classList.add('hidden');
        document.getElementById('screen-pause').classList.add('hidden');
        
        this.renderLevelsGrid();
        this.updateShopUI();
    }

    triggerScreenShake(amt) {
        this.cameraShake = amt;
    }

    // ==========================================================================
    // PROCEDURAL TRACK COMPONENT GENERATIONS
    // ==========================================================================
    spawnTrackEntities() {
        const isBossStage = this.distanceRun >= this.lvlDef.length;
        if (isBossStage) return; // Stop spawning regular tracks

        const dt = 1.0; // Simulated frame

        // 1. Spawning Zombies (Group queues)
        this.zombieSpawnTimer += this.player.runSpeed;
        if (this.zombieSpawnTimer > 250) {
            this.zombieSpawnTimer = 0;
            // Select random lane spacing patterns
            const count = Math.random() < 0.5 ? 2 : 3;
            const lanes = [95, 230, 365]; // left, middle, right relative road values
            
            // Shuffle
            lanes.sort(() => Math.random() - 0.5);
            
            for (let i = 0; i < count; i++) {
                const laneX = lanes[i];
                const hp = Math.floor(this.lvlDef.zombieHpMin + Math.random() * (this.lvlDef.zombieHpMax - this.lvlDef.zombieHpMin));
                
                // Spawn Normal / Fast runner / fat zombie classes
                const roll = Math.random();
                let ztype = 'normal';
                let speed = 1.2;
                if (roll < 0.2) {
                    ztype = 'runner';
                    speed = 2.0;
                } else if (roll < 0.35) {
                    ztype = 'fat';
                    speed = 0.6;
                }
                
                this.zombies.push(new Zombie(laneX, -40, hp, speed, ztype));
            }
        }

        // 2. Spawning Upgrade Gates in Pairs
        this.gateSpawnTracker += this.player.runSpeed;
        if (this.gateSpawnTracker > 780) { // Every 780 meters
            this.gateSpawnTracker = 0;
            
            // Gate Pool options based on level multipliers
            const gateTypes = ['FIRE_RATE', 'DAMAGE', 'BULLETS', 'SHIELD'];
            const leftType = gateTypes[Math.floor(Math.random() * gateTypes.length)];
            const rightType = gateTypes[Math.floor(Math.random() * gateTypes.length)];
            
            // Build modifiers left gate vs right gate
            // Positive vs Negative Trap choices for satisfying ad-style choice!
            const buildGateVals = (type) => {
                const isTrap = Math.random() < 0.22; // 22% chance of negative trap gate
                
                if (isTrap) {
                    if (type === 'BULLETS') return { mod: '-', val: 1 };
                    if (type === 'SHIELD') return { mod: '-', val: 50 };
                    if (type === 'FIRE_RATE') return { mod: '-', val: 0.8 };
                    return { mod: '-', val: 5 };
                } else {
                    // Positive buffs
                    if (type === 'BULLETS') return { mod: '+', val: 1 };
                    if (type === 'SHIELD') return { mod: '+', val: 35 };
                    if (type === 'FIRE_RATE') return { mod: '+', val: 0.5 + Math.random() * 1.0 };
                    return { mod: '+', val: 5 + Math.floor(Math.random() * 10) };
                }
            };
            
            const leftG = buildGateVals(leftType);
            const rightG = buildGateVals(rightType);
            
            this.gates.push(new Gate(-40, 0, leftType, leftG.mod, leftG.val));
            this.gates.push(new Gate(-40, 1, rightType, rightG.mod, rightG.val));
        }

        // 3. Side Scenery objects for feeling of speed (Parallax details)
        this.scenerySpawnTimer += this.player.runSpeed;
        if (this.scenerySpawnTimer > 180) {
            this.scenerySpawnTimer = 0;
            const onLeft = Math.random() < 0.5;
            this.sceneryObjects.push({
                x: onLeft ? Math.random() * 30 : 430 + Math.random() * 30,
                y: -60,
                type: Math.random() < 0.5 ? 'barrier' : 'debris',
                height: 30,
                width: 30
            });
        }
    }

    // ==========================================================================
    // WEAPON FIRE SYSTEM
    // ==========================================================================
    handleShooting() {
        this.timeSinceLastShot++;
        
        const shotDelay = 60 / this.player.fireRate; // 60fps frame count representation
        if (this.timeSinceLastShot >= shotDelay) {
            this.timeSinceLastShot = 0;
            
            // Firing bullets spreads
            const count = this.player.bulletCount;
            SFX.playShoot();
            
            if (count === 1) {
                this.bullets.push(new Bullet(this.player.x, this.player.y - 15, 0, this.player.damage, this.player.range));
            } else {
                // Multi spread angles
                const spreadAngle = 0.12; // Spread arc radians
                const startAngle = -((count - 1) * spreadAngle) / 2;
                for (let i = 0; i < count; i++) {
                    const angle = startAngle + i * spreadAngle;
                    this.bullets.push(new Bullet(this.player.x, this.player.y - 15, angle, this.player.damage, this.player.range));
                }
            }
        }
    }

    // ==========================================================================
    // CORE PHYSICS & COLLISIONS ENGINE
    // ==========================================================================
    updatePhysics() {
        const isBossStage = this.distanceRun >= this.lvlDef.length;

        // Decrease active screen shakes
        if (this.cameraShake > 0) this.cameraShake *= 0.9;

        // Player animations timers
        if (this.player.flashTimer > 0) this.player.flashTimer--;

        // Update bullets
        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => !b.dead);

        // Scenery movements
        this.sceneryObjects.forEach(s => {
            s.y += this.player.runSpeed;
        });
        this.sceneryObjects = this.sceneryObjects.filter(s => s.y < 850);

        // Update particles
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => !p.dead);

        // Update floating texts
        this.floatTexts.forEach(ft => ft.update());
        this.floatTexts = this.floatTexts.filter(ft => !ft.dead);

        // Upgrade Gates updating
        this.gates.forEach(g => {
            g.y += this.player.runSpeed; // Fall with scrolling speed
            g.update();
            
            // Player gate collision detection
            if (!g.destroyed && Math.abs((g.y + 60) - this.player.y) < 25) {
                // Center intersection check
                const overlap = Math.abs(this.player.x - g.x) < (g.width / 2 + 10);
                if (overlap) {
                    this.applyGateBuff(g);
                    g.destroyed = true;
                }
            }
        });
        this.gates = this.gates.filter(g => g.y < 850 && !g.destroyed);

        // Coins Magnetic updates
        this.coins.forEach(c => {
            c.update(this.player.x, this.player.y, this.player.runSpeed);
            
            // Collection collision
            const dist = Math.hypot(c.x - this.player.x, c.y - this.player.y);
            if (dist < (this.player.radius + c.radius)) {
                c.dead = true;
                this.collectCoin(c.value);
            }
        });
        this.coins = this.coins.filter(c => c.y < 850 && !c.dead);

        // Zombies actions
        this.zombies.forEach(z => {
            z.update(this.player.runSpeed);

            // Collides with Player
            const dist = Math.hypot(z.x - this.player.x, z.y - this.player.y);
            if (dist < (z.radius + this.player.radius)) {
                z.dead = true;
                this.damagePlayer(25);
                this.spawnBloodExplosion(z.x, z.y, z.color, 1.2);
            }
            
            // Escapes bottom of screen (minor damage penalty or no shield recharge stop)
            if (z.y > 830) {
                z.dead = true;
            }
        });
        
        // Remove dead zombies, handle loot & score
        this.zombies.forEach(z => {
            if (z.dead && z.hp <= 0) {
                this.killsThisRun++;
                
                // Spawn particles explosions
                this.spawnBloodExplosion(z.x, z.y, z.color);
                SFX.playExplosion();

                // Drop coin loot with probability
                if (Math.random() < 0.85) {
                    const cVal = Math.floor(1 + Math.random() * 3);
                    this.coins.push(new CoinItem(z.x, z.y, cVal));
                }
            }
        });
        this.zombies = this.zombies.filter(z => !z.dead);

        // Boss Projectiles updates
        this.bossProjectiles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            // Collides with player
            const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
            if (dist < (p.radius + this.player.radius)) {
                p.dead = true;
                this.damagePlayer(p.damage);
                this.triggerScreenShake(12);
            }
            
            if (p.y > 850 || p.y < -50 || p.x > 500 || p.x < -50) {
                p.dead = true;
            }
        });
        this.bossProjectiles = this.bossProjectiles.filter(p => !p.dead);

        // Firing colliders (Bullets hitting Gates & Zombies/Boss)
        this.bullets.forEach(b => {
            // 1. Collides with Gates to upgrade them!
            this.gates.forEach(g => {
                if (!g.destroyed) {
                    const hitY = Math.abs(b.y - (g.y + 60)) < 15;
                    const hitX = Math.abs(b.x - g.x) < g.width / 2;
                    if (hitY && hitX) {
                        b.dead = true;
                        g.shootUpgrade(b.damage);
                        
                        // Spark particles
                        const color = g.isPositive() ? '#39ff14' : '#ff3131';
                        for (let i = 0; i < 4; i++) {
                            this.particles.push(new Particle(b.x, b.y, color, 0.6));
                        }
                    }
                }
            });

            // 2. Collides with Zombies
            this.zombies.forEach(z => {
                if (!z.dead) {
                    const dist = Math.hypot(b.x - z.x, b.y - z.y);
                    if (dist < (z.radius + b.width)) {
                        b.dead = true;
                        z.damage(b.damage);
                        
                        // Draw popup floating damage text
                        this.floatTexts.push(new FloatText(z.x, z.y - 10, `-${b.damage}`, '#ff3131'));

                        // Minor blood sparks
                        for (let i = 0; i < 3; i++) {
                            this.particles.push(new Particle(b.x, b.y, z.color, 0.5));
                        }
                    }
                }
            });

            // 3. Collides with Boss
            if (this.bossEntity && !this.bossEntity.dead) {
                const dist = Math.hypot(b.x - this.bossEntity.x, b.y - this.bossEntity.y);
                if (dist < (this.bossEntity.radius + 10)) {
                    b.dead = true;
                    this.bossEntity.damage(b.damage);

                    // Float dmg indicator
                    const dCol = this.bossEntity.shieldActive ? '#00f0ff' : '#ffcc00';
                    this.floatTexts.push(new FloatText(b.x, b.y - 12, `-${b.damage}`, dCol));
                    
                    for (let i = 0; i < 4; i++) {
                        this.particles.push(new Particle(b.x, b.y, this.bossEntity.color, 0.8));
                    }
                }
            }
        });

        // ==========================================================================
        // BOSS STATE ESCALATIONS
        // ==========================================================================
        if (isBossStage) {
            // Lower speed slowly for boss arena lock
            if (this.player.runSpeed > 0.4) {
                this.player.runSpeed *= 0.95;
            } else {
                this.player.runSpeed = 0.4;
            }

            // Spawn boss
            if (!this.bossEntity) {
                this.bossEntity = new Boss(
                    this.lvlDef.boss.name,
                    this.lvlDef.boss.hp,
                    this.lvlDef.boss.color,
                    this.lvlDef.boss.attackPattern
                );
                this.bossEntity.active = true;
                
                // Show notification overlay text float
                this.floatTexts.push(new FloatText(230, 300, "WARNING: BOSS ENCOUNTER!", '#ff3131'));
                SFX.playBossAlarm();
            }

            // Update Boss
            this.bossEntity.update(this.bossProjectiles, this.zombies, (amt) => this.triggerScreenShake(amt));

            // Check Boss Defeat
            if (this.bossEntity.dead) {
                this.triggerScreenShake(40);
                this.spawnBloodExplosion(this.bossEntity.x, this.bossEntity.y, this.bossEntity.color, 4);
                SFX.playVictory();
                
                // Large coins drop!
                const victoryCoins = 50 * this.activeLevel;
                SAVE_STATE.coins += Math.floor(victoryCoins * SAVE_STATE.getStatValue('coinMult'));
                SAVE_STATE.levelUnlocked = Math.max(SAVE_STATE.levelUnlocked, this.activeLevel + 1);
                SAVE_STATE.save();
                
                this.gameState = 'VICTORY';
                this.showVictoryScreen(victoryCoins);
            }
        } else {
            // Distance progression updates
            this.distanceRun += this.player.runSpeed * 0.15;
            this.scrollOffset += this.player.runSpeed;
        }

        // Apply Keyboard Movements controls
        this.handleKeyboardMovement();
    }

    handleKeyboardMovement() {
        const moveSpd = 5.8;
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.player.x = Math.max(70, this.player.x - moveSpd);
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            this.player.x = Math.min(390, this.player.x + moveSpd);
        }
    }

    // ==========================================================================
    // STATS / BUFFS APPLICATION SYSTEM
    // ==========================================================================
    applyGateBuff(g) {
        SFX.playGatePass();
        this.triggerScreenShake(8);

        const type = g.type;
        const mod = g.modifier;
        const val = g.value;
        
        let reportTxt = "";
        let color = '#39ff14'; // default positive green glow

        // Setup custom dynamic floating alerts
        if (mod === '-') {
            color = '#ff3131'; // negative alert
        }

        if (type === 'FIRE_RATE') {
            const old = this.player.fireRate;
            if (mod === '+') this.player.fireRate += val;
            else if (mod === 'x') this.player.fireRate *= val;
            else if (mod === '-') this.player.fireRate = Math.max(0.5, this.player.fireRate - val);
            
            reportTxt = `FIRE RATE: ${mod}${val.toFixed(1)}`;
        }
        else if (type === 'DAMAGE') {
            if (mod === '+') this.player.damage += Math.floor(val);
            else if (mod === 'x') this.player.damage = Math.floor(this.player.damage * val);
            else if (mod === '-') this.player.damage = Math.max(2, this.player.damage - Math.floor(val));
            
            reportTxt = `DAMAGE: ${mod}${val}`;
        }
        else if (type === 'BULLETS') {
            if (mod === '+') this.player.bulletCount += Math.floor(val);
            else if (mod === '-') this.player.bulletCount = Math.max(1, this.player.bulletCount - Math.floor(val));
            
            reportTxt = `BULLETS COUNT: ${mod}${val}`;
        }
        else if (type === 'SHIELD') {
            if (mod === '+') this.player.shield = Math.min(this.player.shieldMax + 100, this.player.shield + val);
            else if (mod === '-') this.player.shield = Math.max(0, this.player.shield - val);
            
            reportTxt = `SHIELD: ${mod}${val}`;
        }

        this.floatTexts.push(new FloatText(this.player.x, this.player.y - 45, reportTxt, color));
    }

    damagePlayer(amt) {
        this.player.flashTimer = 8;
        SFX.playHit();
        this.triggerScreenShake(14);

        if (this.player.shield > 0) {
            this.player.shield -= amt;
            if (this.player.shield < 0) {
                this.player.hp += this.player.shield; // Overflow to HP
                this.player.shield = 0;
            }
        } else {
            this.player.hp -= amt;
        }

        if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.triggerScreenShake(30);
            this.gameState = 'GAMEOVER';
            
            // Add coins permanently
            const earnedCoins = Math.floor(this.coinsThisRun * SAVE_STATE.getStatValue('coinMult'));
            SAVE_STATE.coins += earnedCoins;
            SAVE_STATE.save();
            
            this.showGameOverScreen(earnedCoins);
        }
    }

    collectCoin(val) {
        SFX.playCoin();
        const finalCoins = Math.floor(val);
        this.coinsThisRun += finalCoins;
        
        // Spawn coin pop-up float text
        this.floatTexts.push(new FloatText(this.player.x, this.player.y - 25, `+🪙 ${finalCoins}`, '#ffd700'));
    }

    spawnBloodExplosion(x, y, color, scale = 1) {
        const count = 12 * scale;
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, scale));
        }
    }

    // ==========================================================================
    // HUD RE-RENDER BINDINGS
    // ==========================================================================
    updateHUD() {
        const progressFill = document.getElementById('hud-distance-fill');
        const runnerIcon = document.getElementById('hud-progress-runner');
        const shieldFill = document.getElementById('hud-shield-fill');
        const healthFill = document.getElementById('hud-health-fill');
        
        // Stats displays
        document.getElementById('hud-stat-firerate').textContent = `${this.player.fireRate.toFixed(1)}/s`;
        document.getElementById('hud-stat-damage').textContent = this.player.damage;
        document.getElementById('hud-stat-range').textContent = this.player.range;
        document.getElementById('hud-coins').textContent = this.coinsThisRun;

        // Calculate progress percents
        const progress = Math.min(1.0, this.distanceRun / this.lvlDef.length);
        progressFill.style.width = `${progress * 100}%`;
        runnerIcon.style.left = `${progress * 100}%`;
        
        document.getElementById('hud-distance-text').textContent = `${Math.floor(this.distanceRun)}m / ${this.lvlDef.length}m`;

        // Shields & HP percents
        const shPercent = this.player.shieldMax > 0 ? (this.player.shield / this.player.shieldMax) * 100 : 0;
        shieldFill.style.width = `${Math.max(0, Math.min(100, shPercent))}%`;
        
        const hpPercent = (this.player.hp / this.player.hpMax) * 100;
        healthFill.style.width = `${Math.max(0, Math.min(100, hpPercent))}%`;
    }

    // ==========================================================================
    // GAME OVER & VICTORY PANEL POPULATORS
    // ==========================================================================
    showGameOverScreen(earnedCoins) {
        document.getElementById('btn-pause-hud').classList.add('hidden');
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('screen-gameover').classList.remove('hidden');
        
        document.getElementById('go-distance').textContent = `${Math.floor(this.distanceRun)}m`;
        document.getElementById('go-kills').textContent = this.killsThisRun;
        document.getElementById('go-coins').textContent = earnedCoins;

        this.updateQuickUpgradeUI();
    }

    showVictoryScreen(earnedCoins) {
        document.getElementById('btn-pause-hud').classList.add('hidden');
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('screen-victory').classList.remove('hidden');
        
        document.getElementById('vic-level').textContent = `Level ${this.lvlDef.num}: ${this.lvlDef.name}`;
        document.getElementById('vic-kills').textContent = this.killsThisRun;
        document.getElementById('vic-coins').textContent = earnedCoins;

        // Dynamic multi star allocations based on player remaining HP percentage
        const stars = document.getElementById('victory-stars').querySelectorAll('.star');
        const hpPct = this.player.hp / this.player.hpMax;
        
        stars.forEach((star, index) => {
            star.classList.remove('active');
            if (index === 0) star.classList.add('active'); // 1 star always
            if (index === 1 && hpPct > 0.45) star.classList.add('active'); // 2 stars for half health
            if (index === 2 && hpPct > 0.85) star.classList.add('active'); // 3 stars for near perfect!
        });
    }

    // ==========================================================================
    // CANVAS RENDER RENDERING ENGINE (3D perspective and sprites)
    // ==========================================================================
    renderCanvas() {
        const width = 460;
        const height = 820;
        
        this.ctx.clearRect(0, 0, width, height);
        
        this.ctx.save();
        // Camera shake matrix offsets
        if (this.cameraShake > 0.5) {
            const dx = (Math.random() - 0.5) * this.cameraShake;
            const dy = (Math.random() - 0.5) * this.cameraShake;
            this.ctx.translate(dx, dy);
        }

        // 1. SKY BACKGROUND GRID
        const theme = this.lvlDef ? this.lvlDef.bgTheme : LEVELS[0].bgTheme;
        
        this.ctx.fillStyle = theme.sky;
        this.ctx.fillRect(0, 0, width, height);

        // 2. 3D PERSPECTIVE ENVIRONMENT SCROLLING ROAD
        const horizon = 220; // horizon depth line
        const roadW_horizon = 60;
        const roadW_bottom = 360;
        
        // Draw Side Scenery backgrounds
        this.ctx.fillStyle = theme.scenery;
        this.ctx.beginPath();
        this.ctx.moveTo(0, horizon);
        this.ctx.lineTo(width, horizon);
        this.ctx.lineTo(width, height);
        this.ctx.lineTo(0, height);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw grey main road track
        this.ctx.fillStyle = theme.road;
        this.ctx.beginPath();
        this.ctx.moveTo(230 - roadW_horizon/2, horizon);
        this.ctx.lineTo(230 + roadW_horizon/2, horizon);
        this.ctx.lineTo(230 + roadW_bottom/2, height);
        this.ctx.lineTo(230 - roadW_bottom/2, height);
        this.ctx.closePath();
        this.ctx.fill();

        // 3D vanishing perspective grid lines rendering
        this.ctx.strokeStyle = theme.grid;
        this.ctx.lineWidth = 2;
        
        // Left road line border
        this.ctx.beginPath();
        this.ctx.moveTo(230 - roadW_horizon/2, horizon);
        this.ctx.lineTo(230 - roadW_bottom/2, height);
        this.ctx.stroke();

        // Right road line border
        this.ctx.beginPath();
        this.ctx.moveTo(230 + roadW_horizon/2, horizon);
        this.ctx.lineTo(230 + roadW_bottom/2, height);
        this.ctx.stroke();

        // Internal Lane guides indicators (representing columns left, mid, right)
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
        this.ctx.setLineDash([12, 18]);
        this.ctx.lineWidth = 1;
        
        // Divider 1 (Left-Mid boundary)
        this.ctx.beginPath();
        this.ctx.moveTo(230 - roadW_horizon/6, horizon);
        this.ctx.lineTo(230 - roadW_bottom/6, height);
        this.ctx.stroke();

        // Divider 2 (Mid-Right boundary)
        this.ctx.beginPath();
        this.ctx.moveTo(230 + roadW_horizon/6, horizon);
        this.ctx.lineTo(230 + roadW_bottom/6, height);
        this.ctx.stroke();
        this.ctx.restore();

        // Scroll horizontal grid lines down for forward movement illusion
        this.ctx.strokeStyle = `rgba(255, 255, 255, 0.08)`;
        const linesCount = 14;
        const progressPart = (this.scrollOffset % 40) / 40;
        
        for (let i = 0; i < linesCount; i++) {
            // Apply exponential curve projection spacing
            const normY = (i + progressPart) / linesCount;
            const screenY = horizon + Math.pow(normY, 2) * (height - horizon);
            
            const currentRoadHalfW = (roadW_horizon + (roadW_bottom - roadW_horizon) * Math.pow(normY, 2)) / 2;
            
            this.ctx.beginPath();
            this.ctx.moveTo(230 - currentRoadHalfW, screenY);
            this.ctx.lineTo(230 + currentRoadHalfW, screenY);
            this.ctx.stroke();
        }

        // Draw Side obstacles & details with correct size perspective scaling
        this.sceneryObjects.forEach(s => {
            const relY = (s.y - horizon) / (height - horizon);
            if (relY <= 0) return;
            
            const scale = 0.2 + relY * 0.9;
            const drawX = s.x < 230 
                ? s.x - (100 * (1 - relY)) 
                : s.x + (100 * (1 - relY));
                
            this.ctx.save();
            this.ctx.translate(drawX, s.y);
            this.ctx.scale(scale, scale);
            
            // Draw neat looking cyberpunk bio-tanks or barricades
            if (s.type === 'barrier') {
                this.ctx.fillStyle = '#ff9500';
                this.ctx.fillRect(-15, -20, 30, 20);
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath();
                this.ctx.moveTo(-15, -20); this.ctx.lineTo(-5, -20); this.ctx.lineTo(-15, -10); this.ctx.closePath(); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.moveTo(5, -20); this.ctx.lineTo(15, -20); this.ctx.lineTo(5, -10); this.ctx.closePath(); this.ctx.fill();
            } else {
                // glowing neon crystals / ruins
                this.ctx.fillStyle = theme.grid;
                this.ctx.shadowColor = theme.grid;
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -30);
                this.ctx.lineTo(12, -5);
                this.ctx.lineTo(0, 10);
                this.ctx.lineTo(-12, -5);
                this.ctx.closePath();
                this.ctx.fill();
            }
            this.ctx.restore();
        });

        // 3. RENDER ENTITIES (Relative drawing based on perspective or direct 2D)
        
        // Draw Upgrade Gates with perspective coordinates or direct HUD overlaps
        this.gates.forEach(g => {
            // Translate track relative Y positions to Screen Y
            // Mapping range [0 to 1000] -> [horizon to bottom screen]
            const drawY = horizon + (g.y / height) * (height - horizon);
            g.render(this.ctx, drawY);
        });

        // Draw coins
        this.coins.forEach(c => c.render(this.ctx));

        // Draw projectiles, zombies, boss
        this.bullets.forEach(b => b.render(this.ctx));
        this.zombies.forEach(z => z.render(this.ctx));

        if (this.bossEntity) {
            this.bossEntity.render(this.ctx);
        }

        // Draw Boss Projectiles
        this.bossProjectiles.forEach(p => {
            this.ctx.save();
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // Draw particles splatters & damage float texts
        this.particles.forEach(p => p.render(this.ctx));
        this.floatTexts.forEach(ft => ft.render(this.ctx));

        // 4. DRAW PLAYER CAR/SURVIVOR
        this.renderPlayer(this.ctx);

        this.ctx.restore();
    }

    renderPlayer(ctx) {
        ctx.save();
        
        const px = this.player.x;
        const py = this.player.y;
        const pr = this.player.radius;

        // Shadow below
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(px, py + pr - 3, pr * 1.2, pr * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hit flash or base glowing styling
        if (this.player.flashTimer > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 20;
        } else {
            ctx.fillStyle = '#00f0ff'; // Player neon cyan armor
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 10;
        }

        // Procedural modern cybernetic turret/mecha vehicle drawing
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Gun barrel pointing forward
        ctx.fillStyle = '#333333';
        ctx.fillRect(px - 4, py - pr - 10, 8, 14);
        ctx.strokeStyle = '#00f0ff';
        ctx.strokeRect(px - 4, py - pr - 10, 8, 14);

        // Glowing shield aura
        if (this.player.shield > 0) {
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(px, py, pr + 6, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ==========================================================================
    // MAIN UPDATE LOOP
    // ==========================================================================
    loop() {
        if (this.gameState === 'PLAYING') {
            this.spawnTrackEntities();
            this.handleShooting();
            this.updatePhysics();
            this.updateHUD();
        }
        
        // Keep rendering canvas during pauses & runs
        if (this.gameState === 'PLAYING' || this.gameState === 'PAUSED' || this.gameState === 'GAMEOVER' || this.gameState === 'VICTORY') {
            this.renderCanvas();
        }

        requestAnimationFrame(() => this.loop());
    }
}

// Instantiate engine when DOM is fully prepared
window.addEventListener('DOMContentLoaded', () => {
    const Engine = new GameEngine();
    Engine.loop();
});
