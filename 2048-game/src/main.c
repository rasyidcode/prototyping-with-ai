#include "game.h"
#include "storage.h"

#include "raylib.h"

#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define SCREEN_WIDTH 720
#define SCREEN_HEIGHT 860
#define BOARD_PIXELS 560.0f
#define TILE_GAP 12.0f
#define TILE_SIZE ((BOARD_PIXELS - (TILE_GAP * (BOARD_SIZE + 1))) / BOARD_SIZE)
#define MAX_THEMES 3

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

static Rectangle TileRect(int row, int col, float boardX, float boardY, float scale)
{
    float size = TILE_SIZE * scale;
    float x = boardX + TILE_GAP + col * (TILE_SIZE + TILE_GAP) + (TILE_SIZE - size) * 0.5f;
    float y = boardY + TILE_GAP + row * (TILE_SIZE + TILE_GAP) + (TILE_SIZE - size) * 0.5f;

    return (Rectangle){ x, y, size, size };
}

static void DrawBoard(const Game *game, float pulse[BOARD_SIZE][BOARD_SIZE],
                      const Theme *theme)
{
    float boardX = (SCREEN_WIDTH - BOARD_PIXELS) * 0.5f;
    float boardY = 245.0f;

    DrawRectangleRounded((Rectangle){ boardX, boardY, BOARD_PIXELS, BOARD_PIXELS },
                         0.025f, 8, theme->board);

    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            int value = game->board[row][col];
            float scale = 1.0f + pulse[row][col] * 0.55f;
            Rectangle bounds = TileRect(row, col, boardX, boardY, scale);

            if (value == 0) {
                DrawRectangleRounded(TileRect(row, col, boardX, boardY, 1.0f),
                                     0.08f, 8, theme->emptyTile);
            } else {
                char text[16];
                int fontSize = value < 100 ? 48 : (value < 1000 ? 42 : 34);
                Color tileColor = theme->tiles[TileColorIndex(value)];
                Color textColor = value <= 4 ? theme->textDark : theme->textLight;

                DrawRectangleRounded(bounds, 0.08f, 8, tileColor);
                snprintf(text, sizeof(text), "%d", value);
                DrawCenteredText(text, bounds, fontSize, textColor);
            }
        }
    }
}

static void DrawOverlay(const char *title, const char *subtitle, const Theme *theme)
{
    Rectangle overlay = { 80, 245, BOARD_PIXELS, BOARD_PIXELS };

    DrawRectangleRounded(overlay, 0.025f, 8, theme->overlay);
    DrawCenteredText(title, (Rectangle){ overlay.x, overlay.y + 190, overlay.width, 62 },
                     48, theme->textDark);
    DrawCenteredText(subtitle, (Rectangle){ overlay.x, overlay.y + 257, overlay.width, 34 },
                     22, theme->textDark);
}

static void SetPulseFromChanges(float pulse[BOARD_SIZE][BOARD_SIZE],
                                int changed[BOARD_SIZE][BOARD_SIZE])
{
    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            if (changed[row][col]) {
                pulse[row][col] = 1.0f;
            }
        }
    }
}

static void UpdatePulse(float pulse[BOARD_SIZE][BOARD_SIZE], float deltaTime)
{
    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            if (pulse[row][col] > 0.0f) {
                pulse[row][col] -= deltaTime * 5.5f;
                if (pulse[row][col] < 0.0f) {
                    pulse[row][col] = 0.0f;
                }
            }
        }
    }
}

int main(void)
{
    SaveData save = StorageLoad();
    Game game;
    float pulse[BOARD_SIZE][BOARD_SIZE] = { 0 };
    int themeIndex = save.themeIndex % MAX_THEMES;
    bool shouldSave = false;

    srand((unsigned int)time(NULL));
    GameInit(&game, save.bestScore);

    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "2048");
    SetTargetFPS(60);

    while (!WindowShouldClose()) {
        const Theme *theme = &THEMES[themeIndex];
        int changed[BOARD_SIZE][BOARD_SIZE] = { 0 };
        bool moved = false;
        bool undo = false;

        UpdatePulse(pulse, GetFrameTime());

        if (!game.gameOver && (!game.won || game.keepPlayingAfterWin)) {
            if (IsKeyPressed(KEY_LEFT) || IsKeyPressed(KEY_A)) {
                moved = GameMove(&game, DIR_LEFT, changed);
            } else if (IsKeyPressed(KEY_RIGHT) || IsKeyPressed(KEY_D)) {
                moved = GameMove(&game, DIR_RIGHT, changed);
            } else if (IsKeyPressed(KEY_UP) || IsKeyPressed(KEY_W)) {
                moved = GameMove(&game, DIR_UP, changed);
            } else if (IsKeyPressed(KEY_DOWN) || IsKeyPressed(KEY_S)) {
                moved = GameMove(&game, DIR_DOWN, changed);
            }
        }

        if (IsKeyPressed(KEY_R)) {
            GameRestart(&game);
        }

        if (IsKeyPressed(KEY_U)) {
            undo = GameUndo(&game);
        }

        if (moved) {
            SetPulseFromChanges(pulse, changed);
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
        }

        if (DrawButton(undoButton, theme)) {
            undo = GameUndo(&game);
            if (undo) {
                shouldSave = true;
            }
        }

        if (DrawButton(themeButton, theme)) {
            themeIndex = (themeIndex + 1) % MAX_THEMES;
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

        DrawBoard(&game, pulse, theme);

        if (game.won && !game.keepPlayingAfterWin) {
            DrawOverlay("You win", "Press Enter or Continue to keep playing", theme);
        } else if (game.gameOver) {
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
