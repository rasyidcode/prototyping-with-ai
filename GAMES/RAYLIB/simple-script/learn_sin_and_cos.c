#include <math.h>
#include <stdio.h>

#include <raylib.h>

int main(void) {
    const int screenWidth = 1000;
    const int screenHeight = 600;

    InitWindow(screenWidth, screenHeight, "learn sin and cos");
    SetTargetFPS(60);

    const Vector2 center = { 250.0f, 300.0f };
    const float radius = 140.0f;
    float angle = 0.0f;

    while (!WindowShouldClose()) {
        const float dt = GetFrameTime();

        if (IsKeyDown(KEY_RIGHT)) {
            angle += 1.8f * dt;
        }
        if (IsKeyDown(KEY_LEFT)) {
            angle -= 1.8f * dt;
        }
        if (IsKeyDown(KEY_SPACE)) {
            angle += 1.0f * dt;
        }

        const float c = cosf(angle);
        const float s = sinf(angle);

        Vector2 point = {
            center.x + c * radius,
            center.y - s * radius
        };

        char angleText[64];
        char cosText[64];
        char sinText[64];
        snprintf(angleText, sizeof(angleText), "angle: %.2f radians", angle);
        snprintf(cosText, sizeof(cosText), "cos(angle) = %.2f", c);
        snprintf(sinText, sizeof(sinText), "sin(angle) = %.2f", s);

        BeginDrawing();
            ClearBackground(RAYWHITE);

            DrawText("sin and cos are coordinates on a circle", 28, 24, 28, BLACK);
            DrawText("Hold SPACE to animate. LEFT/RIGHT changes the angle.", 30, 60, 18, DARKGRAY);

            DrawCircleLines((int)center.x, (int)center.y, radius, LIGHTGRAY);
            DrawLine((int)(center.x - radius - 30.0f), (int)center.y, (int)(center.x + radius + 30.0f), (int)center.y, GRAY);
            DrawLine((int)center.x, (int)(center.y - radius - 30.0f), (int)center.x, (int)(center.y + radius + 30.0f), GRAY);

            DrawLineEx(center, point, 3.0f, BLACK);
            DrawLine((int)center.x, (int)point.y, (int)point.x, (int)point.y, RED);
            DrawLine((int)point.x, (int)center.y, (int)point.x, (int)point.y, BLUE);
            DrawCircleV(point, 8.0f, BLACK);

            DrawText("cos controls x", (int)(center.x + 12.0f), (int)(center.y + radius + 34.0f), 18, RED);
            DrawText("sin controls y", (int)(center.x - radius - 28.0f), (int)(center.y - radius - 34.0f), 18, BLUE);

            DrawText(angleText, 520, 110, 24, BLACK);
            DrawText(cosText, 520, 150, 24, RED);
            DrawText(sinText, 520, 190, 24, BLUE);

            DrawText("Raylib screen y goes down, so this example uses:", 520, 245, 18, DARKGRAY);
            DrawText("x = center.x + cos(angle) * radius", 520, 275, 18, RED);
            DrawText("y = center.y - sin(angle) * radius", 520, 305, 18, BLUE);

            const int graphX = 520;
            const int graphY = 410;
            const int graphWidth = 420;
            const int graphHeight = 120;
            const float graphMiddle = graphY + graphHeight / 2.0f;
            const float graphScale = graphHeight / 2.5f;

            DrawText("waves made from the same angle", graphX, graphY - 32, 18, BLACK);
            DrawRectangleLines(graphX, graphY, graphWidth, graphHeight, LIGHTGRAY);
            DrawLine(graphX, (int)graphMiddle, graphX + graphWidth, (int)graphMiddle, LIGHTGRAY);

            for (int x = 0; x < graphWidth - 1; x++) {
                const float t0 = angle + x * 0.035f;
                const float t1 = angle + (x + 1) * 0.035f;

                DrawLine(
                    graphX + x,
                    (int)(graphMiddle - cosf(t0) * graphScale),
                    graphX + x + 1,
                    (int)(graphMiddle - cosf(t1) * graphScale),
                    RED
                );

                DrawLine(
                    graphX + x,
                    (int)(graphMiddle - sinf(t0) * graphScale),
                    graphX + x + 1,
                    (int)(graphMiddle - sinf(t1) * graphScale),
                    BLUE
                );
            }

            DrawText("cos", graphX + 8, graphY + 8, 18, RED);
            DrawText("sin", graphX + 58, graphY + 8, 18, BLUE);
        EndDrawing();
    }

    CloseWindow();

    return 0;
}
