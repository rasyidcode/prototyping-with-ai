#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include "raylib.h"
#include "raymath.h"
#include "rlgl.h"
#include "types.h"

#define CYAN (Color){ 0, 255, 255, 255 }

// Game globals
GameState currentState = STATE_TITLE;
Camera3D camera = { 0 };
Vector3 cameraShakeOffset = { 0 };
float screenShakeIntensity = 0.0f;
float angerLevel = 100.0f; // 100% down to 0%
int heldObjectIndex = -1;
float throwPower = 0.0f;
bool isCharging = false;
float chargeSoundTimer = 0.0f;
float bobTimer = 0.0f;

// Entities
BreakableObject gameObjects[MAX_OBJECTS] = { 0 };
Debris debrisPool[MAX_DEBRIS] = { 0 };
int nextDebrisIndex = 0;
Decal decalPool[MAX_DECALS] = { 0 };
int nextDecalIndex = 0;
Particle particlePool[MAX_PARTICLES] = { 0 };
int nextParticleIndex = 0;
FloatingText floatingTexts[MAX_FLOATING_TEXTS] = { 0 };
int nextFloatingTextIndex = 0;

Furniture roomFurniture[MAX_FURNITURE] = { 0 };
int furnitureCount = 0;
SpawnSlot spawnSlots[MAX_SPAWN_SLOTS] = { 0 };
int spawnSlotCount = 0;

// Audio
Sound gameSounds[SND_COUNT] = { 0 };
Sound ambientDrone = { 0 };

// Statistics
int statsSmashedItems[OBJ_COUNT] = { 0 };
int statsTotalSmashed = 0;
float statsMaxThrowPower = 0.0f;

// Forward declarations
void InitGame(void);
void UpdateGame(float dt);
void DrawGame(void);
void UnloadGame(void);

void InitFurniture(void);
void InitSpawnSlots(void);
void SpawnObjectInSlot(int slotIndex);
void ResetRoom(void);
void PlayGameSound(SoundID id, float pitch, float volume);
Sound GenProceduralSound(int type);
Sound GenAmbientDrone(void);

void UpdateTitleScreen(float dt);
void UpdateGameplay(float dt);
void UpdateSummaryScreen(float dt);

void DrawTitleScreen(void);
void DrawGameplay(void);
void DrawSummaryScreen(void);

void DrawRoom3D(void);
void DrawBottleModel(Vector3 position, Quaternion rotation, float scale, Color baseCol, Color wireCol, bool drawWires);
void DrawPlateModel(Vector3 position, Quaternion rotation, float scale, Color baseCol, Color wireCol, bool drawWires);
void DrawMugModel(Vector3 position, Quaternion rotation, float scale, Color baseCol, Color wireCol, bool drawWires);
void DrawVaseModel(Vector3 position, Quaternion rotation, float scale, Color baseCol, Color wireCol, bool drawWires);
void DrawMonitorModel(Vector3 position, Quaternion rotation, float scale, Color baseCol, Color wireCol, bool drawWires);
void DrawObject(BreakableObject *obj, bool drawWires);

Vector3 GetHeldPosition(Camera3D cam);
Ray GetCameraRay(Camera3D cam);
int GetHoveredObject(Ray ray);
bool CheckObjectCollision(BreakableObject *obj, Vector3 *hitPoint, Vector3 *hitNormal);
void ShatterObject(BreakableObject *obj, Vector3 hitPoint, Vector3 hitNormal);
void SpawnDebris(Vector3 pos, Vector3 vel, Color col, float scale, int shape);
void SpawnDecal(Vector3 pos, Vector3 normal, Color col, float size);
void SpawnParticle(Vector3 pos, Vector3 vel, Color col, float size, float maxLife, bool isSpark);
void SpawnFloatingText(Vector3 pos3D, const char *text, Color col);

int main(void) {
    // Initialization
    const int screenWidth = 1280;
    const int screenHeight = 720;
    
    // Set configuration flags (VSync, MSAA 4x for clean wires)
    SetConfigFlags(FLAG_MSAA_4X_HINT | FLAG_VSYNC_HINT);
    InitWindow(screenWidth, screenHeight, "ANGER SHATTERROOM - Cyber Therapy");
    InitAudioDevice();
    SetTargetFPS(60);
    srand(time(NULL));

    InitGame();

    // Main game loop
    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        if (dt > 0.1f) dt = 0.1f; // Clamp delta to avoid physics explosions on lag spikes

        UpdateGame(dt);
        DrawGame();
    }

    // De-Initialization
    UnloadGame();
    CloseAudioDevice();
    CloseWindow();

    return 0;
}

// Generates procedural sound effect buffers using simple synth algorithms
Sound GenProceduralSound(int type) {
    int sampleRate = 44100;
    float duration = 0.0f;
    
    switch (type) {
        case 0: duration = 0.15f; break; // Pick up
        case 1: duration = 0.25f; break; // Throw
        case 2: duration = 0.5f;  break; // Glass shatter
        case 3: duration = 0.6f;  break; // Ceramic smash
        case 4: duration = 0.9f;  break; // CRT TV Boom
        case 5: duration = 0.4f;  break; // Spawn item pop
        case 6: duration = 1.2f;  break; // Calm success chime
        default: duration = 0.5f; break;
    }
    
    int sampleCount = sampleRate * duration;
    short *data = (short *)RL_MALLOC(sampleCount * sizeof(short));
    
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleRate;
        float progress = (float)i / sampleCount;
        float envelope = 1.0f;
        float val = 0.0f;
        
        switch (type) {
            case 0: // Pick up: short low-to-high pitch sine sweep
                envelope = expf(-18.0f * t);
                float freqPick = 280.0f + progress * 450.0f;
                val = sinf(2.0f * PI * freqPick * t);
                break;
            case 1: // Throw whoosh: filtered noise and frequency sweep
                envelope = expf(-12.0f * t);
                float noiseVal = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
                float whooshFreq = 600.0f * (1.0f - progress);
                val = sinf(2.0f * PI * whooshFreq * t) * 0.4f + noiseVal * 0.6f;
                break;
            case 2: // Glass shatter: high-freq metallic sines + white noise
                envelope = expf(-6.0f * progress);
                float clink1 = sinf(2.0f * PI * 2200.0f * t);
                float clink2 = sinf(2.0f * PI * 3400.0f * t);
                float clink3 = sinf(2.0f * PI * 4900.0f * t);
                float glassNoise = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
                val = (clink1 * 0.35f + clink2 * 0.2f + clink3 * 0.1f + glassNoise * 0.35f);
                break;
            case 3: // Ceramic smash: lower clang frequency + heavy noise
                envelope = expf(-7.5f * progress);
                float clang1 = sinf(2.0f * PI * 650.0f * t);
                float clang2 = sinf(2.0f * PI * 1100.0f * t);
                float ceramicNoise = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
                val = (clang1 * 0.25f + clang2 * 0.15f + ceramicNoise * 0.6f);
                break;
            case 4: // TV Monitor Boom: low bass sine sweep + electric crackle
                envelope = expf(-4.5f * progress);
                float bass = sinf(2.0f * PI * (75.0f - 55.0f * progress) * t);
                float monitorNoise = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
                float spark = 0.0f;
                if (rand() % 100 < 8) spark = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
                val = (bass * 0.55f + monitorNoise * 0.35f + spark * 0.1f);
                break;
            case 5: // Spawn pop: bubble pop synth
                envelope = expf(-14.0f * progress);
                float spawnFreq = 500.0f - progress * 250.0f;
                val = sinf(2.0f * PI * spawnFreq * t) * 0.5f + sinf(2.0f * PI * (spawnFreq * 2.0f) * t) * 0.2f;
                break;
            case 6: // Calm success chime: major chord arpeggio
                envelope = expf(-2.5f * progress);
                float chime = 0.0f;
                // Chord notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
                chime += sinf(2.0f * PI * 523.25f * t) * 0.3f;
                if (progress > 0.12f) chime += sinf(2.0f * PI * 659.25f * (t - 0.12f)) * 0.25f;
                if (progress > 0.24f) chime += sinf(2.0f * PI * 783.99f * (t - 0.24f)) * 0.25f;
                if (progress > 0.36f) chime += sinf(2.0f * PI * 1046.50f * (t - 0.36f)) * 0.2f;
                val = chime;
                break;
        }
        
        data[i] = (short)(val * envelope * 24000.0f);
    }
    
    Wave wave = {
        .frameCount = sampleCount,
        .sampleRate = sampleRate,
        .sampleSize = 16,
        .channels = 1,
        .data = data
    };
    
    Sound sound = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return sound;
}

// Low frequency ambient drone loop
Sound GenAmbientDrone(void) {
    int sampleRate = 44100;
    float duration = 4.0f;
    int sampleCount = sampleRate * duration;
    short *data = (short *)RL_MALLOC(sampleCount * sizeof(short));
    
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleRate;
        // Detuned sub-bass sine waves for an industrial clinic room vibe
        float val = sinf(2.0f * PI * 60.0f * t) * 0.5f + sinf(2.0f * PI * 60.3f * t) * 0.3f;
        
        // Add low-level analog tape hiss/noise
        float noise = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
        val += noise * 0.04f;
        
        data[i] = (short)(val * 12000.0f);
    }
    
    Wave wave = {
        .frameCount = sampleCount,
        .sampleRate = sampleRate,
        .sampleSize = 16,
        .channels = 1,
        .data = data
    };
    
    Sound sound = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return sound;
}

void InitGame(void) {
    // Generate procedural sounds
    for (int i = 0; i < SND_COUNT; i++) {
        gameSounds[i] = GenProceduralSound(i);
    }
    ambientDrone = GenAmbientDrone();

    // Start ambient music/drone loop
    PlaySound(ambientDrone);

    // Camera setup
    camera.position = (Vector3){ 0.0f, 1.8f, 7.0f };
    camera.target = (Vector3){ 0.0f, 1.8f, 0.0f };
    camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.fovy = 65.0f;
    camera.projection = CAMERA_PERSPECTIVE;

    InitFurniture();
    InitSpawnSlots();
    ResetRoom();
    
    angerLevel = 100.0f;
    heldObjectIndex = -1;
    throwPower = 0.0f;
    isCharging = false;
    screenShakeIntensity = 0.0f;
    
    // Clear stats
    for (int i = 0; i < OBJ_COUNT; i++) statsSmashedItems[i] = 0;
    statsTotalSmashed = 0;
    statsMaxThrowPower = 0.0f;
}

void InitFurniture(void) {
    furnitureCount = 0;
    
    // Center-left table
    roomFurniture[furnitureCount++] = (Furniture){
        .box = (BoundingBox){ (Vector3){ -4.2f, 0.0f, -2.5f }, (Vector3){ -1.8f, 0.8f, -1.3f } },
        .color = (Color){ 16, 16, 20, 255 },
        .wireColor = ORANGE,
        .name = "Left Table"
    };
    
    // Center-right table
    roomFurniture[furnitureCount++] = (Furniture){
        .box = (BoundingBox){ (Vector3){ 1.8f, 0.0f, -2.5f }, (Vector3){ 4.2f, 0.8f, -1.3f } },
        .color = (Color){ 16, 16, 20, 255 },
        .wireColor = ORANGE,
        .name = "Right Table"
    };
    
    // Left wall shelf
    roomFurniture[furnitureCount++] = (Furniture){
        .box = (BoundingBox){ (Vector3){ -9.8f, 1.2f, -3.0f }, (Vector3){ -9.0f, 1.3f, 3.0f } },
        .color = (Color){ 16, 16, 20, 255 },
        .wireColor = MAGENTA,
        .name = "Left Shelf"
    };
    
    // Right wall shelf
    roomFurniture[furnitureCount++] = (Furniture){
        .box = (BoundingBox){ (Vector3){ 9.0f, 1.2f, -3.0f }, (Vector3){ 9.8f, 1.3f, 3.0f } },
        .color = (Color){ 16, 16, 20, 255 },
        .wireColor = MAGENTA,
        .name = "Right Shelf"
    };
    
    // Back wall TV console
    roomFurniture[furnitureCount++] = (Furniture){
        .box = (BoundingBox){ (Vector3){ -3.0f, 0.0f, -9.5f }, (Vector3){ 3.0f, 0.6f, -7.5f } },
        .color = (Color){ 16, 16, 20, 255 },
        .wireColor = CYAN,
        .name = "Back Console"
    };
    
    // Corner wooden crates
    roomFurniture[furnitureCount++] = (Furniture){
        .box = (BoundingBox){ (Vector3){ -8.2f, 0.0f, -8.2f }, (Vector3){ -7.0f, 0.8f, -7.0f } },
        .color = (Color){ 20, 18, 16, 255 },
        .wireColor = LIME,
        .name = "Left Crate"
    };
    
    roomFurniture[furnitureCount++] = (Furniture){
        .box = (BoundingBox){ (Vector3){ 7.0f, 0.0f, -8.2f }, (Vector3){ 8.2f, 0.8f, -7.0f } },
        .color = (Color){ 20, 18, 16, 255 },
        .wireColor = LIME,
        .name = "Right Crate"
    };
}

void InitSpawnSlots(void) {
    spawnSlotCount = 0;
    
    // Left Table Slots (Bottles & Plates)
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ -3.6f, 0.8f, -1.9f }, -1, 0.0f, OBJ_BOTTLE, 0.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ -3.0f, 0.8f, -1.9f }, -1, 0.0f, OBJ_MUG, 40.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ -2.4f, 0.8f, -1.9f }, -1, 0.0f, OBJ_PLATE, 0.0f };
    
    // Right Table Slots
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ 2.4f, 0.8f, -1.9f }, -1, 0.0f, OBJ_PLATE, 90.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ 3.0f, 0.8f, -1.9f }, -1, 0.0f, OBJ_MUG, -50.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ 3.6f, 0.8f, -1.9f }, -1, 0.0f, OBJ_BOTTLE, 180.0f };
    
    // Left Shelf Slots (Assorted)
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ -9.4f, 1.3f, -2.0f }, -1, 0.0f, OBJ_BOTTLE, -90.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ -9.4f, 1.3f, -0.7f }, -1, 0.0f, OBJ_MUG, 10.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ -9.4f, 1.3f, 0.7f }, -1, 0.0f, OBJ_VADO, 15.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ -9.4f, 1.3f, 2.0f }, -1, 0.0f, OBJ_PLATE, 0.0f };
    
    // Right Shelf Slots
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ 9.4f, 1.3f, -2.0f }, -1, 0.0f, OBJ_PLATE, 0.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ 9.4f, 1.3f, -0.7f }, -1, 0.0f, OBJ_VADO, -80.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ 9.4f, 1.3f, 0.7f }, -1, 0.0f, OBJ_MUG, -110.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ 9.4f, 1.3f, 2.0f }, -1, 0.0f, OBJ_BOTTLE, 45.0f };
    
    // Back Console (Heavy CRT monitors & Vases)
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ -1.8f, 0.6f, -8.5f }, -1, 0.0f, OBJ_MONITOR, 0.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ 1.8f, 0.6f, -8.5f }, -1, 0.0f, OBJ_MONITOR, 180.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ 0.0f, 0.6f, -8.5f }, -1, 0.0f, OBJ_VADO, -45.0f };
    
    // Corner Crates Clutter
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ -7.6f, 0.8f, -7.6f }, -1, 0.0f, OBJ_BOTTLE, 60.0f };
    spawnSlots[spawnSlotCount++] = (SpawnSlot){ (Vector3){ 7.6f, 0.8f, -7.6f }, -1, 0.0f, OBJ_VADO, -135.0f };
}

void SpawnObjectInSlot(int slotIndex) {
    if (slotIndex < 0 || slotIndex >= spawnSlotCount) return;
    
    // Find free object in the pool
    int objIndex = -1;
    for (int i = 0; i < MAX_OBJECTS; i++) {
        if (!gameObjects[i].isActive) {
            objIndex = i;
            break;
        }
    }
    
    if (objIndex == -1) return; // Pool full
    
    ObjectType type = spawnSlots[slotIndex].preferredType;
    
    float scale = 1.0f;
    Color baseCol = WHITE;
    Color wireCol = RED;
    float angerVal = 5.0f;
    
    switch (type) {
        case OBJ_BOTTLE:
            scale = 1.0f;
            baseCol = (Color){ 20, 70, 35, 255 }; // glass green
            wireCol = (Color){ 0, 255, 127, 255 }; // neon spring green
            angerVal = 6.0f;
            break;
        case OBJ_PLATE:
            scale = 1.0f;
            baseCol = (Color){ 200, 200, 205, 255 }; // ceramic white
            wireCol = (Color){ 255, 200, 0, 255 }; // neon gold
            angerVal = 4.0f;
            break;
        case OBJ_MUG:
            scale = 0.95f;
            baseCol = (Color){ 130, 35, 25, 255 }; // maroon mug
            wireCol = (Color){ 255, 20, 147, 255 }; // neon deep pink
            angerVal = 5.0f;
            break;
        case OBJ_VADO:
            scale = 1.15f;
            baseCol = (Color){ 55, 20, 75, 255 }; // deep violet
            wireCol = (Color){ 186, 85, 211, 255 }; // neon medium orchid
            angerVal = 10.0f;
            break;
        case OBJ_MONITOR:
            scale = 1.0f;
            baseCol = (Color){ 28, 28, 33, 255 }; // dark plastic
            wireCol = (Color){ 0, 191, 255, 255 }; // neon deep sky blue
            angerVal = 22.0f;
            break;
        default: break;
    }
    
    Vector3 pos = spawnSlots[slotIndex].position;
    
    gameObjects[objIndex] = (BreakableObject){
        .type = type,
        .position = pos,
        .velocity = (Vector3){ 0, 0, 0 },
        .rotation = QuaternionFromEuler(0.0f, spawnSlots[slotIndex].rotationY * DEG2RAD, 0.0f),
        .angularVelocity = (Vector3){ 0, 0, 0 },
        .isHeld = false,
        .isThrown = false,
        .isActive = true,
        .scale = scale,
        .color = baseCol,
        .wireColor = wireCol,
        .angerValue = angerVal
    };
    
    spawnSlots[slotIndex].objectIndex = objIndex;
}

void ResetRoom(void) {
    // Deactivate all objects, debris, particles, decals, and text
    for (int i = 0; i < MAX_OBJECTS; i++) gameObjects[i].isActive = false;
    for (int i = 0; i < MAX_DEBRIS; i++) debrisPool[i].active = false;
    for (int i = 0; i < MAX_DECALS; i++) decalPool[i].active = false;
    for (int i = 0; i < MAX_PARTICLES; i++) particlePool[i].active = false;
    for (int i = 0; i < MAX_FLOATING_TEXTS; i++) floatingTexts[i].active = false;
    
    // Spawn initial items at all slots
    for (int i = 0; i < spawnSlotCount; i++) {
        spawnSlots[i].objectIndex = -1;
        spawnSlots[i].respawnTimer = 0.0f;
        SpawnObjectInSlot(i);
    }
}

void PlayGameSound(SoundID id, float pitch, float volume) {
    if (id < 0 || id >= SND_COUNT) return;
    SetSoundPitch(gameSounds[id], pitch);
    SetSoundVolume(gameSounds[id], volume);
    PlaySound(gameSounds[id]);
}

void UpdateGame(float dt) {
    // Keep ambient loop playing
    if (!IsSoundPlaying(ambientDrone)) {
        PlaySound(ambientDrone);
    }

    switch (currentState) {
        case STATE_TITLE:
            UpdateTitleScreen(dt);
            break;
        case STATE_GAMEPLAY:
            UpdateGameplay(dt);
            break;
        case STATE_SUMMARY:
            UpdateSummaryScreen(dt);
            break;
    }
}

void UpdateTitleScreen(float dt) {
    // Slow camera orbit of the neon chamber for cinematic styling
    float time = GetTime() * 0.15f;
    camera.position.x = sinf(time) * 8.5f;
    camera.position.z = cosf(time) * 8.5f;
    camera.position.y = 3.5f;
    camera.target = (Vector3){ 0.0f, 0.8f, 0.0f };

    // Update aesthetic particles floating on the title screen
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particlePool[i].active) {
            // Spawn random slow ambient particles occasionally
            if (GetRandomValue(0, 100) < 5) {
                Vector3 pPos = {
                    (GetRandomValue(-100, 100)/10.0f),
                    (GetRandomValue(0, 80)/10.0f),
                    (GetRandomValue(-100, 100)/10.0f)
                };
                Vector3 pVel = {
                    (GetRandomValue(-10, 10)/100.0f),
                    (GetRandomValue(5, 15)/100.0f),
                    (GetRandomValue(-10, 10)/100.0f)
                };
                Color col = (GetRandomValue(0, 1) == 0) ? CYAN : MAGENTA;
                SpawnParticle(pPos, pVel, col, 0.06f, (float)GetRandomValue(3, 6), true);
            }
            continue;
        }
        
        particlePool[i].position = Vector3Add(particlePool[i].position, Vector3Scale(particlePool[i].velocity, dt));
        particlePool[i].life += dt;
        if (particlePool[i].life >= particlePool[i].maxLife) {
            particlePool[i].active = false;
        }
    }

    if (IsKeyPressed(KEY_ENTER)) {
        InitGame();
        currentState = STATE_GAMEPLAY;
        PlayGameSound(SND_PICKUP, 1.0f, 1.0f);
        DisableCursor(); // Lock mouse to screen
    }
}

void UpdateGameplay(float dt) {
    // Handle camera shake decay
    if (screenShakeIntensity > 0.0f) {
        cameraShakeOffset.x = (GetRandomValue(-100, 100) / 100.0f) * screenShakeIntensity;
        cameraShakeOffset.y = (GetRandomValue(-100, 100) / 100.0f) * screenShakeIntensity;
        cameraShakeOffset.z = (GetRandomValue(-100, 100) / 100.0f) * screenShakeIntensity;
        screenShakeIntensity -= dt * 2.8f;
        if (screenShakeIntensity < 0.0f) screenShakeIntensity = 0.0f;
    } else {
        cameraShakeOffset = (Vector3){ 0, 0, 0 };
    }

    // Save previous camera position for collision resolution
    Vector3 oldPos = camera.position;

    // Update first person camera controls (handles keyboard and mouse view)
    UpdateCamera(&camera, CAMERA_FIRST_PERSON);

    // Apply head bobbing
    bool isMoving = (IsKeyDown(KEY_W) || IsKeyDown(KEY_S) || IsKeyDown(KEY_A) || IsKeyDown(KEY_D));
    if (isMoving) {
        bobTimer += dt * 11.0f;
        float bobOffset = sinf(bobTimer) * 0.04f; // 4cm bob
        camera.position.y = 1.8f + bobOffset;
    } else {
        camera.position.y = camera.position.y + (1.8f - camera.position.y) * 0.15f;
    }

    // Resolve player collisions with room walls
    bool playerCollided = false;
    const float wallBound = 9.4f;
    if (camera.position.x < -wallBound) { camera.position.x = -wallBound; playerCollided = true; }
    if (camera.position.x > wallBound)  { camera.position.x = wallBound;  playerCollided = true; }
    if (camera.position.z < -wallBound) { camera.position.z = -wallBound; playerCollided = true; }
    if (camera.position.z > wallBound)  { camera.position.z = wallBound;  playerCollided = true; }

    // Resolve player collisions with furniture bounding boxes
    BoundingBox playerBox = {
        (Vector3){ camera.position.x - 0.35f, 0.0f, camera.position.z - 0.35f },
        (Vector3){ camera.position.x + 0.35f, 1.8f, camera.position.z + 0.35f }
    };
    for (int i = 0; i < furnitureCount; i++) {
        if (CheckCollisionBoxes(playerBox, roomFurniture[i].box)) {
            playerCollided = true;
            break;
        }
    }

    if (playerCollided) {
        // Revert position translation, preserving rotation
        Vector3 delta = Vector3Subtract(camera.position, oldPos);
        camera.position = oldPos;
        camera.target = Vector3Subtract(camera.target, delta);
    }

    // Restock spawn slots
    for (int i = 0; i < spawnSlotCount; i++) {
        if (spawnSlots[i].objectIndex == -1) {
            spawnSlots[i].respawnTimer += dt;
            if (spawnSlots[i].respawnTimer >= 5.0f) { // 5-second respawn delay
                SpawnObjectInSlot(i);
                spawnSlots[i].respawnTimer = 0.0f;
                // Puff spawn particles
                Vector3 puffPos = spawnSlots[i].position;
                puffPos.y += 0.2f;
                PlayGameSound(SND_SPAWN, 1.0f, 0.5f);
                for (int p = 0; p < 8; p++) {
                    Vector3 pVel = {
                        (GetRandomValue(-10, 10)/20.0f),
                        (GetRandomValue(5, 20)/20.0f),
                        (GetRandomValue(-10, 10)/20.0f)
                    };
                    SpawnParticle(puffPos, pVel, CYAN, 0.05f, 0.6f, false);
                }
            }
        } else {
            // Double check if slots item became inactive without being picked up
            int objIdx = spawnSlots[i].objectIndex;
            if (!gameObjects[objIdx].isActive || gameObjects[objIdx].isHeld || gameObjects[objIdx].isThrown) {
                spawnSlots[i].objectIndex = -1;
                spawnSlots[i].respawnTimer = 0.0f;
            }
        }
    }

    // Raycast from camera center to find hover items
    Ray ray = GetCameraRay(camera);
    int hoveredIdx = GetHoveredObject(ray);

    // Pick Up Item Mechanic
    if (heldObjectIndex == -1) {
        if (hoveredIdx != -1 && (IsKeyPressed(KEY_E) || IsMouseButtonPressed(MOUSE_BUTTON_RIGHT))) {
            heldObjectIndex = hoveredIdx;
            gameObjects[heldObjectIndex].isHeld = true;
            gameObjects[heldObjectIndex].isThrown = false;
            PlayGameSound(SND_PICKUP, 1.0f, 0.8f);
            
            // Clear spawn slot association
            for (int s = 0; s < spawnSlotCount; s++) {
                if (spawnSlots[s].objectIndex == heldObjectIndex) {
                    spawnSlots[s].objectIndex = -1;
                    spawnSlots[s].respawnTimer = 0.0f;
                    break;
                }
            }
        }
    } else {
        // Holding item
        BreakableObject *heldObj = &gameObjects[heldObjectIndex];
        
        // Position held object in front of the camera (lower right viewport)
        heldObj->position = GetHeldPosition(camera);
        
        // Match rotation to camera with slight tilt
        Vector3 camDir = Vector3Normalize(Vector3Subtract(camera.target, camera.position));
        float yaw = atan2f(camDir.x, camDir.z);
        heldObj->rotation = QuaternionFromEuler(15.0f * DEG2RAD, yaw + 20.0f * DEG2RAD, -5.0f * DEG2RAD);
        
        // Throw power charging
        if (IsMouseButtonDown(MOUSE_BUTTON_LEFT)) {
            isCharging = true;
            throwPower += dt / 1.0f; // 1 second to fully charge
            if (throwPower > 1.0f) throwPower = 1.0f;
            
            // Retro mechanical charge beep ticking
            chargeSoundTimer -= dt;
            if (chargeSoundTimer <= 0.0f) {
                float pitch = 1.0f + throwPower * 1.4f; // 1.0 -> 2.4 pitch
                PlayGameSound(SND_SPAWN, pitch, 0.2f + throwPower * 0.1f);
                chargeSoundTimer = 0.16f - throwPower * 0.09f; // Ticks accelerate!
            }
            
            // Add a rattle shake to the held item reflecting charging energy
            float rattle = throwPower * throwPower * 0.04f;
            Vector3 rattleOffset = {
                (GetRandomValue(-100,100)/100.0f) * rattle,
                (GetRandomValue(-100,100)/100.0f) * rattle,
                (GetRandomValue(-100,100)/100.0f) * rattle
            };
            heldObj->position = Vector3Add(heldObj->position, rattleOffset);
        }
        
        // Release Throw
        if (isCharging && IsMouseButtonReleased(MOUSE_BUTTON_LEFT)) {
            isCharging = false;
            heldObj->isHeld = false;
            heldObj->isThrown = true;
            
            Vector3 forwardVec = Vector3Normalize(Vector3Subtract(camera.target, camera.position));
            heldObj->position = Vector3Add(camera.position, Vector3Scale(forwardVec, 0.4f)); // start slightly forward
            
            // Velocity scales based on throw power
            float throwVel = 6.0f + throwPower * 26.0f;
            heldObj->velocity = Vector3Scale(forwardVec, throwVel);
            
            // Add random spinning velocities
            heldObj->angularVelocity = (Vector3){
                (float)GetRandomValue(-360, 360),
                (float)GetRandomValue(-360, 360),
                (float)GetRandomValue(-360, 360)
            };
            
            PlayGameSound(SND_THROW, 0.9f + throwPower * 0.2f, 0.9f);
            
            if (throwPower > statsMaxThrowPower) {
                statsMaxThrowPower = throwPower;
            }
            
            heldObjectIndex = -1;
            throwPower = 0.0f;
        }
        
        // Drop item gently (without throwing)
        if (!isCharging && (IsKeyPressed(KEY_Q) || IsKeyPressed(KEY_E) || IsMouseButtonPressed(MOUSE_BUTTON_RIGHT))) {
            heldObj->isHeld = false;
            heldObj->isThrown = true;
            Vector3 forwardVec = Vector3Normalize(Vector3Subtract(camera.target, camera.position));
            heldObj->velocity = Vector3Scale(forwardVec, 2.5f); // tiny push forward
            heldObj->angularVelocity = (Vector3){ (float)GetRandomValue(-90,90), (float)GetRandomValue(-90,90), 0 };
            heldObjectIndex = -1;
            throwPower = 0.0f;
            PlayGameSound(SND_THROW, 0.7f, 0.4f);
        }
    }

    // Update active thrown objects (Physics & Collision)
    for (int i = 0; i < MAX_OBJECTS; i++) {
        if (!gameObjects[i].isActive || gameObjects[i].isHeld || !gameObjects[i].isThrown) continue;
        
        // Apply gravity
        gameObjects[i].velocity.y -= 9.8f * dt;
        
        // Update position
        gameObjects[i].position = Vector3Add(gameObjects[i].position, Vector3Scale(gameObjects[i].velocity, dt));
        
        // Update rotation from angular velocity
        Vector3 rotDelta = Vector3Scale(gameObjects[i].angularVelocity, dt);
        Quaternion deltaRot = QuaternionFromEuler(rotDelta.x * DEG2RAD, rotDelta.y * DEG2RAD, rotDelta.z * DEG2RAD);
        gameObjects[i].rotation = QuaternionMultiply(deltaRot, gameObjects[i].rotation);
        
        // Check collision against walls, floor, ceiling, and furniture
        Vector3 hitPoint, hitNormal;
        if (CheckObjectCollision(&gameObjects[i], &hitPoint, &hitNormal)) {
            ShatterObject(&gameObjects[i], hitPoint, hitNormal);
        }
    }

    // Update Debris physical pieces
    for (int i = 0; i < MAX_DEBRIS; i++) {
        if (!debrisPool[i].active) continue;
        
        // Gravity
        debrisPool[i].velocity.y -= 9.8f * dt;
        
        // Position update
        debrisPool[i].position = Vector3Add(debrisPool[i].position, Vector3Scale(debrisPool[i].velocity, dt));
        
        // Rotation update
        Vector3 rDelta = Vector3Scale(debrisPool[i].angularVelocity, dt);
        Quaternion dRot = QuaternionFromEuler(rDelta.x * DEG2RAD, rDelta.y * DEG2RAD, rDelta.z * DEG2RAD);
        debrisPool[i].rotation = QuaternionMultiply(dRot, debrisPool[i].rotation);
        
        // Restitution bounce & friction physics on floor
        if (debrisPool[i].position.y <= 0.03f) {
            debrisPool[i].position.y = 0.03f;
            debrisPool[i].velocity.y = -debrisPool[i].velocity.y * 0.45f; // lose energy vertically
            debrisPool[i].velocity.x *= 0.75f; // slide friction
            debrisPool[i].velocity.z *= 0.75f;
            // damp spin on hit
            debrisPool[i].angularVelocity = Vector3Scale(debrisPool[i].angularVelocity, 0.6f);
        }
        
        // Bounce on walls
        if (debrisPool[i].position.x <= -9.9f) { debrisPool[i].position.x = -9.9f; debrisPool[i].velocity.x = -debrisPool[i].velocity.x * 0.4f; }
        if (debrisPool[i].position.x >=  9.9f) { debrisPool[i].position.x =  9.9f; debrisPool[i].velocity.x = -debrisPool[i].velocity.x * 0.4f; }
        if (debrisPool[i].position.z <= -9.9f) { debrisPool[i].position.z = -9.9f; debrisPool[i].velocity.z = -debrisPool[i].velocity.z * 0.4f; }
        if (debrisPool[i].position.z >=  9.9f) { debrisPool[i].position.z =  9.9f; debrisPool[i].velocity.z = -debrisPool[i].velocity.z * 0.4f; }
        
        // Decay lifetime
        debrisPool[i].life += dt;
        if (debrisPool[i].life >= debrisPool[i].maxLife) {
            debrisPool[i].active = false;
        }
    }

    // Update splash/spark particles (no bounce, simple linear path + gravity)
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particlePool[i].active) continue;
        
        if (!particlePool[i].isSpark) {
            particlePool[i].velocity.y -= 5.0f * dt; // gravity for liquid splash drops
        }
        
        particlePool[i].position = Vector3Add(particlePool[i].position, Vector3Scale(particlePool[i].velocity, dt));
        particlePool[i].life += dt;
        
        if (particlePool[i].life >= particlePool[i].maxLife) {
            particlePool[i].active = false;
        }
    }

    // Update Floating text effects
    for (int i = 0; i < MAX_FLOATING_TEXTS; i++) {
        if (!floatingTexts[i].active) continue;
        floatingTexts[i].life += dt;
        if (floatingTexts[i].life >= floatingTexts[i].maxLife) {
            floatingTexts[i].active = false;
        }
    }

    // Manual room reset command
    if (IsKeyPressed(KEY_R)) {
        ResetRoom();
        PlayGameSound(SND_PICKUP, 1.2f, 0.7f);
        SpawnFloatingText((Vector3){0, 1.5f, 0}, "ROOM RESTOCKED!", ORANGE);
    }

    // Check game success condition (Anger fully released)
    if (angerLevel <= 0.0f) {
        angerLevel = 0.0f;
        currentState = STATE_SUMMARY;
        PlayGameSound(SND_CALM_SUCCESS, 1.0f, 1.0f);
        EnableCursor(); // Release mouse lock
    }
}

void UpdateSummaryScreen(float dt) {
    // Keep camera slow panning over details
    float time = GetTime() * 0.08f;
    camera.position.x = sinf(time) * 9.0f;
    camera.position.z = cosf(time) * 9.0f;
    camera.position.y = 4.0f;
    camera.target = (Vector3){ 0.0f, 0.5f, 0.0f };

    // Update soothing sparkles floating upwards
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particlePool[i].active) {
            if (GetRandomValue(0, 100) < 4) {
                Vector3 pPos = { (GetRandomValue(-100, 100)/10.0f), -0.5f, (GetRandomValue(-100, 100)/10.0f) };
                Vector3 pVel = { 0.0f, (GetRandomValue(8, 18)/10.0f), 0.0f };
                SpawnParticle(pPos, pVel, (GetRandomValue(0, 1) == 0) ? GREEN : LIME, 0.07f, (float)GetRandomValue(4, 7), true);
            }
            continue;
        }
        particlePool[i].position = Vector3Add(particlePool[i].position, Vector3Scale(particlePool[i].velocity, dt));
        particlePool[i].life += dt;
        if (particlePool[i].life >= particlePool[i].maxLife) {
            particlePool[i].active = false;
        }
    }

    if (IsKeyPressed(KEY_ENTER)) {
        InitGame();
        currentState = STATE_GAMEPLAY;
        PlayGameSound(SND_PICKUP, 1.0f, 1.0f);
        DisableCursor();
    }
}

// Ray-Sphere collision intersection helper
bool CheckObjectCollision(BreakableObject *obj, Vector3 *hitPoint, Vector3 *hitNormal) {
    // Floor collision
    if (obj->position.y <= 0.0f) {
        *hitPoint = (Vector3){ obj->position.x, 0.0f, obj->position.z };
        *hitNormal = (Vector3){ 0.0f, 1.0f, 0.0f };
        return true;
    }
    // Ceiling collision
    if (obj->position.y >= ROOM_HEIGHT) {
        *hitPoint = (Vector3){ obj->position.x, ROOM_HEIGHT, obj->position.z };
        *hitNormal = (Vector3){ 0.0f, -1.0f, 0.0f };
        return true;
    }
    // Walls collision
    const float w = ROOM_WIDTH / 2.0f;
    const float d = ROOM_DEPTH / 2.0f;
    
    if (obj->position.x <= -w) { *hitPoint = (Vector3){ -w, obj->position.y, obj->position.z }; *hitNormal = (Vector3){ 1.0f, 0.0f, 0.0f }; return true; }
    if (obj->position.x >=  w) { *hitPoint = (Vector3){  w, obj->position.y, obj->position.z }; *hitNormal = (Vector3){ -1.0f, 0.0f, 0.0f }; return true; }
    if (obj->position.z <= -d) { *hitPoint = (Vector3){ obj->position.x, obj->position.y, -d }; *hitNormal = (Vector3){ 0.0f, 0.0f, 1.0f }; return true; }
    if (obj->position.z >=  d) { *hitPoint = (Vector3){ obj->position.x, obj->position.y,  d }; *hitNormal = (Vector3){ 0.0f, 0.0f, -1.0f }; return true; }

    // Furniture collision (AABB vs Object Sphere/Box approximation)
    BoundingBox objBox = {
        Vector3Subtract(obj->position, (Vector3){ 0.18f, 0.18f, 0.18f }),
        Vector3Add(obj->position, (Vector3){ 0.18f, 0.18f, 0.18f })
    };

    for (int i = 0; i < furnitureCount; i++) {
        if (CheckCollisionBoxes(objBox, roomFurniture[i].box)) {
            // Pick normal opposite of object velocity direction
            *hitPoint = obj->position;
            *hitNormal = Vector3Negate(Vector3Normalize(obj->velocity));
            return true;
        }
    }

    return false;
}

void ShatterObject(BreakableObject *obj, Vector3 hitPoint, Vector3 hitNormal) {
    float speed = Vector3Length(obj->velocity);
    
    // Calculate throwing power factor from velocity: minimum drop (2.0) to max (32.0)
    float powerFactor = Clamp((speed - 2.5f) / 28.0f, 0.0f, 1.0f);
    
    // Visual juice triggers
    screenShakeIntensity += 0.08f + powerFactor * 0.42f;
    if (screenShakeIntensity > 0.85f) screenShakeIntensity = 0.85f;
    
    // Reduce player anger based on item and throwing force!
    float angerLoss = obj->angerValue * (1.0f + powerFactor * 1.5f);
    angerLevel -= angerLoss;
    
    // Choose impact word
    const char *smashWord = "TINK!";
    if (powerFactor < 0.15f) {
        smashWord = (obj->type == OBJ_PLATE || obj->type == OBJ_MUG) ? "CLACK!" : "TINK!";
    } else if (powerFactor < 0.45f) {
        smashWord = "CRACK!";
    } else if (powerFactor < 0.75f) {
        smashWord = "SMASH!";
    } else {
        smashWord = (obj->type == OBJ_MONITOR) ? "BOOM!" : "SHATTERED!";
    }
    
    char floatingMsg[48];
    sprintf(floatingMsg, "%s (-%d%%)", smashWord, (int)angerLoss);
    SpawnFloatingText(hitPoint, floatingMsg, obj->wireColor);

    // Audio triggers
    if (obj->type == OBJ_MONITOR) {
        PlayGameSound(SND_SHATTER_MONITOR, 0.85f + (1.0f - powerFactor)*0.2f, 0.9f + powerFactor*0.1f);
    } else if (obj->type == OBJ_PLATE) {
        PlayGameSound(SND_SHATTER_CERAMIC, 0.95f + (1.0f - powerFactor)*0.15f, 0.7f + powerFactor*0.3f);
    } else {
        PlayGameSound(SND_SHATTER_GLASS, 0.95f + (1.0f - powerFactor)*0.2f, 0.7f + powerFactor*0.3f);
    }

    // Debris generation: piece count escalates exponentially with throwing power!
    int basePiecesCount = 4;
    int maxPiecesCount = 10;
    if (obj->type == OBJ_MONITOR) { basePiecesCount = 12; maxPiecesCount = 28; }
    else if (obj->type == OBJ_VADO) { basePiecesCount = 8; maxPiecesCount = 18; }
    
    int pieces = basePiecesCount + (int)(powerFactor * maxPiecesCount);
    
    // Spawn shards/debris
    for (int p = 0; p < pieces; p++) {
        // Offset starting position slightly out from wall surface to avoid geometry clipping
        Vector3 spawnPos = Vector3Add(hitPoint, Vector3Scale(hitNormal, 0.08f));
        
        // Velocity: reflect velocity off normal + randomize directions
        Vector3 reflected = Vector3Reflect(obj->velocity, hitNormal);
        Vector3 bounceVel = Vector3Scale(reflected, 0.35f); // bounce bounce
        
        Vector3 scatter = {
            (GetRandomValue(-100, 100) / 100.0f) * (1.5f + powerFactor * 6.5f),
            (GetRandomValue(-10, 100) / 100.0f) * (1.5f + powerFactor * 6.5f),
            (GetRandomValue(-100, 100) / 100.0f) * (1.5f + powerFactor * 6.5f)
        };
        
        Vector3 netVel = Vector3Add(bounceVel, scatter);
        
        float debrisScale = (obj->type == OBJ_MONITOR) ? 
            (float)GetRandomValue(8, 22)/100.0f : (float)GetRandomValue(4, 12)/100.0f;
            
        SpawnDebris(spawnPos, netVel, obj->color, debrisScale, GetRandomValue(0, 1));
    }

    // Spawn splashes/sparks and decals
    float decalSize = 0.2f + powerFactor * 0.45f;
    Color splatColor = obj->wireColor;
    
    if (obj->type == OBJ_BOTTLE || obj->type == OBJ_MUG) {
        // Spill puddles
        splatColor = (obj->type == OBJ_BOTTLE) ? (Color){ 140, 15, 30, 210 } : (Color){ 85, 45, 25, 230 }; // Wine / Coffee
        SpawnDecal(hitPoint, hitNormal, splatColor, decalSize);
        
        // Spawn spill drops particles
        int drops = 6 + (int)(powerFactor * 12);
        for (int d = 0; d < drops; d++) {
            Vector3 dropVel = {
                (GetRandomValue(-100, 100) / 100.0f) * (1.0f + powerFactor * 4.0f),
                (GetRandomValue(10, 100) / 100.0f) * (2.0f + powerFactor * 5.0f),
                (GetRandomValue(-100, 100) / 100.0f) * (1.0f + powerFactor * 4.0f)
            };
            // inherit bounce direction partially
            dropVel = Vector3Add(dropVel, Vector3Scale(hitNormal, 2.0f));
            SpawnParticle(hitPoint, dropVel, splatColor, 0.04f, (float)GetRandomValue(10, 20)/10.0f, false);
        }
    } else if (obj->type == OBJ_MONITOR) {
        // Electric Sparks + Scorch Decal
        SpawnDecal(hitPoint, hitNormal, (Color){ 10, 10, 12, 255 }, decalSize * 1.2f); // Black burn mark
        
        int sparks = 15 + (int)(powerFactor * 25);
        for (int s = 0; s < sparks; s++) {
            Vector3 sparkVel = {
                (GetRandomValue(-100, 100) / 100.0f) * (2.0f + powerFactor * 9.0f),
                (GetRandomValue(-100, 100) / 100.0f) * (2.0f + powerFactor * 9.0f),
                (GetRandomValue(-100, 100) / 100.0f) * (2.0f + powerFactor * 9.0f)
            };
            sparkVel = Vector3Add(sparkVel, Vector3Scale(hitNormal, 3.0f));
            Color neonCyanBlue = (GetRandomValue(0, 1) == 0) ? CYAN : BLUE;
            SpawnParticle(hitPoint, sparkVel, neonCyanBlue, 0.02f, (float)GetRandomValue(5, 12)/10.0f, true);
        }
    } else {
        // Plate/Vase debris dust puff
        int dusts = 5 + (int)(powerFactor * 10);
        for (int du = 0; du < dusts; du++) {
            Vector3 dustVel = {
                (GetRandomValue(-50, 50) / 100.0f) * (1.0f + powerFactor * 3.0f),
                (GetRandomValue(0, 80) / 100.0f) * (1.0f + powerFactor * 3.0f),
                (GetRandomValue(-50, 50) / 100.0f) * (1.0f + powerFactor * 3.0f)
            };
            SpawnParticle(hitPoint, dustVel, ColorAlpha(obj->color, 0.6f), 0.08f, 0.5f, false);
        }
    }

    // Record stats
    statsSmashedItems[obj->type]++;
    statsTotalSmashed++;

    // Deactivate object
    obj->isActive = false;
    obj->isThrown = false;
}

void SpawnDebris(Vector3 pos, Vector3 vel, Color col, float scale, int shape) {
    debrisPool[nextDebrisIndex] = (Debris){
        .position = pos,
        .velocity = vel,
        .angularVelocity = (Vector3){ (float)GetRandomValue(-400, 400), (float)GetRandomValue(-400, 400), (float)GetRandomValue(-400, 400) },
        .rotation = QuaternionIdentity(),
        .color = col,
        .scale = scale,
        .life = 0.0f,
        .maxLife = (float)GetRandomValue(180, 320) / 100.0f,
        .shapeType = shape,
        .active = true
    };
    nextDebrisIndex = (nextDebrisIndex + 1) % MAX_DEBRIS;
}

void SpawnDecal(Vector3 pos, Vector3 normal, Color col, float size) {
    decalPool[nextDecalIndex] = (Decal){
        .position = pos,
        .normal = normal,
        .color = col,
        .size = size,
        .life = 1.0f,
        .active = true
    };
    nextDecalIndex = (nextDecalIndex + 1) % MAX_DECALS;
}

void SpawnParticle(Vector3 pos, Vector3 vel, Color col, float size, float maxLife, bool isSpark) {
    particlePool[nextParticleIndex] = (Particle){
        .position = pos,
        .velocity = vel,
        .color = col,
        .size = size,
        .life = 0.0f,
        .maxLife = maxLife,
        .active = true,
        .isSpark = isSpark
    };
    nextParticleIndex = (nextParticleIndex + 1) % MAX_PARTICLES;
}

void SpawnFloatingText(Vector3 pos3D, const char *text, Color col) {
    FloatingText *ft = &floatingTexts[nextFloatingTextIndex];
    ft->position3D = pos3D;
    strncpy(ft->text, text, sizeof(ft->text) - 1);
    ft->color = col;
    ft->life = 0.0f;
    ft->maxLife = 1.2f;
    ft->speedY = 1.0f;
    ft->active = true;
    
    nextFloatingTextIndex = (nextFloatingTextIndex + 1) % MAX_FLOATING_TEXTS;
}

Vector3 GetHeldPosition(Camera3D cam) {
    Vector3 forward = Vector3Normalize(Vector3Subtract(cam.target, cam.position));
    Vector3 right = Vector3Normalize(Vector3CrossProduct(forward, cam.up));
    Vector3 up = Vector3Normalize(Vector3CrossProduct(right, forward));
    
    // Position held object 0.65m forward, 0.20m to the right, and 0.18m down from camera eye level
    Vector3 offset = Vector3Add(
        Vector3Scale(forward, 0.65f),
        Vector3Add(Vector3Scale(right, 0.20f), Vector3Scale(up, -0.18f))
    );
    return Vector3Add(cam.position, offset);
}

Ray GetCameraRay(Camera3D cam) {
    Ray r = { 0 };
    r.position = cam.position;
    r.direction = Vector3Normalize(Vector3Subtract(cam.target, cam.position));
    return r;
}

int GetHoveredObject(Ray ray) {
    int hoverIdx = -1;
    float closestDist = 3.2f; // Interact distance (3.2m)
    
    for (int i = 0; i < MAX_OBJECTS; i++) {
        if (!gameObjects[i].isActive || gameObjects[i].isHeld || gameObjects[i].isThrown) continue;
        
        float radius = 0.32f;
        if (gameObjects[i].type == OBJ_MONITOR) radius = 0.44f;
        else if (gameObjects[i].type == OBJ_PLATE) radius = 0.24f;
        
        // Ray vs Sphere intersection test
        RayCollision collision = GetRayCollisionSphere(ray, gameObjects[i].position, radius * gameObjects[i].scale);
        if (collision.hit && collision.distance < closestDist) {
            closestDist = collision.distance;
            hoverIdx = i;
        }
    }
    
    return hoverIdx;
}

void DrawGame(void) {
    BeginDrawing();
    ClearBackground((Color){ 8, 8, 10, 255 });

    switch (currentState) {
        case STATE_TITLE:
            // Render ambient Title Screen
            BeginMode3D(camera);
            DrawRoom3D();
            
            // Draw floating particles
            for (int i = 0; i < MAX_PARTICLES; i++) {
                if (!particlePool[i].active) continue;
                float alpha = 1.0f - (particlePool[i].life / particlePool[i].maxLife);
                DrawCube(particlePool[i].position, particlePool[i].size, particlePool[i].size, particlePool[i].size, ColorAlpha(particlePool[i].color, alpha));
            }
            EndMode3D();
            
            DrawTitleScreen();
            break;
            
        case STATE_GAMEPLAY: {
            // Screen shake mode 3D
            Camera3D shakeCam = camera;
            shakeCam.position = Vector3Add(camera.position, cameraShakeOffset);
            shakeCam.target = Vector3Add(camera.target, cameraShakeOffset);
            
            BeginMode3D(shakeCam);
            DrawRoom3D();
            EndMode3D();
            
            DrawGameplay();
            break;
        }
        case STATE_SUMMARY:
            BeginMode3D(camera);
            DrawRoom3D();
            // Soothing particles
            for (int i = 0; i < MAX_PARTICLES; i++) {
                if (!particlePool[i].active) continue;
                float alpha = 1.0f - (particlePool[i].life / particlePool[i].maxLife);
                DrawCube(particlePool[i].position, particlePool[i].size, particlePool[i].size, particlePool[i].size, ColorAlpha(particlePool[i].color, alpha));
            }
            EndMode3D();
            
            DrawSummaryScreen();
            break;
    }

    EndDrawing();
}

void DrawRoom3D(void) {
    // Solid floor
    DrawCube((Vector3){0, -0.05f, 0}, ROOM_WIDTH, 0.1f, ROOM_DEPTH, (Color){ 8, 8, 12, 255 });
    
    // Draw neon floor grid lines
    const Color gridColor = (currentState == STATE_SUMMARY) ? (Color){ 0, 100, 80, 255 } : (Color){ 0, 120, 240, 255 };
    for (float x = -ROOM_WIDTH/2.0f; x <= ROOM_WIDTH/2.0f; x += 1.0f) {
        DrawLine3D((Vector3){ x, 0.01f, -ROOM_DEPTH/2.0f }, (Vector3){ x, 0.01f, ROOM_DEPTH/2.0f }, gridColor);
    }
    for (float z = -ROOM_DEPTH/2.0f; z <= ROOM_DEPTH/2.0f; z += 1.0f) {
        DrawLine3D((Vector3){ -ROOM_WIDTH/2.0f, 0.01f, z }, (Vector3){ ROOM_WIDTH/2.0f, 0.01f, z }, gridColor);
    }

    // Solid Walls
    DrawCube((Vector3){ -ROOM_WIDTH/2.0f - 0.05f, ROOM_HEIGHT/2.0f, 0.0f }, 0.1f, ROOM_HEIGHT, ROOM_DEPTH, (Color){ 5, 5, 8, 255 }); // Left
    DrawCube((Vector3){  ROOM_WIDTH/2.0f + 0.05f, ROOM_HEIGHT/2.0f, 0.0f }, 0.1f, ROOM_HEIGHT, ROOM_DEPTH, (Color){ 5, 5, 8, 255 }); // Right
    DrawCube((Vector3){ 0.0f, ROOM_HEIGHT/2.0f, -ROOM_DEPTH/2.0f - 0.05f }, ROOM_WIDTH, ROOM_HEIGHT, 0.1f, (Color){ 5, 5, 8, 255 }); // Back
    DrawCube((Vector3){ 0.0f, ROOM_HEIGHT/2.0f,  ROOM_DEPTH/2.0f + 0.05f }, ROOM_WIDTH, ROOM_HEIGHT, 0.1f, (Color){ 5, 5, 8, 255 }); // Front
    DrawCube((Vector3){ 0.0f, ROOM_HEIGHT + 0.05f, 0.0f }, ROOM_WIDTH, 0.1f, ROOM_DEPTH, (Color){ 4, 4, 6, 255 }); // Ceiling

    // Wall glowing border bands (TRON style stripes)
    const Color stripCol = (currentState == STATE_SUMMARY) ? (Color){ 0, 200, 130, 255 } : (Color){ 255, 0, 127, 255 }; // Teal vs Pink
    const float w = ROOM_WIDTH / 2.0f;
    const float d = ROOM_DEPTH / 2.0f;
    
    for (float yVal = 2.0f; yVal <= 6.0f; yVal += 2.0f) {
        DrawLine3D((Vector3){ -w, yVal, -d }, (Vector3){  w, yVal, -d }, stripCol);
        DrawLine3D((Vector3){ -w, yVal,  d }, (Vector3){  w, yVal,  d }, stripCol);
        DrawLine3D((Vector3){ -w, yVal, -d }, (Vector3){ -w, yVal,  d }, stripCol);
        DrawLine3D((Vector3){  w, yVal, -d }, (Vector3){  w, yVal,  d }, stripCol);
    }
    // Vertical Corner strips
    DrawLine3D((Vector3){ -w, 0.0f, -d }, (Vector3){ -w, ROOM_HEIGHT, -d }, stripCol);
    DrawLine3D((Vector3){  w, 0.0f, -d }, (Vector3){  w, ROOM_HEIGHT, -d }, stripCol);
    DrawLine3D((Vector3){ -w, 0.0f,  d }, (Vector3){ -w, ROOM_HEIGHT,  d }, stripCol);
    DrawLine3D((Vector3){  w, 0.0f,  d }, (Vector3){  w, ROOM_HEIGHT,  d }, stripCol);

    // Draw Furniture (Solid block + neon wire outline)
    for (int i = 0; i < furnitureCount; i++) {
        Vector3 size = Vector3Subtract(roomFurniture[i].box.max, roomFurniture[i].box.min);
        Vector3 center = Vector3Add(roomFurniture[i].box.min, Vector3Scale(size, 0.5f));
        
        // Draw solid structure
        DrawCube(center, size.x, size.y, size.z, roomFurniture[i].color);
        
        // Draw wireframe outline slightly scaled up to encase it beautifully
        DrawCubeWires(center, size.x * 1.01f, size.y * 1.01f, size.z * 1.01f, roomFurniture[i].wireColor);
    }

    // Draw Decals (flat splats on walls/floor)
    for (int i = 0; i < MAX_DECALS; i++) {
        if (!decalPool[i].active) continue;
        
        Decal *dec = &decalPool[i];
        
        // Push slightly along normal to prevent depth-buffer z-fighting
        Vector3 drawPos = Vector3Add(dec->position, Vector3Scale(dec->normal, 0.006f));
        
        if (fabsf(dec->normal.y) > 0.8f) {
            // Floor / Ceiling
            DrawCube(drawPos, dec->size, 0.002f, dec->size, dec->color);
        } else if (fabsf(dec->normal.x) > 0.8f) {
            // Left / Right Walls
            DrawCube(drawPos, 0.002f, dec->size, dec->size, dec->color);
        } else {
            // Front / Back Walls
            DrawCube(drawPos, dec->size, dec->size, 0.002f, dec->color);
        }
    }

    // Draw active breakable objects
    for (int i = 0; i < MAX_OBJECTS; i++) {
        if (!gameObjects[i].isActive) continue;
        
        // Solid body
        DrawObject(&gameObjects[i], false);
        // Neon wire outline (encases the object)
        DrawObject(&gameObjects[i], true);
    }

    // Draw physical debris shards
    for (int i = 0; i < MAX_DEBRIS; i++) {
        if (!debrisPool[i].active) continue;
        
        Debris *d = &debrisPool[i];
        rlPushMatrix();
        rlTranslatef(d->position.x, d->position.y, d->position.z);
        
        Vector3 axis;
        float angle;
        QuaternionToAxisAngle(d->rotation, &axis, &angle);
        rlRotatef(angle * RAD2DEG, axis.x, axis.y, axis.z);
        
        float progress = d->life / d->maxLife;
        float currentScale = d->scale * (1.0f - progress); // shrink before deletion
        
        if (d->shapeType == 0) {
            DrawCube(Vector3Zero(), currentScale, currentScale, currentScale, d->color);
            DrawCubeWires(Vector3Zero(), currentScale * 1.05f, currentScale * 1.05f, currentScale * 1.05f, ColorAlpha(d->color, 0.8f));
        } else {
            // Triangular shard
            DrawSphere(Vector3Zero(), currentScale * 0.6f, d->color);
            DrawSphereWires(Vector3Zero(), currentScale * 0.64f, 5, 5, ColorAlpha(d->color, 0.8f));
        }
        
        rlPopMatrix();
    }

    // Draw fast splash particles (billboard spheres or streaks)
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particlePool[i].active) continue;
        
        Particle *p = &particlePool[i];
        float progress = p->life / p->maxLife;
        float alpha = 1.0f - progress;
        
        if (p->isSpark) {
            // Draw electric streak line along velocity
            Vector3 start = p->position;
            Vector3 end = Vector3Subtract(p->position, Vector3Scale(p->velocity, 0.04f));
            DrawLine3D(start, end, ColorAlpha(p->color, alpha));
        } else {
            // Draw water drops / dust smoke
            DrawSphere(p->position, p->size * (1.0f - progress), ColorAlpha(p->color, alpha));
        }
    }
}

void DrawBottleModel(Vector3 position, Quaternion rotation, float scale, Color baseCol, Color wireCol, bool drawWires) {
    rlPushMatrix();
    rlTranslatef(position.x, position.y, position.z);
    
    Vector3 axis;
    float angle;
    QuaternionToAxisAngle(rotation, &axis, &angle);
    rlRotatef(angle * RAD2DEG, axis.x, axis.y, axis.z);
    
    if (drawWires) {
        rlScalef(scale * 1.02f, scale * 1.02f, scale * 1.02f);
        // Base Cylinder wires
        DrawCylinderWires((Vector3){0, 0.18f, 0}, 0.08f, 0.08f, 0.36f, 10, wireCol);
        // Neck Cylinder wires
        DrawCylinderWires((Vector3){0, 0.44f, 0}, 0.035f, 0.035f, 0.16f, 8, wireCol);
    } else {
        rlScalef(scale, scale, scale);
        // Base Cylinder solid
        DrawCylinder((Vector3){0, 0.18f, 0}, 0.08f, 0.08f, 0.36f, 10, baseCol);
        // Neck Cylinder solid
        DrawCylinder((Vector3){0, 0.44f, 0}, 0.035f, 0.035f, 0.16f, 8, baseCol);
    }
    
    rlPopMatrix();
}

void DrawPlateModel(Vector3 position, Quaternion rotation, float scale, Color baseCol, Color wireCol, bool drawWires) {
    rlPushMatrix();
    rlTranslatef(position.x, position.y, position.z);
    
    Vector3 axis;
    float angle;
    QuaternionToAxisAngle(rotation, &axis, &angle);
    rlRotatef(angle * RAD2DEG, axis.x, axis.y, axis.z);
    
    if (drawWires) {
        rlScalef(scale * 1.02f, scale * 1.02f, scale * 1.02f);
        DrawCylinderWires((Vector3){0, 0.02f, 0}, 0.22f, 0.18f, 0.04f, 16, wireCol);
    } else {
        rlScalef(scale, scale, scale);
        DrawCylinder((Vector3){0, 0.02f, 0}, 0.22f, 0.18f, 0.04f, 16, baseCol);
    }
    
    rlPopMatrix();
}

void DrawMugModel(Vector3 position, Quaternion rotation, float scale, Color baseCol, Color wireCol, bool drawWires) {
    rlPushMatrix();
    rlTranslatef(position.x, position.y, position.z);
    
    Vector3 axis;
    float angle;
    QuaternionToAxisAngle(rotation, &axis, &angle);
    rlRotatef(angle * RAD2DEG, axis.x, axis.y, axis.z);
    
    if (drawWires) {
        rlScalef(scale * 1.02f, scale * 1.02f, scale * 1.02f);
        // Body wires
        DrawCylinderWires((Vector3){0, 0.13f, 0}, 0.09f, 0.09f, 0.26f, 10, wireCol);
        // Handle wires
        DrawCubeWires((Vector3){ 0.09f, 0.13f, 0 }, 0.04f, 0.14f, 0.03f, wireCol);
    } else {
        rlScalef(scale, scale, scale);
        // Body solid
        DrawCylinder((Vector3){0, 0.13f, 0}, 0.09f, 0.09f, 0.26f, 10, baseCol);
        // Handle solid
        DrawCube((Vector3){ 0.09f, 0.13f, 0 }, 0.04f, 0.14f, 0.03f, baseCol);
    }
    
    rlPopMatrix();
}

void DrawVaseModel(Vector3 position, Quaternion rotation, float scale, Color baseCol, Color wireCol, bool drawWires) {
    rlPushMatrix();
    rlTranslatef(position.x, position.y, position.z);
    
    Vector3 axis;
    float angle;
    QuaternionToAxisAngle(rotation, &axis, &angle);
    rlRotatef(angle * RAD2DEG, axis.x, axis.y, axis.z);
    
    if (drawWires) {
        rlScalef(scale * 1.02f, scale * 1.02f, scale * 1.02f);
        // Bottom ring wires
        DrawCylinderWires((Vector3){0, 0.05f, 0}, 0.10f, 0.12f, 0.10f, 10, wireCol);
        // Sphere body wires
        DrawSphereWires((Vector3){0, 0.22f, 0}, 0.16f, 8, 10, wireCol);
        // Neck wires
        DrawCylinderWires((Vector3){0, 0.40f, 0}, 0.08f, 0.08f, 0.20f, 8, wireCol);
        // Top Rim wires
        DrawCylinderWires((Vector3){0, 0.51f, 0}, 0.11f, 0.08f, 0.03f, 8, wireCol);
    } else {
        rlScalef(scale, scale, scale);
        // Bottom ring
        DrawCylinder((Vector3){0, 0.05f, 0}, 0.10f, 0.12f, 0.10f, 10, baseCol);
        // Sphere body
        DrawSphere((Vector3){0, 0.22f, 0}, 0.16f, baseCol);
        // Neck
        DrawCylinder((Vector3){0, 0.40f, 0}, 0.08f, 0.08f, 0.20f, 8, baseCol);
        // Top Rim
        DrawCylinder((Vector3){0, 0.51f, 0}, 0.11f, 0.08f, 0.03f, 8, baseCol);
    }
    
    rlPopMatrix();
}

void DrawMonitorModel(Vector3 position, Quaternion rotation, float scale, Color baseCol, Color wireCol, bool drawWires) {
    rlPushMatrix();
    rlTranslatef(position.x, position.y, position.z);
    
    Vector3 axis;
    float angle;
    QuaternionToAxisAngle(rotation, &axis, &angle);
    rlRotatef(angle * RAD2DEG, axis.x, axis.y, axis.z);
    
    if (drawWires) {
        rlScalef(scale * 1.02f, scale * 1.02f, scale * 1.02f);
        // Stand base wires
        DrawCylinderWires((Vector3){0, 0.02f, 0}, 0.16f, 0.16f, 0.04f, 8, wireCol);
        // Neck joint wires
        DrawCylinderWires((Vector3){0, 0.07f, 0}, 0.04f, 0.04f, 0.06f, 6, wireCol);
        // Main box wires
        DrawCubeWires((Vector3){0, 0.32f, 0}, 0.44f, 0.44f, 0.44f, wireCol);
        // Screen face wires (Glows neon green/cyan)
        DrawCubeWires((Vector3){0, 0.32f, 0.221f}, 0.36f, 0.36f, 0.01f, wireCol);
    } else {
        rlScalef(scale, scale, scale);
        // Stand base
        DrawCylinder((Vector3){0, 0.02f, 0}, 0.16f, 0.16f, 0.04f, 8, baseCol);
        // Neck joint
        DrawCylinder((Vector3){0, 0.07f, 0}, 0.04f, 0.04f, 0.06f, 6, baseCol);
        // Main box
        DrawCube((Vector3){0, 0.32f, 0}, 0.44f, 0.44f, 0.44f, baseCol);
        // Screen face (dark glowing terminal monitor screen)
        DrawCube((Vector3){0, 0.32f, 0.221f}, 0.36f, 0.36f, 0.01f, (Color){ 10, 40, 30, 255 });
    }
    
    rlPopMatrix();
}

void DrawObject(BreakableObject *obj, bool drawWires) {
    Color bColor = obj->color;
    Color wColor = obj->wireColor;
    
    // Highlight hovered object if they can grab it
    if (currentState == STATE_GAMEPLAY && !obj->isHeld && !obj->isThrown && heldObjectIndex == -1) {
        Ray r = GetCameraRay(camera);
        if (GetHoveredObject(r) == (obj - gameObjects)) {
            wColor = GOLD; // Make it flash gold outline when hovered!
        }
    }

    switch (obj->type) {
        case OBJ_BOTTLE:
            DrawBottleModel(obj->position, obj->rotation, obj->scale, bColor, wColor, drawWires);
            break;
        case OBJ_PLATE:
            DrawPlateModel(obj->position, obj->rotation, obj->scale, bColor, wColor, drawWires);
            break;
        case OBJ_MUG:
            DrawMugModel(obj->position, obj->rotation, obj->scale, bColor, wColor, drawWires);
            break;
        case OBJ_VADO:
            DrawVaseModel(obj->position, obj->rotation, obj->scale, bColor, wColor, drawWires);
            break;
        case OBJ_MONITOR:
            DrawMonitorModel(obj->position, obj->rotation, obj->scale, bColor, wColor, drawWires);
            break;
        default: break;
    }
}

void DrawTitleScreen(void) {
    int sWidth = GetScreenWidth();
    int sHeight = GetScreenHeight();

    // Dark grid/glass panel decoration
    DrawRectangle(0, 0, sWidth, sHeight, ColorAlpha(BLACK, 0.25f));

    // Glow effect for title text
    const char *titleText = "ANGER SHATTERROOM";
    int titleFontSize = 60;
    int titleWidth = MeasureText(titleText, titleFontSize);
    
    // Pulsing color shift from orange to deep pink
    float pulse = (sinf(GetTime() * 4.0f) + 1.0f) * 0.5f;
    Color titleGlow = ColorLerp(ORANGE, RED, pulse);

    DrawText(titleText, sWidth/2 - titleWidth/2 + 3, sHeight/5 + 3, titleFontSize, BLACK);
    DrawText(titleText, sWidth/2 - titleWidth/2, sHeight/5, titleFontSize, titleGlow);

    // Glowing subtitle
    const char *subtitleText = "RELEASE YOUR INTERNAL RAGE OFF THE WALLS";
    int subFontSize = 20;
    int subWidth = MeasureText(subtitleText, subFontSize);
    DrawText(subtitleText, sWidth/2 - subWidth/2, sHeight/5 + 75, subFontSize, CYAN);

    // Instruction pane (semi-transparent glassmorphism)
    int paneW = 560;
    int paneH = 250;
    int paneX = sWidth/2 - paneW/2;
    int paneY = sHeight/2 - 40;
    
    DrawRectangleRounded((Rectangle){ paneX, paneY, paneW, paneH }, 0.05f, 6, ColorAlpha((Color){15,15,22,255}, 0.8f));
    DrawRectangleRoundedLines((Rectangle){ paneX, paneY, paneW, paneH }, 0.05f, 6, ColorAlpha(CYAN, 0.5f));

    DrawText("DESTRUCT-O-THERAPY RULES:", paneX + 25, paneY + 20, 18, GOLD);
    
    int rowY = paneY + 60;
    int stepY = 28;
    DrawText("- WASD keys: Move around inside the therapy room", paneX + 30, rowY, 15, WHITE); rowY += stepY;
    DrawText("- Mouse look: Aim your throwing crosshair", paneX + 30, rowY, 15, WHITE); rowY += stepY;
    DrawText("- RIGHT CLICK or E: Grab/drop highlight breakable items", paneX + 30, rowY, 15, WHITE); rowY += stepY;
    DrawText("- HOLD LEFT CLICK: Charge throwing velocity meter", paneX + 30, rowY, 15, WHITE); rowY += stepY;
    DrawText("- RELEASE LEFT CLICK: Shatter items on walls & watch them explode!", paneX + 30, rowY, 15, WHITE); rowY += stepY;
    DrawText("- R key: Instantly restock all items in the room", paneX + 30, rowY, 15, WHITE);

    // Flashing Play Prompts
    const char *prompt = "PRESS [ ENTER ] TO RELEASE THE ANGER";
    int promptFont = 24;
    int promptW = MeasureText(prompt, promptFont);
    float alphaPrompt = (sinf(GetTime() * 6.0f) + 1.0f) * 0.5f;
    DrawText(prompt, sWidth/2 - promptW/2, sHeight - 110, promptFont, ColorAlpha(LIME, alphaPrompt));
    
    DrawText("Raylib & C Game • Antigravity 2026", sWidth/2 - MeasureText("Raylib & C Game • Antigravity 2026", 13)/2, sHeight - 40, 13, GRAY);
}

void DrawGameplay(void) {
    int sWidth = GetScreenWidth();
    int sHeight = GetScreenHeight();

    // 1. Red Vignette (pulses when anger is high, fades out as anger releases)
    float angerPct = angerLevel / 100.0f;
    if (angerPct > 0.0f) {
        float vigAlpha = angerPct * 0.42f;
        vigAlpha += sinf(GetTime() * 4.5f) * 0.06f * angerPct;
        if (vigAlpha < 0.0f) vigAlpha = 0.0f;
        
        int vigSize = 80;
        DrawRectangleGradientV(0, 0, sWidth, vigSize, ColorAlpha(RED, vigAlpha), ColorAlpha(RED, 0.0f)); // Top
        DrawRectangleGradientV(0, sHeight - vigSize, sWidth, vigSize, ColorAlpha(RED, 0.0f), ColorAlpha(RED, vigAlpha)); // Bottom
        DrawRectangleGradientH(0, 0, vigSize, sHeight, ColorAlpha(RED, vigAlpha), ColorAlpha(RED, 0.0f)); // Left
        DrawRectangleGradientH(sWidth - vigSize, 0, vigSize, sHeight, ColorAlpha(RED, 0.0f), ColorAlpha(RED, vigAlpha)); // Right
    }

    // 2. HUD: Anger Level Bar (Top Center)
    int barW = 320;
    int barH = 22;
    int barX = sWidth/2 - barW/2;
    int barY = 25;
    
    // Background bar
    DrawRectangle(barX - 2, barY - 2, barW + 4, barH + 4, ColorAlpha(DARKGRAY, 0.7f));
    DrawRectangleLines(barX - 2, barY - 2, barW + 4, barH + 4, GRAY);
    
    // Remaining Anger level fill (shifting color from green -> orange -> red)
    Color angerColor = LIME;
    if (angerPct > 0.6f) angerColor = RED;
    else if (angerPct > 0.3f) angerColor = ORANGE;
    
    DrawRectangle(barX, barY, (int)(barW * angerPct), barH, angerColor);
    
    // Pulsing "RAGE OUT" text
    char angerMsg[32];
    sprintf(angerMsg, "ANGER LEVEL: %d%%", (int)angerLevel);
    int fontSz = 16;
    int textW = MeasureText(angerMsg, fontSz);
    DrawText(angerMsg, sWidth/2 - textW/2, barY + barH/2 - fontSz/2, fontSz, BLACK);

    // 3. Floating 3D Text projected to 2D
    for (int i = 0; i < MAX_FLOATING_TEXTS; i++) {
        if (!floatingTexts[i].active) continue;
        
        // Skip rendering text located behind player camera viewport
        Vector3 toText = Vector3Subtract(floatingTexts[i].position3D, camera.position);
        Vector3 camDir = Vector3Normalize(Vector3Subtract(camera.target, camera.position));
        if (Vector3DotProduct(toText, camDir) <= 0.0f) continue;
        
        Vector2 sPos = GetWorldToScreen(floatingTexts[i].position3D, camera);
        float progress = floatingTexts[i].life / floatingTexts[i].maxLife;
        float alpha = 1.0f - progress;
        
        sPos.y -= progress * 90.0f; // Float upward
        
        // Scale and render floating impact feedback
        int fSize = 22 + (int)((1.0f - progress) * 10.0f);
        int fWidth = MeasureText(floatingTexts[i].text, fSize);
        
        DrawText(floatingTexts[i].text, sPos.x - fWidth/2 + 2, sPos.y + 2, fSize, ColorAlpha(BLACK, alpha * 0.7f));
        DrawText(floatingTexts[i].text, sPos.x - fWidth/2, sPos.y, fSize, ColorAlpha(floatingTexts[i].color, alpha));
    }

    // 4. Reticle Crosshair (Center screen)
    int crossX = sWidth / 2;
    int crossY = sHeight / 2;
    
    Ray ray = GetCameraRay(camera);
    int hoveredIdx = GetHoveredObject(ray);
    
    if (heldObjectIndex == -1) {
        if (hoveredIdx != -1) {
            // Brackets hover layout
            DrawRectangleLines(crossX - 10, crossY - 10, 20, 20, GOLD);
            DrawCircle(crossX, crossY, 2.5f, GOLD);
            
            // Interaction pickup labels
            char promptMsg[48];
            const char* itemName = "";
            switch (gameObjects[hoveredIdx].type) {
                case OBJ_BOTTLE: itemName = "BOTTLE"; break;
                case OBJ_PLATE: itemName = "CERAMIC PLATE"; break;
                case OBJ_MUG: itemName = "COFFEE MUG"; break;
                case OBJ_VADO: itemName = "DECORATIVE VASE"; break;
                case OBJ_MONITOR: itemName = "CRT MONITOR"; break;
                default: itemName = "OBJECT"; break;
            }
            sprintf(promptMsg, "[E] or [R-CLICK] GRAB %s", itemName);
            
            int promptSz = 16;
            int promptW = MeasureText(promptMsg, promptSz);
            DrawText(promptMsg, crossX - promptW/2, crossY + 25, promptSz, GOLD);
        } else {
            // Default crosshair dot
            DrawCircle(crossX, crossY, 3.0f, ColorAlpha(CYAN, 0.8f));
        }
    } else {
        // Player is holding an item. Show throw instructions
        const char *inst = "[LMB] HOLD: CHARGE THROW  |  [Q] DROP";
        if (isCharging) inst = "[LMB] RELEASE: SHATTER!";
        
        int instSz = 15;
        int instW = MeasureText(inst, instSz);
        DrawText(inst, crossX - instW/2, crossY + 32, instSz, WHITE);
        
        // Circular Charging Meter Ring around reticle
        if (isCharging) {
            float innerRad = 15.0f;
            float outerRad = 20.0f;
            float endAng = -90.0f + throwPower * 360.0f;
            
            // Color shifts green -> yellow -> red depending on power load
            Color arcColor = ColorFromHSV(120.0f - throwPower * 120.0f, 0.9f, 0.9f);
            
            DrawRing((Vector2){ (float)crossX, (float)crossY }, innerRad, outerRad, -90.0f, endAng, 40, arcColor);
            DrawCircle(crossX, crossY, 2.5f, RED);
            
            char pwrMsg[16];
            sprintf(pwrMsg, "%d%%", (int)(throwPower * 100));
            int pwrW = MeasureText(pwrMsg, 11);
            DrawText(pwrMsg, crossX - pwrW/2, crossY - 5, 11, WHITE);
        } else {
            // Standby crosshair
            DrawCircleLines(crossX, crossY, 10.0f, MAGENTA);
            DrawCircle(crossX, crossY, 2.0f, MAGENTA);
        }
    }

    // Controls hints (Bottom left screen)
    DrawText("WASD: Move  |  Mouse: Look  |  R: Restock Room  |  ESC: Quit", 20, sHeight - 30, 14, GRAY);
    
    // Smash count indicators (Bottom right screen)
    char countMsg[64];
    sprintf(countMsg, "TOTAL SMASHED: %d", statsTotalSmashed);
    int countW = MeasureText(countMsg, 14);
    DrawText(countMsg, sWidth - countW - 20, sHeight - 30, 14, LIME);
}

void DrawSummaryScreen(void) {
    int sWidth = GetScreenWidth();
    int sHeight = GetScreenHeight();

    // Semi-transparent overlay reflecting calm therapy completion
    DrawRectangle(0, 0, sWidth, sHeight, ColorAlpha((Color){ 5, 25, 20, 255 }, 0.8f));

    const char *titleText = "CALM RESTORED";
    int titleFontSize = 52;
    int titleWidth = MeasureText(titleText, titleFontSize);
    
    // Slow glowing pulse
    float pulse = (sinf(GetTime() * 2.0f) + 1.0f) * 0.5f;
    Color calmsCol = ColorLerp(LIME, GREEN, pulse);
    
    DrawText(titleText, sWidth/2 - titleWidth/2 + 2, sHeight/6 + 2, titleFontSize, BLACK);
    DrawText(titleText, sWidth/2 - titleWidth/2, sHeight/6, titleFontSize, calmsCol);

    const char *subText = "YOUR ANGER LEVEL HAS REDUCED TO 0%";
    int subSz = 18;
    int subW = MeasureText(subText, subSz);
    DrawText(subText, sWidth/2 - subW/2, sHeight/6 + 65, subSz, WHITE);

    // Results Box (Glassmorphic calm aesthetic)
    int boxW = 500;
    int boxH = 280;
    int boxX = sWidth/2 - boxW/2;
    int boxY = sHeight/2 - 60;
    
    DrawRectangleRounded((Rectangle){ boxX, boxY, boxW, boxH }, 0.05f, 6, ColorAlpha((Color){ 10, 30, 25, 255 }, 0.9f));
    DrawRectangleRoundedLines((Rectangle){ boxX, boxY, boxW, boxH }, 0.05f, 6, ColorAlpha(LIME, 0.4f));

    DrawText("DESTRUCTION REPORT:", boxX + 25, boxY + 20, 18, GOLD);
    
    int textY = boxY + 60;
    int stepY = 26;
    int col1X = boxX + 35;
    int col2X = boxX + boxW - 140;

    // Smashed counters
    char valStr[32];
    
    DrawText("Glass Bottles Shattered:", col1X, textY, 14, WHITE);
    sprintf(valStr, "%d items", statsSmashedItems[OBJ_BOTTLE]);
    DrawText(valStr, col2X, textY, 14, LIME);
    textY += stepY;

    DrawText("Ceramic Plates Smashed:", col1X, textY, 14, WHITE);
    sprintf(valStr, "%d items", statsSmashedItems[OBJ_PLATE]);
    DrawText(valStr, col2X, textY, 14, LIME);
    textY += stepY;

    DrawText("Coffee Mugs Smashed:", col1X, textY, 14, WHITE);
    sprintf(valStr, "%d items", statsSmashedItems[OBJ_MUG]);
    DrawText(valStr, col2X, textY, 14, LIME);
    textY += stepY;

    DrawText("Decorative Vases Smashed:", col1X, textY, 14, WHITE);
    sprintf(valStr, "%d items", statsSmashedItems[OBJ_VADO]);
    DrawText(valStr, col2X, textY, 14, LIME);
    textY += stepY;

    DrawText("CRT Monitors Blown Up:", col1X, textY, 14, WHITE);
    sprintf(valStr, "%d items", statsSmashedItems[OBJ_MONITOR]);
    DrawText(valStr, col2X, textY, 14, LIME);
    textY += stepY;
    
    // Draw horizontal separator line
    DrawLine(col1X, textY + 5, boxX + boxW - 35, textY + 5, ColorAlpha(GRAY, 0.3f));
    textY += 16;

    DrawText("Peak Throw Force Logged:", col1X, textY, 14, GOLD);
    sprintf(valStr, "%d%% power", (int)(statsMaxThrowPower * 100));
    DrawText(valStr, col2X, textY, 14, ORANGE);

    // Play prompt
    const char *restartPrompt = "PRESS [ ENTER ] TO RELEASE MORE ANGER";
    int rFont = 20;
    int rWidth = MeasureText(restartPrompt, rFont);
    float alph = (sinf(GetTime() * 5.0f) + 1.0f) * 0.5f;
    DrawText(restartPrompt, sWidth/2 - rWidth/2, sHeight - 90, rFont, ColorAlpha(CYAN, alph));
}

void UnloadGame(void) {
    // Unload all loaded procedural sound effect buffers
    for (int i = 0; i < SND_COUNT; i++) {
        UnloadSound(gameSounds[i]);
    }
    UnloadSound(ambientDrone);
}
