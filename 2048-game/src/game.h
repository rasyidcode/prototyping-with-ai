#ifndef GAME_H
#define GAME_H

#include <stdbool.h>

#define BOARD_SIZE 4
#define WIN_TILE 2048

typedef enum Direction {
    DIR_UP,
    DIR_DOWN,
    DIR_LEFT,
    DIR_RIGHT
} Direction;

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
} Game;

void GameInit(Game *game, int bestScore);
void GameRestart(Game *game);
bool GameMove(Game *game, Direction direction, int changed[BOARD_SIZE][BOARD_SIZE]);
bool GameUndo(Game *game);
bool GameHasMoves(const Game *game);
bool GameReachedWin(const Game *game);

#endif
