#include "game.h"

#include "raymath.h"

#include <stdio.h>

static void ResetGame(Game *game)
{
    game->player = (Vector2){ 96.0f, SCREEN_HEIGHT * 0.5f };
    game->score = 0;
    game->lives = 3;
    game->shootTimer = 0.0f;
    game->gameOver = false;

    ResetBullets(game->bullets);
    ResetAliens(game->aliens);
    ResetParticles(game->particles);
    InitStars(game->stars);
    ResetWaves(&game->waves);
}

void InitGame(Game *game)
{
    ResetGame(game);
}

static void UpdatePlayer(Game *game, float dt)
{
    Vector2 move = { 0 };
    if (IsKeyDown(KEY_RIGHT) || IsKeyDown(KEY_D)) move.x += 1.0f;
    if (IsKeyDown(KEY_LEFT) || IsKeyDown(KEY_A)) move.x -= 1.0f;
    if (IsKeyDown(KEY_DOWN) || IsKeyDown(KEY_S)) move.y += 1.0f;
    if (IsKeyDown(KEY_UP) || IsKeyDown(KEY_W)) move.y -= 1.0f;

    if (move.x != 0.0f || move.y != 0.0f) {
        move = Vector2Normalize(move);
        game->player.x += move.x * PLAYER_SPEED * dt;
        game->player.y += move.y * PLAYER_SPEED * dt;
    }

    game->player.x = Clamp(game->player.x, PLAYER_WIDTH * 0.5f, SCREEN_WIDTH * 0.48f);
    game->player.y = Clamp(game->player.y, PLAYER_HEIGHT * 0.5f + 8.0f, SCREEN_HEIGHT - PLAYER_HEIGHT * 0.5f);

    game->shootTimer -= dt;
    if (IsKeyDown(KEY_SPACE) && game->shootTimer <= 0.0f) {
        FireBullet(game->bullets, game->player);
        game->shootTimer = 0.16f;
    }
}

static void ResolveCollisions(Game *game)
{
    Rectangle playerRect = PlayerRect(game->player);

    for (int i = 0; i < MAX_ALIENS; i++) {
        if (!game->aliens[i].active) continue;

        if (game->aliens[i].rect.x + game->aliens[i].rect.width < 0.0f) {
            game->aliens[i].active = false;
            game->lives--;
            continue;
        }

        if (CheckCollisionRecs(playerRect, game->aliens[i].rect)) {
            Vector2 hit = {
                game->aliens[i].rect.x + game->aliens[i].rect.width * 0.5f,
                game->aliens[i].rect.y + game->aliens[i].rect.height * 0.5f
            };
            SpawnBurst(game->particles, hit);
            game->aliens[i].active = false;
            game->lives--;
        }
    }

    for (int b = 0; b < MAX_BULLETS; b++) {
        if (!game->bullets[b].active) continue;

        Rectangle bulletRect = {
            game->bullets[b].pos.x - 2.0f,
            game->bullets[b].pos.y - 2.0f,
            16.0f,
            4.0f
        };

        for (int a = 0; a < MAX_ALIENS; a++) {
            if (!game->aliens[a].active) continue;

            if (CheckCollisionRecs(bulletRect, game->aliens[a].rect)) {
                Vector2 hit = {
                    game->aliens[a].rect.x + game->aliens[a].rect.width * 0.5f,
                    game->aliens[a].rect.y + game->aliens[a].rect.height * 0.5f
                };
                SpawnBurst(game->particles, hit);
                game->bullets[b].active = false;
                game->aliens[a].health--;

                if (game->aliens[a].health <= 0) {
                    game->score += game->aliens[a].scoreValue;
                    game->aliens[a].active = false;
                }
                break;
            }
        }
    }
}

void UpdateGame(Game *game, float dt)
{
    UpdateStars(game->stars, dt);

    if (game->gameOver) {
        if (IsKeyPressed(KEY_ENTER)) ResetGame(game);
        UpdateParticles(game->particles, dt);
        return;
    }

    UpdatePlayer(game, dt);
    UpdateWaves(&game->waves, game->aliens, dt);
    UpdateBullets(game->bullets, dt);
    UpdateAliens(game->aliens, dt);
    ResolveCollisions(game);
    UpdateParticles(game->particles, dt);

    if (game->lives <= 0) game->gameOver = true;
}

static void DrawHud(const Game *game)
{
    DrawText("1-BIT STARSHIP", 24, 18, 22, RAYWHITE);

    char scoreText[32];
    snprintf(scoreText, sizeof(scoreText), "SCORE %04d", game->score);
    DrawText(scoreText, 24, 48, 18, RAYWHITE);

    char waveText[24];
    snprintf(waveText, sizeof(waveText), "WAVE %02d", game->waves.wave);
    DrawText(waveText, SCREEN_WIDTH / 2 - MeasureText(waveText, 18) / 2, 22, 18, RAYWHITE);

    char livesText[24];
    snprintf(livesText, sizeof(livesText), "LIVES %d", game->lives);
    DrawText(livesText, SCREEN_WIDTH - 128, 22, 18, RAYWHITE);

    if (game->waves.resting && !game->gameOver) {
        const char *clear = "WAVE CLEAR";
        DrawText(clear, SCREEN_WIDTH / 2 - MeasureText(clear, 22) / 2, 52, 22, RAYWHITE);
    }
}

void DrawGame(const Game *game)
{
    ClearBackground(BLACK);

    DrawStars(game->stars);
    DrawBullets(game->bullets);
    DrawAliens(game->aliens);
    DrawParticles(game->particles);

    if (!game->gameOver) DrawStarship(game->player);
    DrawHud(game);

    if (game->gameOver) {
        const char *title = "GAME OVER";
        const char *prompt = "PRESS ENTER TO RESTART";
        DrawText(title, SCREEN_WIDTH / 2 - MeasureText(title, 48) / 2, SCREEN_HEIGHT / 2 - 44, 48, RAYWHITE);
        DrawText(prompt, SCREEN_WIDTH / 2 - MeasureText(prompt, 22) / 2, SCREEN_HEIGHT / 2 + 18, 22, RAYWHITE);
    }
}
