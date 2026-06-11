#include "raylib.h"
#include "raymath.h"
#include <math.h>

#define SCREEN_WIDTH 1280
#define SCREEN_HEIGHT 720
#define BALL_RADIUS 0.3f
#define HOOP_RADIUS 0.45f
#define HOOP_THICKNESS 0.05f
#define HOOP_HEIGHT 3.05f
#define HOOP_DISTANCE 7.0f
#define GRAVITY 18.0f
#define POWER_SCALE 12.0f
#define BALL_START_Y 1.5f
#define BALL_START_Z 4.0f
#define RESET_DELAY 0.4f

typedef struct Ball {
    Vector3 position;
    Vector3 velocity;
    bool flying;
} Ball;

int main(void) {
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "3D Basketball Throw");
    SetTargetFPS(60);

    Camera3D camera = { 0 };
    camera.position = (Vector3){ 0.0f, 4.5f, 9.0f };
    camera.target = (Vector3){ 0.0f, 1.8f, 0.0f };
    camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.fovy = 60.0f;
    camera.projection = CAMERA_PERSPECTIVE;

    Ball ball = { 0 };
    ball.position = (Vector3){ 0.0f, BALL_START_Y, BALL_START_Z };

    Vector3 hoopPos = { 0.0f, HOOP_HEIGHT, -HOOP_DISTANCE };

    bool scored = false;
    int score = 0;
    int attempts = 0;
    float resetTimer = 0.0f;
    float scoreMsgTimer = 0.0f;

    bool aiming = false;
    Vector2 aimStart = { 0 };
    Vector2 aimCurrent = { 0 };

    while (!WindowShouldClose()) {
        Vector2 mousePos = GetMousePosition();
        float dt = GetFrameTime();

        if (resetTimer > 0.0f) {
            resetTimer -= dt;
            if (resetTimer <= 0.0f) {
                ball.position = (Vector3){ 0.0f, BALL_START_Y, BALL_START_Z };
                ball.velocity = (Vector3){ 0, 0, 0 };
                scored = false;
            }
        }

        if (scoreMsgTimer > 0.0f) {
            scoreMsgTimer -= dt;
        }

        if (!ball.flying && resetTimer <= 0.0f) {
            if (IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) {
                aiming = true;
                aimStart = mousePos;
                aimCurrent = mousePos;
            }

            if (aiming) {
                aimCurrent = mousePos;
                if (IsMouseButtonReleased(MOUSE_LEFT_BUTTON)) {
                    Vector2 drag = { aimCurrent.x - aimStart.x, aimCurrent.y - aimStart.y };
                    float power = Clamp(Vector2Length(drag) / 180.0f, 0.2f, 1.6f);

                    Vector3 camForward = Vector3Subtract(camera.target, camera.position);
                    camForward.y = 0;
                    camForward = Vector3Normalize(camForward);
                    Vector3 camRight = Vector3CrossProduct(camForward, (Vector3){ 0, 1, 0 });

                    Vector3 throwDir = { 0 };
                    throwDir = Vector3Add(throwDir, Vector3Scale(camRight, drag.x * 0.006f));
                    throwDir = Vector3Add(throwDir, (Vector3){ 0, -drag.y * 0.006f, 0 });
                    throwDir = Vector3Add(throwDir, Vector3Scale(camForward, 1.2f));
                    throwDir = Vector3Normalize(throwDir);

                    ball.velocity = Vector3Scale(throwDir, power * POWER_SCALE);
                    ball.flying = true;
                    aiming = false;
                    attempts++;
                }
            }
        }

        if (ball.flying) {
            Vector3 prevPos = ball.position;
            ball.velocity.y -= GRAVITY * dt;
            ball.position.x += ball.velocity.x * dt;
            ball.position.y += ball.velocity.y * dt;
            ball.position.z += ball.velocity.z * dt;

            if (prevPos.y > hoopPos.y && ball.position.y <= hoopPos.y && !scored) {
                float dx = ball.position.x - hoopPos.x;
                float dz = ball.position.z - hoopPos.z;
                float distXZ = sqrtf(dx * dx + dz * dz);
                if (distXZ < HOOP_RADIUS - BALL_RADIUS * 0.3f) {
                    score++;
                    scored = true;
                    scoreMsgTimer = 1.5f;
                }
            }

            if (ball.position.y <= BALL_RADIUS) {
                ball.position.y = BALL_RADIUS;
                ball.velocity = (Vector3){ 0, 0, 0 };
                ball.flying = false;
                resetTimer = RESET_DELAY;
            }

            if (fabsf(ball.position.x) > 25.0f || fabsf(ball.position.z) > 25.0f || ball.position.y < -5.0f) {
                ball.flying = false;
                resetTimer = RESET_DELAY;
            }
        }

        if (IsKeyPressed(KEY_R)) {
            ball.flying = false;
            resetTimer = 0.0f;
            ball.position = (Vector3){ 0.0f, BALL_START_Y, BALL_START_Z };
            ball.velocity = (Vector3){ 0, 0, 0 };
            scored = false;
            score = 0;
            attempts = 0;
        }

        BeginDrawing();
        ClearBackground((Color){ 135, 206, 235, 255 });

        BeginMode3D(camera);

        DrawPlane((Vector3){ 0, 0, 0 }, (Vector2){ 30, 30 }, (Color){ 34, 139, 34, 255 });

        DrawCube((Vector3){ hoopPos.x, hoopPos.y, hoopPos.z - 0.05f }, 1.8f, 1.0f, 0.05f, WHITE);
        DrawCubeWires((Vector3){ hoopPos.x, hoopPos.y, hoopPos.z - 0.05f }, 1.8f, 1.0f, 0.05f, BLACK);
        DrawCube((Vector3){ hoopPos.x - 0.4f, hoopPos.y - 0.45f, hoopPos.z - 0.05f }, 0.3f, 0.3f, 0.05f, (Color){ 200, 0, 0, 255 });

        DrawCylinder((Vector3){ hoopPos.x, hoopPos.y, hoopPos.z }, HOOP_RADIUS, HOOP_RADIUS, HOOP_THICKNESS, 32, (Color){ 255, 69, 0, 255 });
        DrawCylinderWires((Vector3){ hoopPos.x, hoopPos.y, hoopPos.z }, HOOP_RADIUS, HOOP_RADIUS, HOOP_THICKNESS, 32, (Color){ 120, 30, 0, 255 });

        DrawCube((Vector3){ hoopPos.x, hoopPos.y / 2, hoopPos.z - 0.4f }, 0.1f, hoopPos.y, 0.1f, (Color){ 80, 80, 80, 255 });

        DrawSphere(ball.position, BALL_RADIUS, (Color){ 255, 140, 0, 255 });
        DrawSphereWires(ball.position, BALL_RADIUS, 8, 8, (Color){ 80, 40, 0, 255 });

        if (!ball.flying) {
            DrawCircle3D((Vector3){ ball.position.x, 0.02f, ball.position.z }, BALL_RADIUS * 1.2f, (Vector3){ 1, 0, 0 }, 90.0f, (Color){ 0, 0, 0, 60 });
        }

        EndMode3D();

        DrawText(TextFormat("Score: %d / %d", score, attempts), 20, 20, 30, BLACK);
        DrawText("Drag to aim, release to throw", 20, SCREEN_HEIGHT - 60, 20, DARKGRAY);
        DrawText("Press R to reset", 20, SCREEN_HEIGHT - 30, 20, DARKGRAY);

        if (aiming) {
            Vector2 drag = { aimCurrent.x - aimStart.x, aimCurrent.y - aimStart.y };
            DrawLineV(aimStart, aimCurrent, RED);
            DrawCircleV(aimStart, 6, RED);
            DrawCircleV(aimCurrent, 4, RED);
            float powerPct = Clamp(Vector2Length(drag) / 180.0f * 100.0f, 0.0f, 160.0f);
            DrawText(TextFormat("Power: %.0f%%", powerPct), aimCurrent.x + 10, aimCurrent.y - 10, 18, RED);
        }

        if (scoreMsgTimer > 0.0f) {
            const char *msg = "SCORE!";
            int w = MeasureText(msg, 80);
            int alpha = (int)(Clamp(scoreMsgTimer / 0.5f, 0.0f, 1.0f) * 255.0f);
            DrawText(msg, SCREEN_WIDTH / 2 - w / 2, SCREEN_HEIGHT / 2 - 40, 80, (Color){ 255, 215, 0, alpha });
        }

        EndDrawing();
    }

    CloseWindow();
    return 0;
}
