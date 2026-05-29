import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export interface PhysicsBody {
  id: number;
  level: number;
  radius: number;
  mesh: THREE.Group;
  body: CANNON.Body;
  isMerging: boolean;
}

export interface CollisionPair {
  bodyA: PhysicsBody;
  bodyB: PhysicsBody;
  point: THREE.Vector3;
}

export class PhysicsSystem {
  public world!: CANNON.World;
  public bodies: PhysicsBody[] = [];
  public gravity: number = -14.0; // Satisfying rapid fall gravity
  
  // Container Box parameters
  public boxWidth: number = 6.0;
  public boxDepth: number = 6.0;
  public boxHeight: number = 9.5;

  private bodyIdCounter: number = 0;

  constructor() {
    this.initPhysics();
  }

  private initPhysics(): void {
    // 1. Initialize CANNON.World
    this.world = new CANNON.World();
    this.world.gravity.set(0, this.gravity, 0);

    // Sleep mode to stabilize bodies when at rest
    this.world.allowSleep = true;

    // Split solver equations for stability
    (this.world.solver as any).iterations = 10;
    this.world.defaultContactMaterial.contactEquationStiffness = 1e5;
    this.world.defaultContactMaterial.contactEquationRelaxation = 3;

    // 2. Set up physics materials
    const wallMaterial = new CANNON.Material('wallMaterial');
    const fruitMaterial = new CANNON.Material('fruitMaterial');

    const fruitWallContactMaterial = new CANNON.ContactMaterial(
      fruitMaterial,
      wallMaterial,
      {
        friction: 0.15,
        restitution: 0.1, // Damp bounce slightly at walls
      }
    );

    const fruitFruitContactMaterial = new CANNON.ContactMaterial(
      fruitMaterial,
      fruitMaterial,
      {
        friction: 0.35, // High friction helps stable stacking
        restitution: 0.15, // Satisfying bounce
        contactEquationStiffness: 1e5,
        contactEquationRelaxation: 3.5,
      }
    );

    this.world.addContactMaterial(fruitWallContactMaterial);
    this.world.addContactMaterial(fruitFruitContactMaterial);

    // 3. Create Container Static rigid bounds
    const w = this.boxWidth;
    const d = this.boxDepth;
    const h = this.boxHeight;
    const thickness = 0.2; // thickness of physical collider box boundaries

    // Floor Box: Center (0, -thickness/2, 0)
    const floorBody = new CANNON.Body({
      mass: 0, // static
      shape: new CANNON.Box(new CANNON.Vec3(w / 2, thickness / 2, d / 2)),
      position: new CANNON.Vec3(0, -thickness / 2, 0),
      material: wallMaterial,
    });
    this.world.addBody(floorBody);

    // Left Wall Box: Center (-w/2 - thickness/2, h/2, 0)
    const leftWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(thickness / 2, h / 2, d / 2)),
      position: new CANNON.Vec3(-w / 2 - thickness / 2, h / 2, 0),
      material: wallMaterial,
    });
    this.world.addBody(leftWallBody);

    // Right Wall Box: Center (w/2 + thickness/2, h/2, 0)
    const rightWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(thickness / 2, h / 2, d / 2)),
      position: new CANNON.Vec3(w / 2 + thickness / 2, h / 2, 0),
      material: wallMaterial,
    });
    this.world.addBody(rightWallBody);

    // Back Wall Box: Center (0, h/2, -d/2 - thickness/2)
    const backWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, thickness / 2)),
      position: new CANNON.Vec3(0, h / 2, -d / 2 - thickness / 2),
      material: wallMaterial,
    });
    this.world.addBody(backWallBody);

    // Front Wall Box: Center (0, h/2, d/2 + thickness/2)
    const frontWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, thickness / 2)),
      position: new CANNON.Vec3(0, h / 2, d / 2 + thickness / 2),
      material: wallMaterial,
    });
    this.world.addBody(frontWallBody);
  }

  public createBody(
    level: number,
    radius: number,
    position: THREE.Vector3,
    mesh: THREE.Group
  ): PhysicsBody {
    // Proportional mass to volume
    const mass = Math.pow(radius, 3) * 1.5;

    // Create CANNON sphere body
    const body = new CANNON.Body({
      mass,
      shape: new CANNON.Sphere(radius),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      material: this.world.defaultContactMaterial.materials[0], // fruitMaterial
    });

    // Add high damping to make objects stack peacefully
    body.linearDamping = 0.18;
    body.angularDamping = 0.22;

    this.world.addBody(body);

    const physicsBody: PhysicsBody = {
      id: this.bodyIdCounter++,
      level,
      radius,
      mesh,
      body,
      isMerging: false,
    };
    
    this.bodies.push(physicsBody);
    return physicsBody;
  }

  public removeBody(body: PhysicsBody): void {
    const index = this.bodies.indexOf(body);
    if (index !== -1) {
      this.bodies.splice(index, 1);
    }
    // Remove from physical world
    this.world.removeBody(body.body);
  }

  public step(dt: number): void {
    if (dt <= 0) return;

    // Step world with fixed timestep to ensure stability
    // 1/60s time step, dt elapsed, max sub-steps 4
    this.world.step(1 / 60, dt, 4);

    // Sync three.js mesh position and rotation
    for (const body of this.bodies) {
      if (body.isMerging) continue;

      body.mesh.position.set(
        body.body.position.x,
        body.body.position.y,
        body.body.position.z
      );

      body.mesh.quaternion.set(
        body.body.quaternion.x,
        body.body.quaternion.y,
        body.body.quaternion.z,
        body.body.quaternion.w
      );
    }
  }

  public getMergeCandidates(): CollisionPair[] {
    const candidates: CollisionPair[] = [];
    const numContacts = this.world.contacts.length;

    for (let i = 0; i < numContacts; i++) {
      const c = this.world.contacts[i];
      const b1 = c.bi;
      const b2 = c.bj;

      // Match Cannon bodies to our PhysicsBody wrappers
      const pBody1 = this.bodies.find((b) => b.body === b1);
      const pBody2 = this.bodies.find((b) => b.body === b2);

      if (pBody1 && pBody2) {
        if (pBody1.isMerging || pBody2.isMerging || pBody1.level !== pBody2.level) continue;
        if (pBody1.level >= 10) continue; // Max watermelon cannot merge

        // Calculate Contact Point in world space
        // Position of bi + vector from bi center to contact point (c.ri)
        const px = b1.position.x + c.ri.x;
        const py = b1.position.y + c.ri.y;
        const pz = b1.position.z + c.ri.z;

        candidates.push({
          bodyA: pBody1,
          bodyB: pBody2,
          point: new THREE.Vector3(px, py, pz),
        });
      }
    }

    return candidates;
  }
}
