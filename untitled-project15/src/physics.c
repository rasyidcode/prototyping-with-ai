#include "game.h"
#include "raymath.h"
#include <math.h>
#include <stdio.h>

void UpdatePhysics(float dt) {
    float substepDt = dt / PHYSICS_SUBSTEPS;

    for (int step = 0; step < PHYSICS_SUBSTEPS; step++) {
        // 1. Apply gravity & air resistance, and update positions
        for (int i = 0; i < game.fruitCount; i++) {
            Fruit* f = &game.fruits[i];
            if (!f->active || f->isStatic) continue;

            // Apply gravity
            f->velocity.y += GRAVITY * substepDt;
            
            // Apply air resistance
            f->velocity.x *= AIR_RESISTANCE;
            f->velocity.y *= AIR_RESISTANCE;

            // Update position
            f->position.x += f->velocity.x * substepDt;
            f->position.y += f->velocity.y * substepDt;

            // Simple rotation based on horizontal velocity
            f->rotation += (f->velocity.x / f->radius) * substepDt * 2.0f;
        }

        // 2. Resolve boundary (wall/floor) collisions
        for (int i = 0; i < game.fruitCount; i++) {
            Fruit* f = &game.fruits[i];
            if (!f->active || f->isStatic) continue;
            ResolveBoundaryCollisions(f);
        }

        // 3. Resolve circle-circle collisions and merging
        ResolveCircleCollisions();
    }
}

void ResolveBoundaryCollisions(Fruit* f) {
    // Left boundary
    float minX = CONTAINER_X + f->radius;
    if (f->position.x < minX) {
        f->position.x = minX;
        f->velocity.x = -f->velocity.x * BOUNCINESS;
    }

    // Right boundary
    float maxX = CONTAINER_X + CONTAINER_WIDTH - f->radius;
    if (f->position.x > maxX) {
        f->position.x = maxX;
        f->velocity.x = -f->velocity.x * BOUNCINESS;
    }

    // Bottom floor boundary
    float maxY = CONTAINER_Y + CONTAINER_HEIGHT - f->radius;
    if (f->position.y > maxY) {
        f->position.y = maxY;
        f->velocity.y = -f->velocity.y * BOUNCINESS;
        // Apply friction/rolling dampening against the floor
        f->velocity.x *= FRICTION;
    }
}

void ResolveCircleCollisions(void) {
    for (int i = 0; i < game.fruitCount; i++) {
        Fruit* f1 = &game.fruits[i];
        if (!f1->active || f1->isStatic) continue;

        for (int j = i + 1; j < game.fruitCount; j++) {
            Fruit* f2 = &game.fruits[j];
            if (!f2->active || f2->isStatic) continue;

            // Vector between centers
            Vector2 delta = Vector2Subtract(f2->position, f1->position);
            float distSq = delta.x * delta.x + delta.y * delta.y;
            float radiusSum = f1->radius + f2->radius;

            if (distSq < radiusSum * radiusSum) {
                float dist = sqrtf(distSq);
                if (dist == 0.0f) continue; // Avoid division by zero

                Vector2 normal = Vector2Scale(delta, 1.0f / dist);
                float penetration = radiusSum - dist;

                // --- POSITIONAL CORRECTION (PREVENT SINKING) ---
                float totalMass = f1->mass + f2->mass;
                float correctionPercent = 0.85f; // Slop factor for stability
                Vector2 correction = Vector2Scale(normal, (penetration / totalMass) * correctionPercent);

                f1->position = Vector2Subtract(f1->position, Vector2Scale(correction, f2->mass));
                f2->position = Vector2Add(f2->position, Vector2Scale(correction, f1->mass));

                // --- MERGE LOGIC ---
                if (f1->type == f2->type) {
                    FruitType currentType = f1->type;

                    // Deactivate fruit 2 (the other parent)
                    f2->active = false;

                    // Compute merge midpoint
                    Vector2 mergePoint = Vector2Lerp(f1->position, f2->position, 0.5f);

                    if (currentType == FRUIT_WATERMELON) {
                        // Merging two watermelons = Ultimate score and elimination!
                        f1->active = false;
                        
                        // Spawn particle burst and text
                        SpawnParticleBurst(mergePoint, FRUIT_DEFS[FRUIT_WATERMELON].color, 50);
                        SpawnFloatingText(mergePoint, "ULTIMATE +2000!", GOLD);
                        
                        game.score += 2000;
                    } else {
                        // Standard evolution
                        FruitType nextType = currentType + 1;
                        
                        f1->type = nextType;
                        f1->radius = FRUIT_DEFS[nextType].radius;
                        f1->mass = FRUIT_DEFS[nextType].mass;
                        f1->position = mergePoint;
                        
                        // Consolidate velocity with slight upward pop
                        Vector2 avgVel = Vector2Scale(Vector2Add(f1->velocity, f2->velocity), 0.5f);
                        f1->velocity = Vector2Add(avgVel, (Vector2){0.0f, -40.0f}); 
                        
                        // Set up scale-up animation for merge effect
                        f1->scale = 0.15f; 
                        f1->scaleTarget = 1.0f;

                        // Spawn nice merge particles
                        SpawnParticleBurst(mergePoint, FRUIT_DEFS[nextType].color, 25);
                        
                        // Floating score text
                        char scoreText[16];
                        sprintf(scoreText, "+%d", FRUIT_DEFS[nextType].scoreValue);
                        SpawnFloatingText(mergePoint, scoreText, FRUIT_DEFS[nextType].color);
                        
                        game.score += FRUIT_DEFS[nextType].scoreValue;
                    }

                    // Once merged, stop processing this pair to avoid invalid index dereferencing
                    break;
                }

                // --- IMPULSE RESOLUTION (ELASTIC BOUNCE) ---
                // Relative velocity
                Vector2 relVel = Vector2Subtract(f2->velocity, f1->velocity);

                // Relative velocity along normal
                float velAlongNormal = Vector2DotProduct(relVel, normal);

                // Do not resolve if velocities are separating
                if (velAlongNormal < 0.0f) {
                    float impulseScalar = -(1.0f + BOUNCINESS) * velAlongNormal;
                    impulseScalar /= (1.0f / f1->mass + 1.0f / f2->mass);

                    // Apply impulse
                    Vector2 impulse = Vector2Scale(normal, impulseScalar);
                    f1->velocity = Vector2Subtract(f1->velocity, Vector2Scale(impulse, 1.0f / f1->mass));
                    f2->velocity = Vector2Add(f2->velocity, Vector2Scale(impulse, 1.0f / f2->mass));

                    // --- TANGENTIAL FRICTION ---
                    Vector2 tangent = Vector2Subtract(relVel, Vector2Scale(normal, velAlongNormal));
                    float tangentMag = sqrtf(tangent.x * tangent.x + tangent.y * tangent.y);
                    if (tangentMag > 0.0001f) {
                        Vector2 tangentDir = Vector2Scale(tangent, 1.0f / tangentMag);
                        // Damp the relative tangential speed (friction)
                        float frictionForce = tangentMag * (1.0f - FRICTION);
                        
                        f1->velocity = Vector2Add(f1->velocity, Vector2Scale(tangentDir, frictionForce * (f2->mass / totalMass)));
                        f2->velocity = Vector2Subtract(f2->velocity, Vector2Scale(tangentDir, frictionForce * (f1->mass / totalMass)));
                    }
                }
            }
        }
    }
}
