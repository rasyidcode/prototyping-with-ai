#ifndef TILE_H
#define TILE_H

#include "raylib.h"
#include <stdbool.h>

/**
 * @file tile.h
 * @brief Tile definitions, categorization, matching rules, and procedural rendering.
 *
 * In Mahjong Solitaire, a standard deck has 144 tiles:
 * - 3 Suits (Dots, Bamboo, Characters/Wan): 1 to 9, 4 of each = 108 tiles.
 * - 2 Honor groups (Winds: E, S, W, N; Dragons: Red, Green, White): 4 of each = 28 tiles.
 * - 2 Special groups (Flowers: 4 unique, Seasons: 4 unique) = 8 tiles.
 *
 * MATCHING RULES:
 * - Suits and Honors: Must be identical (e.g., Bamboo 3 matches only Bamboo 3).
 * - Flowers: Any Flower matches ANY other Flower.
 * - Seasons: Any Season matches ANY other Season.
 */

// Tile Categories
typedef enum {
    TILE_CAT_DOTS,      // Circles / Pin (1-9)
    TILE_CAT_BAMBOO,    // Bamboo / Sou (1-9)
    TILE_CAT_CHARS,     // Characters / Wan (1-9)
    TILE_CAT_WINDS,     // East, South, West, North (1-4)
    TILE_CAT_DRAGONS,   // Red, Green, White (1-3)
    TILE_CAT_FLOWERS,   // Plum, Orchid, Chrysanthemum, Bamboo (1-4)
    TILE_CAT_SEASONS    // Spring, Summer, Autumn, Winter (1-4)
} TileCategory;

// Unique Identifier structure for a tile type
typedef struct {
    TileCategory category;
    int value; // 1-9 for suits, 1-4 for winds/flowers/seasons, 1-3 for dragons
} TileType;

// Structure representing an active or removed tile on the board
typedef struct {
    int id;             // Unique index (0 to N-1)
    int gx, gy, gz;     // Half-grid coordinates: gx, gy are 2x units; gz is layer level (0 to 4+)
    TileType type;      // Type/Face of the tile
    bool active;        // True if still on the board, False if cleared/removed
    bool isFree;        // Calculated: True if unblocked (can be selected)
    bool isHighlighted; // For hints or visual effects
    float animScale;    // Scale animation factor (e.g., pop effect when clicked)
    float alpha;        // Opacity for fade in/out animations
} Tile;

// Visual dimensions of a tile in pixels
#define TILE_WIDTH      56.0f
#define TILE_HEIGHT     74.0f
#define TILE_DEPTH      10.0f  // 3D visual thickness height (drawn below tile face)
#define HALF_GRID_W     (TILE_WIDTH / 2.0f)   // 28px per half-grid X
#define HALF_GRID_H     (TILE_HEIGHT / 2.0f)  // 37px per half-grid Y
#define LAYER_OFFSET_X  (-4.0f) // Perspective shift per Z layer (X axis)
#define LAYER_OFFSET_Y  (-5.0f) // Perspective shift per Z layer (Y axis)

/**
 * @brief Checks if two tile types match according to Mahjong Solitaire rules.
 */
bool TilesMatch(TileType a, TileType b);

/**
 * @brief Returns a friendly human-readable name of the tile type (e.g. "Bamboo 5", "Spring").
 */
const char* GetTileName(TileType type);

/**
 * @brief Procedurally draws a single tile face and 3D body using Raylib primitives.
 * @param tile The tile data.
 * @param screenX Top-left X on screen.
 * @param screenY Top-left Y on screen.
 * @param isSelected True if currently selected by the player.
 * @param isHovered True if mouse is hovering over it.
 */
void DrawTile(const Tile *tile, float screenX, float screenY, bool isSelected, bool isHovered);

/**
 * @brief Draws a drop shadow beneath a tile to enhance 2.5D depth.
 */
void DrawTileShadow(const Tile *tile, float screenX, float screenY);

#endif // TILE_H
