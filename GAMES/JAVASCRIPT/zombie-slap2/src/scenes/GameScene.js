import * as THREE from 'three';
import { ZombieManager } from '../managers/ZombieManager.js';
import { PlayerHand } from '../entities/PlayerHand.js';
import { UIManager } from '../managers/UIManager.js';
import { AudioManager } from '../managers/AudioManager.js';
import { ScreenShake } from '../effects/ScreenShake.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';





export class GameScene {
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    
    // Set up dark nighttime background and fog
    this.scene.background = new THREE.Color(0x0a0718);
    this.scene.fog = new THREE.FogExp2(0x0a0718, 0.04);
    
    this.lights = [];
    this.environmentMeshes = [];
    
    this.init();
  }
  
  init() {
    this._setupLights();
    this._createRoad();
    this._createSidewalks();
    this._createStreetLights();
    this._createBuildings();
    this._createEnvironmentProps();
    
    // Reset camera to static gameplay defaults (in case we came from cinematic menu sway)
    this.game.camera.position.set(0, 2.2, 5.5);
    this.game.camera.rotation.set(-0.12, 0, 0);
    
    // Core game state
    this.score = 0;
    this.zombiesSlapped = 0;
    this.health = 5;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.musicStarted = false;
    
    this.survivalTime = 0.0;
    this.difficultyTimer = 0.0;
    this.difficultyLevel = 0;
    this.isGameOver = false;
    
    // Initialize Audio Manager
    this.audioManager = new AudioManager();
    this.audioManager.init();
    
    // Initialize UI Manager
    this.uiManager = new UIManager();
    this.uiManager.init();
    
    // Initialize Screen Shake
    this.screenShake = new ScreenShake(this.game.camera);
    
    // Initialize 3D Particle System
    this.particleSystem = new ParticleSystem(this.scene);
    
    // Initialize zombie manager
    this.zombieManager = new ZombieManager(this);
    this.zombieManager.onZombieEscaped((zombie) => {
      if (this.isGameOver) return;
      
      this.health = Math.max(0, this.health - 1);
      this.uiManager.updateHealth(this.health);
      
      // Play damage effects
      this.audioManager.playGroan();
      this.screenShake.shake(0.35, 0.28);
      
      // Reset combo chain on damage
      this.comboCount = 0;
      this.uiManager.hideCombo();
      
      console.warn(`Health reduced: ${this.health}`);
      
      if (this.health <= 0) {
        this.isGameOver = true;
        this.audioManager.playGameOver();
        this.uiManager.showGameOver(this.score, this.zombiesSlapped, this.survivalTime);
        
        // Bind Play Again restart button on Game Over overlay
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
          restartBtn.onclick = () => {
            this.game.changeScene(new GameScene(this.game));
          };
        }
      }
    });
    
    // Initialize player hand attached to camera
    this.playerHand = new PlayerHand(this.game.camera);
    
    // Raycaster for click/tap hit detection
    this.raycaster = new THREE.Raycaster();
    
    // Set up swipe state trackers
    this.isSwiping = false;
    this.swipeHitActive = false;
    this.prevPointerPos = new THREE.Vector2();
    this.chargeTimer = 0.0;
    this.isCharging = false;
    this.chargeSoundObj = null;
    
    this.isTimeFrozen = false;
    this.freezeTimer = 0.0;
    
    // Set up inputs
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    
    this.game.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.game.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.game.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
  }
  
  getThreeScene() {
    return this.scene;
  }
  
  update(deltaTime) {
    if (this.isGameOver) return;
    
    // 1. Time Freeze check (adjust zombie delta time)
    let zombieDt = deltaTime;
    if (this.isTimeFrozen) {
      this.freezeTimer -= deltaTime;
      zombieDt = deltaTime * 0.08; // zombies move at a crawl
      
      if (this.freezeTimer <= 0) {
        this.isTimeFrozen = false;
        this.uiManager.setFreezeActive(false);
        console.log("Time unfrozen.");
      }
    }
    
    if (this.zombieManager) {
      this.zombieManager.update(zombieDt);
    }
    if (this.playerHand) {
      this.playerHand.update(deltaTime);
    }
    if (this.screenShake) {
      this.screenShake.update(deltaTime);
    }
    if (this.particleSystem) {
      this.particleSystem.update(deltaTime);
    }
    
    // Handle Mega Slap charging
    if (this.isSwiping) {
      this.chargeTimer += deltaTime;
      if (this.chargeTimer >= 0.15 && !this.isCharging) {
        this.isCharging = true;
        this.chargeSoundObj = this.audioManager.playChargeUp(0.35);
      }
      
      if (this.isCharging && this.playerHand) {
        // Jitter hand position to indicate charging
        const jitter = Math.min(0.06, (this.chargeTimer - 0.15) * 0.12);
        this.playerHand.group.position.x += (Math.random() - 0.5) * jitter;
        this.playerHand.group.position.y += (Math.random() - 0.5) * jitter;
      }
    }
    
    // Accumulate survival timing
    this.survivalTime += deltaTime;
    this.difficultyTimer += deltaTime;
    
    // Scale difficulty every 30 seconds
    if (this.difficultyTimer >= 30.0) {
      this.difficultyTimer = 0.0;
      this.difficultyLevel++;
      
      // Scale variables:
      // +10% zombie speed
      const speedMultiplier = 1.0 + (this.difficultyLevel * 0.10);
      // Reduce spawn interval: 2.0s -> 1.75s -> 1.5s -> 1.25s (min 0.75s)
      const spawnInterval = Math.max(0.75, 2.0 - (this.difficultyLevel * 0.25));
      // Increase max simultaneous zombies
      const maxZombies = 12 + (this.difficultyLevel * 2);
      
      this.zombieManager.setDifficulty(speedMultiplier, spawnInterval, maxZombies);
      
      // Spawn alert particle
      const screenX = window.innerWidth / 2;
      const screenY = window.innerHeight * 0.2;
      this.uiManager.spawnComicWord(screenX, screenY);
      
      console.log(`Difficulty Level Up! Now level ${this.difficultyLevel}. SpeedMult: ${speedMultiplier.toFixed(2)}, Interval: ${spawnInterval.toFixed(2)}s`);
    }
    
    // Decay combo multiplier timer (must hit within 2.0s to maintain chain)
    if (this.comboCount > 0) {
      this.comboTimer += deltaTime;
      if (this.comboTimer >= 2.0) {
        this.comboCount = 0;
        this.uiManager.hideCombo();
      }
    }
  }
  
  destroy() {
    // Unbind events
    this.game.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.game.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.game.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    
    this._stopChargeSound();
    
    // Stop loops
    if (this.audioManager) {
      this.audioManager.stopMusic();
    }
    
    // Clean up particles
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }
    
    // Clean up player hand
    if (this.playerHand) {
      this.game.camera.remove(this.playerHand.group);
      this.playerHand.group.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    
    if (this.zombieManager) {
      this.zombieManager.destroy();
    }
    // Dispose of geometries and materials to avoid memory leaks
    this.scene.traverse((object) => {
      if (object.isMesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }

  onPointerDown(event) {
    if (this.isGameOver) return;
    
    const rect = this.game.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.prevPointerPos.set(x, y);
    this.isSwiping = true;
    this.swipeHitActive = true;
    this.chargeTimer = 0.0;
    this.isCharging = false;
    
    if (this.audioManager && !this.musicStarted) {
      this.audioManager.startMusic();
      this.musicStarted = true;
    }
  }

  onPointerMove(event) {
    if (this.isGameOver || !this.isSwiping) return;
    
    const rect = this.game.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const mouse = new THREE.Vector2(x, y);
    const delta = new THREE.Vector2().subVectors(mouse, this.prevPointerPos);
    
    // Dragging mouse kills the charge mechanic
    if (delta.length() > 0.06) {
      if (this.isCharging) {
        this.isCharging = false;
        this.chargeTimer = 0.0;
        this._stopChargeSound();
      }
    }
    
    // Check swipe threshold
    if (delta.length() > 0.08 && this.swipeHitActive) {
      this.raycaster.setFromCamera(mouse, this.game.camera);
      
      const targetObjects = this.zombieManager.zombies.map(z => z.group);
      const intersects = this.raycaster.intersectObjects(targetObjects, true);
      
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        
        let hitObj = intersects[0].object;
        let zombieInstance = null;
        while (hitObj) {
          if (hitObj.userData && hitObj.userData.zombieInstance) {
            zombieInstance = hitObj.userData.zombieInstance;
            break;
          }
          hitObj = hitObj.parent;
        }
        
        if (zombieInstance && zombieInstance.state === 'walking') {
          // Swipe force based on delta speed
          const swipeForce = Math.min(2.2, delta.length() * 12);
          
          // Knocks zombie away aligned with 2D pointer swipe direction projected to 3D
          const swipeDir = new THREE.Vector3(delta.x * 4.0, delta.y * 3.0 + 1.2, -1.0).normalize();
          
          this._executeSlap(zombieInstance, hitPoint, swipeDir, swipeForce);
          this.swipeHitActive = false; // hit only 1 zombie per drag stroke
        }
      }
      this.prevPointerPos.copy(mouse);
    }
  }

  onPointerUp(event) {
    if (this.isGameOver || !this.isSwiping) return;
    
    this.isSwiping = false;
    
    // 1. Check if Mega Slap was charged
    if (this.isCharging) {
      this.isCharging = false;
      this._stopChargeSound();
      
      if (this.chargeTimer >= 0.45) {
        this._triggerMegaShockwave();
        return;
      }
    }
    
    // 2. Fallback to normal click slap if no swipe target was triggered
    if (this.swipeHitActive) {
      const rect = this.game.renderer.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      const mouse = new THREE.Vector2(x, y);
      this.raycaster.setFromCamera(mouse, this.game.camera);
      
      const camDir = new THREE.Vector3();
      this.game.camera.getWorldDirection(camDir);
      const planePoint = this.game.camera.position.clone().addScaledVector(camDir, 3.0);
      const planeNormal = camDir.clone().negate();
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
      
      const targetPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, targetPoint);
      
      const targetObjects = this.zombieManager.zombies.map(z => z.group);
      const intersects = this.raycaster.intersectObjects(targetObjects, true);
      
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        
        let hitObj = intersects[0].object;
        let zombieInstance = null;
        while (hitObj) {
          if (hitObj.userData && hitObj.userData.zombieInstance) {
            zombieInstance = hitObj.userData.zombieInstance;
            break;
          }
          hitObj = hitObj.parent;
        }
        
        if (zombieInstance && zombieInstance.state === 'walking') {
          const slapDir = new THREE.Vector3().subVectors(zombieInstance.getPosition(), this.game.camera.position);
          slapDir.x += mouse.x * 2.8; 
          slapDir.y += 1.6;
          slapDir.z -= 1.0;
          slapDir.normalize();
          
          this._executeSlap(zombieInstance, hitPoint, slapDir, 1.0);
        } else {
          this.playerHand.slap(targetPoint);
          this.audioManager.playSlap();
        }
      } else {
        this.playerHand.slap(targetPoint);
        this.audioManager.playSlap();
      }
    }
  }

  _executeSlap(zombie, hitPoint, direction, force = 1.0) {
    const hitResult = zombie.hit(direction, force);
    
    if (hitResult === 'helmet_pop') {
      this.audioManager.playMetalClink();
      this.screenShake.shake(0.08, 0.12);
      
      // Spawn tiny yellow helmet shards (particles)
      this.particleSystem.particleMat.color.setHex(0xb0bec5);
      this.particleSystem.spawnBurst(hitPoint, 6);
      
      // Score points for popping helmets
      this.score += 50;
      this.uiManager.updateScore(this.score);
      
      // Floating text
      const tempV = hitPoint.clone().project(this.game.camera);
      const screenX = (tempV.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;
      this.uiManager.spawnComicWord(screenX, screenY);
      
      // Strike hand visuals
      this.playerHand.slap(hitPoint);
    } else if (hitResult === 'killed') {
      this.audioManager.playSlap();
      if (Math.random() < 0.35) {
        this.audioManager.playGroan();
      }
      
      this.screenShake.shake(0.12 * force, 0.15);
      
      // Select particle colors depending on zombie types
      let particleColor = 0x9eff4b; // lime green
      if (zombie.type === 'frozen') {
        particleColor = 0x80deea; // cyan glow
      } else if (zombie.type === 'hazmat') {
        particleColor = 0xff9800; // orange sparks
      }
      
      this.particleSystem.particleMat.color.setHex(particleColor);
      this.particleSystem.spawnBurst(hitPoint, 10 + Math.floor(Math.random() * 5));
      
      // Floating text
      const tempV = hitPoint.clone().project(this.game.camera);
      const screenX = (tempV.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;
      this.uiManager.spawnComicWord(screenX, screenY);
      
      // Visual Hand strike
      this.playerHand.slap(hitPoint);
      
      // Score and combo tracking
      this.zombiesSlapped++;
      this.uiManager.updateSlaps(this.zombiesSlapped);
      
      if (this.comboCount === 0 || this.comboTimer < 2.0) {
        this.comboCount++;
      } else {
        this.comboCount = 1;
      }
      this.comboTimer = 0.0;
      if (this.comboCount >= 2) {
        this.uiManager.showCombo(this.comboCount);
      }
      
      const basePoints = zombie.type === 'runner' ? 150 : 100;
      this.score += basePoints * this.comboCount;
      this.uiManager.updateScore(this.score);
      
      // Handle special class abilities
      if (zombie.type === 'hazmat') {
        this._triggerHazmatExplosion(zombie.getPosition(), hitPoint);
      } else if (zombie.type === 'frozen') {
        this._triggerTimeFreeze();
      }
    }
  }

  _triggerHazmatExplosion(zombiePos, hitPoint) {
    this.audioManager.playExplosion();
    this.screenShake.shake(0.38, 0.35);
    
    // Spawn massive fiery orange particles
    this.particleSystem.particleMat.color.setHex(0xff5722);
    this.particleSystem.spawnBurst(zombiePos, 22);
    
    // Explode other zombies within 4.8 units radius
    this.zombieManager.zombies.forEach((other) => {
      if (other.state === 'walking') {
        const distance = other.getPosition().distanceTo(zombiePos);
        if (distance <= 4.8) {
          const pushDirection = new THREE.Vector3().subVectors(other.getPosition(), zombiePos);
          pushDirection.y += 1.5;
          pushDirection.z -= 0.5;
          pushDirection.normalize();
          
          other.hit(pushDirection, 1.3);
          
          // Collateral statistics
          this.zombiesSlapped++;
          this.uiManager.updateSlaps(this.zombiesSlapped);
          this.score += 150 * this.comboCount;
          this.uiManager.updateScore(this.score);
          
          // Spawn collateral text popup
          const tempV = other.getPosition().clone().project(this.game.camera);
          const screenX = (tempV.x * 0.5 + 0.5) * window.innerWidth;
          const screenY = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;
          this.uiManager.spawnComicWord(screenX, screenY);
        }
      }
    });
  }

  _triggerTimeFreeze() {
    this.audioManager.playIceChime();
    this.isTimeFrozen = true;
    this.freezeTimer = 4.0; // 4 seconds freeze
    this.uiManager.setFreezeActive(true);
    
    console.log("Time Frozen!");
  }

  _triggerMegaShockwave() {
    this.audioManager.playShockwave();
    this.screenShake.shake(0.48, 0.4);
    
    // Project shockwave particles on the street
    const shockwaveOrigin = new THREE.Vector3(0, 1.2, 0);
    this.particleSystem.particleMat.color.setHex(0xffeb3b); // Gold sparks
    this.particleSystem.spawnBurst(shockwaveOrigin, 32);
    
    // Slap all zombies Z coordinate >= -25 (close to player view)
    this.zombieManager.zombies.forEach((zombie) => {
      if (zombie.state === 'walking' && zombie.getPosition().z >= -25) {
        const blastDirection = new THREE.Vector3(
          (Math.random() - 0.5) * 2.0,
          1.8,
          -1.6
        ).normalize();
        
        zombie.hit(blastDirection, 1.5);
        
        this.zombiesSlapped++;
        this.uiManager.updateSlaps(this.zombiesSlapped);
        this.score += 200 * this.comboCount;
        this.uiManager.updateScore(this.score);
        
        // Spawn popups
        const tempV = zombie.getPosition().clone().project(this.game.camera);
        const screenX = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;
        this.uiManager.spawnComicWord(screenX, screenY);
      }
    });
    
    // Slap animation
    this.playerHand.slap(new THREE.Vector3(0, 0, -2));
  }

  _stopChargeSound() {
    if (this.chargeSoundObj) {
      try {
        this.chargeSoundObj.osc.stop();
      } catch (e) {}
      this.chargeSoundObj = null;
    }
  }
  
  _setupLights() {
    // 1. Ambient Light - deep blue nighttime ambience
    const ambientLight = new THREE.AmbientLight(0x1a1e36, 0.6);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);
    
    // 2. Directional Light - moonlight casting shadows from above/behind
    const moonlight = new THREE.DirectionalLight(0x455688, 0.8);
    moonlight.position.set(5, 20, 10);
    moonlight.castShadow = true;
    moonlight.shadow.mapSize.width = 1024;
    moonlight.shadow.mapSize.height = 1024;
    moonlight.shadow.camera.near = 0.5;
    moonlight.shadow.camera.far = 40;
    moonlight.shadow.camera.left = -15;
    moonlight.shadow.camera.right = 15;
    moonlight.shadow.camera.top = 15;
    moonlight.shadow.camera.bottom = -15;
    moonlight.shadow.bias = -0.0005;
    this.scene.add(moonlight);
    this.lights.push(moonlight);
  }
  
  _createRoad() {
    // Main road plane (Z goes from +10 to -70)
    const roadWidth = 10;
    const roadLength = 90;
    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x121118,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -25);
    road.receiveShadow = true;
    this.scene.add(road);
    this.environmentMeshes.push(road);
    
    // Road dashes (yellow center divider)
    const lineGeo = new THREE.PlaneGeometry(0.2, 3);
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xd6a827,
      roughness: 0.9,
      emissive: 0x221a00 // Slight emissive glow to make yellow look stylized
    });
    
    for (let z = 5; z > -70; z -= 8) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.01, z);
      line.receiveShadow = true;
      this.scene.add(line);
      this.environmentMeshes.push(line);
    }
  }
  
  _createSidewalks() {
    const sidewalkWidth = 4;
    const sidewalkLength = 90;
    const height = 0.2; // Raised above the road
    
    const sidewalkGeo = new THREE.BoxGeometry(sidewalkWidth, height, sidewalkLength);
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x24232c,
      roughness: 0.7
    });
    
    // Left sidewalk
    const leftSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    leftSidewalk.position.set(-7, height / 2, -25);
    leftSidewalk.receiveShadow = true;
    leftSidewalk.castShadow = true;
    this.scene.add(leftSidewalk);
    this.environmentMeshes.push(leftSidewalk);
    
    // Right sidewalk
    const rightSidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    rightSidewalk.position.set(7, height / 2, -25);
    rightSidewalk.receiveShadow = true;
    rightSidewalk.castShadow = true;
    this.scene.add(rightSidewalk);
    this.environmentMeshes.push(rightSidewalk);
    
    // Sidewalk Curbs (darker details on edge)
    const curbGeo = new THREE.BoxGeometry(0.3, height + 0.05, sidewalkLength);
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x1b1a20,
      roughness: 0.8
    });
    
    const leftCurb = new THREE.Mesh(curbGeo, curbMat);
    leftCurb.position.set(-5.15, (height + 0.05) / 2, -25);
    leftCurb.receiveShadow = true;
    leftCurb.castShadow = true;
    this.scene.add(leftCurb);
    
    const rightCurb = new THREE.Mesh(curbGeo, curbMat);
    rightCurb.position.set(5.15, (height + 0.05) / 2, -25);
    rightCurb.receiveShadow = true;
    rightCurb.castShadow = true;
    this.scene.add(rightCurb);
  }
  
  _createStreetLights() {
    const lightPositions = [
      { x: -5, z: 0 },
      { x: 5, z: -15 },
      { x: -5, z: -30 },
      { x: 5, z: -45 },
      { x: -5, z: -60 }
    ];
    
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x1f2230,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const bulbMat = new THREE.MeshBasicMaterial({
      color: 0xfffae0
    });
    
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xfffae0,
      transparent: true,
      opacity: 0.6,
      emissive: 0xfffae0,
      emissiveIntensity: 0.8
    });
    
    lightPositions.forEach((pos) => {
      const group = new THREE.Group();
      group.position.set(pos.x, 0.2, pos.z); // Start from sidewalk level
      
      // Main vertical pole
      const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 5, 8);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.5;
      pole.castShadow = true;
      pole.receiveShadow = true;
      group.add(pole);
      
      // Arm reaching over road
      const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8);
      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.rotation.z = Math.PI / 2;
      // Reaches towards the road (x=0)
      const directionSign = pos.x > 0 ? -1 : 1;
      arm.position.set(0.75 * directionSign, 4.9, 0);
      arm.castShadow = true;
      group.add(arm);
      
      // Light Fixture (head)
      const headGeo = new THREE.BoxGeometry(0.4, 0.3, 0.6);
      const head = new THREE.Mesh(headGeo, poleMat);
      head.position.set(1.4 * directionSign, 4.8, 0);
      head.castShadow = true;
      group.add(head);
      
      // Glowing bulb
      const bulbGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const bulb = new THREE.Mesh(bulbGeo, glassMat);
      bulb.position.set(1.4 * directionSign, 4.6, 0);
      group.add(bulb);
      
      // actual Spotlight source pointing straight down
      const spotLight = new THREE.SpotLight(0xffea8c, 6, 18, Math.PI / 3.5, 0.6, 1.2);
      spotLight.position.set(1.4 * directionSign, 4.5, 0);
      spotLight.target.position.set(1.4 * directionSign, 0, 0);
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 512;
      spotLight.shadow.mapSize.height = 512;
      spotLight.shadow.bias = -0.001;
      spotLight.shadow.camera.near = 0.5;
      spotLight.shadow.camera.far = 18;
      
      group.add(spotLight);
      group.add(spotLight.target);
      
      // Visual light cone mesh (stylized volumetric look using cheap transparent geometry)
      const coneGeo = new THREE.ConeGeometry(3.5, 5, 16, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xffea8c,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(1.4 * directionSign, 2.0, 0);
      // Cones are centered on y, so offset it
      group.add(cone);
      
      this.scene.add(group);
      this.environmentMeshes.push(group);
    });
  }
  
  _createBuildings() {
    const buildingColors = [0x151622, 0x1a1526, 0x121724];
    
    // Grid of building positions along sides
    // Z spacing
    for (let z = 10; z > -80; z -= 12) {
      // Left side buildings
      this._spawnBuilding(-12, z, buildingColors);
      
      // Right side buildings
      this._spawnBuilding(12, z, buildingColors);
    }
  }
  
  _spawnBuilding(xOffset, zPos, colors) {
    const height = 12 + Math.random() * 12;
    const width = 6 + Math.random() * 4;
    const depth = 8 + Math.random() * 4;
    
    const geo = new THREE.BoxGeometry(width, height, depth);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.95,
      metalness: 0.05
    });
    
    const building = new THREE.Mesh(geo, mat);
    building.position.set(xOffset, height / 2, zPos);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);
    this.environmentMeshes.push(building);
    
    // Add windows
    const windowColor = 0xffdf5e;
    const windowMat = new THREE.MeshBasicMaterial({
      color: windowColor
    });
    
    const windowGeo = new THREE.PlaneGeometry(0.4, 0.6);
    
    // Determine which side of the building faces the street
    // Left buildings face x+, right buildings face x-
    const isLeft = xOffset < 0;
    const faceX = isLeft ? (width / 2 + 0.02) : -(width / 2 + 0.02);
    
    const floors = Math.floor(height / 2.5);
    const columns = Math.floor(depth / 2);
    
    for (let f = 1; f < floors; f++) {
      // Only spawn windows randomly to give a realistic, cool dark cartoon cityscape vibe
      for (let c = 0; c < columns; c++) {
        if (Math.random() > 0.4) {
          const win = new THREE.Mesh(windowGeo, windowMat);
          const zLocal = -depth / 2 + 1.2 + c * 2;
          const yLocal = f * 2.3;
          
          win.position.set(building.position.x + faceX, yLocal, building.position.z + zLocal);
          
          // Rotate window plane to face the street
          win.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
          
          this.scene.add(win);
          this.environmentMeshes.push(win);
        }
      }
    }
  }
  
  _createEnvironmentProps() {
    // Add some garbage cans or dumpsters on the sidewalk
    const propMat = new THREE.MeshStandardMaterial({
      color: 0x1f3b2b, // Dark green dumpster
      roughness: 0.6,
      metalness: 0.3
    });
    
    const dumpsterGeo = new THREE.BoxGeometry(1.5, 1.2, 2.5);
    
    // Place a dumpster on the left sidewalk
    const dumpster = new THREE.Mesh(dumpsterGeo, propMat);
    dumpster.position.set(-6.5, 0.8, -5);
    dumpster.rotation.y = 0.1;
    dumpster.castShadow = true;
    dumpster.receiveShadow = true;
    this.scene.add(dumpster);
    this.environmentMeshes.push(dumpster);
    
    // Add metal bars / fire hydrants or crates
    const crateGeo = new THREE.BoxGeometry(1, 1, 1);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x422f25, // Wooden brown
      roughness: 0.8
    });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(6.2, 0.7, -8);
    crate.rotation.y = -0.2;
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);
    this.environmentMeshes.push(crate);
  }
}
