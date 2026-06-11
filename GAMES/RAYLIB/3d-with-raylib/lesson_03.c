#include "raylib.h"

#define WALL_COUNT 4

static BoundingBox MakeCubeBox(Vector3 center, float size)
{
    float halfSize = size * 0.5f;

    BoundingBox box = { 0 };
    box.min = (Vector3){ center.x - halfSize, center.y - halfSize, center.z - halfSize };
    box.max = (Vector3){ center.x + halfSize, center.y + halfSize, center.z + halfSize };

    return box;
}

static bool TouchesAnyWall(BoundingBox playerBox, BoundingBox walls[], int wallCount)
{
    for (int i = 0; i < wallCount; i++)
    {
        if (CheckCollisionBoxes(playerBox, walls[i]))
        {
            return true;
        }
    }

    return false;
}

int main(void)
{
    const int screenWidth = 1280;
    const int screenHeight = 720;

    InitWindow(screenWidth, screenHeight, "Lesson 03 - Basic Collision");
    SetTargetFPS(60);

    Camera3D camera = { 0 };
    camera.position = (Vector3){ 7.0f, 7.0f, 7.0f };
    camera.target = (Vector3){ 0.0f, 0.0f, 0.0f };
    camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.fovy = 45.0f;
    camera.projection = CAMERA_PERSPECTIVE;

    Vector3 playerPosition = { 0.0f, 0.5f, 0.0f };
    const float playerSize = 1.0f;
    const float playerSpeed = 4.0f;

    /*
        These are solid walls.
        The Vector3 values are the center positions of the wall cubes.
    */
    Vector3 wallPositions[WALL_COUNT] = {
        { 2.0f, 0.5f, 0.0f },
        { 2.0f, 0.5f, 1.0f },
        { -2.0f, 0.5f, -1.0f },
        { 0.0f, 0.5f, -3.0f }
    };

    BoundingBox wallBoxes[WALL_COUNT] = { 0 };
    for (int i = 0; i < WALL_COUNT; i++)
    {
        wallBoxes[i] = MakeCubeBox(wallPositions[i], 1.0f);
    }

    while (!WindowShouldClose())
    {
        float deltaTime = GetFrameTime();
        float moveDistance = playerSpeed * deltaTime;

        /*
            Build the direction from input first.
            This keeps input separate from collision logic.
        */
        Vector3 movement = { 0.0f, 0.0f, 0.0f };

        if (IsKeyDown(KEY_W) || IsKeyDown(KEY_UP)) movement.z -= moveDistance;
        if (IsKeyDown(KEY_S) || IsKeyDown(KEY_DOWN)) movement.z += moveDistance;
        if (IsKeyDown(KEY_A) || IsKeyDown(KEY_LEFT)) movement.x -= moveDistance;
        if (IsKeyDown(KEY_D) || IsKeyDown(KEY_RIGHT)) movement.x += moveDistance;

        /*
            This is the important collision pattern:

            1. Create a possible next position.
            2. Build a box for that next position.
            3. Check whether the box touches a wall.
            4. Only accept the next position when it is clear.
        */
        Vector3 nextPosition = playerPosition;
        nextPosition.x += movement.x;
        nextPosition.z += movement.z;

        BoundingBox nextPlayerBox = MakeCubeBox(nextPosition, playerSize);

        if (!TouchesAnyWall(nextPlayerBox, wallBoxes, WALL_COUNT))
        {
            playerPosition = nextPosition;
        }

        BoundingBox playerBox = MakeCubeBox(playerPosition, playerSize);

        BeginDrawing();
        ClearBackground(RAYWHITE);

        BeginMode3D(camera);

        DrawGrid(20, 1.0f);

        DrawCube(playerPosition, playerSize, playerSize, playerSize, RED);
        DrawCubeWires(playerPosition, playerSize, playerSize, playerSize, MAROON);

        for (int i = 0; i < WALL_COUNT; i++)
        {
            DrawCube(wallPositions[i], 1.0f, 1.0f, 1.0f, DARKGRAY);
            DrawCubeWires(wallPositions[i], 1.0f, 1.0f, 1.0f, BLACK);
        }

        /*
            DrawBoundingBox is useful while learning.
            Real games often hide debug boxes, but they help you see collisions.
        */
        DrawBoundingBox(playerBox, GREEN);
        for (int i = 0; i < WALL_COUNT; i++)
        {
            DrawBoundingBox(wallBoxes[i], BLUE);
        }

        EndMode3D();

        DrawText("Lesson 03: collision blocks movement", 20, 20, 20, DARKGRAY);
        DrawText("WASD or arrow keys move. Try pushing into the gray walls.", 20, 50, 20, DARKGRAY);
        DrawText(TextFormat("player x: %.2f  z: %.2f", playerPosition.x, playerPosition.z),
                 20, 80, 20, DARKGRAY);
        DrawFPS(screenWidth - 100, 20);

        EndDrawing();
    }

    CloseWindow();

    return 0;
}
