import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    
    // Pool geometries and materials to avoid allocations on hit
    this.particleGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    this.particleMat = new THREE.MeshBasicMaterial({
      color: 0x9eff4b, // Neon glowing zombie green
      transparent: true,
      opacity: 0.95
    });
  }
  
  spawnBurst(position, count = 12) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, this.particleMat.clone());
      
      // Spawn at slap coordinates with tiny random offsets
      mesh.position.set(
        position.x + (Math.random() - 0.5) * 0.2,
        position.y + (Math.random() - 0.5) * 0.2,
        position.z + (Math.random() - 0.5) * 0.2
      );
      
      // Explosion vector
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5.5,
        1.5 + Math.random() * 4.5, // Ejected upwards
        (Math.random() - 0.5) * 5.5
      );
      
      const life = 0.5 + Math.random() * 0.3; // Half second lifespan
      
      this.scene.add(mesh);
      this.particles.push({
        mesh: mesh,
        velocity: velocity,
        life: life,
        maxLife: life
      });
    }
  }
  
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      
      // Apply gravity
      p.velocity.y -= 12 * deltaTime;
      
      // Apply translation velocity
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      
      // Shrink size as particle ages
      const progress = p.life / p.maxLife;
      p.mesh.scale.setScalar(progress);
      
      // Fade out opacity
      p.mesh.material.opacity = progress;
    }
  }
  
  destroy() {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.particles = [];
  }
}
