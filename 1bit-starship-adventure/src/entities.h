#ifndef ENTITIES_H
#define ENTITIES_H

#include "raylib.h"

#include <stdbool.h>

#include "config.h"

typedef enum AlienType {
    ALIEN_SCOUT,
    ALIEN_FIGHTER,
    ALIEN_DRIFTER,
    ALIEN_BRUTE
} AlienType;

typedef struct Bullet {
    Vector2 pos;
    bool active;
} Bullet;

typedef struct Alien {
    Rectangle rect;
    AlienType type;
    float speed;
    float baseY;
    float phase;
    int health;
    int scoreValue;
    bool active;
} Alien;

typedef struct Star {
    Vector2 pos;
    float speed;
} Star;

typedef struct Particle {
    Vector2 pos;
    Vector2 vel;
    float ttl;
    bool active;
} Particle;

Rectangle PlayerRect(Vector2 pos);
void InitStars(Star stars[]);
void UpdateStars(Star stars[], float dt);
void ResetBullets(Bullet bullets[]);
void ResetAliens(Alien aliens[]);
void ResetParticles(Particle particles[]);
void FireBullet(Bullet bullets[], Vector2 player);
bool SpawnAlien(Alien aliens[], AlienType type, float y, int wave);
int ActiveAlienCount(const Alien aliens[]);
void SpawnBurst(Particle particles[], Vector2 origin);
void UpdateBullets(Bullet bullets[], float dt);
void UpdateAliens(Alien aliens[], float dt);
void UpdateParticles(Particle particles[], float dt);
void DrawStars(const Star stars[]);
void DrawBullets(const Bullet bullets[]);
void DrawAliens(const Alien aliens[]);
void DrawParticles(const Particle particles[]);
void DrawStarship(Vector2 player);

#endif
