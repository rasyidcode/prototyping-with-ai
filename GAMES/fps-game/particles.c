#include "particles.h"
#include <stdlib.h>

static Particle particles[MAX_PARTICLES] = { 0 };

static float GetRandomFloat(float min, float max) {
    return min + ((float)rand() / RAND_MAX) * (max - min);
}

void InitParticles(void) {
    for (int i = 0; i < MAX_PARTICLES; i++) {
        particles[i].active = false;
    }
}

void SpawnExplosion(Vector3 position, Color color, int count, float speed) {
    int spawned = 0;
    for (int i = 0; i < MAX_PARTICLES && spawned < count; i++) {
        if (!particles[i].active) {
            particles[i].active = true;
            particles[i].position = position;
            
            // Random direction in 3D
            float theta = GetRandomFloat(0, 2.0f * PI);
            float phi = acosf(GetRandomFloat(-1.0f, 1.0f));
            
            Vector3 dir = {
                sinf(phi) * cosf(theta),
                sinf(phi) * sinf(theta),
                cosf(phi)
            };
            
            float pSpeed = GetRandomFloat(0.3f, 1.2f) * speed;
            particles[i].velocity = Vector3Scale(dir, pSpeed);
            
            // Slightly vary color
            Color c = color;
            c.r = (unsigned char)Clamp(c.r + rand() % 40 - 20, 0, 255);
            c.g = (unsigned char)Clamp(c.g + rand() % 40 - 20, 0, 255);
            c.b = (unsigned char)Clamp(c.b + rand() % 40 - 20, 0, 255);
            particles[i].color = c;
            
            particles[i].size = GetRandomFloat(0.08f, 0.2f);
            particles[i].life = particles[i].maxLife = GetRandomFloat(0.4f, 0.9f);
            
            spawned++;
        }
    }
}

void SpawnSparks(Vector3 position, Vector3 direction, Color color, int count, float speed) {
    int spawned = 0;
    for (int i = 0; i < MAX_PARTICLES && spawned < count; i++) {
        if (!particles[i].active) {
            particles[i].active = true;
            particles[i].position = position;
            
            // Generate a random vector to add spread to the direction
            Vector3 randomDir = {
                GetRandomFloat(-0.5f, 0.5f),
                GetRandomFloat(-0.5f, 0.5f),
                GetRandomFloat(-0.5f, 0.5f)
            };
            
            Vector3 sparkDir = Vector3Normalize(Vector3Add(direction, randomDir));
            float pSpeed = GetRandomFloat(0.5f, 1.5f) * speed;
            particles[i].velocity = Vector3Scale(sparkDir, pSpeed);
            
            particles[i].color = color;
            particles[i].size = GetRandomFloat(0.05f, 0.12f);
            particles[i].life = particles[i].maxLife = GetRandomFloat(0.2f, 0.5f);
            
            spawned++;
        }
    }
}

void UpdateParticles(float dt) {
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (particles[i].active) {
            // Apply slight gravity and drag
            particles[i].velocity.y -= 3.0f * dt;
            particles[i].velocity = Vector3Scale(particles[i].velocity, 0.98f);
            
            particles[i].position = Vector3Add(particles[i].position, Vector3Scale(particles[i].velocity, dt));
            particles[i].life -= dt;
            
            if (particles[i].life <= 0) {
                particles[i].active = false;
            }
        }
    }
}

void DrawParticles(void) {
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (particles[i].active) {
            // Fade size out over lifetime
            float ratio = particles[i].life / particles[i].maxLife;
            float size = particles[i].size * ratio;
            
            // Fade alpha out slightly
            Color col = particles[i].color;
            col.a = (unsigned char)(255 * ratio);
            
            DrawCube(particles[i].position, size, size, size, col);
        }
    }
}
