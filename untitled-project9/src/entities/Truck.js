import * as THREE from 'three';

/**
 * Truck.js
 * Assembles a beautiful, low-poly 3D Food Truck model using compound primitives.
 * Features:
 * - Rotating tire cylinders.
 * - Interactive warm-white headlights casting physical spotlights.
 * - Serving window shelf with a pink awning canopy.
 * - Spending upgrades dynamically updates visual features (like glowing neon underglow!).
 */
export class Truck {
  constructor(scene) {
    this.scene = scene;

    // Build the visual 3D group container
    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    // Track dynamic nodes
    this.wheels = [];
    this.headlights = [];
    this.underglowLight = null;

    // Assemble the model parts
    this.buildChassis();
    this.buildCabin();
    this.buildServingWindow();
    this.buildWheels();
    this.buildHeadlightsLights();
  }

  buildChassis() {
    // 1. Lower chassis frame base (sleek dark metal)
    const baseGeo = new THREE.BoxGeometry(2.3, 0.4, 4.4);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e1333, // Deep violet black
      roughness: 0.5,
      metalness: 0.8
    });

    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.5; // Raised slightly above tires
    base.castShadow = true;
    base.receiveShadow = true;
    this.mesh.add(base);
  }

  buildCabin() {
    // 2. Main fridge container (white glossy metal box)
    const fridgeGeo = new THREE.BoxGeometry(2.2, 2.0, 2.6);
    const fridgeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.25
    });

    const fridge = new THREE.Mesh(fridgeGeo, fridgeMat);
    fridge.position.set(0, 1.7, -0.6); // Rear mounted fridge cargo
    fridge.castShadow = true;
    fridge.receiveShadow = true;
    this.mesh.add(fridge);

    // Beautiful retro paint stripe (warm golden/orange lines)
    const stripeGeo = new THREE.BoxGeometry(2.24, 0.25, 2.62);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xff6b8b });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 1.5, -0.6);
    this.mesh.add(stripe);

    // 3. Driver cab cockpit (orange/coral hood box)
    const cabGeo = new THREE.BoxGeometry(2.2, 1.3, 1.4);
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0xff8e53, // Sunset coral orange
      roughness: 0.3,
      metalness: 0.1
    });

    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, 1.35, 1.4); // Forward cockpit
    cab.castShadow = true;
    cab.receiveShadow = true;
    this.mesh.add(cab);

    // Grill nose bumper (dark block)
    const bumperGeo = new THREE.BoxGeometry(2.0, 0.4, 0.35);
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7 });
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(0, 0.6, 2.15);
    bumper.castShadow = true;
    this.mesh.add(bumper);

    // Windshield Glass (Cyan glowing panel)
    const glassGeo = new THREE.PlaneGeometry(1.8, 0.7);
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff,
      side: THREE.DoubleSide
    });
    const windshield = new THREE.Mesh(glassGeo, glassMat);
    windshield.position.set(0, 1.5, 2.11);
    // Lean windshield slightly back
    windshield.rotation.x = -Math.PI / 12;
    this.mesh.add(windshield);

    // Side windows
    const sideGlassGeo = new THREE.PlaneGeometry(0.8, 0.6);
    
    const lWindow = new THREE.Mesh(sideGlassGeo, glassMat);
    lWindow.position.set(1.11, 1.5, 1.3);
    lWindow.rotation.y = Math.PI / 2;
    this.mesh.add(lWindow);

    const rWindow = new THREE.Mesh(sideGlassGeo, glassMat);
    rWindow.position.set(-1.11, 1.5, 1.3);
    rWindow.rotation.y = -Math.PI / 2;
    this.mesh.add(rWindow);
  }

  buildServingWindow() {
    // 4. Serving counter cutout & shelter awning (Right side of vehicle)
    // Awning structure (curved or angled canopy)
    const awningGeo = new THREE.BoxGeometry(0.2, 0.8, 1.6);
    const awningMat = new THREE.MeshStandardMaterial({
      color: 0xff6b8b, // Magenta awning
      roughness: 0.5
    });

    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(1.15, 2.3, -0.6);
    awning.rotation.z = Math.PI / 6; // Angled outward like a shelter
    awning.castShadow = true;
    this.mesh.add(awning);

    // Counter wooden shelf
    const counterGeo = new THREE.BoxGeometry(0.3, 0.1, 1.5);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.8 });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(1.12, 1.4, -0.6);
    counter.castShadow = true;
    this.mesh.add(counter);
  }

  buildWheels() {
    // 5. Stylized cartoonish tire cylinders
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.45, 12);
    // Rotate cylinder geometry so its flat side points outward
    wheelGeo.rotateZ(Math.PI / 2);
    
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x181818, // Rubber tires
      roughness: 0.9,
      metalness: 0.1
    });

    const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.48, 8);
    hubGeo.rotateZ(Math.PI / 2);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xffd59e, metalness: 0.7 });

    const wheelOffsets = [
      { x: 1.1, z: 1.25 },  // Front Right
      { x: -1.1, z: 1.25 }, // Front Left
      { x: 1.1, z: -1.25 }, // Rear Right
      { x: -1.1, z: -1.25 } // Rear Left
    ];

    wheelOffsets.forEach((o) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(o.x, 0.45, o.z);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      const hubcap = new THREE.Mesh(hubGeo, hubMat);
      wheelGroup.add(hubcap);

      this.mesh.add(wheelGroup);
      this.wheels.push(wheelGroup);
    });
  }

  buildHeadlightsLights() {
    // 6. Glowing headlights throwing actual sunset spotlights!
    const lightGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.2, 8);
    lightGeo.rotateX(Math.PI / 2);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const headlightPositions = [
      { x: 0.75, y: 0.75, z: 2.1 },
      { x: -0.75, y: 0.75, z: 2.1 }
    ];

    headlightPositions.forEach((pos) => {
      const bulb = new THREE.Mesh(lightGeo, lightMat);
      bulb.position.copy(pos);
      this.mesh.add(bulb);

      // Spotlights throwing warm cone forward on road
      const spotlight = new THREE.SpotLight(0xfffae0, 1.8, 25, Math.PI / 5, 0.4, 1.0);
      spotlight.position.copy(pos);
      spotlight.position.y += 0.3; // Offset slightly up

      // Set target location in front of truck
      const targetObject = new THREE.Object3D();
      targetObject.position.set(pos.x, pos.y, pos.z + 10);
      this.mesh.add(targetObject);
      spotlight.target = targetObject;
      
      this.mesh.add(spotlight);
      this.headlights.push(spotlight);
    });
  }

  /**
   * Installs active pink neon underglow reflecting lights on the pavement!
   */
  installNeonUnderglow() {
    if (this.underglowLight) return;

    // Chassis pointlight reflecting pink light
    this.underglowLight = new THREE.PointLight(0xff6b8b, 4.0, 10.0, 1.5);
    this.underglowLight.position.set(0, 0.2, 0); // Position underneath base
    this.mesh.add(this.underglowLight);

    // Create a physical glowing visual neon halo ring plane under the truck
    const haloGeo = new THREE.RingGeometry(1.2, 1.4, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff6b8b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.04; // Placed micro-elevation from pavement
    this.mesh.add(halo);
  }

  /**
   * Refreshes physical coordinates and spins tire cylinders in response to speed changes.
   * @param {number} speed - The driving speed value from the physics engine.
   * @param {number} delta - Frame delta time.
   */
  update(speed, delta) {
    // 1. Roll tire cylinders forward/backward proportional to speed
    // angularVel = velocity / radius (radius is 0.48)
    const tireRadius = 0.48;
    const rotationDisplacement = (speed / tireRadius) * delta;

    this.wheels.forEach((w) => {
      w.rotation.x += rotationDisplacement;
    });

    // 2. Animate subtle chassis drift wiggle based on velocity (arcade polish)
    const tiltAmount = (speed / 20.0) * 0.015; // Lean forward during acceleration
    this.mesh.position.y = Math.sin(Date.now() * 0.015) * 0.04; // Micro bounce
  }

  clear() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.wheels = [];
    this.headlights = [];
  }
}
