import * as THREE from 'three';

interface ActiveBurst {
  points: THREE.Points;
  positions: Float32Array;
  velocities: Float32Array;
  maxLife: number;
  life: number;
  color: THREE.Color;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private activeBursts: ActiveBurst[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createMergeBurst(position: THREE.Vector3, colorHex: string, fruitRadius: number): void {
    const particleCount = Math.min(100, Math.floor(40 + fruitRadius * 20));
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const color = new THREE.Color(colorHex);

    for (let i = 0; i < particleCount; i++) {
      // Start at the center position
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Random spherical velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 2.0 + Math.random() * 5.0 + fruitRadius * 1.5;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      // Slanted upwards bias
      velocities[i * 3 + 1] = (Math.sin(phi) * Math.sin(theta) * speed) + 2.0;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Glowy particle material
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.12 + fruitRadius * 0.04,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.activeBursts.push({
      points,
      positions,
      velocities,
      maxLife: 0.8 + fruitRadius * 0.2, // seconds
      life: 0.8 + fruitRadius * 0.2,
      color,
    });
  }

  public update(dt: number): void {
    for (let i = this.activeBursts.length - 1; i >= 0; i--) {
      const burst = this.activeBursts[i];
      burst.life -= dt;

      if (burst.life <= 0) {
        // Cleanup resources
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        (burst.points.material as THREE.Material).dispose();
        this.activeBursts.splice(i, 1);
        continue;
      }

      // Update positions
      const positions = burst.positions;
      const velocities = burst.velocities;
      const count = positions.length / 3;

      for (let j = 0; j < count; j++) {
        // Drag
        velocities[j * 3] *= 0.94;
        velocities[j * 3 + 1] *= 0.94;
        velocities[j * 3 + 2] *= 0.94;

        // Apply gravity to particles
        velocities[j * 3 + 1] -= 9.8 * dt;

        // Update coordinate
        positions[j * 3] += velocities[j * 3] * dt;
        positions[j * 3 + 1] += velocities[j * 3 + 1] * dt;
        positions[j * 3 + 2] += velocities[j * 3 + 2] * dt;
      }

      burst.points.geometry.attributes.position.needsUpdate = true;

      // Fade out opacity
      const ratio = burst.life / burst.maxLife;
      const mat = burst.points.material as THREE.PointsMaterial;
      mat.opacity = ratio;
      // Shrink size slightly towards the end
      mat.size = (0.12 + (burst.maxLife - 0.8) * 0.1) * ratio;
    }
  }
}
