#ifndef DROPS_H
#define DROPS_H

#include "game.h"

void InitDrops(void);
void SpawnDrop(Vector3 position);
void UpdateDrops(Player *player, float dt);
void DrawDrops(void);

#endif // DROPS_H
