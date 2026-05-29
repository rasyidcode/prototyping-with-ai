import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FRUIT_TYPES, createFruitMesh } from './FruitDefinitions';
import { PhysicsSystem } from './PhysicsSystem';

import { ParticleSystem } from './ParticleSystem';
import { SoundEffects } from './SoundEffects';

// Game state typing
type GameState = 'welcome' | 'playing' | 'gameover';

class GameController {
  // Three.js Core
  private container!: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private clock!: THREE.Clock;
  
  // Game Systems
  private physics!: PhysicsSystem;
  private particles!: ParticleSystem;
  private sounds!: SoundEffects;
  
  // Lights & visual aids
  private dirLight!: THREE.DirectionalLight;
  private pointLights: THREE.PointLight[] = [];
  private warningLine!: THREE.Line;
  private projectionLine!: THREE.Line;

  
  // Game States
  private gameState: GameState = 'welcome';
  private score: number = 0;
  private bestScore: number = 0;
  private graphicsHigh: boolean = true;
  private cooldown: boolean = false;

  private mouseDownPos = { x: 0, y: 0 };
  
  // Fruit Spawner
  private spawnerLevel: number = 0;
  private nextLevel: number = 0;
  private spawnerGroup: THREE.Group = new THREE.Group();
  private dropHeight: number = 10.5; // Top drop height
  private currentPointerPos: THREE.Vector3 = new THREE.Vector3(0, 10.5, 0);
  private raycastPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -10.5); // Plane at Y=10.5
  private raycaster = new THREE.Raycaster();
  private mouse2D = new THREE.Vector2();

  // Merging animations
  private activeMerges: Array<{
    meshA: THREE.Group;
    meshB: THREE.Group;
    posA: THREE.Vector3;
    posB: THREE.Vector3;
    midpoint: THREE.Vector3;
    targetLevel: number;
    elapsed: number;
    duration: number;
  }> = [];

  // Scaling up animations
  private activeBounces: Array<{
    mesh: THREE.Group;
    elapsed: number;
    duration: number;
    targetScale: number;
  }> = [];

  // Game over check
  private overflowTimer: number = 0;
  private readonly overflowThreshold: number = 1.5; // Seconds of resting overflow before Game Over
  private isWarningActive: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    this.container = document.getElementById('canvas-container') as HTMLDivElement;
    this.clock = new THREE.Clock();
    
    // 1. Initialize systems
    this.physics = new PhysicsSystem();
    this.sounds = new SoundEffects();
    
    // 2. Setup Three.js scene
    this.setupScene();
    
    // 3. Initialize Particle Engine
    this.particles = new ParticleSystem(this.scene);
    
    // 4. Create Glass Container & Visual Helpers
    this.createGameContainer();
    
    // 5. Setup controls & inputs
    this.setupInputs();
    
    // 6. Bind HUD UI Elements
    this.bindUI();
    
    // 7. Load local highscore
    this.loadHighscore();
    
    // 8. Start Rendering loop
    this.animate();
  }

  private setupScene(): void {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = null; // Let CSS background gradient shine through

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    // Positioned front-up-leaning looking down at the box center
    this.camera.position.set(0, 11, 19);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Orbit camera controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 4.5, 0); // Focus on center of gravity container
    // Constraints: Allow orbiting horizontally 360 but restrict vertical angles
    this.controls.minPolarAngle = Math.PI / 4.5; // ~40 degrees from vertical
    this.controls.maxPolarAngle = Math.PI / 2.1; // Restrict looking under the floor
    this.controls.minDistance = 10;
    this.controls.maxDistance = 25;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Directional light with high-fidelity shadows
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    this.dirLight.position.set(6, 16, 8);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 30;
    const shadowSize = 6;
    this.dirLight.shadow.camera.left = -shadowSize;
    this.dirLight.shadow.camera.right = shadowSize;
    this.dirLight.shadow.camera.top = shadowSize;
    this.dirLight.shadow.camera.bottom = -shadowSize;
    this.dirLight.shadow.bias = -0.0003;
    this.scene.add(this.dirLight);

    // Subtle blue/purple backing rim light for visual depth
    const rimLight = new THREE.DirectionalLight(0x7000ff, 0.4);
    rimLight.position.set(-8, 5, -8);
    this.scene.add(rimLight);

    // Add spawner group to scene
    this.scene.add(this.spawnerGroup);
  }

  private createGameContainer(): void {
    const w = this.physics.boxWidth;
    const d = this.physics.boxDepth;
    const h = this.physics.boxHeight;

    // 1. Transparent glass floor mesh
    const floorGeom = new THREE.BoxGeometry(w, 0.2, d);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a2130,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      ior: 1.5,
      transparent: true,
      opacity: 0.8,
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.position.set(0, -0.1, 0); // Position right below floor limit
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // 2. Glass walls (cuboid box with top open)
    const wallThickness = 0.15;
    const wallsMat = new THREE.MeshPhysicalMaterial({
      color: 0x1f2d3d,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.85,
      thickness: 0.2,
      ior: 1.5,
      transparent: true,
      opacity: 0.25,
      depthWrite: false, // Prevents transparent sorting artifacts
    });

    // Left wall
    const wallLeftGeom = new THREE.BoxGeometry(wallThickness, h, d);
    const wallLeft = new THREE.Mesh(wallLeftGeom, wallsMat);
    wallLeft.position.set(-w / 2 - wallThickness / 2, h / 2, 0);
    this.scene.add(wallLeft);

    // Right wall
    const wallRightGeom = new THREE.BoxGeometry(wallThickness, h, d);
    const wallRight = new THREE.Mesh(wallRightGeom, wallsMat);
    wallRight.position.set(w / 2 + wallThickness / 2, h / 2, 0);
    this.scene.add(wallRight);

    // Back wall
    const wallBackGeom = new THREE.BoxGeometry(w, h, wallThickness);
    const wallBack = new THREE.Mesh(wallBackGeom, wallsMat);
    wallBack.position.set(0, h / 2, -d / 2 - wallThickness / 2);
    this.scene.add(wallBack);

    // Front wall (made very transparent for easy playing view)
    const wallFrontGeom = new THREE.BoxGeometry(w, h, wallThickness);
    const frontMat = wallsMat.clone();
    frontMat.opacity = 0.08; // Super clear front glass
    const wallFront = new THREE.Mesh(wallFrontGeom, frontMat);
    wallFront.position.set(0, h / 2, d / 2 + wallThickness / 2);
    this.scene.add(wallFront);

    // 3. Glowing Box Border outline (wireframe borders)
    const containerGeom = new THREE.BoxGeometry(w, h, d);
    containerGeom.translate(0, h / 2, 0);
    const containerEdges = new THREE.EdgesGeometry(containerGeom);
    const containerBorderMat = new THREE.LineBasicMaterial({
      color: 0x4facfe,
      linewidth: 2, // Ignored by WebGL, fallback to 1
      transparent: true,
      opacity: 0.4
    });
    const borders = new THREE.LineSegments(containerEdges, containerBorderMat);
    this.scene.add(borders);

    // 4. Red Dashed Warning Overflow Line (Y = 9.5 container height)
    const linePoints = [
      new THREE.Vector3(-w / 2, h, -d / 2),
      new THREE.Vector3(w / 2, h, -d / 2),
      new THREE.Vector3(w / 2, h, d / 2),
      new THREE.Vector3(-w / 2, h, d / 2),
      new THREE.Vector3(-w / 2, h, -d / 2),
    ];
    const warningLineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
    const warningLineMat = new THREE.LineDashedMaterial({
      color: 0xff3e3e,
      dashSize: 0.4,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.8
    });
    this.warningLine = new THREE.Line(warningLineGeom, warningLineMat);
    this.warningLine.computeLineDistances(); // Required for dashed line
    this.scene.add(this.warningLine);

    // 5. Dashed Prediction Projection Line (Vertical line from spawner to bottom)
    const projPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -h, 0)
    ];
    const projLineGeom = new THREE.BufferGeometry().setFromPoints(projPoints);
    const projLineMat = new THREE.LineDashedMaterial({
      color: 0x00f2fe,
      dashSize: 0.3,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.5
    });
    this.projectionLine = new THREE.Line(projLineGeom, projLineMat);
    this.projectionLine.computeLineDistances();
    this.scene.add(this.projectionLine);
  }

  private setupInputs(): void {
    const getPointerCoords = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return { clientX, clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (this.gameState !== 'playing') return;

      const { clientX, clientY } = getPointerCoords(e);
      // Calculate normalized device coordinates
      this.mouse2D.x = (clientX / window.innerWidth) * 2 - 1;
      this.mouse2D.y = -(clientY / window.innerHeight) * 2 + 1;

      // Raycast against drop plane Y = 10.5
      this.raycaster.setFromCamera(this.mouse2D, this.camera);
      const intersectionPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.raycastPlane, intersectionPoint);

      if (intersectionPoint) {
        const radius = FRUIT_TYPES[this.spawnerLevel].radius;
        const w = this.physics.boxWidth;
        const d = this.physics.boxDepth;
        
        // Clamp X and Z within the container boundaries (offset by fruit radius)
        const limitX = w / 2 - radius - 0.05;
        const limitZ = d / 2 - radius - 0.05;

        this.currentPointerPos.x = THREE.MathUtils.clamp(intersectionPoint.x, -limitX, limitX);
        this.currentPointerPos.z = THREE.MathUtils.clamp(intersectionPoint.z, -limitZ, limitZ);
        this.currentPointerPos.y = this.dropHeight;

        // Position spawner fruit
        this.spawnerGroup.position.copy(this.currentPointerPos);
        
        // Position and update prediction line
        this.projectionLine.position.copy(this.currentPointerPos);
        this.projectionLine.visible = true;
      }
    };

    // Track mouse dragging to prevent dropping fruit on OrbitControls rotates
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = getPointerCoords(e);

      this.mouseDownPos.x = clientX;
      this.mouseDownPos.y = clientY;
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      if (this.gameState !== 'playing') return;

      const { clientX, clientY } = getPointerCoords(e);
      const dist = Math.sqrt(
        Math.pow(clientX - this.mouseDownPos.x, 2) +
        Math.pow(clientY - this.mouseDownPos.y, 2)
      );

      // If pointer moved more than 5px, they were rotating the camera
      if (dist > 5) {

      } else {
        // Simple click -> Perform drop
        this.dropCurrentFruit();
      }
    };

    // Pointer move listener
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // Track click vs drag listener
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);

    // Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private bindUI(): void {
    // Menu buttons
    const startBtn = document.getElementById('start-button') as HTMLButtonElement;
    const restartBtn = document.getElementById('restart-button') as HTMLButtonElement;
    
    // Overlays
    const welcomeOverlay = document.getElementById('welcome-overlay') as HTMLDivElement;
    const gameOverOverlay = document.getElementById('game-over-overlay') as HTMLDivElement;

    // Toggle button elements
    const muteBtn = document.getElementById('mute-button') as HTMLButtonElement;
    const musicBtn = document.getElementById('music-button') as HTMLButtonElement;
    const gfxBtn = document.getElementById('graphics-button') as HTMLButtonElement;

    startBtn.addEventListener('click', () => {
      welcomeOverlay.classList.add('hidden');
      this.startGame();
    });

    restartBtn.addEventListener('click', () => {
      gameOverOverlay.classList.add('hidden');
      this.startGame();
    });

    // Mute/Audio triggers
    muteBtn.addEventListener('click', () => {
      const isMuted = this.sounds.toggleMute();
      muteBtn.classList.toggle('active', isMuted);
      muteBtn.innerText = isMuted ? '🔇 Muted' : '🔊 SFX';
    });

    musicBtn.addEventListener('click', () => {
      if (musicBtn.classList.contains('active')) {
        this.sounds.stopAmbientMusic();
        musicBtn.classList.remove('active');
        musicBtn.innerText = '🎵 Music Off';
      } else {
        this.sounds.startAmbientMusic();
        musicBtn.classList.add('active');
        musicBtn.innerText = '🎵 Music On';
      }
    });

    gfxBtn.addEventListener('click', () => {
      this.graphicsHigh = !this.graphicsHigh;
      this.renderer.shadowMap.enabled = this.graphicsHigh;
      this.dirLight.castShadow = this.graphicsHigh;
      
      // Update shadows immediately
      this.renderer.shadowMap.needsUpdate = true;
      this.scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = this.graphicsHigh;
          node.receiveShadow = this.graphicsHigh;
        }
      });
      
      gfxBtn.classList.toggle('active', !this.graphicsHigh);
      gfxBtn.innerText = this.graphicsHigh ? '⚡ High GFX' : '💨 Low GFX';
    });
  }

  private startGame(): void {
    // Reset scores
    this.score = 0;
    this.updateScoreHUD();
    this.cooldown = false;
    this.overflowTimer = 0;
    this.isWarningActive = false;
    (this.warningLine.material as THREE.LineDashedMaterial).opacity = 0.8;
    this.warningLine.scale.set(1, 1, 1);

    // Clear old physics bodies and meshes from scene
    for (const body of this.physics.bodies) {
      this.scene.remove(body.mesh);
      body.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    this.physics.bodies = [];

    // Clear animations queues
    this.activeMerges = [];
    this.activeBounces = [];

    // Initialize Spawner levels
    this.spawnerLevel = Math.floor(Math.random() * 3); // Level 0 to 2 initially
    this.nextLevel = Math.floor(Math.random() * 3);
    
    // Create first spawner mesh preview
    this.updateSpawnerPreview();

    // Begin looping music if not active
    const musicBtn = document.getElementById('music-button') as HTMLButtonElement;
    if (musicBtn.classList.contains('active')) {
      this.sounds.startAmbientMusic();
    }

    this.gameState = 'playing';
  }

  private updateSpawnerPreview(): void {
    // Clear old mesh children
    while (this.spawnerGroup.children.length > 0) {
      const child = this.spawnerGroup.children[0];
      this.spawnerGroup.remove(child);
    }

    // Build new spawner fruit mesh
    const previewMesh = createFruitMesh(this.spawnerLevel);
    // Make preview mesh translucent/ghost-like slightly
    previewMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.transparent = true;
        child.material.opacity = 0.8;
        child.castShadow = false;
      }
    });

    this.spawnerGroup.add(previewMesh);
    this.spawnerGroup.position.copy(this.currentPointerPos);
    this.spawnerGroup.visible = true;

    // Highlight active guide index in evolution guide
    const guideItems = document.querySelectorAll('.evolution-item');
    guideItems.forEach((item) => {
      const lvl = parseInt(item.getAttribute('data-level') || '-1');
      item.classList.toggle('active-next', lvl === this.nextLevel);
    });

    // Update Sidebar next preview indicator
    const nextDot = document.getElementById('next-fruit-indicator') as HTMLDivElement;
    const nextName = document.getElementById('next-fruit-name') as HTMLSpanElement;
    const nextInfo = FRUIT_TYPES[this.nextLevel];
    nextDot.style.background = nextInfo.color;
    nextDot.style.boxShadow = `0 0 12px ${nextInfo.color}`;
    nextName.innerText = nextInfo.name;
  }

  private dropCurrentFruit(): void {
    if (this.cooldown) return;

    // Start drop cooldown (allows spawner transition to finish)
    this.cooldown = true;
    this.projectionLine.visible = false;
    this.spawnerGroup.visible = false;

    // Play bubble pop drop
    this.sounds.playDrop();

    // Create the active falling physics fruit mesh
    const dropLvl = this.spawnerLevel;
    const dropInfo = FRUIT_TYPES[dropLvl];
    const physicalMesh = createFruitMesh(dropLvl);
    this.scene.add(physicalMesh);

    // Create physics rigid body
    const dropPos = this.currentPointerPos.clone();
    const body = this.physics.createBody(dropLvl, dropInfo.radius, dropPos, physicalMesh);
    
    // Give a tiny initial downward impulse to drop quickly
    body.body.velocity.set(0, -1.0, 0);

    // Quick cooldown before loading next preview fruit (0.55s)
    setTimeout(() => {
      if (this.gameState !== 'playing') return;
      this.spawnerLevel = this.nextLevel;
      this.nextLevel = this.rollNextLevel();
      this.updateSpawnerPreview();
      this.cooldown = false;
    }, 550);
  }

  private rollNextLevel(): number {
    // Standard Suika rules: preview rolls are cherry(0), strawberry(1), grape(2), dekopon(3), persimmon(4)
    // Weighted heavily on tiny fruits for fun sorting dynamics
    const rand = Math.random();
    if (rand < 0.35) return 0; // Cherry (35%)
    if (rand < 0.65) return 1; // Strawberry (30%)
    if (rand < 0.85) return 2; // Grape (20%)
    if (rand < 0.95) return 3; // Dekopon (10%)
    return 4; // Persimmon (5%)
  }

  private handleMerges(): void {
    const candidates = this.physics.getMergeCandidates();
    if (candidates.length === 0) return;

    // Process first candidate to avoid conflicts of double-merges in a single tick
    const merge = candidates[0];
    const b1 = merge.bodyA;
    const b2 = merge.bodyB;

    // Flag bodies so they are excluded from standard physics step during merge animation
    b1.isMerging = true;
    b2.isMerging = true;

    // Calculate details
    const targetLvl = b1.level + 1;
    const targetInfo = FRUIT_TYPES[targetLvl];
    const midpoint = merge.point.clone();

    // Play chime merge sounds
    this.sounds.playMerge(targetLvl);

    // Queue merge interpolation animation
    this.activeMerges.push({
      meshA: b1.mesh,
      meshB: b2.mesh,
      posA: b1.mesh.position.clone(),
      posB: b2.mesh.position.clone(),
      midpoint: midpoint,
      targetLevel: targetLvl,
      elapsed: 0,
      duration: 0.15 // rapid 150ms slide
    });

    // Remove physics bodies immediately so they don't participate in collisions
    this.physics.removeBody(b1);
    this.physics.removeBody(b2);

    // Trigger score awards & visual effects
    this.score += targetInfo.score;
    this.updateScoreHUD();

    // Burst particles matching merged fruit colors
    this.particles.createMergeBurst(midpoint, targetInfo.color, targetInfo.radius);

    // Floating 3D projection overlay score indicator
    this.spawnFloatingScore(midpoint, targetInfo.score);

    // Flash a dynamic lighting flare matching fruit color
    this.triggerMergeLightFlare(midpoint, targetInfo.color);
  }

  private triggerMergeLightFlare(position: THREE.Vector3, colorHex: string): void {
    const light = new THREE.PointLight(new THREE.Color(colorHex), 5.0, 6.0);
    light.position.copy(position);
    this.scene.add(light);
    this.pointLights.push(light);

    // Fade out light slowly
    let elapsed = 0;
    const duration = 0.4;
    const fadeTick = () => {
      elapsed += 0.05;
      if (elapsed >= duration) {
        this.scene.remove(light);
        const idx = this.pointLights.indexOf(light);
        if (idx !== -1) this.pointLights.splice(idx, 1);
      } else {
        light.intensity = 5.0 * (1.0 - elapsed / duration);
        setTimeout(fadeTick, 50);
      }
    };
    fadeTick();
  }

  private spawnFloatingScore(pos3D: THREE.Vector3, points: number): void {
    // Project 3D coordinate to screen Space
    const projVec = pos3D.clone();
    projVec.project(this.camera);

    const x = (projVec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(projVec.y * 0.5) + 0.5) * window.innerHeight;

    // Create DOM element overlay
    const div = document.createElement('div');
    div.className = 'floating-score';
    div.innerText = `+${points}`;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;

    const container = document.getElementById('floating-scores-container') as HTMLDivElement;
    container.appendChild(div);

    // Cleanup after CSS animation finishes
    setTimeout(() => {
      container.removeChild(div);
    }, 1000);
  }

  private animateMerges(dt: number): void {
    for (let i = this.activeMerges.length - 1; i >= 0; i--) {
      const merge = this.activeMerges[i];
      merge.elapsed += dt;

      const t = Math.min(1.0, merge.elapsed / merge.duration);
      
      // Interpolate scales down
      const scale = 1.0 - t;
      merge.meshA.scale.set(scale, scale, scale);
      merge.meshB.scale.set(scale, scale, scale);

      // Slide positions to midpoint
      merge.meshA.position.lerpVectors(merge.posA, merge.midpoint, t);
      merge.meshB.position.lerpVectors(merge.posB, merge.midpoint, t);

      if (t >= 1.0) {
        // Complete merge: Cleanup old meshes
        this.scene.remove(merge.meshA);
        this.scene.remove(merge.meshB);
        
        merge.meshA.traverse((child) => {
          if (child instanceof THREE.Mesh) child.geometry.dispose();
        });
        merge.meshB.traverse((child) => {
          if (child instanceof THREE.Mesh) child.geometry.dispose();
        });

        // Spawn merged fruit in scene
        const targetLvl = merge.targetLevel;
        const targetInfo = FRUIT_TYPES[targetLvl];
        const newMesh = createFruitMesh(targetLvl);
        newMesh.position.copy(merge.midpoint);
        newMesh.scale.set(0.01, 0.01, 0.01); // Start tiny for scale-up bounce
        this.scene.add(newMesh);

        // Add as an active physics body
        this.physics.createBody(targetLvl, targetInfo.radius, merge.midpoint, newMesh);

        // Queue bouncing entry scale animation
        this.activeBounces.push({
          mesh: newMesh,
          elapsed: 0,
          duration: 0.24, // 240ms bouncy scale
          targetScale: 1.0
        });

        this.activeMerges.splice(i, 1);
      }
    }

    // Process scale up bounces
    for (let i = this.activeBounces.length - 1; i >= 0; i--) {
      const bounce = this.activeBounces[i];
      bounce.elapsed += dt;
      const t = Math.min(1.0, bounce.elapsed / bounce.duration);

      // Elastic bounce out curve
      const bounceVal = this.elasticOut(t);
      bounce.mesh.scale.set(bounceVal, bounceVal, bounceVal);

      if (t >= 1.0) {
        bounce.mesh.scale.set(1, 1, 1);
        this.activeBounces.splice(i, 1);
      }
    }
  }

  private elasticOut(t: number): number {
    return Math.sin(-13.0 * (t + 1.0) * Math.PI / 2.0) * Math.pow(2.0, -10.0 * t) + 1.0;
  }

  private checkOverflow(dt: number): void {
    let isCurrentlyOverflowing = false;
    const h = this.physics.boxHeight;

    // Check if any settled dynamic body overflows the top warning line (Y = 9.5)
    for (const body of this.physics.bodies) {
      if (body.isMerging) continue;

      // Rest check: must be moving very slowly, and center or boundary crosses Y=9.5
      // This prevents the warning sensor from firing on drops before the fruit settles
      const vel = body.body.velocity;
      const speedSq = vel.x * vel.x + vel.y * vel.y + vel.z * vel.z;
      if (vel.y < 0.1 && speedSq < 0.2) {
        const topEdge = body.body.position.y + body.radius * 0.5; // Tolerant boundary: center or substantial part must cross Y=9.5
        if (topEdge > h) {
          isCurrentlyOverflowing = true;
          break;
        }
      }
    }

    if (isCurrentlyOverflowing) {
      this.overflowTimer += dt;
      
      // Visual pulse effect on red warning line
      this.isWarningActive = true;
      const pulse = 1.0 + 0.15 * Math.sin(this.clock.getElapsedTime() * 15.0);
      this.warningLine.scale.set(pulse, 1.0, pulse);
      (this.warningLine.material as THREE.LineDashedMaterial).color.setHex(0xff0000);
      (this.warningLine.material as THREE.LineDashedMaterial).opacity = 0.95;

      if (this.overflowTimer >= this.overflowThreshold) {
        this.triggerGameOver();
      }
    } else {
      this.overflowTimer = Math.max(0, this.overflowTimer - dt * 2.0); // Recover quickly if cleared
      
      if (this.isWarningActive && this.overflowTimer === 0) {
        this.isWarningActive = false;
        this.warningLine.scale.set(1.0, 1.0, 1.0);
        (this.warningLine.material as THREE.LineDashedMaterial).color.setHex(0xff3e3e);
        (this.warningLine.material as THREE.LineDashedMaterial).opacity = 0.8;
      }
    }
  }

  private triggerGameOver(): void {
    this.gameState = 'gameover';
    this.spawnerGroup.visible = false;
    this.projectionLine.visible = false;

    // Play sad chord synthesizer SFX
    this.sounds.playGameOver();

    // Check highscore
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveHighscore();
      document.getElementById('best-value')!.innerText = this.bestScore.toString();
    }

    // Reveal game over Overlay HUD
    document.getElementById('final-score')!.innerText = this.score.toString();
    document.getElementById('final-best')!.innerText = this.bestScore.toString();
    
    const overlay = document.getElementById('game-over-overlay') as HTMLDivElement;
    overlay.classList.remove('hidden');
  }

  private updateScoreHUD(): void {
    document.getElementById('score-value')!.innerText = this.score.toString();
  }

  private loadHighscore(): void {
    const val = localStorage.getItem('suika_3d_highscore');
    if (val) {
      this.bestScore = parseInt(val, 10);
      document.getElementById('best-value')!.innerText = this.bestScore.toString();
    }
  }

  private saveHighscore(): void {
    localStorage.setItem('suika_3d_highscore', this.bestScore.toString());
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(0.03, this.clock.getDelta()); // Cap delta to prevent physics jumps on background tabs

    if (this.gameState === 'playing') {
      // 1. Tick custom physics
      this.physics.step(dt);

      // 2. Process merges detection
      this.handleMerges();

      // 3. Update merging slide/scale animations
      this.animateMerges(dt);

      // 4. Update dynamic particle mesh loops
      this.particles.update(dt);

      // 5. Audit overflow sensors
      this.checkOverflow(dt);
    }

    // 6. Update controls damping physics
    this.controls.update();

    // 7. Core render call
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate game immediately since module scripts run after DOM is ready
new GameController();
