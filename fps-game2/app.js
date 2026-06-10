// app.js - Cyberpunk FPS Game Controller & Main Loop

// Game State variables
const state = {
    score: 0,
    shots: 0,
    hits: 0,
    highScore: 0,
    level: 1,
    levelHits: 0,
    requiredHitsForNextLevel: 5,
    
    // Weapon stats
    currentWeaponKey: 'pistol',
    currentWeapon: null,
    isReloading: false,
    isScoped: false,
    lastFireTime: 0,
    triggerHeld: false,

    // Controls
    moveSensitivity: 0.002, // Adjust by UI slider
    keys: { w: false, a: false, s: false, d: false, space: false },
    playerVel: new THREE.Vector3(),
    playerHeight: 1.6, // Eye height
    playerPos: new THREE.Vector3(0, 0, 4), // Spawn position (4m back)
    playerOnGround: true,
    isPointerLocked: false,
    
    // Pedestal state
    nearPedestal: null,
    pedestals: []
};

// Three.js instances
let scene, camera, renderer, clock;
let playerGroup, pitchObject, yawObject;
let targetDummy;
let sparkSystem, damageTextSystem;
let targetSpotlight;

// Weapon hand mesh group attached to camera
let weaponHolder;
let currentWeaponMesh = null;
let recoilOffset = new THREE.Vector3();
let recoilRotation = new THREE.Vector3();

// Array of active bullet tracers
const tracers = [];
// Array of active plasma projectiles
const plasmaProjectiles = [];

// Room dimensions
const ROOM_SIZE = 16; // Wall boundary limits (-8 to +8)

// Dynamic texture generators for Pedestal Labels
function createTextTexture(text, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 28px "Outfit", sans-serif';
    ctx.fillStyle = colorHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 8;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Initializer
function initGame() {
    // 1. Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050608, 0.025);

    // 2. Camera & Player rig setup
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    
    pitchObject = new THREE.Group();
    pitchObject.add(camera);
    
    yawObject = new THREE.Group();
    yawObject.position.set(state.playerPos.x, state.playerHeight, state.playerPos.z);
    yawObject.add(pitchObject);
    scene.add(yawObject);

    // Weapon holder attached to pitchObject (follows camera pitch and yaw)
    weaponHolder = new THREE.Group();
    // Default position: bottom-right quadrant of viewport
    weaponHolder.position.set(0.25, -0.22, -0.45);
    pitchObject.add(weaponHolder);

    // 3. Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // 4. Lights - Brightened and stylized with cyberpunk hues
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55); // high baseline visibility
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xddeeff, 1.5); // strong white-blue directional light
    dirLight.position.set(5, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Pedestal area pointlight (Cyan glow)
    const pedestalLight = new THREE.PointLight(0x00f3ff, 2.5, 15);
    pedestalLight.position.set(0, 4.0, -2.5);
    scene.add(pedestalLight);

    // Player spawn area pointlight (Magenta glow)
    const spawnAreaLight = new THREE.PointLight(0xff0055, 1.8, 12);
    spawnAreaLight.position.set(0, 4.0, 3.0);
    scene.add(spawnAreaLight);

    // Spotlight tracking the target dummy
    targetSpotlight = new THREE.SpotLight(0xffffff, 4.0, 22, Math.PI / 8, 0.5, 1);
    targetSpotlight.position.set(0, 9, -12);
    targetSpotlight.castShadow = true;
    scene.add(targetSpotlight);

    // 5. Environment generation (Cyber Training Arena)
    createArena();

    // 6. Subsystems setup
    targetDummy = new TargetDummy(THREE, scene);
    targetSpotlight.target = targetDummy.group;

    sparkSystem = new TargetSparkSystem(THREE, scene);
    damageTextSystem = new DamageTextSystem(THREE, scene, camera);

    // Initialize weapon configs
    state.currentWeapon = JSON.parse(JSON.stringify(WEAPONS[state.currentWeaponKey]));
    equipWeapon(state.currentWeaponKey);

    // Local Storage check for Highscore
    if (localStorage.getItem('neon_range_highscore')) {
        state.highScore = parseInt(localStorage.getItem('neon_range_highscore'));
        document.getElementById('highscore-val').innerText = padZero(state.highScore);
    }

    // Set UI Volume slider & Sensitivity to manager
    const soundVol = parseFloat(document.getElementById('vol-range').value);
    window.gameSounds.setVolume(soundVol);
    const sensitivity = parseFloat(document.getElementById('sens-range').value);
    state.moveSensitivity = 0.001 * sensitivity;

    // 7. Event listeners
    setupEventListeners();

    // 8. Start Loop
    animate();
}

// Procedural Arena Room Builder
function createArena() {
    // Floor Grid
    const floorSize = 24;
    const gridHelper = new THREE.GridHelper(floorSize, 24, 0x00f3ff, 0x111e2e);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Concrete floor mesh for shadows
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0a0c10,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling grid
    const ceilingGrid = new THREE.GridHelper(floorSize, 24, 0xff0055, 0x220c15);
    ceilingGrid.position.y = 6;
    scene.add(ceilingGrid);

    // Left, Right and Back Walls (futuristic frames)
    const wallGeo = new THREE.PlaneGeometry(floorSize, 6);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 0.6, metalness: 0.5 });
    
    // Back Wall
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 3, -floorSize/2);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Back Wall Neon Accent Line
    const neonLineGeo = new THREE.BoxGeometry(floorSize, 0.05, 0.05);
    const neonLineMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const backNeon = new THREE.Mesh(neonLineGeo, neonLineMat);
    backNeon.position.set(0, 1.8, -floorSize/2 + 0.03);
    scene.add(backNeon);

    // Left Wall
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-floorSize/2, 3, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(floorSize/2, 3, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Generate Weapon Pedestals in a row
    const pedestalKeys = ['pistol', 'rifle', 'shotgun', 'sniper', 'plasma'];
    const spacing = 2.4;
    const startX = -((pedestalKeys.length - 1) * spacing) / 2;

    pedestalKeys.forEach((key, index) => {
        const xPos = startX + index * spacing;
        const zPos = -2.5; // Walkable distance, just in front of player spawn

        // Create 3D Pedestal
        const pedGroup = new THREE.Group();
        pedGroup.position.set(xPos, 0, zPos);
        pedGroup.userData = { weaponKey: key };

        // Cylindrical base
        const baseMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.35, 0.9, 12),
            new THREE.MeshStandardMaterial({ color: 0x1f242e, roughness: 0.4, metalness: 0.8 })
        );
        baseMesh.position.y = 0.45;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        pedGroup.add(baseMesh);

        // Glowing base ring trim
        const glowRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.31, 0.015, 6, 16),
            new THREE.MeshBasicMaterial({ color: WEAPONS[key].color })
        );
        glowRing.rotation.x = Math.PI / 2;
        glowRing.position.y = 0.9;
        pedGroup.add(glowRing);

        // Holographic label sprite above the pedestal
        const labelTexture = createTextTexture(WEAPONS[key].name, '#' + WEAPONS[key].color.toString(16).padStart(6, '0'));
        const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
        const labelSprite = new THREE.Sprite(labelMaterial);
        labelSprite.position.set(0, 1.45, 0);
        labelSprite.scale.set(1.2, 0.3, 1);
        pedGroup.add(labelSprite);

        // Generate procedural weapon mesh to float on pedestal
        const floatWeaponMesh = WEAPONS[key].createModel(THREE);
        floatWeaponMesh.position.set(0, 1.1, 0);
        floatWeaponMesh.rotation.y = -Math.PI / 2;
        pedGroup.add(floatWeaponMesh);

        // Save reference to weapon meshes for rotation animation
        pedGroup.userData.weaponModel = floatWeaponMesh;

        scene.add(pedGroup);
        state.pedestals.push(pedGroup);
    });
}

// Equip a selected weapon, building camera mesh layout
function equipWeapon(key) {
    state.currentWeaponKey = key;
    state.currentWeapon = JSON.parse(JSON.stringify(WEAPONS[key])); // clone config
    
    // Play reload click to indicate weapon swapped
    window.gameSounds.playReload();

    // Wipe previous camera weapon mesh
    if (currentWeaponMesh) {
        weaponHolder.remove(currentWeaponMesh);
        disposeHierarchy(currentWeaponMesh);
    }

    // Build the new 3D viewmodel
    currentWeaponMesh = WEAPONS[key].createModel(THREE);
    weaponHolder.add(currentWeaponMesh);

    // Apply custom view offsets depending on type
    if (key === 'pistol') {
        currentWeaponMesh.position.set(0, 0, 0);
    } else if (key === 'rifle') {
        currentWeaponMesh.position.set(-0.02, 0.01, -0.05);
    } else if (key === 'shotgun') {
        currentWeaponMesh.position.set(-0.02, 0.02, -0.05);
    } else if (key === 'sniper') {
        currentWeaponMesh.position.set(-0.03, 0.02, -0.1);
    } else if (key === 'plasma') {
        currentWeaponMesh.position.set(-0.04, -0.02, -0.15);
    }

    // Update HTML HUD layout
    document.getElementById('weapon-name-lbl').innerText = state.currentWeapon.name;
    document.getElementById('weapon-name-lbl').style.color = '#' + state.currentWeapon.color.toString(16).padStart(6, '0');
    document.getElementById('hud-weapon').style.borderLeftColor = '#' + state.currentWeapon.color.toString(16).padStart(6, '0');
    
    updateAmmoHUD();
}

function updateAmmoHUD() {
    document.getElementById('ammo-clip-lbl').innerText = state.currentWeapon.ammo;
    document.getElementById('ammo-max-lbl').innerText = state.currentWeapon.clipSize;

    // Generate ammo ticks
    const bar = document.getElementById('ammo-bar-ticks');
    bar.innerHTML = '';
    
    for (let i = 0; i < state.currentWeapon.clipSize; i++) {
        const tick = document.createElement('div');
        tick.className = 'ammo-tick';
        if (i < state.currentWeapon.ammo) {
            tick.className += ' active';
            tick.style.backgroundColor = '#' + state.currentWeapon.color.toString(16).padStart(6, '0');
        }
        bar.appendChild(tick);
    }
}

// Disposes of geometries and materials to avoid webgl memory leaks
function disposeHierarchy(obj) {
    obj.traverse((child) => {
        if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach((m) => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
}

// Event Listeners for controls and UI sliders
function setupEventListeners() {
    const startBtn = document.getElementById('start-btn');
    const sensRange = document.getElementById('sens-range');
    const volRange = document.getElementById('vol-range');

    // Pointer Lock events
    startBtn.addEventListener('click', () => {
        document.body.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === document.body) {
            state.isPointerLocked = true;
            document.getElementById('overlay').classList.add('hidden');
            window.gameSounds.resume();
        } else {
            state.isPointerLocked = false;
            document.getElementById('overlay').classList.remove('hidden');
            state.keys.w = state.keys.a = state.keys.s = state.keys.d = state.keys.space = false;
            state.triggerHeld = false;
            if (state.isScoped) toggleScope(false);
        }
    });

    // Sensitivity slider
    sensRange.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.moveSensitivity = 0.001 * val;
    });

    // Volume slider
    volRange.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        window.gameSounds.setVolume(val);
    });

    // Mouse movement
    document.addEventListener('mousemove', (e) => {
        if (!state.isPointerLocked) return;

        const movementX = e.movementX || 0;
        const movementY = e.movementY || 0;

        // Yaw (Horizontal look rotates yawObject)
        yawObject.rotation.y -= movementX * state.moveSensitivity;
        
        // Pitch (Vertical look rotates camera pitchObject)
        pitchObject.rotation.x -= movementY * state.moveSensitivity;
        
        // Clamp pitch to avoid turning completely upside down (-85 to +85 degrees)
        pitchObject.rotation.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitchObject.rotation.x));
    });

    // Mouse Clicks
    document.addEventListener('mousedown', (e) => {
        if (!state.isPointerLocked) return;

        if (e.button === 0) {
            // Left click - Trigger shooting
            state.triggerHeld = true;
            fireWeapon();
        } else if (e.button === 2) {
            // Right click - Toggle scoping for Sniper
            if (state.currentWeaponKey === 'sniper') {
                toggleScope(!state.isScoped);
            }
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            state.triggerHeld = false;
        }
    });

    // Stop browser context menu on right click
    document.addEventListener('contextmenu', (e) => {
        if (state.isPointerLocked) {
            e.preventDefault();
        }
    });

    // Keyboard inputs - supports multiple layouts and fallback matching
    document.addEventListener('keydown', (e) => {
        if (!state.isPointerLocked) return;

        const code = e.code;
        const key = e.key.toLowerCase();

        if (code === 'KeyW' || key === 'w' || key === 'z') state.keys.w = true; // AZERTY support
        if (code === 'KeyA' || key === 'a' || key === 'q') state.keys.a = true; // AZERTY support
        if (code === 'KeyS' || key === 's') state.keys.s = true;
        if (code === 'KeyD' || key === 'd') state.keys.d = true;
        if (code === 'Space' || e.key === ' ') state.keys.space = true;

        if (code === 'KeyR' || key === 'r') {
            reloadCurrentWeapon();
        }
        if (code === 'KeyE' || key === 'e') {
            interactWithPedestal();
        }
    });

    document.addEventListener('keyup', (e) => {
        const code = e.code;
        const key = e.key.toLowerCase();

        if (code === 'KeyW' || key === 'w' || key === 'z') state.keys.w = false;
        if (code === 'KeyA' || key === 'a' || key === 'q') state.keys.a = false;
        if (code === 'KeyS' || key === 's') state.keys.s = false;
        if (code === 'KeyD' || key === 'd') state.keys.d = false;
        if (code === 'Space' || e.key === ' ') state.keys.space = false;
    });

    // Responsive screen resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Scope view handler
function toggleScope(enabled) {
    state.isScoped = enabled;
    const scopeUI = document.getElementById('sniper-scope');
    const crosshair = document.getElementById('crosshair');

    if (enabled) {
        scopeUI.classList.add('active');
        crosshair.classList.add('hidden');
        camera.fov = 70 / state.currentWeapon.zoom;
        camera.updateProjectionMatrix();
        // Hide gun mesh while scoped
        if (currentWeaponMesh) currentWeaponMesh.visible = false;
    } else {
        scopeUI.classList.remove('active');
        crosshair.classList.remove('hidden');
        camera.fov = 70;
        camera.updateProjectionMatrix();
        if (currentWeaponMesh) currentWeaponMesh.visible = true;
    }
}

// Pedestal Interaction Handler
function interactWithPedestal() {
    console.log("Interact triggered. Near pedestal:", state.nearPedestal);
    if (state.nearPedestal) {
        const key = state.nearPedestal.userData.weaponKey;
        console.log("Pedestal weapon key:", key, "Current weapon key:", state.currentWeaponKey);
        if (key !== state.currentWeaponKey) {
            // Cancel scoping if swapped
            if (state.isScoped) toggleScope(false);
            equipWeapon(key);
            console.log("Successfully equipped:", key);
        }
    }
}

// Reload action
function reloadCurrentWeapon() {
    const w = state.currentWeapon;
    if (state.isReloading || w.ammo === w.clipSize) return;

    state.isReloading = true;
    if (state.isScoped) toggleScope(false);

    // Trigger sound
    window.gameSounds.playReload();

    // Trigger reload HUD overlay spinner
    const spinner = document.getElementById('reload-indicator');
    spinner.classList.add('active');
    spinner.style.borderTopColor = '#' + w.color.toString(16).padStart(6, '0');

    // Visual reload push animation (push gun down)
    const originalY = currentWeaponMesh.position.y;
    new Promise((resolve) => {
        let elapsed = 0;
        const dur = w.reloadTime;
        const tick = () => {
            if (!state.isReloading) return; // in case swapped mid-reload
            elapsed += 16; // rough frame step
            const progress = elapsed / dur;
            
            // Push gun down then return
            if (progress < 0.5) {
                currentWeaponMesh.position.y = originalY - 0.15 * (progress * 2);
            } else {
                currentWeaponMesh.position.y = originalY - 0.15 * (2 - progress * 2);
            }

            if (elapsed < dur) {
                setTimeout(tick, 16);
            } else {
                resolve();
            }
        };
        tick();
    }).then(() => {
        state.isReloading = false;
        spinner.classList.remove('active');
        w.ammo = w.clipSize;
        updateAmmoHUD();
        currentWeaponMesh.position.y = originalY;
    });
}

// Main firing system (instant hitscan rays or physical plasma projectile spawn)
function fireWeapon() {
    const now = performance.now();
    const w = state.currentWeapon;

    if (state.isReloading) return;
    if (now - state.lastFireTime < w.fireRate) return;

    if (w.ammo <= 0) {
        window.gameSounds.playClick();
        state.lastFireTime = now;
        // Auto reload
        reloadCurrentWeapon();
        return;
    }

    state.lastFireTime = now;
    w.ammo--;
    updateAmmoHUD();

    // 1. Play gun shot synth
    window.gameSounds.playShoot(w.type);
    state.shots++;

    // 2. Play screen kick / muzzle flash vignetting
    const vig = document.getElementById('damage-vignette');
    vig.classList.add('flash');
    setTimeout(() => vig.classList.remove('flash'), 50);

    // Crosshair pop animation
    const crosshair = document.getElementById('crosshair');
    crosshair.classList.add('recoil');
    setTimeout(() => crosshair.classList.remove('recoil'), 100);

    // 3. Recoil kick application (physical gun rotation only, no vertical look drift)
    recoilOffset.z += 0.08; // slide backward
    recoilRotation.x += w.recoilY; // kick upward

    // 4. Muzzle flash PointLight
    const flashColor = w.color;
    const flashLight = new THREE.PointLight(flashColor, 4.0, 4);
    // Position light slightly in front of equipped gun
    flashLight.position.set(0.25, -0.15, -0.7);
    pitchObject.add(flashLight);
    setTimeout(() => pitchObject.remove(flashLight), 40);

    // 5. Fire logic calculation
    if (w.type === 'plasma') {
        spawnPlasmaBall();
    } else {
        // Hitscan Raycast
        const center = new THREE.Vector2(0, 0); // screen center
        const raycaster = new THREE.Raycaster();

        // Calculate spread adjustments
        const spreadAmount = state.isScoped ? w.spread * 0.15 : w.spread;

        if (w.type === 'shotgun') {
            // Multi-pellet spread
            for (let i = 0; i < w.pellets; i++) {
                const spreadAngle = Math.random() * Math.PI * 2;
                const spreadRadius = Math.random() * spreadAmount;
                const spreadX = Math.cos(spreadAngle) * spreadRadius;
                const spreadY = Math.sin(spreadAngle) * spreadRadius;

                raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);
                processHitscan(raycaster, w.damage);
            }
        } else {
            // Single bullet
            const spreadAngle = Math.random() * Math.PI * 2;
            const spreadRadius = Math.random() * spreadAmount;
            const spreadX = Math.cos(spreadAngle) * spreadRadius;
            const spreadY = Math.sin(spreadAngle) * spreadRadius;

            raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);
            processHitscan(raycaster, w.damage);
        }
    }
}

// Ray intersections for hitscan shots
function processHitscan(raycaster, damage) {
    // Determine tracer endpoint
    let targetPoint = new THREE.Vector3();
    raycaster.ray.at(15, targetPoint); // default endpoint 15m out

    // Check hit intersections with targets
    const hitData = targetDummy.checkHit(raycaster);
    
    if (hitData) {
        targetPoint.copy(hitData.point);
        state.hits++;

        // Calculate final damage (damage * multiplier)
        const finalDamage = Math.round(damage * hitData.damageMultiplier);
        const isCrit = hitData.damageMultiplier > 1.5;

        // Apply health deduction to dummy
        const isDead = targetDummy.takeDamage(finalDamage);

        // Play metallic ding
        window.gameSounds.playHit();

        // Spawn hit sparks
        sparkSystem.spawn(hitData.point, targetDummy.glowMat.color.getHex(), isCrit ? 20 : 8);

        // Spawn Floating Damage Text
        damageTextSystem.spawn(hitData.point, `${finalDamage}`, isCrit);

        if (isDead) {
            handleTargetKill();
        }
    } else {
        // Did we hit walls, pedestals, or floor?
        const wallIntersects = raycaster.intersectObjects(scene.children, true);
        if (wallIntersects.length > 0) {
            // filter out target dummy meshes and camera rigs
            const hit = wallIntersects.find(i => 
                i.object.name !== "target_dummy" && 
                !i.object.ancestors?.includes(yawObject)
            );
            if (hit) {
                targetPoint.copy(hit.point);
                // Spawn small gravel impact sparks
                sparkSystem.spawn(hit.point, 0x4a5a70, 3);
            }
        }
    }

    // Spawn visual glowing bullet tracer
    createBulletTracer(targetPoint);
    
    // Refresh accuracy score
    updateScoreboardHUD();
}

function handleTargetKill() {
    // Score reward based on level
    const pointsGained = state.level * 100;
    state.score += pointsGained;

    state.levelHits++;

    // Trigger screen text chime or floating score label on the center
    const hitCenterPos = targetDummy.group.position.clone();
    damageTextSystem.spawn(hitCenterPos, `+${pointsGained} SCORE`, true);

    if (state.levelHits >= state.requiredHitsForNextLevel) {
        // Level UP session difficulty
        state.level++;
        state.levelHits = 0;
        
        // Play level up ascending chime
        window.gameSounds.playLevelUp();

        // Reset dummy behavior
        targetDummy.setLevel(state.level);
        
        // floating dynamic LEVEL UP banner
        setTimeout(() => {
            damageTextSystem.spawn(
                new THREE.Vector3(0, 3.2, -12),
                `DIFFICULTY LEVEL ${state.level}`,
                true
            );
        }, 300);
    } else {
        // Respawn dummy at same level
        setTimeout(() => {
            targetDummy.setLevel(state.level);
        }, 800); // 800ms delay to allow death particles to settle
    }

    // Save high score if beaten
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('neon_range_highscore', state.highScore);
    }

    updateScoreboardHUD();
}

function updateScoreboardHUD() {
    document.getElementById('score-val').innerText = padZero(state.score);
    document.getElementById('highscore-val').innerText = padZero(state.highScore);
    
    const accuracy = state.shots > 0 ? ((state.hits / state.shots) * 100) : 0;
    document.getElementById('accuracy-val').innerText = `${accuracy.toFixed(1)}%`;

    // Progression bar ratio
    document.getElementById('level-lbl').innerText = `Difficulty Level ${state.level}`;
    document.getElementById('progress-ratio').innerText = `${state.levelHits} / ${state.requiredHitsForNextLevel} Hits`;
    
    const fillPercent = (state.levelHits / state.requiredHitsForNextLevel) * 100;
    document.getElementById('progress-bar-fill').style.width = `${fillPercent}%`;
}

// String pad helper for classic retro arcade scores
function padZero(num) {
    return String(num).padStart(4, '0');
}

// 3D Bullet tracer renderer (glowing laser cylinders that fade out)
function createBulletTracer(endPoint) {
    const tracerColor = state.currentWeapon.color;
    
    // Find barrel position of viewmodel
    const startPoint = new THREE.Vector3();
    if (currentWeaponMesh && !state.isScoped) {
        // Fetch barrel mesh tip in camera coordinates, transform to world coordinates
        // For simplicity: offset barrel coordinates from camera view origin
        const wOffset = new THREE.Vector3(0.22, -0.15, -0.55);
        wOffset.applyMatrix4(camera.matrixWorld);
        startPoint.copy(wOffset);
    } else {
        // center scoped view
        startPoint.copy(camera.position).applyMatrix4(camera.matrixWorld);
    }

    // Draw lines
    const material = new THREE.MeshBasicMaterial({
        color: tracerColor,
        transparent: true,
        opacity: 0.8
    });
    
    const pathVec = new THREE.Vector3().subVectors(endPoint, startPoint);
    const length = pathVec.length();
    
    // Draw thin capsule/cylinder along vector
    const geom = new THREE.CylinderGeometry(0.005, 0.005, length, 4);
    geom.translate(0, length / 2, 0);
    geom.rotateX(Math.PI / 2);

    const mesh = new THREE.Mesh(geom, material);
    mesh.position.copy(startPoint);
    mesh.lookAt(endPoint);

    scene.add(mesh);

    tracers.push({
        mesh: mesh,
        life: 0.12, // seconds
        maxLife: 0.12
    });
}

// Physical Plasma Launcher Projectile Spawner
function spawnPlasmaBall() {
    const w = state.currentWeapon;
    const startPoint = new THREE.Vector3(0.2, -0.18, -0.6);
    startPoint.applyMatrix4(camera.matrixWorld);

    // Get camera target vector
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    // Add slight random spread deviation
    const spreadAmount = w.spread;
    direction.x += (Math.random() - 0.5) * spreadAmount;
    direction.y += (Math.random() - 0.5) * spreadAmount;
    direction.z += (Math.random() - 0.5) * spreadAmount;
    direction.normalize();

    // Spawning 3D ball (Neon yellow glowing sphere)
    const geom = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xeaff00 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(startPoint);
    
    // Add pointlight for real-time glowing trace shadow casts
    const pLight = new THREE.PointLight(0xeaff00, 3.0, 5);
    mesh.add(pLight);

    scene.add(mesh);

    plasmaProjectiles.push({
        mesh: mesh,
        velocity: direction.multiplyScalar(w.projectileSpeed),
        damage: w.damage,
        life: 3.5 // explode after 3.5s if no contact
    });
}

// Plasma ball tracking and collision checks
function updatePlasmaProjectiles(delta) {
    for (let i = plasmaProjectiles.length - 1; i >= 0; i--) {
        const p = plasmaProjectiles[i];
        p.life -= delta;

        // Apply translation
        p.mesh.position.addScaledVector(p.velocity, delta);

        // Collision: Check distance to target dummy parts
        let exploded = false;
        
        if (!targetDummy.isDead && targetDummy.group.visible) {
            // Check bounding sphere of entire dummy
            const dummyWorldPos = new THREE.Vector3();
            targetDummy.group.getWorldPosition(dummyWorldPos);
            const dist = p.mesh.position.distanceTo(dummyWorldPos);

            if (dist < 1.3) {
                // Impact! Explode and damage
                explodePlasma(p.mesh.position, p.damage);
                exploded = true;
            }
        }

        // Collision: Check floor or walls boundary limits
        if (!exploded) {
            if (p.mesh.position.y <= 0.1) {
                // floor hit
                p.mesh.position.y = 0;
                explodePlasma(p.mesh.position, p.damage);
                exploded = true;
            } else if (Math.abs(p.mesh.position.x) >= ROOM_SIZE / 2 || p.mesh.position.z <= -ROOM_SIZE / 2) {
                // walls boundaries hit
                explodePlasma(p.mesh.position, p.damage);
                exploded = true;
            }
        }

        // Expiry
        if (exploded || p.life <= 0) {
            scene.remove(p.mesh);
            disposeHierarchy(p.mesh);
            plasmaProjectiles.splice(i, 1);
        }
    }
}

// Splash damage calculations for launcher
function explodePlasma(position, maxDamage) {
    // 1. Splash damage check
    if (!targetDummy.isDead && targetDummy.group.visible) {
        const dummyWorldPos = new THREE.Vector3();
        targetDummy.group.getWorldPosition(dummyWorldPos);
        const dist = position.distanceTo(dummyWorldPos);

        const splashRadius = 3.5;
        if (dist < splashRadius) {
            state.hits++;

            // Damage scales down with distance from epicenter
            const falloff = 1.0 - (dist / splashRadius);
            const splashDamage = Math.round(maxDamage * falloff);

            const isDead = targetDummy.takeDamage(splashDamage);

            // Audio ping
            window.gameSounds.playHit();

            // Spawn floating label
            damageTextSystem.spawn(dummyWorldPos, `${splashDamage} (SPLASH)`);

            if (isDead) {
                handleTargetKill();
            }
        }
    }

    // 2. Play explosion boom synth sound (Synthesized by shotgun node or custom loud noise)
    window.gameSounds.playShoot('shotgun'); 

    // 3. Spawn giant particles cloud (yellow/green sparks)
    sparkSystem.spawn(position, 0xeaff00, 24);

    // 4. Temporary big flash point light in scene
    const expLight = new THREE.PointLight(0xeaff00, 6.0, 8);
    expLight.position.copy(position);
    scene.add(expLight);
    setTimeout(() => scene.remove(expLight), 120);

    updateScoreboardHUD();
}

// Update loop (runs every frame)
function animate() {
    requestAnimationFrame(animate);

    // Skip updates if menu open
    if (!state.isPointerLocked) {
        // Draw static frame
        renderer.render(scene, camera);
        return;
    }

    const delta = Math.min(clock.getDelta(), 0.1); // clamp to avoid giant jumps on frame drops

    // 1. Update systems
    targetDummy.update(delta);
    sparkSystem.update(delta);
    damageTextSystem.update(delta);

    // 2. Update tracers
    for (let i = tracers.length - 1; i >= 0; i--) {
        const t = tracers[i];
        t.life -= delta;
        if (t.life <= 0) {
            scene.remove(t.mesh);
            t.mesh.geometry.dispose();
            t.mesh.material.dispose();
            tracers.splice(i, 1);
        } else {
            t.mesh.material.opacity = t.life / t.maxLife;
        }
    }

    // 3. Update plasma physical projectiles
    updatePlasmaProjectiles(delta);

    // 4. Rotate weapon models floating above pedestals
    state.pedestals.forEach((ped) => {
        if (ped.userData.weaponModel) {
            ped.userData.weaponModel.rotation.y += 1.2 * delta;
            // Float up and down slowly
            ped.userData.weaponModel.position.y = 1.1 + Math.sin(performance.now() * 0.002 + ped.position.x) * 0.05;
        }
    });

    // 5. Check if player standing near pedestals
    checkPedestalProximity();

    // 6. Handle automatic firing hold
    if (state.triggerHeld && state.currentWeapon.automatic) {
        fireWeapon();
    }

    // 7. Gun Recoil recovery lerps (smoothly sliding back to zero offsets)
    recoilOffset.lerp(new THREE.Vector3(0, 0, 0), 10 * delta);
    recoilRotation.lerp(new THREE.Vector3(0, 0, 0), 12 * delta);

    if (currentWeaponMesh && !state.isScoped) {
        // Apply recoil to visual gun view mesh
        currentWeaponMesh.position.z = -0.05 + recoilOffset.z;
        currentWeaponMesh.rotation.x = recoilRotation.x;
    }

    // 8. Player Movement Physics (WASD + Jumping)
    updatePlayerMovement(delta);

    // 9. Render scene
    renderer.render(scene, camera);
}

// Distance checking for floating equip menu triggers
function checkPedestalProximity() {
    let closestPed = null;
    let minDist = 3.0; // range of interaction in meters (horizontal 2D plane)

    state.pedestals.forEach((ped) => {
        // Compute horizontal distance ignoring player height (Y axis)
        const dx = yawObject.position.x - ped.position.x;
        const dz = yawObject.position.z - ped.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) {
            minDist = dist;
            closestPed = ped;
        }
    });

    const prompt = document.getElementById('interact-prompt');

    if (closestPed) {
        state.nearPedestal = closestPed;
        const key = closestPed.userData.weaponKey;
        const wName = WEAPONS[key].name;
        
        // Don't show prompt if this weapon is already equipped
        if (key === state.currentWeaponKey) {
            prompt.classList.remove('show');
        } else {
            prompt.innerHTML = `PRESS <span style="color: #00f3ff; font-weight: 900;">[E]</span> TO EQUIP ${wName.toUpperCase()}`;
            prompt.style.borderColor = '#' + WEAPONS[key].color.toString(16).padStart(6, '0');
            prompt.style.boxShadow = `0 0 15px rgba(${WEAPONS[key].color >> 16}, ${(WEAPONS[key].color >> 8) & 255}, ${WEAPONS[key].color & 255}, 0.5)`;
            prompt.classList.add('show');
        }
    } else {
        state.nearPedestal = null;
        prompt.classList.remove('show');
    }
}

// Player translation and jumping collision
function updatePlayerMovement(delta) {
    const keys = state.keys;
    
    // Calculate movement directions relative to player facing angles (yawObject)
    const moveDir = new THREE.Vector3();
    if (keys.w) moveDir.z -= 1;
    if (keys.s) moveDir.z += 1;
    if (keys.a) moveDir.x -= 1;
    if (keys.d) moveDir.x += 1;
    
    moveDir.normalize();
    moveDir.applyEuler(new THREE.Euler(0, yawObject.rotation.y, 0)); // rotate vector by player yaw

    // Speed constants
    const speed = 6.0; // meters per second
    const gravity = 22.0; // gravity acceleration
    const jumpPower = 8.5; // jump velocity force

    // Horizontal movement damping/lerp
    state.playerVel.x = moveDir.x * speed;
    state.playerVel.z = moveDir.z * speed;

    // Apply translations
    yawObject.position.x += state.playerVel.x * delta;
    yawObject.position.z += state.playerVel.z * delta;

    // Jumping & Gravity
    if (!state.playerOnGround) {
        state.playerVel.y -= gravity * delta;
    } else {
        state.playerVel.y = 0;
        if (keys.space) {
            state.playerVel.y = jumpPower;
            state.playerOnGround = false;
        }
    }

    yawObject.position.y += state.playerVel.y * delta;

    // Floor height collision
    if (yawObject.position.y <= state.playerHeight) {
        yawObject.position.y = state.playerHeight;
        state.playerOnGround = true;
        state.playerVel.y = 0;
    }

    // Room boundaries collision
    const limit = (ROOM_SIZE / 2) - 0.4; // leave buffer for player thickness
    yawObject.position.x = Math.max(-limit, Math.min(limit, yawObject.position.x));
    
    // Let player walk backwards, but clamp forward z limits so they don't walk behind the target dummy
    // Back wall limit: limit. Forward wall limit (closer to target dummy): -3.5m so they can walk around the pedestals (placed at -2.5m).
    yawObject.position.z = Math.max(-3.5, Math.min(limit, yawObject.position.z));
}

// Execute on DOM load
window.addEventListener('DOMContentLoaded', () => {
    initGame();
});
