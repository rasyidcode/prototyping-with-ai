import * as THREE from 'three';

export class Zombie {
  constructor(scene, options = {}) {
    this.scene = scene;
    
    // Configurable attributes
    this.type = options.type || 'normal'; // 'normal', 'runner', 'helmet', 'hazmat', 'frozen'
    
    this.speed = options.speed || (1.0 + Math.random() * 0.5);
    this.scale = options.scale || (0.8 + Math.random() * 0.4);
    
    // Scale speed and size according to class type
    if (this.type === 'runner') {
      this.speed *= 1.5;
      this.scale *= 0.8;
    } else if (this.type === 'hazmat') {
      this.speed *= 0.85;
      this.scale *= 1.12;
    } else if (this.type === 'frozen') {
      this.speed *= 0.65;
    }
    
    this.xSpawn = options.xSpawn || (Math.random() * 6 - 3); // Spawns within road boundaries [-3, 3]
    this.zSpawn = options.zSpawn || -60; // Distance spawn
    
    this.state = 'walking'; // 'walking', 'flying', 'dead'
    this.timeAlive = Math.random() * 100; // Random offset for walk cycles
    this.canDelete = false;
    
    // Physics variables for flying state
    this.velocity = new THREE.Vector3();
    this.rotationSpeed = new THREE.Vector3();
    
    // Materials
    this.skinColor = 0x55a95b; // Cartoon green
    this.shirtColor = options.shirtColor || this._getRandomColor();
    this.pantsColor = options.pantsColor || this._getRandomColor();
    this.helmetActive = false;
    this.helmetMesh = null;
    
    if (this.type === 'runner') {
      this.shirtColor = 0xd32f2f; // Red jersey
      this.pantsColor = 0x111111; // Black trunks
    } else if (this.type === 'helmet') {
      this.helmetActive = true;
    } else if (this.type === 'hazmat') {
      this.skinColor = 0xffa726; // Orange gloves/suit skin
      this.shirtColor = 0xff9800; // Orange jacket
      this.pantsColor = 0xe65100; // Darker orange trousers
    } else if (this.type === 'frozen') {
      this.skinColor = 0x80deea; // Cyan icy skin
      this.shirtColor = 0x00bcd4; // Cyber blue coat
      this.pantsColor = 0x006064; // Dark teal pants
    }
    
    // References to body parts for procedural animation
    this.group = new THREE.Group();
    this.head = null;
    this.torso = null;
    this.leftArm = null;
    this.rightArm = null;
    this.leftLegPivot = null;
    this.rightLegPivot = null;
    
    this._buildMesh();
    
    this.group.userData = { zombieInstance: this };
    
    // Setup initial positions
    this.group.position.set(this.xSpawn, 0, this.zSpawn);
    this.group.scale.setScalar(this.scale);
    
    this.scene.add(this.group);
  }
  
  update(deltaTime) {
    this.timeAlive += deltaTime;
    
    if (this.state === 'walking') {
      this._updateWalking(deltaTime);
    } else if (this.state === 'flying') {
      this._updateFlying(deltaTime);
    } else if (this.state === 'dead') {
      this._updateDead(deltaTime);
    }
  }
  
  hit(slapForceDirection = new THREE.Vector3(0, 1, -1), swipeForce = 1.0) {
    if (this.state !== 'walking') return 'already_hit';
    
    // Helmet zombie: first hit pops the helmet off
    if (this.type === 'helmet' && this.helmetActive) {
      this.helmetActive = false;
      if (this.helmetMesh) {
        this.head.remove(this.helmetMesh);
        this.helmetMesh.geometry.dispose();
        this.helmetMesh.material.dispose();
        this.helmetMesh = null;
      }
      
      // Visual feedback: stagger the zombie back slightly
      this.group.position.z -= 0.8;
      this.group.position.y += 0.15;
      
      return 'helmet_pop';
    }
    
    this.state = 'flying';
    
    // Propel the zombie backward and upward based on slap vector and force
    const force = (12 + Math.random() * 6) * swipeForce;
    this.velocity.copy(slapForceDirection).normalize().multiplyScalar(force);
    
    // Add upward vertical pop
    this.velocity.y = (7 + Math.random() * 5) * Math.max(0.5, swipeForce);
    
    // Add random heavy spinning rates
    this.rotationSpeed.set(
      (Math.random() - 0.5) * 15 * swipeForce,
      (Math.random() - 0.5) * 15 * swipeForce,
      (Math.random() - 0.5) * 15 * swipeForce
    );
    
    return 'killed';
  }
  
  getPosition() {
    return this.group.position;
  }
  
  _getRandomColor() {
    const colors = [
      0x2e66b3, // Indigo Blue
      0xc62828, // Red
      0xef6c00, // Orange
      0x4e342e, // Brown
      0x37474f, // Slate Grey
      0x6a1b9a  // Purple
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  _buildMesh() {
    // Shared materials
    const skinMat = new THREE.MeshStandardMaterial({ 
      color: this.skinColor, 
      roughness: 0.8,
      emissive: this.type === 'frozen' ? 0x004d40 : 0x000000,
      emissiveIntensity: 0.5
    });
    const shirtMat = new THREE.MeshStandardMaterial({ 
      color: this.shirtColor, 
      roughness: 0.8,
      emissive: this.type === 'frozen' ? 0x00607f : 0x000000,
      emissiveIntensity: 0.5
    });
    const pantsMat = new THREE.MeshStandardMaterial({ 
      color: this.pantsColor, 
      roughness: 0.8,
      emissive: this.type === 'frozen' ? 0x004040 : 0x000000,
      emissiveIntensity: 0.3
    });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xd32f2f }); // Red glowing pupil
    
    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
    this.torso = new THREE.Mesh(torsoGeo, shirtMat);
    this.torso.position.y = 1.1; // Centered
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.group.add(this.torso);
    
    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.set(0, 0.825, 0); // Position relative to torso top
    this.head.castShadow = true;
    this.torso.add(this.head);
    
    // Hair / Scalp cover (stylized dark box)
    const hairGeo = new THREE.BoxGeometry(0.68, 0.2, 0.68);
    const hair = new THREE.Mesh(hairGeo, blackMat);
    hair.position.y = 0.3;
    this.head.add(hair);
       // Visual customizations per zombie type
    if (this.type === 'runner') {
      // Red sports bandanna on head
      const bandannaGeo = new THREE.BoxGeometry(0.67, 0.1, 0.67);
      const bandannaMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.8 });
      const bandanna = new THREE.Mesh(bandannaGeo, bandannaMat);
      bandanna.position.y = 0.16;
      this.head.add(bandanna);
    } else if (this.type === 'helmet') {
      // Steel army helmet
      const helmetGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.22, 10);
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.7, roughness: 0.4 });
      this.helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
      this.helmetMesh.position.set(0, 0.34, 0);
      this.helmetMesh.castShadow = true;
      this.head.add(this.helmetMesh);
    }
    
    if (this.type !== 'hazmat') {
      // Eyes (Two white boxes with red pupils)
      const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
      const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pupilGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
      
      // Left Eye
      const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      leftEye.position.set(-0.16, 0.1, 0.31);
      const leftPupil = new THREE.Mesh(pupilGeo, redMat);
      leftPupil.position.set(0, 0, 0.02);
      leftEye.add(leftPupil);
      this.head.add(leftEye);
      
      // Right Eye
      const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      rightEye.position.set(0.16, 0.1, 0.31);
      const rightPupil = new THREE.Mesh(pupilGeo, redMat);
      rightPupil.position.set(0, 0, 0.02);
      rightEye.add(rightPupil);
      this.head.add(rightEye);
      
      // Dumb/open mouth
      const mouthGeo = new THREE.BoxGeometry(0.25, 0.12, 0.05);
      const mouth = new THREE.Mesh(mouthGeo, blackMat);
      mouth.position.set(0, -0.18, 0.31);
      this.head.add(mouth);
    } else {
      // Add hazmat visor instead of eyes
      const visorGeo = new THREE.BoxGeometry(0.5, 0.18, 0.06);
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.1 });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.05, 0.31);
      this.head.add(visor);
      
      // Add gas mask filter box
      const filterGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8);
      const filterMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 });
      const filter = new THREE.Mesh(filterGeo, filterMat);
      filter.rotation.x = Math.PI / 2;
      filter.position.set(0, -0.16, 0.32);
      this.head.add(filter);
    }
    
    // 3. Arms (Straight out in zombie-walk fashion, rotating at shoulder)
    const armGeo = new THREE.BoxGeometry(0.16, 0.16, 0.85);
    
    // Left Arm
    this.leftArm = new THREE.Mesh(armGeo, skinMat);
    this.leftArm.position.set(-0.48, 0.35, 0.3); // Relative to torso center
    this.leftArm.castShadow = true;
    this.torso.add(this.leftArm);
    
    // Right Arm
    this.rightArm = new THREE.Mesh(armGeo, skinMat);
    this.rightArm.position.set(0.48, 0.35, 0.3); // Relative to torso center
    this.rightArm.castShadow = true;
    this.torso.add(this.rightArm);
    
    // 4. Legs (Created using pivots so they swing properly from hips)
    const legGeo = new THREE.BoxGeometry(0.24, 0.7, 0.24);
    const shoeGeo = new THREE.BoxGeometry(0.24, 0.12, 0.34);
    
    // Left Leg Setup
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.24, 0.6, 0); // Hip joint height
    this.group.add(this.leftLegPivot);
    
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.y = -0.35; // Lower half
    leftLeg.castShadow = true;
    this.leftLegPivot.add(leftLeg);
    
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.7, 0.05);
    leftShoe.castShadow = true;
    this.leftLegPivot.add(leftShoe);
    
    // Right Leg Setup
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.24, 0.6, 0); // Hip joint height
    this.group.add(this.rightLegPivot);
    
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.y = -0.35; // Lower half
    rightLeg.castShadow = true;
    this.rightLegPivot.add(rightLeg);
    
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.7, 0.05);
    rightShoe.castShadow = true;
    this.rightLegPivot.add(rightShoe);
  }
  
  _updateWalking(deltaTime) {
    // Move forward in Z direction (towards player/camera at positive Z)
    this.group.position.z += this.speed * deltaTime;
    
    // Procedural walk animation
    const swingSpeed = 7.5;
    const swingAmount = 0.6;
    
    // Swing legs back and forth
    this.leftLegPivot.rotation.x = Math.sin(this.timeAlive * swingSpeed) * swingAmount;
    this.rightLegPivot.rotation.x = -Math.sin(this.timeAlive * swingSpeed) * swingAmount;
    
    // Bob torso up and down slightly based on stride
    const bobFactor = Math.abs(Math.cos(this.timeAlive * swingSpeed * 2)) * 0.08;
    this.torso.position.y = 1.1 + bobFactor;
    
    // Arms wobble slightly up and down
    this.leftArm.rotation.x = Math.sin(this.timeAlive * swingSpeed) * 0.1;
    this.rightArm.rotation.x = -Math.sin(this.timeAlive * swingSpeed) * 0.1;
    
    // Head bobs and tilts slightly side to side
    this.head.rotation.z = Math.sin(this.timeAlive * (swingSpeed / 2)) * 0.06;
    this.head.rotation.y = Math.cos(this.timeAlive * (swingSpeed / 4)) * 0.08;
  }
  
  _updateFlying(deltaTime) {
    // 1. Move based on velocity
    this.group.position.addScaledVector(this.velocity, deltaTime);
    
    // 2. Apply gravity (acceleration downwards)
    this.velocity.y -= 22 * deltaTime;
    
    // 3. Spin randomly in 3D space
    this.group.rotation.x += this.rotationSpeed.x * deltaTime;
    this.group.rotation.y += this.rotationSpeed.y * deltaTime;
    this.group.rotation.z += this.rotationSpeed.z * deltaTime;
    
    // 4. Check if we hit the street (y <= 0)
    // Add slightly above ground so it doesn't clip
    if (this.group.position.y <= 0.1 && this.velocity.y < 0) {
      this.group.position.y = 0.1;
      this.state = 'dead';
      
      // Stop velocity
      this.velocity.set(0, 0, 0);
      this.rotationSpeed.set(0, 0, 0);
      
      // Align to lie flat on floor
      this.group.rotation.set(Math.PI / 2, 0, (Math.random() - 0.5) * 1.5);
      
      // Reset legs & arms to limp positions
      this.leftLegPivot.rotation.set(0, 0, 0.2);
      this.rightLegPivot.rotation.set(0, 0, -0.2);
      this.leftArm.rotation.set(-1.2, 0, 0);
      this.rightArm.rotation.set(-1.2, 0, 0);
      
      this.timeDeadStart = this.timeAlive;
    }
  }
  
  _updateDead(deltaTime) {
    const fadeOutDelay = 1.0; // Wait 1 second before fading
    const fadeDuration = 1.0; // Fade out over 1 second
    
    const timeDead = this.timeAlive - this.timeDeadStart;
    
    if (timeDead > fadeOutDelay) {
      const progress = (timeDead - fadeOutDelay) / fadeDuration;
      
      if (progress >= 1.0) {
        this.canDelete = true;
      } else {
        // Fade out by sinking zombie into the floor
        this.group.position.y = 0.1 - (progress * 1.2);
        
        // Also enable transparency and fade materials if possible
        this.group.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = 1.0 - progress;
          }
        });
      }
    }
  }
  
  destroy() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
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
}
