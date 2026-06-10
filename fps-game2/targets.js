// targets.js - 3D Target Dummy, Difficulty Scaling, Particles, and Floating Damage Numbers

class TargetDummy {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        
        this.group = new THREE.Group();
        this.group.name = "target_dummy";
        
        // Materials
        this.metalMat = new THREE.MeshStandardMaterial({ color: 0x333a42, roughness: 0.3, metalness: 0.8 });
        this.glowMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); // Default pink-red target neon
        this.eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Glowing cyan eyes
        
        // Create the dummy meshes
        this.createVisuals();
        
        this.scene.add(this.group);

        // Core variables
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.isDead = false;
        
        // Flash feedback variables
        this.flashTimer = 0;
        this.flashActive = false;

        // Position references
        this.baseX = 0;
        this.baseY = 2.0; // target centered at ~2 meters high
        this.baseZ = -12;  // 12 meters back

        this.group.position.set(this.baseX, this.baseY, this.baseZ);
        
        // Difficulty and movement parameters
        this.level = 1;
        this.timeElapsed = 0;
        this.movementRange = 5.0; // Left-Right range
        this.speed = 1.0;
        this.jumpTimer = 0;
        this.jumpY = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;

        // Level 5 blink stats
        this.blinkTimer = 0;
        this.targetBlinkPos = new THREE.Vector3(0, 2.0, -12);
        
        // Collision bounding boxes/spheres
        this.hitboxes = [];
        this.setupHitboxes();
    }

    createVisuals() {
        const THREE = this.THREE;
        
        // Hover Ring / Pedestal stand
        const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 24), this.metalMat);
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.y = -1.2;
        this.group.add(baseRing);

        // Vertical glowing magnetic column
        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.4 }));
        column.position.y = -0.8;
        this.group.add(column);

        // Torso - Cybernetic chest plate
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.3), this.metalMat);
        torso.position.y = -0.2;
        this.group.add(torso);

        // Bullseye glow on Torso (Front and Back)
        const bullseyeF = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16), this.glowMat);
        bullseyeF.rotation.x = Math.PI / 2;
        bullseyeF.position.set(0, -0.1, 0.16);
        this.group.add(bullseyeF);

        const bullseyeB = bullseyeF.clone();
        bullseyeB.position.z = -0.16;
        bullseyeB.rotation.x = -Math.PI / 2;
        this.group.add(bullseyeB);

        // Core reactor center
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        core.position.set(0, -0.1, 0.165);
        this.group.add(core);

        // Shoulders & Arms
        const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), this.metalMat);
        shoulderL.position.set(0.38, 0.1, 0);
        this.group.add(shoulderL);
        
        const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.4, 8), this.metalMat);
        armL.position.set(0.44, -0.12, 0);
        armL.rotation.z = -0.25;
        this.group.add(armL);

        const shoulderR = shoulderL.clone();
        shoulderR.position.x = -0.38;
        this.group.add(shoulderR);

        const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.4, 8), this.metalMat);
        armR.position.set(-0.44, -0.12, 0);
        armR.rotation.z = 0.25;
        this.group.add(armR);

        // Neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.15, 8), this.metalMat);
        neck.position.y = 0.22;
        this.group.add(neck);

        // Head (Cyber-Helmet)
        this.headGroup = new THREE.Group();
        this.headGroup.position.y = 0.45;
        
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), this.metalMat);
        this.headGroup.add(head);

        // Glowing visor (eyes)
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.02), this.eyeMat);
        visor.position.set(0, 0.05, 0.161);
        this.headGroup.add(visor);

        // Target crown on head (bonus hit zone)
        const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 16), this.glowMat);
        crownRing.rotation.x = Math.PI / 2;
        crownRing.position.y = 0.18;
        this.headGroup.add(crownRing);

        this.group.add(this.headGroup);
    }

    setupHitboxes() {
        // We define bounding box sizes and offsets relative to target group origin for complex collision checks
        // Hitbox format: { name: 'head'|'torso'|'limb', radius: float, height: float, localOffset: Vector3, damageMultiplier: float }
        const THREE = this.THREE;
        
        this.hitboxes = [
            {
                name: 'head',
                type: 'sphere',
                radius: 0.25,
                offset: new THREE.Vector3(0, 0.45, 0),
                damageMultiplier: 2.5 // Headshot bonus!
            },
            {
                name: 'torso',
                type: 'cylinder',
                radius: 0.35,
                height: 0.8,
                offset: new THREE.Vector3(0, -0.1, 0),
                damageMultiplier: 1.0
            },
            {
                name: 'left_arm',
                type: 'cylinder',
                radius: 0.15,
                height: 0.5,
                offset: new THREE.Vector3(0.44, -0.12, 0),
                damageMultiplier: 0.75
            },
            {
                name: 'right_arm',
                type: 'cylinder',
                radius: 0.15,
                height: 0.5,
                offset: new THREE.Vector3(-0.44, -0.12, 0),
                damageMultiplier: 0.75
            }
        ];
    }

    setLevel(level) {
        this.level = level;
        this.timeElapsed = 0;
        this.isDead = false;
        this.health = this.maxHealth;
        this.group.visible = true;
        this.isJumping = false;
        this.jumpY = 0;
        
        // Reset scale and positions based on level
        this.group.scale.set(1, 1, 1);
        this.group.position.set(this.baseX, this.baseY, this.baseZ);
        this.targetBlinkPos.set(this.baseX, this.baseY, this.baseZ);

        // Adjust speed/properties per level
        if (level === 1) {
            this.speed = 0;
        } else if (level === 2) {
            this.speed = 2.0;
        } else if (level === 3) {
            this.speed = 3.5;
        } else if (level === 4) {
            this.speed = 4.5;
        } else if (level >= 5) {
            // Shrink size to make harder
            this.group.scale.set(0.7, 0.7, 0.7);
            this.speed = 6.0;
        }
        
        // Update glow colors based on level (Visual indicators)
        const colors = [0xff0055, 0x00f3ff, 0x00ff66, 0xffff00, 0xff00ff];
        const color = colors[(level - 1) % colors.length];
        this.glowMat.color.setHex(color);
    }

    // Handles hit detection against target parts
    // raycaster: THREE.Raycaster
    checkHit(raycaster) {
        if (this.isDead || !this.group.visible) return null;

        // Perform ray intersection with the group structure
        const intersects = raycaster.intersectObjects(this.group.children, true);
        if (intersects.length === 0) return null;

        // Find intersection point and check hitboxes for damage multipliers
        const intersect = intersects[0];
        const localHitPoint = this.group.worldToLocal(intersect.point.clone());

        // Check which hitbox is closest to the local intersection point
        let bestHit = null;
        let minDistance = Infinity;

        for (const hb of this.hitboxes) {
            let dist = 0;
            if (hb.type === 'sphere') {
                dist = localHitPoint.distanceTo(hb.offset);
                if (dist < hb.radius + 0.15) { // Add padding for leniency
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestHit = hb;
                    }
                }
            } else if (hb.type === 'cylinder') {
                // Cylindrical distance estimation
                const horizontalDist = Math.sqrt(Math.pow(localHitPoint.x - hb.offset.x, 2) + Math.pow(localHitPoint.z - hb.offset.z, 2));
                const verticalDist = Math.abs(localHitPoint.y - hb.offset.y);
                if (horizontalDist < hb.radius + 0.1 && verticalDist < (hb.height / 2) + 0.1) {
                    const combinedDist = horizontalDist + verticalDist;
                    if (combinedDist < minDistance) {
                        minDistance = combinedDist;
                        bestHit = hb;
                    }
                }
            }
        }

        // Fallback to torso if not matching specific hitbox
        if (!bestHit) {
            bestHit = this.hitboxes[1]; // torso
        }

        return {
            point: intersect.point,
            part: bestHit.name,
            damageMultiplier: bestHit.damageMultiplier
        };
    }

    takeDamage(amount) {
        if (this.isDead) return 0;

        this.health -= amount;
        this.flashActive = true;
        this.flashTimer = 0.15; // Flash for 150ms

        // Visual health indicator: make visor glow less or change color
        this.eyeMat.color.setHex(0xff0000);

        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            this.group.visible = false;
        }

        return this.isDead;
    }

    update(delta) {
        this.timeElapsed += delta;

        // Reset hit flashing color
        if (this.flashActive) {
            this.flashTimer -= delta;
            // Shift torso target material to bright white/red
            this.glowMat.color.setHex(0xffffff);
            if (this.flashTimer <= 0) {
                this.flashActive = false;
                // Reset level color
                const colors = [0xff0055, 0x00f3ff, 0x00ff66, 0xffff00, 0xff00ff];
                const color = colors[(this.level - 1) % colors.length];
                this.glowMat.color.setHex(color);
                this.eyeMat.color.setHex(0x00ffff);
            }
        }

        if (this.isDead || !this.group.visible) return;

        // Floating hover animation (idle breathing)
        const hoverOffsetY = Math.sin(this.timeElapsed * 3) * 0.1;
        
        // Subtle micro-rotations of the head looking around
        if (this.headGroup) {
            this.headGroup.rotation.y = Math.sin(this.timeElapsed * 1.5) * 0.15;
            this.headGroup.rotation.x = Math.cos(this.timeElapsed * 2) * 0.05;
        }

        // Movement profiles based on difficulty session
        let nextX = this.group.position.x;
        let nextY = this.baseY + hoverOffsetY;
        let nextZ = this.baseZ;

        switch (this.level) {
            case 1:
                // Level 1: Static
                nextX = this.baseX;
                break;

            case 2:
                // Level 2: Slow horizontal movement (Sine wave)
                nextX = this.baseX + Math.sin(this.timeElapsed * this.speed * 0.8) * this.movementRange;
                break;

            case 3:
                // Level 3: Faster horizontal + periodic jumping
                nextX = this.baseX + Math.sin(this.timeElapsed * this.speed * 0.7) * (this.movementRange + 1);
                
                // Jumping physics simulation
                this.jumpTimer += delta;
                if (!this.isJumping && this.jumpTimer > 2.5) { // Jump every 2.5s
                    this.isJumping = true;
                    this.jumpVelocity = 7.0; // Initial velocity upwards
                }

                if (this.isJumping) {
                    this.jumpVelocity -= 15.0 * delta; // Gravity
                    this.jumpY += this.jumpVelocity * delta;
                    if (this.jumpY <= 0) {
                        this.jumpY = 0;
                        this.isJumping = false;
                        this.jumpTimer = Math.random() * 0.8; // Random delay offset
                    }
                }
                nextY += this.jumpY;
                break;

            case 4:
                // Level 4: Sine-wave circular/complex 8-loop flight path (Lissajous curves)
                nextX = this.baseX + Math.sin(this.timeElapsed * this.speed * 0.6) * (this.movementRange + 1);
                nextY += Math.cos(this.timeElapsed * this.speed * 1.2) * 1.2;
                nextZ = this.baseZ + Math.sin(this.timeElapsed * this.speed * 0.4) * 2.0; // forward/backward depth movement
                break;

            case 5:
            default:
                // Level 5+: Random Blink / Dashing behavior
                this.blinkTimer += delta;
                
                // Blink to a new coordinate every 1.5 seconds
                if (this.blinkTimer > 1.3) {
                    this.blinkTimer = 0;
                    
                    // Choose random target coordinate
                    const randX = this.baseX + (Math.random() - 0.5) * (this.movementRange * 2);
                    const randY = this.baseY + (Math.random() - 0.5) * 2.0;
                    const randZ = this.baseZ + (Math.random() - 0.5) * 3.0;

                    this.targetBlinkPos.set(randX, randY, randZ);
                    
                    // Trigger flash visual effect when teleporting
                    this.flashActive = true;
                    this.flashTimer = 0.1;
                }

                // Interpolate (dash) towards target blink position
                const lerpFactor = 5.0 * delta; // speed of dash interpolation
                nextX = this.THREE.MathUtils.lerp(this.group.position.x, this.targetBlinkPos.x, lerpFactor);
                nextY = this.THREE.MathUtils.lerp(this.group.position.y, this.targetBlinkPos.y, lerpFactor);
                nextZ = this.THREE.MathUtils.lerp(this.group.position.z, this.targetBlinkPos.z, lerpFactor);
                break;
        }

        this.group.position.set(nextX, nextY, nextZ);
    }
}

// Particle System for spark explosions on target hit
class TargetSparkSystem {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        this.particles = [];
        
        // Reuse geometry
        this.geometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    }

    spawn(position, colorHex, count = 12) {
        const THREE = this.THREE;

        for (let i = 0; i < count; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 1.0
            });
            const mesh = new THREE.Mesh(this.geometry, material);
            
            // Spawn at exact collision point
            mesh.position.copy(position);

            // Random spherical velocities
            const angle = Math.random() * Math.PI * 2;
            const pitch = (Math.random() - 0.5) * Math.PI;
            const speed = 2.0 + Math.random() * 5.0;

            const velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(pitch) * speed,
                (Math.sin(pitch) * speed) + 2.0, // bias upward
                Math.sin(angle) * Math.cos(pitch) * speed
            );

            this.particles.push({
                mesh: mesh,
                velocity: velocity,
                life: 0.5 + Math.random() * 0.4, // seconds
                maxLife: 0.9
            });

            this.scene.add(mesh);
        }
    }

    update(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            } else {
                // Apply velocity and gravity
                p.velocity.y -= 9.8 * delta; // gravity
                p.mesh.position.addScaledVector(p.velocity, delta);

                // Fade out opacity
                p.mesh.material.opacity = p.life / p.maxLife;
                
                // Spin particles
                p.mesh.rotation.x += 5 * delta;
                p.mesh.rotation.y += 5 * delta;
            }
        }
    }
}

// Canvas-based 3D Floating Damage Numbers
class DamageTextSystem {
    constructor(THREE, scene, camera) {
        this.THREE = THREE;
        this.scene = scene;
        this.camera = camera;
        this.texts = [];
    }

    spawn(position, text, isCritical = false) {
        const THREE = this.THREE;

        // Create canvas to draw the text
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Styles
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = isCritical ? 'bold 44px "Outfit", sans-serif' : 'bold 36px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outer glow/shadow
        ctx.shadowColor = isCritical ? 'rgba(255, 0, 85, 0.9)' : 'rgba(0, 243, 255, 0.9)';
        ctx.shadowBlur = 10;

        // Fill text color
        ctx.fillStyle = isCritical ? '#ff0055' : '#00f3ff';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        // Add border if critical
        if (isCritical) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
        }

        // Convert canvas to Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 1.0,
            depthTest: false // render on top
        });

        const sprite = new THREE.Sprite(material);
        // Position slightly offset and higher than the hit point
        sprite.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.4, (Math.random() - 0.5) * 0.5));
        sprite.scale.set(1.5, 0.75, 1.0);

        this.texts.push({
            sprite: sprite,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.2 + Math.random() * 0.8, 0), // moves upward
            life: 0.8, // lifespan in seconds
            maxLife: 0.8
        });

        this.scene.add(sprite);
    }

    update(delta) {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.life -= delta;

            if (t.life <= 0) {
                this.scene.remove(t.sprite);
                t.sprite.material.map.dispose();
                t.sprite.material.dispose();
                this.texts.splice(i, 1);
            } else {
                // Rise and expand/shrink
                t.sprite.position.addScaledVector(t.velocity, delta);
                
                // Fade out
                const lifeRatio = t.life / t.maxLife;
                t.sprite.material.opacity = lifeRatio;
                
                // Slow down vertical speed slightly
                t.velocity.y -= 0.5 * delta;
            }
        }
    }
}

// Export systems to window object
window.TargetDummy = TargetDummy;
window.TargetSparkSystem = TargetSparkSystem;
window.DamageTextSystem = DamageTextSystem;
