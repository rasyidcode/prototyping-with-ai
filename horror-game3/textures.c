#include "textures.h"
#include "rlgl.h"

// Lower-level 3D textured cube rendering using rlgl
void DrawCubeTexture(Texture2D texture, Vector3 position, float width, float height, float length, Color color) {
    float x = position.x;
    float y = position.y;
    float z = position.z;
    
    float w = width / 2.0f;
    float h = height / 2.0f;
    float l = length / 2.0f;
    
    rlSetTexture(texture.id);
    rlBegin(RL_QUADS);
    rlColor4ub(color.r, color.g, color.b, color.a);
    
    // Front Face (z = +l)
    rlNormal3f(0.0f, 0.0f, 1.0f);
    rlTexCoord2f(0.0f, 0.0f); rlVertex3f(x - w, y - h, z + l);
    rlTexCoord2f(1.0f, 0.0f); rlVertex3f(x + w, y - h, z + l);
    rlTexCoord2f(1.0f, 1.0f); rlVertex3f(x + w, y + h, z + l);
    rlTexCoord2f(0.0f, 1.0f); rlVertex3f(x - w, y + h, z + l);
    
    // Back Face (z = -l)
    rlNormal3f(0.0f, 0.0f, -1.0f);
    rlTexCoord2f(1.0f, 0.0f); rlVertex3f(x - w, y - h, z - l);
    rlTexCoord2f(1.0f, 1.0f); rlVertex3f(x - w, y + h, z - l);
    rlTexCoord2f(0.0f, 1.0f); rlVertex3f(x + w, y + h, z - l);
    rlTexCoord2f(0.0f, 0.0f); rlVertex3f(x + w, y - h, z - l);
    
    // Top Face (y = +h)
    rlNormal3f(0.0f, 1.0f, 0.0f);
    rlTexCoord2f(0.0f, 1.0f); rlVertex3f(x - w, y + h, z - l);
    rlTexCoord2f(0.0f, 0.0f); rlVertex3f(x - w, y + h, z + l);
    rlTexCoord2f(1.0f, 0.0f); rlVertex3f(x + w, y + h, z + l);
    rlTexCoord2f(1.0f, 1.0f); rlVertex3f(x + w, y + h, z - l);
    
    // Bottom Face (y = -h)
    rlNormal3f(0.0f, -1.0f, 0.0f);
    rlTexCoord2f(1.0f, 1.0f); rlVertex3f(x - w, y - h, z - l);
    rlTexCoord2f(0.0f, 1.0f); rlVertex3f(x + w, y - h, z - l);
    rlTexCoord2f(0.0f, 0.0f); rlVertex3f(x + w, y - h, z + l);
    rlTexCoord2f(1.0f, 0.0f); rlVertex3f(x - w, y - h, z + l);
    
    // Right Face (x = +w)
    rlNormal3f(1.0f, 0.0f, 0.0f);
    rlTexCoord2f(1.0f, 0.0f); rlVertex3f(x + w, y - h, z - l);
    rlTexCoord2f(1.0f, 1.0f); rlVertex3f(x + w, y + h, z - l);
    rlTexCoord2f(0.0f, 1.0f); rlVertex3f(x + w, y + h, z + l);
    rlTexCoord2f(0.0f, 0.0f); rlVertex3f(x + w, y - h, z + l);
    
    // Left Face (x = -w)
    rlNormal3f(-1.0f, 0.0f, 0.0f);
    rlTexCoord2f(0.0f, 0.0f); rlVertex3f(x - w, y - h, z - l);
    rlTexCoord2f(1.0f, 0.0f); rlVertex3f(x - w, y - h, z + l);
    rlTexCoord2f(1.0f, 1.0f); rlVertex3f(x - w, y + h, z + l);
    rlTexCoord2f(0.0f, 1.0f); rlVertex3f(x - w, y + h, z - l);
    
    rlEnd();
    rlSetTexture(0);
}

// Initialize procedurally generated textures
void InitGameTextures(void) {
    // 1. Wall texture
    Image imgWall = GenImageColor(64, 64, (Color){ 35, 38, 35, 255 });
    for (int y = 0; y < 64; y++) {
        for (int x = 0; x < 64; x++) {
            int r = GetRandomValue(-8, 8);
            Color c = GetImageColor(imgWall, x, y);
            c.r = Clamp(c.r + r, 0, 255);
            c.g = Clamp(c.g + r, 0, 255);
            c.b = Clamp(c.b + r, 0, 255);
            ImageDrawPixel(&imgWall, x, y, c);
        }
    }
    ImageDrawRectangle(&imgWall, 0, 0, 64, 2, (Color){ 15, 17, 15, 255 });
    ImageDrawRectangle(&imgWall, 0, 0, 2, 64, (Color){ 15, 17, 15, 255 });
    texWall = LoadTextureFromImage(imgWall);
    UnloadImage(imgWall);
    
    // 2. Floor texture
    Image imgFloor = GenImageColor(64, 64, (Color){ 45, 45, 48, 255 });
    for (int y = 0; y < 64; y++) {
        for (int x = 0; x < 64; x++) {
            int r = GetRandomValue(-6, 6);
            Color c = GetImageColor(imgFloor, x, y);
            c.r = Clamp(c.r + r, 0, 255);
            c.g = Clamp(c.g + r, 0, 255);
            c.b = Clamp(c.b + r, 0, 255);
            ImageDrawPixel(&imgFloor, x, y, c);
        }
    }
    ImageDrawRectangle(&imgFloor, 0, 0, 64, 1, (Color){ 25, 25, 27, 255 });
    ImageDrawRectangle(&imgFloor, 0, 32, 64, 1, (Color){ 25, 25, 27, 255 });
    ImageDrawRectangle(&imgFloor, 0, 0, 1, 64, (Color){ 25, 25, 27, 255 });
    ImageDrawRectangle(&imgFloor, 32, 0, 1, 64, (Color){ 25, 25, 27, 255 });
    texFloor = LoadTextureFromImage(imgFloor);
    UnloadImage(imgFloor);

    // 3. Ceiling texture
    Image imgCeiling = GenImageColor(64, 64, (Color){ 22, 22, 22, 255 });
    for (int y = 0; y < 64; y++) {
        for (int x = 0; x < 64; x++) {
            int r = GetRandomValue(-4, 4);
            Color c = GetImageColor(imgCeiling, x, y);
            c.r = Clamp(c.r + r, 0, 255);
            c.g = Clamp(c.g + r, 0, 255);
            c.b = Clamp(c.b + r, 0, 255);
            ImageDrawPixel(&imgCeiling, x, y, c);
        }
    }
    ImageDrawRectangle(&imgCeiling, 0, 0, 64, 2, (Color){ 8, 8, 8, 255 });
    ImageDrawRectangle(&imgCeiling, 0, 0, 2, 64, (Color){ 8, 8, 8, 255 });
    texCeiling = LoadTextureFromImage(imgCeiling);
    UnloadImage(imgCeiling);

    // 4. Monster texture (Creepy white face with red pupils)
    Image imgMonster = GenImageColor(64, 64, BLANK);
    ImageDrawCircle(&imgMonster, 32, 32, 20, (Color){ 230, 230, 230, 255 });
    ImageDrawCircle(&imgMonster, 24, 28, 4, (Color){ 15, 15, 15, 255 });
    ImageDrawCircle(&imgMonster, 40, 28, 4, (Color){ 15, 15, 15, 255 });
    ImageDrawPixel(&imgMonster, 24, 28, RED);
    ImageDrawPixel(&imgMonster, 40, 28, RED);
    ImageDrawCircle(&imgMonster, 32, 46, 6, (Color){ 15, 15, 15, 255 });
    ImageDrawRectangle(&imgMonster, 30, 48, 2, 8, (Color){ 160, 0, 0, 255 });
    ImageDrawRectangle(&imgMonster, 34, 46, 2, 11, (Color){ 160, 0, 0, 255 });
    texMonster = LoadTextureFromImage(imgMonster);
    UnloadImage(imgMonster);

    // 5. Battery icon texture
    Image imgBattery = GenImageColor(32, 32, BLANK);
    ImageDrawRectangle(&imgBattery, 10, 8, 12, 18, (Color){ 0, 220, 0, 255 });
    ImageDrawRectangle(&imgBattery, 13, 4, 6, 4, (Color){ 0, 160, 0, 255 });
    ImageDrawRectangle(&imgBattery, 12, 12, 8, 4, WHITE);
    texBattery = LoadTextureFromImage(imgBattery);
    UnloadImage(imgBattery);

    // 6. Evidence USB texture
    Image imgEvidence = GenImageColor(32, 32, BLANK);
    ImageDrawRectangle(&imgEvidence, 12, 10, 8, 16, (Color){ 0, 120, 255, 255 });
    ImageDrawRectangle(&imgEvidence, 14, 4, 4, 6, (Color){ 190, 190, 190, 255 });
    ImageDrawRectangle(&imgEvidence, 15, 14, 2, 6, (Color){ 0, 255, 255, 255 });
    texEvidence = LoadTextureFromImage(imgEvidence);
    UnloadImage(imgEvidence);

    // 7. Gate Key texture
    Image imgKey = GenImageColor(32, 32, BLANK);
    ImageDrawCircle(&imgKey, 16, 8, 6, (Color){ 230, 190, 50, 255 });
    ImageDrawCircle(&imgKey, 16, 8, 3, BLANK);
    ImageDrawRectangle(&imgKey, 15, 14, 3, 12, (Color){ 230, 190, 50, 255 });
    ImageDrawRectangle(&imgKey, 17, 20, 4, 2, (Color){ 230, 190, 50, 255 });
    ImageDrawRectangle(&imgKey, 17, 23, 4, 2, (Color){ 230, 190, 50, 255 });
    texKey = LoadTextureFromImage(imgKey);
    UnloadImage(imgKey);

    // 8. Flashlight overlay mask (radial gradient)
    Image imgMask = GenImageColor(512, 512, BLACK);
    for (int y = 0; y < 512; y++) {
        for (int x = 0; x < 512; x++) {
            float dx = x - 256.0f;
            float dy = y - 256.0f;
            float dist = sqrtf(dx*dx + dy*dy) / 256.0f;
            float alpha = dist * dist * 1.6f;
            if (alpha > 1.0f) alpha = 1.0f;
            if (alpha < 0.0f) alpha = 0.0f;
            ImageDrawPixel(&imgMask, x, y, (Color){ 0, 0, 0, (unsigned char)(alpha * 255) });
        }
    }
    texFlashlightMask = LoadTextureFromImage(imgMask);
    UnloadImage(imgMask);
}

// Unload all textures
void FreeGameTextures(void) {
    UnloadTexture(texWall);
    UnloadTexture(texFloor);
    UnloadTexture(texCeiling);
    UnloadTexture(texMonster);
    UnloadTexture(texBattery);
    UnloadTexture(texEvidence);
    UnloadTexture(texKey);
    UnloadTexture(texFlashlightMask);
}
