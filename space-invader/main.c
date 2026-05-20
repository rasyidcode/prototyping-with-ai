#include "raylib.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <time.h>

#define SCREEN_WIDTH 800
#define SCREEN_HEIGHT 600
#define PLAYER_SPEED 300.0f
#define PLAYER_SIZE 40
#define MAX_PLAYER_BULLETS 10
#define BULLET_SPEED 500.0f
#define ENEMY_ROWS 5
#define ENEMY_COLS 10
#define ENEMY_SIZE 30
#define ENEMY_SPACING 20
#define ENEMY_MOVE_SPEED 100.0f
#define ENEMY_DOWN_STEP 20.0f
#define MAX_ENEMY_BULLETS 15
#define MAX_SHIELDS 4
#define SHIELD_BLOCKS_X 5
#define SHIELD_BLOCKS_Y 4
#define SHIELD_BLOCK_SIZE 10

typedef struct {
    Vector2 position;
    bool active;
} Bullet;

typedef struct {
    Vector2 position;
    bool active;
    int health;
} ShieldBlock;

typedef struct {
    Vector2 position;
    bool active;
    int type;
} Enemy;

typedef struct {
    Vector2 position;
    int lives;
    int score;
} Player;

typedef enum {
    STATE_TITLE,
    STATE_PLAYING,
    STATE_GAME_OVER,
    STATE_VICTORY
} GameState;

typedef struct {
    Player player;
    Bullet playerBullets[MAX_PLAYER_BULLETS];
    Enemy enemies[ENEMY_ROWS * ENEMY_COLS];
    Bullet enemyBullets[MAX_ENEMY_BULLETS];
    ShieldBlock shields[MAX_SHIELDS * SHIELD_BLOCKS_X * SHIELD_BLOCKS_Y];
    GameState state;
    int score;
    int enemyDirection; // 1 for right, -1 for left
    float enemyMoveTimer;
    float enemyFireTimer;
} Game;

// Global game state
Game game = { 0 };

void InitGame(void) {
    game.player.position = (Vector2){ SCREEN_WIDTH / 2.0f - PLAYER_SIZE / 2.0f, SCREEN_HEIGHT - 60 };
    game.player.lives = 3;
    game.player.score = 0;
    game.state = STATE_TITLE;
    game.score = 0;
    game.enemyDirection = 1;
    game.enemyMoveTimer = 0;
    game.enemyFireTimer = 0;

    // Init player bullets
    for (int i = 0; i < MAX_PLAYER_BULLETS; i++) {
        game.playerBullets[i].active = false;
    }

    // Init enemy bullets
    for (int i = 0; i < MAX_ENEMY_BULLETS; i++) {
        game.enemyBullets[i].active = false;
    }

    // Init enemies
    for (int row = 0; row < ENEMY_ROWS; row++) {
        for (int col = 0; col < ENEMY_COLS; col++) {
            int index = row * ENEMY_COLS + col;
            game.enemies[index].position = (Vector2){ 
                (float)(50 + col * (ENEMY_SIZE + ENEMY_SPACING)), 
                (float)(50 + row * (ENEMY_SIZE + ENEMY_SPACING)) 
            };
            game.enemies[index].active = true;
            game.enemies[index].type = row; // Different types per row
        }
    }

    // Init shields
    int blocksPerShield = SHIELD_BLOCKS_X * SHIELD_BLOCKS_Y;
    for (int s = 0; s < MAX_SHIELDS; s++) {
        float shieldX = (SCREEN_WIDTH / (MAX_SHIELDS + 1)) * (s + 1) - (SHIELD_BLOCKS_X * SHIELD_BLOCK_SIZE) / 2.0f;
        float shieldY = SCREEN_HEIGHT - 150;
        
        for (int y = 0; y < SHIELD_BLOCKS_Y; y++) {
            for (int x = 0; x < SHIELD_BLOCKS_X; x++) {
                int index = s * blocksPerShield + y * SHIELD_BLOCKS_X + x;
                game.shields[index].position = (Vector2){ shieldX + x * SHIELD_BLOCK_SIZE, shieldY + y * SHIELD_BLOCK_SIZE };
                game.shields[index].active = true;
                game.shields[index].health = 2; // Can take 2 hits
            }
        }
    }
}

void UpdateGame(float deltaTime) {
    if (game.state == STATE_TITLE) {
        if (IsKeyPressed(KEY_ENTER)) {
            game.state = STATE_PLAYING;
        }
    } else if (game.state == STATE_PLAYING) {
        // Player Movement
        if (IsKeyDown(KEY_LEFT)) game.player.position.x -= PLAYER_SPEED * deltaTime;
        if (IsKeyDown(KEY_RIGHT)) game.player.position.x += PLAYER_SPEED * deltaTime;

        // Clamp player to screen
        if (game.player.position.x < 0) game.player.position.x = 0;
        if (game.player.position.x > SCREEN_WIDTH - PLAYER_SIZE) game.player.position.x = SCREEN_WIDTH - PLAYER_SIZE;

        // Shooting
        if (IsKeyPressed(KEY_SPACE)) {
            for (int i = 0; i < MAX_PLAYER_BULLETS; i++) {
                if (!game.playerBullets[i].active) {
                    game.playerBullets[i].position = (Vector2){ game.player.position.x + PLAYER_SIZE / 2 - 2, game.player.position.y };
                    game.playerBullets[i].active = true;
                    break;
                }
            }
        }

        // Update Player Bullets
        for (int i = 0; i < MAX_PLAYER_BULLETS; i++) {
            if (game.playerBullets[i].active) {
                game.playerBullets[i].position.y -= BULLET_SPEED * deltaTime;
                if (game.playerBullets[i].position.y < 0) game.playerBullets[i].active = false;

                // Collision with enemies
                for (int j = 0; j < ENEMY_ROWS * ENEMY_COLS; j++) {
                    if (game.enemies[j].active) {
                        if (CheckCollisionRecs(
                            (Rectangle){ game.playerBullets[i].position.x, game.playerBullets[i].position.y, 4, 15 },
                            (Rectangle){ game.enemies[j].position.x, game.enemies[j].position.y, ENEMY_SIZE, ENEMY_SIZE }
                        )) {
                            game.enemies[j].active = false;
                            game.playerBullets[i].active = false;
                            game.score += (5 - (j / ENEMY_COLS)) * 10;
                            break;
                        }
                    }
                }

                // Collision with shields
                if (game.playerBullets[i].active) {
                    for (int j = 0; j < MAX_SHIELDS * SHIELD_BLOCKS_X * SHIELD_BLOCKS_Y; j++) {
                        if (game.shields[j].active) {
                            if (CheckCollisionRecs(
                                (Rectangle){ game.playerBullets[i].position.x, game.playerBullets[i].position.y, 4, 15 },
                                (Rectangle){ game.shields[j].position.x, game.shields[j].position.y, SHIELD_BLOCK_SIZE, SHIELD_BLOCK_SIZE }
                            )) {
                                game.playerBullets[i].active = false;
                                game.shields[j].health--;
                                if (game.shields[j].health <= 0) game.shields[j].active = false;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Enemy Firing
        game.enemyFireTimer += deltaTime;
        if (game.enemyFireTimer > 1.0f) { // Every second, try to fire
            game.enemyFireTimer = 0;
            // Pick a random active enemy to fire
            int activeEnemies[ENEMY_ROWS * ENEMY_COLS];
            int activeCount = 0;
            for (int i = 0; i < ENEMY_ROWS * ENEMY_COLS; i++) {
                if (game.enemies[i].active) activeEnemies[activeCount++] = i;
            }

            if (activeCount > 0) {
                int shooterIndex = activeEnemies[rand() % activeCount];
                for (int i = 0; i < MAX_ENEMY_BULLETS; i++) {
                    if (!game.enemyBullets[i].active) {
                        game.enemyBullets[i].position = (Vector2){ 
                            game.enemies[shooterIndex].position.x + ENEMY_SIZE / 2, 
                            game.enemies[shooterIndex].position.y + ENEMY_SIZE 
                        };
                        game.enemyBullets[i].active = true;
                        break;
                    }
                }
            } else {
                game.state = STATE_VICTORY;
            }
        }

        // Update Enemy Bullets
        for (int i = 0; i < MAX_ENEMY_BULLETS; i++) {
            if (game.enemyBullets[i].active) {
                game.enemyBullets[i].position.y += (BULLET_SPEED * 0.6f) * deltaTime;
                if (game.enemyBullets[i].position.y > SCREEN_HEIGHT) game.enemyBullets[i].active = false;

                // Collision with player
                if (CheckCollisionRecs(
                    (Rectangle){ game.enemyBullets[i].position.x, game.enemyBullets[i].position.y, 4, 15 },
                    (Rectangle){ game.player.position.x, game.player.position.y, PLAYER_SIZE, 20 }
                )) {
                    game.enemyBullets[i].active = false;
                    game.player.lives--;
                    if (game.player.lives <= 0) game.state = STATE_GAME_OVER;
                    else {
                        // Reset player position? (optional)
                    }
                }

                // Collision with shields
                if (game.enemyBullets[i].active) {
                    for (int j = 0; j < MAX_SHIELDS * SHIELD_BLOCKS_X * SHIELD_BLOCKS_Y; j++) {
                        if (game.shields[j].active) {
                            if (CheckCollisionRecs(
                                (Rectangle){ game.enemyBullets[i].position.x, game.enemyBullets[i].position.y, 4, 15 },
                                (Rectangle){ game.shields[j].position.x, game.shields[j].position.y, SHIELD_BLOCK_SIZE, SHIELD_BLOCK_SIZE }
                            )) {
                                game.enemyBullets[i].active = false;
                                game.shields[j].health--;
                                if (game.shields[j].health <= 0) game.shields[j].active = false;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Update Enemies
        bool shouldMoveDown = false;
        for (int i = 0; i < ENEMY_ROWS * ENEMY_COLS; i++) {
            if (game.enemies[i].active) {
                game.enemies[i].position.x += game.enemyDirection * ENEMY_MOVE_SPEED * deltaTime;
                
                if (game.enemies[i].position.x > SCREEN_WIDTH - ENEMY_SIZE || game.enemies[i].position.x < 0) {
                    shouldMoveDown = true;
                }
            }
        }

        if (shouldMoveDown) {
            game.enemyDirection *= -1;
            for (int i = 0; i < ENEMY_ROWS * ENEMY_COLS; i++) {
                if (game.enemies[i].active) {
                    game.enemies[i].position.y += ENEMY_DOWN_STEP;
                    // Check for Game Over (Enemies reached player level)
                    if (game.enemies[i].position.y > game.player.position.y - ENEMY_SIZE) {
                        game.state = STATE_GAME_OVER;
                    }
                }
            }
        }

        if (IsKeyPressed(KEY_Q)) game.state = STATE_GAME_OVER;
    } else if (game.state == STATE_GAME_OVER || game.state == STATE_VICTORY) {
        if (IsKeyPressed(KEY_ENTER)) {
            InitGame();
            game.state = STATE_PLAYING;
        }
    }

}

void DrawGame(void) {
    BeginDrawing();
    ClearBackground(BLACK);

    if (game.state == STATE_TITLE) {
        DrawText("SPACE INVADERS", SCREEN_WIDTH / 2 - MeasureText("SPACE INVADERS", 40) / 2, SCREEN_HEIGHT / 2 - 40, 40, GREEN);
        DrawText("PRESS ENTER TO START", SCREEN_WIDTH / 2 - MeasureText("PRESS ENTER TO START", 20) / 2, SCREEN_HEIGHT / 2 + 20, 20, WHITE);
    } else if (game.state == STATE_PLAYING) {
        // Draw Player (Retro style rectangle)
        DrawRectangleV(game.player.position, (Vector2){ PLAYER_SIZE, 20 }, GREEN);
        DrawRectangle(game.player.position.x + PLAYER_SIZE / 2 - 5, game.player.position.y - 10, 10, 10, GREEN);

        // Draw Player Bullets
        for (int i = 0; i < MAX_PLAYER_BULLETS; i++) {
            if (game.playerBullets[i].active) {
                DrawRectangleV(game.playerBullets[i].position, (Vector2){ 4, 15 }, YELLOW);
            }
        }

        // Draw Enemy Bullets
        for (int i = 0; i < MAX_ENEMY_BULLETS; i++) {
            if (game.enemyBullets[i].active) {
                DrawRectangleV(game.enemyBullets[i].position, (Vector2){ 4, 15 }, RED);
            }
        }

        // Draw Shields
        for (int i = 0; i < MAX_SHIELDS * SHIELD_BLOCKS_X * SHIELD_BLOCKS_Y; i++) {
            if (game.shields[i].active) {
                Color shieldColor = GREEN;
                if (game.shields[i].health == 1) shieldColor = DARKGREEN;
                DrawRectangleV(game.shields[i].position, (Vector2){ SHIELD_BLOCK_SIZE, SHIELD_BLOCK_SIZE }, shieldColor);
            }
        }

        // Draw Enemies
        for (int i = 0; i < ENEMY_ROWS * ENEMY_COLS; i++) {
            if (game.enemies[i].active) {
                Color enemyColor = WHITE;
                if (game.enemies[i].type == 0) enemyColor = MAGENTA;
                else if (game.enemies[i].type == 1) enemyColor = SKYBLUE;
                else if (game.enemies[i].type == 2) enemyColor = GREEN;

                DrawRectangleV(game.enemies[i].position, (Vector2){ ENEMY_SIZE, ENEMY_SIZE }, enemyColor);
                // Simple eyes for the invaders
                DrawRectangle(game.enemies[i].position.x + 5, game.enemies[i].position.y + 5, 5, 5, BLACK);
                DrawRectangle(game.enemies[i].position.x + ENEMY_SIZE - 10, game.enemies[i].position.y + 5, 5, 5, BLACK);
            }
        }

        // UI
        DrawText(TextFormat("SCORE: %05d", game.score), 10, 10, 20, WHITE);
        DrawText(TextFormat("LIVES: %d", game.player.lives), SCREEN_WIDTH - 120, 10, 20, WHITE);
    } else if (game.state == STATE_GAME_OVER) {
        DrawText("GAME OVER", SCREEN_WIDTH / 2 - MeasureText("GAME OVER", 40) / 2, SCREEN_HEIGHT / 2 - 40, 40, RED);
        DrawText(TextFormat("FINAL SCORE: %d", game.score), SCREEN_WIDTH / 2 - MeasureText(TextFormat("FINAL SCORE: %d", game.score), 20) / 2, SCREEN_HEIGHT / 2, 20, WHITE);
        DrawText("PRESS ENTER TO RESTART", SCREEN_WIDTH / 2 - MeasureText("PRESS ENTER TO RESTART", 20) / 2, SCREEN_HEIGHT / 2 + 40, 20, WHITE);
    } else if (game.state == STATE_VICTORY) {
        DrawText("VICTORY!", SCREEN_WIDTH / 2 - MeasureText("VICTORY!", 40) / 2, SCREEN_HEIGHT / 2 - 40, 40, GOLD);
        DrawText(TextFormat("FINAL SCORE: %d", game.score), SCREEN_WIDTH / 2 - MeasureText(TextFormat("FINAL SCORE: %d", game.score), 20) / 2, SCREEN_HEIGHT / 2, 20, WHITE);
        DrawText("PRESS ENTER TO PLAY AGAIN", SCREEN_WIDTH / 2 - MeasureText("PRESS ENTER TO PLAY AGAIN", 20) / 2, SCREEN_HEIGHT / 2 + 40, 20, WHITE);
    }


    EndDrawing();
}

int main(void) {
    srand(time(NULL));
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "Space Invaders - Raylib");
    SetTargetFPS(60);

    InitGame();

    while (!WindowShouldClose()) {
        UpdateGame(GetFrameTime());
        DrawGame();
    }

    CloseWindow();
    return 0;
}
