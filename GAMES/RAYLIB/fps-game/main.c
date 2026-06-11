#include "game.h"
#include "sound_synth.h"
#include "map.h"
#include "player.h"
#include "enemy.h"
#include "particles.h"
#include "drops.h"
#include <time.h>
#include <stdlib.h>
#include <stdio.h>

Bullet bullets[MAX_BULLETS] = { 0 };
extern Enemy enemies[MAX_ENEMIES];
static FloatingText floatingTexts[MAX_FLOATING_TEXTS] = { 0 };

static void SpawnFloatingText(Vector3 position, const char *text, Color color) {
    for (int i = 0; i < MAX_FLOATING_TEXTS; i++) {
        if (!floatingTexts[i].active) {
            floatingTexts[i].active = true;
            floatingTexts[i].position = (Vector3){
                position.x + ((float)rand() / RAND_MAX * 0.4f - 0.2f),
                position.y,
                position.z + ((float)rand() / RAND_MAX * 0.4f - 0.2f)
            };
            snprintf(floatingTexts[i].text, sizeof(floatingTexts[i].text), "%s", text);
            floatingTexts[i].color = color;
            floatingTexts[i].lifeTime = 0.6f;
            floatingTexts[i].maxLife = 0.6f;
            break;
        }
    }
}

static GameState gameState = STATE_MENU;
static Player player = { 0 };
static int currentWave = 0;
static int totalKills = 0;
static int score = 0;
static float waveStartCountdown = 0.0f;
static float damageFlashTimer = 0.0f;
static int menuSelection = 0;

static void StartNewGame(void) {
    InitPlayer(&player);
    InitParticles();
    InitEnemies();
    InitDrops();
    
    // Clear bullets
    for (int i = 0; i < MAX_BULLETS; i++) {
        bullets[i].active = false;
    }
    
    // Clear floating texts
    for (int i = 0; i < MAX_FLOATING_TEXTS; i++) {
        floatingTexts[i].active = false;
    }
    
    currentWave = 1;
    totalKills = 0;
    score = 0;
    waveStartCountdown = 3.0f;
    damageFlashTimer = 0.0f;
    gameState = STATE_PLAYING;
    
    // Lock cursor
    DisableCursor();
    
    SpawnEnemyWave(5, player.position);
}

static void UpdateBullets(float dt) {
    for (int i = 0; i < MAX_BULLETS; i++) {
        if (!bullets[i].active) continue;
        
        Bullet *b = &bullets[i];
        Vector3 oldPos = b->position;
        b->position = Vector3Add(b->position, Vector3Scale(b->velocity, dt));
        
        // 1. Map collision check
        float colF = b->position.x / CELL_SIZE + (float)MAP_WIDTH / 2.0f - 0.5f;
        float rowF = b->position.z / CELL_SIZE + (float)MAP_HEIGHT / 2.0f - 0.5f;
        int col = (int)roundf(colF);
        int row = (int)roundf(rowF);
        
        if (IsCellWall(col, row)) {
            b->active = false;
            // Spawn sparks hitting wall (blow back opposite to velocity)
            Vector3 sparkDir = Vector3Scale(Vector3Normalize(b->velocity), -1.0f);
            SpawnSparks(oldPos, sparkDir, b->color, 6, 3.5f);
            continue;
        }
        
        // 2. Character collision check
        if (b->isPlayerOwned) {
            // Check collision with all active enemies
            for (int e = 0; e < MAX_ENEMIES; e++) {
                if (!enemies[e].active) continue;
                
                Enemy *enemy = &enemies[e];
                
                // Cylinder collision on XZ plane
                float dx = b->position.x - enemy->position.x;
                float dz = b->position.z - enemy->position.z;
                float distSqXZ = dx * dx + dz * dz;
                float combinedRadius = enemy->radius + b->radius;
                
                if (distSqXZ < combinedRadius * combinedRadius) {
                    // Height check (Y axis)
                    float bottom = enemy->position.y;
                    float top = enemy->position.y + enemy->height;
                    
                    if (b->position.y >= bottom && b->position.y <= top) {
                        b->active = false;
                        enemy->health -= b->damage;
                        enemy->hitFlashTicks = 8;
                        
                        PlayGameSound(SND_HIT_ENEMY);
                        
                        // Spawn floating damage text above enemy
                        Vector3 fPos = { enemy->position.x, enemy->position.y + enemy->height, enemy->position.z };
                        Color dmgCol = (player.currentWeapon == WEAPON_PLASMA) ? (Color){ 0, 240, 255, 255 } : (Color){ 255, 120, 0, 255 };
                        SpawnFloatingText(fPos, TextFormat("%d", b->damage), dmgCol);
                        Vector3 sparkDir = Vector3Scale(Vector3Normalize(b->velocity), -0.6f);
                        SpawnSparks(b->position, sparkDir, b->color, 8, 4.0f);
                        
                        // Check death
                        if (enemy->health <= 0.0f) {
                            enemy->active = false;
                            score += (enemy->type == ENEMY_DRONE) ? 150 : 250;
                            totalKills++;
                            
                            Color explodeColor = (enemy->type == ENEMY_DRONE) ? (Color){ 255, 0, 120, 255 } : (Color){ 0, 255, 120, 255 };
                            SpawnExplosion(enemy->position, explodeColor, 20, 6.0f);
                            PlayGameSound(SND_EXPLOSION);
                            SpawnDrop(enemy->position);
                        }
                        break; // Stop checking other enemies for this bullet
                    }
                }
            }
        } else {
            // Check collision with player
            float dx = b->position.x - player.position.x;
            float dz = b->position.z - player.position.z;
            float distSqXZ = dx * dx + dz * dz;
            float combinedRadius = player.radius + b->radius;
            
            if (distSqXZ < combinedRadius * combinedRadius) {
                float bottom = player.position.y;
                float top = player.position.y + player.height;
                
                if (b->position.y >= bottom && b->position.y <= top) {
                    b->active = false;
                    player.health -= b->damage;
                    damageFlashTimer = 0.35f; // Set damage red vignetting timer
                    player.screenShake = Clamp(player.screenShake + 0.25f, 0.0f, 0.35f); // Trigger camera shake
                    
                    PlayGameSound(SND_HIT_PLAYER);
                    Vector3 sparkDir = Vector3Scale(Vector3Normalize(b->velocity), -0.6f);
                    SpawnSparks(b->position, sparkDir, RED, 10, 4.0f);
                    
                    if (player.health <= 0.0f) {
                        player.health = 0.0f;
                        gameState = STATE_GAMEOVER;
                        EnableCursor(); // Release mouse cursor
                    }
                }
            }
        }
    }
}

static void DrawBullets(void) {
    for (int i = 0; i < MAX_BULLETS; i++) {
        if (!bullets[i].active) continue;
        
        Bullet *b = &bullets[i];
        
        // Draw bullet as a trailing cylinder streak (like a laser projectile)
        Vector3 speedNorm = Vector3Normalize(b->velocity);
        Vector3 tailPos = Vector3Subtract(b->position, Vector3Scale(speedNorm, 0.25f));
        
        DrawCylinderEx(tailPos, b->position, b->radius, b->radius, 6, b->color);
    }
}

static int CountActiveEnemies(void) {
    int count = 0;
    for (int i = 0; i < MAX_ENEMIES; i++) {
        if (enemies[i].active) count++;
    }
    return count;
}

int main(void) {
    // Initialization
    srand((unsigned int)time(NULL));
    
    const int screenWidth = 1024;
    const int screenHeight = 768;
    
    InitWindow(screenWidth, screenHeight, "NEON DREAD - Raylib C FPS");
    SetTargetFPS(60);
    
    // Synthesize & load programmatic sounds
    InitGameSounds();
    InitGameMusic();
    
    // Main Game Loop
    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        if (dt > 0.1f) dt = 0.1f; // Prevent huge updates during lag spikes
        
        // --- 1. UPDATE ---
        switch (gameState) {
            case STATE_MENU: {
                if (IsKeyPressed(KEY_UP) || IsKeyPressed(KEY_W)) {
                    menuSelection = (menuSelection - 1 + 3) % 3;
                }
                if (IsKeyPressed(KEY_DOWN) || IsKeyPressed(KEY_S)) {
                    menuSelection = (menuSelection + 1) % 3;
                }
                if (IsKeyPressed(KEY_ENTER)) {
                    if (menuSelection == 0) {
                        StartNewGame();
                    } else if (menuSelection == 1) {
                        gameState = STATE_CONTROLS;
                    } else if (menuSelection == 2) {
                        break; // exit loop handled by WindowShouldClose or return
                    }
                }
                
                // Allow mouse selections
                Vector2 mousePos = GetMousePosition();
                for (int i = 0; i < 3; i++) {
                    Rectangle btnRect = { (float)screenWidth / 2 - 150, (float)320 + i * 65, 300, 45 };
                    if (CheckCollisionPointRec(mousePos, btnRect)) {
                        menuSelection = i;
                        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
                            if (i == 0) StartNewGame();
                            else if (i == 1) gameState = STATE_CONTROLS;
                            else if (i == 2) goto cleanup; // Exit
                        }
                    }
                }
            } break;
            
            case STATE_CONTROLS: {
                if (IsKeyPressed(KEY_ESCAPE) || IsKeyPressed(KEY_ENTER)) {
                    gameState = STATE_MENU;
                }
            } break;
            
            case STATE_PLAYING: {
                // Exit cursor lock on ESC
                if (IsKeyPressed(KEY_ESCAPE)) {
                    gameState = STATE_MENU;
                    EnableCursor();
                }
                
                UpdatePlayer(&player, dt);
                UpdateEnemies(&player, dt);
                UpdateBullets(dt);
                UpdateParticles(dt);
                UpdateDrops(&player, dt);
                
                // Update floating texts
                for (int i = 0; i < MAX_FLOATING_TEXTS; i++) {
                    if (floatingTexts[i].active) {
                        floatingTexts[i].lifeTime -= dt;
                        if (floatingTexts[i].lifeTime <= 0.0f) {
                            floatingTexts[i].active = false;
                        } else {
                            floatingTexts[i].position.y += 1.2f * dt; // Float upwards
                        }
                    }
                }
                
                if (damageFlashTimer > 0.0f) {
                    damageFlashTimer -= dt;
                }
                
                // Wave logic
                int activeEnemies = CountActiveEnemies();
                if (activeEnemies == 0) {
                    if (waveStartCountdown > 0.0f) {
                        waveStartCountdown -= dt;
                        if (waveStartCountdown <= 0.0f) {
                            currentWave++;
                            if (currentWave > 5) {
                                gameState = STATE_VICTORY;
                                EnableCursor();
                            } else {
                                // Wave rewards: fully stock ammo reserves and heal player +25 HP
                                player.weapons[WEAPON_PLASMA].reserve = player.weapons[WEAPON_PLASMA].maxReserve;
                                player.weapons[WEAPON_SHOTGUN].reserve = player.weapons[WEAPON_SHOTGUN].maxReserve;
                                player.health = Clamp(player.health + 30.0f, 0.0f, player.maxHealth);
                                
                                int numEnemies = 5 + (currentWave - 1) * 4;
                                SpawnEnemyWave(numEnemies, player.position);
                                waveStartCountdown = 0.0f;
                            }
                        }
                    } else {
                        // Start countdown to next wave
                        waveStartCountdown = 3.0f;
                    }
                }
            } break;
            
            case STATE_GAMEOVER:
            case STATE_VICTORY: {
                if (IsKeyPressed(KEY_ENTER)) {
                    gameState = STATE_MENU;
                }
            } break;
        }
        
        // Update dynamic procedural music
        UpdateGameMusic(gameState == STATE_PLAYING ? CountActiveEnemies() : 0);
        
        // --- 2. DRAW ---
        BeginDrawing();
        ClearBackground((Color){ 6, 6, 9, 255 }); // Very deep cyber dark space
        
        switch (gameState) {
            case STATE_MENU: {
                // Title with chromatic aberration glitch visual
                const char *titleText = "NEON DREAD";
                int textWidth = MeasureText(titleText, 64);
                int titleX = screenWidth / 2 - textWidth / 2;
                int titleY = 160;
                
                DrawText(titleText, titleX - 3, titleY, 64, MAGENTA);
                DrawText(titleText, titleX + 3, titleY, 64, (Color){ 0, 255, 255, 255 });
                DrawText(titleText, titleX, titleY, 64, WHITE);
                
                DrawText("Cybernetic Arena Shooter", screenWidth / 2 - MeasureText("Cybernetic Arena Shooter", 20) / 2, 235, 20, (Color){ 100, 100, 150, 200 });
                
                // Menu Buttons
                const char *options[3] = { "START SYSTEM", "CONTROLS", "DISCONNECT" };
                for (int i = 0; i < 3; i++) {
                    Rectangle btnRect = { (float)screenWidth / 2 - 150, (float)320 + i * 65, 300, 45 };
                    bool isSelected = (menuSelection == i);
                    
                    DrawRectangleRounded(btnRect, 0.2f, 4, isSelected ? (Color){ 20, 20, 40, 200 } : (Color){ 12, 12, 18, 180 });
                    DrawRectangleRoundedLines(btnRect, 0.2f, 4, isSelected ? (Color){ 0, 255, 220, 255 } : (Color){ 80, 80, 100, 150 });
                    
                    Color textColor = isSelected ? (Color){ 0, 255, 220, 255 } : (Color){ 170, 170, 200, 255 };
                    DrawText(options[i], screenWidth / 2 - MeasureText(options[i], 18) / 2, (int)btnRect.y + 13, 18, textColor);
                }
                
                DrawText("Raylib + C Cyber Engine", 20, screenHeight - 35, 14, (Color){ 70, 70, 90, 150 });
            } break;
            
            case STATE_CONTROLS: {
                DrawText("SYSTEM CONTROLS", screenWidth / 2 - MeasureText("SYSTEM CONTROLS", 36) / 2, 120, 36, (Color){ 0, 255, 220, 255 });
                
                int startY = 220;
                int spacing = 45;
                
                DrawText("WASD KEYS", 250, startY, 18, (Color){ 0, 255, 220, 255 });
                DrawText("Horizontal Movement", 450, startY, 18, WHITE);
                
                DrawText("MOUSE LOOK", 250, startY + spacing, 18, (Color){ 0, 255, 220, 255 });
                DrawText("Aim / Turn direction", 450, startY + spacing, 18, WHITE);
                
                DrawText("LEFT MOUSE", 250, startY + spacing * 2, 18, (Color){ 0, 255, 220, 255 });
                DrawText("Fire Charged Weapon", 450, startY + spacing * 2, 18, WHITE);
                
                DrawText("1 / 2 or WHEEL", 250, startY + spacing * 3, 18, (Color){ 0, 255, 220, 255 });
                DrawText("Switch Weaponry", 450, startY + spacing * 3, 18, WHITE);
                
                DrawText("R KEY", 250, startY + spacing * 4, 18, (Color){ 0, 255, 220, 255 });
                DrawText("Manual Reload Core", 450, startY + spacing * 4, 18, WHITE);
                
                DrawText("SPACE KEY", 250, startY + spacing * 5, 18, (Color){ 0, 255, 220, 255 });
                DrawText("Thruster Vertical Jump", 450, startY + spacing * 5, 18, WHITE);
                
                DrawText("LEFT SHIFT", 250, startY + spacing * 6, 18, (Color){ 0, 255, 220, 255 });
                DrawText("Overdrive Sprint", 450, startY + spacing * 6, 18, WHITE);
                
                DrawText("Press ESC to return to Menu", screenWidth / 2 - MeasureText("Press ESC to return to Menu", 16) / 2, startY + spacing * 8, 16, (Color){ 130, 130, 160, 255 });
            } break;
            
            case STATE_PLAYING: {
                // 3D Scene Rendering
                BeginMode3D(player.camera);
                
                // Draw a giant holographic "System Core" wireframe sphere in the high skybox
                DrawSphereWires((Vector3){ 0.0f, 32.0f, 0.0f }, 16.0f, 16, 16, (Color){ 255, 0, 150, 45 });
                
                DrawMap();
                DrawEnemies();
                DrawBullets();
                DrawParticles();
                DrawDrops();
                
                DrawPlayerWeapon(&player);
                
                EndMode3D();
                
                // 2D HUD Drawing
                DrawPlayerHUD(&player);
                
                // Draw Floating Texts projected onto 2D screen
                for (int i = 0; i < MAX_FLOATING_TEXTS; i++) {
                    if (floatingTexts[i].active) {
                        Vector2 screenPos = GetWorldToScreen(floatingTexts[i].position, player.camera);
                        
                        if (screenPos.x > 0 && screenPos.x < screenWidth && screenPos.y > 0 && screenPos.y < screenHeight) {
                            float ratio = floatingTexts[i].lifeTime / floatingTexts[i].maxLife;
                            int fontSize = (int)(22.0f * ratio + 10.0f);
                            int textWidth = MeasureText(floatingTexts[i].text, fontSize);
                            
                            Color col = floatingTexts[i].color;
                            col.a = (unsigned char)(255 * ratio);
                            
                            DrawText(floatingTexts[i].text, (int)screenPos.x - textWidth / 2 + 1, (int)screenPos.y - fontSize / 2 + 1, fontSize, (Color){ 0, 0, 0, col.a });
                            DrawText(floatingTexts[i].text, (int)screenPos.x - textWidth / 2, (int)screenPos.y - fontSize / 2, fontSize, col);
                        }
                    }
                }
                
                // Wave Info Overlay
                DrawText(TextFormat("SCORE: %06d", score), 40, 30, 20, (Color){ 0, 255, 220, 255 });
                DrawText(TextFormat("WAVE: %d / 5", currentWave), screenWidth / 2 - 60, 30, 22, MAGENTA);
                
                int activeEnemies = CountActiveEnemies();
                DrawText(TextFormat("HOSTILES: %d", activeEnemies), screenWidth - 180, 30, 20, RED);
                
                // Wave Countdown Banner
                if (activeEnemies == 0 && currentWave <= 5) {
                    const char *banner = TextFormat("WAVE %d DETECTED IN %.1fs", currentWave + 1, waveStartCountdown);
                    if (currentWave == 5) {
                        banner = "THREAT ELIMINATED. FINALIZING DATA...";
                    }
                    int wWidth = MeasureText(banner, 28);
                    
                    // Semi-transparent box backing
                    DrawRectangle(screenWidth / 2 - wWidth / 2 - 20, screenHeight / 2 - 80, wWidth + 40, 50, (Color){ 10, 10, 15, 200 });
                    DrawRectangleLines(screenWidth / 2 - wWidth / 2 - 20, screenHeight / 2 - 80, wWidth + 40, 50, MAGENTA);
                    
                    DrawText(banner, screenWidth / 2 - wWidth / 2, screenHeight / 2 - 68, 24, WHITE);
                }
                
                // Player Damage screen vignettes
                if (damageFlashTimer > 0.0f) {
                    float alphaRatio = damageFlashTimer / 0.35f;
                    unsigned char alphaVal = (unsigned char)(70 * alphaRatio);
                    // Draw red borders for vignetting
                    DrawRectangle(0, 0, screenWidth, 12, (Color){ 255, 0, 0, alphaVal });
                    DrawRectangle(0, screenHeight - 12, screenWidth, 12, (Color){ 255, 0, 0, alphaVal });
                    DrawRectangle(0, 0, 12, screenHeight, (Color){ 255, 0, 0, alphaVal });
                    DrawRectangle(screenWidth - 12, 0, 12, screenHeight, (Color){ 255, 0, 0, alphaVal });
                    
                    // Subtle overall red flash
                    DrawRectangle(0, 0, screenWidth, screenHeight, (Color){ 255, 0, 0, (unsigned char)(20 * alphaRatio) });
                }
            } break;
            
            case STATE_GAMEOVER: {
                // Red theme game over
                DrawRectangle(0, 0, screenWidth, screenHeight, (Color){ 15, 5, 5, 240 });
                
                const char *goText = "CONNECTION TERMINATED";
                DrawText(goText, screenWidth / 2 - MeasureText(goText, 48) / 2, screenHeight / 2 - 120, 48, RED);
                
                DrawText("Core Integrity: 0%", screenWidth / 2 - MeasureText("Core Integrity: 0%", 20) / 2, screenHeight / 2 - 50, 20, (Color){ 180, 150, 150, 255 });
                DrawText(TextFormat("Kills: %d  |  Final Score: %d", totalKills, score), screenWidth / 2 - MeasureText(TextFormat("Kills: %d  |  Final Score: %d", totalKills, score), 18) / 2, screenHeight / 2, 18, WHITE);
                
                DrawText("PRESS ENTER TO RETRY", screenWidth / 2 - MeasureText("PRESS ENTER TO RETRY", 18) / 2, screenHeight / 2 + 80, 18, (Color){ 0, 255, 220, 255 });
            } break;
            
            case STATE_VICTORY: {
                // Cyber celebration theme
                DrawRectangle(0, 0, screenWidth, screenHeight, (Color){ 5, 15, 10, 240 });
                
                const char *vicText = "ARENA PURIFIED";
                // Chromatic visual
                int vX = screenWidth / 2 - MeasureText(vicText, 52) / 2;
                DrawText(vicText, vX - 2, screenHeight / 2 - 120, 52, GREEN);
                DrawText(vicText, vX + 2, screenHeight / 2 - 120, 52, (Color){ 0, 255, 255, 255 });
                DrawText(vicText, vX, screenHeight / 2 - 120, 52, WHITE);
                
                DrawText("System Core Restored", screenWidth / 2 - MeasureText("System Core Restored", 20) / 2, screenHeight / 2 - 50, 20, (Color){ 150, 220, 180, 255 });
                DrawText(TextFormat("Hostiles Eliminated: %d  |  Perfect Score: %d", totalKills, score), screenWidth / 2 - MeasureText(TextFormat("Hostiles Eliminated: %d  |  Perfect Score: %d", totalKills, score), 18) / 2, screenHeight / 2, 18, WHITE);
                
                DrawText("PRESS ENTER TO RETURN TO MAIN MENU", screenWidth / 2 - MeasureText("PRESS ENTER TO RETURN TO MAIN MENU", 18) / 2, screenHeight / 2 + 80, 18, (Color){ 0, 255, 220, 255 });
            } break;
        }
        
        EndDrawing();
    }

cleanup:
    // Unloads
    CloseGameMusic();
    UnloadGameSounds();
    CloseWindow();
    
    return 0;
}
