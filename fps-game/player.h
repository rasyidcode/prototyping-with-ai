#ifndef PLAYER_H
#define PLAYER_H

#include "game.h"

void InitPlayer(Player *player);
void UpdatePlayer(Player *player, float dt);
void DrawPlayerHUD(Player *player);
void DrawPlayerWeapon(Player *player);
void SpawnBullet(Vector3 position, Vector3 velocity, float radius, Color color, bool isPlayerOwned, int damage);

#endif // PLAYER_H
