#include "game.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

/**
 * @file game.c
 * @brief Core game loop, player interactions, undo system, boosters, and UI.
 */

// Helper to spawn celebration/sparkle particles
static void SpawnSparkles(Game *game, Vector2 center, Color color, int count) {
    for (int i = 0; i < count; i++) {
        if (game->particleCount >= MAX_PARTICLES) break;
        Particle *p = &game->particles[game->particleCount++];
        p->pos = center;
        float angle = (float)(rand() % 360) * DEG2RAD;
        float speed = (float)(rand() % 150 + 50);
        p->vel = (Vector2){ cosf(angle) * speed, sinf(angle) * speed };
        p->color = color;
        p->size = (float)(rand() % 6 + 3);
        p->alpha = 1.0f;
        p->life = 0.0f;
        p->maxLife = (float)(rand() % 10 + 10) / 10.0f; // 1.0 to 2.0s
    }
}

// Recalculates board centering on the screen
static void UpdateBoardOrigin(Game *game) {
    float boardWidth = (game->board.maxGx - game->board.minGx) * HALF_GRID_W + TILE_WIDTH;
    float boardHeight = (game->board.maxGy - game->board.minGy) * HALF_GRID_H + TILE_HEIGHT;
    
    int screenW = GetScreenWidth();
    int screenH = GetScreenHeight();

    // Center board with slight offset for the top and bottom HUD bars
    game->boardOrigin.x = (screenW - boardWidth) / 2.0f - (game->board.minGx * HALF_GRID_W);
    game->boardOrigin.y = (screenH - boardHeight) / 2.0f - (game->board.minGy * HALF_GRID_H) + 15.0f;
}

/**
 * @brief Starts a fresh game session.
 */
void Game_Init(Game *game, LayoutType layout) {
    Board_Init(&game->board, layout);
    UpdateBoardOrigin(game);

    game->state = GAME_STATE_PLAYING;
    game->undoCount = 0;
    game->selectedTile = -1;
    game->hoveredTile = -1;
    game->hintTileA = -1;
    game->hintTileB = -1;
    game->hintTimer = 0.0f;

    game->score = 0;
    game->combo = 0;
    game->comboTimer = 0.0f;
    game->moves = 0;
    game->playTime = 0.0f;
    game->messageTimer = 0.0f;
    game->particleCount = 0;
    game->message[0] = '\0';
}

/**
 * @brief Undoes the previous tile match.
 */
void Game_Undo(Game *game) {
    if (game->undoCount <= 0) return;

    UndoEntry *entry = &game->undoStack[--game->undoCount];
    
    // Restore both tiles to the board
    game->board.tiles[entry->tileA].active = true;
    game->board.tiles[entry->tileB].active = true;
    game->board.activeCount += 2;

    // Deduct score
    game->score -= entry->scoreGained;
    if (game->score < 0) game->score = 0;

    game->selectedTile = -1;
    game->hintTileA = -1;
    game->hintTileB = -1;

    Board_UpdateFreedom(&game->board);

    snprintf(game->message, sizeof(game->message), "Move Undone");
    game->messageTimer = 1.5f;

    if (game->state == GAME_STATE_DEADLOCK) {
        game->state = GAME_STATE_PLAYING;
    }
}

/**
 * @brief Highlights a legal matching pair.
 */
void Game_Hint(Game *game) {
    // Clear previous hint
    if (game->hintTileA != -1) game->board.tiles[game->hintTileA].isHighlighted = false;
    if (game->hintTileB != -1) game->board.tiles[game->hintTileB].isHighlighted = false;

    int a = -1, b = -1;
    if (Board_FindHintPair(&game->board, &a, &b)) {
        game->hintTileA = a;
        game->hintTileB = b;
        game->board.tiles[a].isHighlighted = true;
        game->board.tiles[b].isHighlighted = true;
        game->hintTimer = 4.0f; // Highlight for 4 seconds

        snprintf(game->message, sizeof(game->message), "Hint: %s", GetTileName(game->board.tiles[a].type));
        game->messageTimer = 2.5f;
    } else {
        snprintf(game->message, sizeof(game->message), "No Matches Left!");
        game->messageTimer = 2.5f;
        game->state = GAME_STATE_DEADLOCK;
    }
}

/**
 * @brief Shuffles remaining active tiles.
 */
void Game_Shuffle(Game *game) {
    Board_Shuffle(&game->board);
    game->selectedTile = -1;
    game->hintTileA = -1;
    game->hintTileB = -1;

    snprintf(game->message, sizeof(game->message), "Tiles Shuffled!");
    game->messageTimer = 2.0f;

    if (game->state == GAME_STATE_DEADLOCK) {
        game->state = GAME_STATE_PLAYING;
    }
}

/**
 * @brief Updates game logic and handles mouse/keyboard events.
 */
void Game_Update(Game *game, float dt) {
    UpdateBoardOrigin(game);

    // Update timers
    if (game->state == GAME_STATE_PLAYING) {
        game->playTime += dt;

        // Combo decay timer (5 seconds window to chain matches)
        if (game->comboTimer > 0.0f) {
            game->comboTimer -= dt;
            if (game->comboTimer <= 0.0f) {
                game->combo = 0;
            }
        }
    }

    if (game->messageTimer > 0.0f) {
        game->messageTimer -= dt;
    }

    // Update Hint highlight timer
    if (game->hintTimer > 0.0f) {
        game->hintTimer -= dt;
        if (game->hintTimer <= 0.0f) {
            if (game->hintTileA != -1) game->board.tiles[game->hintTileA].isHighlighted = false;
            if (game->hintTileB != -1) game->board.tiles[game->hintTileB].isHighlighted = false;
            game->hintTileA = -1;
            game->hintTileB = -1;
        }
    }

    // Update Particles
    for (int i = 0; i < game->particleCount; i++) {
        Particle *p = &game->particles[i];
        p->pos.x += p->vel.x * dt;
        p->pos.y += p->vel.y * dt;
        p->vel.y += 120.0f * dt; // Gravity
        p->life += dt;
        p->alpha = 1.0f - (p->life / p->maxLife);

        if (p->life >= p->maxLife) {
            // Remove particle by swapping with last
            game->particles[i] = game->particles[game->particleCount - 1];
            game->particleCount--;
            i--;
        }
    }

    // --- KEYBOARD SHORTCUTS ---
    if (IsKeyPressed(KEY_H)) Game_Hint(game);
    if (IsKeyPressed(KEY_U) || (IsKeyDown(KEY_LEFT_CONTROL) && IsKeyPressed(KEY_Z))) Game_Undo(game);
    if (IsKeyPressed(KEY_S)) Game_Shuffle(game);
    if (IsKeyPressed(KEY_N)) Game_Init(game, game->board.layout);
    if (IsKeyPressed(KEY_P)) {
        if (game->state == GAME_STATE_PLAYING) game->state = GAME_STATE_PAUSED;
        else if (game->state == GAME_STATE_PAUSED) game->state = GAME_STATE_PLAYING;
    }

    if (game->state != GAME_STATE_PLAYING) return;

    // --- MOUSE PICKING & INTERACTION ---
    Vector2 mousePos = GetMousePosition();
    game->hoveredTile = Board_GetTileAtScreenPos(&game->board, mousePos, game->boardOrigin);

    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        int clicked = game->hoveredTile;

        if (clicked != -1) {
            Tile *clickedTile = &game->board.tiles[clicked];

            // Only allow interaction if tile is free (unblocked)
            if (clickedTile->isFree) {
                if (game->selectedTile == -1) {
                    // First tile selected
                    game->selectedTile = clicked;
                } else if (game->selectedTile == clicked) {
                    // Clicked the same tile -> Deselect
                    game->selectedTile = -1;
                } else {
                    // Clicked a second free tile -> Check for match!
                    Tile *firstTile = &game->board.tiles[game->selectedTile];

                    if (TilesMatch(firstTile->type, clickedTile->type)) {
                        // MATCH SUCCESS!
                        firstTile->active = false;
                        clickedTile->active = false;
                        game->board.activeCount -= 2;
                        game->moves++;

                        // Combo & Score Calculation
                        game->combo++;
                        game->comboTimer = 5.0f; // 5 seconds to chain
                        int baseScore = 100;
                        int points = baseScore * (1 + (game->combo - 1) / 2);
                        game->score += points;

                        // Spawn sparkle particles at tile locations
                        Vector2 posA = Board_GetTileScreenPos(firstTile, game->boardOrigin);
                        Vector2 posB = Board_GetTileScreenPos(clickedTile, game->boardOrigin);
                        Vector2 centerA = { posA.x + TILE_WIDTH/2, posA.y + TILE_HEIGHT/2 };
                        Vector2 centerB = { posB.x + TILE_WIDTH/2, posB.y + TILE_HEIGHT/2 };
                        SpawnSparkles(game, centerA, (Color){ 255, 215, 0, 255 }, 12);
                        SpawnSparkles(game, centerB, (Color){ 255, 215, 0, 255 }, 12);

                        // Push to Undo Stack
                        if (game->undoCount < MAX_UNDO) {
                            game->undoStack[game->undoCount++] = (UndoEntry){
                                .tileA = game->selectedTile,
                                .tileB = clicked,
                                .scoreGained = points
                            };
                        }

                        // Clear hints and selection
                        if (game->hintTileA != -1) game->board.tiles[game->hintTileA].isHighlighted = false;
                        if (game->hintTileB != -1) game->board.tiles[game->hintTileB].isHighlighted = false;
                        game->hintTileA = -1;
                        game->hintTileB = -1;
                        game->selectedTile = -1;

                        // Recalculate board freedom
                        Board_UpdateFreedom(&game->board);

                        // Check Win condition
                        if (game->board.activeCount == 0) {
                            game->state = GAME_STATE_VICTORY;
                            SpawnSparkles(game, (Vector2){ (float)GetScreenWidth()/2, (float)GetScreenHeight()/2 }, (Color){ 255, 180, 0, 255 }, 60);
                        } else {
                            // Check for Deadlock
                            int dummyA, dummyB;
                            if (!Board_FindHintPair(&game->board, &dummyA, &dummyB)) {
                                game->state = GAME_STATE_DEADLOCK;
                            }
                        }
                    } else {
                        // Clicked another tile that doesn't match -> Switch selection
                        game->selectedTile = clicked;
                    }
                }
            }
        } else {
            // Clicked outside board -> Deselect
            game->selectedTile = -1;
        }
    }
}

/**
 * @brief Helper to draw a modern rounded button with hover detection.
 */
static bool DrawButton(Rectangle rect, const char *label, const char *shortcut, Color baseColor, Color hoverColor) {
    Vector2 mouse = GetMousePosition();
    bool hovered = CheckCollisionPointRec(mouse, rect);
    Color col = hovered ? hoverColor : baseColor;

    DrawRectangleRounded(rect, 0.25f, 4, col);
    DrawRectangleRoundedLines(rect, 0.25f, 4, (Color){ 255, 255, 255, 70 });

    int fontSize = 16;
    int textW = MeasureText(label, fontSize);
    DrawText(label, (int)(rect.x + (rect.width - textW)/2.0f), (int)(rect.y + 8), fontSize, WHITE);

    if (shortcut) {
        int subSize = 11;
        int subW = MeasureText(shortcut, subSize);
        DrawText(shortcut, (int)(rect.x + (rect.width - subW)/2.0f), (int)(rect.y + 26), subSize, (Color){ 220, 230, 240, 200 });
    }

    return hovered && IsMouseButtonPressed(MOUSE_BUTTON_LEFT);
}

/**
 * @brief Draws the serene Zen background with soft gradients and decorative geometry.
 */
static void DrawZenBackground(void) {
    int w = GetScreenWidth();
    int h = GetScreenHeight();

    // Soothing deep teal / slate gradient
    Color colTop = (Color){ 28, 44, 58, 255 };
    Color colBottom = (Color){ 16, 26, 36, 255 };
    DrawRectangleGradientV(0, 0, w, h, colTop, colBottom);

    // Subtle atmospheric ambient circles
    DrawCircleGradient((Vector2){ (float)w / 4.0f, (float)h / 3.0f }, 280.0f, (Color){ 38, 70, 83, 60 }, (Color){ 0, 0, 0, 0 });
    DrawCircleGradient((Vector2){ (3.0f * w) / 4.0f, (2.0f * h) / 3.0f }, 320.0f, (Color){ 42, 157, 143, 45 }, (Color){ 0, 0, 0, 0 });
}

/**
 * @brief Draws the top HUD (score, remaining tiles, timer, combo).
 */
static void DrawHUD(const Game *game) {
    int w = GetScreenWidth();

    // Top Header Bar
    DrawRectangle(0, 0, w, 52, (Color){ 12, 20, 28, 200 });
    DrawLine(0, 52, w, 52, (Color){ 255, 255, 255, 25 });

    // Logo / Title
    DrawText("VITA MAHJONG", 24, 15, 22, (Color){ 250, 200, 100, 255 });

    // Remaining Tiles Counter (Large & legible for seniors)
    const char *tilesTxt = TextFormat("TILES LEFT: %d / %d", game->board.activeCount, game->board.tileCount);
    int tilesW = MeasureText(tilesTxt, 18);
    DrawText(tilesTxt, (w - tilesW) / 2, 17, 18, (Color){ 240, 240, 240, 255 });

    // Timer & Score on Right
    int minutes = (int)game->playTime / 60;
    int seconds = (int)game->playTime % 60;
    const char *statsTxt = TextFormat("SCORE: %d   TIME: %02d:%02d", game->score, minutes, seconds);
    int statsW = MeasureText(statsTxt, 18);
    DrawText(statsTxt, w - statsW - 24, 17, 18, (Color){ 200, 225, 245, 255 });

    // Combo banner if active
    if (game->combo > 1) {
        const char *comboTxt = TextFormat("COMBO x%d!", game->combo);
        DrawText(comboTxt, (w - tilesW) / 2 - 130, 17, 18, (Color){ 255, 130, 40, 255 });
    }

    // Floating notification message
    if (game->messageTimer > 0.0f) {
        float alpha = (game->messageTimer > 0.5f) ? 1.0f : (game->messageTimer / 0.5f);
        int msgW = MeasureText(game->message, 20);
        Rectangle msgRect = { (w - msgW - 40) / 2.0f, 65.0f, msgW + 40.0f, 36.0f };
        DrawRectangleRounded(msgRect, 0.4f, 4, ColorAlpha((Color){ 10, 20, 30, 220 }, alpha));
        DrawRectangleRoundedLines(msgRect, 0.4f, 4, ColorAlpha((Color){ 255, 215, 0, 180 }, alpha));
        DrawText(game->message, (int)(msgRect.x + 20), (int)(msgRect.y + 8), 20, ColorAlpha((Color){ 255, 240, 200, 255 }, alpha));
    }
}

/**
 * @brief Draws the bottom booster toolbar (Undo, Hint, Shuffle, Restart).
 */
static void DrawBottomToolbar(const Game *game) {
    int w = GetScreenWidth();
    int h = GetScreenHeight();

    // Bottom Bar Background
    DrawRectangle(0, h - 65, w, 65, (Color){ 12, 20, 28, 200 });
    DrawLine(0, h - 65, w, 65, (Color){ 255, 255, 255, 25 });

    float btnW = 120.0f;
    float btnH = 45.0f;
    float spacing = 20.0f;
    float totalW = (btnW * 4) + (spacing * 3);
    float startX = (w - totalW) / 2.0f;
    float btnY = h - 55.0f;

    Color cBlue   = (Color){ 41, 128, 185, 255 };
    Color cBlueH  = (Color){ 52, 152, 219, 255 };
    Color cGold   = (Color){ 211, 140, 14, 255 };
    Color cGoldH  = (Color){ 243, 156, 18, 255 };
    Color cGreen  = (Color){ 39, 174, 96, 255 };
    Color cGreenH = (Color){ 46, 204, 113, 255 };
    Color cRed    = (Color){ 192, 57, 43, 255 };
    Color cRedH   = (Color){ 231, 76, 60, 255 };

    // Button 1: Undo
    if (DrawButton((Rectangle){ startX, btnY, btnW, btnH }, "UNDO", "[U]", cBlue, cBlueH)) {
        Game_Undo((Game*)game);
    }
    // Button 2: Hint
    if (DrawButton((Rectangle){ startX + (btnW + spacing), btnY, btnW, btnH }, "HINT", "[H]", cGold, cGoldH)) {
        Game_Hint((Game*)game);
    }
    // Button 3: Shuffle
    if (DrawButton((Rectangle){ startX + (btnW + spacing) * 2, btnY, btnW, btnH }, "SHUFFLE", "[S]", cGreen, cGreenH)) {
        Game_Shuffle((Game*)game);
    }
    // Button 4: New Game
    if (DrawButton((Rectangle){ startX + (btnW + spacing) * 3, btnY, btnW, btnH }, "RESTART", "[N]", cRed, cRedH)) {
        Game_Init((Game*)game, game->board.layout);
    }
}

/**
 * @brief Renders Victory overlay.
 */
static void DrawVictoryScreen(const Game *game) {
    int w = GetScreenWidth();
    int h = GetScreenHeight();

    // Dim background scrim
    DrawRectangle(0, 0, w, h, (Color){ 0, 0, 0, 180 });

    Rectangle card = { (w - 460) / 2.0f, (h - 320) / 2.0f, 460, 320 };
    DrawRectangleRounded(card, 0.15f, 4, (Color){ 24, 34, 48, 255 });
    DrawRectangleRoundedLines(card, 0.15f, 4, (Color){ 255, 215, 0, 255 });

    DrawText("STAGE CLEARED!", (int)card.x + 105, (int)card.y + 30, 28, (Color){ 255, 215, 0, 255 });
    
    int minutes = (int)game->playTime / 60;
    int seconds = (int)game->playTime % 60;

    DrawText(TextFormat("Final Score:  %d", game->score), (int)card.x + 120, (int)card.y + 90, 20, WHITE);
    DrawText(TextFormat("Total Moves:  %d", game->moves), (int)card.x + 120, (int)card.y + 130, 20, WHITE);
    DrawText(TextFormat("Clear Time:   %02d:%02d", minutes, seconds), (int)card.x + 120, (int)card.y + 170, 20, WHITE);

    if (DrawButton((Rectangle){ card.x + 130, card.y + 230, 200, 48 }, "PLAY AGAIN", "[N]", (Color){ 39, 174, 96, 255 }, (Color){ 46, 204, 113, 255 })) {
        Game_Init((Game*)game, game->board.layout);
    }
}

/**
 * @brief Renders Deadlock overlay (when no moves remain).
 */
static void DrawDeadlockScreen(const Game *game) {
    int w = GetScreenWidth();
    int h = GetScreenHeight();

    DrawRectangle(0, 0, w, h, (Color){ 0, 0, 0, 150 });

    Rectangle card = { (w - 420) / 2.0f, (h - 220) / 2.0f, 420, 220 };
    DrawRectangleRounded(card, 0.15f, 4, (Color){ 32, 28, 38, 255 });
    DrawRectangleRoundedLines(card, 0.15f, 4, (Color){ 231, 76, 60, 255 });

    DrawText("NO MOVES LEFT!", (int)card.x + 95, (int)card.y + 30, 26, (Color){ 255, 100, 100, 255 });
    DrawText("Shuffle the remaining tiles to continue.", (int)card.x + 45, (int)card.y + 80, 16, (Color){ 220, 220, 220, 255 });

    if (DrawButton((Rectangle){ card.x + 60, card.y + 135, 140, 45 }, "SHUFFLE", "[S]", (Color){ 39, 174, 96, 255 }, (Color){ 46, 204, 113, 255 })) {
        Game_Shuffle((Game*)game);
    }
    if (DrawButton((Rectangle){ card.x + 220, card.y + 135, 140, 45 }, "UNDO MOVE", "[U]", (Color){ 41, 128, 185, 255 }, (Color){ 52, 152, 219, 255 })) {
        Game_Undo((Game*)game);
    }
}

/**
 * @brief Main Render routine for the entire Game view.
 */
void Game_Draw(const Game *game) {
    // 1. Draw calming ambient background
    DrawZenBackground();

    // 2. Draw 2.5D Board and Tiles
    Board_Draw(&game->board, game->boardOrigin, game->selectedTile, game->hoveredTile);

    // 3. Draw Sparkle / Confetti Particles
    for (int i = 0; i < game->particleCount; i++) {
        const Particle *p = &game->particles[i];
        DrawCircleV(p->pos, p->size, ColorAlpha(p->color, p->alpha));
    }

    // 4. Draw HUD Header & Bottom Toolbar
    DrawHUD(game);
    DrawBottomToolbar(game);

    // 5. Draw Overlays if applicable
    if (game->state == GAME_STATE_VICTORY) {
        DrawVictoryScreen(game);
    } else if (game->state == GAME_STATE_DEADLOCK) {
        DrawDeadlockScreen(game);
    }
}
