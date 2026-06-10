#include "raylib.h"
#include "raymath.h"

#include <math.h>
#include <stdbool.h>

#define SCREEN_WIDTH 1280
#define SCREEN_HEIGHT 720

#define BALL_RADIUS 0.28f
#define GRAVITY 9.8f
#define RIM_RADIUS 0.58f
#define RIM_HEIGHT 2.85f
#define RIM_Z -8.0f
#define BACKBOARD_Z -8.45f

typedef struct Ball {
    Vector3 position;
    Vector3 velocity;
    bool flying;
    bool scoredThisShot;
} Ball;

static Vector3 BallStartPosition(void)
{
    return (Vector3){0.0f, 1.05f, 3.2f};
}

static void ResetBall(Ball *ball)
{
    ball->position = BallStartPosition();
    ball->velocity = (Vector3){0.0f, 0.0f, 0.0f};
    ball->flying = false;
    ball->scoredThisShot = false;
}

static float ClampFloat(float value, float minValue, float maxValue)
{
    return fmaxf(minValue, fminf(maxValue, value));
}

static void UpdateFlyingBall(Ball *ball, float dt, int *score)
{
    const Vector3 previous = ball->position;

    ball->velocity.y -= GRAVITY * dt;
    ball->position = Vector3Add(ball->position, Vector3Scale(ball->velocity, dt));

    if (ball->position.y - BALL_RADIUS <= 0.0f) {
        ball->position.y = BALL_RADIUS;
        ball->velocity.y *= -0.45f;
        ball->velocity.x *= 0.72f;
        ball->velocity.z *= 0.72f;

        if (fabsf(ball->velocity.y) < 0.35f) {
            ResetBall(ball);
            return;
        }
    }

    if (ball->position.z - BALL_RADIUS <= BACKBOARD_Z &&
        ball->position.y > RIM_HEIGHT - 0.9f &&
        ball->position.y < RIM_HEIGHT + 1.0f &&
        fabsf(ball->position.x) < 1.15f) {
        ball->position.z = BACKBOARD_Z + BALL_RADIUS;
        ball->velocity.z *= -0.55f;
    }

    const bool crossedHoopPlane = previous.y > RIM_HEIGHT && ball->position.y <= RIM_HEIGHT;
    const float dx = ball->position.x;
    const float dz = ball->position.z - RIM_Z;
    const float distanceFromCenter = sqrtf(dx * dx + dz * dz);

    if (!ball->scoredThisShot && crossedHoopPlane && distanceFromCenter < RIM_RADIUS - BALL_RADIUS * 0.25f) {
        (*score)++;
        ball->scoredThisShot = true;
    }

    const float rimTubeRadius = 0.06f;
    const bool nearRimHeight = fabsf(ball->position.y - RIM_HEIGHT) < BALL_RADIUS + rimTubeRadius;
    const bool touchingRim = nearRimHeight && fabsf(distanceFromCenter - RIM_RADIUS) < BALL_RADIUS + rimTubeRadius;

    if (touchingRim && distanceFromCenter > 0.001f) {
        Vector3 normal = {dx / distanceFromCenter, 0.0f, dz / distanceFromCenter};
        float impact = Vector3DotProduct(ball->velocity, normal);

        if (impact < 0.0f) {
            ball->velocity = Vector3Subtract(ball->velocity, Vector3Scale(normal, 1.75f * impact));
            ball->velocity = Vector3Scale(ball->velocity, 0.78f);
            ball->position = Vector3Add(ball->position, Vector3Scale(normal, BALL_RADIUS + rimTubeRadius));
        }
    }

    if (ball->position.y < -8.0f || ball->position.z < -16.0f || ball->position.z > 8.0f || fabsf(ball->position.x) > 9.0f) {
        ResetBall(ball);
    }
}

static void DrawCourt(void)
{
    DrawPlane((Vector3){0.0f, 0.0f, -2.5f}, (Vector2){11.0f, 16.0f}, (Color){222, 176, 104, 255});
    DrawGrid(16, 1.0f);
    DrawCube((Vector3){0.0f, 1.55f, BACKBOARD_Z}, 2.25f, 1.35f, 0.08f, (Color){232, 238, 242, 210});
    DrawCubeWires((Vector3){0.0f, 1.55f, BACKBOARD_Z}, 2.25f, 1.35f, 0.08f, DARKGRAY);
    DrawCylinderWires((Vector3){0.0f, RIM_HEIGHT, RIM_Z}, RIM_RADIUS, RIM_RADIUS, 0.035f, 48, RED);
    DrawCylinder((Vector3){0.0f, 1.35f, BACKBOARD_Z - 0.08f}, 0.06f, 0.06f, 2.7f, 12, DARKGRAY);
}

static void DrawBall(Vector3 position)
{
    DrawSphere(position, BALL_RADIUS, (Color){220, 112, 36, 255});
    DrawSphereWires(position, BALL_RADIUS + 0.003f, 16, 16, (Color){78, 45, 28, 255});
}

int main(void)
{
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "Raylib Basketball Throw");
    SetTargetFPS(60);

    Camera3D camera = {0};
    camera.position = (Vector3){0.0f, 3.2f, 8.5f};
    camera.target = (Vector3){0.0f, 1.7f, -4.0f};
    camera.up = (Vector3){0.0f, 1.0f, 0.0f};
    camera.fovy = 50.0f;
    camera.projection = CAMERA_PERSPECTIVE;

    Ball ball = {0};
    ResetBall(&ball);

    float aimX = 0.0f;
    float power = 11.5f;
    int score = 0;

    while (!WindowShouldClose()) {
        const float dt = GetFrameTime();

        if (!ball.flying) {
            aimX = ClampFloat(aimX + (IsKeyDown(KEY_RIGHT) - IsKeyDown(KEY_LEFT)) * 1.8f * dt, -1.8f, 1.8f);
            power = ClampFloat(power + (IsKeyDown(KEY_UP) - IsKeyDown(KEY_DOWN)) * 5.5f * dt, 7.0f, 16.0f);

            if (IsKeyPressed(KEY_SPACE)) {
                Vector3 target = {aimX, RIM_HEIGHT + 0.35f, RIM_Z + 0.2f};
                Vector3 direction = Vector3Normalize(Vector3Subtract(target, ball.position));
                ball.velocity = (Vector3){direction.x * power, 5.6f + power * 0.12f, direction.z * power};
                ball.flying = true;
            }
        } else {
            UpdateFlyingBall(&ball, dt, &score);
        }

        if (IsKeyPressed(KEY_R)) {
            ResetBall(&ball);
        }

        BeginDrawing();
        ClearBackground((Color){134, 184, 214, 255});

        BeginMode3D(camera);
        DrawCourt();
        DrawBall(ball.position);

        if (!ball.flying) {
            Vector3 aimTarget = {aimX, RIM_HEIGHT + 0.35f, RIM_Z + 0.2f};
            DrawLine3D(ball.position, aimTarget, BLUE);
            DrawSphere(aimTarget, 0.08f, BLUE);
        }
        EndMode3D();

        DrawRectangle(20, 20, 290, 120, (Color){255, 255, 255, 160});
        DrawText(TextFormat("Score: %d", score), 38, 34, 28, BLACK);
        DrawText(TextFormat("Power: %.1f", power), 38, 70, 20, DARKGRAY);
        DrawText("Arrow keys aim/power | Space throws | R resets", 38, 98, 16, DARKGRAY);

        if (!ball.flying) {
            DrawText("READY", SCREEN_WIDTH / 2 - 42, 24, 28, DARKBLUE);
        }

        EndDrawing();
    }

    CloseWindow();
    return 0;
}
