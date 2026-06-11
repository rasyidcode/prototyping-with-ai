#include "config.h"
#include "game.h"
#include "raylib.h"

int main(void)
{
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "1-Bit Starship Adventure");
    SetTargetFPS(60);

    Game game = { 0 };
    InitGame(&game);

    while (!WindowShouldClose()) {
        UpdateGame(&game, GetFrameTime());

        BeginDrawing();
        DrawGame(&game);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}
