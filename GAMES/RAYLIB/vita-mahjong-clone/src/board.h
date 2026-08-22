#ifndef BOARD_H
#define BOARD_H

#include "tile.h"
#include "raylib.h"

#define MAX_TILES 144

typedef enum {
    LAYOUT_TURTLE,   // Classic 144-tile Shanghai Turtle layout
    LAYOUT_PYRAMID,  // Compact 64-tile pyramid
    LAYOUT_ARENA     // 144-tile fortress/arena layout
} LayoutType;

typedef struct {
    Tile tiles[MAX_TILES];
    int tileCount;      // Total number of tiles configured in current layout
    int activeCount;    // Number of remaining active tiles
    LayoutType layout;  // Current layout type
    
    // Bounds of the board in half-grid coordinates for centering
    int minGx, maxGx;
    int minGy, maxGy;
    int maxGz;
} Board;

/**
 * @brief Initializes a layout with slot coordinates and populates it with a 100% solvable deck.
 */
void Board_Init(Board *board, LayoutType layoutType);

/**
 * @brief Recalculates freedom status (`isFree`) for every active tile on the board.
 * A tile is free if:
 * 1. No active tile is on layer Z+1 overlapping any of its 2x2 half-grid footprint.
 * 2. It has at least one open side (Left is clear OR Right is clear on the same layer Z).
 */
void Board_UpdateFreedom(Board *board);

/**
 * @brief Checks if a specific tile is currently unblocked / free.
 */
bool Board_IsTileFree(const Board *board, int tileIndex);

/**
 * @brief Finds the top-most tile under the given screen mouse coordinate.
 * Iterates in reverse Z-order (highest layer to lowest layer).
 * @return Index of the tile, or -1 if no tile was clicked.
 */
int Board_GetTileAtScreenPos(const Board *board, Vector2 mousePos, Vector2 boardOrigin);

/**
 * @brief Searches for any currently free pair of tiles that match.
 * Used for the Hint tool and Deadlock detection.
 * @return True if a legal matching pair exists, False if deadlock (no moves left).
 */
bool Board_FindHintPair(const Board *board, int *outTileA, int *outTileB);

/**
 * @brief Shuffles the remaining active tiles on the board.
 */
void Board_Shuffle(Board *board);

/**
 * @brief Computes the 2D screen coordinate for a tile given board origin.
 */
Vector2 Board_GetTileScreenPos(const Tile *tile, Vector2 boardOrigin);

/**
 * @brief Draws the entire 2.5D board with depth sorting (shadows first, then back-to-front, bottom-to-top Z).
 */
void Board_Draw(const Board *board, Vector2 boardOrigin, int selectedTileIndex, int hoveredTileIndex);

#endif // BOARD_H
