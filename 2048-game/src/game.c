#include "game.h"

#include <stdlib.h>
#include <string.h>

static void CopyBoard(int destination[BOARD_SIZE][BOARD_SIZE],
                      int source[BOARD_SIZE][BOARD_SIZE])
{
    memcpy(destination, source, sizeof(int) * BOARD_SIZE * BOARD_SIZE);
}

static bool BoardsEqual(int left[BOARD_SIZE][BOARD_SIZE],
                        int right[BOARD_SIZE][BOARD_SIZE])
{
    return memcmp(left, right, sizeof(int) * BOARD_SIZE * BOARD_SIZE) == 0;
}

static bool HasEmptyCell(const Game *game)
{
    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            if (game->board[row][col] == 0) {
                return true;
            }
        }
    }

    return false;
}

static void SpawnTile(Game *game)
{
    int emptyCells[BOARD_SIZE * BOARD_SIZE][2];
    int emptyCount = 0;

    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            if (game->board[row][col] == 0) {
                emptyCells[emptyCount][0] = row;
                emptyCells[emptyCount][1] = col;
                emptyCount++;
            }
        }
    }

    if (emptyCount == 0) {
        return;
    }

    int index = rand() % emptyCount;
    int row = emptyCells[index][0];
    int col = emptyCells[index][1];
    game->board[row][col] = ((rand() % 10) == 0) ? 4 : 2;
}

static int ProcessLine(int line[BOARD_SIZE])
{
    int compact[BOARD_SIZE] = { 0 };
    int result[BOARD_SIZE] = { 0 };
    int compactCount = 0;
    int resultCount = 0;
    int gained = 0;

    for (int i = 0; i < BOARD_SIZE; i++) {
        if (line[i] != 0) {
            compact[compactCount++] = line[i];
        }
    }

    for (int i = 0; i < compactCount; i++) {
        if ((i + 1 < compactCount) && compact[i] == compact[i + 1]) {
            result[resultCount] = compact[i] * 2;
            gained += result[resultCount];
            resultCount++;
            i++;
        } else {
            result[resultCount++] = compact[i];
        }
    }

    for (int i = 0; i < BOARD_SIZE; i++) {
        line[i] = result[i];
    }

    return gained;
}

void GameInit(Game *game, int bestScore)
{
    memset(game, 0, sizeof(*game));
    game->bestScore = bestScore;
    GameRestart(game);
}

void GameRestart(Game *game)
{
    int bestScore = game->bestScore;

    memset(game, 0, sizeof(*game));
    game->bestScore = bestScore;
    SpawnTile(game);
    SpawnTile(game);
}

bool GameHasMoves(const Game *game)
{
    if (HasEmptyCell(game)) {
        return true;
    }

    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            int value = game->board[row][col];

            if (row + 1 < BOARD_SIZE && game->board[row + 1][col] == value) {
                return true;
            }

            if (col + 1 < BOARD_SIZE && game->board[row][col + 1] == value) {
                return true;
            }
        }
    }

    return false;
}

bool GameReachedWin(const Game *game)
{
    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            if (game->board[row][col] >= WIN_TILE) {
                return true;
            }
        }
    }

    return false;
}

bool GameMove(Game *game, Direction direction, int changed[BOARD_SIZE][BOARD_SIZE])
{
    int before[BOARD_SIZE][BOARD_SIZE];
    int previousScore = game->score;
    int totalGained = 0;

    memset(changed, 0, sizeof(int) * BOARD_SIZE * BOARD_SIZE);
    CopyBoard(before, game->board);

    for (int index = 0; index < BOARD_SIZE; index++) {
        int line[BOARD_SIZE] = { 0 };

        for (int offset = 0; offset < BOARD_SIZE; offset++) {
            switch (direction) {
            case DIR_LEFT:
                line[offset] = game->board[index][offset];
                break;
            case DIR_RIGHT:
                line[offset] = game->board[index][BOARD_SIZE - 1 - offset];
                break;
            case DIR_UP:
                line[offset] = game->board[offset][index];
                break;
            case DIR_DOWN:
                line[offset] = game->board[BOARD_SIZE - 1 - offset][index];
                break;
            }
        }

        totalGained += ProcessLine(line);

        for (int offset = 0; offset < BOARD_SIZE; offset++) {
            switch (direction) {
            case DIR_LEFT:
                game->board[index][offset] = line[offset];
                break;
            case DIR_RIGHT:
                game->board[index][BOARD_SIZE - 1 - offset] = line[offset];
                break;
            case DIR_UP:
                game->board[offset][index] = line[offset];
                break;
            case DIR_DOWN:
                game->board[BOARD_SIZE - 1 - offset][index] = line[offset];
                break;
            }
        }
    }

    if (BoardsEqual(before, game->board)) {
        return false;
    }

    CopyBoard(game->previousBoard, before);
    game->previousScore = previousScore;
    game->hasUndo = true;

    game->score += totalGained;
    if (game->score > game->bestScore) {
        game->bestScore = game->score;
    }

    SpawnTile(game);

    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            changed[row][col] = (before[row][col] != game->board[row][col] &&
                                 game->board[row][col] != 0);
        }
    }

    game->won = GameReachedWin(game);
    game->gameOver = !GameHasMoves(game);
    return true;
}

bool GameUndo(Game *game)
{
    if (!game->hasUndo) {
        return false;
    }

    CopyBoard(game->board, game->previousBoard);
    game->score = game->previousScore;
    game->hasUndo = false;
    game->won = GameReachedWin(game);
    game->gameOver = !GameHasMoves(game);
    return true;
}
