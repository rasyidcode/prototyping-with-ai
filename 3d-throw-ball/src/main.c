// 3D throw-ball prototype using Raylib.
//
// Controls:
//   Hold LEFT mouse and drag back to aim.
//   Release LEFT mouse to throw.
//   Hold RIGHT mouse to orbit the camera.
//   Mouse wheel to zoom.
//   R to reset the ball at any time.
//
// Build with `make`, run with `make run`.

#include "game.h"

int main(void) {
    const int screen_w = 1280;
    const int screen_h = 720;

    SetConfigFlags(FLAG_MSAA_4X_HINT | FLAG_VSYNC_HINT);
    InitWindow(screen_w, screen_h, "3D Throw Ball");
    SetTargetFPS(60);

    Game game;
    game_init(&game);

    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        game_update(&game, dt);

        BeginDrawing();
        ClearBackground((Color){135, 206, 235, 255});   // sky blue
        BeginMode3D(game.camera);
        game_draw(&game);
        EndMode3D();
        EndDrawing();
    }

    game_shutdown(&game);
    CloseWindow();
    return 0;
}
