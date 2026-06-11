#include "enemy.h"
#include "player.h"
#include "map.h"
#include "particles.h"
#include "sound_synth.h"
#include <math.h>
#include <stdlib.h>

Enemy enemies[MAX_ENEMIES] = { 0 };
extern Bullet bullets[MAX_BULLETS];

static float GetRandomFloat(float min, float max) {
    return min + ((float)rand() / RAND_MAX) * (max - min);
}

void InitEnemies(void) {
    for (int i = 0; i < MAX_ENEMIES; i++) {
        enemies[i].active = false;
    }
}

void SpawnEnemyWave(int count, Vector3 playerPos) {
    int spawned = 0;
    // Cap count to maximum
    if (count > MAX_ENEMIES) count = MAX_ENEMIES;
    
    // Clear old active enemies
    for (int i = 0; i < MAX_ENEMIES; i++) {
        enemies[i].active = false;
    }
    
    for (int i = 0; i < MAX_ENEMIES && spawned < count; i++) {
        // Find empty cell in map that is far from player
        int attempts = 0;
        int col = 0, row = 0;
        Vector3 spawnPos = { 0 };
        float dist = 0.0f;
        
        do {
            col = rand() % MAP_WIDTH;
            row = rand() % MAP_HEIGHT;
            
            if (MAP_DATA[row * MAP_WIDTH + col] == 0) {
                float cellX = ((float)col - (float)MAP_WIDTH / 2.0f + 0.5f) * CELL_SIZE;
                float cellZ = ((float)row - (float)MAP_HEIGHT / 2.0f + 0.5f) * CELL_SIZE;
                spawnPos = (Vector3){ cellX, 0.0f, cellZ };
                dist = Vector3Distance(spawnPos, playerPos);
            }
            attempts++;
        } while ((dist < 15.0f || MAP_DATA[row * MAP_WIDTH + col] != 0) && attempts < 100);
        
        enemies[i].active = true;
        enemies[i].hitFlashTicks = 0;
        
        // 60% Drones, 40% Walkers
        if (GetRandomFloat(0, 1.0f) < 0.6f) {
            enemies[i].type = ENEMY_DRONE;
            enemies[i].position = (Vector3){ spawnPos.x, 2.5f, spawnPos.z };
            enemies[i].radius = 0.45f;
            enemies[i].height = 0.9f;
            enemies[i].health = enemies[i].maxHealth = 25.0f;
            enemies[i].speed = 3.2f;
            enemies[i].attackCooldown = GetRandomFloat(1.0f, 2.5f);
        } else {
            enemies[i].type = ENEMY_WALKER;
            enemies[i].position = (Vector3){ spawnPos.x, 0.0f, spawnPos.z };
            enemies[i].radius = 0.55f;
            enemies[i].height = 1.4f;
            enemies[i].health = enemies[i].maxHealth = 50.0f;
            enemies[i].speed = 4.2f;
            enemies[i].attackCooldown = 0.0f; // Walkers do melee, so cooldown represents damage ticks
        }
        
        enemies[i].velocity = (Vector3){ 0.0f, 0.0f, 0.0f };
        
        spawned++;
    }
}

void UpdateEnemies(Player *player, float dt) {
    static float soundCooldown = 0.0f;
    if (soundCooldown > 0.0f) soundCooldown -= dt;

    for (int i = 0; i < MAX_ENEMIES; i++) {
        if (!enemies[i].active) continue;
        
        Enemy *e = &enemies[i];
        
        if (e->hitFlashTicks > 0) e->hitFlashTicks--;
        
        Vector3 toPlayer = Vector3Subtract(player->position, e->position);
        float distToPlayer = Vector3Length(toPlayer);
        
        if (e->type == ENEMY_DRONE) {
            // Hovering drone AI
            // Oscillate Y position
            float hoverY = 2.4f + sinf((float)GetTime() * 2.5f + e->position.x) * 0.4f;
            e->position.y = Lerp(e->position.y, hoverY, dt * 2.0f);
            
            Vector3 targetVel = { 0 };
            
            if (distToPlayer > 13.0f) {
                // Move closer
                targetVel = Vector3Scale(Vector3Normalize(toPlayer), e->speed);
            } else if (distToPlayer < 7.0f) {
                // Back away
                targetVel = Vector3Scale(Vector3Normalize(toPlayer), -e->speed);
            } else {
                // Strafe circle around player
                Vector3 tangent = { -toPlayer.z, 0.0f, toPlayer.x };
                if (Vector3Length(tangent) > 0.0f) {
                    targetVel = Vector3Scale(Vector3Normalize(tangent), e->speed * 0.8f);
                }
            }
            
            // Apply movement
            e->velocity = Vector3Lerp(e->velocity, targetVel, dt * 3.0f);
            e->position.x += e->velocity.x * dt;
            e->position.z += e->velocity.z * dt;
            
            // Shooting
            e->attackCooldown -= dt;
            if (e->attackCooldown <= 0.0f) {
                e->attackCooldown = 2.0f + GetRandomFloat(0.0f, 1.5f);
                
                // Shoot red projectile towards player eyes
                Vector3 playerEye = player->camera.position;
                Vector3 shootDir = Vector3Normalize(Vector3Subtract(playerEye, e->position));
                
                Vector3 bVel = Vector3Scale(shootDir, 16.0f); // Slow dodgeable projectile
                SpawnBullet(e->position, bVel, 0.12f, (Color){ 255, 0, 80, 255 }, false, 15);
            }
            
        } else if (e->type == ENEMY_WALKER) {
            // Ground Walker AI - Rush Player
            e->position.y = 0.0f; // Keep on floor
            
            Vector3 dirXZ = { toPlayer.x, 0.0f, toPlayer.z };
            Vector3 targetVel = { 0 };
            if (Vector3Length(dirXZ) > 0.0f) {
                targetVel = Vector3Scale(Vector3Normalize(dirXZ), e->speed);
            }
            
            e->velocity = Vector3Lerp(e->velocity, targetVel, dt * 5.0f);
            e->position.x += e->velocity.x * dt;
            e->position.z += e->velocity.z * dt;
            
            // Melee damage on contact
            if (distToPlayer < (e->radius + player->radius)) {
                player->health -= 22.0f * dt; // Tick down health
                
                if (soundCooldown <= 0.0f && player->health > 0.0f) {
                    PlayGameSound(SND_HIT_PLAYER);
                    soundCooldown = 0.4f;
                }
            }
        }
        
        // Wall Collision
        Vector3 resolved;
        if (CheckMapCollision(e->position, e->radius, &resolved)) {
            e->position.x = resolved.x;
            e->position.z = resolved.z;
        }
    }
}

void DrawEnemies(void) {
    float time = (float)GetTime();
    
    for (int i = 0; i < MAX_ENEMIES; i++) {
        if (!enemies[i].active) continue;
        
        Enemy *e = &enemies[i];
        
        // Determine color (flash white if hit)
        Color bodyColor = (e->type == ENEMY_DRONE) ? (Color){ 40, 35, 50, 255 } : (Color){ 50, 45, 40, 255 };
        Color glowColor = (e->type == ENEMY_DRONE) ? (Color){ 255, 0, 100, 255 } : (Color){ 0, 255, 120, 255 };
        
        if (e->hitFlashTicks > 0) {
            bodyColor = WHITE;
            glowColor = WHITE;
        }
        
        if (e->type == ENEMY_DRONE) {
            // 1. Drone Render
            // Sphere body
            DrawSphere(e->position, e->radius, bodyColor);
            
            // Glowing cyan band around drone (two cylinders representing a hoop)
            Vector3 ringStart = Vector3Add(e->position, (Vector3){ 0.0f, -0.05f, 0.0f });
            Vector3 ringEnd = Vector3Add(e->position, (Vector3){ 0.0f, 0.05f, 0.0f });
            DrawCylinderEx(ringStart, ringEnd, e->radius + 0.04f, e->radius + 0.04f, 12, glowColor);
            
            // Hover thruster flame at bottom
            Vector3 flameStart = Vector3Add(e->position, (Vector3){ 0.0f, -e->radius * 0.8f, 0.0f });
            float flameLen = 0.15f + sinf(time * 20.0f) * 0.05f;
            Vector3 flameEnd = Vector3Add(flameStart, (Vector3){ 0.0f, -flameLen, 0.0f });
            DrawCylinderEx(flameStart, flameEnd, 0.1f, 0.01f, 6, ORANGE);
            
        } else if (e->type == ENEMY_WALKER) {
            // 2. Walker Render (animated mechanical spider)
            float bodyHeight = e->height * 0.5f;
            Vector3 bodyCenter = Vector3Add(e->position, (Vector3){ 0.0f, bodyHeight + 0.3f, 0.0f });
            
            // Hexagonal main chassis
            Vector3 bodyStart = Vector3Subtract(bodyCenter, (Vector3){ 0.0f, 0.2f, 0.0f });
            Vector3 bodyEnd = Vector3Add(bodyCenter, (Vector3){ 0.0f, 0.2f, 0.0f });
            DrawCylinderEx(bodyStart, bodyEnd, e->radius, e->radius * 0.7f, 6, bodyColor);
            
            // Glowing neon visor
            Vector3 visorStart = Vector3Add(bodyCenter, (Vector3){ 0.0f, 0.05f, 0.0f });
            Vector3 visorEnd = Vector3Add(visorStart, (Vector3){ 0.0f, 0.12f, 0.0f });
            DrawCylinderEx(visorStart, visorEnd, e->radius * 0.75f, e->radius * 0.75f, 6, glowColor);
            
            // Animated Legs (scuttling)
            // Draw 4 jointed legs extending from chassis to ground
            float legCycle = time * e->speed * 2.5f;
            
            float legAngles[4] = { 45.0f, 135.0f, 225.0f, 315.0f };
            for (int l = 0; l < 4; l++) {
                float rad = legAngles[l] * DEG2RAD;
                
                // Animate leg offset based on speed
                float offsetPhase = legCycle + l * (PI / 2.0f);
                float stepHeight = fmaxf(0.0f, sinf(offsetPhase)) * 0.35f;
                float stepReach = cosf(offsetPhase) * 0.2f;
                
                // Joint 1: Chassis connection
                Vector3 joint1 = Vector3Add(bodyCenter, (Vector3){ cosf(rad) * e->radius * 0.8f, -0.1f, sinf(rad) * e->radius * 0.8f });
                
                // Joint 2: Knee (bent upwards/outwards)
                Vector3 joint2 = Vector3Add(bodyCenter, (Vector3){
                    cosf(rad) * (e->radius * 1.5f + stepReach),
                    0.2f + stepHeight,
                    sinf(rad) * (e->radius * 1.5f + stepReach)
                });
                
                // Joint 3: Foot (touching the ground)
                Vector3 joint3 = {
                    joint1.x + cosf(rad) * e->radius * 1.8f + stepReach,
                    0.0f,
                    joint1.z + sinf(rad) * e->radius * 1.8f + stepReach
                };
                
                // Draw leg segments
                DrawCylinderEx(joint1, joint2, 0.04f, 0.03f, 4, bodyColor);
                DrawCylinderEx(joint2, joint3, 0.03f, 0.015f, 4, bodyColor);
                
                // Small glowing joints
                DrawSphere(joint2, 0.05f, glowColor);
            }
        }
    }
}
