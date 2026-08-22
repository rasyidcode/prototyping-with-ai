/**
 * @file main.c
 * @brief Entry point for the Vita Mahjong Solitaire clone in Raylib & C.
 *
 * Designed with senior-friendly accessibility:
 * - High-contrast large tiles.
 * - Dimmed locked tiles for quick visual scanning.
 * - No time-limit anxiety.
 * - Undo, Hint, and Shuffle boosters.
 */

#include "raylib.h"
#include "game.h"
#include <time.h>
#include <stdlib.h>

int main(void) {
    // Seed random generator for layout shuffles
    srand((unsigned int)time(NULL));

    // Desired desktop window size
    const int screenWidth = 1280;
    const int screenHeight = 760;

    // Enable Anti-Aliasing for crisp 2.5D tile rendering
    SetConfigFlags(FLAG_MSAA_4X_HINT | FLAG_WINDOW_RESIZABLE);
    InitWindow(screenWidth, screenHeight, "Vita Mahjong - Relaxing Zen Solitaire");
    SetTargetFPS(60);

    // Initialize Game with Classic Shanghai Turtle layout (144 tiles)
    Game game;
    Game_Init(&game, LAYOUT_TURTLE);

    // Main Game Loop
    while (!WindowShouldClose()) {
        float dt = GetFrameTime();

        // 1. Update Game Logic & Inputs
        Game_Update(&game, dt);

        // 2. Render Screen
        BeginDrawing();
        ClearBackground((Color){ 20, 30, 40, 255 });
        
        Game_Draw(&game);

        EndDrawing();
    }

    // Clean up
    CloseWindow();
    return 0;
}
