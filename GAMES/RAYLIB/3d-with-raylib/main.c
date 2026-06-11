#include "raylib.h"

int main(void)
{
    const int screenWidth = 1280;
    const int screenHeight = 720;

    InitWindow(screenWidth, screenHeight, "Lesson 01 - First 3D Scene");

    /*
        A Camera3D describes where your eyes are in the 3D world.

        position: where the camera is
        target:   what the camera is looking at
        up:       which direction is "up" for the camera
        fovy:     field of view, like the camera lens width
    */
    Camera3D camera = { 0 };
    camera.position = (Vector3){ 4.0f, 3.0f, 4.0f };
    camera.target = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.fovy = 45.0f;
    camera.projection = CAMERA_PERSPECTIVE;

    /*
        Raylib can update a camera for us.
        CAMERA_FREE means WASD + mouse movement.
    */
    SetTargetFPS(60);
    DisableCursor();

    while (!WindowShouldClose())
    {
        /*
            UPDATE STEP

            This is where game logic goes.
            For now, Raylib handles camera movement for us.
        */
        UpdateCamera(&camera, CAMERA_FREE);

        /*
            DRAW STEP

            First clear the screen, then enter 3D mode, draw 3D objects,
            leave 3D mode, and finally draw 2D text on top.
        */
        BeginDrawing();
        ClearBackground(RAYWHITE);

        BeginMode3D(camera);

        DrawGrid(20, 1.0f);

        DrawCube((Vector3){ 0.0f, 0.5f, 0.0f }, 1.0f, 1.0f, 1.0f, RED);
        DrawCubeWires((Vector3){ 0.0f, 0.5f, 0.0f }, 1.0f, 1.0f, 1.0f, MAROON);

        DrawSphere((Vector3){ 2.0f, 0.5f, 0.0f }, 0.5f, BLUE);
        DrawCylinder((Vector3){ -2.0f, 0.5f, 0.0f }, 0.5f, 0.5f, 1.0f, 24, GREEN);

        EndMode3D();

        DrawText("WASD + mouse to move. Esc to quit.", 20, 20, 20, DARKGRAY);
        DrawFPS(screenWidth - 100, 20);

        EndDrawing();
    }

    CloseWindow();

    return 0;
}
