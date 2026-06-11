#include "../src/game.h"

#include <stdio.h>
#include <string.h>

#define ASSERT_TRUE(condition) AssertTrue((condition), #condition, __LINE__)
#define ASSERT_EQ_INT(expected, actual) AssertEqInt((expected), (actual), #actual, __LINE__)

static int failures = 0;

typedef struct FixedRandom {
    int values[64];
    int count;
    int index;
} FixedRandom;

static int FixedRandomInt(int maxExclusive, void *userData)
{
    FixedRandom *random = userData;
    int value = 0;

    if (random->index < random->count) {
        value = random->values[random->index++];
    }

    if (maxExclusive <= 0) {
        return 0;
    }

    return value % maxExclusive;
}

static void AssertTrue(bool condition, const char *expression, int line)
{
    if (!condition) {
        printf("FAIL line %d: expected true for %s\n", line, expression);
        failures++;
    }
}

static void AssertEqInt(int expected, int actual, const char *expression, int line)
{
    if (expected != actual) {
        printf("FAIL line %d: expected %s == %d, got %d\n",
               line, expression, expected, actual);
        failures++;
    }
}

static void ClearBoard(Game *game)
{
    memset(game->board, 0, sizeof(game->board));
    game->score = 0;
    game->hasUndo = false;
    game->won = false;
    game->keepPlayingAfterWin = false;
    game->gameOver = false;
}

static Game NewGame(FixedRandom *random)
{
    Game game;
    GameInitWithRandom(&game, 0, FixedRandomInt, random);
    ClearBoard(&game);
    return game;
}

static void TestTripleMergeLeft(void)
{
    FixedRandom random = { { 0, 9, 0, 9, 13, 9 }, 6, 0 };
    Game game = NewGame(&random);
    MoveResult result;

    game.board[0][0] = 2;
    game.board[0][1] = 2;
    game.board[0][2] = 2;

    ASSERT_TRUE(GameMove(&game, DIR_LEFT, &result));
    ASSERT_EQ_INT(4, game.board[0][0]);
    ASSERT_EQ_INT(2, game.board[0][1]);
    ASSERT_EQ_INT(0, game.board[0][2]);
    ASSERT_EQ_INT(4, game.score);
    ASSERT_EQ_INT(3, result.motionCount);
}

static void TestDoubleMergeLeft(void)
{
    FixedRandom random = { { 0, 9, 0, 9, 13, 9 }, 6, 0 };
    Game game = NewGame(&random);
    MoveResult result;

    game.board[0][0] = 2;
    game.board[0][1] = 2;
    game.board[0][2] = 4;
    game.board[0][3] = 4;

    ASSERT_TRUE(GameMove(&game, DIR_LEFT, &result));
    ASSERT_EQ_INT(4, game.board[0][0]);
    ASSERT_EQ_INT(8, game.board[0][1]);
    ASSERT_EQ_INT(12, game.score);
}

static void TestInvalidMoveDoesNotSpawnOrConsumeUndo(void)
{
    FixedRandom random = { { 0, 9, 0, 9, 13, 9 }, 6, 0 };
    Game game = NewGame(&random);
    MoveResult result;

    game.board[0][0] = 2;
    game.hasUndo = true;
    game.previousScore = 99;
    game.previousBoard[3][3] = 4;

    ASSERT_TRUE(!GameMove(&game, DIR_LEFT, &result));
    ASSERT_EQ_INT(2, game.board[0][0]);
    ASSERT_EQ_INT(0, game.board[0][1]);
    ASSERT_TRUE(game.hasUndo);
    ASSERT_EQ_INT(99, game.previousScore);
}

static void TestUndoRestoresPreviousBoardAndScore(void)
{
    FixedRandom random = { { 0, 9, 0, 9, 13, 9 }, 6, 0 };
    Game game = NewGame(&random);
    MoveResult result;

    game.board[0][0] = 2;
    game.board[0][1] = 2;

    ASSERT_TRUE(GameMove(&game, DIR_LEFT, &result));
    ASSERT_TRUE(GameUndo(&game));
    ASSERT_EQ_INT(2, game.board[0][0]);
    ASSERT_EQ_INT(2, game.board[0][1]);
    ASSERT_EQ_INT(0, game.score);
    ASSERT_TRUE(!game.hasUndo);
}

static void TestWinStateResetsAfterUndoBelow2048(void)
{
    FixedRandom random = { { 0, 9, 0, 9, 14, 9 }, 6, 0 };
    Game game = NewGame(&random);
    MoveResult result;

    game.board[0][0] = 1024;
    game.board[0][1] = 1024;

    ASSERT_TRUE(GameMove(&game, DIR_LEFT, &result));
    ASSERT_TRUE(game.won);
    game.keepPlayingAfterWin = true;
    ASSERT_TRUE(GameUndo(&game));
    ASSERT_TRUE(!game.won);
    ASSERT_TRUE(!game.keepPlayingAfterWin);
}

static void TestNoMovesDetection(void)
{
    FixedRandom random = { { 0 }, 1, 0 };
    Game game = NewGame(&random);
    int values[BOARD_SIZE][BOARD_SIZE] = {
        { 2, 4, 2, 4 },
        { 4, 2, 4, 2 },
        { 2, 4, 2, 4 },
        { 4, 2, 4, 2 }
    };

    memcpy(game.board, values, sizeof(values));
    ASSERT_TRUE(!GameHasMoves(&game));
}

int main(void)
{
    TestTripleMergeLeft();
    TestDoubleMergeLeft();
    TestInvalidMoveDoesNotSpawnOrConsumeUndo();
    TestUndoRestoresPreviousBoardAndScore();
    TestWinStateResetsAfterUndoBelow2048();
    TestNoMovesDetection();

    if (failures != 0) {
        printf("%d test failure(s)\n", failures);
        return 1;
    }

    printf("All game logic tests passed\n");
    return 0;
}
