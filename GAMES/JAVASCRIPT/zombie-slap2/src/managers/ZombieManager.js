import { Zombie } from '../entities/Zombie.js';

export class ZombieManager {
  constructor(gameScene, options = {}) {
    this.gameScene = gameScene;
    this.threeScene = gameScene.getThreeScene();
    
    this.zombies = [];
    
    // Spawning parameters
    this.spawnInterval = options.spawnInterval || 2.0; // Start with a zombie every 2 seconds
    this.spawnTimer = 0;
    this.baseSpeed = options.baseSpeed || 1.1;
    this.speedMultiplier = 1.0;
    this.maxZombies = options.maxZombies || 12; // Maximum simultaneous zombies
    
    // Position parameters
    this.spawnZ = -60; // Spawn far down the road
    this.playerHitZ = 4.8; // Camera is at 5.5, Z=4.8 is in-face
    
    // Event callback
    this.onZombieEscapedCallback = null;
  }
  
  onZombieEscaped(callback) {
    this.onZombieEscapedCallback = callback;
  }
  
  update(deltaTime) {
    // 1. Spawning Logic
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      if (this.zombies.length < this.maxZombies) {
        this.spawnZombie();
      }
    }
    
    // 2. Update and Filter Zombies
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i];
      zombie.update(deltaTime);
      
      // Check if zombie reached the player camera
      if (zombie.state === 'walking' && zombie.getPosition().z >= this.playerHitZ) {
        // Trigger damage
        if (this.onZombieEscapedCallback) {
          this.onZombieEscapedCallback(zombie);
        }
        
        // Remove zombie from scene and array
        zombie.destroy();
        this.zombies.splice(i, 1);
        continue;
      }
      
      // Check if zombie is dead and finished fading
      if (zombie.canDelete) {
        zombie.destroy();
        this.zombies.splice(i, 1);
      }
    }
  }
  
  spawnZombie() {
    // Randomize lateral spawn offset to cover road and inner sidewalks
    const xSpawn = (Math.random() - 0.5) * 7.5; 
    
    // Scale zombie size and adjust its speed proportionally (smaller = faster)
    const scale = 0.8 + Math.random() * 0.4;
    const speed = this.baseSpeed * this.speedMultiplier * (1.3 - (scale - 0.8) * 0.5); 
    
    // Determine type by probability
    const rand = Math.random();
    let type = 'normal';
    if (rand < 0.55) {
      type = 'normal';
    } else if (rand < 0.70) {
      type = 'runner';
    } else if (rand < 0.85) {
      type = 'helmet';
    } else if (rand < 0.95) {
      type = 'hazmat';
    } else {
      type = 'frozen';
    }
    
    const zombie = new Zombie(this.threeScene, {
      xSpawn: xSpawn,
      zSpawn: this.spawnZ,
      speed: speed,
      scale: scale,
      type: type
    });
    
    this.zombies.push(zombie);
    console.log(`Zombie (${type}) spawned at x:${xSpawn.toFixed(2)}, z:${this.spawnZ}. Count: ${this.zombies.length}`);
  }
  
  setDifficulty(speedMultiplier, spawnInterval, maxZombies) {
    this.speedMultiplier = speedMultiplier;
    this.spawnInterval = spawnInterval;
    if (maxZombies !== undefined) {
      this.maxZombies = maxZombies;
    }
    console.log(`Difficulty scaled. SpeedMult: ${this.speedMultiplier.toFixed(2)}, Spacing: ${this.spawnInterval.toFixed(2)}s`);
  }
  
  destroy() {
    // Clean up all zombies
    this.zombies.forEach((zombie) => zombie.destroy());
    this.zombies = [];
  }
}
