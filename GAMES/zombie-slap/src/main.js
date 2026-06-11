import './style.css';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const app = document.querySelector('#app');
const playerHealthText = document.querySelector('#player-health');
const zombieHealthText = document.querySelector('#zombie-health');
const messageText = document.querySelector('#message');
const damageFlash = document.querySelector('#damage-flash');
const slapMeter = document.querySelector('#slap-meter');
const slapIndicator = document.querySelector('#slap-indicator');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151713);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 1.65, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.object);

const keys = new Set();
const timer = new THREE.Timer();
timer.connect(document);
const raycaster = new THREE.Raycaster();
const cameraForward = new THREE.Vector3();
const moveDirection = new THREE.Vector3();
const zombieDirection = new THREE.Vector3();
const zombieToPlayer = new THREE.Vector3();
const knockbackDirection = new THREE.Vector3();
const separationDirection = new THREE.Vector3();
const zombieOffset = new THREE.Vector3();
let statusMessageTimer = 0;
let damageFlashTimer = 0;

const roomSize = 18;
const spawnPoints = [
    new THREE.Vector3(0, 0, -7),
    new THREE.Vector3(-6, 0, -5),
    new THREE.Vector3(6, 0, -5),
    new THREE.Vector3(-6, 0, 1),
    new THREE.Vector3(6, 0, 1),
    new THREE.Vector3(0, 0, 5),
];

const player = {
    health: 100,
    alive: true,
    speed: 7.5,
    shakeTimer: 0,
    shakeDuration: 0.22,
    shakeStrength: 0.08,
};

const slap = {
    active: false,
    meterActive: false,
    meterValue: 0,
    meterDirection: 1,
    meterSpeed: 1.65,
    power: 1,
    minPower: 0.35,
    sweetSpot: 0.5,
    sweetSpotWidth: 0.14,
    timer: 0,
    duration: 0.34,
    cooldown: 0,
    cooldownTime: 0.38,
    hasCheckedHit: false,
    hitConnected: false,
    recoilTimer: 0,
    recoilDuration: 0.16,
    range: 2.5,
};

const wave = {
    number: 1,
    nextTimer: 0,
    spawnDelay: 1.8,
    startCount: 1,
    maxSimultaneous: spawnPoints.length,
    healAmount: 12,
};

const zombies = [];

const hand = createHand();
camera.add(hand);

addLights();
addRoom();
spawnWave(wave.number);
updateHud();

renderer.domElement.addEventListener('click', () => {
    if (!controls.isLocked && player.alive) {
        controls.lock();
    }
});

controls.addEventListener('lock', () => {
    messageText.textContent = 'WASD to move, click to slap';
});

controls.addEventListener('unlock', () => {
    if (player.alive && getLivingZombies().length > 0) {
        messageText.textContent = 'Click to resume';
    }
});

window.addEventListener('keydown', (event) => {
    keys.add(event.code);

    if (event.code === 'KeyR' && !player.alive) {
        resetGame();
    }
});

window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
});

window.addEventListener('mousedown', () => {
    if (controls.isLocked) {
        handleSlapInput();
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(timestamp) {
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.05);

    updatePlayer(delta);
    updateSlapMeter(delta);
    updateSlap(delta);
    updateZombies(delta);
    updateWave(delta);
    updateStatusMessage(delta);
    updateDamageFeedback(delta);

    applyCameraShake();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

function updatePlayer(delta) {
    if (!controls.isLocked || !player.alive) {
        return;
    }

    const inputX = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    const inputZ = Number(keys.has('KeyS')) - Number(keys.has('KeyW'));

    moveDirection.set(inputX, 0, inputZ);

    if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
        const chargeMultiplier = slap.meterActive ? 0.45 : 1;
        const moveAmount = player.speed * chargeMultiplier * delta;
        controls.moveRight(moveDirection.x * moveAmount);
        controls.moveForward(-moveDirection.z * moveAmount);
    }

    const limit = roomSize / 2 - 1;
    controls.object.position.x = THREE.MathUtils.clamp(controls.object.position.x, -limit, limit);
    controls.object.position.z = THREE.MathUtils.clamp(controls.object.position.z, -limit, limit);
}

function handleSlapInput() {
    if (slap.cooldown > 0 || slap.active || !player.alive) {
        return;
    }

    if (slap.meterActive) {
        releaseSlapMeter();
        return;
    }

    startSlapMeter();
}

function startSlapMeter() {
    slap.meterActive = true;
    slap.meterValue = 0;
    slap.meterDirection = 1;
    updateSlapMeterHud();
    slapMeter.classList.add('active');
    showStatusMessage('Click again to slap', 0.8);
}

function releaseSlapMeter() {
    slap.power = getSlapPower();
    slap.meterActive = false;
    slapMeter.classList.remove('active');
    startSlap();
}

function startSlap() {
    slap.active = true;
    slap.timer = 0;
    slap.cooldown = slap.cooldownTime;
    slap.hasCheckedHit = false;
    slap.hitConnected = false;
}

function updateSlapMeter(delta) {
    if (!slap.meterActive) {
        return;
    }

    slap.meterValue += slap.meterDirection * slap.meterSpeed * delta;

    if (slap.meterValue >= 1) {
        slap.meterValue = 1;
        slap.meterDirection = -1;
    }

    if (slap.meterValue <= 0) {
        slap.meterValue = 0;
        slap.meterDirection = 1;
    }

    updateSlapMeterHud();
}

function updateSlapMeterHud() {
    slapIndicator.style.left = slap.meterValue * 100 + '%';
}

function getSlapPower() {
    const distanceFromSweetSpot = Math.abs(slap.meterValue - slap.sweetSpot);
    const maxUsefulMiss = 0.5 - slap.sweetSpotWidth / 2;
    const normalizedMiss = THREE.MathUtils.clamp(distanceFromSweetSpot / maxUsefulMiss, 0, 1);
    const accuracy = 1 - normalizedMiss;
    return THREE.MathUtils.lerp(slap.minPower, 1, accuracy * accuracy);
}

function updateSlap(delta) {
    slap.cooldown = Math.max(0, slap.cooldown - delta);

    if (!slap.active) {
        slap.recoilTimer = Math.max(0, slap.recoilTimer - delta);
        const recoil = slap.recoilTimer / slap.recoilDuration;
        hand.position.set(0.48 + recoil * 0.18, -0.42 - recoil * 0.04, -0.78 + recoil * 0.28);
        hand.rotation.set(-0.2 + recoil * 0.25, 0.45, -0.22 + recoil * 0.18);
        return;
    }

    slap.timer += delta;
    const progress = Math.min(slap.timer / slap.duration, 1);
    const pose = getSlapPose(progress);

    hand.position.copy(pose.position);
    hand.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);

    if (!slap.hasCheckedHit && progress >= 0.48) {
        slap.hasCheckedHit = true;
        checkSlapHit();
    }

    if (slap.timer >= slap.duration) {
        slap.active = false;
    }
}

function getSlapPose(progress) {
    const idlePosition = new THREE.Vector3(0.48, -0.42, -0.78);
    const windupPosition = new THREE.Vector3(0.72, -0.36, -0.52);
    const strikePosition = new THREE.Vector3(-0.22, -0.28, -1.18);
    const recoverPosition = new THREE.Vector3(0.48, -0.42, -0.78);

    const idleRotation = new THREE.Euler(-0.2, 0.45, -0.22);
    const windupRotation = new THREE.Euler(-0.08, 0.9, -0.85);
    const strikeRotation = new THREE.Euler(-0.75, -0.75, 0.85);
    const recoverRotation = new THREE.Euler(-0.2, 0.45, -0.22);

    if (progress < 0.25) {
        const t = easeOut(progress / 0.25);
        return interpolateHandPose(idlePosition, windupPosition, idleRotation, windupRotation, t);
    }

    if (progress < 0.62) {
        const t = easeIn((progress - 0.25) / 0.37);
        return interpolateHandPose(windupPosition, strikePosition, windupRotation, strikeRotation, t);
    }

    const t = easeOut((progress - 0.62) / 0.38);
    return interpolateHandPose(strikePosition, recoverPosition, strikeRotation, recoverRotation, t);
}

function interpolateHandPose(startPosition, endPosition, startRotation, endRotation, t) {
    return {
        position: startPosition.clone().lerp(endPosition, t),
        rotation: {
            x: THREE.MathUtils.lerp(startRotation.x, endRotation.x, t),
            y: THREE.MathUtils.lerp(startRotation.y, endRotation.y, t),
            z: THREE.MathUtils.lerp(startRotation.z, endRotation.z, t),
        },
    };
}

function easeIn(t) {
    return t * t;
}

function easeOut(t) {
    return 1 - Math.pow(1 - t, 2);
}

function checkSlapHit() {
    const livingZombies = getLivingZombies();

    if (livingZombies.length === 0) {
        return;
    }

    camera.getWorldDirection(cameraForward);
    raycaster.set(camera.getWorldPosition(new THREE.Vector3()), cameraForward);
    raycaster.far = slap.range;

    const hits = raycaster.intersectObjects(livingZombies.map((zombie) => zombie.mesh), true);

    if (hits.length === 0) {
        return;
    }

    const hitZombie = findZombieFromObject(hits[0].object);

    if (!hitZombie) {
        return;
    }

    const hitDamage = Math.round(12 + slap.power * 28);
    hitZombie.health = Math.max(0, hitZombie.health - hitDamage);
    slap.hitConnected = true;
    slap.recoilTimer = slap.recoilDuration;
    hitZombie.stunTimer = 0.35;
    applyZombieKnockback(hitZombie, slap.power);
    flashZombie(hitZombie, 0xfff0b0, 90);
    showStatusMessage(getSlapPowerMessage(), 0.55);

    if (hitZombie.health === 0) {
        killZombie(hitZombie);
    }

    updateHud();
}

function updateZombies(delta) {
    if (!player.alive) {
        return;
    }

    for (const zombie of getLivingZombies()) {
        updateZombie(zombie, delta);
    }
}

function updateZombie(zombie, delta) {
    zombie.attackCooldown = Math.max(0, zombie.attackCooldown - delta);
    zombie.stunTimer = Math.max(0, zombie.stunTimer - delta);

    applyZombieSeparation(zombie, delta);

    zombieToPlayer.subVectors(controls.object.position, zombie.mesh.position);
    zombieToPlayer.y = 0;
    const distance = zombieToPlayer.length();

    if (zombie.stunTimer > 0) {
        zombie.mesh.lookAt(controls.object.position.x, zombie.mesh.position.y, controls.object.position.z);
        animateZombieWalk(zombie, delta, false);
        return;
    }

    const isMoving = distance > zombie.attackRange;

    if (isMoving) {
        zombieDirection.copy(zombieToPlayer).normalize();
        zombie.mesh.position.addScaledVector(zombieDirection, zombie.speed * delta);
        zombie.mesh.lookAt(controls.object.position.x, zombie.mesh.position.y, controls.object.position.z);
    }

    animateZombieWalk(zombie, delta, isMoving);

    if (distance <= zombie.attackRange && zombie.attackCooldown === 0) {
        zombie.attackCooldown = zombie.attackDelay;
        player.health = Math.max(0, player.health - 12);
        flashZombie(zombie, 0xa9483f, 120);
        triggerDamageFeedback();

        if (player.health === 0) {
            player.alive = false;
            messageText.textContent = 'You got eaten. Press R to restart';
            controls.unlock();
        }

        updateHud();
    }
}

function updateWave(delta) {
    if (!player.alive || wave.nextTimer === 0) {
        return;
    }

    wave.nextTimer = Math.max(0, wave.nextTimer - delta);

    if (wave.nextTimer === 0) {
        wave.number += 1;
        spawnWave(wave.number);
    }
}

function spawnWave(waveNumber) {
    clearZombies();

    const count = Math.min(wave.startCount + waveNumber - 1, wave.maxSimultaneous);

    for (let i = 0; i < count; i += 1) {
        const zombie = createZombieState(waveNumber);
        const spawnPoint = spawnPoints[i % spawnPoints.length];
        zombie.mesh.position.copy(spawnPoint);
        zombie.mesh.position.x += (Math.random() - 0.5) * 0.8;
        zombie.mesh.position.z += (Math.random() - 0.5) * 0.8;
        zombies.push(zombie);
        scene.add(zombie.mesh);
    }

    showStatusMessage('Wave ' + waveNumber, 1.1);
    updateHud();
}

function createZombieState(waveNumber) {
    const zombie = {
        mesh: createZombie(),
        health: 100,
        alive: true,
        speed: 2.0 + Math.min(waveNumber * 0.12, 0.75),
        attackCooldown: 0.4,
        attackRange: 1.55,
        attackDelay: Math.max(0.75, 1.05 - waveNumber * 0.03),
        separationRadius: 1.25,
        separationStrength: 2.8,
        stunTimer: 0,
        walkTime: Math.random() * Math.PI * 2,
    };

    zombie.mesh.traverse((part) => {
        part.userData.zombie = zombie;
    });

    return zombie;
}

function killZombie(zombie) {
    zombie.alive = false;
    zombie.mesh.rotation.z = Math.PI / 2;
    zombie.mesh.position.y = 0.45;

    if (getLivingZombies().length === 0) {
        const previousHealth = player.health;
        player.health = Math.min(100, player.health + wave.healAmount);
        const healedAmount = player.health - previousHealth;
        wave.nextTimer = wave.spawnDelay;
        updateHud();
        showStatusMessage('Wave clear +' + healedAmount + ' health', wave.spawnDelay);
    }
}

function resetGame() {
    player.health = 100;
    player.alive = true;
    player.shakeTimer = 0;

    wave.number = 1;
    wave.nextTimer = 0;

    controls.object.position.set(0, 1.65, 7);
    slap.active = false;
    slap.meterActive = false;
    slap.cooldown = 0;
    slap.recoilTimer = 0;
    slap.power = 1;
    statusMessageTimer = 0;
    damageFlashTimer = 0;
    damageFlash.classList.remove('active');
    slapMeter.classList.remove('active');
    updateSlapMeterHud();
    renderer.domElement.style.transform = '';
    spawnWave(wave.number);
    updateHud();
    messageText.textContent = 'Click to start';
}

function updateHud() {
    playerHealthText.textContent = 'Player ' + player.health;
    zombieHealthText.textContent = 'Wave ' + wave.number + ' Zombies ' + getLivingZombies().length;
}

function getLivingZombies() {
    return zombies.filter((zombie) => zombie.alive);
}

function clearZombies() {
    for (const zombie of zombies) {
        scene.remove(zombie.mesh);
    }

    zombies.length = 0;
}

function findZombieFromObject(object) {
    let current = object;

    while (current) {
        if (current.userData.zombie) {
            return current.userData.zombie;
        }

        current = current.parent;
    }

    return null;
}

function triggerDamageFeedback() {
    player.shakeTimer = player.shakeDuration;
    damageFlashTimer = 0.16;
    damageFlash.classList.add('active');
    showStatusMessage('Ouch!', 0.45);
}

function updateDamageFeedback(delta) {
    player.shakeTimer = Math.max(0, player.shakeTimer - delta);
    damageFlashTimer = Math.max(0, damageFlashTimer - delta);

    if (damageFlashTimer === 0) {
        damageFlash.classList.remove('active');
    }
}

function applyCameraShake() {
    if (player.shakeTimer === 0) {
        renderer.domElement.style.transform = '';
        return;
    }

    const shakeProgress = player.shakeTimer / player.shakeDuration;
    const shakeAmount = player.shakeStrength * 120 * shakeProgress;
    const x = (Math.random() - 0.5) * shakeAmount;
    const y = (Math.random() - 0.5) * shakeAmount;
    renderer.domElement.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(1.01)';
}

function animateZombieWalk(zombie, delta, isMoving) {
    const parts = zombie.mesh.userData.parts;

    if (!parts) {
        return;
    }

    if (isMoving) {
        zombie.walkTime += delta * 7.5;
    }

    const stride = isMoving ? Math.sin(zombie.walkTime) : 0;
    const oppositeStride = -stride;
    const armSwing = 0.55;
    const legSwing = 0.45;
    const footLift = isMoving ? Math.max(0, Math.sin(zombie.walkTime)) * 0.08 : 0;
    const oppositeFootLift = isMoving ? Math.max(0, Math.sin(zombie.walkTime + Math.PI)) * 0.08 : 0;

    parts.leftArm.rotation.x = -0.65 + oppositeStride * armSwing;
    parts.rightArm.rotation.x = -0.65 + stride * armSwing;
    parts.leftLeg.rotation.x = stride * legSwing;
    parts.rightLeg.rotation.x = oppositeStride * legSwing;
    parts.leftFoot.position.y = 0.08 + footLift;
    parts.rightFoot.position.y = 0.08 + oppositeFootLift;
    parts.leftFoot.rotation.x = stride * 0.18;
    parts.rightFoot.rotation.x = oppositeStride * 0.18;
}

function applyZombieSeparation(zombie, delta) {
    separationDirection.set(0, 0, 0);

    for (const otherZombie of getLivingZombies()) {
        if (otherZombie === zombie) {
            continue;
        }

        zombieOffset.subVectors(zombie.mesh.position, otherZombie.mesh.position);
        zombieOffset.y = 0;
        const distance = zombieOffset.length();

        if (distance === 0 || distance >= zombie.separationRadius) {
            continue;
        }

        const pushWeight = 1 - distance / zombie.separationRadius;
        separationDirection.addScaledVector(zombieOffset.normalize(), pushWeight);
    }

    if (separationDirection.lengthSq() === 0) {
        return;
    }

    separationDirection.normalize();
    zombie.mesh.position.addScaledVector(separationDirection, zombie.separationStrength * delta);
    clampZombieToRoom(zombie);
}

function getSlapPowerMessage() {
    if (slap.power >= 0.9) {
        return 'Perfect slap!';
    }

    if (slap.power >= 0.65) {
        return 'Good slap!';
    }

    return 'Weak slap';
}

function applyZombieKnockback(zombie, power = 1) {
    knockbackDirection.subVectors(zombie.mesh.position, controls.object.position);
    knockbackDirection.y = 0;

    if (knockbackDirection.lengthSq() === 0) {
        camera.getWorldDirection(knockbackDirection);
        knockbackDirection.y = 0;
    }

    knockbackDirection.normalize();
    zombie.mesh.position.addScaledVector(knockbackDirection, 0.45 + power * 1.35);

    clampZombieToRoom(zombie);
}

function clampZombieToRoom(zombie) {
    const limit = roomSize / 2 - 1;
    zombie.mesh.position.x = THREE.MathUtils.clamp(zombie.mesh.position.x, -limit, limit);
    zombie.mesh.position.z = THREE.MathUtils.clamp(zombie.mesh.position.z, -limit, limit);
}

function showStatusMessage(text, duration) {
    if (!player.alive) {
        return;
    }

    messageText.textContent = text;
    statusMessageTimer = duration;
}

function updateStatusMessage(delta) {
    if (statusMessageTimer === 0 || !player.alive || !controls.isLocked) {
        return;
    }

    statusMessageTimer = Math.max(0, statusMessageTimer - delta);

    if (statusMessageTimer === 0) {
        messageText.textContent = slap.meterActive ? 'Click again to slap' : 'WASD to move, click to slap';
    }
}

function addLights() {
    const ambientLight = new THREE.HemisphereLight(0xf8f3d0, 0x243321, 1.25);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(5, 8, 4);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
}

function addRoom() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, roomSize),
        new THREE.MeshStandardMaterial({ color: 0x5a5f46, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x44483a, roughness: 0.9 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomSize, 4, 0.35), wallMaterial);
    backWall.position.set(0, 2, -roomSize / 2);
    scene.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(roomSize, 4, 0.35), wallMaterial);
    frontWall.position.set(0, 2, roomSize / 2);
    scene.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4, roomSize), wallMaterial);
    leftWall.position.set(-roomSize / 2, 2, 0);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4, roomSize), wallMaterial);
    rightWall.position.set(roomSize / 2, 2, 0);
    scene.add(rightWall);
}

function createHand() {
    const group = new THREE.Group();
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xc68652, roughness: 0.7 });
    const fingerMaterial = new THREE.MeshStandardMaterial({ color: 0xd49a66, roughness: 0.7 });

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.42), skinMaterial);
    palm.castShadow = true;
    group.add(palm);

    for (let i = 0; i < 4; i += 1) {
        const finger = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 0.22), fingerMaterial);
        finger.position.set(-0.11 + i * 0.073, 0.1, -0.08);
        finger.castShadow = true;
        group.add(finger);
    }

    group.position.set(0.48, -0.42, -0.78);
    group.rotation.set(-0.2, 0.45, -0.22);
    return group;
}

function createZombie() {
    const group = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x6f8f4e, roughness: 0.9 });
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x86a85f, roughness: 0.85 });
    const limbMaterial = new THREE.MeshStandardMaterial({ color: 0x78975a, roughness: 0.85 });
    const footMaterial = new THREE.MeshStandardMaterial({ color: 0x465635, roughness: 0.9 });

    const body = createZombiePart(new THREE.BoxGeometry(0.8, 1.1, 0.45), bodyMaterial);
    body.position.y = 1.05;
    group.add(body);

    const head = createZombiePart(new THREE.BoxGeometry(0.48, 0.48, 0.48), headMaterial);
    head.position.y = 1.82;
    group.add(head);

    const leftArm = createZombiePart(new THREE.BoxGeometry(0.2, 0.9, 0.2), limbMaterial);
    leftArm.position.set(-0.58, 1.12, -0.16);
    leftArm.rotation.x = -0.65;
    group.add(leftArm);

    const rightArm = createZombiePart(new THREE.BoxGeometry(0.2, 0.9, 0.2), limbMaterial);
    rightArm.position.set(0.58, 1.12, -0.16);
    rightArm.rotation.x = -0.65;
    group.add(rightArm);

    const leftLeg = createZombiePart(new THREE.BoxGeometry(0.22, 0.72, 0.22), limbMaterial);
    leftLeg.position.set(-0.22, 0.42, 0);
    group.add(leftLeg);

    const rightLeg = createZombiePart(new THREE.BoxGeometry(0.22, 0.72, 0.22), limbMaterial);
    rightLeg.position.set(0.22, 0.42, 0);
    group.add(rightLeg);

    const leftFoot = createZombiePart(new THREE.BoxGeometry(0.3, 0.16, 0.48), footMaterial);
    leftFoot.position.set(-0.22, 0.08, -0.11);
    group.add(leftFoot);

    const rightFoot = createZombiePart(new THREE.BoxGeometry(0.3, 0.16, 0.48), footMaterial);
    rightFoot.position.set(0.22, 0.08, -0.11);
    group.add(rightFoot);

    group.userData.parts = {
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        leftFoot,
        rightFoot,
    };

    return group;
}

function createZombiePart(geometry, material) {
    const part = new THREE.Mesh(geometry, material.clone());
    part.castShadow = true;
    part.userData.baseColor = part.material.color.clone();
    return part;
}

function colorZombie(zombie, color) {
    zombie.mesh.traverse((part) => {
        if (part.material) {
            part.material.color.copy(color === undefined ? part.userData.baseColor : new THREE.Color(color));
        }
    });
}

function flashZombie(zombie, color, duration) {
    colorZombie(zombie, color);

    window.setTimeout(() => {
        if (zombie.alive) {
            colorZombie(zombie);
        }
    }, duration);
}
