#include "game.h"

#include <stdlib.h>
#include <string.h>

typedef struct LineCell {
    int value;
    int row;
    int col;
} LineCell;

static int DefaultRandomInt(int maxExclusive, void *userData)
{
    (void)userData;
    return rand() % maxExclusive;
}

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

static void ResetMoveResult(MoveResult *result)
{
    if (result != NULL) {
        memset(result, 0, sizeof(*result));
        result->spawnedRow = -1;
        result->spawnedCol = -1;
    }
}

static void AddMotion(MoveResult *result, int value, int fromRow, int fromCol,
                      int toRow, int toCol, bool merged)
{
    if (result == NULL || result->motionCount >= MAX_TILE_MOTIONS) {
        return;
    }

    TileMotion *motion = &result->motions[result->motionCount++];
    motion->value = value;
    motion->fromRow = fromRow;
    motion->fromCol = fromCol;
    motion->toRow = toRow;
    motion->toCol = toCol;
    motion->merged = merged;
}

static int RandomInt(Game *game, int maxExclusive)
{
    GameRandomInt randomInt = game->randomInt != NULL ? game->randomInt : DefaultRandomInt;
    return randomInt(maxExclusive, game->randomUserData);
}

static void UpdateTerminalState(Game *game)
{
    bool reachedWin = GameReachedWin(game);

    if (!reachedWin) {
        game->keepPlayingAfterWin = false;
    }

    game->won = reachedWin;
    game->gameOver = !GameHasMoves(game);
}

static void SpawnTile(Game *game, MoveResult *result)
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

    int index = RandomInt(game, emptyCount);
    int row = emptyCells[index][0];
    int col = emptyCells[index][1];
    int value = RandomInt(game, 10) == 0 ? 4 : 2;

    game->board[row][col] = value;

    if (result != NULL) {
        result->spawnedRow = row;
        result->spawnedCol = col;
        result->spawnedValue = value;
    }
}

static int CellRow(Direction direction, int lineIndex, int offset)
{
    switch (direction) {
    case DIR_LEFT:
    case DIR_RIGHT:
        return lineIndex;
    case DIR_UP:
        return offset;
    case DIR_DOWN:
        return BOARD_SIZE - 1 - offset;
    }

    return 0;
}

static int CellCol(Direction direction, int lineIndex, int offset)
{
    switch (direction) {
    case DIR_LEFT:
        return offset;
    case DIR_RIGHT:
        return BOARD_SIZE - 1 - offset;
    case DIR_UP:
    case DIR_DOWN:
        return lineIndex;
    }

    return 0;
}

static LineCell ReadCell(const Game *game, Direction direction, int lineIndex, int offset)
{
    LineCell cell = { 0, CellRow(direction, lineIndex, offset),
                      CellCol(direction, lineIndex, offset) };
    cell.value = game->board[cell.row][cell.col];
    return cell;
}

static int ProcessLine(Game *game, Direction direction, int lineIndex, MoveResult *result)
{
    LineCell compact[BOARD_SIZE] = { 0 };
    int compactCount = 0;
    int writeOffset = 0;
    int gained = 0;

    for (int offset = 0; offset < BOARD_SIZE; offset++) {
        LineCell cell = ReadCell(game, direction, lineIndex, offset);

        if (cell.value != 0) {
            compact[compactCount++] = cell;
        }

        game->board[cell.row][cell.col] = 0;
    }

    for (int i = 0; i < compactCount; i++) {
        int row = CellRow(direction, lineIndex, writeOffset);
        int col = CellCol(direction, lineIndex, writeOffset);

        if ((i + 1 < compactCount) && compact[i].value == compact[i + 1].value) {
            int mergedValue = compact[i].value * 2;

            game->board[row][col] = mergedValue;
            gained += mergedValue;
            AddMotion(result, compact[i].value, compact[i].row, compact[i].col,
                      row, col, true);
            AddMotion(result, compact[i + 1].value, compact[i + 1].row,
                      compact[i + 1].col, row, col, true);
            i++;
        } else {
            game->board[row][col] = compact[i].value;
            AddMotion(result, compact[i].value, compact[i].row, compact[i].col,
                      row, col, false);
        }

        writeOffset++;
    }

    return gained;
}

void GameInit(Game *game, int bestScore)
{
    GameInitWithRandom(game, bestScore, DefaultRandomInt, NULL);
}

void GameInitWithRandom(Game *game, int bestScore, GameRandomInt randomInt, void *userData)
{
    memset(game, 0, sizeof(*game));
    game->bestScore = bestScore;
    game->randomInt = randomInt != NULL ? randomInt : DefaultRandomInt;
    game->randomUserData = userData;
    GameRestart(game);
}

void GameRestart(Game *game)
{
    int bestScore = game->bestScore;
    GameRandomInt randomInt = game->randomInt;
    void *randomUserData = game->randomUserData;

    memset(game, 0, sizeof(*game));
    game->bestScore = bestScore;
    game->randomInt = randomInt != NULL ? randomInt : DefaultRandomInt;
    game->randomUserData = randomUserData;
    SpawnTile(game, NULL);
    SpawnTile(game, NULL);
    UpdateTerminalState(game);
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

bool GameMove(Game *game, Direction direction, MoveResult *result)
{
    MoveResult localResult;
    MoveResult *move = result != NULL ? result : &localResult;
    int previousScore = game->score;
    int totalGained = 0;

    ResetMoveResult(move);
    CopyBoard(move->before, game->board);

    for (int index = 0; index < BOARD_SIZE; index++) {
        totalGained += ProcessLine(game, direction, index, move);
    }

    if (BoardsEqual(move->before, game->board)) {
        CopyBoard(game->board, move->before);
        ResetMoveResult(move);
        return false;
    }

    CopyBoard(game->previousBoard, move->before);
    game->previousScore = previousScore;
    game->hasUndo = true;

    game->score += totalGained;
    if (game->score > game->bestScore) {
        game->bestScore = game->score;
    }

    SpawnTile(game, move);
    CopyBoard(move->after, game->board);

    for (int row = 0; row < BOARD_SIZE; row++) {
        for (int col = 0; col < BOARD_SIZE; col++) {
            move->changed[row][col] = (move->before[row][col] != game->board[row][col] &&
                                      game->board[row][col] != 0);
        }
    }

    UpdateTerminalState(game);
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
    UpdateTerminalState(game);
    return true;
}
