#include "drops.h"
#include "particles.h"
#include "sound_synth.h"
#include <stdlib.h>
#include <math.h>

static Drop drops[MAX_DROPS] = { 0 };

static float GetRandomFloat(float min, float max) {
    return min + ((float)rand() / RAND_MAX) * (max - min);
}

void InitDrops(void) {
    for (int i = 0; i < MAX_DROPS; i++) {
        drops[i].active = false;
    }
}

void SpawnDrop(Vector3 position) {
    // 40% chance of no drop
    if (GetRandomFloat(0, 1.0f) < 0.40f) return;
    
    // Find free slot
    for (int i = 0; i < MAX_DROPS; i++) {
        if (!drops[i].active) {
            drops[i].active = true;
            drops[i].position = (Vector3){ position.x, 0.5f, position.z };
            drops[i].radius = 0.6f;
            drops[i].lifeTime = 15.0f; // 15 seconds lifetime
            
            // 65% ammo, 35% health
            drops[i].type = (GetRandomFloat(0, 1.0f) < 0.65f) ? DROP_AMMO : DROP_HEALTH;
            break;
        }
    }
}

void UpdateDrops(Player *player, float dt) {
    for (int i = 0; i < MAX_DROPS; i++) {
        if (!drops[i].active) continue;
        
        Drop *d = &drops[i];
        
        // Count down lifetime
        d->lifeTime -= dt;
        if (d->lifeTime <= 0.0f) {
            d->active = false;
            continue;
        }
        
        // Check collision with player (horizontal distance)
        float dx = player->position.x - d->position.x;
        float dz = player->position.z - d->position.z;
        float distSq = dx * dx + dz * dz;
        float pickupRange = player->radius + d->radius;
        
        if (distSq < pickupRange * pickupRange) {
            // Trigger pickup effect
            d->active = false;
            PlayGameSound(SND_PICKUP);
            
            if (d->type == DROP_HEALTH) {
                // Heal player +25 HP
                player->health = Clamp(player->health + 25.0f, 0.0f, player->maxHealth);
                
                // Spawn green sparks
                SpawnExplosion(d->position, GREEN, 16, 4.0f);
            } else {
                // Add ammo to reserves
                Weapon *plasma = &player->weapons[WEAPON_PLASMA];
                Weapon *shotgun = &player->weapons[WEAPON_SHOTGUN];
                
                plasma->reserve = Clamp(plasma->reserve + 30, 0, plasma->maxReserve);
                shotgun->reserve = Clamp(shotgun->reserve + 8, 0, shotgun->maxReserve);
                
                // Spawn cyan sparks
                SpawnExplosion(d->position, (Color){ 0, 240, 255, 255 }, 16, 4.0f);
            }
        }
    }
}

void DrawDrops(void) {
    float time = (float)GetTime();
    
    for (int i = 0; i < MAX_DROPS; i++) {
        if (!drops[i].active) continue;
        
        Drop *d = &drops[i];
        
        // Blink if lifetime is short (< 4s) to alert player
        if (d->lifeTime < 4.0f) {
            // Blink faster as time decreases
            float rate = (d->lifeTime < 1.5f) ? 15.0f : 8.0f;
            int blink = (int)(d->lifeTime * rate) % 2;
            if (blink == 0) continue; // Skip rendering this frame
        }
        
        // Hover and rotate
        float bob = sinf(time * 3.5f + d->position.x) * 0.15f;
        Vector3 drawPos = { d->position.x, d->position.y + bob, d->position.z };
        
        if (d->type == DROP_HEALTH) {
            // Health Canister - Neon Green Cross Shape
            DrawCube(drawPos, 0.18f, 0.42f, 0.18f, LIME);
            DrawCube(drawPos, 0.42f, 0.18f, 0.18f, LIME);
            DrawCubeWires(drawPos, 0.20f, 0.44f, 0.20f, GREEN);
            DrawCubeWires(drawPos, 0.44f, 0.20f, 0.20f, GREEN);
        } else {
            // Ammo Canister - Neon Cyan Cylinder/Core Shape
            Vector3 top = Vector3Add(drawPos, (Vector3){ 0.0f, 0.18f, 0.0f });
            Vector3 bottom = Vector3Subtract(drawPos, (Vector3){ 0.0f, 0.18f, 0.0f });
            
            // Double tube look
            DrawCylinderEx(bottom, top, 0.14f, 0.14f, 8, (Color){ 20, 30, 45, 255 });
            DrawCylinderEx(bottom, top, 0.08f, 0.08f, 8, (Color){ 0, 240, 255, 255 });
            
            // Thin glowing hoops around it
            DrawCylinderEx(bottom, Vector3Add(bottom, (Vector3){ 0.0f, 0.05f, 0.0f }), 0.16f, 0.16f, 8, (Color){ 0, 255, 220, 255 });
            DrawCylinderEx(Vector3Subtract(top, (Vector3){ 0.0f, 0.05f, 0.0f }), top, 0.16f, 0.16f, 8, (Color){ 0, 255, 220, 255 });
        }
    }
}
