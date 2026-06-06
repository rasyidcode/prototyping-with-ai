#ifndef MAP_H
#define MAP_H

#include "game.h"

void DrawMap(void);
bool CheckMapCollision(Vector3 position, float radius, Vector3 *resolvedPosition);
bool IsCellWall(int col, int row);
Vector3 GetSpawnPosition(void);

#endif // MAP_H
