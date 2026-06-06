#ifndef PARTICLES_H
#define PARTICLES_H

#include "game.h"

void InitParticles(void);
void UpdateParticles(float dt);
void DrawParticles(void);
void SpawnExplosion(Vector3 position, Color color, int count, float speed);
void SpawnSparks(Vector3 position, Vector3 direction, Color color, int count, float speed);

#endif // PARTICLES_H
