#include "game.h"
#include "raymath.h"
#include <math.h>
#include <stdio.h>

// Helper to draw a bezier curve or simple curved line for watermelon stripes
static void DrawStripes(Vector2 center, float radius, float rotation) {
    int stripeCount = 6;
    for (int i = 0; i < stripeCount; i++) {
        float angleOffset = ((float)i / stripeCount) * PI * 2.0f + rotation;
        
        // Draw wavy lines using series of small circles/segments inside the fruit
        for (float r = 0.1f; r < 0.95f; r += 0.05f) {
            float dist = r * radius;
            // Add a sine wave perturbation based on distance from center for a squiggly stripe
            float wave = sinf(r * 8.0f) * (radius * 0.1f);
            
            float x = center.x + cosf(angleOffset) * dist + cosf(angleOffset + PI/2.0f) * wave;
            float y = center.y + sinf(angleOffset) * dist + sinf(angleOffset + PI/2.0f) * wave;
            
            DrawCircle(x, y, radius * 0.08f, (Color){10, 45, 10, 180});
        }
    }
}

// Helper to draw cute eyes and mouth on the fruit face
static void DrawFruitFace(Vector2 center, float radius, float rotation, FruitType type) {
    if (radius < 12.0f) return; // Too small for detail faces

    // Calculate face direction based on rotation
    float cosR = cosf(rotation);
    float sinR = sinf(rotation);

    // Eye offsets relative to center
    float eyeDistX = radius * 0.25f;
    float eyeDistY = -radius * 0.15f;
    
    // Left eye local coords
    float leX = -eyeDistX;
    float leY = eyeDistY;
    // Right eye local coords
    float reX = eyeDistX;
    float reY = eyeDistY;

    // Transform local to world space with rotation
    Vector2 leftEye = {
        center.x + (leX * cosR - leY * sinR),
        center.y + (leX * sinR + leY * cosR)
    };
    Vector2 rightEye = {
        center.x + (reX * cosR - reY * sinR),
        center.y + (reX * sinR + reY * cosR)
    };

    // Mouth position local coords
    float mX = 0.0f;
    float mY = radius * 0.1f;
    Vector2 mouth = {
        center.x + (mX * cosR - mY * sinR),
        center.y + (mX * sinR + mY * cosR)
    };

    // Cheek blush positions
    Vector2 leftBlush = {
        center.x + ((-eyeDistX * 1.3f) * cosR - (radius * 0.0f) * sinR),
        center.y + ((-eyeDistX * 1.3f) * sinR + (radius * 0.0f) * cosR)
    };
    Vector2 rightBlush = {
        center.x + ((eyeDistX * 1.3f) * cosR - (radius * 0.0f) * sinR),
        center.y + ((eyeDistX * 1.3f) * sinR + (radius * 0.0f) * cosR)
    };

    float eyeSize = radius * 0.08f;
    if (eyeSize < 1.5f) eyeSize = 1.5f;

    // Draw Blush
    Color blushColor = (Color){255, 100, 120, 140};
    DrawCircleV(leftBlush, radius * 0.12f, blushColor);
    DrawCircleV(rightBlush, radius * 0.12f, blushColor);

    // Draw Eyes (Black circles)
    DrawCircleV(leftEye, eyeSize, (Color){20, 20, 20, 255});
    DrawCircleV(rightEye, eyeSize, (Color){20, 20, 20, 255});

    // Eye Highlights (White twinkles)
    DrawCircleV(Vector2Add(leftEye, (Vector2){-eyeSize*0.3f, -eyeSize*0.3f}), eyeSize * 0.35f, WHITE);
    DrawCircleV(Vector2Add(rightEye, (Vector2){-eyeSize*0.3f, -eyeSize*0.3f}), eyeSize * 0.35f, WHITE);

    // Draw Mouth
    // Standard cute curve mouth (or open mouth depending on fruit level)
    float mouthRadius = radius * 0.12f;
    if (type == FRUIT_WATERMELON || type == FRUIT_MELON || type == FRUIT_PINEAPPLE) {
        // Happy open mouth!
        DrawCircleSector(mouth, mouthRadius, 0, 180, 12, (Color){180, 40, 60, 255});
        DrawCircleSector(mouth, mouthRadius, 0, 180, 12, (Color){20, 20, 20, 255});
        DrawCircleSector(mouth, mouthRadius * 0.8f, 0, 180, 12, (Color){230, 80, 100, 255}); // Tongue
    } else {
        // Cute smiling line
        // Draw simple smile using bezier-like line segments
        Vector2 prevPt = mouth;
        for (float t = -1.0f; t <= 1.0f; t += 0.2f) {
            float lx = t * mouthRadius;
            float ly = (t * t) * (mouthRadius * 0.6f); // parabola for smile
            Vector2 pt = {
                center.x + (lx * cosR - ly * sinR),
                center.y + (lx * sinR + ly * cosR)
            };
            if (t > -1.0f) {
                DrawLineEx(prevPt, pt, radius * 0.05f + 1.0f, (Color){20, 20, 20, 255});
            }
            prevPt = pt;
        }
    }
}

void DrawGlossyCircle(Vector2 center, float radius, Color color, float scale, float rotation, FruitType type) {
    float r = radius * scale;
    if (r <= 0.1f) return;

    // Draw base shadow
    DrawCircle(center.x, center.y + r * 0.1f, r, (Color){0, 0, 0, 40});

    // 1. Draw outer circle
    DrawCircleV(center, r, color);

    // 2. Fruit-specific procedural decorations
    switch (type) {
        case FRUIT_CHERRY: {
            // Cherry Stem
            float cosR = cosf(rotation);
            float sinR = sinf(rotation);
            Vector2 localStemEnd = { r * 0.3f, -r * 1.3f };
            Vector2 stemEnd = {
                center.x + (localStemEnd.x * cosR - localStemEnd.y * sinR),
                center.y + (localStemEnd.x * sinR + localStemEnd.y * cosR)
            };
            DrawLineBezier(center, stemEnd, r * 0.12f, (Color){34, 139, 34, 255});
            DrawCircleV(stemEnd, r * 0.15f, (Color){46, 170, 46, 255}); // Leaf
            break;
        }
        case FRUIT_STRAWBERRY: {
            // Seeds (little yellow dots)
            float cosR = cosf(rotation);
            float sinR = sinf(rotation);
            int seeds = 12;
            for (int i = 0; i < seeds; i++) {
                float angle = (float)i / seeds * PI * 2.0f;
                float dist = r * 0.5f;
                float sx = cosf(angle) * dist;
                float sy = sinf(angle) * dist;
                Vector2 seedPos = {
                    center.x + (sx * cosR - sy * sinR),
                    center.y + (sx * sinR + sy * cosR)
                };
                DrawCircleV(seedPos, r * 0.06f, (Color){255, 230, 100, 255});
            }
            // Green Strawberry Cap
            Vector2 localCapLeft = { -r * 0.6f, -r * 0.6f };
            Vector2 localCapRight = { r * 0.6f, -r * 0.6f };
            Vector2 localCapTop = { 0.0f, -r * 1.0f };
            
            Vector2 capLeft = { center.x + (localCapLeft.x * cosR - localCapLeft.y * sinR), center.y + (localCapLeft.x * sinR + localCapLeft.y * cosR) };
            Vector2 capRight = { center.x + (localCapRight.x * cosR - localCapRight.y * sinR), center.y + (localCapRight.x * sinR + localCapRight.y * cosR) };
            Vector2 capTop = { center.x + (localCapTop.x * cosR - localCapTop.y * sinR), center.y + (localCapTop.x * sinR + localCapTop.y * cosR) };
            
            DrawTriangle(capLeft, capRight, capTop, (Color){34, 139, 34, 255});
            break;
        }
        case FRUIT_GRAPE: {
            // Extra grape bubbles (gives it a grape bunch appearance)
            DrawCircle(center.x - r * 0.3f, center.y + r * 0.2f, r * 0.5f, (Color){110, 40, 140, 255});
            DrawCircle(center.x + r * 0.3f, center.y + r * 0.2f, r * 0.5f, (Color){110, 40, 140, 255});
            DrawCircle(center.x, center.y - r * 0.4f, r * 0.4f, (Color){34, 139, 34, 255}); // Green stem crown
            break;
        }
        case FRUIT_DEKOPON: {
            // Little orange bump on top
            float cosR = cosf(rotation);
            float sinR = sinf(rotation);
            Vector2 bump = { center.x + (0.0f * cosR - (-r * 0.95f) * sinR), center.y + (0.0f * sinR + (-r * 0.95f) * cosR) };
            DrawCircleV(bump, r * 0.25f, (Color){245, 120, 20, 255});
            break;
        }
        case FRUIT_PERSIMMON: {
            // Dark green/brown leaf crown
            float cosR = cosf(rotation);
            float sinR = sinf(rotation);
            Vector2 leaf1 = { center.x + (-r * 0.3f * cosR - (-r * 0.9f) * sinR), center.y + (-r * 0.3f * sinR + (-r * 0.9f) * cosR) };
            Vector2 leaf2 = { center.x + (r * 0.3f * cosR - (-r * 0.9f) * sinR), center.y + (r * 0.3f * sinR + (-r * 0.9f) * cosR) };
            DrawCircleV(leaf1, r * 0.18f, (Color){20, 80, 30, 255});
            DrawCircleV(leaf2, r * 0.18f, (Color){20, 80, 30, 255});
            break;
        }
        case FRUIT_APPLE: {
            // Indent at top, brown stem
            float cosR = cosf(rotation);
            float sinR = sinf(rotation);
            Vector2 stemEnd = { center.x + (0.0f * cosR - (-r * 1.2f) * sinR), center.y + (0.0f * sinR + (-r * 1.2f) * cosR) };
            DrawLineEx(center, stemEnd, r * 0.08f, (Color){100, 60, 30, 255});
            break;
        }
        case FRUIT_PEAR: {
            // Pear shape bump (a bit taller)
            float cosR = cosf(rotation);
            float sinR = sinf(rotation);
            Vector2 topPear = { center.x + (0.0f * cosR - (-r * 0.5f) * sinR), center.y + (0.0f * sinR + (-r * 0.5f) * cosR) };
            DrawCircleV(topPear, r * 0.75f, color);
            break;
        }
        case FRUIT_PEACH: {
            // Subtle middle crease line
            float cosR = cosf(rotation);
            float sinR = sinf(rotation);
            Vector2 topPt = { center.x + (0.0f * cosR - (-r * 0.95f) * sinR), center.y + (0.0f * sinR + (-r * 0.95f) * cosR) };
            Vector2 botPt = { center.x + (0.0f * cosR - (r * 0.95f) * sinR), center.y + (0.0f * sinR + (r * 0.95f) * cosR) };
            DrawLineEx(topPt, botPt, r * 0.06f, (Color){245, 100, 100, 255});
            break;
        }
        case FRUIT_PINEAPPLE: {
            // Pineapple cross-grid texture
            float cosR = cosf(rotation);
            float sinR = sinf(rotation);
            int diagonals = 6;
            for (int i = -diagonals; i <= diagonals; i++) {
                float offset = (float)i / diagonals * r * 0.9f;
                // Left-to-right diagonal
                Vector2 p1 = { center.x + ((-r) * cosR - (offset) * sinR), center.y + ((-r) * sinR + (offset) * cosR) };
                Vector2 p2 = { center.x + ((r) * cosR - (offset) * sinR), center.y + ((r) * sinR + (offset) * cosR) };
                // Right-to-left diagonal
                Vector2 p3 = { center.x + ((offset) * cosR - (-r) * sinR), center.y + ((offset) * sinR + (-r) * cosR) };
                Vector2 p4 = { center.x + ((offset) * cosR - (r) * sinR), center.y + ((offset) * sinR + (r) * cosR) };
                
                DrawLineEx(p1, p2, r * 0.03f, (Color){220, 160, 10, 100});
                DrawLineEx(p3, p4, r * 0.03f, (Color){220, 160, 10, 100});
            }
            // Green crown
            Vector2 crown = { center.x + (0.0f * cosR - (-r * 1.15f) * sinR), center.y + (0.0f * sinR + (-r * 1.15f) * cosR) };
            DrawCircleSector(crown, r * 0.35f, 180, 360, 8, (Color){34, 139, 34, 255});
            break;
        }
        case FRUIT_MELON: {
            // Elegant net texture (white grid lines)
            int rings = 5;
            for (int i = 1; i <= rings; i++) {
                DrawCircleLines(center.x, center.y, r * (float)i / rings, (Color){235, 255, 235, 80});
            }
            // Horizontal and vertical lines
            for (int i = 0; i < 8; i++) {
                float angle = (float)i / 8 * PI * 2.0f + rotation;
                Vector2 end = { center.x + cosf(angle) * r, center.y + sinf(angle) * r };
                DrawLineEx(center, end, r * 0.02f, (Color){235, 255, 235, 80});
            }
            break;
        }
        case FRUIT_WATERMELON: {
            // Beautiful dark stripes
            DrawStripes(center, r, rotation);
            break;
        }
        default:
            break;
    }

    // 3. Draw face (eyes, mouth, blush)
    DrawFruitFace(center, r, rotation, type);

    // 4. Draw glossy 3D highlight (top-left)
    float glossRadius = r * 0.85f;
    Vector2 localGlossOffset = { -r * 0.25f, -r * 0.25f };
    // Rotate highlight position with fruit rotation or keep static? Keeping it static makes the light source feel fixed, which is standard in premium 2D shading!
    Vector2 glossPos = Vector2Add(center, localGlossOffset);

    // Render soft white glow
    for (int i = 0; i < 6; i++) {
        float stepR = glossRadius * (1.0f - (float)i / 6.0f) * 0.3f;
        Color glossColor = (Color){255, 255, 255, (unsigned char)(20 - i * 3)};
        DrawCircleV(glossPos, stepR, glossColor);
    }
    // Hard bright white highlight speck
    DrawCircleV(Vector2Add(glossPos, (Vector2){-r*0.05f, -r*0.05f}), r * 0.08f, (Color){255, 255, 255, 180});
}

void DrawEvoWheel(Vector2 center, float radius) {
    int count = FRUIT_COUNT;
    
    // Draw wheel container back plate (glassmorphic dark pane)
    DrawCircleV(center, radius + 20.0f, (Color){20, 25, 45, 160});
    DrawCircleLines(center.x, center.y, radius + 20.0f, (Color){80, 100, 160, 80});

    // Draw decorative glowing center
    DrawCircleV(center, radius * 0.25f, (Color){15, 20, 35, 220});
    DrawText("EVOLUTION", center.x - 30.0f, center.y - 5.0f, 9, (Color){150, 180, 245, 200});

    for (int i = 0; i < count; i++) {
        float angle = (float)i / count * PI * 2.0f - PI / 2.0f; // Start at top
        
        // Node position
        Vector2 nodePos = {
            center.x + cosf(angle) * radius,
            center.y + sinf(angle) * radius
        };

        // Draw connecting arrows/lines to the next node
        float nextAngle = (float)(i + 1) / count * PI * 2.0f - PI / 2.0f;
        Vector2 nextNodePos = {
            center.x + cosf(nextAngle) * radius,
            center.y + sinf(nextAngle) * radius
        };

        // Draw smooth curve/arc connecting nodes
        DrawLineEx(nodePos, nextNodePos, 2.0f, (Color){80, 100, 160, 120});

        // Draw small glossy fruit representing this level
        float nodeRadius = 14.0f;
        
        // Highlight active preview types if selected (pure aesthetics!)
        DrawGlossyCircle(nodePos, nodeRadius, FRUIT_DEFS[i].color, 1.0f, 0.0f, (FruitType)i);
        
        // Number badge next to node
        char lvl[4];
        sprintf(lvl, "%d", i + 1);
        
        // Position of label slightly offset outward from wheel center
        Vector2 labelPos = {
            nodePos.x + cosf(angle) * 16.0f - 4.0f,
            nodePos.y + sinf(angle) * 16.0f - 5.0f
        };
        DrawText(lvl, labelPos.x, labelPos.y, 10, (Color){180, 200, 255, 255});
    }
}
