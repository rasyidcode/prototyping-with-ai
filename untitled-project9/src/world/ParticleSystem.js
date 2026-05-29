import * as THREE from 'three';

/**
 * ParticleSystem.js
 * Spawns and manages highly optimized 3D particle effects for arcade feedback:
 * - Exhaust smoke puffs.
 * - Heart / satisfaction stars.
 * - Glowing projectile trails.
 * - Floating text sprites (+$10, +15s, OOPS!).
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    // Shared Geometries & Materials for high-speed recycling
    this.smokeGeo = new THREE.DodecahedronGeometry(0.35, 1);
    this.sparkleGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);

    this.heartShape = this.createHeartShape();
    this.heartGeo = new THREE.ShapeGeometry(this.heartShape);

    // Scaling factor for heart shapes (since ShapeGeometry starts large)
    this.heartGeo.scale(0.015, 0.015, 0.015);
    this.heartGeo.center();
  }

  createHeartShape() {
    const x = 0, y = 0;
    const shape = new THREE.Shape();
    shape.moveTo(x + 5, y + 5);
    shape.bezierCurveTo(x + 5, y + 5, x + 4, y + 9, x, y + 9);
    shape.bezierCurveTo(x - 6, y + 9, x - 6, y + 3, x - 6, y + 3);
    shape.bezierCurveTo(x - 6, y, x - 3, y - 2.7, x, y - 5);
    shape.bezierCurveTo(x + 6, y - 2.7, x + 11, y, x + 11, y + 3);
    shape.bezierCurveTo(x + 11, y + 3, x + 11, y + 9, x + 5, y + 9);
    return shape;
  }

  /**
   * Spawns an exhaust smoke puff behind the truck.
   */
  spawnExhaust(position, direction) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xdedede,
      transparent: true,
      opacity: 0.55
    });

    const mesh = new THREE.Mesh(this.smokeGeo, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.3; // Offset up from ground slightly
    
    // Spread smoke slightly backwards
    const velocity = direction.clone()
      .multiplyScalar(-1.5)
      .add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        Math.random() * 0.5 + 0.3,
        (Math.random() - 0.5) * 0.4
      ));

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      type: 'smoke',
      velocity,
      life: 0,
      maxLife: 0.8, // seconds
      originalScale: 1.0 + Math.random() * 0.5
    });
  }

  /**
   * Spawns floating hearts/sparkles when a student is successfully fed.
   */
  spawnSatisfaction(position) {
    const colors = [0x6bcb77, 0xff6b8b, 0xffe162];
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
      const isHeart = Math.random() > 0.4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });

      const mesh = new THREE.Mesh(isHeart ? this.heartGeo : this.sparkleGeo, mat);
      mesh.position.copy(position);
      mesh.position.y += 1.5; // Spawn near chest/head level

      // Add a randomized outward blast velocity
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 1.5;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * radius,
        3.5 + Math.random() * 2.5, // Strong upward lift
        Math.sin(angle) * radius
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        type: 'satisfaction',
        velocity,
        life: 0,
        maxLife: 1.0 + Math.random() * 0.6,
        rotateSpeed: new THREE.Vector3(
          Math.random() * 5,
          Math.random() * 5,
          Math.random() * 5
        )
      });
    }
  }

  /**
   * Creates a canvas-based text texture, wraps it in a sprite, and animates it floating up.
   * Super satisfying visual feedback for score increments!
   */
  spawnFloatingText(position, text, hexColor = '#ffe162') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Render retro impact font text with black outline
    ctx.font = 'bold 36px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Stroke/Shadow
    ctx.strokeStyle = '#0f0a1c';
    ctx.lineWidth = 6;
    ctx.strokeText(text, 128, 32);

    // Main Fill
    ctx.fillStyle = hexColor;
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0
    });

    const sprite = new THREE.Sprite(material);
    // Position slightly above the target location
    sprite.position.copy(position);
    sprite.position.y += 2.8; 
    sprite.scale.set(4, 1, 1);

    this.scene.add(sprite);
    
    this.particles.push({
      mesh: sprite,
      type: 'text',
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        2.5, // Slow float up
        (Math.random() - 0.5) * 0.8
      ),
      life: 0,
      maxLife: 1.3
    });
  }

  /**
   * Spawns quick spark particle trails during food flight.
   */
  spawnTrail(position, color = 0x4d96ff) {
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.65
    });

    const mesh = new THREE.Mesh(this.sparkleGeo, mat);
    mesh.position.copy(position);
    mesh.scale.setScalar(0.7);

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      type: 'trail',
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ),
      life: 0,
      maxLife: 0.4
    });
  }

  /**
   * Updates all active particles, applying velocity, decay, and disposal.
   */
  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        // Dispose resources and remove from scene
        this.scene.remove(p.mesh);
        p.mesh.geometry?.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach(m => m.dispose());
        } else {
          p.mesh.material?.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.mesh.position.addScaledVector(p.velocity, delta);

      // Decelerate over time
      p.velocity.y -= 9.8 * delta * 0.15; // Slow gravitational drag

      const progress = p.life / p.maxLife;

      // Custom behaviors based on particle type
      if (p.type === 'smoke') {
        // Smoke expands and fades
        const scale = p.originalScale * (1 + progress * 0.8);
        p.mesh.scale.setScalar(scale);
        p.mesh.material.opacity = 0.55 * (1 - progress);
      } 
      else if (p.type === 'satisfaction') {
        // Satisfactions shrink and spin
        p.mesh.scale.setScalar(1 - progress);
        if (p.rotateSpeed) {
          p.mesh.rotation.x += p.rotateSpeed.x * delta;
          p.mesh.rotation.y += p.rotateSpeed.y * delta;
          p.mesh.rotation.z += p.rotateSpeed.z * delta;
        }
        p.mesh.material.opacity = 1 - progress;
      }
      else if (p.type === 'text') {
        // Floating text fades out and rises
        p.mesh.material.opacity = 1 - progress;
        p.mesh.scale.y += delta * 0.3; // Expand slightly vertically for elastic feel
      }
      else if (p.type === 'trail') {
        // Trails shrink quickly
        p.mesh.scale.setScalar(0.7 * (1 - progress));
        p.mesh.material.opacity = 0.65 * (1 - progress);
      }
    }
  }

  /**
   * Resets the entire particle pool (clears scene)
   */
  clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry?.dispose();
      p.mesh.material?.dispose();
    });
    this.particles = [];
  }
}
