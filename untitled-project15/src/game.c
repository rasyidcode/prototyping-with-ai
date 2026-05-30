#include "game.h"
#include "raymath.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

Game game;

const FruitDef FRUIT_DEFS[FRUIT_COUNT] = {
    { FRUIT_CHERRY,     14.0f,  1.0f,  (Color){ 240,  50,  90, 255 }, "Cherry",     1 },
    { FRUIT_STRAWBERRY, 20.0f,  1.4f,  (Color){ 245,  30,  35, 255 }, "Strawberry", 3 },
    { FRUIT_GRAPE,      27.0f,  2.0f,  (Color){ 140,  55, 185, 255 }, "Grape",      6 },
    { FRUIT_DEKOPON,    33.0f,  2.8f,  (Color){ 245, 130,  30, 255 }, "Dekopon",    10 },
    { FRUIT_PERSIMMON,  40.0f,  3.8f,  (Color){ 245, 185,  40, 255 }, "Persimmon",  15 },
    { FRUIT_APPLE,      48.0f,  5.0f,  (Color){ 220,  20,  40, 255 }, "Apple",      21 },
    { FRUIT_PEAR,       56.0f,  6.5f,  (Color){ 180, 215,  65, 255 }, "Pear",       28 },
    { FRUIT_PEACH,      65.0f,  8.5f,  (Color){ 255, 160, 165, 255 }, "Peach",      36 },
    { FRUIT_PINEAPPLE,  75.0f, 11.5f,  (Color){ 240, 200,  15, 255 }, "Pineapple",  45 },
    { FRUIT_MELON,      86.0f, 15.0f,  (Color){ 150, 230, 100, 255 }, "Melon",      55 },
    { FRUIT_WATERMELON,100.0f, 20.0f,  (Color){  30, 160,  60, 255 }, "Watermelon", 66 }
};

// Local storage files
#define HIGHSCORE_FILE "highscore.dat"

static void LoadHighScore(void) {
    game.highScore = 0;
    FILE* file = fopen(HIGHSCORE_FILE, "rb");
    if (file) {
        if (fread(&game.highScore, sizeof(int), 1, file) != 1) {
            game.highScore = 0;
        }
        fclose(file);
    }
}

static void SaveHighScore(void) {
    FILE* file = fopen(HIGHSCORE_FILE, "wb");
    if (file) {
        fwrite(&game.highScore, sizeof(int), 1, file);
        fclose(file);
    }
}

static FruitType GetRandomSpawnType(void) {
    // Only spawn levels 0 through 4 (Cherry, Strawberry, Grape, Dekopon, Persimmon)
    return (FruitType)(rand() % 5);
}

void InitGame(void) {
    srand(time(NULL));
    
    game.state = STATE_START;
    game.fruitCount = 0;
    game.particleCount = 0;
    game.floatingTextCount = 0;
    game.nextFruitId = 1;
    
    game.score = 0;
    game.scoreVisual = 0.0f;
    
    LoadHighScore();

    game.dropperX = CONTAINER_X + CONTAINER_WIDTH / 2;
    game.currentDroppedType = GetRandomSpawnType();
    game.nextDroppedType = GetRandomSpawnType();
    game.hasDropped = false;
    game.dropCooldownTimer = 0.0f;
    
    game.warningActive = false;
    game.warningTime = 0.0f;
}

static void ResetPlayState(void) {
    game.fruitCount = 0;
    game.particleCount = 0;
    game.floatingTextCount = 0;
    game.score = 0;
    game.scoreVisual = 0.0f;
    game.hasDropped = false;
    game.dropCooldownTimer = 0.0f;
    game.warningActive = false;
    game.warningTime = 0.0f;
    
    game.currentDroppedType = GetRandomSpawnType();
    game.nextDroppedType = GetRandomSpawnType();
    
    // Spawn the initial active preview fruit
    game.fruits[0].position = (Vector2){ game.dropperX, CONTAINER_Y + 30.0f };
    game.fruits[0].velocity = Vector2Zero();
    game.fruits[0].type = game.currentDroppedType;
    game.fruits[0].radius = FRUIT_DEFS[game.currentDroppedType].radius;
    game.fruits[0].mass = FRUIT_DEFS[game.currentDroppedType].mass;
    game.fruits[0].rotation = 0.0f;
    game.fruits[0].scale = 1.0f;
    game.fruits[0].scaleTarget = 1.0f;
    game.fruits[0].active = true;
    game.fruits[0].isStatic = true;
    game.fruits[0].timeAboveLimit = 0.0f;
    game.fruits[0].id = game.nextFruitId++;
    game.fruitCount = 1;
    
    game.state = STATE_PLAYING;
}

void SpawnFloatingText(Vector2 position, const char* text, Color color) {
    int slot = -1;
    if (game.floatingTextCount < MAX_FLOATING_TEXTS) {
        slot = game.floatingTextCount;
        game.floatingTextCount++;
    } else {
        slot = rand() % MAX_FLOATING_TEXTS;
    }

    if (slot != -1) {
        FloatingText* ft = &game.floatingTexts[slot];
        ft->position = position;
        strncpy(ft->text, text, sizeof(ft->text) - 1);
        ft->color = color;
        ft->alpha = 1.0f;
        ft->maxLife = 1.2f;
        ft->life = ft->maxLife;
        ft->velocityY = -70.0f;
    }
}

void UpdateFloatingTexts(float dt) {
    int activeCount = 0;
    for (int i = 0; i < game.floatingTextCount; i++) {
        FloatingText* ft = &game.floatingTexts[i];
        ft->life -= dt;

        if (ft->life > 0.0f) {
            ft->position.y += ft->velocityY * dt;
            ft->alpha = ft->life / ft->maxLife;
            
            // Retain
            if (activeCount != i) {
                game.floatingTexts[activeCount] = *ft;
            }
            activeCount++;
        }
    }
    game.floatingTextCount = activeCount;
}

void DrawFloatingTexts(void) {
    for (int i = 0; i < game.floatingTextCount; i++) {
        FloatingText* ft = &game.floatingTexts[i];
        Color textColor = ft->color;
        textColor.a = (unsigned char)(ft->alpha * 255.0f);
        
        int textWidth = MeasureText(ft->text, 18);
        
        // Draw shadow first
        Color shadow = BLACK;
        shadow.a = textColor.a;
        DrawText(ft->text, ft->position.x - textWidth/2 + 2, ft->position.y + 2, 18, shadow);
        DrawText(ft->text, ft->position.x - textWidth/2, ft->position.y, 18, textColor);
    }
}

void UpdateGame(float dt) {
    // Elegant Lerp for visual score counter
    game.scoreVisual = Lerp(game.scoreVisual, (float)game.score, 10.0f * dt);
    if (fabsf(game.scoreVisual - game.score) < 0.2f) {
        game.scoreVisual = (float)game.score;
    }

    if (game.score > game.highScore) {
        game.highScore = game.score;
        SaveHighScore();
    }

    if (game.state == STATE_START) {
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) || IsKeyPressed(KEY_SPACE) || IsKeyPressed(KEY_ENTER)) {
            ResetPlayState();
        }
        return;
    }

    if (game.state == STATE_GAMEOVER) {
        UpdatePhysics(dt);
        UpdateParticles(dt);
        UpdateFloatingTexts(dt);
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) || IsKeyPressed(KEY_SPACE) || IsKeyPressed(KEY_ENTER)) {
            ResetPlayState();
        }
        return;
    }

    // --- PLAYING STATE UPDATES ---
    
    // Cooldown management
    if (game.hasDropped) {
        game.dropCooldownTimer -= dt;
        if (game.dropCooldownTimer <= 0.0f) {
            // Find if we have room to spawn next static fruit
            if (game.fruitCount < MAX_FRUITS) {
                game.currentDroppedType = game.nextDroppedType;
                game.nextDroppedType = GetRandomSpawnType();
                
                // Add the new static fruit at current dropper X
                Fruit* previewFruit = &game.fruits[game.fruitCount];
                previewFruit->position = (Vector2){ game.dropperX, CONTAINER_Y + 30.0f };
                previewFruit->velocity = Vector2Zero();
                previewFruit->type = game.currentDroppedType;
                previewFruit->radius = FRUIT_DEFS[game.currentDroppedType].radius;
                previewFruit->mass = FRUIT_DEFS[game.currentDroppedType].mass;
                previewFruit->rotation = 0.0f;
                previewFruit->scale = 0.1f; // Quick pop in
                previewFruit->scaleTarget = 1.0f;
                previewFruit->active = true;
                previewFruit->isStatic = true;
                previewFruit->timeAboveLimit = 0.0f;
                previewFruit->id = game.nextFruitId++;
                
                game.fruitCount++;
                game.hasDropped = false;
            }
        }
    }

    // Update dropper position
    float halfWidth = 0.0f;
    if (!game.hasDropped) {
        halfWidth = FRUIT_DEFS[game.currentDroppedType].radius;
    }
    
    float minDropperX = CONTAINER_X + halfWidth;
    float maxDropperX = CONTAINER_X + CONTAINER_WIDTH - halfWidth;

    // Control options: Keyboard (Arrow keys / A D) or Mouse
    if (IsKeyDown(KEY_LEFT) || IsKeyDown(KEY_A)) {
        game.dropperX -= 300.0f * dt;
    } else if (IsKeyDown(KEY_RIGHT) || IsKeyDown(KEY_D)) {
        game.dropperX += 300.0f * dt;
    } else {
        // Track mouse
        game.dropperX = GetMousePosition().x;
    }

    // Clamp dropper
    if (game.dropperX < minDropperX) game.dropperX = minDropperX;
    if (game.dropperX > maxDropperX) game.dropperX = maxDropperX;

    // Update active static preview fruit position
    for (int i = 0; i < game.fruitCount; i++) {
        if (game.fruits[i].active && game.fruits[i].isStatic) {
            game.fruits[i].position.x = game.dropperX;
            // Let the fruit bob/sway slightly up and down under the cloud
            game.fruits[i].position.y = CONTAINER_Y + 30.0f + sinf(GetTime() * 4.0f) * 3.0f;
            game.fruits[i].type = game.currentDroppedType;
            game.fruits[i].radius = FRUIT_DEFS[game.currentDroppedType].radius;
            
            // Drop Action
            if ((IsMouseButtonPressed(MOUSE_BUTTON_LEFT) || IsKeyPressed(KEY_SPACE) || IsKeyPressed(KEY_DOWN) || IsKeyPressed(KEY_S)) && !game.hasDropped) {
                game.fruits[i].isStatic = false;
                game.fruits[i].velocity = (Vector2){ 0.0f, 150.0f }; // Drop velocity down
                game.hasDropped = true;
                game.dropCooldownTimer = 0.75f; // Wait 0.75s to drop next
            }
        }
    }

    // Smooth scaling springs for newly merged/spawned fruits
    for (int i = 0; i < game.fruitCount; i++) {
        Fruit* f = &game.fruits[i];
        if (f->active && f->scale < f->scaleTarget) {
            f->scale += 6.0f * dt; // Rapid expansion
            if (f->scale > f->scaleTarget) f->scale = f->scaleTarget;
        }
    }

    // Update Physics engine
    UpdatePhysics(dt);

    // Update VFX & Text
    UpdateParticles(dt);
    UpdateFloatingTexts(dt);

    // --- GAME OVER DETECTION ---
    bool anyFruitOverflowing = false;
    for (int i = 0; i < game.fruitCount; i++) {
        Fruit* f = &game.fruits[i];
        if (f->active && !f->isStatic) {
            // Check if fruit center or peak goes above the warning line
            float peakY = f->position.y - f->radius;
            if (peakY < DEATH_LINE_Y) {
                anyFruitOverflowing = true;
                f->timeAboveLimit += dt;
                
                // If a single fruit is above for more than 2 seconds, Game Over
                if (f->timeAboveLimit >= 2.0f) {
                    game.state = STATE_GAMEOVER;
                    // Spawn huge game over particles
                    for (int j = 0; j < game.fruitCount; j++) {
                        if (game.fruits[j].active && !game.fruits[j].isStatic) {
                            SpawnParticleBurst(game.fruits[j].position, FRUIT_DEFS[game.fruits[j].type].color, 6);
                        }
                    }
                    break;
                }
            } else {
                // Cool down
                f->timeAboveLimit = fmaxf(0.0f, f->timeAboveLimit - dt);
            }
        }
    }

    if (anyFruitOverflowing) {
        game.warningTime += dt;
        game.warningActive = true;
    } else {
        game.warningTime = fmaxf(0.0f, game.warningTime - dt);
        game.warningActive = (game.warningTime > 0.0f);
    }
}

void DrawGame(void) {
    // Clear background with deep midnight space gradient
    ClearBackground((Color){ 10, 15, 28, 255 });
    
    // Draw background grid/stars for premium look
    for (int i = 0; i < SCREEN_WIDTH; i += 50) {
        DrawLine(i, 0, i, SCREEN_HEIGHT, (Color){ 25, 30, 50, 40 });
    }
    for (int i = 0; i < SCREEN_HEIGHT; i += 50) {
        DrawLine(0, i, SCREEN_WIDTH, i, (Color){ 25, 30, 50, 40 });
    }

    // --- DRAW LEFT SIDEBAR (SCORE & NEXT PREVIEW) ---
    int cardX = 35;
    int cardY = 150;
    int cardW = 160;
    
    // Card Background (Glassmorphism)
    DrawRectangleRounded((Rectangle){ (float)cardX, (float)cardY, (float)cardW, 160.0f }, 0.12f, 8, (Color){ 22, 28, 50, 180 });
    DrawRectangleRoundedLines((Rectangle){ (float)cardX, (float)cardY, (float)cardW, 160.0f }, 0.12f, 8, (Color){ 80, 100, 170, 100 });
    
    DrawText("SCORE", cardX + 20, cardY + 20, 14, (Color){ 130, 160, 240, 255 });
    char scoreStr[16];
    sprintf(scoreStr, "%05d", (int)game.scoreVisual);
    DrawText(scoreStr, cardX + 20, cardY + 45, 28, WHITE);

    DrawText("HIGH SCORE", cardX + 20, cardY + 95, 12, (Color){ 160, 180, 210, 200 });
    char hiStr[16];
    sprintf(hiStr, "%05d", game.highScore);
    DrawText(hiStr, cardX + 20, cardY + 115, 20, GOLD);

    // Next Fruit Card
    int nextCardY = cardY + 190;
    DrawRectangleRounded((Rectangle){ (float)cardX, (float)nextCardY, (float)cardW, 160.0f }, 0.12f, 8, (Color){ 22, 28, 50, 180 });
    DrawRectangleRoundedLines((Rectangle){ (float)cardX, (float)nextCardY, (float)cardW, 160.0f }, 0.12f, 8, (Color){ 80, 100, 170, 100 });
    
    DrawText("NEXT FRUIT", cardX + 20, nextCardY + 15, 14, (Color){ 130, 160, 240, 255 });
    
    // Draw Next Fruit Render in Center of Card
    Vector2 previewCenter = { (float)cardX + (float)cardW / 2.0f, (float)nextCardY + 95.0f };
    DrawGlossyCircle(previewCenter, FRUIT_DEFS[game.nextDroppedType].radius, FRUIT_DEFS[game.nextDroppedType].color, 0.9f, 0.0f, game.nextDroppedType);
    DrawText(FRUIT_DEFS[game.nextDroppedType].name, cardX + 20, nextCardY + 35, 12, (Color){ 200, 220, 255, 160 });

    // Help controls card at bottom left
    int helpY = nextCardY + 190;
    DrawRectangleRounded((Rectangle){ (float)cardX, (float)helpY, (float)cardW, 180.0f }, 0.12f, 8, (Color){ 16, 20, 36, 120 });
    DrawRectangleRoundedLines((Rectangle){ (float)cardX, (float)helpY, (float)cardW, 180.0f }, 0.12f, 8, (Color){ 50, 70, 120, 60 });
    DrawText("CONTROLS", cardX + 15, helpY + 15, 12, (Color){ 130, 160, 240, 180 });
    DrawText("[Mouse X] : Aim", cardX + 15, helpY + 45, 11, (Color){ 170, 190, 225, 200 });
    DrawText("[Click]   : Drop", cardX + 15, helpY + 70, 11, (Color){ 170, 190, 225, 200 });
    DrawText("[A] / [D] : Aim Left/Right", cardX + 15, helpY + 95, 11, (Color){ 170, 190, 225, 160 });
    DrawText("[Space]   : Drop", cardX + 15, helpY + 120, 11, (Color){ 170, 190, 225, 160 });
    DrawText("[R]       : Restart", cardX + 15, helpY + 145, 11, (Color){ 170, 190, 225, 160 });

    // --- DRAW CENTRAL PLAYING CONTAINER ---
    // Outer shadow / glow for container
    Color glassBg = (Color){ 15, 20, 42, 140 };
    DrawRectangle(CONTAINER_X, CONTAINER_Y, CONTAINER_WIDTH, CONTAINER_HEIGHT, glassBg);
    
    // Draw Glass panel container borders (Neon outline)
    Color neonBorder = (Color){ 90, 130, 255, 200 };
    if (game.warningActive) {
        // Pulse red on warning
        float pulse = sinf(GetTime() * 12.0f) * 0.5f + 0.5f;
        neonBorder = ColorAlphaBlend((Color){ 255, 40, 60, 255 }, (Color){ 90, 130, 255, 200 }, (Color){ 255, 255, 255, (unsigned char)(pulse * 255) });
    }
    DrawRectangleLinesEx((Rectangle){ (float)CONTAINER_X, (float)CONTAINER_Y, (float)CONTAINER_WIDTH, (float)CONTAINER_HEIGHT }, 4.0f, neonBorder);

    // Draw active fruits inside container
    for (int i = 0; i < game.fruitCount; i++) {
        Fruit* f = &game.fruits[i];
        if (f->active) {
            // Draw warning ring around fruits that are above death line
            if (!f->isStatic && (f->position.y - f->radius) < DEATH_LINE_Y) {
                float progress = f->timeAboveLimit / 2.0f;
                float ringRadius = f->radius * f->scale * (1.1f + sinf(GetTime() * 10.0f) * 0.05f);
                DrawCircleLinesV(f->position, ringRadius, (Color){ 255, 30, 50, (unsigned char)(progress * 255.0f) });
            }
            DrawGlossyCircle(f->position, f->radius, FRUIT_DEFS[f->type].color, f->scale, f->rotation, f->type);
        }
    }

    // Draw warning death line
    Color limitLineColor = (Color){ 255, 165, 0, 120 };
    if (game.warningActive) {
        // Red flashing line on danger
        float pulse = sinf(GetTime() * 10.0f) * 0.5f + 0.5f;
        limitLineColor = (Color){ 255, (unsigned char)(40 + 100 * (1.0f - pulse)), 50, (unsigned char)(150 + 100 * pulse) };
    }
    
    // Draw dotted line
    for (int x = CONTAINER_X; x < CONTAINER_X + CONTAINER_WIDTH; x += 15) {
        DrawLine(x, DEATH_LINE_Y, x + 8, DEATH_LINE_Y, limitLineColor);
    }
    DrawText("LIMIT LINE", CONTAINER_X + 15, DEATH_LINE_Y - 14, 10, limitLineColor);

    // Draw dropper preview helper (Aiming dashed line)
    if (!game.hasDropped && game.state == STATE_PLAYING) {
        DrawLineDashed((Vector2){ game.dropperX, CONTAINER_Y + 70.0f }, (Vector2){ game.dropperX, CONTAINER_Y + CONTAINER_HEIGHT }, 6.0f, 6.0f, (Color){ 255, 255, 255, 40 });
        
        // Draw elegant dropper cloud
        DrawCircle(game.dropperX, CONTAINER_Y + 15.0f, 22.0f, (Color){ 240, 245, 255, 200 });
        DrawCircle(game.dropperX - 18.0f, CONTAINER_Y + 18.0f, 15.0f, (Color){ 220, 225, 245, 180 });
        DrawCircle(game.dropperX + 18.0f, CONTAINER_Y + 18.0f, 15.0f, (Color){ 220, 225, 245, 180 });
    }

    // --- DRAW RIGHT SIDEBAR (EVO WHEEL) ---
    Vector2 wheelCenter = { (float)SCREEN_WIDTH - 145.0f, (float)SCREEN_HEIGHT / 2.0f + 20.0f };
    DrawEvoWheel(wheelCenter, 90.0f);

    // Game Title text at top
    int logoW = MeasureText("SUIKA GAME", 36);
    DrawText("SUIKA GAME", SCREEN_WIDTH / 2 - logoW / 2 + 3, CONTAINER_Y - 50 + 3, 36, (Color){ 10, 12, 24, 255 }); // Shadow
    DrawText("SUIKA GAME", SCREEN_WIDTH / 2 - logoW / 2, CONTAINER_Y - 50, 36, WHITE);
    DrawText("CLONE", SCREEN_WIDTH / 2 + logoW / 2 + 10, CONTAINER_Y - 38, 12, (Color){ 245, 130, 30, 255 });

    // Draw active VFX particles & floating texts
    DrawParticles();
    DrawFloatingTexts();

    // --- DRAW STATES OVERLAYS (START / GAMEOVER) ---
    if (game.state == STATE_START) {
        // Elegant overlay
        DrawRectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, (Color){ 10, 15, 28, 200 });
        
        Vector2 boxCenter = { SCREEN_WIDTH / 2.0f, SCREEN_HEIGHT / 2.0f };
        DrawRectangleRounded((Rectangle){ boxCenter.x - 200, boxCenter.y - 150, 400, 300 }, 0.1f, 8, (Color){ 22, 28, 50, 245 });
        DrawRectangleRoundedLines((Rectangle){ boxCenter.x - 200, boxCenter.y - 150, 400, 300 }, 0.1f, 8, neonBorder);

        DrawText("SUIKA GAME", boxCenter.x - MeasureText("SUIKA GAME", 32)/2, boxCenter.y - 110, 32, WHITE);
        DrawText("C & Raylib Edition", boxCenter.x - MeasureText("C & Raylib Edition", 14)/2, boxCenter.y - 70, 14, (Color){ 130, 160, 240, 255 });

        // Draw three cute preview fruits inside welcome window
        DrawGlossyCircle((Vector2){ boxCenter.x - 80, boxCenter.y }, 24.0f, FRUIT_DEFS[FRUIT_CHERRY].color, 1.0f, 0.0f, FRUIT_CHERRY);
        DrawGlossyCircle((Vector2){ boxCenter.x, boxCenter.y }, 28.0f, FRUIT_DEFS[FRUIT_GRAPE].color, 1.0f, 0.0f, FRUIT_GRAPE);
        DrawGlossyCircle((Vector2){ boxCenter.x + 80, boxCenter.y }, 34.0f, FRUIT_DEFS[FRUIT_DEKOPON].color, 1.0f, 0.0f, FRUIT_DEKOPON);

        float flash = sinf(GetTime() * 5.0f) * 0.5f + 0.5f;
        Color pressColor = WHITE;
        pressColor.a = (unsigned char)(150 + 105 * flash);
        
        DrawText("PRESS SPACE or CLICK TO PLAY", boxCenter.x - MeasureText("PRESS SPACE or CLICK TO PLAY", 14)/2, boxCenter.y + 75, 14, pressColor);
        DrawText("Merge identical fruits to reach the ultimate WATERMELON!", boxCenter.x - MeasureText("Merge identical fruits to reach the ultimate WATERMELON!", 11)/2, boxCenter.y + 110, 11, (Color){ 180, 195, 220, 180 });
    }

    if (game.state == STATE_GAMEOVER) {
        DrawRectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, (Color){ 25, 10, 15, 180 });
        
        Vector2 boxCenter = { SCREEN_WIDTH / 2.0f, SCREEN_HEIGHT / 2.0f };
        DrawRectangleRounded((Rectangle){ boxCenter.x - 200, boxCenter.y - 150, 400, 300 }, 0.1f, 8, (Color){ 36, 18, 24, 250 });
        DrawRectangleRoundedLines((Rectangle){ boxCenter.x - 200, boxCenter.y - 150, 400, 300 }, 0.1f, 8, RED);

        DrawText("GAME OVER", boxCenter.x - MeasureText("GAME OVER", 36)/2, boxCenter.y - 110, 36, RED);
        
        char finalScore[32];
        sprintf(finalScore, "FINAL SCORE: %d", game.score);
        DrawText(finalScore, boxCenter.x - MeasureText(finalScore, 20)/2, boxCenter.y - 50, 20, WHITE);

        if (game.score == game.highScore && game.score > 0) {
            DrawText("NEW HIGH SCORE!", boxCenter.x - MeasureText("NEW HIGH SCORE!", 16)/2, boxCenter.y - 15, 16, GOLD);
        }

        DrawText("The fruits overflowed the container!", boxCenter.x - MeasureText("The fruits overflowed the container!", 12)/2, boxCenter.y + 25, 12, (Color){ 200, 170, 170, 200 });

        float flash = sinf(GetTime() * 5.0f) * 0.5f + 0.5f;
        Color pressColor = WHITE;
        pressColor.a = (unsigned char)(150 + 105 * flash);
        
        DrawText("PRESS SPACE TO PLAY AGAIN", boxCenter.x - MeasureText("PRESS SPACE TO PLAY AGAIN", 14)/2, boxCenter.y + 80, 14, pressColor);
    }
}

void UnloadGame(void) {
    // No special dynamically allocated structures to free for standard C buffers
}
