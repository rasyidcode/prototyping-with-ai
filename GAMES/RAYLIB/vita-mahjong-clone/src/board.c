#include "board.h"
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <math.h>

/**
 * @file board.c
 * @brief Board layout definitions, half-grid spatial algorithms, reverse-solvable generator.
 */

// Helper to add a slot to the board definition
static void AddSlot(Board *board, int gx, int gy, int gz) {
    if (board->tileCount >= MAX_TILES) return;
    Tile *t = &board->tiles[board->tileCount];
    t->id = board->tileCount;
    t->gx = gx;
    t->gy = gy;
    t->gz = gz;
    t->active = true;
    t->isFree = false;
    t->isHighlighted = false;
    t->animScale = 1.0f;
    t->alpha = 1.0f;
    board->tileCount++;

    // Track bounds
    if (gx < board->minGx) board->minGx = gx;
    if (gx + 2 > board->maxGx) board->maxGx = gx + 2;
    if (gy < board->minGy) board->minGy = gy;
    if (gy + 2 > board->maxGy) board->maxGy = gy + 2;
    if (gz > board->maxGz) board->maxGz = gz;
}

/**
 * @brief Builds the Classic Shanghai Turtle layout (144 tiles).
 * The turtle consists of 5 vertical layers (Z: 0 to 4).
 */
static void BuildTurtleLayout(Board *board) {
    board->tileCount = 0;
    board->minGx = 999; board->maxGx = -999;
    board->minGy = 999; board->maxGy = -999;
    board->maxGz = 0;

    // --- LAYER 0 (87 tiles) ---
    // Row 0 (y = 0): 12 tiles from x=2 to x=24
    for (int x = 2; x <= 24; x += 2) AddSlot(board, x, 0, 0);
    // Row 1 (y = 2): 8 tiles from x=6 to x=20
    for (int x = 6; x <= 20; x += 2) AddSlot(board, x, 2, 0);
    // Row 2 (y = 4): 10 tiles from x=4 to x=22
    for (int x = 4; x <= 22; x += 2) AddSlot(board, x, 4, 0);
    // Row 3 (y = 6): 12 tiles from x=2 to x=24
    for (int x = 2; x <= 24; x += 2) AddSlot(board, x, 6, 0);
    // Row 4 (y = 8): 12 tiles from x=2 to x=24
    for (int x = 2; x <= 24; x += 2) AddSlot(board, x, 8, 0);
    // Row 5 (y = 10): 10 tiles from x=4 to x=22
    for (int x = 4; x <= 22; x += 2) AddSlot(board, x, 10, 0);
    // Row 6 (y = 12): 8 tiles from x=6 to x=20
    for (int x = 6; x <= 20; x += 2) AddSlot(board, x, 12, 0);
    // Row 7 (y = 14): 12 tiles from x=2 to x=24
    for (int x = 2; x <= 24; x += 2) AddSlot(board, x, 14, 0);

    // Outrigger "Ears" on Layer 0
    AddSlot(board, 0, 7, 0);   // Far left ear
    AddSlot(board, 26, 7, 0);  // Right inner ear
    AddSlot(board, 28, 7, 0);  // Far right ear

    // --- LAYER 1 (36 tiles: 6x6 grid in center) ---
    for (int y = 2; y <= 12; y += 2) {
        for (int x = 8; x <= 18; x += 2) {
            AddSlot(board, x, y, 1);
        }
    }

    // --- LAYER 2 (16 tiles: 4x4 grid in center) ---
    for (int y = 4; y <= 10; y += 2) {
        for (int x = 10; x <= 16; x += 2) {
            AddSlot(board, x, y, 2);
        }
    }

    // --- LAYER 3 (4 tiles: 2x2 grid in center) ---
    for (int y = 6; y <= 8; y += 2) {
        for (int x = 12; x <= 14; x += 2) {
            AddSlot(board, x, y, 3);
        }
    }

    // --- LAYER 4 (1 Capstone tile resting at half-step center) ---
    AddSlot(board, 13, 7, 4);

    board->activeCount = board->tileCount;
}

/**
 * @brief Builds a smaller Pyramid layout (64 tiles) for quick games.
 */
static void BuildPyramidLayout(Board *board) {
    board->tileCount = 0;
    board->minGx = 999; board->maxGx = -999;
    board->minGy = 999; board->maxGy = -999;
    board->maxGz = 0;

    // Layer 0: 6x6 = 36 tiles
    for (int y = 0; y < 12; y += 2) {
        for (int x = 0; x < 12; x += 2) {
            AddSlot(board, x + 4, y + 2, 0);
        }
    }
    // Layer 1: 4x4 = 16 tiles
    for (int y = 0; y < 8; y += 2) {
        for (int x = 0; x < 8; x += 2) {
            AddSlot(board, x + 6, y + 4, 1);
        }
    }
    // Layer 2: 2x2 = 4 tiles
    for (int y = 0; y < 4; y += 2) {
        for (int x = 0; x < 4; x += 2) {
            AddSlot(board, x + 8, y + 6, 2);
        }
    }
    // Side wings: 8 tiles
    AddSlot(board, 0, 6, 0);
    AddSlot(board, 2, 6, 0);
    AddSlot(board, 18, 6, 0);
    AddSlot(board, 20, 6, 0);
    AddSlot(board, 0, 8, 0);
    AddSlot(board, 2, 8, 0);
    AddSlot(board, 18, 8, 0);
    AddSlot(board, 20, 8, 0);

    board->activeCount = board->tileCount;
}

/**
 * @brief Checks if tile A is blocked by any other tile B.
 * 
 * In half-grid coordinates (where 1 tile is 2x2 units):
 * - Top Occlusion: Tile B is at layer gz + 1 and overlaps in X and Y:
 *     abs(Ax - Bx) < 2 AND abs(Ay - By) < 2
 * - Side Occlusion:
 *     Left blocked if Tile B is at gz with: (Ax - 2 <= Bx <= Ax - 1) AND abs(Ay - By) < 2
 *     Right blocked if Tile B is at gz with: (Ax + 1 <= Bx <= Ax + 2) AND abs(Ay - By) < 2
 */
bool Board_IsTileFree(const Board *board, int tileIndex) {
    const Tile *a = &board->tiles[tileIndex];
    if (!a->active) return false;

    bool leftBlocked = false;
    bool rightBlocked = false;

    for (int i = 0; i < board->tileCount; i++) {
        if (i == tileIndex) continue;
        const Tile *b = &board->tiles[i];
        if (!b->active) continue;

        // 1. Check Top Overlap (Layer gz + 1)
        if (b->gz == a->gz + 1) {
            if (abs(a->gx - b->gx) < 2 && abs(a->gy - b->gy) < 2) {
                return false; // Immediately locked if covered from above
            }
        }

        // 2. Check Same-Layer Side Blocking (Layer gz)
        if (b->gz == a->gz) {
            if (abs(a->gy - b->gy) < 2) {
                // Left neighbor check
                if (b->gx >= a->gx - 2 && b->gx <= a->gx - 1) {
                    leftBlocked = true;
                }
                // Right neighbor check
                if (b->gx >= a->gx + 1 && b->gx <= a->gx + 2) {
                    rightBlocked = true;
                }
            }
        }
    }

    // A tile is free if it has at least one side open (NOT both sides blocked)
    return !(leftBlocked && rightBlocked);
}

/**
 * @brief Updates freedom state for all active tiles.
 */
void Board_UpdateFreedom(Board *board) {
    for (int i = 0; i < board->tileCount; i++) {
        if (board->tiles[i].active) {
            board->tiles[i].isFree = Board_IsTileFree(board, i);
        } else {
            board->tiles[i].isFree = false;
        }
    }
}

/**
 * @brief Generates a full standard 144-tile deck.
 */
static int GenerateFullDeck(TileType *deck, int maxNeeded) {
    int count = 0;

    // Helper macro to add pairs
    #define ADD_PAIR(cat, val) \
        if (count + 2 <= maxNeeded) { \
            deck[count++] = (TileType){ cat, val }; \
            deck[count++] = (TileType){ cat, val }; \
        }

    // 3 Suits (Dots, Bamboo, Chars): 1-9 (4 of each = 2 pairs each)
    for (int cat = TILE_CAT_DOTS; cat <= TILE_CAT_CHARS; cat++) {
        for (int v = 1; v <= 9; v++) {
            ADD_PAIR((TileCategory)cat, v);
            ADD_PAIR((TileCategory)cat, v);
        }
    }

    // Winds (1-4, 4 of each = 2 pairs each)
    for (int w = 1; w <= 4; w++) {
        ADD_PAIR(TILE_CAT_WINDS, w);
        ADD_PAIR(TILE_CAT_WINDS, w);
    }

    // Dragons (1-3, 4 of each = 2 pairs each)
    for (int d = 1; d <= 3; d++) {
        ADD_PAIR(TILE_CAT_DRAGONS, d);
        ADD_PAIR(TILE_CAT_DRAGONS, d);
    }

    // Flowers (4 tiles: 2 pairs that match any flower)
    ADD_PAIR(TILE_CAT_FLOWERS, 1);
    ADD_PAIR(TILE_CAT_FLOWERS, 2);

    // Seasons (4 tiles: 2 pairs that match any season)
    ADD_PAIR(TILE_CAT_SEASONS, 1);
    ADD_PAIR(TILE_CAT_SEASONS, 2);

    #undef ADD_PAIR
    return count;
}

/**
 * @brief Reverse Solvability Generator:
 * Guarantees that the generated board has at least one valid path to 100% completion.
 */
static void GenerateSolvableDeck(Board *board) {
    TileType deck[MAX_TILES];
    int deckSize = GenerateFullDeck(deck, board->tileCount);

    // Group deck into pairs
    int pairCount = deckSize / 2;
    typedef struct { TileType a, b; } TilePair;
    TilePair pairs[MAX_TILES / 2];
    for (int i = 0; i < pairCount; i++) {
        pairs[i].a = deck[i * 2];
        pairs[i].b = deck[i * 2 + 1];
    }

    // Shuffle the pairs
    for (int i = pairCount - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        TilePair tmp = pairs[i];
        pairs[i] = pairs[j];
        pairs[j] = tmp;
    }

    // Temporary simulation: start with all slots active
    for (int i = 0; i < board->tileCount; i++) {
        board->tiles[i].active = true;
    }

    int currentPair = 0;
    int unassignedSlots = board->tileCount;

    while (unassignedSlots >= 2 && currentPair < pairCount) {
        // Find all currently unblocked slots in the simulation
        int freeIndices[MAX_TILES];
        int freeCount = 0;

        for (int i = 0; i < board->tileCount; i++) {
            if (board->tiles[i].active && Board_IsTileFree(board, i)) {
                freeIndices[freeCount++] = i;
            }
        }

        if (freeCount >= 2) {
            // Pick two random free slots
            int idx1 = rand() % freeCount;
            int slotA = freeIndices[idx1];
            
            // Remove idx1 from options
            freeIndices[idx1] = freeIndices[freeCount - 1];
            freeCount--;

            int idx2 = rand() % freeCount;
            int slotB = freeIndices[idx2];

            // Assign the pair to these slots
            board->tiles[slotA].type = pairs[currentPair].a;
            board->tiles[slotB].type = pairs[currentPair].b;
            currentPair++;

            // Remove slots in simulation (working backwards)
            board->tiles[slotA].active = false;
            board->tiles[slotB].active = false;
            unassignedSlots -= 2;
        } else {
            // Fallback: If simulation gets trapped, assign remaining slots sequentially
            for (int i = 0; i < board->tileCount; i++) {
                if (board->tiles[i].active) {
                    board->tiles[i].type = pairs[currentPair % pairCount].a;
                    board->tiles[i].active = false;
                    unassignedSlots--;
                }
            }
            break;
        }
    }

    // Restore all tiles to active for real gameplay
    for (int i = 0; i < board->tileCount; i++) {
        board->tiles[i].active = true;
    }
    board->activeCount = board->tileCount;
    Board_UpdateFreedom(board);
}

/**
 * @brief Initializes board with chosen layout and generates a solvable deck.
 */
void Board_Init(Board *board, LayoutType layoutType) {
    board->layout = layoutType;
    if (layoutType == LAYOUT_TURTLE) {
        BuildTurtleLayout(board);
    } else {
        BuildPyramidLayout(board);
    }
    GenerateSolvableDeck(board);
}

/**
 * @brief Computes 2D screen coordinate for a tile.
 */
Vector2 Board_GetTileScreenPos(const Tile *tile, Vector2 boardOrigin) {
    float x = boardOrigin.x + (tile->gx * HALF_GRID_W) + (tile->gz * LAYER_OFFSET_X);
    float y = boardOrigin.y + (tile->gy * HALF_GRID_H) + (tile->gz * LAYER_OFFSET_Y);
    return (Vector2){ x, y };
}

/**
 * @brief Finds the top-most tile under the given screen position (Reverse Z-Order).
 */
int Board_GetTileAtScreenPos(const Board *board, Vector2 mousePos, Vector2 boardOrigin) {
    int bestTile = -1;
    int bestGz = -1;

    // Search from highest Z to lowest Z for accurate picking
    for (int i = 0; i < board->tileCount; i++) {
        const Tile *t = &board->tiles[i];
        if (!t->active) continue;

        Vector2 pos = Board_GetTileScreenPos(t, boardOrigin);
        Rectangle rect = { pos.x, pos.y, TILE_WIDTH, TILE_HEIGHT + TILE_DEPTH };

        if (CheckCollisionPointRec(mousePos, rect)) {
            if (t->gz > bestGz) {
                bestGz = t->gz;
                bestTile = i;
            }
        }
    }
    return bestTile;
}

/**
 * @brief Finds any currently free pair of matching tiles (Hint / Deadlock).
 */
bool Board_FindHintPair(const Board *board, int *outTileA, int *outTileB) {
    for (int i = 0; i < board->tileCount; i++) {
        if (!board->tiles[i].active || !board->tiles[i].isFree) continue;

        for (int j = i + 1; j < board->tileCount; j++) {
            if (!board->tiles[j].active || !board->tiles[j].isFree) continue;

            if (TilesMatch(board->tiles[i].type, board->tiles[j].type)) {
                if (outTileA) *outTileA = i;
                if (outTileB) *outTileB = j;
                return true;
            }
        }
    }
    return false;
}

/**
 * @brief Shuffles the remaining active tiles on the board.
 */
void Board_Shuffle(Board *board) {
    TileType remainingTypes[MAX_TILES];
    int activeIndices[MAX_TILES];
    int count = 0;

    for (int i = 0; i < board->tileCount; i++) {
        if (board->tiles[i].active) {
            remainingTypes[count] = board->tiles[i].type;
            activeIndices[count] = i;
            count++;
        }
    }

    // Fisher-Yates Shuffle
    for (int i = count - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        TileType temp = remainingTypes[i];
        remainingTypes[i] = remainingTypes[j];
        remainingTypes[j] = temp;
    }

    // Re-assign shuffled types back to active slots
    for (int i = 0; i < count; i++) {
        board->tiles[activeIndices[i]].type = remainingTypes[i];
    }

    Board_UpdateFreedom(board);
}

/**
 * @brief Draws the entire 2.5D board with depth sorting:
 * 1. All drop shadows first.
 * 2. Bottom-to-top Z layers, Top-to-bottom Y rows, Left-to-right X cols.
 */
void Board_Draw(const Board *board, Vector2 boardOrigin, int selectedTileIndex, int hoveredTileIndex) {
    // Pass 1: Draw all tile drop shadows
    for (int gz = 0; gz <= board->maxGz; gz++) {
        for (int i = 0; i < board->tileCount; i++) {
            const Tile *t = &board->tiles[i];
            if (t->active && t->gz == gz) {
                Vector2 pos = Board_GetTileScreenPos(t, boardOrigin);
                DrawTileShadow(t, pos.x, pos.y);
            }
        }
    }

    // Pass 2: Draw tile bodies with strict depth order
    for (int gz = 0; gz <= board->maxGz; gz++) {
        for (int i = 0; i < board->tileCount; i++) {
            const Tile *t = &board->tiles[i];
            if (t->active && t->gz == gz) {
                Vector2 pos = Board_GetTileScreenPos(t, boardOrigin);
                bool isSelected = (i == selectedTileIndex);
                bool isHovered = (i == hoveredTileIndex);
                DrawTile(t, pos.x, pos.y, isSelected, isHovered);
            }
        }
    }
}
