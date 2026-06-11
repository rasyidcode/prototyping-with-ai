#include "game.h"
#include <stdlib.h>
#include <math.h>

void SpawnParticleBurst(Vector2 position, Color color, int count) {
    for (int i = 0; i < count; i++) {
        // Find an inactive slot
        int slot = -1;
        if (game.particleCount < MAX_PARTICLES) {
            slot = game.particleCount;
            game.particleCount++;
        } else {
            // Overwrite oldest/first slot if full (circular buffer behavior)
            slot = rand() % MAX_PARTICLES;
        }

        if (slot != -1) {
            Particle* p = &game.particles[slot];
            p->position = position;

            // Random angle and speed
            float angle = (float)rand() / RAND_MAX * 2.0f * PI;
            float speed = 50.0f + (float)rand() / RAND_MAX * 250.0f;
            
            p->velocity.x = cosf(angle) * speed;
            // Upward bias for juice fountain effect
            p->velocity.y = sinf(angle) * speed - 60.0f;
            
            p->color = color;
            p->radius = 3.0f + (float)rand() / RAND_MAX * 5.0f;
            p->alpha = 1.0f;
            p->maxLife = 0.4f + (float)rand() / RAND_MAX * 0.5f;
            p->life = p->maxLife;
        }
    }
}

void UpdateParticles(float dt) {
    int activeCount = 0;
    for (int i = 0; i < game.particleCount; i++) {
        Particle* p = &game.particles[i];
        p->life -= dt;

        if (p->life > 0.0f) {
            // Apply simple physics to particles
            p->velocity.y += 300.0f * dt; // Gravity
            p->velocity.x *= 0.96f;       // Drag
            p->velocity.y *= 0.96f;

            p->position.x += p->velocity.x * dt;
            p->position.y += p->velocity.y * dt;

            // Fade out
            p->alpha = p->life / p->maxLife;

            // Keep in array
            if (activeCount != i) {
                game.particles[activeCount] = *p;
            }
            activeCount++;
        }
    }
    game.particleCount = activeCount;
}

void DrawParticles(void) {
    for (int i = 0; i < game.particleCount; i++) {
        Particle* p = &game.particles[i];
        Color c = p->color;
        c.a = (unsigned char)(p->alpha * 255.0f);
        
        // Draw nice particle glowing circle or soft circle
        DrawCircleV(p->position, p->radius, c);
        
        // Draw a tiny bright center
        Color bright = WHITE;
        bright.a = c.a;
        DrawCircleV(p->position, p->radius * 0.4f, bright);
    }
}
