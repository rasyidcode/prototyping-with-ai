#include "raylib.h"

int main(void)
{
    const int screenWidth = 1280;
    const int screenHeight = 720;

    InitWindow(screenWidth, screenHeight, "Lesson 02 - Move a Player Cube");
    SetTargetFPS(60);

    /*
        In lesson 01, the camera moved.
        In this lesson, the camera stays still and the player cube moves.

        That makes it easier to understand the next core game idea:
        an object has a position, and input changes that position over time.
    */
    Camera3D camera = { 0 };
    camera.position = (Vector3){ 6.0f, 6.0f, 6.0f };
    camera.target = (Vector3){ 0.0f, 0.0f, 0.0f };
    camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.fovy = 45.0f;
    camera.projection = CAMERA_PERSPECTIVE;

    /*
        This is our first "player".

        It is only a cube, but it already has the most important game data:
        where it is in the world.
    */
    Vector3 playerPosition = { 0.0f, 0.5f, 0.0f };
    const float playerSpeed = 4.0f;

    while (!WindowShouldClose())
    {
        /*
            GetFrameTime() gives the time since the last frame in seconds.

            Multiplying movement by deltaTime makes speed stable.
            Without it, the player moves faster on faster computers.
        */
        float deltaTime = GetFrameTime();
        float moveDistance = playerSpeed * deltaTime;

        /*
            We move on the X and Z axes.

            X is left/right.
            Y is up/down.
            Z is forward/back in this simple scene.
        */
        if (IsKeyDown(KEY_W)) playerPosition.z -= moveDistance;
        if (IsKeyDown(KEY_S)) playerPosition.z += moveDistance;
        if (IsKeyDown(KEY_A)) playerPosition.x -= moveDistance;
        if (IsKeyDown(KEY_D)) playerPosition.x += moveDistance;

        BeginDrawing();
        ClearBackground(RAYWHITE);

        BeginMode3D(camera);

        DrawGrid(20, 1.0f);

        /*
            The cube is drawn at playerPosition.
            When input changes playerPosition, the cube appears to move.
        */
        DrawCube(playerPosition, 1.0f, 1.0f, 1.0f, RED);
        DrawCubeWires(playerPosition, 1.0f, 1.0f, 1.0f, MAROON);

        /*
            These small cubes are landmarks.
            They help you see that the player is moving through a 3D space.
        */
        DrawCube((Vector3){ 3.0f, 0.5f, 0.0f }, 1.0f, 1.0f, 1.0f, BLUE);
        DrawCube((Vector3){ -3.0f, 0.5f, 0.0f }, 1.0f, 1.0f, 1.0f, GREEN);
        DrawCube((Vector3){ 0.0f, 0.5f, 3.0f }, 1.0f, 1.0f, 1.0f, GOLD);

        EndMode3D();

        DrawText("Lesson 02: WASD moves the player cube", 20, 20, 20, DARKGRAY);
        DrawText(TextFormat("player x: %.2f  z: %.2f", playerPosition.x, playerPosition.z),
                 20, 50, 20, DARKGRAY);
        DrawFPS(screenWidth - 100, 20);

        EndDrawing();
    }

    CloseWindow();

    return 0;
}
