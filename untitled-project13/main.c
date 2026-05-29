#include "raylib.h"

#define PHYSAC_IMPLEMENTATION
#include "physac.h"

#include <math.h>
#include <stdbool.h>
#include <stdio.h>
#include <time.h>

#define SCREEN_WIDTH 720
#define SCREEN_HEIGHT 900
#define PLAY_X 140.0f
#define PLAY_Y 120.0f
#define PLAY_WIDTH 440.0f
#define PLAY_HEIGHT 700.0f
#define DANGER_Y (PLAY_Y + 95.0f)
#define DROP_Y (PLAY_Y + 40.0f)
#define MAX_FRUITS 40
#define FRUIT_LEVELS 10

typedef struct FruitSpec {
    float radius;
    Color color;
    const char *label;
    int score;
} FruitSpec;

typedef struct Fruit {
    PhysicsBody body;
    int level;
    bool active;
} Fruit;

static const FruitSpec FRUITS[FRUIT_LEVELS] = {
    { 16.0f, { 245, 92, 92, 255 }, "1", 1 },
    { 21.0f, { 255, 154, 87, 255 }, "2", 3 },
    { 26.0f, { 253, 214, 99, 255 }, "3", 6 },
    { 31.0f, { 129, 211, 109, 255 }, "4", 10 },
    { 37.0f, { 74, 190, 133, 255 }, "5", 15 },
    { 44.0f, { 90, 182, 224, 255 }, "6", 21 },
    { 52.0f, { 104, 135, 226, 255 }, "7", 28 },
    { 61.0f, { 164, 112, 221, 255 }, "8", 36 },
    { 72.0f, { 226, 113, 188, 255 }, "9", 45 },
    { 86.0f, { 57, 178, 94, 255 }, "10", 55 },
};

static Fruit fruits[MAX_FRUITS] = { 0 };
static PhysicsBody walls[4] = { 0 };
static int currentLevel = 0;
static int nextLevel = 0;
static int score = 0;
static bool gameOver = false;
static double lastDropTime = 0.0;

static float ClampDropX(float x, int level)
{
    float radius = FRUITS[level].radius;
    float minX = PLAY_X + radius;
    float maxX = PLAY_X + PLAY_WIDTH - radius;
    if (x < minX) return minX;
    if (x > maxX) return maxX;
    return x;
}

static int RandomSmallFruit(void)
{
    return GetRandomValue(0, 3);
}

static void ClearFruitSlots(void)
{
    for (int i = 0; i < MAX_FRUITS; i++) {
        fruits[i].body = NULL;
        fruits[i].level = 0;
        fruits[i].active = false;
    }
}

static int FindFreeFruitSlot(void)
{
    for (int i = 0; i < MAX_FRUITS; i++) {
        if (!fruits[i].active) return i;
    }
    return -1;
}

static PhysicsBody MakeCircleBody(Vector2 position, int level)
{
    PhysicsBody body = CreatePhysicsBodyCircle(position, FRUITS[level].radius, 10.0f);
    if (body != NULL) {
        body->restitution = 0.05f;
        body->staticFriction = 0.55f;
        body->dynamicFriction = 0.35f;
        body->freezeOrient = false;
    }
    return body;
}

static bool AddFruit(Vector2 position, int level)
{
    int slot = FindFreeFruitSlot();
    if (slot < 0) return false;

    PhysicsBody body = MakeCircleBody(position, level);
    if (body == NULL) return false;

    fruits[slot].body = body;
    fruits[slot].level = level;
    fruits[slot].active = true;
    return true;
}

static void RemoveFruit(int index)
{
    if (!fruits[index].active) return;

    DestroyPhysicsBody(fruits[index].body);
    fruits[index].body = NULL;
    fruits[index].level = 0;
    fruits[index].active = false;
}

static void CreateWalls(void)
{
    walls[0] = CreatePhysicsBodyRectangle((Vector2){ PLAY_X + PLAY_WIDTH * 0.5f, PLAY_Y + PLAY_HEIGHT + 12.0f }, PLAY_WIDTH + 24.0f, 24.0f, 0.0f);
    walls[1] = CreatePhysicsBodyRectangle((Vector2){ PLAY_X - 12.0f, PLAY_Y + PLAY_HEIGHT * 0.5f }, 24.0f, PLAY_HEIGHT, 0.0f);
    walls[2] = CreatePhysicsBodyRectangle((Vector2){ PLAY_X + PLAY_WIDTH + 12.0f, PLAY_Y + PLAY_HEIGHT * 0.5f }, 24.0f, PLAY_HEIGHT, 0.0f);
    walls[3] = CreatePhysicsBodyRectangle((Vector2){ PLAY_X + PLAY_WIDTH * 0.5f, PLAY_Y - 22.0f }, PLAY_WIDTH + 24.0f, 24.0f, 0.0f);

    for (int i = 0; i < 4; i++) {
        if (walls[i] != NULL) {
            walls[i]->enabled = false;
            walls[i]->restitution = 0.02f;
            walls[i]->staticFriction = 0.8f;
            walls[i]->dynamicFriction = 0.55f;
        }
    }
}

static void ResetGame(void)
{
    ResetPhysics();
    SetPhysicsGravity(0.0f, 9.81f);
    SetPhysicsTimeStep(1.0 / 60.0 / 10.0 * 1000.0);
    ClearFruitSlots();
    CreateWalls();

    currentLevel = RandomSmallFruit();
    nextLevel = RandomSmallFruit();
    score = 0;
    gameOver = false;
    lastDropTime = -1.0;
}

static void DropFruit(float x)
{
    if (gameOver) return;
    if (GetTime() - lastDropTime < 0.35) return;

    x = ClampDropX(x, currentLevel);
    if (AddFruit((Vector2){ x, DROP_Y }, currentLevel)) {
        currentLevel = nextLevel;
        nextLevel = RandomSmallFruit();
        lastDropTime = GetTime();
    }
}

static void MergeFruitPair(int a, int b)
{
    int level = fruits[a].level;
    Vector2 posA = fruits[a].body->position;
    Vector2 posB = fruits[b].body->position;
    Vector2 velA = fruits[a].body->velocity;
    Vector2 velB = fruits[b].body->velocity;
    Vector2 mergePos = { (posA.x + posB.x) * 0.5f, (posA.y + posB.y) * 0.5f };
    Vector2 mergeVel = { (velA.x + velB.x) * 0.25f, (velA.y + velB.y) * 0.25f };

    RemoveFruit(b);
    RemoveFruit(a);

    score += FRUITS[level].score;

    if (level + 1 < FRUIT_LEVELS) {
        int slot = FindFreeFruitSlot();
        if (slot >= 0) {
            PhysicsBody body = MakeCircleBody(mergePos, level + 1);
            if (body != NULL) {
                body->velocity = mergeVel;
                fruits[slot].body = body;
                fruits[slot].level = level + 1;
                fruits[slot].active = true;
            }
        }
    }
}

static bool ResolveOneMerge(void)
{
    for (int i = 0; i < MAX_FRUITS; i++) {
        if (!fruits[i].active) continue;

        for (int j = i + 1; j < MAX_FRUITS; j++) {
            if (!fruits[j].active) continue;
            if (fruits[i].level != fruits[j].level) continue;

            float radius = FRUITS[fruits[i].level].radius;
            Vector2 a = fruits[i].body->position;
            Vector2 b = fruits[j].body->position;
            float dx = a.x - b.x;
            float dy = a.y - b.y;
            float distanceSq = dx * dx + dy * dy;
            float mergeDistance = radius * 2.08f;

            if (distanceSq <= mergeDistance * mergeDistance) {
                MergeFruitPair(i, j);
                return true;
            }
        }
    }
    return false;
}

static void ResolveMerges(void)
{
    for (int i = 0; i < 4; i++) {
        if (!ResolveOneMerge()) break;
    }
}

static void KeepFruitsInBounds(void)
{
    for (int i = 0; i < MAX_FRUITS; i++) {
        if (!fruits[i].active) continue;

        PhysicsBody body = fruits[i].body;
        float radius = FRUITS[fruits[i].level].radius;
        float minX = PLAY_X + radius;
        float maxX = PLAY_X + PLAY_WIDTH - radius;
        float maxY = PLAY_Y + PLAY_HEIGHT - radius;

        if (body->position.x < minX) {
            body->position.x = minX;
            if (body->velocity.x < 0.0f) body->velocity.x *= -0.2f;
        }
        if (body->position.x > maxX) {
            body->position.x = maxX;
            if (body->velocity.x > 0.0f) body->velocity.x *= -0.2f;
        }
        if (body->position.y > maxY) {
            body->position.y = maxY;
            if (body->velocity.y > 0.0f) body->velocity.y *= -0.15f;
        }
    }
}

static void UpdateGameOver(void)
{
    if (gameOver) return;
    if (GetTime() - lastDropTime < 2.0) return;

    for (int i = 0; i < MAX_FRUITS; i++) {
        if (!fruits[i].active) continue;

        PhysicsBody body = fruits[i].body;
        float radius = FRUITS[fruits[i].level].radius;
        bool nearRest = fabsf(body->velocity.x) < 12.0f && fabsf(body->velocity.y) < 12.0f;

        if (nearRest && body->position.y - radius < DANGER_Y) {
            gameOver = true;
            return;
        }
    }
}

static void DrawFruitCircle(Vector2 position, int level)
{
    const FruitSpec *fruit = &FRUITS[level];
    DrawCircleV(position, fruit->radius, fruit->color);
    DrawCircleLines((int)position.x, (int)position.y, fruit->radius, Fade(BLACK, 0.28f));

    int fontSize = level < 6 ? 18 : 22;
    int textWidth = MeasureText(fruit->label, fontSize);
    DrawText(fruit->label, (int)(position.x - textWidth * 0.5f), (int)(position.y - fontSize * 0.5f), fontSize, Fade(BLACK, 0.55f));
}

static void DrawHud(void)
{
    DrawText("Watermelon Game", 30, 26, 32, (Color){ 48, 52, 66, 255 });
    DrawText(TextFormat("Score: %d", score), 30, 70, 24, (Color){ 48, 52, 66, 255 });

    DrawText("Next", 610, 128, 22, (Color){ 48, 52, 66, 255 });
    DrawFruitCircle((Vector2){ 635.0f, 190.0f }, nextLevel);

    DrawText("Move mouse", 584, 290, 18, (Color){ 86, 91, 108, 255 });
    DrawText("Click/Space", 584, 314, 18, (Color){ 86, 91, 108, 255 });
    DrawText("R restart", 584, 338, 18, (Color){ 86, 91, 108, 255 });
}

static void DrawWorld(float dropX)
{
    DrawRectangleRounded((Rectangle){ PLAY_X - 16.0f, PLAY_Y - 16.0f, PLAY_WIDTH + 32.0f, PLAY_HEIGHT + 32.0f }, 0.04f, 8, (Color){ 245, 241, 230, 255 });
    DrawRectangleLinesEx((Rectangle){ PLAY_X, PLAY_Y, PLAY_WIDTH, PLAY_HEIGHT }, 4.0f, (Color){ 84, 74, 67, 255 });
    DrawLineEx((Vector2){ PLAY_X, DANGER_Y }, (Vector2){ PLAY_X + PLAY_WIDTH, DANGER_Y }, 2.0f, Fade(RED, 0.45f));

    for (int i = 0; i < MAX_FRUITS; i++) {
        if (fruits[i].active) DrawFruitCircle(fruits[i].body->position, fruits[i].level);
    }

    if (!gameOver) {
        DrawLineEx((Vector2){ dropX, PLAY_Y + 6.0f }, (Vector2){ dropX, DROP_Y - FRUITS[currentLevel].radius - 4.0f }, 2.0f, Fade((Color){ 48, 52, 66, 255 }, 0.28f));
        DrawFruitCircle((Vector2){ dropX, DROP_Y }, currentLevel);
    }
}

int main(void)
{
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "Watermelon Game - Raylib + Physac");
    SetTargetFPS(60);
    InitPhysics();
    SetRandomSeed((unsigned int)time(NULL));
    ResetGame();

    while (!WindowShouldClose()) {
        float dropX = ClampDropX((float)GetMouseX(), currentLevel);

        if (IsKeyPressed(KEY_R)) ResetGame();
        if (!gameOver && (IsMouseButtonPressed(MOUSE_LEFT_BUTTON) || IsKeyPressed(KEY_SPACE))) DropFruit(dropX);

        if (!gameOver) {
            UpdatePhysics();
            KeepFruitsInBounds();
            ResolveMerges();
            UpdateGameOver();
        }

        BeginDrawing();
        ClearBackground((Color){ 251, 248, 239, 255 });
        DrawHud();
        DrawWorld(dropX);

        if (gameOver) {
            DrawRectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, Fade(BLACK, 0.35f));
            DrawText("Game Over", 246, 380, 48, RAYWHITE);
            DrawText(TextFormat("Score: %d", score), 300, 438, 28, RAYWHITE);
            DrawText("Press R to restart", 250, 482, 24, RAYWHITE);
        }

        EndDrawing();
    }

    ClosePhysics();
    CloseWindow();
    return 0;
}
