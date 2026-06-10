#ifndef GAME_H
#define GAME_H

#include "entities.h"
#include "waves.h"

typedef struct Game {
    Vector2 player;
    Bullet bullets[MAX_BULLETS];
    Alien aliens[MAX_ALIENS];
    Star stars[MAX_STARS];
    Particle particles[MAX_PARTICLES];
    WaveController waves;
    int score;
    int lives;
    float shootTimer;
    bool gameOver;
} Game;

void InitGame(Game *game);
void UpdateGame(Game *game, float dt);
void DrawGame(const Game *game);

#endif
