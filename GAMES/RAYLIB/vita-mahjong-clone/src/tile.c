#include "tile.h"
#include <stdio.h>
#include <math.h>

/**
 * @brief Checks if two tile types match.
 */
bool TilesMatch(TileType a, TileType b) {
    // 1. Flowers match any other Flower
    if (a.category == TILE_CAT_FLOWERS && b.category == TILE_CAT_FLOWERS) {
        return true;
    }
    // 2. Seasons match any other Season
    if (a.category == TILE_CAT_SEASONS && b.category == TILE_CAT_SEASONS) {
        return true;
    }
    // 3. All other categories must match category AND exact value
    return (a.category == b.category && a.value == b.value);
}

/**
 * @brief Returns friendly name for debugging/HUD.
 */
const char* GetTileName(TileType type) {
    static char buffer[32];
    switch (type.category) {
        case TILE_CAT_DOTS:
            snprintf(buffer, sizeof(buffer), "Dots %d", type.value);
            return buffer;
        case TILE_CAT_BAMBOO:
            snprintf(buffer, sizeof(buffer), "Bamboo %d", type.value);
            return buffer;
        case TILE_CAT_CHARS:
            snprintf(buffer, sizeof(buffer), "Char %d", type.value);
            return buffer;
        case TILE_CAT_WINDS: {
            const char* winds[] = {"East", "South", "West", "North"};
            return (type.value >= 1 && type.value <= 4) ? winds[type.value - 1] : "Wind";
        }
        case TILE_CAT_DRAGONS: {
            const char* dragons[] = {"Red Dragon", "Green Dragon", "White Dragon"};
            return (type.value >= 1 && type.value <= 3) ? dragons[type.value - 1] : "Dragon";
        }
        case TILE_CAT_FLOWERS: {
            const char* flowers[] = {"Plum", "Orchid", "Chrysanthemum", "Bamboo"};
            return (type.value >= 1 && type.value <= 4) ? flowers[type.value - 1] : "Flower";
        }
        case TILE_CAT_SEASONS: {
            const char* seasons[] = {"Spring", "Summer", "Autumn", "Winter"};
            return (type.value >= 1 && type.value <= 4) ? seasons[type.value - 1] : "Season";
        }
        default:
            return "Unknown";
    }
}

/**
 * @brief Helper: Draws a drop shadow beneath a tile to provide depth illusion.
 */
void DrawTileShadow(const Tile *tile, float screenX, float screenY) {
    if (!tile->active) return;
    
    // Shadow offset increases slightly with layer height gz
    float shadowOffset = 4.0f + (tile->gz * 2.0f);
    Rectangle shadowRect = {
        screenX + shadowOffset,
        screenY + shadowOffset + TILE_DEPTH,
        TILE_WIDTH,
        TILE_HEIGHT
    };
    
    Color shadowColor = (Color){ 10, 15, 20, 50 }; // Soft translucent dark shadow
    DrawRectangleRounded(shadowRect, 0.15f, 4, shadowColor);
}

/**
 * @brief Internal helper to draw the procedural art for the face of a tile.
 */
static void DrawTileFaceContent(TileType type, Rectangle faceRect, bool isFree) {
    float cx = faceRect.x + faceRect.width / 2.0f;
    float cy = faceRect.y + faceRect.height / 2.0f;

    // Palette for suits
    Color cRed   = (Color){ 204, 41, 54, 255 };
    Color cGreen = (Color){ 34, 139, 34, 255 };
    Color cBlue  = (Color){ 26, 83, 92, 255 };
    Color cGold  = (Color){ 218, 165, 32, 255 };
    Color cDark  = (Color){ 40, 40, 45, 255 };

    // If locked/dimmed, soften contrast
    if (!isFree) {
        cRed   = ColorAlpha(cRed, 0.6f);
        cGreen = ColorAlpha(cGreen, 0.6f);
        cBlue  = ColorAlpha(cBlue, 0.6f);
        cGold  = ColorAlpha(cGold, 0.6f);
        cDark  = ColorAlpha(cDark, 0.6f);
    }

    switch (type.category) {
        case TILE_CAT_DOTS: {
            // Draw Dots / Circles pattern
            int n = type.value;
            // Draw top badge number for accessibility
            DrawText(TextFormat("%d", n), (int)faceRect.x + 4, (int)faceRect.y + 3, 14, cBlue);
            
            // Draw circle patterns
            if (n == 1) {
                // Giant centerpiece medallion
                DrawCircle((int)cx, (int)cy, 16, cRed);
                DrawCircle((int)cx, (int)cy, 12, (Color){ 255, 240, 200, 255 });
                DrawCircle((int)cx, (int)cy, 6, cGreen);
            } else {
                // Multi-dot arrangement
                float spacingX = 14.0f;
                float spacingY = 14.0f;
                
                int drawn = 0;
                for (int r = 0; r < 3; r++) {
                    for (int c = 0; c < 3; c++) {
                        if (drawn >= n) break;
                        float dotX = cx + (c - 1) * spacingX;
                        float dotY = cy + (r - 1) * spacingY;
                        Color dotColor = (drawn % 2 == 0) ? cBlue : cGreen;
                        if (drawn == 0 && n >= 7) dotColor = cRed;
                        
                        DrawCircle((int)dotX, (int)dotY, 5.0f, dotColor);
                        DrawCircleLines((int)dotX, (int)dotY, 5.0f, cDark);
                        drawn++;
                    }
                }
            }
            break;
        }

        case TILE_CAT_BAMBOO: {
            // Draw Bamboo sticks pattern
            int n = type.value;
            DrawText(TextFormat("%d", n), (int)faceRect.x + 4, (int)faceRect.y + 3, 14, cGreen);

            if (n == 1) {
                // Traditional 1-Bamboo is often depicted as a Sparrow / Bird
                DrawCircle((int)cx, (int)cy - 4, 10, cGreen);
                DrawTriangle(
                    (Vector2){ cx - 8, cy - 2 },
                    (Vector2){ cx + 8, cy - 2 },
                    (Vector2){ cx, cy + 14 },
                    cRed
                );
                DrawCircle((int)cx - 3, (int)cy - 6, 2, cDark); // Eye
            } else {
                // Segmented bamboo rods
                float rodW = 4.0f;
                float rodH = 14.0f;
                float stepX = 12.0f;
                
                int count = 0;
                int rows = (n > 4) ? 2 : 1;
                for (int r = 0; r < rows; r++) {
                    int inRow = (rows == 1) ? n : (r == 0 ? (n + 1) / 2 : n / 2);
                    float startX = cx - ((inRow - 1) * stepX) / 2.0f;
                    float startY = cy + (r == 0 && rows > 1 ? -12.0f : (rows > 1 ? 10.0f : 0.0f));

                    for (int c = 0; c < inRow; c++) {
                        float rx = startX + c * stepX;
                        Color rodCol = (count % 2 == 0) ? cGreen : cBlue;
                        if (count == 0 && n == 7) rodCol = cRed;
                        
                        // Draw segmented rod
                        DrawRectangleRounded((Rectangle){ rx - rodW/2, startY - rodH/2, rodW, rodH }, 0.4f, 2, rodCol);
                        DrawLine((int)(rx - rodW/2), (int)startY, (int)(rx + rodW/2), (int)startY, cDark);
                        count++;
                    }
                }
            }
            break;
        }

        case TILE_CAT_CHARS: {
            // Character / Wan suit
            int n = type.value;
            DrawText(TextFormat("%d", n), (int)faceRect.x + 4, (int)faceRect.y + 3, 14, cRed);
            
            // Large number display
            const char* numStr = TextFormat("%d", n);
            int fontSize = 28;
            int textW = MeasureText(numStr, fontSize);
            DrawText(numStr, (int)(cx - textW / 2.0f), (int)(cy - 18), fontSize, cBlue);

            // Chinese "Wan" (10,000) symbol badge below
            int wanSize = 18;
            const char* wanStr = "WAN";
            int wanW = MeasureText(wanStr, wanSize);
            DrawText(wanStr, (int)(cx - wanW / 2.0f), (int)(cy + 10), wanSize, cRed);
            break;
        }

        case TILE_CAT_WINDS: {
            // Wind Directions (East, South, West, North)
            const char* windChars[] = { "E", "S", "W", "N" };
            const char* windNames[] = { "EAST", "SOUTH", "WEST", "NORTH" };
            int idx = type.value - 1;
            if (idx < 0) idx = 0;
            if (idx > 3) idx = 3;

            // Big letter
            int fontSize = 28;
            int textW = MeasureText(windChars[idx], fontSize);
            DrawText(windChars[idx], (int)(cx - textW / 2.0f), (int)(cy - 16), fontSize, cDark);

            // Subtitle
            int subSize = 11;
            int subW = MeasureText(windNames[idx], subSize);
            DrawText(windNames[idx], (int)(cx - subW / 2.0f), (int)(cy + 14), subSize, cBlue);
            break;
        }

        case TILE_CAT_DRAGONS: {
            // Red, Green, White Dragon
            if (type.value == 1) { // Red Dragon (Chun)
                int fontSize = 26;
                const char* txt = "RED";
                int textW = MeasureText(txt, fontSize);
                DrawText(txt, (int)(cx - textW / 2.0f), (int)(cy - 12), fontSize, cRed);
                DrawRectangleLinesEx((Rectangle){ cx - 18, cy - 20, 36, 40 }, 2, cRed);
            } else if (type.value == 2) { // Green Dragon (Fa)
                int fontSize = 22;
                const char* txt = "GREEN";
                int textW = MeasureText(txt, fontSize);
                DrawText(txt, (int)(cx - textW / 2.0f), (int)(cy - 12), fontSize, cGreen);
                DrawRectangleLinesEx((Rectangle){ cx - 20, cy - 20, 40, 40 }, 2, cGreen);
            } else { // White Dragon (Bai - decorative frame)
                DrawRectangleLinesEx((Rectangle){ cx - 18, cy - 22, 36, 44 }, 3, cBlue);
                DrawRectangleLinesEx((Rectangle){ cx - 13, cy - 17, 26, 34 }, 1, cBlue);
            }
            break;
        }

        case TILE_CAT_FLOWERS: {
            // Flowers (matches any flower)
            const char* fNames[] = { "Plum", "Orchid", "Chrys.", "Bamboo" };
            int idx = (type.value - 1) % 4;

            // Flower blossom icon
            DrawCircle((int)cx, (int)cy - 6, 9, (Color){ 255, 105, 180, 255 }); // Pink petals
            DrawCircle((int)cx, (int)cy - 6, 4, cGold); // Yellow center
            
            // Flower badge tag
            DrawText("FLOWER", (int)faceRect.x + 4, (int)faceRect.y + 3, 10, (Color){ 180, 50, 100, 255 });
            int subW = MeasureText(fNames[idx], 11);
            DrawText(fNames[idx], (int)(cx - subW / 2.0f), (int)(cy + 12), 11, cDark);
            break;
        }

        case TILE_CAT_SEASONS: {
            // Seasons (matches any season)
            const char* sNames[] = { "SPRING", "SUMMER", "AUTUMN", "WINTER" };
            Color sColors[] = {
                (Color){ 106, 190, 48, 255 },  // Spring green
                (Color){ 250, 120, 30, 255 },  // Summer sun orange
                (Color){ 195, 80, 40, 255 },   // Autumn red/amber
                (Color){ 70, 160, 235, 255 }   // Winter ice blue
            };
            int idx = (type.value - 1) % 4;

            // Season Badge
            DrawText("SEASON", (int)faceRect.x + 4, (int)faceRect.y + 3, 10, sColors[idx]);
            
            // Sun / Snow / Leaf emblem
            DrawCircle((int)cx, (int)cy - 6, 8, sColors[idx]);
            
            int subW = MeasureText(sNames[idx], 10);
            DrawText(sNames[idx], (int)(cx - subW / 2.0f), (int)(cy + 12), 10, cDark);
            break;
        }
    }
}

/**
 * @brief Renders a complete 2.5D Mahjong Tile.
 */
void DrawTile(const Tile *tile, float screenX, float screenY, bool isSelected, bool isHovered) {
    if (!tile->active) return;

    // Apply selection pop animation / hover lift
    float liftY = 0.0f;
    if (isSelected) liftY = -5.0f;
    else if (isHovered && tile->isFree) liftY = -2.0f;

    float drawX = screenX;
    float drawY = screenY + liftY;

    // Tile Color Palette
    // Front Face: Rich warm ivory
    Color faceColor = (Color){ 252, 248, 238, 255 };
    // Bottom/Side 3D base: Bamboo green or dark mahogany wood
    Color baseSideColor = (Color){ 30, 105, 55, 255 };  // Classic jade green back
    Color baseBottomColor = (Color){ 20, 75, 40, 255 }; // Darker bottom edge
    Color borderColor = (Color){ 180, 175, 160, 255 };

    // Locked / dimmed tile effect (Vita Mahjong accessibility feature)
    if (!tile->isFree) {
        faceColor = (Color){ 200, 198, 192, 255 }; // Grayed out ivory
        baseSideColor = (Color){ 45, 65, 50, 255 };
        baseBottomColor = (Color){ 30, 45, 35, 255 };
    }

    // 1. Draw 3D Base Thickness (Side and Bottom depth)
    Rectangle baseRect = {
        drawX,
        drawY + TILE_DEPTH,
        TILE_WIDTH,
        TILE_HEIGHT
    };
    DrawRectangleRounded(baseRect, 0.12f, 4, baseBottomColor);
    
    // Middle 3D bevel layer
    Rectangle bevelRect = {
        drawX,
        drawY + (TILE_DEPTH / 2.0f),
        TILE_WIDTH,
        TILE_HEIGHT
    };
    DrawRectangleRounded(bevelRect, 0.12f, 4, baseSideColor);

    // 2. Draw Top Ivory Face
    Rectangle faceRect = {
        drawX,
        drawY,
        TILE_WIDTH,
        TILE_HEIGHT
    };
    DrawRectangleRounded(faceRect, 0.12f, 4, faceColor);
    DrawRectangleRoundedLines(faceRect, 0.12f, 4, borderColor);

    // 3. Draw Procedural Symbol Content
    DrawTileFaceContent(tile->type, faceRect, tile->isFree);

    // 4. Visual Highlight & Selection Effects
    if (isSelected) {
        // Golden glowing border for active selection
        DrawRectangleRoundedLines(faceRect, 0.12f, 4, (Color){ 255, 200, 0, 255 });
    } else if (tile->isHighlighted) {
        // Pulsing hint highlight (Cyan/Gold)
        float pulse = (sinf((float)GetTime() * 8.0f) + 1.0f) * 0.5f;
        Color hintColor = ColorAlpha((Color){ 0, 220, 255, 255 }, 0.6f + pulse * 0.4f);
        DrawRectangleRoundedLines(faceRect, 0.12f, 4, hintColor);
    } else if (isHovered && tile->isFree) {
        // Subtle hover ring
        DrawRectangleRoundedLines(faceRect, 0.12f, 4, (Color){ 100, 180, 255, 180 });
    }

    // 5. If locked, draw a subtle padlock or dimmed scrim overlay
    if (!tile->isFree) {
        DrawRectangleRounded(faceRect, 0.12f, 4, (Color){ 0, 0, 0, 35 });
    }
}
