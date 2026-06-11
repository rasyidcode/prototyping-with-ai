import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import "./styles.css";

type Tier = {
  name: string;
  radius: number;
  score: number;
  color: string;
  glow: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
};

type Orb = {
  id: number;
  tier: number;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Group;
  createdAt: number;
  merging: boolean;
};

const tiers: Tier[] = [
  { name: "Asteroid", radius: 0.24, score: 2, color: "#8a8176", glow: "#d4c3ac" },
  { name: "Moon", radius: 0.31, score: 5, color: "#c7ced7", glow: "#eaf4ff" },
  { name: "Mercury", radius: 0.39, score: 11, color: "#b99368", glow: "#ffd1a3" },
  { name: "Mars", radius: 0.49, score: 24, color: "#d45b42", glow: "#ff927e" },
  { name: "Earth", radius: 0.61, score: 52, color: "#3f9fdf", glow: "#9ee6ff" },
  { name: "Neptune", radius: 0.76, score: 112, color: "#5169df", glow: "#9daeff" },
  { name: "Saturn", radius: 0.91, score: 240, color: "#d9bd73", glow: "#ffe5a2" },
  { name: "Jupiter", radius: 1.07, score: 520, color: "#d58c5f", glow: "#ffc79b" },
  { name: "Star", radius: 1.25, score: 1120, color: "#fff07b", glow: "#fff5a8", emissive: "#ffd24a" },
  { name: "Black Hole", radius: 1.45, score: 2400, color: "#090914", glow: "#a87cff", emissive: "#39236f" }
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root is missing.");
}

app.innerHTML = `
  <main class="game-shell">
    <canvas class="game-canvas" aria-label="Orbit Merge game canvas"></canvas>
    <section class="hud" aria-label="Game status">
      <div class="top-bar">
        <div class="score-panel">
          <div class="metric"><span>Score</span><strong id="score">0</strong></div>
          <div class="metric"><span>Best</span><strong id="best">0</strong></div>
        </div>
        <div></div>
        <div class="next-panel">
          <div id="next-orb" class="next-orb"></div>
          <div class="next-copy"><span>Next</span><strong id="next-name">Asteroid</strong></div>
        </div>
      </div>
      <div class="center-reticle" aria-hidden="true"></div>
      <div class="overflow-warning" id="overflow-warning">Overflow critical</div>
      <div class="charge-wrap">
        <div class="charge-track"><div id="charge-fill" class="charge-fill"></div></div>
        <div class="charge-label" id="charge-label">Hold to charge, release to throw</div>
      </div>
      <div class="help-line">Click to lock aim. Hold to charge, release to throw.</div>
      <div class="game-over" id="game-over" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <h1 id="game-over-title">Game Over</h1>
        <p id="final-score">Score 0</p>
        <button class="restart-button" id="restart-button">Restart</button>
      </div>
    </section>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>(".game-canvas")!;
const shell = document.querySelector<HTMLElement>(".game-shell")!;
const scoreEl = document.querySelector<HTMLElement>("#score")!;
const bestEl = document.querySelector<HTMLElement>("#best")!;
const nextOrbEl = document.querySelector<HTMLElement>("#next-orb")!;
const nextNameEl = document.querySelector<HTMLElement>("#next-name")!;
const chargeFillEl = document.querySelector<HTMLElement>("#charge-fill")!;
const chargeLabelEl = document.querySelector<HTMLElement>("#charge-label")!;
const gameOverEl = document.querySelector<HTMLElement>("#game-over")!;
const finalScoreEl = document.querySelector<HTMLElement>("#final-score")!;
const restartButton = document.querySelector<HTMLButtonElement>("#restart-button")!;
const overflowWarningEl = document.querySelector<HTMLElement>("#overflow-warning")!;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#080a13");
scene.fog = new THREE.Fog("#080a13", 9, 24);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 80);
camera.position.set(0, 4.25, 9.4);
camera.lookAt(0, 2.5, 0);

const clock = new THREE.Clock();
const pointerNdc = new THREE.Vector2(0, 0);
const aimDirection = new THREE.Vector3(0, -0.12, -1).normalize();
const cameraTarget = new THREE.Vector3(0, 2.6, -0.6);
const spawnOffset = new THREE.Vector3();
const tempVector = new THREE.Vector3();
const bodyMeshMap = new Map<number, Orb>();
const colliderBodyMap = new Map<number, number>();
const orbs = new Map<number, Orb>();
const pendingMerges = new Set<string>();

const bin = {
  halfX: 3.05,
  halfZ: 2.05,
  floorY: 0.25,
  height: 6.0,
  overflowY: 5.45
};

const state = {
  score: 0,
  best: Number(localStorage.getItem("orbit-merge-best") ?? 0),
  nextTier: 0,
  isCharging: false,
  charge: 0,
  chargeDirection: 1,
  gameOver: false,
  overflowTime: 0,
  lastShotAt: 0,
  idCounter: 1,
  shake: 0,
  pointerLocked: false
};

let world: RAPIER.World;
let eventQueue: RAPIER.EventQueue;

start().catch((error: unknown) => {
  console.error(error);
  app.innerHTML = `<main class="game-shell"><div class="game-over visible"><h1>Launch Failed</h1><p>Unable to initialize the physics engine.</p></div></main>`;
});

async function start() {
  await RAPIER.init();

  world = new RAPIER.World({ x: 0, y: -9.82, z: 0 });
  eventQueue = new RAPIER.EventQueue(true);

  buildScene();
  buildWorldBounds();
  resetGame();
  resize();
  requestAnimationFrame(tick);

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", cancelCharge);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  restartButton.addEventListener("click", resetGame);
}

function buildScene() {
  const ambient = new THREE.HemisphereLight("#dcebff", "#111322", 1.8);
  scene.add(ambient);

  const key = new THREE.DirectionalLight("#ffffff", 2.8);
  key.position.set(2.5, 7.5, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 22;
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -4;
  scene.add(key);

  const rim = new THREE.PointLight("#6cc8ff", 70, 18);
  rim.position.set(-3.6, 4.8, 4.2);
  scene.add(rim);

  createStarField();
  createBinMesh();
  createOverflowLine();
}

function createStarField() {
  const geometry = new THREE.BufferGeometry();
  const count = 520;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 42;
    positions[i * 3 + 1] = Math.random() * 22 - 2;
    positions[i * 3 + 2] = -Math.random() * 30 - 4;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: "#d7e8ff",
    size: 0.035,
    transparent: true,
    opacity: 0.82
  });

  scene.add(new THREE.Points(geometry, material));
}

function createBinMesh() {
  const floorGeometry = new THREE.BoxGeometry(bin.halfX * 2, 0.12, bin.halfZ * 2);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: "#162033",
    roughness: 0.72,
    metalness: 0.18
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.set(0, bin.floorY - 0.06, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = new THREE.MeshPhysicalMaterial({
    color: "#bfe8ff",
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.2,
    transmission: 0.65,
    thickness: 0.08,
    side: THREE.DoubleSide
  });

  const sideGeometry = new THREE.BoxGeometry(0.08, bin.height, bin.halfZ * 2);
  const backGeometry = new THREE.BoxGeometry(bin.halfX * 2, bin.height, 0.08);

  const left = new THREE.Mesh(sideGeometry, wallMaterial);
  left.position.set(-bin.halfX, bin.floorY + bin.height / 2, 0);
  scene.add(left);

  const right = new THREE.Mesh(sideGeometry, wallMaterial);
  right.position.set(bin.halfX, bin.floorY + bin.height / 2, 0);
  scene.add(right);

  const back = new THREE.Mesh(backGeometry, wallMaterial);
  back.position.set(0, bin.floorY + bin.height / 2, -bin.halfZ);
  scene.add(back);

  const front = new THREE.Mesh(backGeometry, wallMaterial);
  front.position.set(0, bin.floorY + bin.height / 2, bin.halfZ);
  scene.add(front);

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: "#b9e7ff",
    transparent: true,
    opacity: 0.72
  });
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(bin.halfX * 2, bin.height, bin.halfZ * 2));
  const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
  edgeLines.position.set(0, bin.floorY + bin.height / 2, 0);
  scene.add(edgeLines);
}

function createOverflowLine() {
  const points = [
    new THREE.Vector3(-bin.halfX, bin.overflowY, bin.halfZ + 0.04),
    new THREE.Vector3(bin.halfX, bin.overflowY, bin.halfZ + 0.04),
    new THREE.Vector3(bin.halfX, bin.overflowY, -bin.halfZ - 0.04),
    new THREE.Vector3(-bin.halfX, bin.overflowY, -bin.halfZ - 0.04),
    new THREE.Vector3(-bin.halfX, bin.overflowY, bin.halfZ + 0.04)
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: "#ff776f",
    dashSize: 0.22,
    gapSize: 0.13,
    transparent: true,
    opacity: 0.9
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  scene.add(line);
}

function buildWorldBounds() {
  const wallThickness = 0.18;
  const wallRestitution = 0.18;
  const floorDesc = RAPIER.ColliderDesc.cuboid(bin.halfX, 0.08, bin.halfZ)
    .setTranslation(0, bin.floorY - 0.08, 0)
    .setRestitution(0.22)
    .setFriction(0.92);
  world.createCollider(floorDesc);

  const wallConfigs = [
    { x: -bin.halfX - wallThickness / 2, y: bin.floorY + bin.height / 2, z: 0, hx: wallThickness / 2, hy: bin.height / 2, hz: bin.halfZ },
    { x: bin.halfX + wallThickness / 2, y: bin.floorY + bin.height / 2, z: 0, hx: wallThickness / 2, hy: bin.height / 2, hz: bin.halfZ },
    { x: 0, y: bin.floorY + bin.height / 2, z: -bin.halfZ - wallThickness / 2, hx: bin.halfX, hy: bin.height / 2, hz: wallThickness / 2 },
    { x: 0, y: bin.floorY + bin.height / 2, z: bin.halfZ + wallThickness / 2, hx: bin.halfX, hy: bin.height / 2, hz: wallThickness / 2 }
  ];

  for (const wall of wallConfigs) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(wall.hx, wall.hy, wall.hz)
        .setTranslation(wall.x, wall.y, wall.z)
        .setRestitution(wallRestitution)
        .setFriction(0.72)
    );
  }
}

function resetGame() {
  for (const orb of orbs.values()) {
    scene.remove(orb.mesh);
  }

  world = new RAPIER.World({ x: 0, y: -9.82, z: 0 });
  eventQueue = new RAPIER.EventQueue(true);
  buildWorldBounds();

  orbs.clear();
  bodyMeshMap.clear();
  colliderBodyMap.clear();
  pendingMerges.clear();
  state.score = 0;
  state.nextTier = randomSpawnTier();
  state.isCharging = false;
  state.charge = 0;
  state.chargeDirection = 1;
  state.gameOver = false;
  state.overflowTime = 0;
  state.shake = 0;
  state.idCounter = 1;

  gameOverEl.classList.remove("visible");
  overflowWarningEl.classList.remove("visible");
  updateHud();
}

function randomSpawnTier() {
  const roll = Math.random();
  if (roll > 0.86) return 2;
  if (roll > 0.58) return 1;
  return 0;
}

function onPointerMove(event: PointerEvent) {
  if (state.pointerLocked && event.pointerType === "mouse") {
    pointerNdc.x += event.movementX * 0.0026;
    pointerNdc.y -= event.movementY * 0.0026;
    pointerNdc.x = THREE.MathUtils.clamp(pointerNdc.x, -1, 1);
    pointerNdc.y = THREE.MathUtils.clamp(pointerNdc.y, -0.9, 0.75);
    return;
  }

  const rect = canvas.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  pointerNdc.x = THREE.MathUtils.clamp(pointerNdc.x, -1, 1);
  pointerNdc.y = THREE.MathUtils.clamp(pointerNdc.y, -0.9, 0.75);
}

function onPointerDown(event: PointerEvent) {
  if (state.gameOver) return;

  if (event.pointerType === "mouse" && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }

  if (event.pointerType !== "mouse") {
    canvas.setPointerCapture(event.pointerId);
    onPointerMove(event);
  }
  state.isCharging = true;
  state.charge = 0.08;
  state.chargeDirection = 1;
}

function onPointerUp(event: PointerEvent) {
  if (!state.isCharging || state.gameOver) return;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  throwCurrentOrb();
  cancelCharge();
}

function cancelCharge() {
  state.isCharging = false;
  state.charge = 0;
  state.chargeDirection = 1;
  updateChargeHud();
}

function onPointerLockChange() {
  state.pointerLocked = document.pointerLockElement === canvas;
  shell.classList.toggle("pointer-locked", state.pointerLocked);

  if (!state.pointerLocked) {
    cancelCharge();
  }
}

function throwCurrentOrb() {
  const now = performance.now();
  if (now - state.lastShotAt < 180) return;

  const tier = state.nextTier;
  const config = tiers[tier];
  spawnOffset.copy(aimDirection).multiplyScalar(1.0);
  const spawnPosition = camera.position.clone().add(spawnOffset);
  spawnPosition.z = Math.min(spawnPosition.z, bin.halfZ - config.radius - 0.18);
  spawnPosition.y = THREE.MathUtils.clamp(spawnPosition.y, bin.floorY + config.radius + 0.5, bin.overflowY - config.radius - 0.3);
  spawnPosition.x = THREE.MathUtils.clamp(spawnPosition.x, -bin.halfX + config.radius + 0.2, bin.halfX - config.radius - 0.2);

  const launchPower = THREE.MathUtils.lerp(7.4, 15.8, state.charge);
  const upwardBoost = THREE.MathUtils.lerp(1.1, 3.8, state.charge);
  const velocity = aimDirection.clone().multiplyScalar(launchPower);
  velocity.y += upwardBoost;

  createOrb(tier, spawnPosition, velocity);
  state.nextTier = randomSpawnTier();
  state.lastShotAt = now;
  updateHud();
}

function createOrb(tier: number, position: THREE.Vector3, velocity?: THREE.Vector3) {
  const config = tiers[tier];
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(position.x, position.y, position.z)
    .setLinearDamping(0.28)
    .setAngularDamping(0.42)
    .setCanSleep(true);
  const body = world.createRigidBody(bodyDesc);

  if (velocity) {
    body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    body.setAngvel(
      {
        x: (Math.random() - 0.5) * 3,
        y: (Math.random() - 0.5) * 3,
        z: (Math.random() - 0.5) * 3
      },
      true
    );
  }

  const collider = world.createCollider(
    RAPIER.ColliderDesc.ball(config.radius)
      .setDensity(0.9 + tier * 0.11)
      .setRestitution(0.32)
      .setFriction(0.82)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    body
  );

  const mesh = createOrbMesh(tier);
  mesh.position.copy(position);
  scene.add(mesh);

  const orb: Orb = {
    id: state.idCounter,
    tier,
    body,
    collider,
    mesh,
    createdAt: performance.now(),
    merging: false
  };

  state.idCounter += 1;
  orbs.set(orb.id, orb);
  bodyMeshMap.set(body.handle, orb);
  colliderBodyMap.set(collider.handle, body.handle);

  return orb;
}

function createOrbMesh(tier: number) {
  const config = tiers[tier];
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(config.radius, 40, 28);
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: config.roughness ?? 0.58,
    metalness: config.metalness ?? 0.06,
    emissive: config.emissive ?? "#000000",
    emissiveIntensity: tier >= 8 ? 0.7 : 0.06
  });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  group.add(sphere);

  addSurfaceMarks(group, tier, config.radius);

  if (tier === 6) {
    const ringGeometry = new THREE.RingGeometry(config.radius * 1.15, config.radius * 1.72, 64);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: "#f4daa3",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.74,
      roughness: 0.4
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI * 0.56;
    ring.rotation.z = Math.PI * 0.1;
    group.add(ring);
  }

  if (tier >= 8) {
    const glowGeometry = new THREE.SphereGeometry(config.radius * 1.12, 40, 24);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: config.glow,
      transparent: true,
      opacity: tier === 9 ? 0.16 : 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    group.add(new THREE.Mesh(glowGeometry, glowMaterial));
  }

  return group;
}

function addSurfaceMarks(group: THREE.Group, tier: number, radius: number) {
  const markCount = tier < 2 ? 6 : tier < 6 ? 8 : 11;
  const markMaterial = new THREE.MeshStandardMaterial({
    color: tier === 4 ? "#55c878" : tier === 9 ? "#3d2676" : "#ffffff",
    transparent: true,
    opacity: tier === 9 ? 0.42 : 0.26,
    roughness: 0.8
  });

  for (let i = 0; i < markCount; i += 1) {
    const markGeometry = new THREE.CircleGeometry(radius * THREE.MathUtils.randFloat(0.07, 0.18), 18);
    const mark = new THREE.Mesh(markGeometry, markMaterial);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const phi = THREE.MathUtils.randFloat(0.45, Math.PI - 0.45);
    const normal = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );
    mark.position.copy(normal).multiplyScalar(radius * 1.004);
    mark.lookAt(normal.clone().multiplyScalar(radius * 2));
    group.add(mark);
  }
}

function tick() {
  const delta = Math.min(clock.getDelta(), 1 / 30);

  if (!state.gameOver) {
    updateCharge(delta);
    updatePhysics(delta);
    checkOverflow(delta);
  }

  syncMeshes();
  updateCamera(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function updateCharge(delta: number) {
  if (!state.isCharging) return;

  state.charge += state.chargeDirection * delta * 0.82;
  if (state.charge >= 1) {
    state.charge = 1;
    state.chargeDirection = -1;
  }
  if (state.charge <= 0.08) {
    state.charge = 0.08;
    state.chargeDirection = 1;
  }
  updateChargeHud();
}

function updatePhysics(delta: number) {
  world.timestep = Math.min(delta, 1 / 45);
  world.step(eventQueue);

  eventQueue.drainCollisionEvents((handleA, handleB, started) => {
    if (!started) return;
    const bodyA = colliderBodyMap.get(handleA);
    const bodyB = colliderBodyMap.get(handleB);
    if (bodyA === undefined || bodyB === undefined) return;

    const orbA = bodyMeshMap.get(bodyA);
    const orbB = bodyMeshMap.get(bodyB);
    if (!orbA || !orbB) return;
    queueMerge(orbA, orbB);
  });
}

function queueMerge(orbA: Orb, orbB: Orb) {
  if (orbA.tier !== orbB.tier || orbA.tier >= tiers.length - 1) return;
  if (orbA.merging || orbB.merging) return;
  if (performance.now() - orbA.createdAt < 120 || performance.now() - orbB.createdAt < 120) return;

  const key = [orbA.id, orbB.id].sort((a, b) => a - b).join(":");
  if (pendingMerges.has(key)) return;
  pendingMerges.add(key);
  orbA.merging = true;
  orbB.merging = true;

  requestAnimationFrame(() => {
    pendingMerges.delete(key);
    if (!orbs.has(orbA.id) || !orbs.has(orbB.id)) return;
    mergeOrbs(orbA, orbB);
  });
}

function mergeOrbs(orbA: Orb, orbB: Orb) {
  const posA = orbA.body.translation();
  const posB = orbB.body.translation();
  const velA = orbA.body.linvel();
  const velB = orbB.body.linvel();
  const nextTier = orbA.tier + 1;
  const nextConfig = tiers[nextTier];

  tempVector.set(
    (posA.x + posB.x) / 2,
    (posA.y + posB.y) / 2 + nextConfig.radius * 0.05,
    (posA.z + posB.z) / 2
  );
  tempVector.x = THREE.MathUtils.clamp(tempVector.x, -bin.halfX + nextConfig.radius, bin.halfX - nextConfig.radius);
  tempVector.y = Math.max(tempVector.y, bin.floorY + nextConfig.radius + 0.05);
  tempVector.z = THREE.MathUtils.clamp(tempVector.z, -bin.halfZ + nextConfig.radius, bin.halfZ - nextConfig.radius);

  removeOrb(orbA);
  removeOrb(orbB);

  const inheritedVelocity = new THREE.Vector3(
    (velA.x + velB.x) * 0.18,
    Math.max((velA.y + velB.y) * 0.12, 0.6),
    (velA.z + velB.z) * 0.18
  );
  createOrb(nextTier, tempVector, inheritedVelocity);

  state.score += nextConfig.score;
  state.shake = Math.min(0.18, state.shake + 0.035 + nextTier * 0.006);
  updateHud();
}

function removeOrb(orb: Orb) {
  orbs.delete(orb.id);
  bodyMeshMap.delete(orb.body.handle);
  colliderBodyMap.delete(orb.collider.handle);
  scene.remove(orb.mesh);
  world.removeCollider(orb.collider, false);
  world.removeRigidBody(orb.body);
}

function syncMeshes() {
  for (const orb of orbs.values()) {
    const position = orb.body.translation();
    const rotation = orb.body.rotation();
    orb.mesh.position.set(position.x, position.y, position.z);
    orb.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }
}

function checkOverflow(delta: number) {
  let overflowing = false;

  for (const orb of orbs.values()) {
    const pos = orb.body.translation();
    const vel = orb.body.linvel();
    const top = pos.y + tiers[orb.tier].radius;
    const settled = Math.abs(vel.x) + Math.abs(vel.y) + Math.abs(vel.z) < 0.42;
    if (top > bin.overflowY && settled && performance.now() - orb.createdAt > 900) {
      overflowing = true;
      break;
    }
  }

  if (overflowing) {
    state.overflowTime += delta;
  } else {
    state.overflowTime = Math.max(0, state.overflowTime - delta * 1.8);
  }

  overflowWarningEl.classList.toggle("visible", state.overflowTime > 0.35);

  if (state.overflowTime > 2.2) {
    endGame();
  }
}

function endGame() {
  state.gameOver = true;
  state.isCharging = false;
  state.charge = 0;
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("orbit-merge-best", String(state.best));
  }
  finalScoreEl.textContent = `Score ${state.score.toLocaleString()}`;
  gameOverEl.classList.add("visible");
  updateHud();
}

function updateCamera(delta: number) {
  const baseX = pointerNdc.x * 0.95;
  const baseY = 4.25 + pointerNdc.y * 0.42;
  const targetX = pointerNdc.x * 2.7;
  const targetY = 2.65 + pointerNdc.y * 1.28;
  state.shake = Math.max(0, state.shake - delta * 0.45);

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, baseX + (Math.random() - 0.5) * state.shake, delta * 8);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, baseY + (Math.random() - 0.5) * state.shake, delta * 8);
  cameraTarget.x = THREE.MathUtils.lerp(cameraTarget.x, targetX, delta * 10);
  cameraTarget.y = THREE.MathUtils.lerp(cameraTarget.y, targetY, delta * 10);
  cameraTarget.z = -0.75;
  camera.lookAt(cameraTarget);
  camera.getWorldDirection(aimDirection);
}

function updateHud() {
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("orbit-merge-best", String(state.best));
  }

  scoreEl.textContent = state.score.toLocaleString();
  bestEl.textContent = state.best.toLocaleString();
  const next = tiers[state.nextTier];
  nextNameEl.textContent = next.name;
  nextOrbEl.style.setProperty("--orb-color", next.color);
  nextOrbEl.style.setProperty("--orb-glow", next.glow);
  updateChargeHud();
}

function updateChargeHud() {
  chargeFillEl.style.setProperty("--charge", state.isCharging ? String(state.charge) : "0");
  chargeLabelEl.textContent = state.isCharging ? "Release to throw" : "Hold to charge, release to throw";
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
