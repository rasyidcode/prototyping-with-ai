#ifndef MAP_H
#define MAP_H

#include "common.h"

bool IsWall(float x, float z);
Vector3 CheckCollisionAndMove(Vector3 oldPos, Vector3 newPos, float radius);
bool HasLineOfSight(Vector3 start, Vector3 end);
void UpdateDoors(void);

#endif // MAP_H
