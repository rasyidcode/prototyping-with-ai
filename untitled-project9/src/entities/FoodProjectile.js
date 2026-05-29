import * as THREE from 'three';

/**
 * FoodProjectile.js
 * Manages procedural 3D meshes for Pizza, Burgers, and Tacos.
 * Animates flight paths along a parabolic trajectory and triggers particle splats on target hits.
 */
export class FoodProjectile {
  constructor(scene, particles, typeIndex, startPos, targetPos, onHitCallback) {
    this.scene = scene;
    this.particles = particles;
    this.typeIndex = typeIndex; // 0: Pizza, 1: Burger, 2: Taco
    this.startPos = startPos.clone();
    this.targetPos = targetPos.clone();
    this.onHitCallback = onHitCallback;

    // Movement tracking
    this.progress = 0.0;
    this.speed = 1.65; // Flight duration in seconds (reciprocal of this value)
    
    // Parabolic arc height
    this.arcHeight = 6.0;

    // Create the procedural mesh based on selected food type
    this.mesh = this.createProceduralFoodMesh();
    this.mesh.position.copy(this.startPos);
    this.scene.add(this.mesh);

    // Trail timer
    this.trailTimer = 0.0;
  }

  createProceduralFoodMesh() {
    const foodGroup = new THREE.Group();

    if (this.typeIndex === 0) {
      // 1. PROCEDURAL PIZZA SLICE
      // Yellow cylinder representing cheese/crust
      const cheeseGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.15, 3, 1, false, 0, Math.PI / 1.5);
      const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.4 });
      const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
      cheese.rotation.x = Math.PI / 2;
      foodGroup.add(cheese);

      // Red pepperoni slices (3 tiny cylinders)
      const pepGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 6);
      const pepMat = new THREE.MeshBasicMaterial({ color: 0xd62828 });
      
      const peps = [
        { x: 0.2, y: 0.1, z: 0.2 },
        { x: -0.2, y: 0.1, z: 0.3 },
        { x: 0.0, y: 0.1, z: -0.1 }
      ];

      peps.forEach((p) => {
        const pep = new THREE.Mesh(pepGeo, pepMat);
        pep.position.set(p.x, p.y, p.z);
        pep.rotation.x = Math.PI / 2;
        foodGroup.add(pep);
      });

      // Brown crust
      const crustGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.2, 8, 1, false, 0, Math.PI / 1.5);
      const crustMat = new THREE.MeshStandardMaterial({ color: 0xba7a3a, roughness: 0.8 });
      const crust = new THREE.Mesh(crustGeo, crustMat);
      crust.rotation.x = Math.PI / 2;
      crust.position.y = -0.05;
      foodGroup.add(crust);
    } 
    else if (this.typeIndex === 1) {
      // 2. PROCEDURAL HAMBURGER
      // Bun top (tan dome)
      const bunTopGeo = new THREE.SphereGeometry(0.65, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const bunMat = new THREE.MeshStandardMaterial({ color: 0xde9b62, roughness: 0.7 });
      const bunTop = new THREE.Mesh(bunTopGeo, bunMat);
      bunTop.position.y = 0.28;
      foodGroup.add(bunTop);

      // Cheese (yellow thin square box)
      const cheeseGeo = new THREE.BoxGeometry(1.05, 0.05, 1.05);
      const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xffd166 });
      const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
      cheese.position.y = 0.18;
      cheese.rotation.y = Math.PI / 4;
      foodGroup.add(cheese);

      // Beef patty (brown cylinder)
      const pattyGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.2, 8);
      const pattyMat = new THREE.MeshStandardMaterial({ color: 0x582f0e, roughness: 0.9 });
      const patty = new THREE.Mesh(pattyGeo, pattyMat);
      patty.position.y = 0.08;
      foodGroup.add(patty);

      // Lettuce (bright green slightly wider thin squashed box)
      const lettuceGeo = new THREE.BoxGeometry(1.15, 0.06, 1.15);
      const lettuceMat = new THREE.MeshStandardMaterial({ color: 0x06d6a0 });
      const lettuce = new THREE.Mesh(lettuceGeo, lettuceMat);
      lettuce.position.y = -0.05;
      lettuce.rotation.y = 0.2;
      foodGroup.add(lettuce);

      // Bun bottom (tan cylinder)
      const bunBotGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.15, 8);
      const bunBot = new THREE.Mesh(bunBotGeo, bunMat);
      bunBot.position.y = -0.15;
      foodGroup.add(bunBot);
    } 
    else {
      // 3. PROCEDURAL TACO
      // Shell (yellow folded cylinder segment)
      const shellGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.35, 10, 1, true, 0, Math.PI);
      const shellMat = new THREE.MeshStandardMaterial({
        color: 0xffd166,
        roughness: 0.6,
        side: THREE.DoubleSide
      });
      const shell = new THREE.Mesh(shellGeo, shellMat);
      shell.rotation.x = Math.PI / 2;
      shell.rotation.z = Math.PI / 2;
      foodGroup.add(shell);

      // Meat filling (dark brown box inside)
      const meatGeo = new THREE.BoxGeometry(0.8, 0.25, 0.45);
      const meatMat = new THREE.MeshStandardMaterial({ color: 0x582f0e });
      const meat = new THREE.Mesh(meatGeo, meatMat);
      meat.position.y = 0.1;
      foodGroup.add(meat);

      // Lettuce sprinkles (tiny green boxes poking out)
      const sprinklesMat = new THREE.MeshBasicMaterial({ color: 0x06d6a0 });
      const sprGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      
      for (let i = 0; i < 6; i++) {
        const spr = new THREE.Mesh(sprGeo, sprinklesMat);
        spr.position.set(
          (Math.random() - 0.5) * 0.7,
          0.3 + Math.random() * 0.15,
          (Math.random() - 0.5) * 0.3
        );
        spr.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        foodGroup.add(spr);
      }
      
      // Tomato sprinkles (tiny red boxes poking out)
      const tomMat = new THREE.MeshBasicMaterial({ color: 0xef476f });
      for (let i = 0; i < 3; i++) {
        const tom = new THREE.Mesh(sprGeo, tomMat);
        tom.position.set(
          (Math.random() - 0.5) * 0.7,
          0.3 + Math.random() * 0.15,
          (Math.random() - 0.5) * 0.3
        );
        tom.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        foodGroup.add(tom);
      }
    }

    // Enable shadows on all child parts
    foodGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });

    return foodGroup;
  }

  update(delta) {
    // 1. Advance linear progress along path
    this.progress += this.speed * delta;

    if (this.progress >= 1.0) {
      // Impact target destination!
      this.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });

      if (this.onHitCallback) {
        this.onHitCallback(this.targetPos);
      }
      return true; // Mark as ready to delete
    }

    // 2. Parabolic vertical arc interpolation
    const currentPos = new THREE.Vector3().lerpVectors(this.startPos, this.targetPos, this.progress);
    
    // Parabolic curve helper: y = arcHeight * (1 - 4 * (x - 0.5)^2)
    const normalizedDist = this.progress - 0.5;
    const verticalCurve = 1.0 - 4.0 * (normalizedDist * normalizedDist);
    currentPos.y += Math.max(0, verticalCurve * this.arcHeight);

    this.mesh.position.copy(currentPos);

    // 3. High speed tumbling rotations for arcade energy
    this.mesh.rotation.x += 6.0 * delta;
    this.mesh.rotation.y += 4.0 * delta;
    this.mesh.rotation.z += 5.0 * delta;

    // 4. Emit beautiful sparkly colored trail particles
    this.trailTimer += delta;
    if (this.trailTimer >= 0.04) {
      this.trailTimer = 0;
      
      const colors = [0xff6b8b, 0xffe162, 0x6bcb77];
      this.particles.spawnTrail(currentPos, colors[this.typeIndex]);
    }

    return false; // Keep updating
  }
}
