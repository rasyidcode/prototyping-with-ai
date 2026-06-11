#ifndef GAME_H
#define GAME_H

#include <stdbool.h>

#define BOARD_SIZE 4
#define WIN_TILE 2048
#define MAX_TILE_MOTIONS (BOARD_SIZE * BOARD_SIZE * 2)

typedef enum Direction {
    DIR_UP,
    DIR_DOWN,
    DIR_LEFT,
    DIR_RIGHT
} Direction;

typedef int (*GameRandomInt)(int maxExclusive, void *userData);

typedef struct TileMotion {
    int value;
    int fromRow;
    int fromCol;
    int toRow;
    int toCol;
    bool merged;
} TileMotion;

typedef struct MoveResult {
    int before[BOARD_SIZE][BOARD_SIZE];
    int after[BOARD_SIZE][BOARD_SIZE];
    int changed[BOARD_SIZE][BOARD_SIZE];
    TileMotion motions[MAX_TILE_MOTIONS];
    int motionCount;
    int spawnedRow;
    int spawnedCol;
    int spawnedValue;
} MoveResult;

typedef struct Game {
    int board[BOARD_SIZE][BOARD_SIZE];
    int previousBoard[BOARD_SIZE][BOARD_SIZE];
    int score;
    int previousScore;
    int bestScore;
    bool hasUndo;
    bool won;
    bool keepPlayingAfterWin;
    bool gameOver;
    GameRandomInt randomInt;
    void *randomUserData;
} Game;

void GameInit(Game *game, int bestScore);
void GameInitWithRandom(Game *game, int bestScore, GameRandomInt randomInt, void *userData);
void GameRestart(Game *game);
bool GameMove(Game *game, Direction direction, MoveResult *result);
bool GameUndo(Game *game);
bool GameHasMoves(const Game *game);
bool GameReachedWin(const Game *game);

#endif
