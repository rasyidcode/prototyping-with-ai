import * as THREE from 'three';

// Procedural texture generator for canvas decals and floor grids
function createGridTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#06060c';
  ctx.fillRect(0, 0, size, size);

  // Grid lines
  ctx.strokeStyle = 'rgba(0, 242, 254, 0.1)';
  ctx.lineWidth = 4;
  const step = size / 8;
  for (let i = 0; i <= size; i += step) {
    // Vertical
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Boxing center circle
  ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(254, 9, 121, 0.4)';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 4, 0, Math.PI * 2);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

// Stickman Character Controller
class Stickman {
  constructor(scene, isPlayer, colorHex, gloveColorHex, name) {
    this.scene = scene;
    this.isPlayer = isPlayer;
    this.colorHex = colorHex;
    this.gloveColorHex = gloveColorHex;
    this.name = name;

    // State Variables
    this.hp = 100;
    this.maxHp = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.special = 0;
    this.maxSpecial = 100;
    this.state = 'idle'; // idle, punch-l, punch-r, block, dodge-l, dodge-r, hit, staggered, ko
    
    this.actionProgress = 0; // 0 to 1 for punch/dodge interpolations
    this.actionSpeed = 1;
    this.staggerTimer = 0;
    this.hitReactionTimer = 0;
    this.dodgeCooldown = 0;

    // Movement positions
    this.position = new THREE.Vector3(0, 0, isPlayer ? 2.5 : -2.5);
    this.targetPosition = this.position.clone();
    this.rotationY = isPlayer ? 0 : Math.PI;

    // Rigging meshes
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;
    scene.add(this.group);

    // Build Character joints and bones hierarchy
    this.buildSkeleton();
  }

  buildSkeleton() {
    // Materials
    this.neonMaterial = new THREE.MeshStandardMaterial({
      color: this.colorHex,
      emissive: this.colorHex,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.8
    });

    this.gloveMaterial = new THREE.MeshStandardMaterial({
      color: this.gloveColorHex,
      emissive: this.gloveColorHex,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.5
    });

    this.jointGeo = new THREE.SphereGeometry(0.12, 16, 16);
    this.boneGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 8);
    this.gloveGeo = new THREE.SphereGeometry(0.24, 16, 16);

    // Pelvis (Root node of hierarchy)
    this.pelvis = new THREE.Group();
    const pelvisSphere = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), this.neonMaterial);
    this.pelvis.add(pelvisSphere);
    this.group.add(this.pelvis);

    // Spine
    this.spine = new THREE.Group();
    this.spine.position.set(0, 0.2, 0);
    this.pelvis.add(this.spine);

    const spineBone = new THREE.Mesh(this.boneGeo, this.neonMaterial);
    spineBone.scale.set(1, 0.8, 1);
    spineBone.position.set(0, 0.4, 0);
    this.spine.add(spineBone);

    // Chest / Shoulder Center
    this.chest = new THREE.Group();
    this.chest.position.set(0, 0.8, 0);
    this.spine.add(this.chest);

    const chestSphere = new THREE.Mesh(this.jointGeo, this.neonMaterial);
    this.chest.add(chestSphere);

    // Neck
    this.neck = new THREE.Group();
    this.neck.position.set(0, 0.1, 0);
    this.chest.add(this.neck);

    const neckBone = new THREE.Mesh(this.boneGeo, this.neonMaterial);
    neckBone.scale.set(1, 0.2, 1);
    neckBone.position.set(0, 0.1, 0);
    this.neck.add(neckBone);

    // Head (Will attach the face mesh inside the game initializer)
    this.head = new THREE.Group();
    this.head.position.set(0, 0.2, 0);
    this.neck.add(this.head);

    // Left Arm
    this.lShoulder = new THREE.Group();
    this.lShoulder.position.set(-0.5, 0, 0);
    this.chest.add(this.lShoulder);
    this.lShoulder.add(new THREE.Mesh(this.jointGeo, this.neonMaterial));

    this.lUpperArm = new THREE.Group();
    this.lShoulder.add(this.lUpperArm);
    const lUpperArmBone = new THREE.Mesh(this.boneGeo, this.neonMaterial);
    lUpperArmBone.scale.set(1, 0.5, 1);
    lUpperArmBone.position.set(0, -0.25, 0);
    this.lUpperArm.add(lUpperArmBone);

    this.lElbow = new THREE.Group();
    this.lElbow.position.set(0, -0.5, 0);
    this.lUpperArm.add(this.lElbow);
    this.lElbow.add(new THREE.Mesh(this.jointGeo, this.neonMaterial));

    this.lForearm = new THREE.Group();
    this.lElbow.add(this.lForearm);
    const lForearmBone = new THREE.Mesh(this.boneGeo, this.neonMaterial);
    lForearmBone.scale.set(1, 0.5, 1);
    lForearmBone.position.set(0, -0.25, 0);
    this.lForearm.add(lForearmBone);

    this.lHand = new THREE.Group();
    this.lHand.position.set(0, -0.5, 0);
    this.lForearm.add(this.lHand);
    this.lGlove = new THREE.Mesh(this.gloveGeo, this.gloveMaterial);
    this.lHand.add(this.lGlove);

    // Right Arm
    this.rShoulder = new THREE.Group();
    this.rShoulder.position.set(0.5, 0, 0);
    this.chest.add(this.rShoulder);
    this.rShoulder.add(new THREE.Mesh(this.jointGeo, this.neonMaterial));

    this.rUpperArm = new THREE.Group();
    this.rShoulder.add(this.rUpperArm);
    const rUpperArmBone = new THREE.Mesh(this.boneGeo, this.neonMaterial);
    rUpperArmBone.scale.set(1, 0.5, 1);
    rUpperArmBone.position.set(0, -0.25, 0);
    this.rUpperArm.add(rUpperArmBone);

    this.rElbow = new THREE.Group();
    this.rElbow.position.set(0, -0.5, 0);
    this.rUpperArm.add(this.rElbow);
    this.rElbow.add(new THREE.Mesh(this.jointGeo, this.neonMaterial));

    this.rForearm = new THREE.Group();
    this.rElbow.add(this.rForearm);
    const rForearmBone = new THREE.Mesh(this.boneGeo, this.neonMaterial);
    rForearmBone.scale.set(1, 0.5, 1);
    rForearmBone.position.set(0, -0.25, 0);
    this.rForearm.add(rForearmBone);

    this.rHand = new THREE.Group();
    this.rHand.position.set(0, -0.5, 0);
    this.rForearm.add(this.rHand);
    this.rGlove = new THREE.Mesh(this.gloveGeo, this.gloveMaterial);
    this.rHand.add(this.rGlove);

    // Left Leg
    this.lHip = new THREE.Group();
    this.lHip.position.set(-0.25, -0.1, 0);
    this.pelvis.add(this.lHip);
    this.lHip.add(new THREE.Mesh(this.jointGeo, this.neonMaterial));

    this.lThigh = new THREE.Group();
    this.lHip.add(this.lThigh);
    const lThighBone = new THREE.Mesh(this.boneGeo, this.neonMaterial);
    lThighBone.scale.set(1, 0.6, 1);
    lThighBone.position.set(0, -0.3, 0);
    this.lThigh.add(lThighBone);

    this.lKnee = new THREE.Group();
    this.lKnee.position.set(0, -0.6, 0);
    this.lThigh.add(this.lKnee);
    this.lKnee.add(new THREE.Mesh(this.jointGeo, this.neonMaterial));

    this.lShin = new THREE.Group();
    this.lKnee.add(this.lShin);
    const lShinBone = new THREE.Mesh(this.boneGeo, this.neonMaterial);
    lShinBone.scale.set(1, 0.6, 1);
    lShinBone.position.set(0, -0.3, 0);
    this.lShin.add(lShinBone);

    this.lFoot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), this.neonMaterial);
    this.lFoot.position.set(0, -0.6, 0);
    this.lShin.add(this.lFoot);

    // Right Leg
    this.rHip = new THREE.Group();
    this.rHip.position.set(0.25, -0.1, 0);
    this.pelvis.add(this.rHip);
    this.rHip.add(new THREE.Mesh(this.jointGeo, this.neonMaterial));

    this.rThigh = new THREE.Group();
    this.rHip.add(this.rThigh);
    const rThighBone = new THREE.Mesh(this.boneGeo, this.neonMaterial);
    rThighBone.scale.set(1, 0.6, 1);
    rThighBone.position.set(0, -0.3, 0);
    this.rThigh.add(rThighBone);

    this.rKnee = new THREE.Group();
    this.rKnee.position.set(0, -0.6, 0);
    this.rThigh.add(this.rKnee);
    this.rKnee.add(new THREE.Mesh(this.jointGeo, this.neonMaterial));

    this.rShin = new THREE.Group();
    this.rKnee.add(this.rShin);
    const rShinBone = new THREE.Mesh(this.boneGeo, this.neonMaterial);
    rShinBone.scale.set(1, 0.6, 1);
    rShinBone.position.set(0, -0.3, 0);
    this.rShin.add(rShinBone);

    this.rFoot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), this.neonMaterial);
    this.rFoot.position.set(0, -0.6, 0);
    this.rShin.add(this.rFoot);

    // Set Initial Pose
    this.setStandardPose();
  }

  // Load and Attach Face texture to the Head group
  attachFace(faceTexture) {
    if (this.faceMesh) {
      this.head.remove(this.faceMesh);
    }
    const faceGeometry = new THREE.CircleGeometry(0.42, 32);
    // Standard material with bright white, double sided, transparent
    const faceMaterial = new THREE.MeshBasicMaterial({
      map: faceTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
    
    // Position it slightly forward so it sits on front of neck joint
    this.faceMesh.position.set(0, 0.35, 0.05);
    this.head.add(this.faceMesh);
  }

  setStandardPose() {
    // Reset rotations
    this.spine.rotation.set(0, 0, 0);
    this.neck.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);

    // Legs - Boxing stance
    this.lHip.rotation.set(0.1, 0, 0.1);
    this.lKnee.rotation.set(-0.2, 0, 0);
    this.rHip.rotation.set(-0.15, 0, -0.05);
    this.rKnee.rotation.set(-0.3, 0, 0);

    // Arms - guard position
    // Left arm guard
    this.lShoulder.rotation.set(-0.4, 0.3, -0.2);
    this.lUpperArm.rotation.set(0, 0, 0);
    this.lElbow.rotation.set(-1.4, 0, 0);
    
    // Right arm guard
    this.rShoulder.rotation.set(-0.5, -0.3, 0.2);
    this.rUpperArm.rotation.set(0, 0, 0);
    this.rElbow.rotation.set(-1.5, 0, 0);
  }

  update(dt, time, opponent) {
    // Recovery systems
    if (this.staggerTimer > 0) {
      this.staggerTimer -= dt;
      if (this.staggerTimer <= 0) {
        this.state = 'idle';
        this.stamina = 30; // recover partial stamina
      }
    }

    if (this.hitReactionTimer > 0) {
      this.hitReactionTimer -= dt;
      if (this.hitReactionTimer <= 0 && this.state === 'hit') {
        this.state = 'idle';
      }
    }

    if (this.dodgeCooldown > 0) {
      this.dodgeCooldown -= dt;
    }

    // Stamina recovery
    if (this.state !== 'block' && this.state !== 'ko' && this.state !== 'staggered') {
      const regenRate = 20; // stamina per second
      this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * dt);
    }

    // Positional updates
    this.position.lerp(this.targetPosition, 0.15);
    this.group.position.copy(this.position);
    
    // Face the opponent
    if (opponent && this.state !== 'ko') {
      const dx = opponent.position.x - this.position.x;
      const dz = opponent.position.z - this.position.z;
      this.rotationY = Math.atan2(dx, dz);
      this.group.rotation.y = this.rotationY;
    }

    // Update skeletal animations based on state
    this.animate(dt, time);
  }

  animate(dt, time) {
    if (this.state === 'ko') {
      // Collapse pose (Ragdoll simulation replacement)
      this.pelvis.position.y = THREE.MathUtils.lerp(this.pelvis.position.y, -1.0, 0.1);
      this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0.2, 0.1);
      
      this.spine.rotation.x = THREE.MathUtils.lerp(this.spine.rotation.x, -Math.PI / 2, 0.1);
      this.neck.rotation.x = THREE.MathUtils.lerp(this.neck.rotation.x, -0.4, 0.1);
      this.lShoulder.rotation.set(0, 0, Math.PI / 4);
      this.rShoulder.rotation.set(0, 0, -Math.PI / 4);
      this.lElbow.rotation.x = -0.2;
      this.rElbow.rotation.x = -0.2;
      return;
    }

    // Base height
    this.pelvis.position.y = 0;

    // Apply Idle Breathing / Boxing Sway
    let swayX = 0;
    let swayY = 0;
    let breathing = Math.sin(time * 5.0) * 0.02;

    if (this.state === 'idle') {
      this.setStandardPose();
      
      // Gentle sway
      swayX = Math.sin(time * 2.5) * 0.05;
      swayY = Math.abs(Math.cos(time * 2.5)) * 0.03;
      
      this.pelvis.position.y += breathing + swayY;
      this.spine.rotation.z = swayX;
      this.lShoulder.rotation.x += breathing;
      this.rShoulder.rotation.x += breathing * 0.8;
      
      // Let arms bob slightly
      this.lElbow.rotation.x += Math.sin(time * 3.0) * 0.05;
      this.rElbow.rotation.x += Math.cos(time * 3.0) * 0.05;
    } 
    else if (this.state === 'staggered') {
      // Dizzy sway
      this.setStandardPose();
      swayX = Math.sin(time * 8.0) * 0.15;
      this.spine.rotation.z = swayX;
      this.neck.rotation.y = Math.cos(time * 4.0) * 0.2;
      this.neck.rotation.x = 0.3; // head forward/down
      this.lShoulder.rotation.set(-0.2, 0.1, -0.4);
      this.rShoulder.rotation.set(-0.2, -0.1, 0.4);
      this.lElbow.rotation.x = -0.4;
      this.rElbow.rotation.x = -0.4;
      this.pelvis.position.y = -0.1 + Math.sin(time * 10) * 0.01;
    }
    else if (this.state === 'hit') {
      // Head snaps back, spine curves back
      this.spine.rotation.x = -0.4 * (this.hitReactionTimer / 0.25);
      this.neck.rotation.x = -0.5 * (this.hitReactionTimer / 0.25);
      this.lShoulder.rotation.x = -0.1;
      this.rShoulder.rotation.x = -0.1;
      this.lElbow.rotation.x = -0.5;
      this.rElbow.rotation.x = -0.5;
    }
    else if (this.state === 'block') {
      // Hold guard high and close
      this.lShoulder.rotation.set(-0.8, 0.5, -0.3);
      this.rShoulder.rotation.set(-0.9, -0.5, 0.3);
      this.lElbow.rotation.set(-1.9, 0.1, 0);
      this.rElbow.rotation.set(-2.0, -0.1, 0);
      this.spine.rotation.x = 0.1; // lean forward slightly
      this.pelvis.position.y = -0.1; // lower stance
    }
    else if (this.state === 'dodge-l') {
      // Lean left
      this.actionProgress += dt * this.actionSpeed;
      if (this.actionProgress >= 1.0) {
        this.state = 'idle';
      }
      
      const t = Math.sin(this.actionProgress * Math.PI); // goes 0 -> 1 -> 0
      this.spine.rotation.z = -0.6 * t;
      this.spine.rotation.x = 0.2 * t;
      this.pelvis.position.x = -0.5 * t;
      this.lShoulder.rotation.set(-0.5, 0.2, -0.5);
      this.rShoulder.rotation.set(-0.7, -0.4, 0.1);
    }
    else if (this.state === 'dodge-r') {
      // Lean right
      this.actionProgress += dt * this.actionSpeed;
      if (this.actionProgress >= 1.0) {
        this.state = 'idle';
      }
      
      const t = Math.sin(this.actionProgress * Math.PI); // goes 0 -> 1 -> 0
      this.spine.rotation.z = 0.6 * t;
      this.spine.rotation.x = 0.2 * t;
      this.pelvis.position.x = 0.5 * t;
      this.lShoulder.rotation.set(-0.7, 0.4, -0.1);
      this.rShoulder.rotation.set(-0.5, -0.2, 0.5);
    }
    else if (this.state === 'punch-l' || this.state === 'special-l') {
      // Left Punch Animation
      this.actionProgress += dt * this.actionSpeed;
      if (this.actionProgress >= 1.0) {
        this.state = 'idle';
      }

      const t = Math.sin(this.actionProgress * Math.PI); // 0 -> 1 -> 0
      
      // Rotate shoulder forward, extend elbow
      this.spine.rotation.y = 0.4 * t; // turn torso
      this.lShoulder.rotation.set(-1.6 * t - 0.4 * (1-t), 0.1 * (1-t), -0.2 * (1-t));
      this.lElbow.rotation.x = -1.4 * (1 - t) - 0.1 * t; // extend elbow fully
      
      // Keep right guard up
      this.rShoulder.rotation.set(-0.5, -0.3, 0.2);
      this.rElbow.rotation.x = -1.5;

      // Special visual addition
      if (this.state === 'special-l') {
        this.lGlove.scale.setScalar(1.0 + t * 0.8); // inflate glove
      } else {
        this.lGlove.scale.setScalar(1.0);
      }
    }
    else if (this.state === 'punch-r' || this.state === 'special-r') {
      // Right Punch Animation
      this.actionProgress += dt * this.actionSpeed;
      if (this.actionProgress >= 1.0) {
        this.state = 'idle';
      }

      const t = Math.sin(this.actionProgress * Math.PI); // 0 -> 1 -> 0

      // Rotate shoulder forward, extend elbow
      this.spine.rotation.y = -0.5 * t; // turn torso
      this.rShoulder.rotation.set(-1.7 * t - 0.5 * (1-t), -0.1 * (1-t), 0.2 * (1-t));
      this.rElbow.rotation.x = -1.5 * (1 - t) - 0.1 * t; // extend elbow fully
      
      // Keep left guard up
      this.lShoulder.rotation.set(-0.4, 0.3, -0.2);
      this.lElbow.rotation.x = -1.4;

      // Special visual addition
      if (this.state === 'special-r') {
        this.rGlove.scale.setScalar(1.0 + t * 0.8); // inflate glove
      } else {
        this.rGlove.scale.setScalar(1.0);
      }
    }
  }

  punch(isLeft, isSpecial = false) {
    if (this.state === 'ko' || this.state === 'staggered' || this.state === 'hit') return false;

    // Check stamina
    const cost = isSpecial ? 0 : (isLeft ? 15 : 22);
    if (this.stamina < cost) {
      // Play staggered sound or effect
      this.state = 'staggered';
      this.staggerTimer = 2.0;
      return false;
    }

    if (!isSpecial) {
      this.stamina -= cost;
    } else {
      this.special = 0;
    }

    this.state = isSpecial ? (isLeft ? 'special-l' : 'special-r') : (isLeft ? 'punch-l' : 'punch-r');
    this.actionProgress = 0;
    this.actionSpeed = isSpecial ? 2.5 : (isLeft ? 5.5 : 4.5); // speed rate of animation
    return true;
  }

  dodge(isLeft) {
    if (this.state !== 'idle' && this.state !== 'block') return false;
    if (this.dodgeCooldown > 0) return false;
    if (this.stamina < 10) return false;

    this.stamina -= 10;
    this.state = isLeft ? 'dodge-l' : 'dodge-r';
    this.actionProgress = 0;
    this.actionSpeed = 4.5;
    this.dodgeCooldown = 0.5; // cooldown
    return true;
  }

  takeDamage(amount, isGuardBreak = false) {
    if (this.state === 'ko') return;

    this.hp = Math.max(0, this.hp - amount);
    this.hitReactionTimer = 0.25;
    this.state = 'hit';
    
    // reset punch progress
    this.actionProgress = 0;

    if (this.hp <= 0) {
      this.state = 'ko';
    } else if (isGuardBreak) {
      this.state = 'staggered';
      this.staggerTimer = 1.5;
    }
  }
}

// Spark and Hit Particle System
class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  spawnHit(position, colorHex, count = 25) {
    const geometry = new THREE.SphereGeometry(0.04, 4, 4);
    const material = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.copy(position);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.2) * 5 + 2,
        (Math.random() - 0.5) * 6
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0.5 + Math.random() * 0.4
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.velocity.y -= 9.8 * dt; // gravity
        p.mesh.material.opacity = p.life / 0.8;
      }
    }
  }
}

// MAIN GAME ENGINE CLASS
export class BoxingGame {
  constructor(containerId, callbacks) {
    this.container = document.getElementById(containerId);
    this.callbacks = callbacks; // onHPChange, onStaminaChange, onSpecialChange, onGameOver, onWin, showMemeText, comboCounter

    this.opponentId = 'john_cena';
    this.isGameActive = false;
    this.timeRemaining = 60;
    this.roundNum = 1;
    this.timerInterval = null;
    this.comboCount = 0;
    this.comboTimer = 0;

    // Camera Shake
    this.cameraShakeTime = 0;
    this.cameraShakeIntensity = 0;
    this.originalCameraPos = new THREE.Vector3(0, 2.5, 6.5);

    // Initial setups
    this.initThree();
    this.initArena();
    this.initParticles();
    
    // Textures map
    this.textures = {};
    this.loadAssets();

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Render loop
    this.clock = new THREE.Clock();
    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030308, 0.05);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.camera.position.copy(this.originalCameraPos);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x030308, 1);
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x181030, 0.6); // Deep blue wash
    this.scene.add(ambientLight);

    // Dynamic directional light for shadows
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(0, 15, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);

    // 4 Spotlights in corners pointing at center
    const colors = [0x00f2fe, 0xfe0979, 0x00f2fe, 0xfe0979];
    const positions = [
      [-7, 10, -7],
      [7, 10, -7],
      [-7, 10, 7],
      [7, 10, 7]
    ];

    positions.forEach((pos, idx) => {
      const spot = new THREE.SpotLight(colors[idx], 12, 25, Math.PI / 6, 0.5, 1);
      spot.position.set(pos[0], pos[1], pos[2]);
      spot.target.position.set(0, 0, 0);
      this.scene.add(spot);
      this.scene.add(spot.target);

      // Add visual light cone helper
      const coneGeo = new THREE.ConeGeometry(2.5, 12, 16, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: colors[idx],
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      // rotate and position cone
      cone.position.set(pos[0]/2, pos[1]/2, pos[2]/2);
      cone.lookAt(0, 0, 0);
      cone.rotateX(Math.PI / 2);
      this.scene.add(cone);
    });
  }

  initArena() {
    // Boxing floor
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const floorTexture = createGridTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.4,
      metalness: 0.7
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Outer dark floor
    const outerGeo = new THREE.PlaneGeometry(80, 80);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x020204,
      roughness: 0.9,
      metalness: 0.1
    });
    const outerFloor = new THREE.Mesh(outerGeo, outerMat);
    outerFloor.rotation.x = -Math.PI / 2;
    outerFloor.position.y = -0.05;
    this.scene.add(outerFloor);

    // Neon Ropes & 4 Corner Posts
    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 8);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x222230,
      metalness: 0.9,
      roughness: 0.1
    });

    const postPositions = [
      [-4.2, 1.25, -4.2],
      [4.2, 1.25, -4.2],
      [-4.2, 1.25, 4.2],
      [4.2, 1.25, 4.2]
    ];

    this.posts = [];
    postPositions.forEach(pos => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(pos[0], pos[1], pos[2]);
      post.castShadow = true;
      this.scene.add(post);
      this.posts.push(post);
    });

    // Drawing ropes as neon glowing tubes
    const ropeHeights = [0.6, 1.2, 1.8];
    const ropeColors = [0xfe0979, 0x00f2fe, 0xfe0979]; // magenta, cyan, magenta
    
    this.ropes = [];
    ropeHeights.forEach((height, rIdx) => {
      const ropeMat = new THREE.MeshBasicMaterial({
        color: ropeColors[rIdx],
        toneMapped: false
      });
      const ropeGeo = new THREE.CylinderGeometry(0.03, 0.03, 8.4, 8);

      // Loop around 4 posts
      // North
      let r1 = new THREE.Mesh(ropeGeo, ropeMat);
      r1.rotation.z = Math.PI / 2;
      r1.position.set(0, height, -4.2);
      this.scene.add(r1);

      // South
      let r2 = new THREE.Mesh(ropeGeo, ropeMat);
      r2.rotation.z = Math.PI / 2;
      r2.position.set(0, height, 4.2);
      this.scene.add(r2);

      // West
      let r3 = new THREE.Mesh(ropeGeo, ropeMat);
      r3.rotation.x = Math.PI / 2;
      r3.position.set(-4.2, height, 0);
      this.scene.add(r3);

      // East
      let r4 = new THREE.Mesh(ropeGeo, ropeMat);
      r4.rotation.x = Math.PI / 2;
      r4.position.set(4.2, height, 0);
      this.scene.add(r4);

      this.ropes.push(r1, r2, r3, r4);
    });

    // Background crowd flashes simulation
    const flashCount = 60;
    const flashGeo = new THREE.BufferGeometry();
    const flashPositions = new Float32Array(flashCount * 3);
    for (let i = 0; i < flashCount * 3; i += 3) {
      // Circle layout at distance of 20 to 35
      const radius = 20 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      flashPositions[i] = Math.cos(theta) * radius;
      flashPositions[i + 1] = 1 + Math.random() * 5;
      flashPositions[i + 2] = Math.sin(theta) * radius;
    }
    flashGeo.setAttribute('position', new THREE.BufferAttribute(flashPositions, 3));
    this.flashMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      transparent: true,
      opacity: 0
    });
    this.flashes = new THREE.Points(flashGeo, this.flashMaterial);
    this.scene.add(this.flashes);
  }

  initParticles() {
    this.particles = new ParticleSystem(this.scene);
  }

  loadAssets() {
    const loader = new THREE.TextureLoader();
    const opponentList = ['john_cena', 'harold', 'gigachad', 'doge'];
    
    opponentList.forEach(id => {
      loader.load(`/memes/${id}.png`, 
        (texture) => {
          this.textures[id] = texture;
          // Trigger reload if opponent was loaded after initialization
          if (this.opponent && this.opponentId === id) {
            this.opponent.attachFace(texture);
          }
        },
        undefined,
        (err) => console.error("Error loading texture:", id, err)
      );
    });
  }

  setupFight(opponentId) {
    this.opponentId = opponentId;

    // Clean up previous characters
    if (this.player) {
      this.scene.remove(this.player.group);
    }
    if (this.opponent) {
      this.scene.remove(this.opponent.group);
    }

    // Spawn Player
    this.player = new Stickman(this.scene, true, 0x00f2fe, 0x00a8ff, 'Player'); // neon cyan/blue
    
    // Spawn Opponent
    let opColor = 0xfe0979; // neon magenta
    let opGloveColor = 0xff0055;
    if (opponentId === 'harold') {
      opColor = 0xffaa00; // orange/yellow
      opGloveColor = 0xcc8800;
    } else if (opponentId === 'gigachad') {
      opColor = 0xcc00ff; // violet
      opGloveColor = 0x8800cc;
    } else if (opponentId === 'doge') {
      opColor = 0x00ff66; // lime green
      opGloveColor = 0x00aa44;
    }

    let opName = opponentId.replace('_', ' ').toUpperCase();
    this.opponent = new Stickman(this.scene, false, opColor, opGloveColor, opName);

    // Attach Face textures
    if (this.textures[opponentId]) {
      this.opponent.attachFace(this.textures[opponentId]);
    }

    // Reset stats
    this.timeRemaining = 60;
    this.comboCount = 0;
    this.isGameActive = false;

    // Set positions
    this.player.position.set(0, 0, 2.5);
    this.player.targetPosition.copy(this.player.position);
    this.opponent.position.set(0, 0, -2.5);
    this.opponent.targetPosition.copy(this.opponent.position);

    // Update camera back to start
    this.camera.position.copy(this.originalCameraPos);
    this.camera.lookAt(0, 1.2, -1.0);

    // Refresh HUD callback states
    this.callbacks.onPlayerHPChange(100);
    this.callbacks.onOpponentHPChange(100);
    this.callbacks.onPlayerStaminaChange(100);
    this.callbacks.onOpponentStaminaChange(100);
    this.callbacks.onSpecialChange(0);
    this.callbacks.onTimeChange(60);
  }

  startFight() {
    this.isGameActive = true;
    
    // Clear old timers
    if (this.timerInterval) clearInterval(this.timerInterval);

    // Timer Loop
    this.timerInterval = setInterval(() => {
      if (!this.isGameActive) return;
      this.timeRemaining--;
      this.callbacks.onTimeChange(this.timeRemaining);

      if (this.timeRemaining <= 0) {
        this.endFight(true); // Draw or check higher HP
      }
    }, 1000);

    // AI Decision Timer setup
    this.aiTimer = 0;
  }

  triggerCameraShake(intensity = 0.12, duration = 0.2) {
    this.cameraShakeTime = duration;
    this.cameraShakeIntensity = intensity;
  }

  // KEYBOARD INPUT HANDLERS (Called from main.js)
  handleKeyDown(key) {
    if (!this.isGameActive || this.player.state === 'ko') return;

    // WASD / Arrow movement keys
    const moveStep = 0.45;
    const ringBoundary = 3.6; // boundary limit to keep them inside the ropes

    switch (key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        // Move closer
        {
          const forward = new THREE.Vector3().subVectors(this.opponent.position, this.player.position);
          forward.y = 0;
          forward.normalize();
          const newPos = this.player.targetPosition.clone().addScaledVector(forward, moveStep);
          if (newPos.length() < ringBoundary) this.player.targetPosition.copy(newPos);
        }
        break;
      case 's':
      case 'arrowdown':
        // Move further away
        {
          const backward = new THREE.Vector3().subVectors(this.player.position, this.opponent.position);
          backward.y = 0;
          backward.normalize();
          const newPos = this.player.targetPosition.clone().addScaledVector(backward, moveStep);
          if (newPos.length() < ringBoundary) this.player.targetPosition.copy(newPos);
        }
        break;
      case 'a':
      case 'arrowleft':
        // Dodge/Circle Left
        {
          const forward = new THREE.Vector3().subVectors(this.opponent.position, this.player.position);
          forward.y = 0;
          forward.normalize();
          const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
          
          const newPos = this.player.targetPosition.clone().addScaledVector(left, moveStep);
          if (newPos.length() < ringBoundary) {
            this.player.targetPosition.copy(newPos);
            this.player.dodge(true);
          }
        }
        break;
      case 'd':
      case 'arrowright':
        // Dodge/Circle Right
        {
          const forward = new THREE.Vector3().subVectors(this.opponent.position, this.player.position);
          forward.y = 0;
          forward.normalize();
          const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize().negate();
          
          const newPos = this.player.targetPosition.clone().addScaledVector(right, moveStep);
          if (newPos.length() < ringBoundary) {
            this.player.targetPosition.copy(newPos);
            this.player.dodge(false);
          }
        }
        break;
      case 'j':
        // Left Punch
        if (this.player.state === 'idle' || this.player.state === 'block') {
          if (this.player.punch(true)) {
            this.checkHitDetection(this.player, this.opponent, true);
          }
        }
        break;
      case 'k':
        // Right Punch
        if (this.player.state === 'idle' || this.player.state === 'block') {
          if (this.player.punch(false)) {
            this.checkHitDetection(this.player, this.opponent, false);
          }
        }
        break;
      case ' ':
        // Block
        this.player.state = 'block';
        break;
      case 'l':
        // Super Punch
        if (this.player.special >= 100) {
          if (this.player.punch(Math.random() > 0.5, true)) {
            this.checkHitDetection(this.player, this.opponent, Math.random() > 0.5, true);
          }
        }
        break;
    }
  }

  handleKeyUp(key) {
    if (!this.isGameActive) return;
    if (key === ' ' && this.player.state === 'block') {
      this.player.state = 'idle';
    }
  }

  // COLLISION DETECTION AND ACTION
  checkHitDetection(attacker, defender, isLeft, isSpecial = false) {
    // Delay hit registration slightly to match the punch extension visual (~120ms)
    setTimeout(() => {
      if (!this.isGameActive || attacker.state === 'ko' || attacker.state === 'hit') return;

      // Calculate global distance between hand glove and opponent body/head
      const glove = isLeft ? attacker.lGlove : attacker.rGlove;
      const glovePos = new THREE.Vector3();
      glove.getWorldPosition(glovePos);

      const headPos = new THREE.Vector3();
      defender.head.getWorldPosition(headPos);

      const chestPos = new THREE.Vector3();
      defender.chest.getWorldPosition(chestPos);

      const distToHead = glovePos.distanceTo(headPos);
      const distToChest = glovePos.distanceTo(chestPos);

      // Hit threshold: standard arm extension is roughly ~1.5 units from center.
      // If we are close enough, register hit.
      if (distToHead < 1.35 || distToChest < 1.35) {
        this.processHit(attacker, defender, glovePos, isSpecial);
      }
    }, 120);
  }

  processHit(attacker, defender, hitPos, isSpecial) {
    // 1. Check if defender dodged
    if (defender.state === 'dodge-l' || defender.state === 'dodge-r') {
      this.callbacks.showMemeText('DODGE!', defender.group.position, 'info');
      // Gain special for defender
      defender.special = Math.min(defender.maxSpecial, defender.special + 12);
      this.callbacks.onSpecialChange(this.player.special);
      return;
    }

    // Doge's Special: Automatic dodge chance
    if (defender.name === 'DOGE' && defender.state === 'idle' && Math.random() < 0.35) {
      defender.dodge(Math.random() > 0.5);
      const dogeWords = ['much speed', 'so dodge', 'wow', 'missed me', 'such fast'];
      const word = dogeWords[Math.floor(Math.random() * dogeWords.length)];
      this.callbacks.showMemeText(word, defender.group.position, 'doge');
      return;
    }

    // John Cena's Special: If semi-transparent, player has a 25% chance to miss
    if (attacker.isPlayer && defender.name === 'JOHN CENA' && defender.group.children[0].children[0].material.opacity < 0.5) {
      if (Math.random() < 0.25) {
        this.callbacks.showMemeText('MISSED CENA!', defender.group.position, 'info');
        return;
      }
    }

    // 2. Check if defender blocked
    if (defender.state === 'block' && !isSpecial) {
      // Harold Special: Hard block, absorbs even more, regenerates
      const blockEfficiency = defender.name === 'PAIN HAROLD' ? 0.96 : 0.90;
      const damage = Math.round(10 * (1 - blockEfficiency));
      const staminaDamage = 15;

      defender.stamina = Math.max(0, defender.stamina - staminaDamage);
      defender.takeDamage(damage, defender.stamina <= 0); // Staggers if stamina hits 0
      
      this.particles.spawnHit(hitPos, 0x00f2fe, 5); // small sparks
      this.triggerCameraShake(0.04, 0.1);

      if (attacker.isPlayer) {
        // Combo breaks on block
        this.comboCount = 0;
        this.callbacks.comboCounter(this.comboCount);
        
        // Build player special meter
        attacker.special = Math.min(attacker.maxSpecial, attacker.special + 5);
        this.callbacks.onSpecialChange(attacker.special);
      }

      this.callbacks.showMemeText('BLOCKED!', defender.group.position, 'block');

      // Sync HP/Stamina UI
      this.syncCharacterStats(defender);
      return;
    }

    // 3. Clean Hit!
    let damage = isSpecial ? 35 : (isLeftPunchState(attacker) ? 9 : 14);
    
    // Gigachad Special: Double damage and guard breaking punch!
    if (attacker.name === 'GIGACHAD') {
      damage *= 1.5;
      if (defender.state === 'block') {
        // force break
        defender.takeDamage(damage, true);
        this.callbacks.showMemeText('GUARD BROKEN!', defender.group.position, 'warn');
        this.syncCharacterStats(defender);
        return;
      }
    }

    // Harold Special: endures pain, reduces damage taken by 15%
    if (defender.name === 'PAIN HAROLD') {
      damage = Math.round(damage * 0.85);
      const haroldWords = ['smiling thru pain', 'still smiling', 'pain is good', 'haha hurts', 'oof'];
      const word = haroldWords[Math.floor(Math.random() * haroldWords.length)];
      this.callbacks.showMemeText(word, defender.group.position, 'harold');
    }

    // Doge hit reactions
    if (defender.name === 'DOGE') {
      const dogeWords = ['so punch', 'much pain', 'very ouch', 'many hit', 'such power'];
      const word = dogeWords[Math.floor(Math.random() * dogeWords.length)];
      this.callbacks.showMemeText(word, defender.group.position, 'doge');
    }

    // Apply damage
    defender.takeDamage(damage);
    this.particles.spawnHit(hitPos, attacker.colorHex, isSpecial ? 35 : 15);
    this.triggerCameraShake(isSpecial ? 0.25 : 0.12, isSpecial ? 0.35 : 0.25);

    if (attacker.isPlayer) {
      this.comboCount++;
      this.comboTimer = 2.5; // combo reset cooldown
      this.callbacks.comboCounter(this.comboCount);

      // Build special meter
      attacker.special = Math.min(attacker.maxSpecial, attacker.special + (isSpecial ? 0 : 15));
      this.callbacks.onSpecialChange(attacker.special);
      
      this.callbacks.showMemeText(`+${damage}`, defender.group.position, 'hit');
    } else {
      // Enemy landed hit on player
      this.comboCount = 0;
      this.callbacks.comboCounter(this.comboCount);
      this.callbacks.showMemeText(`-${damage}`, defender.group.position, 'warn');
    }

    // Sync UI
    this.syncCharacterStats(defender);

    // Check Knockout
    if (defender.state === 'ko') {
      this.endFight(false);
    }
  }

  syncCharacterStats(char) {
    if (char.isPlayer) {
      this.callbacks.onPlayerHPChange(char.hp);
      this.callbacks.onPlayerStaminaChange(char.stamina);
    } else {
      this.callbacks.onOpponentHPChange(char.hp);
      this.callbacks.onOpponentStaminaChange(char.stamina);
    }
  }

  // OPPONENT AI LOGIC
  updateAI(dt, time) {
    if (this.opponent.state === 'ko' || this.player.state === 'ko') return;

    this.aiTimer += dt;
    // AI decisions occur periodically (every 0.4s to 0.7s)
    let decisionInterval = 0.55;
    if (this.opponentId === 'john_cena') decisionInterval = 0.45;
    else if (this.opponentId === 'gigachad') decisionInterval = 0.85;

    if (this.aiTimer >= decisionInterval) {
      this.aiTimer = 0;
      this.makeAIDecision(time);
    }

    // Special state passive triggers
    // Harold health regeneration
    if (this.opponentId === 'harold' && this.opponent.hp < 100 && this.opponent.state !== 'ko') {
      const regenHP = 1.2 * dt;
      this.opponent.hp = Math.min(100, this.opponent.hp + regenHP);
      this.callbacks.onOpponentHPChange(this.opponent.hp);
    }

    // John Cena invisibility
    if (this.opponentId === 'john_cena' && this.opponent.state !== 'ko') {
      // Cena cycles opacity every 6-8 seconds
      const cycle = Math.sin(time * 0.8) * 0.5 + 0.5; // goes 0 to 1
      const targetOpacity = cycle < 0.35 ? 0.15 : 1.0;
      
      // Update opacity of meshes recursively
      this.opponent.group.traverse(child => {
        if (child.isMesh) {
          child.material.transparent = true;
          // Slowly lerp opacity
          child.material.opacity = THREE.MathUtils.lerp(child.material.opacity, targetOpacity, 0.1);
        }
      });
    }
  }

  makeAIDecision(time) {
    const dist = this.player.position.distanceTo(this.opponent.position);
    const hpRatio = this.opponent.hp / 100;

    // Movement: stay close or circle around
    const ringBoundary = 3.6;
    if (dist > 1.8) {
      // Move closer
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.opponent.rotationY);
      const newPos = this.opponent.targetPosition.clone().addScaledVector(forward, 0.6);
      if (newPos.length() < ringBoundary) this.opponent.targetPosition.copy(newPos);
    } else if (dist < 0.9) {
      // Back off
      const backward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.opponent.rotationY);
      const newPos = this.opponent.targetPosition.clone().addScaledVector(backward, 0.6);
      if (newPos.length() < ringBoundary) this.opponent.targetPosition.copy(newPos);
    } else {
      // Circle player randomly
      if (Math.random() < 0.4) {
        const circleDir = Math.random() > 0.5 ? 1 : -1;
        const left = new THREE.Vector3(circleDir, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.opponent.rotationY);
        const newPos = this.opponent.targetPosition.clone().addScaledVector(left, 0.6);
        if (newPos.length() < ringBoundary) this.opponent.targetPosition.copy(newPos);
      }
    }

    // Defensive action: Block if player is active and AI has low health
    if (this.player.state.startsWith('punch') && Math.random() < (0.6 - hpRatio * 0.3)) {
      this.opponent.state = 'block';
      // Release block after delay
      setTimeout(() => {
        if (this.opponent.state === 'block') this.opponent.state = 'idle';
      }, 300 + Math.random() * 400);
      return;
    }

    // Offensive action: Punch if in range
    if (dist <= 1.8) {
      const punchChance = this.opponentId === 'john_cena' ? 0.75 : 0.60;
      if (Math.random() < punchChance) {
        const isLeft = Math.random() > 0.45;
        
        // Show attack indicator if heavy punch or slow opponent (Gigachad)
        if (this.opponentId === 'gigachad') {
          // Highlight gigachad bones with red color during wind up
          this.opponent.neonMaterial.color.setHex(0xff0000);
          this.opponent.neonMaterial.emissive.setHex(0xff0000);
          
          this.callbacks.showMemeText("CHAD SLAM!", this.opponent.group.position, 'warn');
          
          setTimeout(() => {
            if (this.opponent.state !== 'ko' && this.opponent.state !== 'hit') {
              if (this.opponent.punch(isLeft)) {
                this.checkHitDetection(this.opponent, this.player, isLeft);
              }
            }
            // Reset color
            this.opponent.neonMaterial.color.setHex(0xcc00ff);
            this.opponent.neonMaterial.emissive.setHex(0xcc00ff);
          }, 450); // slow wind-up
        } else {
          // Normal attack
          if (this.opponent.punch(isLeft)) {
            this.checkHitDetection(this.opponent, this.player, isLeft);
          }
        }
      }
    }
  }

  // GAME OVER SYSTEM
  endFight(isTimeOut = false) {
    this.isGameActive = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    // Stop controls
    this.player.state = 'idle';

    let winner;
    if (isTimeOut) {
      // Higher health wins
      if (this.player.hp > this.opponent.hp) {
        winner = 'player';
        this.opponent.state = 'ko';
      } else if (this.opponent.hp > this.player.hp) {
        winner = 'opponent';
        this.player.state = 'ko';
      } else {
        winner = 'draw';
      }
    } else {
      winner = this.player.state === 'ko' ? 'opponent' : 'player';
    }

    // Trigger Game Over callbacks
    setTimeout(() => {
      if (winner === 'player') {
        this.callbacks.onWin(this.opponentId);
      } else if (winner === 'opponent') {
        this.callbacks.onLose(this.opponentId);
      } else {
        // Draw
        this.callbacks.onLose(this.opponentId, true); // draw triggers defeat screen with special text
      }
    }, 1200);
  }

  // WINDOW RESIZING
  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  // RENDER AND ANIMATION LOOP
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const dt = Math.min(this.clock.getDelta(), 0.1); // cap physics step
    const time = this.clock.getElapsedTime();

    // Camera Shake
    if (this.cameraShakeTime > 0) {
      this.cameraShakeTime -= dt;
      const shakeX = (Math.random() - 0.5) * this.cameraShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.x = this.originalCameraPos.x + shakeX;
      this.camera.position.y = this.originalCameraPos.y + shakeY;
    } else {
      this.camera.position.lerp(this.originalCameraPos, 0.1);
    }

    // Dynamic camera tracking
    if (this.player && this.opponent && this.isGameActive) {
      // Lerp camera behind player slightly depending on player's position
      const midPoint = new THREE.Vector3()
        .addVectors(this.player.position, this.opponent.position)
        .multiplyScalar(0.5);
      
      const targetCamPos = this.player.position.clone()
        .sub(midPoint)
        .normalize()
        .multiplyScalar(4.0); // stand behind
      
      targetCamPos.y = 2.4;
      targetCamPos.add(this.player.position);
      
      // limit camera z/x
      this.camera.position.lerp(targetCamPos, 0.05);
      this.camera.lookAt(this.opponent.position.x, 1.3, this.opponent.position.z);
    } else {
      this.camera.lookAt(0, 1.1, 0);
    }

    // Update characters
    if (this.player) {
      this.player.update(dt, time, this.opponent);
    }
    if (this.opponent) {
      this.opponent.update(dt, time, this.player);
      this.updateAI(dt, time);
    }

    // Update particles
    this.particles.update(dt);

    // Combo system recovery
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.callbacks.comboCounter(0);
      }
    }

    // Crowd flashes effect
    if (this.flashMaterial) {
      // random camera flashes in arena
      if (Math.random() < 0.08) {
        this.flashMaterial.opacity = 1.0;
      } else {
        this.flashMaterial.opacity = Math.max(0, this.flashMaterial.opacity - dt * 4.0);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Helpers
function isLeftPunchState(char) {
  return char.state === 'punch-l' || char.state === 'special-l';
}
