#include "game.h"
#include "storage.h"

#include "raylib.h"

#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define SCREEN_WIDTH 720
#define SCREEN_HEIGHT 860
#define BOARD_PIXELS 560.0f
#define BOARD_X ((SCREEN_WIDTH - BOARD_PIXELS) * 0.5f)
#define BOARD_Y 245.0f
#define TILE_GAP 12.0f
#define TILE_SIZE ((BOARD_PIXELS - (TILE_GAP * (BOARD_SIZE + 1))) / BOARD_SIZE)
#define MAX_THEMES 3
#define MOVE_ANIMATION_SECONDS 0.13f
#define SPAWN_POP_SECONDS 0.18f

typedef struct Theme {
    const char *name;
    Color background;
    Color board;
    Color emptyTile;
    Color textDark;
    Color textLight;
    Color accent;
    Color button;
    Color buttonHover;
    Color overlay;
    Color tiles[12];
} Theme;

typedef struct Button {
    Rectangle bounds;
    const char *label;
} Button;

typedef struct MoveAnimation {
    MoveResult result;
    float elapsed;
    bool active;
} MoveAnimation;

static const Theme THEMES[MAX_THEMES] = {
    {
        "Classic",
        { 250, 248, 239, 255 },
        { 187, 173, 160, 255 },
        { 205, 193, 180, 255 },
        { 119, 110, 101, 255 },
        { 249, 246, 242, 255 },
        { 242, 177, 121, 255 },
        { 143, 122, 102, 255 },
        { 119, 99, 81, 255 },
        { 250, 248, 239, 225 },
        {
            { 238, 228, 218, 255 }, { 237, 224, 200, 255 },
            { 242, 177, 121, 255 }, { 245, 149, 99, 255 },
            { 246, 124, 95, 255 },  { 246, 94, 59, 255 },
            { 237, 207, 114, 255 }, { 237, 204, 97, 255 },
            { 237, 200, 80, 255 },  { 237, 197, 63, 255 },
            { 237, 194, 46, 255 },  { 60, 58, 50, 255 }
        }
    },
    {
        "Mint",
        { 236, 247, 242, 255 },
        { 125, 159, 148, 255 },
        { 197, 221, 212, 255 },
        { 47, 74, 68, 255 },
        { 248, 252, 250, 255 },
        { 28, 157, 137, 255 },
        { 48, 107, 96, 255 },
        { 35, 86, 77, 255 },
        { 236, 247, 242, 225 },
        {
            { 218, 239, 230, 255 }, { 196, 228, 215, 255 },
            { 137, 205, 184, 255 }, { 83, 181, 160, 255 },
            { 37, 158, 141, 255 },  { 24, 136, 124, 255 },
            { 248, 192, 92, 255 },  { 240, 159, 72, 255 },
            { 229, 119, 71, 255 },  { 197, 83, 76, 255 },
            { 157, 65, 78, 255 },   { 38, 56, 58, 255 }
        }
    },
    {
        "Ink",
        { 32, 37, 44, 255 },
        { 70, 82, 96, 255 },
        { 50, 59, 70, 255 },
        { 229, 234, 240, 255 },
        { 252, 252, 252, 255 },
        { 255, 184, 77, 255 },
        { 95, 111, 130, 255 },
        { 118, 136, 158, 255 },
        { 32, 37, 44, 225 },
        {
            { 99, 120, 143, 255 },  { 90, 143, 166, 255 },
            { 74, 169, 171, 255 },  { 82, 190, 139, 255 },
            { 154, 198, 87, 255 },  { 222, 193, 73, 255 },
            { 245, 154, 75, 255 },  { 237, 111, 89, 255 },
            { 205, 83, 121, 255 },  { 161, 83, 158, 255 },
            { 113, 91, 184, 255 },  { 226, 231, 237, 255 }
        }
    }
};

static int TileColorIndex(int value)
{
    int index = 0;

    while (value > 2 && index < 11) {
        value /= 2;
        index++;
    }

    return index;
}

static float EaseOutCubic(float t)
{
    float inverse = 1.0f - t;
    return 1.0f - inverse * inverse * inverse;
}

static void DrawCenteredText(const char *text, Rectangle bounds, int fontSize, Color color)
{
    int width = MeasureText(text, fontSize);
    float x = bounds.x + (bounds.width - width) * 0.5f;
    float y = bounds.y + (bounds.height - fontSize) * 0.5f;

    DrawText(text, (int)x, (int)y, fontSize, color);
}

static bool DrawButton(Button button, const Theme *theme)
{
    Vector2 mouse = GetMousePosition();
    bool hovered = CheckCollisionPointRec(mouse, button.bounds);

    DrawRectangleRounded(button.bounds, 0.16f, 8,
                         hovered ? theme->buttonHover : theme->button);
    DrawCenteredText(button.label, button.bounds, 20, theme->textLight);

    return hovered && IsMouseButtonPressed(MOUSE_BUTTON_LEFT);
}

static void DrawScorePanel(Rectangle bounds, const char *label, int value, const Theme *theme)
{
    char text[32];

    DrawRectangleRounded(bounds, 0.12f, 8, theme->board);
    DrawCenteredText(label, (Rectangle){ bounds.x, bounds.y + 9, bounds.width, 22 },
                     18, theme->textLight);
    snprintf(text, sizeof(text), "%d", value);
    DrawCenteredText(text, (Rectangle){ bounds.x, bounds.y + 34, bounds.width, 34 },
                     26, theme->textLight);
}

static Rectangle TileRect(int row, int col, float scale)
{
    float size = TILE_SIZE * scale;
    float x = BOARD_X + TILE_GAP + col * (TILE_SIZE + TILE_GAP) + (TILE_SIZE - size) * 0.5f;
    float y = BOARD_Y + TILE_GAP + row * (TILE_SIZE + TILE_GAP) + (TILE_SIZE - size) * 0.5f;

    return (Rectangle){ x, y, size, size };
}

static Vector2 TileCenter(int row, int col)
{
    Rectangle bounds = TileRect(row, col, 1.0f);
    return (Vector2){ bounds.x + bounds.width * 0.5f, bounds.y + bounds.height * 0.5f };
}

static Rectangle CenteredTileRect(Vector2 center, float scale)
{
    float size = TILE_SIZE * scale;
    return (Rectangle){ center.x - size * 0.5f, center.y - size * 0.5f, size, size };
}

static void DrawTileValue(int value, Rectangle bounds, const Theme *theme)
{
    char text[16];
    int fontSize = value < 100 ? 48 : (value < 1000 ? 42 : 34);
    Color tileColor = theme->tiles[TileColorIndex(value)];
    Color textColor = value <= 4 ? theme->textDark : theme->textLight;

    DrawRectangleRounded(bounds, 0.08f, 8, tileColor);
    snprintf(text, sizeof(text), "%d", value);
    DrawCenteredText(text, bounds, fontSize, textColor);
}

static void DrawBoardBackground(const Theme *theme)
{
    DrawRectangleRounded((Rectangle){ BOARD_X, BOARD_Y, BOARD_PIXELS, BOARD_PIXELS },
                         0.025f, 8, theme->board);

    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            DrawRectangleRounded(TileRect(row, col, 1.0f), 0.08f, 8, theme->emptyTile);
        }
    }
}

static void DrawStaticBoard(const Game *game, float spawnPop, int spawnRow, int spawnCol, const Theme *theme)
{
    DrawBoardBackground(theme);

    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            int value = game->board[row][col];
            float scale = 1.0f;

            if (value == 0) {
                continue;
            }

            if (spawnPop > 0.0f && row == spawnRow && col == spawnCol) {
                scale = 1.0f + spawnPop * 0.28f;
            }

            DrawTileValue(value, TileRect(row, col, scale), theme);
        }
    }
}

static void DrawMovingBoard(const MoveAnimation *animation, const Theme *theme)
{
    float progress = animation->elapsed / MOVE_ANIMATION_SECONDS;

    if (progress > 1.0f) {
        progress = 1.0f;
    }

    progress = EaseOutCubic(progress);
    DrawBoardBackground(theme);

    for (int i = 0; i < animation->result.motionCount; i++) {
        TileMotion motion = animation->result.motions[i];
        Vector2 from = TileCenter(motion.fromRow, motion.fromCol);
        Vector2 to = TileCenter(motion.toRow, motion.toCol);
        Vector2 center = {
            from.x + (to.x - from.x) * progress,
            from.y + (to.y - from.y) * progress
        };

        DrawTileValue(motion.value, CenteredTileRect(center, 1.0f), theme);
    }
}

static void DrawOverlay(const char *title, const char *subtitle, const Theme *theme)
{
    Rectangle overlay = { 80, BOARD_Y, BOARD_PIXELS, BOARD_PIXELS };

    DrawRectangleRounded(overlay, 0.025f, 8, theme->overlay);
    DrawCenteredText(title, (Rectangle){ overlay.x, overlay.y + 190, overlay.width, 62 },
                     48, theme->textDark);
    DrawCenteredText(subtitle, (Rectangle){ overlay.x, overlay.y + 257, overlay.width, 34 },
                     22, theme->textDark);
}

static void StartAnimation(MoveAnimation *animation, const MoveResult *result)
{
    animation->result = *result;
    animation->elapsed = 0.0f;
    animation->active = true;
}

int main(void)
{
    SaveData save = StorageLoad();
    Game game;
    MoveAnimation animation = { 0 };
    float spawnPop = 0.0f;
    int themeIndex = save.themeIndex % MAX_THEMES;
    bool shouldSave = false;
    int popRow = -1;
    int popCol = -1;

    srand((unsigned int)time(NULL));
    GameInit(&game, save.bestScore);

    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "2048");
    SetTargetFPS(60);

    while (!WindowShouldClose()) {
        const Theme *theme = &THEMES[themeIndex];
        MoveResult moveResult;
        bool moved = false;
        bool undo = false;
        float deltaTime = GetFrameTime();

        if (animation.active) {
            animation.elapsed += deltaTime;
            if (animation.elapsed >= MOVE_ANIMATION_SECONDS) {
                animation.active = false;
                spawnPop = SPAWN_POP_SECONDS;
                popRow = animation.result.spawnedRow;
                popCol = animation.result.spawnedCol;
            }
        } else if (spawnPop > 0.0f) {
            spawnPop -= deltaTime;
            if (spawnPop < 0.0f) {
                spawnPop = 0.0f;
                popRow = -1;
                popCol = -1;
            }
        }

        if (!animation.active && !game.gameOver && (!game.won || game.keepPlayingAfterWin)) {
            if (IsKeyPressed(KEY_LEFT) || IsKeyPressed(KEY_A)) {
                moved = GameMove(&game, DIR_LEFT, &moveResult);
            } else if (IsKeyPressed(KEY_RIGHT) || IsKeyPressed(KEY_D)) {
                moved = GameMove(&game, DIR_RIGHT, &moveResult);
            } else if (IsKeyPressed(KEY_UP) || IsKeyPressed(KEY_W)) {
                moved = GameMove(&game, DIR_UP, &moveResult);
            } else if (IsKeyPressed(KEY_DOWN) || IsKeyPressed(KEY_S)) {
                moved = GameMove(&game, DIR_DOWN, &moveResult);
            }
        }

        if (!animation.active && IsKeyPressed(KEY_R)) {
            GameRestart(&game);
            spawnPop = SPAWN_POP_SECONDS;
            popRow = -1;
            popCol = -1;
        }

        if (!animation.active && IsKeyPressed(KEY_U)) {
            undo = GameUndo(&game);
            if (undo) {
                spawnPop = 0.0f;
                popRow = -1;
                popCol = -1;
            }
        }

        if (moved) {
            StartAnimation(&animation, &moveResult);
            spawnPop = 0.0f;
            popRow = -1;
            popCol = -1;
            shouldSave = true;
        }

        if (undo) {
            shouldSave = true;
        }

        BeginDrawing();
        ClearBackground(theme->background);

        DrawText("2048", 78, 74, 74, theme->textDark);
        DrawText("Join tiles, reach 2048.", 84, 150, 22, theme->textDark);

        DrawScorePanel((Rectangle){ 356, 72, 124, 76 }, "SCORE", game.score, theme);
        DrawScorePanel((Rectangle){ 496, 72, 124, 76 }, "BEST", game.bestScore, theme);

        Button restart = { { 80, 184, 132, 42 }, "Restart" };
        Button undoButton = { { 226, 184, 104, 42 }, "Undo" };
        Button themeButton = { { 344, 184, 144, 42 }, THEMES[themeIndex].name };
        Button continueButton = { { 502, 184, 138, 42 }, "Continue" };

        if (DrawButton(restart, theme)) {
            GameRestart(&game);
            animation.active = false;
            spawnPop = SPAWN_POP_SECONDS;
            popRow = -1;
            popCol = -1;
        }

        if (!animation.active && DrawButton(undoButton, theme)) {
            undo = GameUndo(&game);
            if (undo) {
                shouldSave = true;
                spawnPop = 0.0f;
                popRow = -1;
                popCol = -1;
            }
        }

        if (DrawButton(themeButton, theme)) {
            themeIndex = (themeIndex + 1) % MAX_THEMES;
            theme = &THEMES[themeIndex];
            shouldSave = true;
        }

        if (game.won && !game.keepPlayingAfterWin) {
            if (DrawButton(continueButton, theme) || IsKeyPressed(KEY_ENTER)) {
                game.keepPlayingAfterWin = true;
            }
        } else {
            DrawRectangleRounded(continueButton.bounds, 0.16f, 8, theme->button);
            DrawCenteredText("WASD", continueButton.bounds, 20, theme->textLight);
        }

        if (animation.active) {
            DrawMovingBoard(&animation, theme);
        } else {
            float pop = spawnPop > 0.0f ? spawnPop / SPAWN_POP_SECONDS : 0.0f;
            DrawStaticBoard(&game, pop, popRow, popCol, theme);
        }

        if (!animation.active && game.won && !game.keepPlayingAfterWin) {
            DrawOverlay("You win", "Press Enter or Continue to keep playing", theme);
        } else if (!animation.active && game.gameOver) {
            DrawOverlay("Game over", "Press R or Restart to play again", theme);
        }

        EndDrawing();

        if (shouldSave) {
            StorageSave((SaveData){ game.bestScore, themeIndex });
            shouldSave = false;
        }
    }

    StorageSave((SaveData){ game.bestScore, themeIndex });
    CloseWindow();
    return 0;
}
