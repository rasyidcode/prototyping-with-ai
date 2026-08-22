#ifndef GAME_H
#define GAME_H

#include "board.h"
#include "raylib.h"
#include <stdbool.h>

#define MAX_UNDO 100
#define MAX_PARTICLES 120

typedef enum {
    GAME_STATE_MENU,
    GAME_STATE_PLAYING,
    GAME_STATE_PAUSED,
    GAME_STATE_DEADLOCK,
    GAME_STATE_VICTORY
} GameState;

typedef struct {
    int tileA;
    int tileB;
    int scoreGained;
} UndoEntry;

typedef struct {
    Vector2 pos;
    Vector2 vel;
    Color color;
    float size;
    float alpha;
    float life;
    float maxLife;
} Particle;

typedef struct {
    GameState state;
    Board board;
    
    // Undo stack
    UndoEntry undoStack[MAX_UNDO];
    int undoCount;

    // Selection & interaction
    int selectedTile;  // -1 if none
    int hoveredTile;   // -1 if none
    int hintTileA;     // -1 if none
    int hintTileB;     // -1 if none
    float hintTimer;   // Duration hint stays highlighted

    // Gameplay Statistics
    int score;
    int combo;
    float comboTimer;
    int moves;
    float playTime;
    
    // Notifications & Messages
    char message[64];
    float messageTimer;

    // Visual particles (confetti / sparkle effects)
    Particle particles[MAX_PARTICLES];
    int particleCount;

    // Board screen centering offset
    Vector2 boardOrigin;
} Game;

/**
 * @brief Initializes game state and begins a new game.
 */
void Game_Init(Game *game, LayoutType layout);

/**
 * @brief Updates game logic, timers, animations, and input processing.
 */
void Game_Update(Game *game, float dt);

/**
 * @brief Renders the entire game: background, board, HUD, popups, and victory screens.
 */
void Game_Draw(const Game *game);

/**
 * @brief Undoes the last matched pair of tiles.
 */
void Game_Undo(Game *game);

/**
 * @brief Uses the Hint booster to highlight an available matching pair.
 */
void Game_Hint(Game *game);

/**
 * @brief Uses the Shuffle booster to rearrange the remaining tiles.
 */
void Game_Shuffle(Game *game);

#endif // GAME_H
