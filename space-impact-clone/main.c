#include "raylib.h"

#include <math.h>
#include <stdbool.h>
#include <stdlib.h>

#define SCREEN_WIDTH 800
#define SCREEN_HEIGHT 450
#define MAX_BULLETS 48
#define MAX_ENEMIES 24
#define MAX_ENEMY_BULLETS 48
#define MAX_STARS 96

typedef struct Bullet {
    Vector2 position;
    float speed;
    bool active;
} Bullet;

typedef struct Enemy {
    Vector2 position;
    Vector2 velocity;
    float radius;
    float shootTimer;
    int hp;
    bool active;
} Enemy;

typedef struct Star {
    Vector2 position;
    float speed;
    float radius;
} Star;

typedef enum GameState {
    STATE_TITLE,
    STATE_PLAYING,
    STATE_GAME_OVER
} GameState;

static float ClampFloat(float value, float min, float max)
{
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

static void ResetStars(Star stars[MAX_STARS])
{
    for (int i = 0; i < MAX_STARS; i++) {
        stars[i].position = (Vector2){ (float)GetRandomValue(0, SCREEN_WIDTH), (float)GetRandomValue(0, SCREEN_HEIGHT) };
        stars[i].speed = (float)GetRandomValue(30, 160);
        stars[i].radius = (float)GetRandomValue(1, 2);
    }
}

static void ResetGame(Vector2 *player, Bullet bullets[MAX_BULLETS], Enemy enemies[MAX_ENEMIES],
                      Bullet enemyBullets[MAX_ENEMY_BULLETS], int *score, int *lives,
                      float *spawnTimer, float *shootCooldown, float *elapsed)
{
    *player = (Vector2){ 86.0f, SCREEN_HEIGHT * 0.5f };
    *score = 0;
    *lives = 3;
    *spawnTimer = 0.0f;
    *shootCooldown = 0.0f;
    *elapsed = 0.0f;

    for (int i = 0; i < MAX_BULLETS; i++) bullets[i].active = false;
    for (int i = 0; i < MAX_ENEMIES; i++) enemies[i].active = false;
    for (int i = 0; i < MAX_ENEMY_BULLETS; i++) enemyBullets[i].active = false;
}

static void SpawnPlayerBullet(Bullet bullets[MAX_BULLETS], Vector2 player)
{
    for (int i = 0; i < MAX_BULLETS; i++) {
        if (!bullets[i].active) {
            bullets[i].active = true;
            bullets[i].position = (Vector2){ player.x + 30.0f, player.y };
            bullets[i].speed = 520.0f;
            return;
        }
    }
}

static void SpawnEnemyBullet(Bullet bullets[MAX_ENEMY_BULLETS], Vector2 position)
{
    for (int i = 0; i < MAX_ENEMY_BULLETS; i++) {
        if (!bullets[i].active) {
            bullets[i].active = true;
            bullets[i].position = (Vector2){ position.x - 18.0f, position.y };
            bullets[i].speed = -260.0f;
            return;
        }
    }
}

static void SpawnEnemy(Enemy enemies[MAX_ENEMIES], float elapsed)
{
    for (int i = 0; i < MAX_ENEMIES; i++) {
        if (!enemies[i].active) {
            float speed = 120.0f + fminf(elapsed * 3.0f, 130.0f);
            enemies[i].active = true;
            enemies[i].position = (Vector2){ SCREEN_WIDTH + 32.0f, (float)GetRandomValue(45, SCREEN_HEIGHT - 45) };
            enemies[i].velocity = (Vector2){ -speed, (float)GetRandomValue(-45, 45) };
            enemies[i].radius = 15.0f;
            enemies[i].shootTimer = (float)GetRandomValue(80, 190) / 100.0f;
            enemies[i].hp = elapsed > 35.0f ? 2 : 1;
            return;
        }
    }
}

static void DrawPlayer(Vector2 player)
{
    Vector2 nose = { player.x + 27.0f, player.y };
    Vector2 top = { player.x - 20.0f, player.y - 15.0f };
    Vector2 bottom = { player.x - 20.0f, player.y + 15.0f };
    Vector2 wingTop = { player.x - 4.0f, player.y - 25.0f };
    Vector2 wingBottom = { player.x - 4.0f, player.y + 25.0f };

    DrawTriangle(wingTop, (Vector2){ player.x + 8.0f, player.y - 5.0f }, top, DARKGREEN);
    DrawTriangle(bottom, (Vector2){ player.x + 8.0f, player.y + 5.0f }, wingBottom, DARKGREEN);
    DrawTriangle(nose, top, bottom, LIME);
    DrawRectangle((int)player.x - 23, (int)player.y - 6, 12, 12, GREEN);
    DrawCircleV((Vector2){ player.x + 8.0f, player.y }, 3.0f, RAYWHITE);
}

static void DrawEnemy(Enemy enemy)
{
    Rectangle body = { enemy.position.x - 16.0f, enemy.position.y - 12.0f, 32.0f, 24.0f };
    DrawRectangleRec(body, MAROON);
    DrawTriangle((Vector2){ enemy.position.x - 22.0f, enemy.position.y },
                 (Vector2){ enemy.position.x + 14.0f, enemy.position.y - 20.0f },
                 (Vector2){ enemy.position.x + 14.0f, enemy.position.y + 20.0f }, RED);
    DrawCircleV((Vector2){ enemy.position.x - 8.0f, enemy.position.y }, 3.0f, ORANGE);
}

int main(void)
{
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "Space Impact Clone");
    SetTargetFPS(60);

    Vector2 player = { 0 };
    Bullet bullets[MAX_BULLETS] = { 0 };
    Bullet enemyBullets[MAX_ENEMY_BULLETS] = { 0 };
    Enemy enemies[MAX_ENEMIES] = { 0 };
    Star stars[MAX_STARS] = { 0 };
    GameState state = STATE_TITLE;
    int score = 0;
    int lives = 3;
    float spawnTimer = 0.0f;
    float shootCooldown = 0.0f;
    float elapsed = 0.0f;

    ResetStars(stars);
    ResetGame(&player, bullets, enemies, enemyBullets, &score, &lives, &spawnTimer, &shootCooldown, &elapsed);

    while (!WindowShouldClose()) {
        float dt = GetFrameTime();

        for (int i = 0; i < MAX_STARS; i++) {
            stars[i].position.x -= stars[i].speed * dt;
            if (stars[i].position.x < -3.0f) {
                stars[i].position.x = SCREEN_WIDTH + 3.0f;
                stars[i].position.y = (float)GetRandomValue(0, SCREEN_HEIGHT);
            }
        }

        if ((state == STATE_TITLE || state == STATE_GAME_OVER) && IsKeyPressed(KEY_ENTER)) {
            ResetGame(&player, bullets, enemies, enemyBullets, &score, &lives, &spawnTimer, &shootCooldown, &elapsed);
            state = STATE_PLAYING;
        }

        if (state == STATE_PLAYING) {
            elapsed += dt;
            shootCooldown -= dt;
            spawnTimer -= dt;

            Vector2 movement = { 0 };
            if (IsKeyDown(KEY_RIGHT) || IsKeyDown(KEY_D)) movement.x += 1.0f;
            if (IsKeyDown(KEY_LEFT) || IsKeyDown(KEY_A)) movement.x -= 1.0f;
            if (IsKeyDown(KEY_DOWN) || IsKeyDown(KEY_S)) movement.y += 1.0f;
            if (IsKeyDown(KEY_UP) || IsKeyDown(KEY_W)) movement.y -= 1.0f;

            if (movement.x != 0.0f || movement.y != 0.0f) {
                float length = sqrtf(movement.x * movement.x + movement.y * movement.y);
                movement.x /= length;
                movement.y /= length;
            }

            player.x = ClampFloat(player.x + movement.x * 250.0f * dt, 30.0f, SCREEN_WIDTH * 0.45f);
            player.y = ClampFloat(player.y + movement.y * 250.0f * dt, 28.0f, SCREEN_HEIGHT - 28.0f);

            if ((IsKeyDown(KEY_SPACE) || IsKeyDown(KEY_RIGHT_CONTROL)) && shootCooldown <= 0.0f) {
                SpawnPlayerBullet(bullets, player);
                shootCooldown = 0.16f;
            }

            if (spawnTimer <= 0.0f) {
                SpawnEnemy(enemies, elapsed);
                spawnTimer = fmaxf(0.35f, 1.15f - elapsed * 0.01f);
            }

            for (int i = 0; i < MAX_BULLETS; i++) {
                if (!bullets[i].active) continue;
                bullets[i].position.x += bullets[i].speed * dt;
                if (bullets[i].position.x > SCREEN_WIDTH + 20.0f) bullets[i].active = false;
            }

            for (int i = 0; i < MAX_ENEMY_BULLETS; i++) {
                if (!enemyBullets[i].active) continue;
                enemyBullets[i].position.x += enemyBullets[i].speed * dt;
                if (enemyBullets[i].position.x < -20.0f) enemyBullets[i].active = false;
            }

            for (int i = 0; i < MAX_ENEMIES; i++) {
                if (!enemies[i].active) continue;

                enemies[i].position.x += enemies[i].velocity.x * dt;
                enemies[i].position.y += enemies[i].velocity.y * dt;
                enemies[i].shootTimer -= dt;

                if (enemies[i].position.y < 30.0f || enemies[i].position.y > SCREEN_HEIGHT - 30.0f) {
                    enemies[i].velocity.y *= -1.0f;
                }

                if (enemies[i].shootTimer <= 0.0f) {
                    SpawnEnemyBullet(enemyBullets, enemies[i].position);
                    enemies[i].shootTimer = (float)GetRandomValue(110, 240) / 100.0f;
                }

                if (enemies[i].position.x < -40.0f) enemies[i].active = false;
            }

            for (int i = 0; i < MAX_BULLETS; i++) {
                if (!bullets[i].active) continue;

                for (int j = 0; j < MAX_ENEMIES; j++) {
                    if (!enemies[j].active) continue;

                    if (CheckCollisionCircles(bullets[i].position, 4.0f, enemies[j].position, enemies[j].radius)) {
                        bullets[i].active = false;
                        enemies[j].hp--;
                        if (enemies[j].hp <= 0) {
                            enemies[j].active = false;
                            score += 100;
                        }
                        break;
                    }
                }
            }

            Rectangle playerHitbox = { player.x - 18.0f, player.y - 13.0f, 36.0f, 26.0f };
            for (int i = 0; i < MAX_ENEMIES; i++) {
                if (!enemies[i].active) continue;
                if (CheckCollisionCircleRec(enemies[i].position, enemies[i].radius, playerHitbox)) {
                    enemies[i].active = false;
                    lives--;
                }
            }

            for (int i = 0; i < MAX_ENEMY_BULLETS; i++) {
                if (!enemyBullets[i].active) continue;
                if (CheckCollisionCircleRec(enemyBullets[i].position, 4.0f, playerHitbox)) {
                    enemyBullets[i].active = false;
                    lives--;
                }
            }

            if (lives <= 0) state = STATE_GAME_OVER;
        }

        BeginDrawing();
        ClearBackground((Color){ 8, 12, 18, 255 });

        for (int i = 0; i < MAX_STARS; i++) {
            Color starColor = stars[i].speed > 100.0f ? LIGHTGRAY : DARKGRAY;
            DrawCircleV(stars[i].position, stars[i].radius, starColor);
        }

        DrawRectangle(0, 0, SCREEN_WIDTH, 28, (Color){ 21, 31, 40, 255 });
        DrawText(TextFormat("SCORE %06d", score), 16, 7, 14, LIME);
        DrawText(TextFormat("LIVES %d", lives), SCREEN_WIDTH - 96, 7, 14, LIME);

        if (state == STATE_PLAYING || state == STATE_GAME_OVER) {
            DrawPlayer(player);
        }

        for (int i = 0; i < MAX_BULLETS; i++) {
            if (bullets[i].active) DrawCircleV(bullets[i].position, 4.0f, YELLOW);
        }

        for (int i = 0; i < MAX_ENEMIES; i++) {
            if (enemies[i].active) DrawEnemy(enemies[i]);
        }

        for (int i = 0; i < MAX_ENEMY_BULLETS; i++) {
            if (enemyBullets[i].active) DrawCircleV(enemyBullets[i].position, 4.0f, SKYBLUE);
        }

        if (state == STATE_TITLE) {
            DrawText("SPACE IMPACT", SCREEN_WIDTH / 2 - MeasureText("SPACE IMPACT", 42) / 2, 145, 42, LIME);
            DrawText("ARROWS/WASD MOVE   SPACE SHOOTS", SCREEN_WIDTH / 2 - MeasureText("ARROWS/WASD MOVE   SPACE SHOOTS", 18) / 2, 215, 18, LIGHTGRAY);
            DrawText("PRESS ENTER", SCREEN_WIDTH / 2 - MeasureText("PRESS ENTER", 22) / 2, 260, 22, YELLOW);
        } else if (state == STATE_GAME_OVER) {
            DrawRectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, (Color){ 0, 0, 0, 130 });
            DrawText("GAME OVER", SCREEN_WIDTH / 2 - MeasureText("GAME OVER", 42) / 2, 165, 42, RED);
            DrawText(TextFormat("FINAL SCORE %06d", score), SCREEN_WIDTH / 2 - MeasureText(TextFormat("FINAL SCORE %06d", score), 22) / 2, 225, 22, RAYWHITE);
            DrawText("PRESS ENTER TO RESTART", SCREEN_WIDTH / 2 - MeasureText("PRESS ENTER TO RESTART", 20) / 2, 270, 20, YELLOW);
        }

        EndDrawing();
    }

    CloseWindow();
    return 0;
}
