#include "raylib.h"
#include "raymath.h"

#include <math.h>

#include <stdbool.h>
#include <stdio.h>

#define SCREEN_WIDTH 960
#define SCREEN_HEIGHT 540

#define MAX_BULLETS 48
#define MAX_ALIENS 32
#define MAX_STARS 96
#define MAX_PARTICLES 96

#define PLAYER_WIDTH 44.0f
#define PLAYER_HEIGHT 24.0f
#define PLAYER_SPEED 330.0f
#define BULLET_SPEED 560.0f

typedef struct Bullet {
    Vector2 pos;
    bool active;
} Bullet;

typedef struct Alien {
    Rectangle rect;
    float speed;
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

static Rectangle PlayerRect(Vector2 pos)
{
    return (Rectangle){
        pos.x - PLAYER_WIDTH * 0.5f,
        pos.y - PLAYER_HEIGHT * 0.5f,
        PLAYER_WIDTH,
        PLAYER_HEIGHT
    };
}

static void ResetGame(Vector2 *player, Bullet bullets[], Alien aliens[], Particle particles[],
                      Star stars[], int *score, int *lives, float *spawnTimer,
                      float *shootTimer, bool *gameOver)
{
    *player = (Vector2){ 96.0f, SCREEN_HEIGHT * 0.5f };
    *score = 0;
    *lives = 3;
    *spawnTimer = 0.0f;
    *shootTimer = 0.0f;
    *gameOver = false;

    for (int i = 0; i < MAX_BULLETS; i++) bullets[i].active = false;
    for (int i = 0; i < MAX_ALIENS; i++) aliens[i].active = false;
    for (int i = 0; i < MAX_PARTICLES; i++) particles[i].active = false;

    for (int i = 0; i < MAX_STARS; i++) {
        stars[i].pos = (Vector2){
            (float)GetRandomValue(0, SCREEN_WIDTH - 1),
            (float)GetRandomValue(0, SCREEN_HEIGHT - 1)
        };
        stars[i].speed = (float)GetRandomValue(55, 190);
    }
}

static void FireBullet(Bullet bullets[], Vector2 player)
{
    for (int i = 0; i < MAX_BULLETS; i++) {
        if (!bullets[i].active) {
            bullets[i].pos = (Vector2){ player.x + 29.0f, player.y };
            bullets[i].active = true;
            return;
        }
    }
}

static void SpawnAlien(Alien aliens[], int score)
{
    for (int i = 0; i < MAX_ALIENS; i++) {
        if (!aliens[i].active) {
            float size = (float)GetRandomValue(22, 42);
            aliens[i].rect = (Rectangle){
                SCREEN_WIDTH + size,
                (float)GetRandomValue(36, SCREEN_HEIGHT - 36 - (int)size),
                size,
                size
            };
            aliens[i].speed = (float)GetRandomValue(105, 185) + (float)score * 1.4f;
            aliens[i].active = true;
            return;
        }
    }
}

static void SpawnBurst(Particle particles[], Vector2 origin)
{
    for (int count = 0; count < 10; count++) {
        for (int i = 0; i < MAX_PARTICLES; i++) {
            if (!particles[i].active) {
                float angle = (float)GetRandomValue(0, 628) / 100.0f;
                float speed = (float)GetRandomValue(60, 190);
                particles[i].pos = origin;
                particles[i].vel = (Vector2){ cosf(angle) * speed, sinf(angle) * speed };
                particles[i].ttl = (float)GetRandomValue(18, 34) / 100.0f;
                particles[i].active = true;
                break;
            }
        }
    }
}

static void DrawStarship(Vector2 player)
{
    Rectangle body = PlayerRect(player);

    DrawRectangleRec(body, RAYWHITE);
    DrawTriangle(
        (Vector2){ body.x + body.width, body.y },
        (Vector2){ body.x + body.width + 18.0f, player.y },
        (Vector2){ body.x + body.width, body.y + body.height },
        RAYWHITE
    );
    DrawRectangle((int)body.x - 10, (int)player.y - 14, 16, 9, RAYWHITE);
    DrawRectangle((int)body.x - 10, (int)player.y + 5, 16, 9, RAYWHITE);
    DrawRectangle((int)body.x + 12, (int)player.y - 4, 10, 8, BLACK);
    DrawRectangle((int)body.x - 18, (int)player.y - 5, 8, 10, RAYWHITE);
}

static void DrawAlien(Alien alien)
{
    Rectangle r = alien.rect;
    int x = (int)r.x;
    int y = (int)r.y;
    int w = (int)r.width;
    int h = (int)r.height;

    DrawRectangle(x + w / 5, y, w * 3 / 5, h, RAYWHITE);
    DrawRectangle(x, y + h / 4, w, h / 2, RAYWHITE);
    DrawRectangle(x + w / 4, y + h / 3, w / 6, h / 6, BLACK);
    DrawRectangle(x + w * 3 / 5, y + h / 3, w / 6, h / 6, BLACK);
    DrawRectangle(x + w / 8, y + h - 3, w / 5, 7, RAYWHITE);
    DrawRectangle(x + w * 2 / 5, y + h - 3, w / 5, 7, RAYWHITE);
    DrawRectangle(x + w * 2 / 3, y + h - 3, w / 5, 7, RAYWHITE);
}

static void DrawHud(int score, int lives)
{
    DrawText("1-BIT STARSHIP", 24, 18, 22, RAYWHITE);

    char scoreText[32];
    snprintf(scoreText, sizeof(scoreText), "SCORE %04d", score);
    DrawText(scoreText, 24, 48, 18, RAYWHITE);

    char livesText[24];
    snprintf(livesText, sizeof(livesText), "LIVES %d", lives);
    DrawText(livesText, SCREEN_WIDTH - 128, 22, 18, RAYWHITE);
}

int main(void)
{
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "1-Bit Starship Adventure");
    SetTargetFPS(60);

    Vector2 player = { 0 };
    Bullet bullets[MAX_BULLETS] = { 0 };
    Alien aliens[MAX_ALIENS] = { 0 };
    Star stars[MAX_STARS] = { 0 };
    Particle particles[MAX_PARTICLES] = { 0 };
    int score = 0;
    int lives = 3;
    float spawnTimer = 0.0f;
    float shootTimer = 0.0f;
    bool gameOver = false;

    ResetGame(&player, bullets, aliens, particles, stars, &score, &lives,
              &spawnTimer, &shootTimer, &gameOver);

    while (!WindowShouldClose()) {
        float dt = GetFrameTime();

        for (int i = 0; i < MAX_STARS; i++) {
            stars[i].pos.x -= stars[i].speed * dt;
            if (stars[i].pos.x < -4.0f) {
                stars[i].pos.x = SCREEN_WIDTH + (float)GetRandomValue(0, 64);
                stars[i].pos.y = (float)GetRandomValue(0, SCREEN_HEIGHT - 1);
                stars[i].speed = (float)GetRandomValue(55, 190);
            }
        }

        if (gameOver) {
            if (IsKeyPressed(KEY_ENTER)) {
                ResetGame(&player, bullets, aliens, particles, stars, &score, &lives,
                          &spawnTimer, &shootTimer, &gameOver);
            }
        } else {
            Vector2 move = { 0 };
            if (IsKeyDown(KEY_RIGHT) || IsKeyDown(KEY_D)) move.x += 1.0f;
            if (IsKeyDown(KEY_LEFT) || IsKeyDown(KEY_A)) move.x -= 1.0f;
            if (IsKeyDown(KEY_DOWN) || IsKeyDown(KEY_S)) move.y += 1.0f;
            if (IsKeyDown(KEY_UP) || IsKeyDown(KEY_W)) move.y -= 1.0f;

            if (move.x != 0.0f || move.y != 0.0f) {
                move = Vector2Normalize(move);
                player.x += move.x * PLAYER_SPEED * dt;
                player.y += move.y * PLAYER_SPEED * dt;
            }

            player.x = Clamp(player.x, PLAYER_WIDTH * 0.5f, SCREEN_WIDTH * 0.48f);
            player.y = Clamp(player.y, PLAYER_HEIGHT * 0.5f + 8.0f, SCREEN_HEIGHT - PLAYER_HEIGHT * 0.5f);

            shootTimer -= dt;
            if (IsKeyDown(KEY_SPACE) && shootTimer <= 0.0f) {
                FireBullet(bullets, player);
                shootTimer = 0.16f;
            }

            spawnTimer -= dt;
            if (spawnTimer <= 0.0f) {
                SpawnAlien(aliens, score);
                float wavePressure = (float)score * 0.01f;
                spawnTimer = Clamp(0.95f - wavePressure, 0.24f, 0.95f);
            }

            for (int i = 0; i < MAX_BULLETS; i++) {
                if (bullets[i].active) {
                    bullets[i].pos.x += BULLET_SPEED * dt;
                    if (bullets[i].pos.x > SCREEN_WIDTH + 16.0f) bullets[i].active = false;
                }
            }

            Rectangle playerRect = PlayerRect(player);
            for (int i = 0; i < MAX_ALIENS; i++) {
                if (!aliens[i].active) continue;

                aliens[i].rect.x -= aliens[i].speed * dt;

                if (aliens[i].rect.x + aliens[i].rect.width < 0.0f) {
                    aliens[i].active = false;
                    lives--;
                }

                if (aliens[i].active && CheckCollisionRecs(playerRect, aliens[i].rect)) {
                    Vector2 hit = {
                        aliens[i].rect.x + aliens[i].rect.width * 0.5f,
                        aliens[i].rect.y + aliens[i].rect.height * 0.5f
                    };
                    SpawnBurst(particles, hit);
                    aliens[i].active = false;
                    lives--;
                }
            }

            for (int b = 0; b < MAX_BULLETS; b++) {
                if (!bullets[b].active) continue;

                Rectangle bulletRect = { bullets[b].pos.x - 2.0f, bullets[b].pos.y - 2.0f, 16.0f, 4.0f };
                for (int a = 0; a < MAX_ALIENS; a++) {
                    if (!aliens[a].active) continue;

                    if (CheckCollisionRecs(bulletRect, aliens[a].rect)) {
                        Vector2 hit = {
                            aliens[a].rect.x + aliens[a].rect.width * 0.5f,
                            aliens[a].rect.y + aliens[a].rect.height * 0.5f
                        };
                        SpawnBurst(particles, hit);
                        bullets[b].active = false;
                        aliens[a].active = false;
                        score += 10;
                        break;
                    }
                }
            }

            if (lives <= 0) gameOver = true;
        }

        for (int i = 0; i < MAX_PARTICLES; i++) {
            if (!particles[i].active) continue;

            particles[i].ttl -= dt;
            particles[i].pos.x += particles[i].vel.x * dt;
            particles[i].pos.y += particles[i].vel.y * dt;
            if (particles[i].ttl <= 0.0f) particles[i].active = false;
        }

        BeginDrawing();
        ClearBackground(BLACK);

        for (int i = 0; i < MAX_STARS; i++) {
            int size = stars[i].speed > 130.0f ? 2 : 1;
            DrawRectangle((int)stars[i].pos.x, (int)stars[i].pos.y, size, size, RAYWHITE);
        }

        for (int i = 0; i < MAX_BULLETS; i++) {
            if (bullets[i].active) {
                DrawRectangle((int)bullets[i].pos.x, (int)bullets[i].pos.y - 2, 18, 4, RAYWHITE);
            }
        }

        for (int i = 0; i < MAX_ALIENS; i++) {
            if (aliens[i].active) DrawAlien(aliens[i]);
        }

        for (int i = 0; i < MAX_PARTICLES; i++) {
            if (particles[i].active) {
                DrawRectangle((int)particles[i].pos.x, (int)particles[i].pos.y, 4, 4, RAYWHITE);
            }
        }

        if (!gameOver) DrawStarship(player);
        DrawHud(score, lives);

        if (gameOver) {
            const char *title = "GAME OVER";
            const char *prompt = "PRESS ENTER TO RESTART";
            DrawText(title, SCREEN_WIDTH / 2 - MeasureText(title, 48) / 2, SCREEN_HEIGHT / 2 - 44, 48, RAYWHITE);
            DrawText(prompt, SCREEN_WIDTH / 2 - MeasureText(prompt, 22) / 2, SCREEN_HEIGHT / 2 + 18, 22, RAYWHITE);
        }

        EndDrawing();
    }

    CloseWindow();
    return 0;
}
