import * as THREE from 'three';

export interface PhysicsBody {
  id: number;
  level: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  mass: number;
  isStatic: boolean;
  isMerging: boolean;
  mesh: THREE.Group;
}

export interface CollisionPair {
  bodyA: PhysicsBody;
  bodyB: PhysicsBody;
  point: THREE.Vector3;
}

export class PhysicsSystem {
  public bodies: PhysicsBody[] = [];
  public gravity: number = -12.0; // Satisfying rapid falling
  public restitution: number = 0.15; // Soft bouncy fruits
  
  // Container Box parameters
  public boxWidth: number = 6.0;
  public boxDepth: number = 6.0;
  public boxHeight: number = 9.5;

  private bodyIdCounter: number = 0;

  constructor() {}

  public createBody(
    level: number,
    radius: number,
    position: THREE.Vector3,
    mesh: THREE.Group
  ): PhysicsBody {
    const body: PhysicsBody = {
      id: this.bodyIdCounter++,
      level,
      position: position.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      radius,
      // Mass proportional to volume
      mass: Math.pow(radius, 3),
      isStatic: false,
      isMerging: false,
      mesh,
    };
    
    // Position mesh
    mesh.position.copy(body.position);
    this.bodies.push(body);
    return body;
  }

  public removeBody(body: PhysicsBody): void {
    const index = this.bodies.indexOf(body);
    if (index !== -1) {
      this.bodies.splice(index, 1);
    }
  }

  public step(dt: number, subSteps: number = 6): void {
    if (dt <= 0) return;
    
    const subStepDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      // 1. Apply gravity & update positions
      for (const body of this.bodies) {
        if (body.isStatic || body.isMerging) continue;

        // Apply constant gravity acceleration
        body.velocity.y += this.gravity * subStepDt;
        
        // Dynamic air damping (terminal velocity simulation)
        body.velocity.multiplyScalar(1 - 0.2 * subStepDt);

        // Update position
        body.position.addScaledVector(body.velocity, subStepDt);
      }

      // 2. Solve container constraints
      this.solveContainerConstraints();

      // 3. Solve sphere-sphere collisions
      this.solveCollisions();
    }

    // 4. Sync Three.js meshes
    for (const body of this.bodies) {
      if (body.isMerging) continue;
      body.mesh.position.copy(body.position);
      
      // Add subtle roll rotation based on velocity to make it look realistic
      if (!body.isStatic && body.velocity.lengthSq() > 0.001) {
        const velDir = body.velocity.clone().normalize();
        // Rotation axis is perpendicular to movement and gravity
        const rotAxis = new THREE.Vector3(0, 1, 0).cross(velDir).normalize();
        if (rotAxis.lengthSq() > 0.001) {
          const speed = body.velocity.length();
          const angle = (speed / body.radius) * dt;
          body.mesh.rotateOnWorldAxis(rotAxis, angle);
        }
      }
    }
  }

  private solveContainerConstraints(): void {
    const halfW = this.boxWidth / 2;
    const halfD = this.boxDepth / 2;

    for (const body of this.bodies) {
      if (body.isStatic || body.isMerging) continue;

      // X-boundaries
      const limitX = halfW - body.radius;
      if (body.position.x < -limitX) {
        body.position.x = -limitX;
        body.velocity.x = -body.velocity.x * this.restitution;
        body.velocity.y *= 0.98; // Wall friction
        body.velocity.z *= 0.98;
      } else if (body.position.x > limitX) {
        body.position.x = limitX;
        body.velocity.x = -body.velocity.x * this.restitution;
        body.velocity.y *= 0.98;
        body.velocity.z *= 0.98;
      }

      // Z-boundaries
      const limitZ = halfD - body.radius;
      if (body.position.z < -limitZ) {
        body.position.z = -limitZ;
        body.velocity.z = -body.velocity.z * this.restitution;
        body.velocity.x *= 0.98;
        body.velocity.y *= 0.98;
      } else if (body.position.z > limitZ) {
        body.position.z = limitZ;
        body.velocity.z = -body.velocity.z * this.restitution;
        body.velocity.x *= 0.98;
        body.velocity.y *= 0.98;
      }

      // Floor boundary (Y = 0 is container bottom)
      const limitYBottom = body.radius;
      if (body.position.y < limitYBottom) {
        body.position.y = limitYBottom;
        body.velocity.y = -body.velocity.y * this.restitution;
        
        // If bounce speed is tiny, bring to rest
        if (Math.abs(body.velocity.y) < 0.15) {
          body.velocity.y = 0;
        }

        // Apply floor friction
        body.velocity.x *= 0.92;
        body.velocity.z *= 0.92;
      }
    }
  }

  private solveCollisions(): void {
    const count = this.bodies.length;
    for (let i = 0; i < count; i++) {
      const b1 = this.bodies[i];
      if (b1.isMerging) continue;

      for (let j = i + 1; j < count; j++) {
        const b2 = this.bodies[j];
        if (b2.isMerging) continue;

        // Vector from b1 to b2
        const dx = b2.position.x - b1.position.x;
        const dy = b2.position.y - b1.position.y;
        const dz = b2.position.z - b1.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = b1.radius + b2.radius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist === 0) continue;

          // Normal direction from b1 to b2
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          const overlap = minDist - dist;

          // Position Correction (PBD styled overlap resolution to guarantee zero interpenetration)
          const totalMass = b1.mass + b2.mass;
          const w1 = b1.isStatic ? 0 : (1 / b1.mass);
          const w2 = b2.isStatic ? 0 : (1 / b2.mass);
          const totalInvMass = w1 + w2;

          if (totalInvMass === 0) continue;

          // Push them apart along the collision normal
          const correctionAmount = overlap / totalInvMass;
          
          if (!b1.isStatic) {
            b1.position.x -= nx * w1 * correctionAmount;
            b1.position.y -= ny * w1 * correctionAmount;
            b1.position.z -= nz * w1 * correctionAmount;
          }
          if (!b2.isStatic) {
            b2.position.x += nx * w2 * correctionAmount;
            b2.position.y += ny * w2 * correctionAmount;
            b2.position.z += nz * w2 * correctionAmount;
          }

          // Relative velocity
          const rvx = b2.velocity.x - b1.velocity.x;
          const rvy = b2.velocity.y - b1.velocity.y;
          const rvz = b2.velocity.z - b1.velocity.z;

          // Velocity along collision normal
          const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

          // Only resolve velocities if they are moving towards each other
          if (velAlongNormal < 0) {
            // Elastic impulse response
            const impulseScalar = -(1.0 + this.restitution) * velAlongNormal / totalInvMass;

            if (!b1.isStatic) {
              b1.velocity.x -= w1 * impulseScalar * nx;
              b1.velocity.y -= w1 * impulseScalar * ny;
              b1.velocity.z -= w1 * impulseScalar * nz;
            }
            if (!b2.isStatic) {
              b2.velocity.x += w2 * impulseScalar * nx;
              b2.velocity.y += w2 * impulseScalar * ny;
              b2.velocity.z += w2 * impulseScalar * nz;
            }
          }

          // Contact Friction: Apply linear damping tangential to collision normal
          // Resolves sliding and makes stacking possible
          const rvxT = rvx - (rvx * nx + rvy * ny + rvz * nz) * nx;
          const rvyT = rvy - (rvx * nx + rvy * ny + rvz * nz) * ny;
          const rvzT = rvz - (rvx * nx + rvy * ny + rvz * nz) * nz;

          const frictionFactor = 0.08; // Stabilizes stacking rolling
          if (!b1.isStatic) {
            b1.velocity.x += rvxT * w1 * frictionFactor * b2.mass / totalMass;
            b1.velocity.y += rvyT * w1 * frictionFactor * b2.mass / totalMass;
            b1.velocity.z += rvzT * w1 * frictionFactor * b2.mass / totalMass;
          }
          if (!b2.isStatic) {
            b2.velocity.x -= rvxT * w2 * frictionFactor * b1.mass / totalMass;
            b2.velocity.y -= rvyT * w2 * frictionFactor * b1.mass / totalMass;
            b2.velocity.z -= rvzT * w2 * frictionFactor * b1.mass / totalMass;
          }
        }
      }
    }
  }

  // Find all pairs of fruits that are in contact and of the same level
  public getMergeCandidates(): CollisionPair[] {
    const candidates: CollisionPair[] = [];
    const count = this.bodies.length;

    for (let i = 0; i < count; i++) {
      const b1 = this.bodies[i];
      if (b1.isStatic || b1.isMerging) continue;

      for (let j = i + 1; j < count; j++) {
        const b2 = this.bodies[j];
        if (b2.isStatic || b2.isMerging || b1.level !== b2.level) continue;

        // Skip if they are already max-level Suika
        if (b1.level >= 10) continue;

        const dx = b2.position.x - b1.position.x;
        const dy = b2.position.y - b1.position.y;
        const dz = b2.position.z - b1.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const contactDist = b1.radius + b2.radius;

        // Tolerant touch check: if within 2% margin of touch radius, they are candidates
        if (distSq < contactDist * contactDist * 1.04) {
          candidates.push({
            bodyA: b1,
            bodyB: b2,
            point: new THREE.Vector3(
              b1.position.x + dx * 0.5,
              b1.position.y + dy * 0.5,
              b1.position.z + dz * 0.5
            )
          });
        }
      }
    }

    return candidates;
  }
}
