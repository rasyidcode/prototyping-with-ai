// weapons.js - Procedural 3D Weapon Models and Specifications

const WEAPONS = {
    pistol: {
        name: 'Cyber Pistol',
        type: 'pistol',
        damage: 25,
        fireRate: 300, // ms between shots
        clipSize: 12,
        ammo: 12,
        reloadTime: 1200, // ms
        range: 100,
        automatic: false,
        recoilX: 0.02,
        recoilY: 0.04,
        spread: 0.01,
        color: 0x00f3ff, // Cyan
        createModel: (THREE) => {
            const group = new THREE.Group();
            
            // Matte black chassis
            const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.8 });
            // Neon cyan glow
            const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

            // Main body
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.22), chassisMat);
            body.position.set(0, 0, -0.05);
            group.add(body);

            // Grip
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), chassisMat);
            grip.position.set(0, -0.08, -0.02);
            grip.rotation.x = -0.2;
            group.add(grip);

            // Barrel (long cylinder)
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8), chassisMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.02, -0.12);
            group.add(barrel);

            // Glow stripes
            const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.015, 0.15), glowMat);
            stripeL.position.set(0.031, 0.01, -0.05);
            const stripeR = stripeL.clone();
            stripeR.position.x = -0.031;
            group.add(stripeL);
            group.add(stripeR);

            // Red dot sight glass
            const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.04), chassisMat);
            sightBase.position.set(0, 0.06, 0.02);
            const sightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.005), new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.7 }));
            sightGlass.position.set(0, 0.075, 0.02);
            group.add(sightBase);
            group.add(sightGlass);

            // Scale to look correct in player hand
            group.scale.set(1, 1, 1);
            return group;
        }
    },
    rifle: {
        name: 'Pulse Rifle',
        type: 'rifle',
        damage: 20,
        fireRate: 100, // Automatic
        clipSize: 30,
        ammo: 30,
        reloadTime: 1800,
        range: 150,
        automatic: true,
        recoilX: 0.015,
        recoilY: 0.035,
        spread: 0.025,
        color: 0xff5500, // Orange
        createModel: (THREE) => {
            const group = new THREE.Group();
            
            const metalMat = new THREE.MeshStandardMaterial({ color: 0x242428, roughness: 0.4, metalness: 0.9 });
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
            const stockMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.8 });

            // Main Frame
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.45), metalMat);
            frame.position.set(0, 0.02, -0.15);
            group.add(frame);

            // Barrel
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8), metalMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.03, -0.45);
            group.add(barrel);

            // Shroud around barrel
            const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.3), stockMat);
            shroud.position.set(0, 0.02, -0.35);
            group.add(shroud);

            // Stock
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.25), stockMat);
            stock.position.set(0, -0.01, 0.15);
            group.add(stock);

            // Grip
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.05), stockMat);
            grip.position.set(0, -0.1, -0.05);
            grip.rotation.x = -0.3;
            group.add(grip);

            // Curved Magazine
            const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.07), metalMat);
            mag.position.set(0, -0.14, -0.22);
            mag.rotation.x = 0.2;
            group.add(mag);

            // Glowing pulse tube
            const pulseTube = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 8), glowMat);
            pulseTube.rotation.x = Math.PI / 2;
            pulseTube.position.set(0, 0.04, -0.32);
            group.add(pulseTube);

            // Holosight
            const holosight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.09), metalMat);
            holosight.position.set(0, 0.08, -0.12);
            const lens = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.005), new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6 }));
            lens.position.set(0, 0.1, -0.15);
            group.add(holosight);
            group.add(lens);

            return group;
        }
    },
    shotgun: {
        name: 'Tempest Shotgun',
        type: 'shotgun',
        damage: 12, // Per pellet
        pellets: 8,
        fireRate: 850,
        clipSize: 6,
        ammo: 6,
        reloadTime: 2200,
        range: 30,
        automatic: false,
        recoilX: 0.05,
        recoilY: 0.12,
        spread: 0.085,
        color: 0x9900ff, // Purple
        createModel: (THREE) => {
            const group = new THREE.Group();

            const metalMat = new THREE.MeshStandardMaterial({ color: 0x201a24, roughness: 0.6, metalness: 0.7 });
            const darkMat = new THREE.MeshStandardMaterial({ color: 0x0b080f, roughness: 0.9 });
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xb026ff });

            // Heavy Receiver
            const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.4), metalMat);
            receiver.position.set(0, 0.01, -0.1);
            group.add(receiver);

            // Double barrels
            const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), metalMat);
            barrelL.rotation.x = Math.PI / 2;
            barrelL.position.set(0.022, 0.03, -0.45);

            const barrelR = barrelL.clone();
            barrelR.position.x = -0.022;
            group.add(barrelL);
            group.add(barrelR);

            // Pump handle slide
            const pump = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.06, 0.22), darkMat);
            pump.position.set(0, -0.02, -0.4);
            group.add(pump);

            // Pistol Grip Stock (tactical style)
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.055), darkMat);
            grip.position.set(0, -0.11, -0.02);
            grip.rotation.x = -0.4;
            group.add(grip);

            const buttstock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.28), darkMat);
            buttstock.position.set(0, -0.02, 0.18);
            group.add(buttstock);

            // Glowing shell indicators (purple stripes)
            for (let i = 0; i < 4; i++) {
                const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.008, 0.02), glowMat);
                stripe.position.set(0, 0.03 - i * 0.02, -0.08);
                group.add(stripe);
            }

            return group;
        }
    },
    sniper: {
        name: 'Rail Sniper',
        type: 'sniper',
        damage: 100,
        fireRate: 1500, // Bolt-action reload time implicitly
        clipSize: 5,
        ammo: 5,
        reloadTime: 2500,
        range: 400,
        automatic: false,
        zoom: 3.5, // scope multiplier
        recoilX: 0.04,
        recoilY: 0.18,
        spread: 0.001, // extremely accurate
        color: 0x00ff66, // Green
        createModel: (THREE) => {
            const group = new THREE.Group();

            const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111612, roughness: 0.7 });
            const titaniumMat = new THREE.MeshStandardMaterial({ color: 0x3d4b3f, roughness: 0.3, metalness: 0.9 });
            const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });

            // Long central receiver
            const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.55), carbonMat);
            receiver.position.set(0, 0.03, -0.2);
            group.add(receiver);

            // Long railgun barrel
            const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 0.9), titaniumMat);
            barrel.position.set(0, 0.04, -0.85);
            group.add(barrel);

            // Electromagnetic rails (top and bottom of barrel)
            const railT = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.006, 0.85), glowMat);
            railT.position.set(0, 0.058, -0.82);
            const railB = railT.clone();
            railB.position.y = 0.022;
            group.add(railT);
            group.add(railB);

            // Large Scoping System
            const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.28, 8), titaniumMat);
            scopeBody.rotation.x = Math.PI / 2;
            scopeBody.position.set(0, 0.11, -0.22);
            group.add(scopeBody);

            const scopeStandL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.02), carbonMat);
            scopeStandL.position.set(0, 0.07, -0.15);
            const scopeStandR = scopeStandL.clone();
            scopeStandR.position.z = -0.29;
            group.add(scopeStandL);
            group.add(scopeStandR);

            const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.005, 12), new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.7 }));
            lens.rotation.x = Math.PI / 2;
            lens.position.set(0, 0.11, -0.08); // back lens
            group.add(lens);

            // Heavy skeleton stock
            const buttstock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.35), carbonMat);
            buttstock.position.set(0, 0.01, 0.22);
            group.add(buttstock);

            // Heavy grip
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.15, 0.045), carbonMat);
            grip.position.set(0, -0.09, -0.08);
            grip.rotation.x = -0.25;
            group.add(grip);

            return group;
        }
    },
    plasma: {
        name: 'Plasma Launcher',
        type: 'plasma',
        damage: 80, // High direct + splash
        fireRate: 1200,
        clipSize: 3,
        ammo: 3,
        reloadTime: 3000,
        range: 80,
        automatic: false,
        projectileSpeed: 25, // meters per second (visible slow projectile)
        recoilX: 0.06,
        recoilY: 0.15,
        spread: 0.04,
        color: 0xffff00, // Neon Yellow/Green
        createModel: (THREE) => {
            const group = new THREE.Group();

            const frameMat = new THREE.MeshStandardMaterial({ color: 0x2e2d26, roughness: 0.5, metalness: 0.6 });
            const coilMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1a, roughness: 0.3 });
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xeaff00 });

            // Bulky Main Body
            const mainBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.42), frameMat);
            mainBody.position.set(0, 0, -0.1);
            group.add(mainBody);

            // Giant barrel (launcher tube)
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 12, 1, true), coilMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.01, -0.38);
            group.add(barrel);

            // Inner charging core (rotating cylinder or glowing core)
            const core = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.22, 8), glowMat);
            core.rotation.x = Math.PI / 2;
            core.position.set(0, 0.01, -0.32);
            group.add(core);

            // Spherical fuel tank on the side
            const tank = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), frameMat);
            tank.position.set(0.09, -0.04, -0.08);
            
            const fuelStripe = new THREE.Mesh(new THREE.TorusGeometry(0.071, 0.008, 6, 16), glowMat);
            fuelStripe.rotation.y = Math.PI / 2;
            tank.add(fuelStripe);
            group.add(tank);

            // Rear handle & trigger stock
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.2), frameMat);
            stock.position.set(-0.02, -0.02, 0.18);
            group.add(stock);

            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.05), coilMat);
            grip.position.set(-0.02, -0.12, -0.02);
            grip.rotation.x = -0.15;
            group.add(grip);

            return group;
        }
    }
};

// Export to window object for web consumption
window.WEAPONS = WEAPONS;
