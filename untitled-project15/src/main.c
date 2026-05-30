#include "raylib.h"
#include "game.h"

int main(void) {
    // 1. Initialize Raylib window
    // Use multi-sampling for smooth high-fidelity procedural circle borders!
    SetConfigFlags(FLAG_MSAA_4X_HINT);
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "Suika Game - C/Raylib Edition");
    
    SetTargetFPS(60);

    // 2. Initialize Game components & load high scores
    InitGame();

    // 3. Main game loop
    while (!WindowShouldClose()) {
        // Quick manual restart shortcut
        if (IsKeyPressed(KEY_R)) {
            InitGame();
        }

        // Calculate delta time, capping it to prevent physics breakdown during lag spikes
        float dt = GetFrameTime();
        if (dt > 0.1f) dt = 0.1f;

        // Update step
        UpdateGame(dt);

        // Rendering step
        BeginDrawing();
            DrawGame();
        EndDrawing();
    }

    // 4. Cleanup and Shutdown
    UnloadGame();
    CloseWindow();

    return 0;
}
