#include "raylib.h"
#include "raymath.h"
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <math.h>
#include <time.h>

#define MAX_PARTICLES 150

// Structure definitions
typedef struct Ball {
    Vector3 pos;
    Vector3 prevPos;
    Vector3 vel;
    float radius;
    bool active;
    bool resetQueued;
    float resetTimer;
    Vector3 spinAxis;
    float spinAngle;
} Ball;

typedef struct Particle {
    Vector3 pos;
    Vector3 vel;
    Color color;
    float size;
    float life;
    float maxLife;
    bool active;
} Particle;

typedef struct ShootSpot {
    Vector3 pos;
    const char *name;
} ShootSpot;

// Global variables
Particle particles[MAX_PARTICLES] = { 0 };

// Particle system functions
void SpawnScoreParticles(Vector3 pos) {
    for (int i = 0; i < 60; i++) {
        for (int p = 0; p < MAX_PARTICLES; p++) {
            if (!particles[p].active) {
                particles[p].active = true;
                particles[p].pos = pos;
                
                // Spread directions outward and upward
                float angle = ((float)rand() / RAND_MAX) * 2.0f * PI;
                float speed = 1.0f + ((float)rand() / RAND_MAX) * 3.5f;
                particles[p].vel = (Vector3){
                    cosf(angle) * speed * 0.8f,
                    1.5f + ((float)rand() / RAND_MAX) * 4.0f,
                    sinf(angle) * speed * 0.8f
                };
                
                // Neon palette
                Color colors[] = { GOLD, ORANGE, LIME, SKYBLUE, VIOLET, PINK };
                particles[p].color = colors[rand() % 6];
                particles[p].size = 0.04f + ((float)rand() / RAND_MAX) * 0.06f;
                particles[p].life = 0.0f;
                particles[p].maxLife = 0.6f + ((float)rand() / RAND_MAX) * 0.8f;
                break;
            }
        }
    }
}

void SpawnBounceParticles(Vector3 pos, int count, Color col) {
    for (int i = 0; i < count; i++) {
        for (int p = 0; p < MAX_PARTICLES; p++) {
            if (!particles[p].active) {
                particles[p].active = true;
                particles[p].pos = pos;
                
                float angle = ((float)rand() / RAND_MAX) * 2.0f * PI;
                float speed = 0.5f + ((float)rand() / RAND_MAX) * 1.5f;
                particles[p].vel = (Vector3){
                    cosf(angle) * speed,
                    0.5f + ((float)rand() / RAND_MAX) * 1.5f,
                    sinf(angle) * speed
                };
                particles[p].color = col;
                particles[p].size = 0.02f + ((float)rand() / RAND_MAX) * 0.04f;
                particles[p].life = 0.0f;
                particles[p].maxLife = 0.3f + ((float)rand() / RAND_MAX) * 0.4f;
                break;
            }
        }
    }
}

void UpdateParticles(float dt) {
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (particles[i].active) {
            particles[i].life += dt;
            if (particles[i].life >= particles[i].maxLife) {
                particles[i].active = false;
            } else {
                particles[i].pos = Vector3Add(particles[i].pos, Vector3Scale(particles[i].vel, dt));
                particles[i].vel.y += -9.81f * dt; // Gravity pulls particles down
            }
        }
    }
}

// Procedural audio generation
Sound GenerateBounceSound(void) {
    int sampleRate = 44100;
    float duration = 0.12f;
    int frameCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(frameCount * sizeof(short));
    
    for (int i = 0; i < frameCount; i++) {
        float t = (float)i / sampleRate;
        float amp = expf(-18.0f * t); // Quick decay
        float freq = 130.0f + 50.0f * expf(-25.0f * t); // Pitch slide down
        data[i] = (short)(amp * sinf(2.0f * PI * freq * t) * 16000);
    }
    
    Wave wave = {
        .frameCount = frameCount,
        .sampleRate = sampleRate,
        .sampleSize = 16,
        .channels = 1,
        .data = data
    };
    Sound sound = LoadSoundFromWave(wave);
    free(data);
    return sound;
}

Sound GenerateScoreSound(void) {
    int sampleRate = 44100;
    float duration = 0.45f;
    int frameCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(frameCount * sizeof(short));
    
    for (int i = 0; i < frameCount; i++) {
        float t = (float)i / sampleRate;
        float amp = expf(-5.0f * t);
        
        // Fast triumphant arpeggio chime: C5 -> E5 -> G5 -> C6
        float freq = 523.25f; // C5
        if (t > 0.08f) freq = 659.25f; // E5
        if (t > 0.16f) freq = 783.99f; // G5
        if (t > 0.24f) freq = 1046.50f; // C6
        
        float val = sinf(2.0f * PI * freq * t) + 0.4f * sinf(2.0f * PI * freq * 2.0f * t);
        data[i] = (short)(amp * (val / 1.4f) * 15000);
    }
    
    Wave wave = {
        .frameCount = frameCount,
        .sampleRate = sampleRate,
        .sampleSize = 16,
        .channels = 1,
        .data = data
    };
    Sound sound = LoadSoundFromWave(wave);
    free(data);
    return sound;
}

Sound GenerateWhackSound(void) {
    int sampleRate = 44100;
    float duration = 0.18f;
    int frameCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(frameCount * sizeof(short));
    
    for (int i = 0; i < frameCount; i++) {
        float t = (float)i / sampleRate;
        float amp = expf(-14.0f * t);
        float freq = 75.0f + 30.0f * expf(-12.0f * t);
        float noise = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
        float val = sinf(2.0f * PI * freq * t) + 0.25f * noise; // Thud + board noise
        data[i] = (short)(amp * (val / 1.25f) * 18000);
    }
    
    Wave wave = {
        .frameCount = frameCount,
        .sampleRate = sampleRate,
        .sampleSize = 16,
        .channels = 1,
        .data = data
    };
    Sound sound = LoadSoundFromWave(wave);
    free(data);
    return sound;
}

Sound GenerateChargeSound(void) {
    int sampleRate = 44100;
    float duration = 1.0f; // Long enough for maximum charge duration
    int frameCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(frameCount * sizeof(short));
    
    for (int i = 0; i < frameCount; i++) {
        float t = (float)i / sampleRate;
        // Rising frequency sine wave with vibrato
        float baseFreq = 220.0f + 220.0f * t;
        float vibrato = 10.0f * sinf(2.0f * PI * 15.0f * t);
        float freq = baseFreq + vibrato;
        data[i] = (short)(sinf(2.0f * PI * freq * t) * 6000 * t); // volume fades in
    }
    
    Wave wave = {
        .frameCount = frameCount,
        .sampleRate = sampleRate,
        .sampleSize = 16,
        .channels = 1,
        .data = data
    };
    Sound sound = LoadSoundFromWave(wave);
    free(data);
    return sound;
}

// Procedural texture creation
Texture2D GenerateBasketballTexture(void) {
    int width = 512;
    int height = 256;
    Image img = GenImageColor(width, height, (Color){ 220, 100, 35, 255 }); // Classic leather orange
    
    // Draw fine leather bumps
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            if (rand() % 10 == 0) {
                ImageDrawPixel(&img, x, y, (Color){ 200, 85, 25, 255 });
            }
        }
    }
    
    // Seams
    // Main vertical seam (middle of texture wrapping X)
    ImageDrawRectangle(&img, width / 2 - 3, 0, 6, height, BLACK);
    // Main horizontal seam (middle of Y)
    ImageDrawRectangle(&img, 0, height / 2 - 3, width, 6, BLACK);
    
    // Curved seams
    for (int y = 0; y < height; y++) {
        int x1 = width / 4 + (int)(60.0f * sinf(PI * (float)y / height));
        int x2 = 3 * width / 4 - (int)(60.0f * sinf(PI * (float)y / height));
        
        for (int dx = -2; dx <= 2; dx++) {
            ImageDrawPixel(&img, (x1 + dx + width) % width, y, BLACK);
            ImageDrawPixel(&img, (x2 + dx + width) % width, y, BLACK);
        }
    }
    
    Texture2D tex = LoadTextureFromImage(img);
    UnloadImage(img);
    return tex;
}

Texture2D GenerateCourtTexture(void) {
    int width = 512;
    int height = 512;
    Image img = GenImageColor(width, height, (Color){ 25, 28, 36, 255 }); // Stylish dark stadium court
    
    // Stylized gridlines on floor
    for (int y = 0; y < height; y += 32) {
        ImageDrawLine(&img, 0, y, width - 1, y, (Color){ 35, 40, 52, 255 });
    }
    for (int x = 0; x < width; x += 32) {
        ImageDrawLine(&img, x, 0, x, height - 1, (Color){ 35, 40, 52, 255 });
    }
    
    Texture2D tex = LoadTextureFromImage(img);
    UnloadImage(img);
    return tex;
}

// Procedural Drawing Helpers
void DrawCourt(void) {
    // Ground plane with grid
    DrawPlane((Vector3){ 0.0f, 0.0f, 5.0f }, (Vector2){ 24.0f, 20.0f }, (Color){30, 35, 45, 255});
    
    float y = 0.005f; // Raised slightly to avoid Z-fighting
    Color lineCol = ColorAlpha(SKYBLUE, 0.7f);
    float thick = 0.08f;
    
    // Court outline
    DrawCube((Vector3){ -6.0f, y, 5.0f }, thick, 0.01f, 12.0f, lineCol);
    DrawCube((Vector3){ 6.0f, y, 5.0f }, thick, 0.01f, 12.0f, lineCol);
    DrawCube((Vector3){ 0.0f, y, -1.0f }, 12.0f, 0.01f, thick, lineCol);
    DrawCube((Vector3){ 0.0f, y, 11.0f }, 12.0f, 0.01f, thick, lineCol);
    
    // Key (paint area)
    DrawCube((Vector3){ 0.0f, y, 3.4f }, 3.6f, 0.01f, thick, lineCol);
    DrawCube((Vector3){ -1.8f, y, 7.2f }, thick, 0.01f, 7.6f, lineCol);
    DrawCube((Vector3){ 1.8f, y, 7.2f }, thick, 0.01f, 7.6f, lineCol);
    
    // Free throw circle
    Vector3 circleCenter = { 0.0f, y, 3.4f };
    float r = 1.8f;
    int segs = 32;
    for (int i = 0; i < segs; i++) {
        float a1 = (float)i / segs * 2.0f * PI;
        float a2 = (float)(i + 1) / segs * 2.0f * PI;
        Vector3 p1 = { circleCenter.x + cosf(a1)*r, y, circleCenter.z + sinf(a1)*r };
        Vector3 p2 = { circleCenter.x + cosf(a2)*r, y, circleCenter.z + sinf(a2)*r };
        DrawLine3D(p1, p2, lineCol);
    }
    
    // Three-point line arc (centered at hoop Z level)
    Vector3 hoopBase = { 0.0f, y, 7.8f };
    float threeR = 6.2f;
    int threeSegs = 40;
    for (int i = 0; i < threeSegs; i++) {
        float a1 = -PI/2.0f + (float)i / threeSegs * PI;
        float a2 = -PI/2.0f + (float)(i + 1) / threeSegs * PI;
        Vector3 p1 = { hoopBase.x + sinf(a1)*threeR, y, hoopBase.z - cosf(a1)*threeR };
        Vector3 p2 = { hoopBase.x + sinf(a2)*threeR, y, hoopBase.z - cosf(a2)*threeR };
        DrawLine3D(p1, p2, lineCol);
    }
    
    // Stadium light pillars at court corners
    Vector3 lightPos[] = {
        { -8.0f, 0.0f, -3.0f },
        { 8.0f, 0.0f, -3.0f },
        { -8.0f, 0.0f, 13.0f },
        { 8.0f, 0.0f, 13.0f }
    };
    for (int i = 0; i < 4; i++) {
        // Vertical pole
        DrawCylinderEx(lightPos[i], (Vector3){ lightPos[i].x, 8.0f, lightPos[i].z }, 0.12f, 0.08f, 8, (Color){ 45, 45, 55, 255 });
        // Cross bar for lights
        Vector3 barStart = { lightPos[i].x - 0.7f, 8.0f, lightPos[i].z };
        Vector3 barEnd = { lightPos[i].x + 0.7f, 8.0f, lightPos[i].z };
        DrawLine3D(barStart, barEnd, GRAY);
        
        // 3 Glowing halogen lights on each bar
        for (int j = 0; j < 3; j++) {
            float t = (float)j / 2.0f;
            Vector3 bulbPos = Vector3Lerp(barStart, barEnd, t);
            DrawSphere(bulbPos, 0.18f, YELLOW);
            DrawSphere(bulbPos, 0.28f, ColorAlpha(YELLOW, 0.15f)); // Light bloom
        }
    }
}

void DrawHoop(float netSwishTime) {
    Vector3 rimCenter = { 0.0f, 3.05f, 7.8f };
    float rimRadius = 0.35f;
    
    // Support pole (behind backboard)
    DrawCylinderEx((Vector3){ 0.0f, 0.0f, 8.4f }, (Vector3){ 0.0f, 3.6f, 8.4f }, 0.08f, 0.08f, 10, (Color){ 50, 50, 60, 255 });
    // Connectors
    DrawCylinderEx((Vector3){ 0.0f, 3.5f, 8.4f }, (Vector3){ 0.0f, 3.5f, 8.1f }, 0.04f, 0.04f, 8, GRAY);
    DrawCylinderEx((Vector3){ 0.0f, 3.05f, 8.4f }, (Vector3){ 0.0f, 3.05f, 8.1f }, 0.04f, 0.04f, 8, GRAY);
    
    // Glass Backboard (translucent glassmorphism)
    DrawCube((Vector3){ 0.0f, 3.6f, 8.15f }, 1.8f, 1.2f, 0.06f, ColorAlpha(SKYBLUE, 0.25f));
    DrawCubeWires((Vector3){ 0.0f, 3.6f, 8.15f }, 1.8f, 1.2f, 0.06f, WHITE);
    // Draw target rectangle outline
    DrawCubeWires((Vector3){ 0.0f, 3.35f, 8.14f }, 0.59f, 0.45f, 0.01f, WHITE);
    
    // Red Metal Rim (Drawn with tube cylinders)
    int rimSegs = 24;
    float rThick = 0.02f;
    for (int i = 0; i < rimSegs; i++) {
        float a1 = (float)i / rimSegs * 2.0f * PI;
        float a2 = (float)(i + 1) / rimSegs * 2.0f * PI;
        Vector3 p1 = { rimCenter.x + cosf(a1)*rimRadius, rimCenter.y, rimCenter.z + sinf(a1)*rimRadius };
        Vector3 p2 = { rimCenter.x + cosf(a2)*rimRadius, rimCenter.y, rimCenter.z + sinf(a2)*rimRadius };
        DrawCylinderEx(p1, p2, rThick, rThick, 6, RED);
    }
    // Rim attachment box
    DrawCube((Vector3){ 0.0f, 3.05f, 8.0f }, 0.15f, 0.05f, 0.2f, RED);
    
    // Rope Netting with diamond mesh texture and swish animation expansion
    float swishFactor = 0.0f;
    if (netSwishTime > 0.0f) {
        swishFactor = sinf(netSwishTime * PI * 5.0f) * (netSwishTime / 0.5f);
    }
    
    int segments = 12;
    float top_r = rimRadius;
    float bot_r = rimRadius * 0.62f * (1.0f + 0.35f * swishFactor);
    float top_y = rimCenter.y;
    float bot_y = rimCenter.y - 0.52f;
    
    for (int i = 0; i < segments; i++) {
        float angle1 = (float)i / segments * PI * 2;
        float angle2 = (float)(i + 1) / segments * PI * 2;
        
        Vector3 t1 = { rimCenter.x + cosf(angle1)*top_r, top_y, rimCenter.z + sinf(angle1)*top_r };
        Vector3 t2 = { rimCenter.x + cosf(angle2)*top_r, top_y, rimCenter.z + sinf(angle2)*top_r };
        
        float bot_angle1 = angle1 + PI / segments;
        float bot_angle2 = angle2 + PI / segments;
        
        Vector3 b1 = { rimCenter.x + cosf(bot_angle1)*bot_r, bot_y, rimCenter.z + sinf(bot_angle1)*bot_r };
        Vector3 b2 = { rimCenter.x + cosf(bot_angle2)*bot_r, bot_y, rimCenter.z + sinf(bot_angle2)*bot_r };
        
        // Vertical weave
        DrawLine3D(t1, b1, ColorAlpha(WHITE, 0.7f));
        DrawLine3D(t1, b2, ColorAlpha(WHITE, 0.7f));
        
        // Mid rings for diamond structures
        Vector3 m1 = Vector3Lerp(t1, b1, 0.5f);
        Vector3 m2 = Vector3Lerp(t2, b2, 0.5f);
        DrawLine3D(m1, m2, ColorAlpha(WHITE, 0.5f));
    }
}

// Glassmorphism HUD helpers
void DrawGlassPanel(int x, int y, int width, int height, const char* title) {
    DrawRectangleRounded((Rectangle){ (float)x, (float)y, (float)width, (float)height }, 0.12f, 4, ColorAlpha((Color){ 20, 24, 35, 255 }, 0.75f));
    DrawRectangleRoundedLines((Rectangle){ (float)x, (float)y, (float)width, (float)height }, 0.12f, 4, ColorAlpha(SKYBLUE, 0.45f));
    
    if (title != NULL) {
        DrawText(title, x + 15, y + 12, 18, GOLD);
        DrawLine(x + 15, y + 36, x + width - 15, y + 36, ColorAlpha(WHITE, 0.15f));
    }
}

void AlignCameraToHoop(Vector3 playerPos, float *yaw, float *pitch) {
    Vector3 hoopCenter = { 0.0f, 3.05f, 7.8f };
    Vector3 dir = Vector3Normalize(Vector3Subtract(hoopCenter, playerPos));
    *yaw = atan2f(dir.x, dir.z) * RAD2DEG;
    *pitch = asinf(dir.y) * RAD2DEG;
}

int main(void) {
    // Initialization
    const int screenWidth = 1280;
    const int screenHeight = 720;
    
    InitWindow(screenWidth, screenHeight, "3D Basketball Prototype");
    InitAudioDevice();
    
    SetTargetFPS(60);
    srand(time(NULL));
    
    // Load generated resources
    Texture2D basketballTex = GenerateBasketballTexture();
    Texture2D courtTex = GenerateCourtTexture();
    
    Sound fxBounce = GenerateBounceSound();
    Sound fxScore = GenerateScoreSound();
    Sound fxWhack = GenerateWhackSound();
    Sound fxCharge = GenerateChargeSound();
    
    // Define shooting spots
    ShootSpot spots[] = {
        { { 0.0f, 1.8f, 3.2f }, "Free Throw Line" },
        { { 0.0f, 1.8f, 1.1f }, "Three-Point Center" },
        { { -4.5f, 1.8f, 4.5f }, "Left Corner Wing" },
        { { 4.5f, 1.8f, 4.5f }, "Right Corner Wing" }
    };
    int numSpots = sizeof(spots) / sizeof(spots[0]);
    int currentSpot = 0;
    
    // Player & Aim state
    Vector3 playerPos = spots[currentSpot].pos;
    float yaw = 0.0f;
    float pitch = 0.0f;
    AlignCameraToHoop(playerPos, &yaw, &pitch);
    
    // 3D Camera initialization
    Camera3D camera = { 0 };
    camera.position = playerPos;
    camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.fovy = 65.0f;
    camera.projection = CAMERA_PERSPECTIVE;
    
    // Ball variables
    Ball ball = { 0 };
    ball.radius = 0.14f;
    ball.active = false;
    ball.spinAxis = (Vector3){ 0.0f, 1.0f, 0.0f };
    ball.spinAngle = 0.0f;
    
    // Load 3D Sphere mesh & model for textured ball
    Mesh ballMesh = GenMeshSphere(ball.radius, 24, 24);
    Model ballModel = LoadModelFromMesh(ballMesh);
    ballModel.materials[0].maps[MATERIAL_MAP_ALBEDO].texture = basketballTex;
    
    // Game variables
    int score = 0;
    int streak = 0;
    int highScore = 0;
    
    float charge = 0.0f;
    bool charging = false;
    float chargeSpeed = 1.35f; // charge rate multiplier
    
    float gravityY = -18.5f; // satisfying arcade gravity
    
    float minThrowSpeed = 6.5f;
    float maxThrowSpeed = 17.5f;
    
    bool hasScored = false;
    bool hitBackboard = false;
    bool hitRim = false;
    bool shotFinished = false;
    
    float netSwishTime = 0.0f;
    
    // Screen shake state
    float shakeTime = 0.0f;
    float shakeIntensity = 0.0f;
    
    // Feedback text popups
    char feedbackText[32] = "";
    float feedbackTimer = 0.0f;
    Color feedbackColor = WHITE;
    float feedbackScale = 1.0f;
    
    bool cursorLocked = true;
    DisableCursor();
    
    // Game Loop
    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        if (dt > 0.1f) dt = 0.1f; // Cap delta time during frame spikes
        
        // --- 1. HANDLE USER INPUT & AIMING ---
        if (IsKeyPressed(KEY_TAB)) {
            cursorLocked = !cursorLocked;
            if (cursorLocked) DisableCursor();
            else EnableCursor();
        }
        
        // Change shooter position spot
        for (int i = 0; i < numSpots; i++) {
            if (IsKeyPressed(KEY_ONE + i)) {
                currentSpot = i;
                playerPos = spots[currentSpot].pos;
                AlignCameraToHoop(playerPos, &yaw, &pitch);
                if (!ball.active) {
                    ball.active = false;
                    ball.resetQueued = false;
                }
            }
        }
        
        // Look / Aim with Mouse (only if cursor is locked)
        if (cursorLocked) {
            Vector2 mouseDelta = GetMouseDelta();
            yaw -= mouseDelta.x * 0.12f;
            pitch -= mouseDelta.y * 0.12f;
            pitch = Clamp(pitch, -35.0f, 65.0f); // Limit vertical angle
        }
        
        // Recalculate camera coordinate vectors
        float pitchRad = pitch * DEG2RAD;
        float yawRad = yaw * DEG2RAD;
        Vector3 forward = {
            cosf(pitchRad) * sinf(yawRad),
            sinf(pitchRad),
            cosf(pitchRad) * cosf(yawRad)
        };
        
        camera.position = playerPos;
        camera.target = Vector3Add(camera.position, forward);
        
        // Shooting & Power Charging Mechanics
        if (!ball.active) {
            // Ball position holding offset (held in player's hands)
            Vector3 right = Vector3Normalize(Vector3CrossProduct(forward, camera.up));
            // Positioned slightly in front, down, and to the right of camera view
            ball.pos = Vector3Add(camera.position, Vector3Scale(forward, 0.45f));
            ball.pos = Vector3Add(ball.pos, Vector3Scale(right, 0.12f));
            ball.pos = Vector3Add(ball.pos, Vector3Scale(camera.up, -0.15f));
            ball.prevPos = ball.pos;
            ball.vel = (Vector3){ 0.0f, 0.0f, 0.0f };
            ball.spinAngle = 0.0f;
            ball.spinAxis = (Vector3){ 0.0f, 1.0f, 0.0f };
            
            // Hold Space or Left Mouse to charge
            if ((IsKeyDown(KEY_SPACE) || IsMouseButtonDown(MOUSE_BUTTON_LEFT)) && cursorLocked) {
                if (!charging) {
                    charging = true;
                    charge = 0.0f;
                    PlaySound(fxCharge);
                }
                charge += chargeSpeed * dt;
                if (charge > 1.0f) charge = 1.0f;
            } else if (charging) {
                // Release to shoot!
                charging = false;
                StopSound(fxCharge);
                
                float throwSpeed = minThrowSpeed + charge * (maxThrowSpeed - minThrowSpeed);
                ball.vel = Vector3Scale(forward, throwSpeed);
                ball.active = true;
                ball.resetQueued = false;
                
                // Set initial backspin
                ball.spinAngle = 0.0f;
                Vector3 spinDir = { -ball.vel.z, 0.0f, ball.vel.x };
                if (Vector3Length(spinDir) > 0.001f) {
                    ball.spinAxis = Vector3Normalize(spinDir);
                } else {
                    ball.spinAxis = (Vector3){ 1.0f, 0.0f, 0.0f };
                }
                
                hasScored = false;
                hitBackboard = false;
                hitRim = false;
                shotFinished = false;
            }
        }
        
        // Manual reset key
        if (IsKeyPressed(KEY_R)) {
            ball.active = false;
            ball.resetQueued = false;
            charging = false;
            StopSound(fxCharge);
        }
        
        // --- 2. GAME PHYSICS & SIMULATION ---
        if (ball.active) {
            ball.prevPos = ball.pos;
            
            // Apply physics: gravity acceleration
            ball.vel.y += gravityY * dt;
            ball.pos = Vector3Add(ball.pos, Vector3Scale(ball.vel, dt));
            
            // Update ball spin angle based on speed
            float hzSpeed = sqrtf(ball.vel.x * ball.vel.x + ball.vel.z * ball.vel.z);
            ball.spinAngle += (hzSpeed / ball.radius + 6.0f) * dt;
            
            // A. COLLISION: Floor (y = 0.0)
            if (ball.pos.y - ball.radius < 0.0f) {
                ball.pos.y = ball.radius;
                // Bounce with elasticity
                ball.vel.y = -ball.vel.y * 0.58f;
                // Add friction damping on X/Z
                ball.vel.x *= 0.65f;
                ball.vel.z *= 0.65f;
                
                // Play sound if impact is audible
                if (fabsf(ball.vel.y) > 0.6f) {
                    PlaySound(fxBounce);
                    SpawnBounceParticles(ball.pos, 6, (Color){ 200, 100, 40, 255 });
                }
            }
            
            // B. COLLISION: Backboard Box
            // Backboard center (0, 3.6, 8.15), size: 1.8 x 1.2 x 0.06
            // AABB Bounds: min(-0.9, 3.0, 8.12), max(0.9, 4.2, 8.18)
            Vector3 bbMin = { -0.9f, 3.0f, 8.12f };
            Vector3 bbMax = { 0.9f, 4.2f, 8.18f };
            
            // Find closest point on AABB to sphere
            Vector3 closestBB = {
                Clamp(ball.pos.x, bbMin.x, bbMax.x),
                Clamp(ball.pos.y, bbMin.y, bbMax.y),
                Clamp(ball.pos.z, bbMin.z, bbMax.z)
            };
            
            float distBB = Vector3Distance(ball.pos, closestBB);
            if (distBB < ball.radius) {
                Vector3 normal = Vector3Subtract(ball.pos, closestBB);
                if (Vector3Length(normal) == 0.0f) normal = (Vector3){ 0.0f, 0.0f, -1.0f };
                else normal = Vector3Normalize(normal);
                
                // Push out along normal
                ball.pos = Vector3Add(closestBB, Vector3Scale(normal, ball.radius));
                
                // Reflect velocity
                float normalVel = Vector3DotProduct(ball.vel, normal);
                if (normalVel < 0.0f) {
                    ball.vel = Vector3Subtract(ball.vel, Vector3Scale(normal, (1.0f + 0.5f) * normalVel));
                    
                    hitBackboard = true;
                    PlaySound(fxWhack);
                    shakeTime = 0.15f;
                    shakeIntensity = 0.08f;
                    
                    // chaotic rotation deflection upon collision
                    Vector3 randAxis = {
                        ((float)rand() / RAND_MAX - 0.5f),
                        ((float)rand() / RAND_MAX - 0.5f),
                        ((float)rand() / RAND_MAX - 0.5f)
                    };
                    if (Vector3Length(randAxis) > 0.001f) {
                        ball.spinAxis = Vector3Normalize(randAxis);
                    }
                    
                    // Spawn wood dust particles
                    SpawnBounceParticles(closestBB, 10, WHITE);
                }
            }
            
            // C. COLLISION: Rim Ring
            // Rim Center (0, 3.05, 7.8), Radius 0.35, thickness 0.02
            Vector3 rimCenter = { 0.0f, 3.05f, 7.8f };
            float rimRadius = 0.35f;
            float rimThickness = 0.02f;
            
            Vector2 ballXZ = { ball.pos.x, ball.pos.z };
            Vector2 rimXZ = { rimCenter.x, rimCenter.z };
            Vector2 dirXZ = Vector2Subtract(ballXZ, rimXZ);
            float distXZ = Vector2Length(dirXZ);
            
            Vector3 closestRim;
            if (distXZ > 0.001f) {
                Vector2 dirXZNorm = Vector2Scale(dirXZ, 1.0f / distXZ);
                closestRim = (Vector3){
                    rimCenter.x + dirXZNorm.x * rimRadius,
                    rimCenter.y,
                    rimCenter.z + dirXZNorm.y * rimRadius
                };
            } else {
                closestRim = (Vector3){ rimCenter.x + rimRadius, rimCenter.y, rimCenter.z };
            }
            
            float distToRimMetal = Vector3Distance(ball.pos, closestRim);
            if (distToRimMetal < (ball.radius + rimThickness)) {
                Vector3 normal = Vector3Subtract(ball.pos, closestRim);
                if (Vector3Length(normal) == 0.0f) normal = (Vector3){ 0.0f, 1.0f, 0.0f };
                else normal = Vector3Normalize(normal);
                
                // Push ball out
                ball.pos = Vector3Add(closestRim, Vector3Scale(normal, ball.radius + rimThickness));
                
                // Reflect velocity
                float normalVel = Vector3DotProduct(ball.vel, normal);
                if (normalVel < 0.0f) {
                    ball.vel = Vector3Subtract(ball.vel, Vector3Scale(normal, (1.0f + 0.42f) * normalVel));
                    
                    hitRim = true;
                    PlaySound(fxBounce);
                    shakeTime = 0.12f;
                    shakeIntensity = 0.05f;
                    
                    // chaotic rotation deflection upon collision
                    Vector3 randAxis = {
                        ((float)rand() / RAND_MAX - 0.5f),
                        ((float)rand() / RAND_MAX - 0.5f),
                        ((float)rand() / RAND_MAX - 0.5f)
                    };
                    if (Vector3Length(randAxis) > 0.001f) {
                        ball.spinAxis = Vector3Normalize(randAxis);
                    }
                    
                    // Spawn red metal sparks
                    SpawnBounceParticles(closestRim, 8, RED);
                }
            }
            
            // D. COLLISION: Support Pole
            // Cylinder axis: from (0, 0, 8.4) to (0, 3.6, 8.4), radius 0.08
            Vector2 poleXZ = { 0.0f, 8.4f };
            Vector2 toPoleXZ = Vector2Subtract(ballXZ, poleXZ);
            float distToPole = Vector2Length(toPoleXZ);
            if (distToPole < (ball.radius + 0.08f) && ball.pos.y >= 0.0f && ball.pos.y <= 3.6f) {
                Vector2 normalXZ = Vector2Normalize(toPoleXZ);
                Vector3 normal = { normalXZ.x, 0.0f, normalXZ.y };
                
                // Push out
                ball.pos.x = poleXZ.x + normalXZ.x * (ball.radius + 0.08f);
                ball.pos.z = poleXZ.y + normalXZ.y * (ball.radius + 0.08f);
                
                float normalVel = Vector3DotProduct(ball.vel, normal);
                if (normalVel < 0.0f) {
                    ball.vel = Vector3Subtract(ball.vel, Vector3Scale(normal, (1.0f + 0.3f) * normalVel));
                    PlaySound(fxWhack);
                }
            }
            
            // E. TRIGGER: Score Detection
            // Check if the ball passes downwards through y = 3.05f within the rim circle
            if (!hasScored && ball.prevPos.y >= rimCenter.y && ball.pos.y < rimCenter.y) {
                // Interpolate to cross height
                float t = (rimCenter.y - ball.prevPos.y) / (ball.pos.y - ball.prevPos.y);
                float xCross = ball.prevPos.x + t * (ball.pos.x - ball.prevPos.x);
                float zCross = ball.prevPos.z + t * (ball.pos.z - ball.prevPos.z);
                
                float crossDistSq = xCross * xCross + (zCross - rimCenter.z) * (zCross - rimCenter.z);
                if (crossDistSq < (rimRadius * rimRadius)) {
                    // Score successful!
                    hasScored = true;
                    score++;
                    streak++;
                    if (score > highScore) highScore = score;
                    
                    SpawnScoreParticles(rimCenter);
                    netSwishTime = 0.5f; // trigger swish wiggle animation
                    PlaySound(fxScore);
                    
                    // Add physics drag: slow down horizontal speed as if caught by net
                    ball.vel.x *= 0.2f;
                    ball.vel.z *= 0.2f;
                    ball.vel.y = -1.8f; // pull ball smoothly straight down
                    
                    // Trigger text pops
                    if (!hitBackboard && !hitRim) {
                        feedbackScale = 2.0f;
                        strncpy(feedbackText, "PERFECT SWISH! +1", sizeof(feedbackText));
                        feedbackColor = GOLD;
                        feedbackTimer = 1.8f;
                    } else if (hitBackboard && !hitRim) {
                        feedbackScale = 1.5f;
                        strncpy(feedbackText, "BANK SHOT! +1", sizeof(feedbackText));
                        feedbackColor = SKYBLUE;
                        feedbackTimer = 1.8f;
                    } else {
                        feedbackScale = 1.3f;
                        strncpy(feedbackText, "NICE SHOT! +1", sizeof(feedbackText));
                        feedbackColor = LIME;
                        feedbackTimer = 1.8f;
                    }
                }
            }
            
            // F. TRIGGER: Shot Finished Detection
            if (!shotFinished) {
                // Ended if hits floor, roll stops, or goes out of court bounds
                bool outOfBounds = (ball.pos.z > 13.0f || ball.pos.z < -4.0f || ball.pos.x < -10.0f || ball.pos.x > 10.0f);
                bool stationary = (ball.pos.y == ball.radius && Vector3Length((Vector3){ball.vel.x, 0, ball.vel.z}) < 0.2f);
                
                if (stationary || outOfBounds || ball.pos.y < -3.0f) {
                    shotFinished = true;
                    ball.resetQueued = true;
                    ball.resetTimer = 1.4f; // Auto-resets 1.4 seconds after stopping
                    
                    if (!hasScored) {
                        streak = 0; // Break streak
                        feedbackScale = 1.2f;
                        feedbackTimer = 1.6f;
                        feedbackColor = RED;
                        
                        if (hitRim || hitBackboard) {
                            strncpy(feedbackText, "BRICK!", sizeof(feedbackText));
                        } else {
                            strncpy(feedbackText, "AIRBALL!", sizeof(feedbackText));
                        }
                    }
                }
            }
        }
        
        // --- 3. TIMERS & EFFECT UPDATES ---
        if (ball.resetQueued) {
            ball.resetTimer -= dt;
            if (ball.resetTimer <= 0.0f) {
                ball.active = false;
                ball.resetQueued = false;
            }
        }
        
        if (netSwishTime > 0.0f) netSwishTime -= dt;
        if (feedbackTimer > 0.0f) feedbackTimer -= dt;
        
        // Update particles
        UpdateParticles(dt);
        
        // Process screen shake timer decay
        Vector3 finalCameraPos = camera.position;
        Vector3 finalCameraTarget = camera.target;
        if (shakeTime > 0.0f) {
            shakeTime -= dt;
            float factor = shakeTime / 0.15f;
            float currentIntensity = shakeIntensity * factor;
            Vector3 shakeOffset = {
                ((float)rand() / RAND_MAX - 0.5f) * currentIntensity,
                ((float)rand() / RAND_MAX - 0.5f) * currentIntensity,
                ((float)rand() / RAND_MAX - 0.5f) * currentIntensity
            };
            camera.position = Vector3Add(camera.position, shakeOffset);
            camera.target = Vector3Add(camera.target, shakeOffset);
        }
        
        // --- 4. RENDER SCENE (3D & 2D) ---
        BeginDrawing();
            ClearBackground((Color){ 10, 14, 23, 255 }); // Dark space blue
            
            // 3D Rendering Pass
            BeginMode3D(camera);
                
                // Draw textured court & lines
                DrawCourt();
                
                // Draw hoop elements
                DrawHoop(netSwishTime);
                
                // Draw active ball in flight
                if (ball.active) {
                    DrawModelEx(ballModel, ball.pos, ball.spinAxis, ball.spinAngle * RAD2DEG, (Vector3){ 1.0f, 1.0f, 1.0f }, WHITE);
                } else {
                    // Preview visual trajectory dots (yellow dashed path helper)
                    float chargeRatio = charging ? charge : 0.0f;
                    float launchSpeed = minThrowSpeed + chargeRatio * (maxThrowSpeed - minThrowSpeed);
                    Vector3 trajVel = Vector3Scale(forward, launchSpeed);
                    Vector3 trajPos = ball.pos;
                    
                    int dots = 28;
                    float step = 0.06f;
                    for (int i = 1; i <= dots; i++) {
                        float t = i * step;
                        Vector3 dotPos = {
                            trajPos.x + trajVel.x * t,
                            trajPos.y + trajVel.y * t + 0.5f * gravityY * t * t,
                            trajPos.z + trajVel.z * t
                        };
                        
                        if (dotPos.y < ball.radius) {
                            // Floor contact marker
                            dotPos.y = ball.radius;
                            DrawSphere(dotPos, 0.03f, ColorAlpha(LIME, 0.25f));
                            break;
                        }
                        
                        float alpha = 1.0f - ((float)i / dots);
                        DrawSphere(dotPos, 0.045f * alpha, ColorAlpha(GOLD, alpha * 0.75f));
                    }
                    
                    // Render held preview ball
                    DrawModelEx(ballModel, ball.pos, ball.spinAxis, ball.spinAngle * RAD2DEG, (Vector3){ 1.0f, 1.0f, 1.0f }, WHITE);
                }
                
                // Draw 3D particle systems
                for (int i = 0; i < MAX_PARTICLES; i++) {
                    if (particles[i].active) {
                        float pAlpha = 1.0f - (particles[i].life / particles[i].maxLife);
                        DrawSphere(particles[i].pos, particles[i].size, ColorAlpha(particles[i].color, pAlpha));
                    }
                }
                
            EndMode3D();
            
            // Restore Camera structure position post screen-shake offsets
            camera.position = finalCameraPos;
            camera.target = finalCameraTarget;
            
            // 2D UI Overlay Pass
            // Crosshair overlay
            if (cursorLocked) {
                DrawCircle(screenWidth / 2, screenHeight / 2, 4, ColorAlpha(GOLD, 0.6f));
                DrawCircleLines(screenWidth / 2, screenHeight / 2, 8, ColorAlpha(WHITE, 0.4f));
            }
            
            // Top Dashboard Glassmorphism Panel
            DrawGlassPanel(25, 25, 300, 115, "SCOREBOARD");
            DrawText(TextFormat("Score: %02d", score), 40, 75, 22, WHITE);
            DrawText(TextFormat("Streak: %d", streak), 180, 75, 20, (streak > 0) ? LIME : GRAY);
            DrawText(TextFormat("High Score: %02d", highScore), 40, 105, 16, GOLD);
            
            // Throw spot HUD selection panel
            DrawGlassPanel(screenWidth - 325, 25, 300, 165, "COURT SPOTS");
            for (int i = 0; i < numSpots; i++) {
                Color col = (currentSpot == i) ? GOLD : GRAY;
                DrawText(TextFormat("[%d] %s", i + 1, spots[i].name), screenWidth - 305, 75 + i * 24, 15, col);
            }
            
            // Bottom HUD controls helper panel
            DrawGlassPanel(25, screenHeight - 145, 420, 120, "CONTROLS");
            DrawText("Mouse: Aim Launcher Direction", 40, screenHeight - 105, 14, LIGHTGRAY);
            DrawText("Hold LMB / SPACE: Charge Power & Shot", 40, screenHeight - 87, 14, LIGHTGRAY);
            DrawText("Release to Shoot  |  R: Manual Reset Ball", 40, screenHeight - 69, 14, LIGHTGRAY);
            DrawText("TAB: Lock / Unlock Mouse Cursor", 40, screenHeight - 51, 14, (cursorLocked) ? LIME : ORANGE);
            
            // Power Charge Meter (bottom right side)
            if (charging) {
                int px = screenWidth - 325;
                int py = screenHeight - 75;
                int pw = 300;
                int ph = 35;
                
                // Charge panel background outline
                DrawRectangleRounded((Rectangle){ (float)px, (float)py, (float)pw, (float)ph }, 0.25f, 4, ColorAlpha(DARKGRAY, 0.7f));
                DrawRectangleRoundedLines((Rectangle){ (float)px, (float)py, (float)pw, (float)ph }, 0.25f, 4, WHITE);
                
                // Color gradient transitions: Yellow -> Orange -> Crimson Red based on strength
                Color chargeColor = LIME;
                if (charge > 0.4f) chargeColor = GOLD;
                if (charge > 0.75f) chargeColor = ORANGE;
                if (charge > 0.92f) chargeColor = RED;
                
                int fillWidth = (int)(charge * (pw - 8));
                if (fillWidth > 0) {
                    DrawRectangleRounded((Rectangle){ (float)px + 4, (float)py + 4, (float)fillWidth, (float)ph - 8 }, 0.2f, 4, chargeColor);
                }
                
                DrawText("POWER METER", px + 15, py - 22, 14, GOLD);
            }
            
            // Centered feedback text alerts ("SWISH!", "AIRBALL!")
            if (feedbackTimer > 0.0f) {
                float alpha = feedbackTimer / 1.8f;
                if (alpha > 1.0f) alpha = 1.0f;
                
                int fSize = (int)(32 * feedbackScale);
                int textWidth = MeasureText(feedbackText, fSize);
                
                // Draw backing shadow block
                DrawText(feedbackText, (screenWidth - textWidth) / 2 + 2, 220 + 2, fSize, ColorAlpha(BLACK, alpha * 0.8f));
                // Glowing feedback text
                DrawText(feedbackText, (screenWidth - textWidth) / 2, 220, fSize, ColorAlpha(feedbackColor, alpha));
            }
            
            // Instructions when cursor is unlocked
            if (!cursorLocked) {
                const char* lockMsg = "CURSOR UNLOCKED - CLICK SCREEN OR PRESS TAB TO AIM";
                int msgW = MeasureText(lockMsg, 20);
                DrawRectangle(0, screenHeight/2 - 30, screenWidth, 60, ColorAlpha(BLACK, 0.8f));
                DrawText(lockMsg, (screenWidth - msgW)/2, screenHeight/2 - 10, 20, GOLD);
            }
            
        EndDrawing();
    }
    
    // De-initialization
    UnloadModel(ballModel);
    UnloadTexture(basketballTex);
    UnloadTexture(courtTex);
    
    UnloadSound(fxBounce);
    UnloadSound(fxScore);
    UnloadSound(fxWhack);
    UnloadSound(fxCharge);
    
    CloseAudioDevice();
    CloseWindow();
    
    return 0;
}
