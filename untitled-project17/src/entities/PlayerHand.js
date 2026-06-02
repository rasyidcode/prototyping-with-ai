import * as THREE from 'three';

export class PlayerHand {
  constructor(camera) {
    this.camera = camera;
    
    this.group = new THREE.Group();
    
    // Idle offset in camera space
    this.idlePos = new THREE.Vector3(0.55, -0.5, -1.0);
    this.idleRot = new THREE.Vector3(-0.1, -0.4, -0.15); // Tilted inward
    
    // Current animated transform relative to camera
    this.localPos = new THREE.Vector3().copy(this.idlePos);
    this.localRot = new THREE.Vector3().copy(this.idleRot);
    
    // Animation state machine
    this.state = 'idle'; // 'idle', 'windup', 'strike', 'recover'
    this.animTime = 0;
    this.stateDuration = 0;
    
    // Animation targets
    this.targetLocalPos = new THREE.Vector3();
    this.targetLocalRot = new THREE.Vector3();
    this.strikeStartPos = new THREE.Vector3();
    this.strikeStartRot = new THREE.Vector3();
    
    this._buildMesh();
    
    // Attach hand to camera so it stays in viewport
    this.camera.add(this.group);
    
    // Set initial position
    this.group.position.copy(this.localPos);
    this.group.rotation.setFromVector3(this.localRot);
  }
  
  update(deltaTime) {
    this.animTime += deltaTime;
    
    switch (this.state) {
      case 'idle':
        this._updateIdle(deltaTime);
        break;
      case 'windup':
        this._updateWindup(deltaTime);
        break;
      case 'strike':
        this._updateStrike(deltaTime);
        break;
      case 'recover':
        this._updateRecover(deltaTime);
        break;
    }
    
    // Apply local transforms to group
    this.group.position.copy(this.localPos);
    this.group.rotation.set(this.localRot.x, this.localRot.y, this.localRot.z);
  }
  
  slap(worldTarget) {
    // Cannot interrupt an ongoing wind-up or strike
    if (this.state === 'windup' || this.state === 'strike') return;
    
    this.state = 'windup';
    this.animTime = 0;
    this.stateDuration = 0.08; // Very quick windup
    
    // 1. Calculate camera-local target position
    const localTarget = this.camera.worldToLocal(worldTarget.clone());
    
    // 2. Project target onto a plane in front of the camera (e.g. Z = -2.5)
    // This keeps the hand stretch length looking consistent and cartoonish
    const targetDistanceZ = -2.2;
    if (localTarget.z !== 0) {
      const scale = targetDistanceZ / localTarget.z;
      localTarget.multiplyScalar(scale);
    } else {
      localTarget.set(0, 0, targetDistanceZ);
    }
    
    this.targetLocalPos.copy(localTarget);
    
    // 3. Determine slap angle based on target position relative to center screen
    // If target is to the left, swipe left-to-right, if right, swipe right-to-left
    const swipeFromRight = localTarget.x > 0;
    
    // Set rotation during slap to look like a slap/swipe
    this.targetLocalRot.set(
      0.3, // Tilt forward
      swipeFromRight ? 0.8 : -0.8, // Face sideways
      swipeFromRight ? -0.5 : 0.5  // Roll sideways
    );
    
    // Store current state to interpolate from
    this.strikeStartPos.copy(this.localPos);
    this.strikeStartRot.copy(this.localRot);
  }
  
  _updateIdle(deltaTime) {
    // Gentle sway to simulate breathing
    const time = this.animTime * 2.0;
    this.localPos.x = this.idlePos.x + Math.sin(time) * 0.02;
    this.localPos.y = this.idlePos.y + Math.cos(time * 0.8) * 0.02;
    this.localPos.z = this.idlePos.z + Math.sin(time * 0.5) * 0.01;
    
    this.localRot.x = this.idleRot.x + Math.sin(time) * 0.01;
    this.localRot.y = this.idleRot.y + Math.cos(time * 0.8) * 0.02;
    this.localRot.z = this.idleRot.z + Math.sin(time * 0.5) * 0.01;
  }
  
  _updateWindup(deltaTime) {
    const progress = Math.min(this.animTime / this.stateDuration, 1.0);
    
    // Pull hand back and up/down in anticipation
    const windupPos = new THREE.Vector3(
      this.idlePos.x + 0.1,
      this.idlePos.y - 0.1,
      this.idlePos.z + 0.2 // Move closer to camera screen
    );
    
    const windupRot = new THREE.Vector3(
      this.idleRot.x - 0.3, // Tilt back
      this.idleRot.y - 0.2,
      this.idleRot.z - 0.1
    );
    
    this.localPos.lerpVectors(this.idlePos, windupPos, progress);
    this.localRot.lerpVectors(this.idleRot, windupRot, progress);
    
    if (progress >= 1.0) {
      this.state = 'strike';
      this.animTime = 0;
      this.stateDuration = 0.06; // Extremely fast forward slap
      this.strikeStartPos.copy(this.localPos);
      this.strikeStartRot.copy(this.localRot);
    }
  }
  
  _updateStrike(deltaTime) {
    const progress = Math.min(this.animTime / this.stateDuration, 1.0);
    
    // Easing function for fast explosive strike
    const easeOutQuad = (t) => t * (2 - t);
    const easedProgress = easeOutQuad(progress);
    
    this.localPos.lerpVectors(this.strikeStartPos, this.targetLocalPos, easedProgress);
    this.localRot.lerpVectors(this.strikeStartRot, this.targetLocalRot, easedProgress);
    
    if (progress >= 1.0) {
      this.state = 'recover';
      this.animTime = 0;
      this.stateDuration = 0.26; // Smooth recovery back to idle
      this.strikeStartPos.copy(this.localPos);
      this.strikeStartRot.copy(this.localRot);
    }
  }
  
  _updateRecover(deltaTime) {
    const progress = Math.min(this.animTime / this.stateDuration, 1.0);
    
    // Smooth ease out back to idle
    const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const easedProgress = easeInOutQuad(progress);
    
    this.localPos.lerpVectors(this.strikeStartPos, this.idlePos, easedProgress);
    this.localRot.lerpVectors(this.strikeStartRot, this.idleRot, easedProgress);
    
    if (progress >= 1.0) {
      this.state = 'idle';
      this.animTime = 0;
    }
  }
  
  _buildMesh() {
    // Colors
    const gloveYellow = 0xffeb3b; // Vibrant cartoon yellow
    const white = 0xffffff;
    const darkGrey = 0x333333;
    
    const gloveMat = new THREE.MeshStandardMaterial({ color: gloveYellow, roughness: 0.5 });
    const cuffMat = new THREE.MeshStandardMaterial({ color: white, roughness: 0.6 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: darkGrey });
    
    // 1. Cuff / Wrist (White cylindrical band)
    const cuffGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.35, 16);
    const cuff = new THREE.Mesh(cuffGeo, cuffMat);
    cuff.rotation.x = Math.PI / 2; // Lie along Z axis
    cuff.position.set(0, 0, 0.1);
    cuff.castShadow = true;
    this.group.add(cuff);
    
    // 2. Main Palm (Thick rounded box)
    const palmGeo = new THREE.BoxGeometry(0.45, 0.45, 0.16);
    const palm = new THREE.Mesh(palmGeo, gloveMat);
    palm.position.set(0, 0, -0.1);
    palm.castShadow = true;
    this.group.add(palm);
    
    // 3. Fingers
    const fingerGeo = new THREE.BoxGeometry(0.1, 0.26, 0.1);
    
    // Index finger
    const index = new THREE.Mesh(fingerGeo, gloveMat);
    index.position.set(-0.16, 0.24, -0.1);
    index.castShadow = true;
    this.group.add(index);
    
    // Middle finger (slightly longer)
    const middleGeo = new THREE.BoxGeometry(0.1, 0.28, 0.1);
    const middle = new THREE.Mesh(middleGeo, gloveMat);
    middle.position.set(-0.05, 0.25, -0.1);
    middle.castShadow = true;
    this.group.add(middle);
    
    // Ring finger
    const ring = new THREE.Mesh(fingerGeo, gloveMat);
    ring.position.set(0.06, 0.24, -0.1);
    ring.castShadow = true;
    this.group.add(ring);
    
    // Pinky (shorter)
    const pinkyGeo = new THREE.BoxGeometry(0.09, 0.2, 0.09);
    const pinky = new THREE.Mesh(pinkyGeo, gloveMat);
    pinky.position.set(0.16, 0.2, -0.1);
    pinky.castShadow = true;
    this.group.add(pinky);
    
    // 4. Thumb (sticks outward)
    const thumbGeo = new THREE.BoxGeometry(0.12, 0.2, 0.12);
    const thumb = new THREE.Mesh(thumbGeo, gloveMat);
    thumb.position.set(-0.25, 0.05, -0.08);
    thumb.rotation.z = Math.PI / 4;
    thumb.castShadow = true;
    this.group.add(thumb);
    
    // 5. Back-of-hand Stripes (Three cartoon ridges)
    const stripeGeo = new THREE.BoxGeometry(0.02, 0.18, 0.02);
    
    for (let i = -1; i <= 1; i++) {
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(i * 0.08, 0.06, -0.19); // Placed slightly outwards on back of hand
      stripe.rotation.z = i * 0.1;
      this.group.add(stripe);
    }
  }
}
