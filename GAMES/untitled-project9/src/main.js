import './css/style.css';
import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { Input } from './core/Input.js';
import { Physics } from './core/Physics.js';
import { Map } from './world/Map.js';
import { ParticleSystem } from './world/ParticleSystem.js';
import { Truck } from './entities/Truck.js';
import { Student } from './entities/Student.js';
import { FoodProjectile } from './entities/FoodProjectile.js';

/**
 * main.js
 * The Orchestrator / Game Controller.
 * Manages game states, level definitions, student spawning schedules,
 * collision checking, stocking refill depots, and the shop overlay.
 */
class GameController {
  constructor() {
    this.gameState = 'START'; // 'START', 'PLAYING', 'SHOP', 'GAME_OVER'
    this.level = 1;
    this.score = 0.0; // Tip cash
    this.servedCount = 0;
    this.levelTargetDelivered = 6;
    this.timeRemaining = 60.0;
    
    // Upgrades state
    this.upgrades = {
      engine: 0,    // Lvl 0-3
      fridge: 0,    // Lvl 0-3
      launcher: 0,  // Lvl 0-3
      glow: 0       // Lvl 0-1
    };

    this.upgradeCosts = {
      engine: [150, 300, 500],
      fridge: [100, 250, 400],
      launcher: [200, 350, 600],
      glow: [300]
    };

    // Food Cargo stock levels
    this.maxCargoCapacity = 10;
    this.cargo = {
      pizza: 10,
      burger: 10,
      taco: 10
    };

    // Game entity arrays
    this.students = [];
    this.projectiles = [];

    // Core timing clocks
    this.clock = new THREE.Clock();

    // Bootstrap engine parts
    this.engine = new Engine();
    this.input = new Input();
    this.physics = new Physics();
    this.particles = new ParticleSystem(this.engine.scene);
    this.map = new Map(this.engine.scene);

    // Dynamic truck setup
    this.truck = null;

    // Timing helper properties
    this.studentHungerTimer = 0;
    this.studentSpawnTimer = 0;
    this.refillTimer = 0;

    // Initialize Event Bindings
    this.initUIBindings();
    this.initGameLoop();
  }

  initUIBindings() {
    // 1. Menu Buttons
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.transitionTo('PLAYING');
    });

    document.getElementById('btn-restart-game').addEventListener('click', () => {
      this.resetFullGame();
      this.transitionTo('PLAYING');
    });

    document.getElementById('btn-next-shift').addEventListener('click', () => {
      this.level++;
      this.levelTargetDelivered = 5 + this.level * 2; // Increase target
      this.timeRemaining = 60.0 + this.level * 5.0; // Increase time
      this.transitionTo('PLAYING');
    });

    // 2. Food Launcher fire hook
    this.input.onFireCallback = () => {
      if (this.gameState === 'PLAYING') {
        this.launchFoodItem();
      }
    };

    this.input.onFoodSwitchCallback = (index) => {
      // Update UI active slot highlight during game
      const options = document.querySelectorAll('.food-option');
      options.forEach(opt => opt.classList.remove('active'));
      document.getElementById(`food-opt-${index + 1}`).classList.add('active');
    };

    // 3. Upgrade buttons in the Shop
    document.querySelectorAll('.btn-upgrade').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const type = btn.getAttribute('data-upgrade');
        this.purchaseUpgrade(type);
      });
    });

    // Mobile specific overlay switcher hooks
    const foodOpts = document.querySelectorAll('.food-option');
    foodOpts.forEach((opt) => {
      opt.addEventListener('click', () => {
        const index = parseInt(opt.getAttribute('data-index'));
        this.input.switchFood(index);
      });
    });
  }

  resetFullGame() {
    this.level = 1;
    this.score = 0;
    this.servedCount = 0;
    this.levelTargetDelivered = 6;
    this.timeRemaining = 60.0;
    
    this.upgrades = {
      engine: 0,
      fridge: 0,
      launcher: 0,
      glow: 0
    };

    this.maxCargoCapacity = 10;
    this.refuelCargoToMax();
    this.particles.clear();
    
    // Clear and build truck again
    if (this.truck) this.truck.clear();
    this.truck = new Truck(this.engine.scene);
  }

  refuelCargoToMax() {
    this.cargo.pizza = this.maxCargoCapacity;
    this.cargo.burger = this.maxCargoCapacity;
    this.cargo.taco = this.maxCargoCapacity;
    this.updateHUDStockUI();
  }

  updateHUDStockUI() {
    const pBar = document.getElementById('stock-bar-pizza');
    const bBar = document.getElementById('stock-bar-burger');
    const tBar = document.getElementById('stock-bar-taco');

    const pNum = document.getElementById('stock-num-pizza');
    const bNum = document.getElementById('stock-num-burger');
    const tNum = document.getElementById('stock-num-taco');

    if (pBar && pNum) {
      const pRatio = (this.cargo.pizza / this.maxCargoCapacity) * 100;
      pBar.style.width = `${pRatio}%`;
      pNum.textContent = this.cargo.pizza;
    }
    if (bBar && bNum) {
      const bRatio = (this.cargo.burger / this.maxCargoCapacity) * 100;
      bBar.style.width = `${bRatio}%`;
      bNum.textContent = this.cargo.burger;
    }
    if (tBar && tNum) {
      const tRatio = (this.cargo.taco / this.maxCargoCapacity) * 100;
      tBar.style.width = `${tRatio}%`;
      tNum.textContent = this.cargo.taco;
    }
  }

  transitionTo(newState) {
    this.gameState = newState;

    // Hide all HUD overlays
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('game-hud').classList.add('hidden');
    document.getElementById('shop-screen').classList.add('hidden');
    document.getElementById('shop-screen').classList.remove('active');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('active');

    if (newState === 'PLAYING') {
      document.getElementById('game-hud').classList.remove('hidden');
      
      // Initialize level-specific details
      this.servedCount = 0;
      this.clock.getDelta(); // Clear delta tracking buffer

      // If playing fresh, setup new truck
      if (!this.truck) {
        this.truck = new Truck(this.engine.scene);
      }
      this.truck.mesh.position.set(0, 0, 0); // Put truck at start center
      this.truck.mesh.rotation.set(0, 0, 0);
      this.physics.speed = 0;

      // Apply active upgrades
      if (this.upgrades.glow > 0) {
        this.truck.installNeonUnderglow();
      }

      // Reset food stocks to max
      this.refuelCargoToMax();

      // Clear previous student instances and spawn a fresh campus crowd
      this.clearEntities();
      this.spawnInitialStudents(12 + this.level * 2);

      // Focus camera immediately on truck
      this.engine.camera.position.set(0, 15, -25);
      
      this.updateHUDText();
    } 
    else if (newState === 'SHOP') {
      document.getElementById('shop-screen').classList.add('active');
      document.getElementById('shop-screen').classList.remove('hidden');
      
      this.setupShopUI();
    } 
    else if (newState === 'GAME_OVER') {
      document.getElementById('game-over-screen').classList.add('active');
      document.getElementById('game-over-screen').classList.remove('hidden');

      // Populate scoreboard stats
      document.getElementById('final-served').textContent = this.servedCount;
      document.getElementById('final-tips').textContent = `$${this.score.toFixed(2)}`;
      
      const totalCargoLeft = this.cargo.pizza + this.cargo.burger + this.cargo.taco;
      document.getElementById('final-cargo').textContent = `${totalCargoLeft} items`;

      const summaryText = this.servedCount >= this.levelTargetDelivered
        ? `Shift Completed! You served ${this.servedCount} students and gathered $${this.score.toFixed(2)} in tips. Splendid work out there!`
        : `Shift Over! You only delivered ${this.servedCount}/${this.levelTargetDelivered} required foods. The students went home hungry. Play again!`;
      
      document.getElementById('game-over-summary').textContent = summaryText;
    }
  }

  clearEntities() {
    this.students.forEach(s => s.destroy());
    this.students = [];
    
    this.projectiles.forEach(p => {
      this.engine.scene.remove(p.mesh);
      p.mesh.geometry?.dispose();
    });
    this.projectiles = [];
  }

  spawnInitialStudents(count) {
    for (let i = 0; i < count; i++) {
      // Spawn students randomly on the grass areas (avoid spawning directly in center 0,0 road)
      let rx = (Math.random() - 0.5) * 160;
      let rz = (Math.random() - 0.5) * 160;

      // Prevent spawning directly on central crossroads roads
      if (Math.abs(rx) < 12) rx += Math.sign(rx || 1) * 12;
      if (Math.abs(rz) < 12) rz += Math.sign(rz || 1) * 12;

      this.students.push(new Student(this.engine.scene, rx, rz));
    }
  }

  updateHUDText() {
    document.getElementById('hud-score').textContent = `$${this.score.toFixed(2)}`;
    document.getElementById('hud-delivered').innerHTML = `${this.servedCount}<span class="hud-total-students">/${this.levelTargetDelivered}</span>`;
  }

  /**
   * Fires a food item matching the currently selected type.
   * If a target is in range, throws it at them. If empty, throws it straight.
   */
  launchFoodItem() {
    const foodNames = ['pizza', 'burger', 'taco'];
    const activeFood = foodNames[this.input.selectedFoodIndex];

    // Check cargo stock
    if (this.cargo[activeFood] <= 0) {
      this.particles.spawnFloatingText(
        this.truck.mesh.position,
        'NO CARGO STOCK!',
        '#ff6b8b'
      );
      document.getElementById('hud-instruction-text').textContent = '⚠️ Cargo Empty! Drive back to the CENTRAL REFILL CANOPY (Yellow Depot Ring) to restock!';
      return;
    }

    // Firing Range (increased by Gourmet Launcher upgrade level)
    const baseRange = 22.0;
    const finalRange = baseRange * (1.0 + this.upgrades.launcher * 0.25); // +25% range per level

    // Search for closest hungry student who actually ordered this food type
    let bestTarget = null;
    let closestDist = Infinity;

    this.students.forEach((s) => {
      if (s.state === 'waiting' && s.desiredFoodIndex === this.input.selectedFoodIndex) {
        const dist = this.truck.mesh.position.distanceTo(s.mesh.position);
        if (dist <= finalRange && dist < closestDist) {
          closestDist = dist;
          bestTarget = s;
        }
      }
    });

    // Fling from truck serving window (right side roof)
    const launchOrigin = this.truck.mesh.position.clone();
    launchOrigin.y += 2.0; // Roof elevation

    if (bestTarget) {
      // 1. Target Hit alignment! Consume stock and fire projectile
      this.cargo[activeFood]--;
      this.updateHUDStockUI();

      // Lock student so another pizza doesn't fire at them
      // Actually, we keep it normal. Trigger parabolic projectile:
      const p = new FoodProjectile(
        this.engine.scene,
        this.particles,
        this.input.selectedFoodIndex,
        launchOrigin,
        bestTarget.mesh.position.clone(),
        (finalHitPos) => this.handleFoodImpact(bestTarget, finalHitPos)
      );

      this.projectiles.push(p);

      // Play soft vehicle puff particle
      const truckHeading = new THREE.Vector3(0, 0, 1).applyQuaternion(this.truck.mesh.quaternion);
      this.particles.spawnExhaust(this.truck.mesh.position, truckHeading);
    } 
    else {
      // No targeted student in range. Throw food straight ahead for satisfying interactive arcade physics!
      this.cargo[activeFood]--;
      this.updateHUDStockUI();

      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.truck.mesh.quaternion);
      const throwTarget = launchOrigin.clone().add(forward.multiplyScalar(15));
      
      const p = new FoodProjectile(
        this.engine.scene,
        this.particles,
        this.input.selectedFoodIndex,
        launchOrigin,
        throwTarget,
        (finalHitPos) => {
          // Splat on empty pavement
          this.particles.spawnFloatingText(finalHitPos, 'MISSED!', '#a39eb4');
        }
      );
      this.projectiles.push(p);
    }
  }

  handleFoodImpact(student, impactPos) {
    // Attempt to satisfy student hunger
    const success = student.serveFood(this.input.selectedFoodIndex);
    
    if (success) {
      // 1. Sparkle satisfied particles
      this.particles.spawnSatisfaction(student.mesh.position);

      // 2. Score calculations (underglow multiplies tips by 2x!)
      const baseTip = 10.0 + Math.random() * 8.0;
      const multiplier = this.upgrades.glow > 0 ? 2.0 : 1.0;
      const finalTip = baseTip * multiplier;

      this.score += finalTip;
      this.servedCount++;
      this.updateHUDText();

      // Floating text sprite showing earned reward
      this.particles.spawnFloatingText(
        student.mesh.position,
        `+$${finalTip.toFixed(2)} Tip! 💖`,
        '#ffe162'
      );

      // 3. Time Reward: adds +4 seconds per satisfaction!
      this.timeRemaining += 4.0;
      this.particles.spawnFloatingText(
        new THREE.Vector3(student.mesh.position.x, student.mesh.position.y + 1, student.mesh.position.z),
        `+4s Time! ⏱️`,
        '#4d96ff'
      );

      // Help user understand next steps
      document.getElementById('hud-instruction-text').textContent = 'Nice delivery! Keep searching the campus gardens for more orders!';
    } else {
      // Wrong food somehow impacted them
      this.particles.spawnFloatingText(
        student.mesh.position,
        'WRONG ORDER! ❌',
        '#ff6b8b'
      );
    }
  }

  setupShopUI() {
    document.getElementById('shop-balance').textContent = `$${this.score.toFixed(2)}`;

    // Refresh upgrade cards
    this.refreshUpgradeCard('engine');
    this.refreshUpgradeCard('fridge');
    this.refreshUpgradeCard('launcher');
    this.refreshUpgradeCard('glow');

    // Disable Next Shift button if requirements were not met (or play again)
    const nextBtn = document.getElementById('btn-next-shift');
    if (this.servedCount < this.levelTargetDelivered) {
      nextBtn.disabled = true;
      nextBtn.textContent = 'SHIFT TARGET FAILED! ❌';
    } else {
      nextBtn.disabled = false;
      nextBtn.textContent = 'START NEXT SHIFT 🚚💨';
    }
  }

  refreshUpgradeCard(type) {
    const currentLvl = this.upgrades[type];
    const maxLvl = type === 'glow' ? 1 : 3;
    const dotsContainer = document.getElementById(`dots-${type}`);
    const costText = document.getElementById(`cost-${type}`);
    const btn = document.getElementById(`btn-upgrade-${type}`);

    // Update dots indicator
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      for (let i = 0; i < maxLvl; i++) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        if (i < currentLvl) {
          dot.className += currentLvl === maxLvl ? ' dot maxed' : ' dot filled';
        }
        dotsContainer.appendChild(dot);
      }
    }

    // Update cost details
    if (currentLvl >= maxLvl) {
      costText.textContent = 'MAXED';
      btn.disabled = true;
      document.getElementById(`shop-card-${type}`).classList.add('max-level');
    } else {
      const nextCost = this.upgradeCosts[type][currentLvl];
      costText.textContent = `$${nextCost}`;
      
      // Toggle button enabled/disabled based on cash
      btn.disabled = this.score < nextCost;
    }
  }

  purchaseUpgrade(type) {
    const currentLvl = this.upgrades[type];
    const maxLvl = type === 'glow' ? 1 : 3;

    if (currentLvl >= maxLvl) return;

    const cost = this.upgradeCosts[type][currentLvl];
    if (this.score >= cost) {
      this.score -= cost;
      this.upgrades[type]++;
      
      // Update specific components instantly
      if (type === 'fridge') {
        // Expand fridge capacity (10 ➡️ 15 ➡️ 25 ➡️ 40)
        const capacities = [10, 15, 25, 40];
        this.maxCargoCapacity = capacities[this.upgrades.fridge];
      }
      
      // Refresh shop balance and cards
      this.setupShopUI();
    }
  }

  initGameLoop() {
    const animate = () => {
      requestAnimationFrame(animate);

      const delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta to prevent crazy clipping jumps

      if (this.gameState === 'PLAYING') {
        this.updatePlayingState(delta);
      }

      // Always update particles, map rotators, and render
      this.particles.update(delta);
      this.map.update(delta);
      this.engine.render();
    };

    animate();
  }

  updatePlayingState(delta) {
    // 1. Tick remaining level time
    this.timeRemaining -= delta;
    
    const timerText = document.getElementById('hud-timer');
    const ring = document.getElementById('timer-progress-ring');
    
    if (timerText) {
      timerText.textContent = Math.ceil(Math.max(0, this.timeRemaining));
      
      // Set circular indicator progress
      if (ring) {
        const strokeDashoffset = Math.max(0, 201 - (201 * (this.timeRemaining / (60.0 + this.level * 5.0))));
        ring.style.strokeDashoffset = strokeDashoffset;
        
        // Add alarm warning animation for low time (< 10 seconds)
        if (this.timeRemaining < 10.0) {
          ring.classList.add('timer-warning');
          timerText.style.color = '#ff6b8b';
        } else {
          ring.classList.remove('timer-warning');
          timerText.style.color = '#f7f5fa';
        }
      }
    }

    if (this.timeRemaining <= 0) {
      // Time is up! Check requirements
      if (this.servedCount >= this.levelTargetDelivered) {
        this.transitionTo('SHOP'); // Level completed successfully!
      } else {
        this.transitionTo('GAME_OVER'); // Failed requirements
      }
      return;
    }

    // 2. Drive Food Truck via Physics with bounding-box collision detection
    this.physics.update(
      this.truck.mesh,
      this.input.keys,
      delta,
      this.map.obstacles,
      this.upgrades
    );

    // Update truck visuals (wheel spin/tilt)
    this.truck.update(this.physics.speed, delta);

    // Dynamic tire exhaust particles when driving
    if (Math.abs(this.physics.speed) > 2.0) {
      const exhaustOffset = new THREE.Vector3(0, 0.4, -2.1).applyQuaternion(this.truck.mesh.quaternion);
      const exhaustPos = this.truck.mesh.position.clone().add(exhaustOffset);
      const heading = new THREE.Vector3(0, 0, 1).applyQuaternion(this.truck.mesh.quaternion);
      
      // Spawn exhaust puffs periodically
      if (Math.random() > 0.72) {
        this.particles.spawnExhaust(exhaustPos, heading);
      }
    }

    // Update Speedometer UI HUD
    const speedText = document.getElementById('hud-speed');
    if (speedText) {
      speedText.textContent = Math.round(Math.abs(this.physics.speed));
    }

    // 3. Smooth Lerp camera follow
    this.engine.updateCamera(this.truck.mesh, delta);

    // 4. Central Stock refilling zone detection
    const insideRefill = this.map.isTruckInRefillZone(this.truck.mesh.position);
    if (insideRefill) {
      const isRefillNeeded = this.cargo.pizza < this.maxCargoCapacity ||
                              this.cargo.burger < this.maxCargoCapacity ||
                              this.cargo.taco < this.maxCargoCapacity;

      if (isRefillNeeded) {
        this.refillTimer += delta;
        
        // Quick visual filler tick (restores full cargo in 0.5 seconds)
        if (this.refillTimer >= 0.08) {
          this.refillTimer = 0;
          this.refuelCargoToMax();
          
          // Spawn neon refilling text indicators
          this.particles.spawnFloatingText(
            this.truck.mesh.position,
            'RESTOCKED! 📦🍕🍔🌮',
            '#6bcb77'
          );

          document.getElementById('hud-instruction-text').textContent = '✅ Food Stock Restocked to FULL capacity! Go get \'em!';
        }
      }
    } else {
      this.refillTimer = 0;
    }

    // 5. Spawn dynamic hungry orders on wandering students
    this.studentHungerTimer += delta;
    const hungerSpawnInterval = Math.max(1.8 - this.level * 0.15, 0.7); // Faster requests at higher levels
    
    if (this.studentHungerTimer >= hungerSpawnInterval) {
      this.studentHungerTimer = 0;

      // Select a random, currently non-hungry wandering student
      const freeStudents = this.students.filter(s => s.state === 'wandering');
      if (freeStudents.length > 0) {
        const targetStudent = freeStudents[Math.floor(Math.random() * freeStudents.length)];
        
        // Assign a random desired food index (Pizza, Burger, or Taco)
        const randFood = Math.floor(Math.random() * 3);
        targetStudent.makeHungry(randFood);
      }
    }

    // 6. Periodically spawn new wandering students as satisfied ones leave
    this.studentSpawnTimer += delta;
    if (this.studentSpawnTimer >= 5.0) {
      this.studentSpawnTimer = 0;
      
      const activeCount = this.students.filter(s => s.state !== 'satisfied' && s.state !== 'angry').length;
      const idealCount = 12 + this.level * 2;
      
      if (activeCount < idealCount) {
        // Spawn student at the borders and make them wander in
        const angle = Math.random() * Math.PI * 2;
        const radius = 95.0; // border radius
        const rx = Math.cos(angle) * radius;
        const rz = Math.sin(angle) * radius;

        this.students.push(new Student(this.engine.scene, rx, rz));
      }
    }

    // 7. Update all student nodes (AI movement, timing out waits)
    for (let i = this.students.length - 1; i >= 0; i--) {
      const s = this.students[i];
      s.update(delta);

      // If student left disappointed or satisfied and goes out of bounds, remove them
      const isOut = Math.abs(s.mesh.position.x) > 105 || Math.abs(s.mesh.position.z) > 105;
      
      if ((s.state === 'satisfied' || s.state === 'angry') && isOut) {
        // Penalty for letting hungry students leave disappointed (state is angry)
        if (s.state === 'angry') {
          // Subtract $5 in tips penalty and reduce remaining level time by 3 seconds!
          this.score = Math.max(0, this.score - 5.0);
          this.timeRemaining = Math.max(0, this.timeRemaining - 3.0);
          this.updateHUDText();

          this.particles.spawnFloatingText(
            s.mesh.position,
            '-$5.00 Anger Penalty! 😠',
            '#ff6b8b'
          );
          
          this.particles.spawnFloatingText(
            new THREE.Vector3(s.mesh.position.x, s.mesh.position.y + 1, s.mesh.position.z),
            '-3s Time! ⏱️',
            '#ff6b8b'
          );

          document.getElementById('hud-instruction-text').textContent = '⚠️ A student went home hungry! Check order slots (Keys 1-3) and serve them fast!';
        }

        s.destroy();
        this.students.splice(i, 1);
      }
    }

    // 8. Update all projectile nodes (parabolic flight path, target hit detection)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const isDead = p.update(delta);
      
      if (isDead) {
        this.projectiles.splice(i, 1);
      }
    }
  }
}

// Start Game Orchestrator once DOM loads
window.addEventListener('DOMContentLoaded', () => {
  new GameController();
});
