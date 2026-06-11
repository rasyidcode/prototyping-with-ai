import * as THREE from 'three';

/**
 * Map.js
 * Generates the low-poly 3D campus world:
 * - Green grassy ground with boundary hedges.
 * - Grid of asphalt roads with yellow dashed dividers and sidewalk curbs.
 * - Elegant, stylized academic buildings with glowing windows.
 * - Stylized foliage (candy cone trees).
 * - A glowing central "Food Depot" stock refill canopy.
 * Returns an array of obstacle bounding boxes for the physics engine.
 */
export class Map {
  constructor(scene) {
    this.scene = scene;
    
    // Core tracking lists
    this.obstacles = []; // Array of { minX, maxX, minZ, maxZ, name }
    this.trees = [];
    this.buildings = [];

    // Configuration
    this.mapSize = 220; // -110 to 110

    // Procedural generation
    this.createGround();
    this.createRoadSystem();
    this.createBuildings();
    this.createFoliage();
    this.createRefillDepot();
  }

  createGround() {
    // 1. Lush deep purple/indigo grass base plane for sunset contrast
    const grassGeo = new THREE.PlaneGeometry(this.mapSize, this.mapSize);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x3d276b, // Deep cozy violet-purple
      roughness: 0.9,
      metalness: 0.05
    });

    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.scene.add(grass);

    // 2. High border hedges acting as structural boundaries
    const hedgeMat = new THREE.MeshStandardMaterial({
      color: 0x221342,
      roughness: 0.9
    });

    const hedgeGeo = new THREE.BoxGeometry(this.mapSize, 3, 4);

    // Add 4 boundaries
    const northHedge = new THREE.Mesh(hedgeGeo, hedgeMat);
    northHedge.position.set(0, 1.5, this.mapSize / 2);
    northHedge.castShadow = true;
    northHedge.receiveShadow = true;
    this.scene.add(northHedge);
    this.registerObstacle(northHedge, 4, 'North Wall');

    const southHedge = new THREE.Mesh(hedgeGeo, hedgeMat);
    southHedge.position.set(0, 1.5, -this.mapSize / 2);
    southHedge.castShadow = true;
    southHedge.receiveShadow = true;
    this.scene.add(southHedge);
    this.registerObstacle(southHedge, 4, 'South Wall');

    const westHedge = new THREE.Mesh(hedgeGeo, hedgeMat);
    westHedge.rotation.y = Math.PI / 2;
    westHedge.position.set(-this.mapSize / 2, 1.5, 0);
    westHedge.castShadow = true;
    westHedge.receiveShadow = true;
    this.scene.add(westHedge);
    this.registerObstacle(westHedge, 4, 'West Wall');

    const eastHedge = new THREE.Mesh(hedgeGeo, hedgeMat);
    eastHedge.rotation.y = Math.PI / 2;
    eastHedge.position.set(this.mapSize / 2, 1.5, 0);
    eastHedge.castShadow = true;
    eastHedge.receiveShadow = true;
    this.scene.add(eastHedge);
    this.registerObstacle(eastHedge, 4, 'East Wall');
  }

  createRoadSystem() {
    // Elegant road network forming driving channels
    // Roads are 12 units wide, elevated slightly (0.01) to prevent z-fighting
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1f1a30, // Sleek dark asphalt
      roughness: 0.8
    });

    const dividerMat = new THREE.MeshBasicMaterial({ color: 0xffd59e }); // Warm yellow dividers
    const roadWidth = 14;

    // Define main streets
    const roadLayouts = [
      { x: 0, z: 0, length: this.mapSize, rotY: 0 },         // Main vertical avenue
      { x: 0, z: 0, length: this.mapSize, rotY: Math.PI / 2 }, // Main horizontal avenue
      { x: -50, z: 0, length: this.mapSize - 40, rotY: 0 },   // West side street
      { x: 50, z: 0, length: this.mapSize - 40, rotY: 0 },    // East side street
      { x: 0, z: -50, length: this.mapSize - 40, rotY: Math.PI / 2 }, // South loop
      { x: 0, z: 50, length: this.mapSize - 40, rotY: Math.PI / 2 }  // North loop
    ];

    roadLayouts.forEach((r) => {
      const roadGeo = new THREE.PlaneGeometry(roadWidth, r.length);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = r.rotY;
      road.position.set(r.x, 0.01, r.z);
      road.receiveShadow = true;
      this.scene.add(road);

      // Add elegant yellow dashed lane dividers
      const dashCount = Math.floor(r.length / 8);
      const dashGeo = new THREE.PlaneGeometry(0.3, 3);
      for (let i = 0; i < dashCount; i++) {
        // Skip dash right in center junction (0,0) for cleanliness
        const offset = -r.length / 2 + (i * 8) + 4;
        if (Math.abs(offset) < 8 && Math.abs(r.x) < 5 && Math.abs(r.z) < 5) continue;

        const dash = new THREE.Mesh(dashGeo, dividerMat);
        dash.rotation.x = -Math.PI / 2;
        
        if (r.rotY === 0) {
          dash.position.set(r.x, 0.02, r.z + offset);
        } else {
          dash.rotation.z = Math.PI / 2;
          dash.position.set(r.x + offset, 0.02, r.z);
        }
        
        this.scene.add(dash);
      }
    });
  }

  createBuildings() {
    // Spawn 8 unique campus architectural centers with emission windows
    const buildingPresets = [
      { name: 'Student Union Hub', x: -30, z: -30, w: 20, d: 20, h: 14, color: 0x4d96ff, glowColor: 0x00ffff },
      { name: 'Tech Library Complex', x: 30, z: -30, w: 22, d: 18, h: 18, color: 0xff6b8b, glowColor: 0xff00ff },
      { name: 'Dormitory Hall A', x: -30, z: 30, w: 16, d: 24, h: 15, color: 0x6bcb77, glowColor: 0xffff00 },
      { name: 'Science Laboratory B', x: 30, z: 30, w: 24, d: 16, h: 16, color: 0xffa500, glowColor: 0xff5500 },
      { name: 'Arts & Music Hall', x: -75, z: -35, w: 18, d: 18, h: 12, color: 0x8e53ff, glowColor: 0x9900ff },
      { name: 'Gymnasium Center', x: 75, z: -35, w: 28, d: 20, h: 10, color: 0x00f5ff, glowColor: 0x00aaff },
      { name: 'President Academic Hall', x: -75, z: 35, w: 20, d: 16, h: 16, color: 0xff8e53, glowColor: 0xff8800 },
      { name: 'Design Studio Lab', x: 75, z: 35, w: 18, d: 22, h: 14, color: 0x61e8c9, glowColor: 0x00ff88 }
    ];

    buildingPresets.forEach((bp) => {
      const group = new THREE.Group();
      group.position.set(bp.x, 0, bp.z);

      // Main structural block
      const structureGeo = new THREE.BoxGeometry(bp.w, bp.h, bp.d);
      const structureMat = new THREE.MeshStandardMaterial({
        color: bp.color,
        roughness: 0.4,
        metalness: 0.15
      });

      const structure = new THREE.Mesh(structureGeo, structureMat);
      structure.position.y = bp.h / 2;
      structure.castShadow = true;
      structure.receiveShadow = true;
      group.add(structure);

      // Create glowing window matrices for sunset illumination
      const winCountX = Math.floor(bp.w / 4);
      const winCountY = Math.floor(bp.h / 3.5);
      
      const winGeo = new THREE.PlaneGeometry(1.6, 1.2);
      const winMat = new THREE.MeshBasicMaterial({
        color: bp.glowColor,
        side: THREE.DoubleSide
      });

      // Front and Back Windows
      for (let y = 1; y <= winCountY; y++) {
        for (let x = 0; x < winCountX; x++) {
          const posX = -bp.w / 2 + (x * 4) + 2;
          const posY = y * 3.2;

          // Front Window
          const winFront = new THREE.Mesh(winGeo, winMat);
          winFront.position.set(posX, posY, bp.d / 2 + 0.05);
          group.add(winFront);

          // Back Window
          const winBack = new THREE.Mesh(winGeo, winMat);
          winBack.position.set(posX, posY, -bp.d / 2 - 0.05);
          winBack.rotation.y = Math.PI;
          group.add(winBack);
        }
      }

      // Add building name/emissions banner on top edge
      const bannerGeo = new THREE.BoxGeometry(bp.w - 4, 1.2, 0.4);
      const bannerMat = new THREE.MeshBasicMaterial({
        color: 0x0f0a1c
      });
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(0, bp.h - 1, bp.d / 2 + 0.1);
      group.add(banner);

      const lightLineGeo = new THREE.BoxGeometry(bp.w - 4, 0.15, 0.1);
      const lightLineMat = new THREE.MeshBasicMaterial({ color: bp.glowColor });
      const lightLine = new THREE.Mesh(lightLineGeo, lightLineMat);
      lightLine.position.set(0, bp.h - 0.5, bp.d / 2 + 0.2);
      group.add(lightLine);

      this.scene.add(group);
      this.buildings.push(group);

      // Register collision box for the building structure
      this.registerObstacle(structure, 1.2, bp.name);
    });
  }

  createFoliage() {
    // Generate low-poly candy-sunset trees scattered across grassy plazas
    const treePoints = [
      // Cluster 1 (North West corner plaza)
      { x: -20, z: -15 }, { x: -42, z: -18 }, { x: -16, z: -40 },
      // Cluster 2 (North East plaza)
      { x: 18, z: -18 }, { x: 42, z: -16 }, { x: 16, z: -44 },
      // Cluster 3 (South West plaza)
      { x: -20, z: 18 }, { x: -44, z: 16 }, { x: -16, z: 42 },
      // Cluster 4 (South East plaza)
      { x: 20, z: 20 }, { x: 42, z: 18 }, { x: 18, z: 42 },
      // Margins
      { x: -70, z: -10 }, { x: -70, z: 10 }, { x: 70, z: -10 }, { x: 70, z: 10 }
    ];

    // Tree models: stacked green/neon yellow cones on wood trunks
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 3, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x48291c, roughness: 0.9 });

    const foliageColors = [0x55aa66, 0x6bcb77, 0x8be397];

    treePoints.forEach((tp) => {
      const tree = new THREE.Group();
      tree.position.set(tp.x, 0, tp.z);

      // Trunk
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.5;
      trunk.castShadow = true;
      tree.add(trunk);

      // Foliage layers (three stacked cones)
      const color = foliageColors[Math.floor(Math.random() * foliageColors.length)];
      const foliageMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8,
        flatShading: true
      });

      for (let i = 0; i < 3; i++) {
        const coneHeight = 3.0 - i * 0.4;
        const coneRadius = 2.0 - i * 0.4;
        const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 5);
        const cone = new THREE.Mesh(coneGeo, foliageMat);
        
        cone.position.y = 3.2 + i * 1.5;
        cone.castShadow = true;
        cone.receiveShadow = true;
        tree.add(cone);
      }

      this.scene.add(tree);
      this.trees.push(tree);

      // Add a small cylinder/sphere collider at the trunk base for physics
      const trunkCollider = {
        minX: tp.x - 0.7,
        maxX: tp.x + 0.7,
        minZ: tp.z - 0.7,
        maxZ: tp.z + 0.7,
        name: 'Tree Trunk'
      };
      this.obstacles.push(trunkCollider);
    });
  }

  createRefillDepot() {
    // A stunning neon-illuminated drive-in canopy where food gets restocked
    // We'll place it right at X: 0, Z: -75 (North end road loop)
    this.depotCenter = new THREE.Vector3(0, 0, -75);
    this.refillRadius = 7.0; // Restock zone radius

    const group = new THREE.Group();
    group.position.copy(this.depotCenter);

    // Glowing Neon Yellow ground ring outline
    const ringGeo = new THREE.RingGeometry(this.refillRadius - 0.5, this.refillRadius, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe162,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05; // Slightly above road plane
    group.add(ring);

    // Semi-transparent yellow glowing cylindrical zone marker
    const cylGeo = new THREE.CylinderGeometry(this.refillRadius, this.refillRadius, 5, 16, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0xffe162,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide
    });
    const cyl = new THREE.Mesh(cylGeo, cylMat);
    cyl.position.y = 2.5;
    group.add(cyl);

    // Support pillars (4 corners)
    const pillarGeo = new THREE.CylinderGeometry(0.25, 0.25, 6, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x120b20,
      metalness: 0.8,
      roughness: 0.2
    });

    const pillarsCoords = [
      { x: -5, z: -5 },
      { x: 5, z: -5 },
      { x: -5, z: 5 },
      { x: 5, z: 5 }
    ];

    pillarsCoords.forEach((p) => {
      const pil = new THREE.Mesh(pillarGeo, pillarMat);
      pil.position.set(p.x, 3, p.z);
      pil.castShadow = true;
      pil.receiveShadow = true;
      group.add(pil);

      // Register pillars as structural colliders
      const pillarCollider = {
        minX: this.depotCenter.x + p.x - 0.5,
        maxX: this.depotCenter.x + p.x + 0.5,
        minZ: this.depotCenter.z + p.z - 0.5,
        maxZ: this.depotCenter.z + p.z + 0.5,
        name: 'Depot Pillar'
      };
      this.obstacles.push(pillarCollider);
    });

    // Canopy Roof
    const roofGeo = new THREE.BoxGeometry(12, 1, 12);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xff6b8b,
      roughness: 0.5
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 6;
    roof.castShadow = true;
    group.add(roof);

    // Neon Yellow LED Sign beneath the canopy roof
    const signGeo = new THREE.BoxGeometry(10, 0.4, 0.4);
    const signMat = new THREE.MeshBasicMaterial({
      color: 0xffe162
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 5.3, 4.5);
    group.add(sign);

    // Dynamic rotating neon food symbol inside (e.g. glowing donut shape or box)
    const iconGeo = new THREE.TorusGeometry(1.0, 0.35, 8, 24);
    const iconMat = new THREE.MeshBasicMaterial({ color: 0xffe162 });
    this.depotIcon = new THREE.Mesh(iconGeo, iconMat);
    this.depotIcon.position.set(0, 3.5, 0);
    this.depotIcon.rotation.x = Math.PI / 2;
    group.add(this.depotIcon);

    this.scene.add(group);
  }

  /**
   * Helper that extracts bounding boxes of THREE meshes and saves them.
   * @param {THREE.Mesh} mesh - The mesh representing the obstacle structure.
   * @param {number} sizeMultiplier - Scaling cushion.
   * @param {string} name - Label for identification.
   */
  registerObstacle(mesh, sizeMultiplier = 1.0, name = 'Obstacle') {
    // Ensure the entire scene hierarchy's matrixWorld translations are fully calculated
    this.scene.updateMatrixWorld(true);

    // Force compute bounding boxes
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox.clone();
    
    // Scale and translate according to world transformation
    box.applyMatrix4(mesh.matrixWorld);

    // Add extra padding boundary cushion
    const padding = sizeMultiplier * 0.15;
    
    const obstacleInfo = {
      minX: box.min.x - padding,
      maxX: box.max.x + padding,
      minZ: box.min.z - padding,
      maxZ: box.max.z + padding,
      name: name
    };

    console.log(`[Obstacle Setup] ${name} -> X: [${obstacleInfo.minX.toFixed(2)} to ${obstacleInfo.maxX.toFixed(2)}], Z: [${obstacleInfo.minZ.toFixed(2)} to ${obstacleInfo.maxZ.toFixed(2)}]`);
    
    this.obstacles.push(obstacleInfo);
  }

  /**
   * Evaluates if the truck is parked within the Refill zone.
   */
  isTruckInRefillZone(truckPos) {
    const dist = truckPos.distanceTo(this.depotCenter);
    return dist <= this.refillRadius;
  }

  update(delta) {
    // Spin the depot's glowing logo icon in the air
    if (this.depotIcon) {
      this.depotIcon.rotation.z += 1.2 * delta;
      this.depotIcon.position.y = 3.5 + Math.sin(Date.now() * 0.003) * 0.25;
    }
  }

  clear() {
    // Clean up Three.js scenes
    this.buildings.forEach(b => this.scene.remove(b));
    this.trees.forEach(t => this.scene.remove(t));
    this.obstacles = [];
    this.trees = [];
    this.buildings = [];
  }
}
