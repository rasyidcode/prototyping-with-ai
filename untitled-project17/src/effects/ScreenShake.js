import * as THREE from 'three';

export class ScreenShake {
  constructor(camera) {
    this.camera = camera;
    
    // Store camera original rest coordinates
    this.basePosition = new THREE.Vector3(0, 2.2, 5.5);
    
    this.shakeTimer = 0;
    this.duration = 0;
    this.intensity = 0;
  }
  
  shake(intensity = 0.18, duration = 0.15) {
    this.intensity = intensity;
    this.duration = duration;
    this.shakeTimer = duration;
  }
  
  update(deltaTime) {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= deltaTime;
      
      // Calculate linear decay progress
      const progress = this.shakeTimer / this.duration;
      const currentIntensity = this.intensity * progress;
      
      // Calculate random 3D offsets
      const dx = (Math.random() - 0.5) * currentIntensity;
      const dy = (Math.random() - 0.5) * currentIntensity;
      const dz = (Math.random() - 0.5) * currentIntensity * 0.4;
      
      // Add offsets to camera base position
      this.camera.position.set(
        this.basePosition.x + dx,
        this.basePosition.y + dy,
        this.basePosition.z + dz
      );
      
      // Ensure rest coordinates are set when shake resolves
      if (this.shakeTimer <= 0) {
        this.camera.position.copy(this.basePosition);
      }
    }
  }
}
