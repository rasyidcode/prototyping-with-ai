#include "entities.h"

#include "raymath.h"

#include <math.h>

Rectangle PlayerRect(Vector2 pos)
{
    return (Rectangle){
        pos.x - PLAYER_WIDTH * 0.5f,
        pos.y - PLAYER_HEIGHT * 0.5f,
        PLAYER_WIDTH,
        PLAYER_HEIGHT
    };
}

void InitStars(Star stars[])
{
    for (int i = 0; i < MAX_STARS; i++) {
        stars[i].pos = (Vector2){
            (float)GetRandomValue(0, SCREEN_WIDTH - 1),
            (float)GetRandomValue(0, SCREEN_HEIGHT - 1)
        };
        stars[i].speed = (float)GetRandomValue(55, 190);
    }
}

void UpdateStars(Star stars[], float dt)
{
    for (int i = 0; i < MAX_STARS; i++) {
        stars[i].pos.x -= stars[i].speed * dt;
        if (stars[i].pos.x < -4.0f) {
            stars[i].pos.x = SCREEN_WIDTH + (float)GetRandomValue(0, 64);
            stars[i].pos.y = (float)GetRandomValue(0, SCREEN_HEIGHT - 1);
            stars[i].speed = (float)GetRandomValue(55, 190);
        }
    }
}

void ResetBullets(Bullet bullets[])
{
    for (int i = 0; i < MAX_BULLETS; i++) bullets[i].active = false;
}

void ResetAliens(Alien aliens[])
{
    for (int i = 0; i < MAX_ALIENS; i++) aliens[i].active = false;
}

void ResetParticles(Particle particles[])
{
    for (int i = 0; i < MAX_PARTICLES; i++) particles[i].active = false;
}

void FireBullet(Bullet bullets[], Vector2 player)
{
    for (int i = 0; i < MAX_BULLETS; i++) {
        if (!bullets[i].active) {
            bullets[i].pos = (Vector2){ player.x + 29.0f, player.y };
            bullets[i].active = true;
            return;
        }
    }
}

static void AlienStats(AlienType type, float *size, float *speed, int *health, int *scoreValue)
{
    switch (type) {
    case ALIEN_SCOUT:
        *size = 22.0f;
        *speed = 245.0f;
        *health = 1;
        *scoreValue = 15;
        break;
    case ALIEN_DRIFTER:
        *size = 32.0f;
        *speed = 155.0f;
        *health = 1;
        *scoreValue = 25;
        break;
    case ALIEN_BRUTE:
        *size = 50.0f;
        *speed = 95.0f;
        *health = 3;
        *scoreValue = 60;
        break;
    case ALIEN_FIGHTER:
    default:
        *size = 34.0f;
        *speed = 175.0f;
        *health = 1;
        *scoreValue = 20;
        break;
    }
}

bool SpawnAlien(Alien aliens[], AlienType type, float y, int wave)
{
    for (int i = 0; i < MAX_ALIENS; i++) {
        if (!aliens[i].active) {
            float size = 0.0f;
            float speed = 0.0f;
            int health = 1;
            int scoreValue = 0;
            AlienStats(type, &size, &speed, &health, &scoreValue);

            y = Clamp(y, 28.0f, SCREEN_HEIGHT - size - 28.0f);
            aliens[i] = (Alien){
                .rect = { SCREEN_WIDTH + size, y, size, size },
                .type = type,
                .speed = speed + (float)(wave - 1) * 9.0f,
                .baseY = y,
                .phase = (float)GetRandomValue(0, 628) / 100.0f,
                .health = health,
                .scoreValue = scoreValue,
                .active = true
            };
            return true;
        }
    }

    return false;
}

int ActiveAlienCount(const Alien aliens[])
{
    int count = 0;
    for (int i = 0; i < MAX_ALIENS; i++) {
        if (aliens[i].active) count++;
    }
    return count;
}

void SpawnBurst(Particle particles[], Vector2 origin)
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

void UpdateBullets(Bullet bullets[], float dt)
{
    for (int i = 0; i < MAX_BULLETS; i++) {
        if (bullets[i].active) {
            bullets[i].pos.x += BULLET_SPEED * dt;
            if (bullets[i].pos.x > SCREEN_WIDTH + 16.0f) bullets[i].active = false;
        }
    }
}

void UpdateAliens(Alien aliens[], float dt)
{
    for (int i = 0; i < MAX_ALIENS; i++) {
        if (!aliens[i].active) continue;

        aliens[i].rect.x -= aliens[i].speed * dt;
        aliens[i].phase += dt * 4.0f;

        if (aliens[i].type == ALIEN_DRIFTER) {
            aliens[i].rect.y = aliens[i].baseY + sinf(aliens[i].phase) * 48.0f;
            aliens[i].rect.y = Clamp(aliens[i].rect.y, 24.0f, SCREEN_HEIGHT - aliens[i].rect.height - 24.0f);
        }
    }
}

void UpdateParticles(Particle particles[], float dt)
{
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particles[i].active) continue;

        particles[i].ttl -= dt;
        particles[i].pos.x += particles[i].vel.x * dt;
        particles[i].pos.y += particles[i].vel.y * dt;
        if (particles[i].ttl <= 0.0f) particles[i].active = false;
    }
}

void DrawStars(const Star stars[])
{
    for (int i = 0; i < MAX_STARS; i++) {
        int size = stars[i].speed > 130.0f ? 2 : 1;
        DrawRectangle((int)stars[i].pos.x, (int)stars[i].pos.y, size, size, RAYWHITE);
    }
}

void DrawBullets(const Bullet bullets[])
{
    for (int i = 0; i < MAX_BULLETS; i++) {
        if (bullets[i].active) {
            DrawRectangle((int)bullets[i].pos.x, (int)bullets[i].pos.y - 2, 18, 4, RAYWHITE);
        }
    }
}

static void DrawAlienShape(Alien alien)
{
    Rectangle r = alien.rect;
    int x = (int)r.x;
    int y = (int)r.y;
    int w = (int)r.width;
    int h = (int)r.height;

    switch (alien.type) {
    case ALIEN_SCOUT:
        DrawTriangle((Vector2){ x, y + h / 2 }, (Vector2){ x + w, y }, (Vector2){ x + w, y + h }, RAYWHITE);
        DrawRectangle(x + w / 2, y + h / 2 - 2, w / 4, 4, BLACK);
        break;
    case ALIEN_DRIFTER:
        DrawRectangle(x + w / 4, y, w / 2, h, RAYWHITE);
        DrawRectangle(x, y + h / 3, w, h / 3, RAYWHITE);
        DrawRectangle(x + w / 3, y + h / 4, w / 3, h / 2, BLACK);
        DrawRectangle(x + w / 2 - 2, y + h / 2 - 2, 4, 4, RAYWHITE);
        break;
    case ALIEN_BRUTE:
        DrawRectangle(x + 4, y, w - 8, h, RAYWHITE);
        DrawRectangle(x, y + 8, w, h - 16, RAYWHITE);
        DrawRectangle(x + w / 4, y + h / 4, 7, 7, BLACK);
        DrawRectangle(x + w * 3 / 5, y + h / 4, 7, 7, BLACK);
        DrawRectangle(x + w / 4, y + h - 10, w / 2, 4, BLACK);
        break;
    case ALIEN_FIGHTER:
    default:
        DrawRectangle(x + w / 5, y, w * 3 / 5, h, RAYWHITE);
        DrawRectangle(x, y + h / 4, w, h / 2, RAYWHITE);
        DrawRectangle(x + w / 4, y + h / 3, w / 6, h / 6, BLACK);
        DrawRectangle(x + w * 3 / 5, y + h / 3, w / 6, h / 6, BLACK);
        DrawRectangle(x + w / 8, y + h - 3, w / 5, 7, RAYWHITE);
        DrawRectangle(x + w * 2 / 5, y + h - 3, w / 5, 7, RAYWHITE);
        DrawRectangle(x + w * 2 / 3, y + h - 3, w / 5, 7, RAYWHITE);
        break;
    }
}

void DrawAliens(const Alien aliens[])
{
    for (int i = 0; i < MAX_ALIENS; i++) {
        if (aliens[i].active) DrawAlienShape(aliens[i]);
    }
}

void DrawParticles(const Particle particles[])
{
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (particles[i].active) {
            DrawRectangle((int)particles[i].pos.x, (int)particles[i].pos.y, 4, 4, RAYWHITE);
        }
    }
}

void DrawStarship(Vector2 player)
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
