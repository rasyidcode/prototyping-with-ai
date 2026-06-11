#include "player.h"
#include "map.h"
#include "particles.h"
#include "sound_synth.h"
#include <math.h>
#include <stdlib.h>

extern Bullet bullets[MAX_BULLETS];

static float GetRandomFloat(float min, float max) {
    return min + ((float)rand() / RAND_MAX) * (max - min);
}

void SpawnBullet(Vector3 position, Vector3 velocity, float radius, Color color, bool isPlayerOwned, int damage) {
    for (int i = 0; i < MAX_BULLETS; i++) {
        if (!bullets[i].active) {
            bullets[i].active = true;
            bullets[i].position = position;
            bullets[i].velocity = velocity;
            bullets[i].radius = radius;
            bullets[i].color = color;
            bullets[i].isPlayerOwned = isPlayerOwned;
            bullets[i].damage = damage;
            break;
        }
    }
}

void InitPlayer(Player *player) {
    player->position = GetSpawnPosition();
    player->velocity = (Vector3){ 0.0f, 0.0f, 0.0f };
    player->yaw = 0.0f;
    player->pitch = 0.0f;
    player->radius = 0.5f;
    player->height = 1.8f;
    player->speed = 5.5f;
    player->jumpSpeed = 7.0f;
    player->health = 100.0f;
    player->maxHealth = 100.0f;
    player->isGrounded = false;
    
    // Weapons init
    // Plasma Rifle
    player->weapons[WEAPON_PLASMA].name = "PLASMA RIFLE";
    player->weapons[WEAPON_PLASMA].damage = 18;
    player->weapons[WEAPON_PLASMA].fireRate = 0.12f;
    player->weapons[WEAPON_PLASMA].maxClip = 30;
    player->weapons[WEAPON_PLASMA].clip = 30;
    player->weapons[WEAPON_PLASMA].maxReserve = 120;
    player->weapons[WEAPON_PLASMA].reserve = 90;
    player->weapons[WEAPON_PLASMA].reloadTime = 1.2f;
    player->weapons[WEAPON_PLASMA].recoilIntensity = 1.2f;
    player->weapons[WEAPON_PLASMA].range = 80.0f;

    // Cyber Shotgun
    player->weapons[WEAPON_SHOTGUN].name = "FLUX SHOTGUN";
    player->weapons[WEAPON_SHOTGUN].damage = 10; // 10 per pellet, 8 pellets = 80 dmg max
    player->weapons[WEAPON_SHOTGUN].fireRate = 0.75f;
    player->weapons[WEAPON_SHOTGUN].maxClip = 6;
    player->weapons[WEAPON_SHOTGUN].clip = 6;
    player->weapons[WEAPON_SHOTGUN].maxReserve = 36;
    player->weapons[WEAPON_SHOTGUN].reserve = 18;
    player->weapons[WEAPON_SHOTGUN].reloadTime = 1.8f;
    player->weapons[WEAPON_SHOTGUN].recoilIntensity = 3.8f;
    player->weapons[WEAPON_SHOTGUN].range = 25.0f;

    player->currentWeapon = WEAPON_PLASMA;
    player->fireCooldown = 0.0f;
    player->reloadTimer = 0.0f;
    player->isReloading = false;
    
    player->headBob = 0.0f;
    player->weaponSwayX = 0.0f;
    player->weaponSwayY = 0.0f;
    player->recoilPitch = 0.0f;
    player->recoilYaw = 0.0f;
    player->screenShake = 0.0f;
    
    player->camera.position = (Vector3){ player->position.x, player->position.y + 1.6f, player->position.z };
    player->camera.target = (Vector3){ 0.0f, 1.6f, 1.0f };
    player->camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
    player->camera.fovy = 75.0f;
    player->camera.projection = CAMERA_PERSPECTIVE;
}

void UpdatePlayer(Player *player, float dt) {
    if (player->health <= 0) return;

    // 1. Mouse Look
    Vector2 mouseDelta = GetMouseDelta();
    float sensitivity = 0.15f;
    
    // Add recoil and shake decay first
    player->recoilPitch = Lerp(player->recoilPitch, 0.0f, dt * 10.0f);
    player->recoilYaw = Lerp(player->recoilYaw, 0.0f, dt * 10.0f);
    player->screenShake = Lerp(player->screenShake, 0.0f, dt * 8.0f);

    player->yaw -= mouseDelta.x * sensitivity;
    player->pitch -= mouseDelta.y * sensitivity;
    player->pitch = Clamp(player->pitch, -85.0f, 85.0f);
    
    // 2. Keyboard Movement
    float currentSpeed = player->speed;
    if (IsKeyDown(KEY_LEFT_SHIFT)) {
        currentSpeed *= 1.5f; // Sprint
    }
    
    // Calculate forward/right vectors based on yaw
    float yawRad = player->yaw * DEG2RAD;
    Vector3 forward = { sinf(yawRad), 0.0f, cosf(yawRad) };
    Vector3 right = { -cosf(yawRad), 0.0f, sinf(yawRad) };
    
    Vector3 moveDir = { 0.0f, 0.0f, 0.0f };
    if (IsKeyDown(KEY_W)) moveDir = Vector3Add(moveDir, forward);
    if (IsKeyDown(KEY_S)) moveDir = Vector3Subtract(moveDir, forward);
    if (IsKeyDown(KEY_A)) moveDir = Vector3Subtract(moveDir, right);
    if (IsKeyDown(KEY_D)) moveDir = Vector3Add(moveDir, right);
    
    if (Vector3Length(moveDir) > 0.0f) {
        moveDir = Vector3Normalize(moveDir);
    }
    
    // Apply movement (horizontal)
    player->position.x += moveDir.x * currentSpeed * dt;
    player->position.z += moveDir.z * currentSpeed * dt;
    
    // Gravity & Jump physics
    if (!player->isGrounded) {
        player->velocity.y -= 22.0f * dt;
    } else {
        player->velocity.y = 0.0f;
    }
    
    if (IsKeyPressed(KEY_SPACE) && player->isGrounded) {
        player->velocity.y = player->jumpSpeed;
        player->isGrounded = false;
        PlayGameSound(SND_JUMP);
    }
    
    player->position.y += player->velocity.y * dt;
    
    // Floor boundary
    if (player->position.y <= 0.0f) {
        player->position.y = 0.0f;
        player->velocity.y = 0.0f;
        player->isGrounded = true;
    }
    
    // Map Collision
    Vector3 resolved;
    if (CheckMapCollision(player->position, player->radius, &resolved)) {
        player->position = resolved;
    }
    
    // Head Bobbing & Weapon Sway
    float bobSpeed = 10.0f;
    float bobAmount = 0.025f;
    bool isMoving = Vector3Length(moveDir) > 0.0f && player->isGrounded;
    
    if (isMoving) {
        player->headBob += bobSpeed * dt;
        if (IsKeyDown(KEY_LEFT_SHIFT)) {
            player->headBob += bobSpeed * 0.4f * dt;
        }
    } else {
        player->headBob = Lerp(player->headBob, 0.0f, dt * 8.0f);
    }
    
    float bobOffset = sinf(player->headBob) * bobAmount;
    if (!player->isGrounded) {
        bobOffset = 0.0f;
    }
    
    // Weapon Sway (lag behind camera movements)
    float swayX = sinf(player->headBob) * 0.015f;
    float swayY = cosf(player->headBob * 2.0f) * 0.012f;
    player->weaponSwayX = Lerp(player->weaponSwayX, swayX - mouseDelta.x * 0.0012f, 0.1f);
    player->weaponSwayY = Lerp(player->weaponSwayY, swayY + mouseDelta.y * 0.0012f, 0.1f);
    player->weaponSwayX = Clamp(player->weaponSwayX, -0.06f, 0.06f);
    player->weaponSwayY = Clamp(player->weaponSwayY, -0.06f, 0.06f);

    // Camera target calculations (recoil offsets applied temporarily)
    float lookPitch = player->pitch + player->recoilPitch;
    float lookYaw = player->yaw + player->recoilYaw;
    
    float pitchRad = lookPitch * DEG2RAD;
    float lookYawRad = lookYaw * DEG2RAD;
    
    Vector3 lookDir = {
        sinf(lookYawRad) * cosf(pitchRad),
        sinf(pitchRad),
        cosf(lookYawRad) * cosf(pitchRad)
    };
    
    player->camera.position = (Vector3){ player->position.x, player->position.y + 1.6f + bobOffset, player->position.z };
    player->camera.target = Vector3Add(player->camera.position, lookDir);
    player->camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
    
    // Apply camera screen shake
    if (player->screenShake > 0.0f) {
        Vector3 shakeOffset = {
            GetRandomFloat(-1.0f, 1.0f) * player->screenShake,
            GetRandomFloat(-1.0f, 1.0f) * player->screenShake,
            GetRandomFloat(-1.0f, 1.0f) * player->screenShake
        };
        player->camera.position = Vector3Add(player->camera.position, shakeOffset);
        player->camera.target = Vector3Add(player->camera.target, shakeOffset);
    }
    
    // 3. Weapon State
    Weapon *weapon = &player->weapons[player->currentWeapon];
    
    if (player->fireCooldown > 0.0f) {
        player->fireCooldown -= dt;
    }
    
    // Reload timer
    if (player->isReloading) {
        player->reloadTimer -= dt;
        if (player->reloadTimer <= 0.0f) {
            int needed = weapon->maxClip - weapon->clip;
            int toLoad = (needed < weapon->reserve) ? needed : weapon->reserve;
            weapon->clip += toLoad;
            weapon->reserve -= toLoad;
            player->isReloading = false;
        }
    }
    
    // Trigger Reload
    if (IsKeyPressed(KEY_R) && !player->isReloading && weapon->clip < weapon->maxClip && weapon->reserve > 0) {
        player->isReloading = true;
        player->reloadTimer = weapon->reloadTime;
        PlayGameSound(SND_RELOAD);
    }
    
    // Switch weapon
    int switchInput = 0;
    if (IsKeyPressed(KEY_ONE)) switchInput = 1;
    if (IsKeyPressed(KEY_TWO)) switchInput = 2;
    float scroll = GetMouseWheelMove();
    if (scroll > 0.1f) switchInput = 1;
    if (scroll < -0.1f) switchInput = 2;
    
    if (switchInput != 0) {
        int newWeapon = switchInput - 1;
        if (newWeapon >= 0 && newWeapon < WEAPON_COUNT && newWeapon != player->currentWeapon) {
            player->currentWeapon = newWeapon;
            player->isReloading = false;
            player->fireCooldown = 0.2f; // Slight switch delay
        }
    }
    
    // Shooting
    if (IsMouseButtonDown(MOUSE_BUTTON_LEFT) && player->fireCooldown <= 0.0f && !player->isReloading) {
        if (weapon->clip > 0) {
            weapon->clip--;
            player->fireCooldown = weapon->fireRate;
            
            if (player->currentWeapon == WEAPON_PLASMA) {
                PlayGameSound(SND_SHOOT_PLASMA);
            } else {
                PlayGameSound(SND_SHOOT_SHOTGUN);
            }
            
            // Recoil & Shake impulse
            player->recoilPitch = weapon->recoilIntensity;
            player->recoilYaw = GetRandomFloat(-0.8f, 0.8f) * weapon->recoilIntensity * 0.4f;
            player->screenShake = Clamp(player->screenShake + (player->currentWeapon == WEAPON_PLASMA ? 0.04f : 0.18f), 0.0f, 0.35f);
            
            // Calculate muzzle fire position (offset from eye position)
            Vector3 camRight = Vector3Normalize(Vector3CrossProduct(lookDir, player->camera.up));
            Vector3 camUp = Vector3CrossProduct(camRight, lookDir);
            
            // Draw slightly forward (0.38f) and right (0.18f), down (-0.22f)
            Vector3 muzzlePos = player->camera.position;
            muzzlePos = Vector3Add(muzzlePos, Vector3Scale(lookDir, 0.38f));
            muzzlePos = Vector3Add(muzzlePos, Vector3Scale(camRight, 0.16f));
            muzzlePos = Vector3Add(muzzlePos, Vector3Scale(camUp, -0.22f));
            
            Color bulletColor = (player->currentWeapon == WEAPON_PLASMA) ? (Color){ 0, 255, 240, 255 } : (Color){ 255, 120, 0, 255 };
            
            if (player->currentWeapon == WEAPON_PLASMA) {
                // Plasma shot (high speed)
                Vector3 bVel = Vector3Scale(lookDir, 45.0f);
                // Tiny accuracy spread
                Vector3 spread = { GetRandomFloat(-0.015f, 0.015f), GetRandomFloat(-0.015f, 0.015f), GetRandomFloat(-0.015f, 0.015f) };
                bVel = Vector3Add(bVel, Vector3Scale(spread, 45.0f));
                
                SpawnBullet(muzzlePos, bVel, 0.08f, bulletColor, true, weapon->damage);
                SpawnSparks(muzzlePos, lookDir, bulletColor, 8, 4.5f);
            } else {
                // Shotgun shot (8 spreading pellets)
                int pellets = 8;
                for (int p = 0; p < pellets; p++) {
                    Vector3 spreadDir = lookDir;
                    spreadDir.x += GetRandomFloat(-0.08f, 0.08f);
                    spreadDir.y += GetRandomFloat(-0.08f, 0.08f);
                    spreadDir.z += GetRandomFloat(-0.08f, 0.08f);
                    spreadDir = Vector3Normalize(spreadDir);
                    
                    Vector3 bVel = Vector3Scale(spreadDir, 55.0f);
                    SpawnBullet(muzzlePos, bVel, 0.05f, bulletColor, true, weapon->damage);
                }
                SpawnSparks(muzzlePos, lookDir, bulletColor, 18, 6.0f);
            }
        } else {
            // Auto reload
            if (weapon->reserve > 0) {
                player->isReloading = true;
                player->reloadTimer = weapon->reloadTime;
                PlayGameSound(SND_RELOAD);
            }
        }
    }
}

void DrawPlayerWeapon(Player *player) {
    if (player->health <= 0) return;

    // Calculate vectors relative to camera look angle
    float lookPitch = player->pitch + player->recoilPitch;
    float lookYaw = player->yaw + player->recoilYaw;
    
    float pitchRad = lookPitch * DEG2RAD;
    float yawRad = lookYaw * DEG2RAD;
    
    Vector3 lookDir = {
        sinf(yawRad) * cosf(pitchRad),
        sinf(pitchRad),
        cosf(yawRad) * cosf(pitchRad)
    };
    
    Vector3 right = Vector3Normalize(Vector3CrossProduct(lookDir, player->camera.up));
    Vector3 up = Vector3CrossProduct(right, lookDir);
    
    // Weapon base offset (very close to camera to avoid wall clipping)
    float recoilPush = player->recoilPitch * -0.012f; // Push gun back as recoil kicks
    Vector3 gunBase = player->camera.position;
    
    float reloadDip = 0.0f;
    if (player->isReloading) {
        float reloadFactor = player->reloadTimer / player->weapons[player->currentWeapon].reloadTime;
        float tilt = sinf(reloadFactor * PI);
        reloadDip = tilt * 0.15f;
        // Tilt look direction downwards
        lookDir = Vector3Normalize(Vector3Subtract(lookDir, Vector3Scale(up, tilt * 0.5f)));
        right = Vector3Normalize(Vector3CrossProduct(lookDir, player->camera.up));
        up = Vector3CrossProduct(right, lookDir);
    }
    
    gunBase = Vector3Add(gunBase, Vector3Scale(lookDir, 0.32f + recoilPush));
    gunBase = Vector3Add(gunBase, Vector3Scale(right, 0.15f + player->weaponSwayX));
    gunBase = Vector3Add(gunBase, Vector3Scale(up, -0.22f + player->weaponSwayY - reloadDip));
    
    if (player->currentWeapon == WEAPON_PLASMA) {
        // Plasma Rifle
        Color barrelColor = (Color){ 30, 30, 40, 255 };      // Dark gunmetal
        Color neonColor = (Color){ 0, 255, 240, 255 };       // Glowing cyan
        
        // Double barrel (2 thin cylinders)
        Vector3 barrel1Start = Vector3Add(gunBase, Vector3Scale(right, -0.015f));
        Vector3 barrel1End = Vector3Add(barrel1Start, Vector3Scale(lookDir, 0.25f));
        DrawCylinderEx(barrel1Start, barrel1End, 0.015f, 0.012f, 8, barrelColor);
        
        Vector3 barrel2Start = Vector3Add(gunBase, Vector3Scale(right, 0.015f));
        Vector3 barrel2End = Vector3Add(barrel2Start, Vector3Scale(lookDir, 0.25f));
        DrawCylinderEx(barrel2Start, barrel2End, 0.015f, 0.012f, 8, barrelColor);
        
        // Glowing cyan reactor core in the middle
        Vector3 coreStart = Vector3Add(gunBase, Vector3Scale(lookDir, 0.02f));
        Vector3 coreEnd = Vector3Add(coreStart, Vector3Scale(lookDir, 0.18f));
        Color coreColor = neonColor;
        if (player->isReloading) {
            // Flash core during reload
            float cycle = sinf((float)GetTime() * 12.0f);
            coreColor.a = (unsigned char)(100 + 155 * (cycle * 0.5f + 0.5f));
        }
        DrawCylinderEx(coreStart, coreEnd, 0.022f, 0.022f, 8, coreColor);
        
        // Upper casing / shroud
        Vector3 casingStart = Vector3Add(gunBase, Vector3Scale(up, 0.022f));
        Vector3 casingEnd = Vector3Add(casingStart, Vector3Scale(lookDir, 0.15f));
        DrawCylinderEx(casingStart, casingEnd, 0.028f, 0.025f, 6, barrelColor);
        
        // Holographic scope lens
        Vector3 scopeStart = Vector3Add(casingStart, Vector3Scale(up, 0.02f));
        Vector3 scopeEnd = Vector3Add(scopeStart, Vector3Scale(lookDir, 0.04f));
        DrawCylinderEx(scopeStart, scopeEnd, 0.01f, 0.01f, 8, (Color){ 255, 0, 100, 255 });
    } else {
        // Flux Shotgun
        Color barrelColor = (Color){ 40, 35, 45, 255 };      // Dark violet gunmetal
        Color neonColor = (Color){ 255, 120, 0, 255 };       // Glowing orange
        
        // Big heavy barrel
        Vector3 barrelStart = gunBase;
        Vector3 barrelEnd = Vector3Add(barrelStart, Vector3Scale(lookDir, 0.22f));
        DrawCylinderEx(barrelStart, barrelEnd, 0.038f, 0.038f, 10, barrelColor);
        
        // Under barrel pump handle (thick cylindrical pump)
        Vector3 pumpStart = Vector3Add(gunBase, Vector3Scale(up, -0.035f));
        pumpStart = Vector3Add(pumpStart, Vector3Scale(lookDir, 0.04f));
        Vector3 pumpEnd = Vector3Add(pumpStart, Vector3Scale(lookDir, 0.12f));
        DrawCylinderEx(pumpStart, pumpEnd, 0.028f, 0.028f, 8, (Color){ 70, 70, 80, 255 });
        
        // Glowing orange exhaust vents
        Vector3 ventStart = Vector3Add(gunBase, Vector3Scale(lookDir, 0.12f));
        Vector3 ventEnd = Vector3Add(ventStart, Vector3Scale(lookDir, 0.04f));
        DrawCylinderEx(ventStart, ventEnd, 0.04f, 0.04f, 10, neonColor);
        
        // Front sight post
        Vector3 postStart = Vector3Add(barrelEnd, Vector3Scale(up, 0.035f));
        Vector3 postEnd = Vector3Add(postStart, Vector3Scale(lookDir, -0.02f));
        DrawCylinderEx(postStart, postEnd, 0.006f, 0.006f, 4, (Color){ 255, 200, 0, 255 });
    }
}

void DrawPlayerHUD(Player *player) {
    if (player->health <= 0) return;

    int screenWidth = GetScreenWidth();
    int screenHeight = GetScreenHeight();
    
    // 1. Crosshair (Neon green, Sleek lines)
    int centerX = screenWidth / 2;
    int centerY = screenHeight / 2;
    Color crosshairColor = (Color){ 0, 255, 120, 200 };
    
    // Draw crosshair dots / lines
    int gap = 5;
    int length = 8;
    // If player fired recently, expand crosshair (recoil visual)
    float cdRatio = player->fireCooldown / player->weapons[player->currentWeapon].fireRate;
    if (cdRatio > 0.0f) {
        gap += (int)(cdRatio * 12.0f);
    }
    
    DrawLine(centerX - gap - length, centerY, centerX - gap, centerY, crosshairColor);
    DrawLine(centerX + gap, centerY, centerX + gap + length, centerY, crosshairColor);
    DrawLine(centerX, centerY - gap - length, centerX, centerY - gap, crosshairColor);
    DrawLine(centerX, centerY + gap, centerX, centerY + gap + length, crosshairColor);
    
    // Small center dot
    DrawPixel(centerX, centerY, crosshairColor);
    
    // 2. Health Bar (Bottom-Left)
    int hudY = screenHeight - 65;
    int hudX = 40;
    
    DrawRectangleRounded((Rectangle){ (float)hudX, (float)hudY, 220.0f, 35.0f }, 0.3f, 4, (Color){ 10, 10, 15, 180 });
    DrawRectangleRoundedLines((Rectangle){ (float)hudX, (float)hudY, 220.0f, 35.0f }, 0.3f, 4, (Color){ 100, 100, 120, 120 });
    
    // HP Fill
    float hpPercent = player->health / player->maxHealth;
    Color hpColor = (hpPercent > 0.5f) ? (Color){ 0, 255, 150, 220 } : ((hpPercent > 0.25f) ? (Color){ 255, 180, 0, 220 } : (Color){ 255, 50, 50, 240 });
    
    if (hpPercent > 0.0f) {
        DrawRectangleRounded((Rectangle){ (float)hudX + 5, (float)hudY + 5, 210.0f * hpPercent, 25.0f }, 0.3f, 4, hpColor);
    }
    
    // HP Text
    DrawText(TextFormat("HP: %d", (int)player->health), hudX + 15, hudY + 8, 18, WHITE);
    
    // 3. Weapon & Ammo (Bottom-Right)
    int ammoX = screenWidth - 260;
    DrawRectangleRounded((Rectangle){ (float)ammoX, (float)hudY, 220.0f, 35.0f }, 0.3f, 4, (Color){ 10, 10, 15, 180 });
    DrawRectangleRoundedLines((Rectangle){ (float)ammoX, (float)hudY, 220.0f, 35.0f }, 0.3f, 4, (Color){ 100, 100, 120, 120 });
    
    Weapon *w = &player->weapons[player->currentWeapon];
    
    // Weapon Name (Slightly above)
    DrawText(w->name, ammoX + 5, hudY - 22, 16, (player->currentWeapon == WEAPON_PLASMA) ? (Color){ 0, 240, 255, 255 } : (Color){ 255, 150, 0, 255 });
    
    // Ammo Count
    if (player->isReloading) {
        DrawText("RELOADING...", ammoX + 15, hudY + 8, 18, (Color){ 255, 200, 0, 255 });
    } else {
        DrawText(TextFormat("AMMO: %d / %d", w->clip, w->reserve), ammoX + 15, hudY + 8, 18, WHITE);
    }
    
    // Sprint meter or instructions
    DrawText("L-SHIFT: SPRINT   SPACE: JUMP   1/2: SWITCH", 40, screenHeight - 95, 14, (Color){ 150, 150, 180, 200 });
}
