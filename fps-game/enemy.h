#ifndef ENEMY_H
#define ENEMY_H

#include "game.h"

void InitEnemies(void);
void SpawnEnemyWave(int count, Vector3 playerPos);
void UpdateEnemies(Player *player, float dt);
void DrawEnemies(void);

#endif // ENEMY_H
