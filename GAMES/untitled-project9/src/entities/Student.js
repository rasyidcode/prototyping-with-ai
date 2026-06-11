import * as THREE from 'three';

/**
 * Student.js
 * Manages the procedural 3D student models (varying clothing, backpacks, and hair).
 * Implements wandering AI, active hunger requests, billboard order widgets, and happy reactions.
 */
export class Student {
  /**
   * @param {THREE.Scene} scene - The WebGL Scene container.
   * @param {number} x - Starting X coordinate.
   * @param {number} z - Starting Z coordinate.
   */
  constructor(scene, x, z) {
    this.scene = scene;
    
    // Core parameters
    this.isHungry = false;
    this.desiredFoodIndex = 0; // 0: Pizza, 1: Burger, 2: Taco
    this.hungerTimer = 0;
    this.maxHungerTime = 25.0; // Seconds to get served before leaving angry

    // State machine
    this.state = 'wandering'; // 'wandering', 'waiting', 'satisfied', 'angry'
    this.speed = 4.0; // Wandering speed
    
    // Procedural styling
    this.bodyColor = [0x4d96ff, 0xff6b8b, 0x6bcb77, 0xffa500, 0x8e53ff, 0x00f5ff][Math.floor(Math.random() * 6)];
    this.hairColor = [0x582f0e, 0x1e1333, 0xba7a3a, 0xffd166][Math.floor(Math.random() * 4)];
    
    // Create compound 3D mesh
    this.mesh = this.createProceduralStudentMesh();
    this.mesh.position.set(x, 0, z);
    this.scene.add(this.mesh);

    // AI Waypoint tracking
    this.waypoint = new THREE.Vector3();
    this.pickNewWaypoint();

    // Visual billboard bubble node
    this.bubbleSprite = null;

    // Animation phases
    this.animTime = Math.random() * 10;
  }

  createProceduralStudentMesh() {
    const studentGroup = new THREE.Group();

    // 1. Shoes (two tiny dark boxes)
    const shoeGeo = new THREE.BoxGeometry(0.35, 0.25, 0.5);
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.35, 0.125, 0);
    leftShoe.castShadow = true;
    studentGroup.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.35, 0.125, 0);
    rightShoe.castShadow = true;
    studentGroup.add(rightShoe);

    // 2. Legs (skin cylinder compounds)
    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 }); // skin tone
    
    this.leftLeg = new THREE.Mesh(legGeo, skinMat);
    this.leftLeg.position.set(-0.35, 0.7, 0);
    this.leftLeg.castShadow = true;
    studentGroup.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, skinMat);
    this.rightLeg.position.set(0.35, 0.7, 0);
    this.rightLeg.castShadow = true;
    studentGroup.add(this.rightLeg);

    // 3. Body (colored sweater box)
    const bodyGeo = new THREE.BoxGeometry(1.1, 1.6, 0.7);
    const bodyMat = new THREE.MeshStandardMaterial({ color: this.bodyColor, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.9;
    body.castShadow = true;
    body.receiveShadow = true;
    studentGroup.add(body);

    // 4. Backpack (cute dark box mounted on back)
    const packGeo = new THREE.BoxGeometry(0.8, 1.1, 0.35);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x1e1333, roughness: 0.9 });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 1.9, -0.5);
    pack.castShadow = true;
    studentGroup.add(pack);

    // 5. Head (skin cube)
    const headGeo = new THREE.BoxGeometry(0.75, 0.75, 0.75);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 3.0;
    head.castShadow = true;
    studentGroup.add(head);

    // 6. Hair (colorful boxes layered on head)
    const hairGeo = new THREE.BoxGeometry(0.85, 0.35, 0.85);
    const hairMat = new THREE.MeshStandardMaterial({ color: this.hairColor, roughness: 0.8 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 3.35;
    hair.castShadow = true;
    studentGroup.add(hair);

    // Side hair buns or bangs (customizes procedural styling)
    if (Math.random() > 0.5) {
      const bunGeo = new THREE.SphereGeometry(0.22, 6, 6);
      const leftBun = new THREE.Mesh(bunGeo, hairMat);
      leftBun.position.set(-0.4, 3.2, 0);
      leftBun.castShadow = true;
      studentGroup.add(leftBun);

      const rightBun = new THREE.Mesh(bunGeo, hairMat);
      rightBun.position.set(0.4, 3.2, 0);
      rightBun.castShadow = true;
      studentGroup.add(rightBun);
    }

    return studentGroup;
  }

  pickNewWaypoint() {
    // Selects a random spot on the campus map to walk towards
    // Map is roughly within -85 to 85 on grass / roads
    const range = 80;
    this.waypoint.set(
      (Math.random() - 0.5) * range * 2,
      0,
      (Math.random() - 0.5) * range * 2
    );
  }

  /**
   * Activates the student's hunger loop:
   * Sets desired food, generates dynamic floating 3D billboard with timers.
   */
  makeHungry(foodIndex) {
    if (this.state !== 'wandering') return;

    this.isHungry = true;
    this.desiredFoodIndex = foodIndex;
    this.hungerTimer = this.maxHungerTime;
    this.state = 'waiting';
    
    // Halt movement to wait for delivery
    this.speed = 0;

    // Spawn HUD Order sprite
    this.createOrderBubbleSprite();
  }

  createOrderBubbleSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Draw glossy order bubble
    this.drawBubbleCanvas(ctx, 1.0);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });

    this.bubbleSprite = new THREE.Sprite(mat);
    this.bubbleSprite.position.set(0, 4.8, 0); // Position high above student's head
    this.bubbleSprite.scale.set(2.4, 2.4, 1);
    this.mesh.add(this.bubbleSprite);
  }

  drawBubbleCanvas(ctx, ratio) {
    ctx.clearRect(0, 0, 128, 128);

    // 1. Draw outer circle glowing countdown indicator
    ctx.beginPath();
    ctx.arc(64, 64, 46, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(15, 10, 28, 0.15)';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Dynamic timer ring coloring (Green ➡️ Yellow ➡️ Red)
    let ringColor = '#6bcb77'; // Green
    if (ratio < 0.35) ringColor = '#ff6b8b'; // Red
    else if (ratio < 0.65) ringColor = '#ffe162'; // Yellow

    ctx.beginPath();
    // Arc grows counter-clockwise reflecting remaining ratio
    ctx.arc(64, 64, 46, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * ratio));
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Draw glossy white bubble background
    ctx.beginPath();
    ctx.arc(64, 64, 38, 0, Math.PI * 2);
    ctx.fillStyle = '#f7f5fa';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.shadowColor = 'transparent'; // Reset shadows

    // 3. Draw requested food Emoji in the center
    const emojis = ['🍕', '🍔', '🌮'];
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojis[this.desiredFoodIndex], 64, 64);
  }

  /**
   * Refreshes the canvas billboard image as timer value ticks down.
   */
  updateBubbleTimer() {
    if (!this.bubbleSprite) return;

    const ratio = Math.max(0, this.hungerTimer / this.maxHungerTime);
    const canvas = this.bubbleSprite.material.map.image;
    const ctx = canvas.getContext('2d');
    
    this.drawBubbleCanvas(ctx, ratio);
    this.bubbleSprite.material.map.needsUpdate = true;
  }

  /**
   * Triggered when food reaches the student.
   * If matching order: triggers joy jumps, satisfied state.
   * Returns: true if satisfied, false if incorrect food order.
   */
  serveFood(foodIndex) {
    if (this.state !== 'waiting') return false;

    if (foodIndex === this.desiredFoodIndex) {
      // 1. Success! Switch states
      this.isHungry = false;
      this.state = 'satisfied';
      this.speed = 6.5; // Walk away fast!
      this.pickNewWaypoint(); // Walk off-map

      // Remove bubble sprite
      if (this.bubbleSprite) {
        this.mesh.remove(this.bubbleSprite);
        this.bubbleSprite.material.map.dispose();
        this.bubbleSprite.material.dispose();
        this.bubbleSprite = null;
      }

      // Dynamic jump animation trigger
      this.mesh.position.y = 0;
      this.jumpDuration = 0.5; // Jump for 0.5s
      this.jumpTimer = 0.0;

      return true;
    }

    // Wrong food order! Displeased reaction bounce
    this.angryTimer = 0.6; // Wobble angry
    return false;
  }

  update(delta) {
    this.animTime += delta;

    // 1. State machine driving navigation and animations
    if (this.state === 'wandering' || this.state === 'satisfied') {
      // Walk towards target waypoint
      const dir = this.waypoint.clone().sub(this.mesh.position);
      const distance = dir.length();

      if (distance < 1.5) {
        // Waypoint reached, find next path
        this.pickNewWaypoint();
      } else {
        dir.normalize();
        
        // Face movement direction
        const targetRotation = Math.atan2(dir.x, dir.z);
        
        // Smoothly interpolate rotation
        let diff = targetRotation - this.mesh.rotation.y;
        // Normalize angle difference to [-PI, PI]
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.mesh.rotation.y += diff * 8.0 * delta;

        // Apply forward vector translation
        this.mesh.translateOnAxis(new THREE.Vector3(0, 0, 1), this.speed * delta);
      }

      // Procedural walking arm-bob animation
      this.leftLeg.rotation.x = Math.sin(this.animTime * 6.5) * 0.45;
      this.rightLeg.rotation.x = -Math.sin(this.animTime * 6.5) * 0.45;
      this.mesh.position.y = Math.abs(Math.sin(this.animTime * 13)) * 0.15; // Cute walk hop
    }
    
    else if (this.state === 'waiting') {
      // Stand waiting for food, looking around nervously
      this.mesh.position.y = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;

      this.mesh.rotation.y += Math.sin(this.animTime * 1.5) * 0.015; // Wobble look around

      // Tick down active hunger timer
      this.hungerTimer -= delta;
      this.updateBubbleTimer();

      // Flashing alert bubble size if running out of time
      if (this.bubbleSprite && this.hungerTimer < 6.0) {
        const pulse = 2.4 + Math.sin(this.animTime * 18.0) * 0.3;
        this.bubbleSprite.scale.set(pulse, pulse, 1);
      }

      if (this.hungerTimer <= 0) {
        // Disappointed! Leave angry
        this.state = 'angry';
        this.isHungry = false;
        this.speed = 4.5;
        this.pickNewWaypoint();

        // Discard bubble sprite
        if (this.bubbleSprite) {
          this.mesh.remove(this.bubbleSprite);
          this.bubbleSprite.material.map.dispose();
          this.bubbleSprite.material.dispose();
          this.bubbleSprite = null;
        }
      }
    }
    
    else if (this.state === 'angry') {
      // Move disappointed off the map
      const dir = this.waypoint.clone().sub(this.mesh.position);
      const distance = dir.length();

      if (distance < 1.5) {
        this.pickNewWaypoint();
      } else {
        dir.normalize();
        const targetRotation = Math.atan2(dir.x, dir.z);
        let diff = targetRotation - this.mesh.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.mesh.rotation.y += diff * 8.0 * delta;
        this.mesh.translateOnAxis(new THREE.Vector3(0, 0, 1), this.speed * delta);
      }

      // Walk cycle
      this.leftLeg.rotation.x = Math.sin(this.animTime * 4.0) * 0.3;
      this.rightLeg.rotation.x = -Math.sin(this.animTime * 4.0) * 0.3;
      
      // Slouched head / heavy steps
      this.mesh.position.y = 0;
    }

    // 2. Play secondary jump animations (Joy splash on successful serve)
    if (this.jumpDuration && this.jumpTimer < this.jumpDuration) {
      this.jumpTimer += delta;
      const progress = this.jumpTimer / this.jumpDuration;
      
      // Cozy elastic parabolic jump bounce
      const height = Math.sin(progress * Math.PI) * 2.2;
      this.mesh.position.y = height;
      
      // Happy rotating spinner!
      this.mesh.rotation.y += 18.0 * delta;
    }

    // Play wobble animation if angry / rejected order
    if (this.angryTimer && this.angryTimer > 0) {
      this.angryTimer -= delta;
      
      // Left-right wobble shake
      this.mesh.position.x += Math.sin(this.animTime * 45) * 0.12;
      this.mesh.position.y = 0;
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    
    if (this.bubbleSprite) {
      this.bubbleSprite.material.map.dispose();
      this.bubbleSprite.material.dispose();
    }
  }
}
