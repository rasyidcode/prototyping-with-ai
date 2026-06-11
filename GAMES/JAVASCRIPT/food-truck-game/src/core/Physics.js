import * as THREE from 'three';

/**
 * Physics.js
 * Manages vector driving physics (steering, acceleration, inertia, drag)
 * and robust AABB wall-sliding collisions for smooth gameplay.
 */
export class Physics {
  constructor() {
    // Physics variables (default - can be adjusted via upgrades)
    this.acceleration = 18.0;      // units/s^2
    this.maxSpeed = 24.0;          // units/s
    this.deceleration = 8.0;       // friction/drag when idle
    this.braking = 32.0;           // quick brake force
    this.steeringSpeed = 2.4;      // radians/s
    this.reverseMaxSpeed = 10.0;
    
    // Truck state tracking
    this.speed = 0;
    this.steeringAngle = 0;
    
    // Dimensions of the food truck collision box
    this.truckWidth = 2.2;
    this.truckLength = 4.4;
  }

  /**
   * Updates the food truck position and rotation based on driving inputs and obstacle maps.
   * @param {THREE.Object3D} truck - The truck 3D object.
   * @param {Object} keys - Keyboard input states.
   * @param {number} delta - Frame delta time.
   * @param {Array} obstacles - Array of bounding boxes { minX, maxX, minZ, maxZ }.
   * @param {Object} upgrades - Active upgrade levels (engine, etc.)
   */
  update(truck, keys, delta, obstacles, upgrades = {}) {
    if (!truck) return;

    // Apply upgrade modifiers
    const engineLevel = upgrades.engine || 0;
    const finalMaxSpeed = this.maxSpeed * (1.0 + engineLevel * 0.15); // +15% speed per level
    const finalAccel = this.acceleration * (1.0 + engineLevel * 0.20); // +20% accel per level

    // 1. Throttle / Acceleration
    if (keys.forward) {
      if (this.speed < 0) {
        // Braking reverse motion
        this.speed += this.braking * delta;
      } else {
        this.speed += finalAccel * delta;
      }
    } else if (keys.backward) {
      if (this.speed > 0) {
        // Braking forward motion
        this.speed -= this.braking * delta;
      } else {
        this.speed -= finalAccel * delta;
      }
    } else {
      // Natural rolling resistance (friction)
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - this.deceleration * delta);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + this.deceleration * delta);
      }
    }

    // Clamp speed limits
    if (this.speed > finalMaxSpeed) this.speed = finalMaxSpeed;
    if (this.speed < -this.reverseMaxSpeed) this.speed = -this.reverseMaxSpeed;

    // 2. Steering & Yaw calculation
    // Steering is only effective when the vehicle is moving
    const movementRatio = Math.min(Math.abs(this.speed) / 5.0, 1.0);
    const steerDirection = this.speed >= 0 ? 1 : -1; // Steering reverses in reverse gear

    if (keys.left) {
      this.steeringAngle = this.steeringSpeed * delta * movementRatio * steerDirection;
      truck.rotateY(this.steeringAngle);
    } else if (keys.right) {
      this.steeringAngle = -this.steeringSpeed * delta * movementRatio * steerDirection;
      truck.rotateY(this.steeringAngle);
    } else {
      this.steeringAngle = 0;
    }

    // 3. Movement with Sliding Collision Detection
    // Calculate movement vector along the truck's forward heading
    const forwardVec = new THREE.Vector3(0, 0, 1);
    forwardVec.applyQuaternion(truck.quaternion);

    const displacement = forwardVec.multiplyScalar(this.speed * delta);

    // Slide physics: Split movement into X and Z segments to test collisions independently
    // This allows the truck to slide smoothly along building walls rather than sticky stopping!
    
    // Save original position
    const prevPos = truck.position.clone();

    // Try moving X first
    truck.position.x += displacement.x;
    if (this.checkCollisions(truck.position, obstacles)) {
      // Hit an obstacle, revert X movement and stop X velocity contribution
      truck.position.x = prevPos.x;
      this.speed *= 0.85; // Impact penalty
    }

    // Try moving Z next
    truck.position.z += displacement.z;
    if (this.checkCollisions(truck.position, obstacles)) {
      // Hit an obstacle, revert Z movement and stop Z velocity contribution
      truck.position.z = prevPos.z;
      this.speed *= 0.85; // Impact penalty
    }

    // 4. World Boundaries Containment (Map size is e.g. -110 to 110)
    const mapBounds = 105;
    if (Math.abs(truck.position.x) > mapBounds) {
      truck.position.x = Math.sign(truck.position.x) * mapBounds;
      this.speed = 0;
    }
    if (Math.abs(truck.position.z) > mapBounds) {
      truck.position.z = Math.sign(truck.position.z) * mapBounds;
      this.speed = 0;
    }
  }

  /**
   * Checks if the truck's hypothetical collision bounds overlaps with any obstacle.
   * @param {THREE.Vector3} position - The candidate position of the truck.
   * @param {Array} obstacles - Array of bounding boxes.
   * @returns {boolean} True if a collision is detected.
   */
  checkCollisions(position, obstacles) {
    // Generate truck AABB approximation (slightly smaller than actual mesh for better arcade feel)
    const padding = 0.4;
    const tMinX = position.x - (this.truckWidth / 2) + padding;
    const tMaxX = position.x + (this.truckWidth / 2) - padding;
    const tMinZ = position.z - (this.truckLength / 2) + padding;
    const tMaxZ = position.z + (this.truckLength / 2) - padding;

    for (let i = 0; i < obstacles.length; i++) {
      const box = obstacles[i];
      // Classic 2D AABB collision overlap formula
      const collidesX = tMinX <= box.maxX && tMaxX >= box.minX;
      const collidesZ = tMinZ <= box.maxZ && tMaxZ >= box.minZ;

      if (collidesX && collidesZ) {
        return true;
      }
    }

    return false;
  }
}
