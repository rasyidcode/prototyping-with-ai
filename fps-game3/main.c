#include "raylib.h"
#include "raymath.h"
#include "rlgl.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

#define MAX_PARTICLES 350
#define MAX_TRACERS 30
#define MAX_FLOATING_TEXTS 30
#define FLOOR_WIDTH 30.0f
#define FLOOR_DEPTH 35.0f

#define CYAN (Color){ 0, 255, 255, 255 }

// Game States
typedef enum {
    STATE_TITLE,
    STATE_PLAYING,
    STATE_SESSION_CLEAR,
    STATE_GAME_OVER,
    STATE_VICTORY
} GameState;

// Weapon Types
typedef enum {
    WEAPON_PISTOL,
    WEAPON_RIFLE,
    WEAPON_SHOTGUN,
    WEAPON_SNIPER,
    WEAPON_COUNT
} WeaponType;

// Weapon Information
typedef struct {
    char name[32];
    int maxClip;
    int maxReserve;
    float fireRate;     // Cooldown between shots in seconds
    float reloadTime;   // Reload duration in seconds
    float damage;
    int pelletCount;    // Number of projectiles per shot
    float spread;       // Base accuracy spread
    float recoilKick;   // Camera kickback amount (pitch)
    Color color;
} WeaponInfo;

static const WeaponInfo weaponInfos[WEAPON_COUNT] = {
    [WEAPON_PISTOL] = { "Cyber Pistol", 12, 60, 0.22f, 1.1f, 25.0f, 1, 0.005f, 0.04f, (Color){ 0, 180, 255, 255 } },
    [WEAPON_RIFLE] = { "Assault Pulsar", 30, 150, 0.09f, 1.8f, 20.0f, 1, 0.025f, 0.025f, (Color){ 50, 220, 100, 255 } },
    [WEAPON_SHOTGUN] = { "Heavy Scatter", 6, 24, 0.75f, 2.2f, 15.0f, 8, 0.08f, 0.12f, (Color){ 240, 120, 30, 255 } },
    [WEAPON_SNIPER] = { "Rail Sniper", 5, 15, 1.3f, 2.7f, 150.0f, 1, 0.001f, 0.22f, (Color){ 220, 50, 250, 255 } }
};

// Player Weapon State
typedef struct {
    WeaponType type;
    int ammoClip;
    int ammoReserve;
    float shootCooldown;
    float reloadTimer;
    float recoilOffset; // Visual weapon translation offset
    float recoilAngle;  // Camera pitch offset
} ActiveWeapon;

// Player Entity
typedef struct {
    Vector3 position;
    float velocityY;
    bool isGrounded;
    float yaw;
    float pitch;
    ActiveWeapon weapon;
    float bobTimer;
    bool isMoving;
    float speed;
} Player;

// Target Dummy Entity
typedef struct {
    Vector3 position;
    Vector3 startPosition;
    Vector3 velocity;
    float health;
    float maxHealth;
    float size;          // Collision radius
    float height;        // Collision height
    bool active;
    float hitFlashTimer;
    float moveTimer;
    bool isHeadshot;
} DummyTarget;

// Floating Damage Numbers / Points
typedef struct {
    Vector3 position;
    char text[32];
    Color color;
    float life;
    float maxLife;
    float speedY;
    float scale;
    bool active;
} FloatingText;

// Bullet Tracer Lines
typedef struct {
    Vector3 start;
    Vector3 end;
    float life;
    float maxLife;
    bool active;
} BulletTracer;

// Particle System Entity
typedef struct {
    Vector3 position;
    Vector3 velocity;
    Color color;
    float size;
    float life;
    float maxLife;
    bool active;
    bool hasGravity;
} Particle;

// Weapon Pedestal Booths
typedef struct {
    Vector3 position;
    WeaponType weaponType;
    char label[16];
} WeaponPedestal;

// Game Session Manager
typedef struct {
    int currentSession;    // 1 to 5
    GameState state;
    float sessionTimer;
    int targetsDestroyed;
    int targetsRequired;   // Targets to destroy to pass
    int score;
    int highScore;
    bool sessionActive;
    int bulletsFired;
    int bulletsHit;
    float stateTimer;      // General purpose UI timer
} SessionManager;

// Sound Effects
typedef struct {
    Sound shoot[WEAPON_COUNT];
    Sound reload;
    Sound hitNormal;
    Sound hitHead;
    Sound targetDestroyed;
    Sound levelUp;
    Sound fail;
} GameSounds;

// Global Game Variables
static Player player = { 0 };
static DummyTarget target = { 0 };
static SessionManager session = { 0 };
static Particle particles[MAX_PARTICLES] = { 0 };
static BulletTracer tracers[MAX_TRACERS] = { 0 };
static FloatingText floatingTexts[MAX_FLOATING_TEXTS] = { 0 };
static WeaponPedestal pedestals[WEAPON_COUNT] = { 0 };
static GameSounds sounds = { 0 };
static float crosshairSpread = 0.0f;
static float hitmarkerTimer = 0.0f;
static bool hitmarkerHeadshot = false;

// Procedural Sound Generator Helpers
static Sound GenerateChirpSound(float duration, float startFreq, float endFreq, float noiseAmount, float volume) {
    int sampleRate = 22050;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleCount;
        float time = (float)i / sampleRate;
        
        // Frequency sweep
        float phase = 2.0f * PI * (startFreq * time + 0.5f * (endFreq - startFreq) * time * t);
        float signal = sinf(phase);
        
        // Noise mixing
        if (noiseAmount > 0.0f) {
            float noise = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
            signal = signal * (1.0f - noiseAmount) + noise * noiseAmount;
        }
        
        // Attack/Decay envelope
        float env = 0.0f;
        if (t < 0.05f) {
            env = t / 0.05f; // Short attack
        } else {
            env = 1.0f - (t - 0.05f) / 0.95f; // Gradual decay
        }
        
        signal *= env * volume;
        
        if (signal > 1.0f) signal = 1.0f;
        if (signal < -1.0f) signal = -1.0f;
        
        data[i] = (short)(signal * 32000.0f);
    }
    
    Wave wave = { 0 };
    wave.frameCount = sampleCount;
    wave.sampleRate = sampleRate;
    wave.sampleSize = 16;
    wave.channels = 1;
    wave.data = data;
    
    Sound sound = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return sound;
}

static Sound GenerateReloadSound(void) {
    int sampleRate = 22050;
    float duration = 0.45f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    memset(data, 0, sampleCount * sizeof(short));
    
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleCount;
        float signal = 0.0f;
        
        // Click 1 (Magazine ejection)
        if (t >= 0.05f && t < 0.15f) {
            float ct = (t - 0.05f) / 0.1f;
            signal = sinf(2.0f * PI * (1200.0f - 600.0f * ct) * (t - 0.05f)) * (1.0f - ct) * 0.4f;
        }
        
        // Click 2 (New magazine slide-in)
        if (t >= 0.25f && t < 0.38f) {
            float ct = (t - 0.25f) / 0.13f;
            signal = sinf(2.0f * PI * (800.0f + 700.0f * ct) * (t - 0.25f)) * (1.0f - ct) * 0.4f;
        }
        
        data[i] = (short)(signal * 32000.0f);
    }
    
    Wave wave = { 0 };
    wave.frameCount = sampleCount;
    wave.sampleRate = sampleRate;
    wave.sampleSize = 16;
    wave.channels = 1;
    wave.data = data;
    
    Sound sound = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return sound;
}

static Sound GenerateHitSound(bool headshot) {
    int sampleRate = 22050;
    float duration = headshot ? 0.25f : 0.15f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    
    float freq = headshot ? 1600.0f : 1000.0f;
    
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleCount;
        float signal = sinf(2.0f * PI * freq * ((float)i / sampleRate));
        float env = expf(-10.0f * t);
        
        // Double pitch chime for headshot
        if (headshot) {
            signal += sinf(2.0f * PI * (freq * 1.5f) * ((float)i / sampleRate)) * 0.5f;
        }
        
        signal *= env * 0.5f;
        data[i] = (short)(signal * 32000.0f);
    }
    
    Wave wave = { 0 };
    wave.frameCount = sampleCount;
    wave.sampleRate = sampleRate;
    wave.sampleSize = 16;
    wave.channels = 1;
    wave.data = data;
    
    Sound sound = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return sound;
}

static Sound GenerateDestroySound(void) {
    int sampleRate = 22050;
    float duration = 0.6f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleCount;
        float noise = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
        float rumble = sinf(2.0f * PI * 55.0f * ((float)i / sampleRate));
        
        float signal = noise * 0.65f + rumble * 0.35f;
        float env = expf(-5.0f * t);
        signal *= env * 0.7f;
        
        data[i] = (short)(signal * 32000.0f);
    }
    
    Wave wave = { 0 };
    wave.frameCount = sampleCount;
    wave.sampleRate = sampleRate;
    wave.sampleSize = 16;
    wave.channels = 1;
    wave.data = data;
    
    Sound sound = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return sound;
}

static Sound GenerateLevelUpSound(void) {
    int sampleRate = 22050;
    float duration = 0.6f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    memset(data, 0, sampleCount * sizeof(short));
    
    // Arpeggio sound: root -> third -> fifth -> octave
    float notes[4] = { 440.0f, 554.37f, 659.25f, 880.0f };
    int noteSamples = sampleCount / 4;
    
    for (int n = 0; n < 4; n++) {
        for (int i = 0; i < noteSamples; i++) {
            int idx = n * noteSamples + i;
            float t = (float)i / noteSamples;
            float time = (float)idx / sampleRate;
            float signal = sinf(2.0f * PI * notes[n] * time);
            
            // Overtones for a synth lead sound
            signal += sinf(2.0f * PI * (notes[n] * 2.0f) * time) * 0.3f;
            
            float env = expf(-3.0f * t);
            data[idx] = (short)(signal * env * 0.35f * 32000.0f);
        }
    }
    
    Wave wave = { 0 };
    wave.frameCount = sampleCount;
    wave.sampleRate = sampleRate;
    wave.sampleSize = 16;
    wave.channels = 1;
    wave.data = data;
    
    Sound sound = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return sound;
}

static void InitGameSounds(void) {
    sounds.shoot[WEAPON_PISTOL] = GenerateChirpSound(0.18f, 750.0f, 150.0f, 0.35f, 0.8f);
    sounds.shoot[WEAPON_RIFLE] = GenerateChirpSound(0.14f, 600.0f, 100.0f, 0.45f, 0.75f);
    sounds.shoot[WEAPON_SHOTGUN] = GenerateChirpSound(0.32f, 450.0f, 60.0f, 0.75f, 0.9f);
    sounds.shoot[WEAPON_SNIPER] = GenerateChirpSound(0.45f, 950.0f, 50.0f, 0.5f, 0.95f);
    sounds.reload = GenerateReloadSound();
    sounds.hitNormal = GenerateHitSound(false);
    sounds.hitHead = GenerateHitSound(true);
    sounds.targetDestroyed = GenerateDestroySound();
    sounds.levelUp = GenerateLevelUpSound();
    sounds.fail = GenerateChirpSound(0.5f, 220.0f, 80.0f, 0.6f, 0.8f); // sad slide down
}

static void UnloadGameSounds(void) {
    for (int i = 0; i < WEAPON_COUNT; i++) {
        UnloadSound(sounds.shoot[i]);
    }
    UnloadSound(sounds.reload);
    UnloadSound(sounds.hitNormal);
    UnloadSound(sounds.hitHead);
    UnloadSound(sounds.targetDestroyed);
    UnloadSound(sounds.levelUp);
    UnloadSound(sounds.fail);
}

// Particle System Helpers
static void SpawnSpark(Vector3 pos, Vector3 dir, Color color, float sizeScale) {
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particles[i].active) {
            particles[i].active = true;
            particles[i].position = pos;
            
            float rx = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
            float ry = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
            float rz = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
            
            particles[i].velocity = (Vector3){
                dir.x * 4.0f + rx * 2.0f,
                dir.y * 4.0f + ry * 2.0f + 1.0f,
                dir.z * 4.0f + rz * 2.0f
            };
            
            particles[i].color = color;
            particles[i].size = (0.04f + ((float)rand() / RAND_MAX) * 0.05f) * sizeScale;
            particles[i].maxLife = 0.25f + ((float)rand() / RAND_MAX) * 0.3f;
            particles[i].life = particles[i].maxLife;
            particles[i].hasGravity = true;
            break;
        }
    }
}

static void SpawnSparks(Vector3 pos, Vector3 dir, Color color, int count, float sizeScale) {
    for (int i = 0; i < count; i++) {
        SpawnSpark(pos, dir, color, sizeScale);
    }
}

static void SpawnDust(Vector3 pos, int count) {
    for (int i = 0; i < count; i++) {
        for (int p = 0; p < MAX_PARTICLES; p++) {
            if (!particles[p].active) {
                particles[p].active = true;
                particles[p].position = pos;
                
                float rx = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
                float ry = ((float)rand() / RAND_MAX) * 1.5f + 0.5f; // bounce up
                float rz = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
                
                particles[p].velocity = (Vector3){ rx * 1.2f, ry * 1.8f, rz * 1.2f };
                particles[p].color = (Color){ 130, 130, 150, 255 }; // stone grey
                particles[p].size = 0.06f + ((float)rand() / RAND_MAX) * 0.08f;
                particles[p].maxLife = 0.35f + ((float)rand() / RAND_MAX) * 0.35f;
                particles[p].life = particles[p].maxLife;
                particles[p].hasGravity = true;
                break;
            }
        }
    }
}

static void SpawnDestructionParticles(Vector3 pos, Color color, int count) {
    for (int i = 0; i < count; i++) {
        for (int p = 0; p < MAX_PARTICLES; p++) {
            if (!particles[p].active) {
                particles[p].active = true;
                particles[p].position = pos;
                
                float angle = ((float)rand() / RAND_MAX) * 2.0f * PI;
                float r = ((float)rand() / RAND_MAX) * 4.5f + 1.0f;
                float speedY = ((float)rand() / RAND_MAX) * 5.0f + 2.5f;
                
                particles[p].velocity = (Vector3){ cosf(angle) * r, speedY, sinf(angle) * r };
                particles[p].color = color;
                particles[p].size = 0.12f + ((float)rand() / RAND_MAX) * 0.16f;
                particles[p].maxLife = 0.8f + ((float)rand() / RAND_MAX) * 0.9f;
                particles[p].life = particles[p].maxLife;
                particles[p].hasGravity = true;
                break;
            }
        }
    }
}

static void SpawnLaserMuzzleParticles(Vector3 pos, Vector3 fwd, Color color) {
    for (int i = 0; i < 8; i++) {
        for (int p = 0; p < MAX_PARTICLES; p++) {
            if (!particles[p].active) {
                particles[p].active = true;
                particles[p].position = pos;
                
                float rx = ((float)rand() / RAND_MAX) * 0.2f - 0.1f;
                float ry = ((float)rand() / RAND_MAX) * 0.2f - 0.1f;
                float rz = ((float)rand() / RAND_MAX) * 0.2f - 0.1f;
                
                particles[p].velocity = (Vector3){
                    fwd.x * 6.0f + rx * 2.0f,
                    fwd.y * 6.0f + ry * 2.0f,
                    fwd.z * 6.0f + rz * 2.0f
                };
                
                particles[p].color = color;
                particles[p].size = 0.05f + ((float)rand() / RAND_MAX) * 0.05f;
                particles[p].maxLife = 0.08f + ((float)rand() / RAND_MAX) * 0.1f;
                particles[p].life = particles[p].maxLife;
                particles[p].hasGravity = false;
                break;
            }
        }
    }
}

static void UpdateParticles(float dt) {
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particles[i].active) continue;
        
        if (particles[i].hasGravity) {
            particles[i].velocity.y -= 9.8f * dt;
            
            // Floor bounce
            if (particles[i].position.y < 0.05f) {
                particles[i].position.y = 0.05f;
                particles[i].velocity.y = -particles[i].velocity.y * 0.35f;
                particles[i].velocity.x *= 0.6f;
                particles[i].velocity.z *= 0.6f;
            }
        }
        
        particles[i].position = Vector3Add(particles[i].position, Vector3Scale(particles[i].velocity, dt));
        particles[i].life -= dt;
        
        if (particles[i].life <= 0.0f) {
            particles[i].active = false;
        }
    }
}

// Tracer Helpers
static void SpawnTracer(Vector3 start, Vector3 end) {
    for (int i = 0; i < MAX_TRACERS; i++) {
        if (!tracers[i].active) {
            tracers[i].active = true;
            tracers[i].start = start;
            tracers[i].end = end;
            tracers[i].life = 0.08f;
            tracers[i].maxLife = 0.08f;
            break;
        }
    }
}

static void UpdateTracers(float dt) {
    for (int i = 0; i < MAX_TRACERS; i++) {
        if (!tracers[i].active) continue;
        tracers[i].life -= dt;
        if (tracers[i].life <= 0.0f) {
            tracers[i].active = false;
        }
    }
}

// Floating Text Helpers
static void AddFloatingText(Vector3 pos, const char *text, Color color, float scale) {
    for (int i = 0; i < MAX_FLOATING_TEXTS; i++) {
        if (!floatingTexts[i].active) {
            floatingTexts[i].active = true;
            floatingTexts[i].position = pos;
            snprintf(floatingTexts[i].text, sizeof(floatingTexts[i].text), "%s", text);
            floatingTexts[i].color = color;
            floatingTexts[i].life = 0.85f;
            floatingTexts[i].maxLife = 0.85f;
            floatingTexts[i].speedY = 1.6f;
            floatingTexts[i].scale = scale;
            break;
        }
    }
}

static void UpdateFloatingTexts(float dt) {
    for (int i = 0; i < MAX_FLOATING_TEXTS; i++) {
        if (!floatingTexts[i].active) continue;
        
        floatingTexts[i].position.y += floatingTexts[i].speedY * dt;
        floatingTexts[i].life -= dt;
        
        if (floatingTexts[i].life <= 0.0f) {
            floatingTexts[i].active = false;
        }
    }
}

// Spawn Dummy Logic
static void SpawnDummy(void) {
    target.active = true;
    target.hitFlashTimer = 0.0f;
    target.moveTimer = (float)(rand() % 100);
    
    // Scale properties based on session difficulty
    if (session.currentSession == 5) {
        target.size = 0.45f;    // 35% smaller target!
        target.height = 1.3f;
        target.maxHealth = 200.0f;
    } else if (session.currentSession == 4) {
        target.size = 0.6f;
        target.height = 1.6f;
        target.maxHealth = 150.0f;
    } else if (session.currentSession == 3) {
        target.size = 0.7f;
        target.height = 1.8f;
        target.maxHealth = 120.0f;
    } else {
        target.size = 0.75f;
        target.height = 1.8f;
        target.maxHealth = 100.0f;
    }
    
    target.health = target.maxHealth;
    
    // Position range limits: Behind the shooting line (Z = -8.0f to -20.0f)
    // Left-right bounds (X = -11.0f to +11.0f)
    // Height bounds (Y = floor to 3.5f)
    float rx = ((float)rand() / RAND_MAX) * 20.0f - 10.0f;
    float ry = 1.0f + ((float)rand() / RAND_MAX) * 1.5f; // Head height around 1.8 - 3.3m
    float rz = -11.0f - ((float)rand() / RAND_MAX) * 7.0f; // range: -11.0f to -18.0f
    
    target.position = (Vector3){ rx, ry, rz };
    target.startPosition = target.position;
    
    // Speed setup
    if (session.currentSession == 1) {
        target.velocity = (Vector3){ 0.0f, 0.0f, 0.0f };
    } else if (session.currentSession == 2) {
        // Simple slow horizontal movement
        target.velocity = (Vector3){ 3.5f, 0.0f, 0.0f };
    } else if (session.currentSession == 3) {
        // Fast horizontal
        target.velocity = (Vector3){ 5.5f, 0.0f, 0.0f };
    } else if (session.currentSession == 4) {
        // Erratic 3D bouncing movement
        float ang = ((float)rand() / RAND_MAX) * 2.0f * PI;
        float speed = 7.5f;
        target.velocity = (Vector3){ cosf(ang) * speed, (((float)rand() / RAND_MAX) * 2.0f - 1.0f) * 2.0f, sinf(ang) * speed };
    } else if (session.currentSession == 5) {
        // Hyper erratic bouncing
        float ang = ((float)rand() / RAND_MAX) * 2.0f * PI;
        float speed = 12.0f;
        target.velocity = (Vector3){ cosf(ang) * speed, (((float)rand() / RAND_MAX) * 2.0f - 1.0f) * 4.0f, sinf(ang) * speed };
    }
}

// Teleport target on hit (Extreme Session 5 exclusive mechanics!)
static void TeleportTarget(void) {
    float rx = ((float)rand() / RAND_MAX) * 20.0f - 10.0f;
    float ry = 1.0f + ((float)rand() / RAND_MAX) * 2.0f;
    float rz = -11.0f - ((float)rand() / RAND_MAX) * 7.0f;
    
    target.position = (Vector3){ rx, ry, rz };
    target.startPosition = target.position;
    
    // Re-randomize velocity
    float ang = ((float)rand() / RAND_MAX) * 2.0f * PI;
    float speed = 12.0f;
    target.velocity = (Vector3){ cosf(ang) * speed, (((float)rand() / RAND_MAX) * 2.0f - 1.0f) * 4.0f, sinf(ang) * speed };
    
    // Dust burst at teleport location
    SpawnDust(target.position, 15);
    AddFloatingText(target.position, "*TELEPORT*", CYAN, 0.7f);
}

static void UpdateTarget(float dt) {
    if (!target.active) return;
    
    target.moveTimer += dt;
    
    if (target.hitFlashTimer > 0.0f) {
        target.hitFlashTimer -= dt;
    }
    
    switch (session.currentSession) {
        case 1:
            // Stationary
            target.position = target.startPosition;
            break;
            
        case 2:
            // Oscillating slowly side-to-side on X
            target.position.x = target.startPosition.x + sinf(target.moveTimer * 1.8f) * 7.0f;
            // Bound clamping
            if (target.position.x > 12.0f) target.position.x = 12.0f;
            if (target.position.x < -12.0f) target.position.x = -12.0f;
            break;
            
        case 3:
            // Fast horizontal oscillation + slow depth sweep
            target.position.x = target.startPosition.x + sinf(target.moveTimer * 2.8f) * 9.0f;
            target.position.z = target.startPosition.z + cosf(target.moveTimer * 0.9f) * 3.5f;
            break;
            
        case 4:
        case 5:
            // Bouncing physics movements
            target.position = Vector3Add(target.position, Vector3Scale(target.velocity, dt));
            
            // X boundary collision
            if (target.position.x > 12.0f) {
                target.position.x = 12.0f;
                target.velocity.x = -target.velocity.x;
            } else if (target.position.x < -12.0f) {
                target.position.x = -12.0f;
                target.velocity.x = -target.velocity.x;
            }
            
            // Y boundary collision
            if (target.position.y > 4.5f) {
                target.position.y = 4.5f;
                target.velocity.y = -target.velocity.y;
            } else if (target.position.y < 0.6f) {
                target.position.y = 0.6f;
                target.velocity.y = -target.velocity.y;
            }
            
            // Z boundary collision
            if (target.position.z > -9.5f) {
                target.position.z = -9.5f;
                target.velocity.z = -target.velocity.z;
            } else if (target.position.z < -19.5f) {
                target.position.z = -19.5f;
                target.velocity.z = -target.velocity.z;
            }
            break;
    }
}

// Draw Target
static void DrawTarget(void) {
    if (!target.active) return;
    
    // Choose base color
    Color bodyColor = (Color){ 245, 220, 50, 255 }; // Bright cyber yellow
    Color headColor = (Color){ 220, 40, 40, 255 };  // Red head
    
    if (target.hitFlashTimer > 0.0f) {
        bodyColor = WHITE;
        headColor = WHITE;
    }
    
    Vector3 basePos = { target.position.x, 0.0f, target.position.z };
    
    // Draw stand pole
    DrawCylinderEx(basePos, (Vector3){ target.position.x, target.position.y, target.position.z }, 0.06f, 0.06f, 8, (Color){ 80, 85, 100, 255 });
    DrawCylinderEx(basePos, Vector3Add(basePos, (Vector3){0, 0.15f, 0}), 0.6f, 0.6f, 8, (Color){ 40, 40, 50, 255 });
    
    // Draw torso (metallic billboard shield shape)
    DrawCube((Vector3){ target.position.x, target.position.y, target.position.z }, target.size * 2.0f, target.height, 0.12f, bodyColor);
    
    // Draw Torso Target Rings (bullseye overlay)
    DrawCircle3D((Vector3){ target.position.x, target.position.y, target.position.z + 0.07f }, target.size * 0.6f, (Vector3){ 0, 0, 1 }, 90.0f, (Color){ 20, 20, 25, 255 });
    DrawCircle3D((Vector3){ target.position.x, target.position.y, target.position.z + 0.08f }, target.size * 0.35f, (Vector3){ 0, 0, 1 }, 90.0f, RED);
    DrawCircle3D((Vector3){ target.position.x, target.position.y, target.position.z + 0.09f }, target.size * 0.12f, (Vector3){ 0, 0, 1 }, 90.0f, GOLD);
    
    // Draw head segment
    Vector3 headPos = { target.position.x, target.position.y + target.height / 2.0f + target.size * 0.35f, target.position.z };
    DrawSphere(headPos, target.size * 0.35f, headColor);
    
    // Head target bullseye
    DrawCircle3D((Vector3){ headPos.x, headPos.y, headPos.z + target.size * 0.36f }, target.size * 0.15f, (Vector3){ 0, 0, 1 }, 90.0f, GOLD);
    
    // Hologram connection line indicator (Session 5 teleports)
    if (session.currentSession == 5) {
        DrawCylinderWiresEx(target.position, headPos, target.size * 0.8f, target.size * 0.3f, 8, (Color){ 0, 255, 255, 60 });
    }
}

// Ray-Plane Intersection Helper
static bool RayIntersectPlane(Ray ray, Vector3 pNormal, Vector3 pPoint, Vector3 *hitPoint, float *distance) {
    float denom = Vector3DotProduct(pNormal, ray.direction);
    if (fabs(denom) > 0.0001f) {
        float t = Vector3DotProduct(Vector3Subtract(pPoint, ray.position), pNormal) / denom;
        if (t >= 0.0f) {
            *distance = t;
            *hitPoint = Vector3Add(ray.position, Vector3Scale(ray.direction, t));
            return true;
        }
    }
    return false;
}

// Find closest intersection on room walls/floor
static Vector3 FindClosestWallHit(Ray ray) {
    Vector3 closestPoint = Vector3Add(ray.position, Vector3Scale(ray.direction, 80.0f)); // Default end point
    float minDistance = 80.0f;
    
    Vector3 normal, point, hitPoint;
    float dist;
    
    // Floor: Y = 0
    normal = (Vector3){ 0, 1, 0 };
    point = (Vector3){ 0, 0, 0 };
    if (RayIntersectPlane(ray, normal, point, &hitPoint, &dist) && dist < minDistance) {
        minDistance = dist;
        closestPoint = hitPoint;
    }
    
    // Ceiling: Y = 10
    normal = (Vector3){ 0, -1, 0 };
    point = (Vector3){ 0, 10.0f, 0 };
    if (RayIntersectPlane(ray, normal, point, &hitPoint, &dist) && dist < minDistance) {
        minDistance = dist;
        closestPoint = hitPoint;
    }
    
    // Back Wall: Z = -20
    normal = (Vector3){ 0, 0, 1 };
    point = (Vector3){ 0, 0, -20.0f };
    if (RayIntersectPlane(ray, normal, point, &hitPoint, &dist) && dist < minDistance) {
        minDistance = dist;
        closestPoint = hitPoint;
    }
    
    // Left Wall: X = -15
    normal = (Vector3){ 1, 0, 0 };
    point = (Vector3){ -15.0f, 0, 0 };
    if (RayIntersectPlane(ray, normal, point, &hitPoint, &dist) && dist < minDistance) {
        minDistance = dist;
        closestPoint = hitPoint;
    }
    
    // Right Wall: X = 15
    normal = (Vector3){ -1, 0, 0 };
    point = (Vector3){ 15.0f, 0, 0 };
    if (RayIntersectPlane(ray, normal, point, &hitPoint, &dist) && dist < minDistance) {
        minDistance = dist;
        closestPoint = hitPoint;
    }
    
    // Front Wall: Z = 15
    normal = (Vector3){ 0, 0, -1 };
    point = (Vector3){ 0, 0, 15.0f };
    if (RayIntersectPlane(ray, normal, point, &hitPoint, &dist) && dist < minDistance) {
        minDistance = dist;
        closestPoint = hitPoint;
    }
    
    return closestPoint;
}

// Setup and reset gameplay state
static void ResetSession(int newSession) {
    session.currentSession = newSession;
    session.sessionTimer = 45.0f;
    session.targetsDestroyed = 0;
    session.bulletsFired = 0;
    session.bulletsHit = 0;
    session.sessionActive = true;
    session.state = STATE_PLAYING;
    session.stateTimer = 0.0f;
    
    // Clear particles, tracers, and texts
    memset(particles, 0, sizeof(particles));
    memset(tracers, 0, sizeof(tracers));
    memset(floatingTexts, 0, sizeof(floatingTexts));
    
    // Set target counts
    switch (newSession) {
        case 1: session.targetsRequired = 3; break;
        case 2: session.targetsRequired = 4; break;
        case 3: session.targetsRequired = 4; break;
        case 4: session.targetsRequired = 5; break;
        case 5: session.targetsRequired = 6; break;
        default: session.targetsRequired = 5; break;
    }
    
    SpawnDummy();
    PlaySound(sounds.levelUp);
}

static void InitializeGame(void) {
    srand((unsigned int)time(NULL));
    
    player.position = (Vector3){ 0.0f, 1.8f, 10.0f }; // Eyes at 1.8m
    player.velocityY = 0.0f;
    player.isGrounded = true;
    player.yaw = PI; // Facing -Z (straight ahead at start)
    player.pitch = 0.0f;
    player.bobTimer = 0.0f;
    player.speed = 5.5f;
    
    // Give player Pistol at start
    player.weapon.type = WEAPON_PISTOL;
    player.weapon.ammoClip = weaponInfos[WEAPON_PISTOL].maxClip;
    player.weapon.ammoReserve = weaponInfos[WEAPON_PISTOL].maxReserve;
    player.weapon.shootCooldown = 0.0f;
    player.weapon.reloadTimer = 0.0f;
    player.weapon.recoilOffset = 0.0f;
    player.weapon.recoilAngle = 0.0f;
    
    session.score = 0;
    session.currentSession = 1;
    session.sessionActive = false;
    session.state = STATE_TITLE;
    
    // Set up pedestals: Z = 4.0f
    pedestals[WEAPON_PISTOL] = (WeaponPedestal){ { -6.5f, 0.0f, 4.0f }, WEAPON_PISTOL, "PISTOL" };
    pedestals[WEAPON_RIFLE] = (WeaponPedestal){ { -2.0f, 0.0f, 4.0f }, WEAPON_RIFLE, "RIFLE" };
    pedestals[WEAPON_SHOTGUN] = (WeaponPedestal){ { 2.0f, 0.0f, 4.0f }, WEAPON_SHOTGUN, "SHOTGUN" };
    pedestals[WEAPON_SNIPER] = (WeaponPedestal){ { 6.5f, 0.0f, 4.0f }, WEAPON_SNIPER, "SNIPER" };
    
    target.active = false;
}

// Collisions with pedestals and control panel
static void ResolvePlayerCollisions(void) {
    // Pedestal bounding spheres (approximated as cylinders in X-Z plane)
    float playerRadius = 0.5f;
    
    // Pedestals
    for (int i = 0; i < WEAPON_COUNT; i++) {
        Vector3 pedPos = pedestals[i].position;
        // Pedestal is 0.8x0.8 box. Resolve in 2D (X/Z)
        float minX = pedPos.x - 0.45f;
        float maxX = pedPos.x + 0.45f;
        float minZ = pedPos.z - 0.45f;
        float maxZ = pedPos.z + 0.45f;
        
        float closestX = fmaxf(minX, fminf(player.position.x, maxX));
        float closestZ = fmaxf(minZ, fminf(player.position.z, maxZ));
        
        float dx = player.position.x - closestX;
        float dz = player.position.z - closestZ;
        float distSqr = dx * dx + dz * dz;
        
        if (distSqr < playerRadius * playerRadius) {
            float dist = sqrtf(distSqr);
            if (dist == 0.0f) {
                player.position.z = maxZ + playerRadius;
            } else {
                float push = playerRadius - dist;
                player.position.x += (dx / dist) * push;
                player.position.z += (dz / dist) * push;
            }
        }
    }
    
    // Control console: at X=0, Y=0, Z=-6.5f (shooting boundary desk)
    // Size: X = 14.0f (makes a nice shooting fence), Z = 0.6f
    {
        float minX = -15.0f;
        float maxX = 15.0f;
        float minZ = -7.0f;
        float maxZ = -6.4f;
        
        float closestX = fmaxf(minX, fminf(player.position.x, maxX));
        float closestZ = fmaxf(minZ, fminf(player.position.z, maxZ));
        
        float dx = player.position.x - closestX;
        float dz = player.position.z - closestZ;
        float distSqr = dx * dx + dz * dz;
        
        if (distSqr < playerRadius * playerRadius) {
            // Since this is a barrier fence, push player backwards (+Z)
            player.position.z = maxZ + playerRadius;
        }
    }
}

// Shooting raycast calculation
static void FireActiveWeapon(Vector3 camPos, Vector3 camFwd, Vector3 camUp) {
    WeaponInfo info = weaponInfos[player.weapon.type];
    player.weapon.ammoClip--;
    player.weapon.shootCooldown = info.fireRate;
    player.weapon.recoilOffset = 0.18f;
    player.weapon.recoilAngle += info.recoilKick;
    
    PlaySound(sounds.shoot[player.weapon.type]);
    
    if (session.sessionActive) {
        session.bulletsFired++;
    }
    
    // Calculate tracer start (approximate muzzle location)
    Vector3 rgt = Vector3Normalize(Vector3CrossProduct(camFwd, camUp));
    Vector3 muzzlePos = camPos;
    muzzlePos = Vector3Add(muzzlePos, Vector3Scale(camFwd, 0.7f));
    muzzlePos = Vector3Add(muzzlePos, Vector3Scale(rgt, 0.25f));
    muzzlePos = Vector3Add(muzzlePos, Vector3Scale(camUp, -0.22f));
    
    // Spark particles at muzzle
    SpawnLaserMuzzleParticles(muzzlePos, camFwd, info.color);
    
    bool registeredHit = false;
    bool registeredHeadshot = false;
    
    for (int p = 0; p < info.pelletCount; p++) {
        // Calculate random spread direction
        float spread = info.spread;
        if (player.isMoving) spread *= 2.0f;
        if (!player.isGrounded) spread *= 4.0f;
        
        Vector3 sideDir = Vector3Normalize(Vector3CrossProduct(camFwd, camUp));
        Vector3 vertDir = Vector3CrossProduct(sideDir, camFwd);
        
        float spreadAngle = ((float)rand() / RAND_MAX) * 2.0f * PI;
        float spreadRadius = ((float)rand() / RAND_MAX) * spread;
        
        Vector3 finalDir = camFwd;
        finalDir = Vector3Add(finalDir, Vector3Scale(sideDir, cosf(spreadAngle) * spreadRadius));
        finalDir = Vector3Add(finalDir, Vector3Scale(vertDir, sinf(spreadAngle) * spreadRadius));
        finalDir = Vector3Normalize(finalDir);
        
        Ray ray = { camPos, finalDir };
        
        // Raycast against targets if target is active
        if (target.active) {
            // Torso box
            BoundingBox torsoBox = {
                (Vector3){ target.position.x - target.size, target.position.y - target.height / 2.0f, target.position.z - 0.12f },
                (Vector3){ target.position.x + target.size, target.position.y + target.height / 2.0f, target.position.z + 0.12f }
            };
            
            // Head sphere
            Vector3 headPos = { target.position.x, target.position.y + target.height / 2.0f + target.size * 0.35f, target.position.z };
            float headRadius = target.size * 0.35f;
            
            RayCollision headCol = GetRayCollisionSphere(ray, headPos, headRadius);
            RayCollision torsoCol = GetRayCollisionBox(ray, torsoBox);
            
            float targetHitDist = 999.0f;
            bool hitHead = false;
            bool hitTorso = false;
            Vector3 hitPoint = { 0 };
            
            if (headCol.hit && headCol.distance < targetHitDist) {
                targetHitDist = headCol.distance;
                hitPoint = headCol.point;
                hitHead = true;
            }
            if (torsoCol.hit && torsoCol.distance < targetHitDist) {
                targetHitDist = torsoCol.distance;
                hitPoint = torsoCol.point;
                hitHead = false;
                hitTorso = true;
            }
            
            // Raycast against walls to see if wall is closer than target (e.g. shooting through a block if block collision exists, or target is behind range wall?)
            float wallDist = 999.0f;
            Vector3 wallHit = FindClosestWallHit(ray);
            wallDist = Vector3Distance(camPos, wallHit);
            
            if ((hitHead || hitTorso) && targetHitDist < wallDist) {
                // Register hit on target
                float damageDealt = info.damage;
                if (hitHead) {
                    damageDealt *= 2.0f;
                    registeredHeadshot = true;
                }
                
                target.health -= damageDealt;
                target.hitFlashTimer = 0.12f;
                registeredHit = true;
                
                // Spawn target sparks
                SpawnSparks(hitPoint, Vector3Scale(finalDir, -1.0f), hitHead ? RED : info.color, 12, hitHead ? 1.4f : 0.9f);
                SpawnLaserMuzzleParticles(hitPoint, Vector3Scale(finalDir, -0.5f), WHITE);
                
                // Floating text
                char dmgText[16];
                sprintf(dmgText, "-%.0f", damageDealt);
                AddFloatingText(hitPoint, dmgText, hitHead ? RED : GOLD, hitHead ? 1.3f : 0.9f);
                if (hitHead) {
                    AddFloatingText(Vector3Add(hitPoint, (Vector3){0, 0.4f, 0}), "CRITICAL!", RED, 0.7f);
                }
                
                // Tracer
                SpawnTracer(muzzlePos, hitPoint);
                
                // Check death
                if (target.health <= 0.0f) {
                    target.active = false;
                    PlaySound(sounds.targetDestroyed);
                    SpawnDestructionParticles(target.position, (Color){ 245, 220, 50, 255 }, 40);
                    SpawnDestructionParticles(headPos, RED, 15);
                    
                    if (session.sessionActive) {
                        session.targetsDestroyed++;
                        int scoreGain = 100 + session.currentSession * 25;
                        if (hitHead) scoreGain += 50; // Headshot bonus
                        
                        session.score += scoreGain;
                        char scoreText[32];
                        sprintf(scoreText, "+%d PTS", scoreGain);
                        AddFloatingText(target.position, scoreText, LIME, 1.2f);
                        
                        if (session.targetsDestroyed >= session.targetsRequired) {
                            // Completed Session!
                            session.sessionActive = false;
                            if (session.currentSession >= 5) {
                                session.state = STATE_VICTORY;
                                if (session.score > session.highScore) {
                                    session.highScore = session.score;
                                }
                                PlaySound(sounds.levelUp);
                            } else {
                                session.state = STATE_SESSION_CLEAR;
                                session.stateTimer = 0.0f;
                                PlaySound(sounds.levelUp);
                            }
                        } else {
                            // Spawn next target dummy
                            SpawnDummy();
                        }
                    }
                } else {
                    // Teleport mechanic for level 5
                    if (session.sessionActive && session.currentSession == 5) {
                        TeleportTarget();
                    }
                }
                
                // Done processing this pellet hit
                continue;
            }
        }
        
        // If it missed the target, trace to the room wall
        Vector3 wallHit = FindClosestWallHit(ray);
        SpawnTracer(muzzlePos, wallHit);
        
        // Spawn sparks/dust on wall hit
        SpawnDust(wallHit, 6);
        SpawnSparks(wallHit, (Vector3){ 0, 1.0f, 0 }, (Color){ 160, 160, 180, 255 }, 4, 0.7f);
    }
    
    if (registeredHit) {
        if (session.sessionActive) {
            session.bulletsHit++;
        }
        hitmarkerTimer = 0.12f;
        hitmarkerHeadshot = registeredHeadshot;
        PlaySound(registeredHeadshot ? sounds.hitHead : sounds.hitNormal);
    }
}

// 3D FPS Weapon Rendering (Procedural camera-relative space using rlgl)
static void DrawFPSWeapon(Camera3D cam, float yaw, float pitch) {
    ActiveWeapon active = player.weapon;
    WeaponInfo info = weaponInfos[active.type];
    
    rlPushMatrix();
    
    // Position matrix at camera eye position
    rlTranslatef(cam.position.x, cam.position.y, cam.position.z);
    
    // Rotate to align with look yaw (horizontal) and pitch (vertical)
    rlRotatef((yaw - PI) * RAD2DEG, 0, 1, 0);
    rlRotatef(pitch * RAD2DEG, 1, 0, 0);
    
    // Weapon bobbing calculations
    float bobX = 0.0f;
    float bobY = 0.0f;
    if (player.isMoving && player.isGrounded) {
        bobX = sinf(player.bobTimer * 1.5f) * 0.012f;
        bobY = cosf(player.bobTimer * 3.0f) * 0.008f;
    }
    
    // Recoil and Reload offsets in local coordinates
    float recoilZ = active.recoilOffset; // kicks backwards
    float reloadY = 0.0f;                // slides downwards during reload
    
    if (active.reloadTimer > 0.0f) {
        float reloadProgress = 1.0f - (active.reloadTimer / info.reloadTime);
        // Sinusoidal reload dip movement
        reloadY = sinf(reloadProgress * PI) * -0.35f;
    }
    
    // Apply local positioning offset (Right, Down, Forward)
    // In OpenGL: +X is Right, +Y is Up, -Z is Forward
    rlTranslatef(0.18f + bobX, -0.22f + bobY + reloadY, -0.42f + recoilZ);
    
    // Draw Weapon Components based on type
    switch (active.type) {
        case WEAPON_PISTOL: {
            // Main receiver
            DrawCube((Vector3){ 0, 0, 0 }, 0.05f, 0.08f, 0.2f, info.color);
            // Handle/Grip
            DrawCube((Vector3){ 0, -0.06f, 0.04f }, 0.045f, 0.1f, 0.06f, BLACK);
            // Barrel (laser ejector)
            DrawCube((Vector3){ 0, 0.02f, -0.14f }, 0.035f, 0.035f, 0.18f, DARKGRAY);
            // Glowing lines
            DrawCube((Vector3){ 0, 0.03f, -0.02f }, 0.052f, 0.01f, 0.16f, CYAN);
            
            // Brief Muzzle Flash sphere
            if (active.shootCooldown > info.fireRate - 0.05f) {
                DrawSphere((Vector3){ 0, 0.02f, -0.25f }, 0.06f, (Color){ 255, 230, 100, 200 });
            }
            break;
        }
        case WEAPON_RIFLE: {
            // Main frame
            DrawCube((Vector3){ 0, 0.01f, 0.05f }, 0.06f, 0.09f, 0.45f, info.color);
            // Heavy Barrel
            DrawCube((Vector3){ 0, 0.02f, -0.28f }, 0.04f, 0.04f, 0.4f, DARKGRAY);
            // Mag clip (angled forward slightly)
            DrawCube((Vector3){ 0, -0.11f, -0.05f }, 0.04f, 0.14f, 0.07f, BLACK);
            // Rear Stock
            DrawCube((Vector3){ 0, -0.01f, 0.32f }, 0.05f, 0.08f, 0.15f, BLACK);
            // Holographic sight
            DrawCube((Vector3){ 0, 0.07f, -0.05f }, 0.03f, 0.04f, 0.08f, BLACK);
            DrawCube((Vector3){ 0, 0.07f, -0.05f }, 0.02f, 0.02f, 0.09f, GREEN);
            
            // Muzzle Flash
            if (active.shootCooldown > info.fireRate - 0.05f) {
                DrawSphere((Vector3){ 0, 0.02f, -0.5f }, 0.1f, (Color){ 100, 255, 120, 200 });
            }
            break;
        }
        case WEAPON_SHOTGUN: {
            // Wood barrel pump body
            DrawCube((Vector3){ 0, -0.01f, 0.05f }, 0.07f, 0.09f, 0.42f, info.color);
            // Double Steel Barrels
            DrawCube((Vector3){ -0.02f, 0.02f, -0.28f }, 0.035f, 0.035f, 0.5f, DARKGRAY);
            DrawCube((Vector3){ 0.02f, 0.02f, -0.28f }, 0.035f, 0.035f, 0.5f, DARKGRAY);
            // Grip Slider
            float pumpMove = 0.0f;
            if (active.shootCooldown > info.fireRate * 0.5f) {
                // Pump action slide animation!
                float pt = (active.shootCooldown - info.fireRate * 0.5f) / (info.fireRate * 0.5f);
                pumpMove = sinf(pt * PI) * 0.12f;
            }
            DrawCube((Vector3){ 0, -0.02f, -0.12f + pumpMove }, 0.075f, 0.06f, 0.18f, BLACK);
            // Heavy stock
            DrawCube((Vector3){ 0, -0.05f, 0.35f }, 0.065f, 0.11f, 0.25f, info.color);
            
            // Muzzle Flash
            if (active.shootCooldown > info.fireRate - 0.05f) {
                DrawSphere((Vector3){ 0, 0.02f, -0.56f }, 0.15f, (Color){ 255, 160, 50, 200 });
            }
            break;
        }
        case WEAPON_SNIPER: {
            // Futuristic railframe chassis
            DrawCube((Vector3){ 0, 0.02f, 0.1f }, 0.07f, 0.12f, 0.65f, info.color);
            // Extended long rail barrel
            DrawCube((Vector3){ 0, 0.03f, -0.45f }, 0.03f, 0.03f, 0.75f, BLACK);
            // Massive scope
            DrawCube((Vector3){ 0, 0.11f, -0.05f }, 0.05f, 0.05f, 0.24f, BLACK);
            // Scope lenses glowing red
            DrawSphere((Vector3){ 0, 0.11f, -0.17f }, 0.024f, MAGENTA);
            // Stock
            DrawCube((Vector3){ 0, -0.02f, 0.5f }, 0.06f, 0.1f, 0.25f, BLACK);
            
            // Large flash
            if (active.shootCooldown > info.fireRate - 0.05f) {
                DrawSphere((Vector3){ 0, 0.03f, -0.85f }, 0.18f, (Color){ 220, 100, 255, 220 });
            }
            break;
        }
        default: break;
    }
    
    rlPopMatrix();
}

// Draw Weapon Pedestals in World
static void DrawPedestals(Camera3D camera) {
    for (int i = 0; i < WEAPON_COUNT; i++) {
        Vector3 pos = pedestals[i].position;
        WeaponType type = pedestals[i].weaponType;
        WeaponInfo info = weaponInfos[type];
        
        // Base box (Dark cyber structure)
        DrawCube((Vector3){ pos.x, 0.4f, pos.z }, 0.8f, 0.8f, 0.8f, (Color){ 25, 25, 35, 255 });
        DrawCubeWires((Vector3){ pos.x, 0.4f, pos.z }, 0.8f, 0.8f, 0.8f, info.color);
        
        // Neon top cover plate
        DrawCube((Vector3){ pos.x, 0.81f, pos.z }, 0.82f, 0.02f, 0.82f, info.color);
        
        // Draw floating rotating gun model above pedestal
        float hoverOffset = sinf(GetTime() * 2.2f) * 0.05f;
        Vector3 gunPos = { pos.x, 1.15f + hoverOffset, pos.z };
        float rotation = GetTime() * 45.0f;
        
        rlPushMatrix();
        rlTranslatef(gunPos.x, gunPos.y, gunPos.z);
        rlRotatef(rotation, 0, 1, 0);
        
        // Draw the local scale gun
        switch (type) {
            case WEAPON_PISTOL:
                DrawCube((Vector3){ 0, 0, 0 }, 0.08f, 0.12f, 0.25f, info.color);
                DrawCube((Vector3){ 0, 0.04f, -0.15f }, 0.06f, 0.06f, 0.22f, DARKGRAY);
                break;
            case WEAPON_RIFLE:
                DrawCube((Vector3){ 0, 0, 0 }, 0.09f, 0.14f, 0.65f, info.color);
                DrawCube((Vector3){ 0, 0.03f, -0.38f }, 0.06f, 0.06f, 0.45f, DARKGRAY);
                DrawCube((Vector3){ 0, -0.18f, -0.1f }, 0.07f, 0.22f, 0.1f, BLACK);
                break;
            case WEAPON_SHOTGUN:
                DrawCube((Vector3){ 0, 0, 0 }, 0.1f, 0.13f, 0.75f, info.color);
                DrawCube((Vector3){ 0, 0.03f, -0.42f }, 0.08f, 0.07f, 0.55f, DARKGRAY);
                break;
            case WEAPON_SNIPER:
                DrawCube((Vector3){ 0, 0, 0 }, 0.1f, 0.16f, 0.85f, info.color);
                DrawCube((Vector3){ 0, 0.04f, -0.52f }, 0.05f, 0.05f, 0.75f, BLACK);
                DrawCube((Vector3){ 0, 0.15f, -0.05f }, 0.08f, 0.08f, 0.35f, DARKGRAY);
                break;
            default: break;
        }
        rlPopMatrix();

        // Volumetric hover light shaft (Semi-transparent cyan/neon cylinder projection drawn AFTER the gun so it doesn't mask the depth buffer)
        Color beamCol = info.color;
        beamCol.a = 25;
        DrawCylinderEx((Vector3){ pos.x, 0.82f, pos.z }, (Vector3){ pos.x, 4.0f, pos.z }, 0.38f, 0.2f, 12, beamCol);
    }
}

// Main Update Loop
static void UpdateGame(float dt) {
    // Escape or Alt-Enter pauses cursor
    if (IsKeyPressed(KEY_ESCAPE) || IsKeyPressed(KEY_P)) {
        if (IsCursorHidden()) EnableCursor();
        else DisableCursor();
    }
    
    // Toggle cursor on click inside window
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && !IsCursorHidden() && session.state == STATE_PLAYING) {
        DisableCursor();
    }
    
    switch (session.state) {
        case STATE_TITLE: {
            if (IsKeyPressed(KEY_ENTER)) {
                InitializeGame();
                session.state = STATE_PLAYING;
                DisableCursor();
            }
            break;
        }
        case STATE_PLAYING: {
            // 1. First-Person Camera Mouse Looking
            if (IsCursorHidden()) {
                Vector2 mouseDelta = GetMouseDelta();
                player.yaw -= mouseDelta.x * 0.0022f;
                player.pitch -= mouseDelta.y * 0.0022f;
                
                // Clamp pitch
                if (player.pitch > 85.0f * DEG2RAD) player.pitch = 85.0f * DEG2RAD;
                if (player.pitch < -85.0f * DEG2RAD) player.pitch = -85.0f * DEG2RAD;
            }
            
            // 2. Keyboard Movement (W, A, S, D)
            // Calculate horizontal movement relative to yaw angle
            Vector3 fwd = { sinf(player.yaw), 0.0f, cosf(player.yaw) };
            Vector3 rgt = { -cosf(player.yaw), 0.0f, sinf(player.yaw) };
            Vector3 moveDir = { 0 };
            
            if (IsKeyDown(KEY_W)) moveDir = Vector3Add(moveDir, fwd);
            if (IsKeyDown(KEY_S)) moveDir = Vector3Subtract(moveDir, fwd);
            if (IsKeyDown(KEY_D)) moveDir = Vector3Add(moveDir, rgt);
            if (IsKeyDown(KEY_A)) moveDir = Vector3Subtract(moveDir, rgt);
            
            float moveLen = Vector3Length(moveDir);
            player.isMoving = (moveLen > 0.0f);
            
            if (player.isMoving) {
                moveDir = Vector3Normalize(moveDir);
                player.position = Vector3Add(player.position, Vector3Scale(moveDir, player.speed * dt));
                
                if (player.isGrounded) {
                    player.bobTimer += dt * 11.5f;
                }
            }
            
            // 3. Jump & Vertical Gravity Physics
            if (IsKeyPressed(KEY_SPACE) && player.isGrounded) {
                player.velocityY = 5.2f; // Jump acceleration
                player.isGrounded = false;
            }
            
            if (!player.isGrounded) {
                player.velocityY -= 14.5f * dt; // Gravity
                player.position.y += player.velocityY * dt;
                
                // Floor limit
                if (player.position.y <= 1.8f) {
                    player.position.y = 1.8f;
                    player.velocityY = 0.0f;
                    player.isGrounded = true;
                }
            }
            
            // 4. Room Bound constraints (Shooting line at Z = -6.5f)
            // Players cannot walk past shooting line into target zone
            if (player.position.x < -14.2f) player.position.x = -14.2f;
            if (player.position.x > 14.2f) player.position.x = 14.2f;
            if (player.position.z < -6.0f) player.position.z = -6.0f; // Limit forward walk
            if (player.position.z > 14.2f) player.position.z = 14.2f;
            
            ResolvePlayerCollisions();
            
            // 5. Weapon Logic updates
            ActiveWeapon *aw = &player.weapon;
            WeaponInfo info = weaponInfos[aw->type];
            
            if (aw->shootCooldown > 0.0f) aw->shootCooldown -= dt;
            if (aw->recoilOffset > 0.0f) {
                aw->recoilOffset -= dt * 6.5f;
                if (aw->recoilOffset < 0.0f) aw->recoilOffset = 0.0f;
            }
            
            // Return visual camera recoil back to normal
            aw->recoilAngle -= aw->recoilAngle * 10.0f * dt;
            if (aw->recoilAngle < 0.001f) aw->recoilAngle = 0.0f;
            
            // Reload countdown
            if (aw->reloadTimer > 0.0f) {
                aw->reloadTimer -= dt;
                if (aw->reloadTimer <= 0.0f) {
                    // Complete Reloading
                    int need = info.maxClip - aw->ammoClip;
                    int load = (need < aw->ammoReserve) ? need : aw->ammoReserve;
                    aw->ammoClip += load;
                    aw->ammoReserve -= load;
                }
            }
            
            // 6. User Weapons Interactions (Shooting, Reloading, Swapping)
            // Shooting
            bool wantsToShoot = false;
            if (aw->type == WEAPON_RIFLE) {
                wantsToShoot = IsMouseButtonDown(MOUSE_BUTTON_LEFT); // Auto
            } else {
                wantsToShoot = IsMouseButtonPressed(MOUSE_BUTTON_LEFT); // Semi
            }
            
            Camera3D activeCam = { 0 };
            activeCam.position = player.position;
            
            // Add bobbing to visual height
            if (player.isMoving && player.isGrounded) {
                activeCam.position.y += sinf(player.bobTimer) * 0.05f;
            }
            
            float targetPitch = player.pitch + aw->recoilAngle;
            Vector3 camFwd = {
                cosf(targetPitch) * sinf(player.yaw),
                sinf(targetPitch),
                cosf(targetPitch) * cosf(player.yaw)
            };
            activeCam.target = Vector3Add(activeCam.position, camFwd);
            activeCam.up = (Vector3){ 0.0f, 1.0f, 0.0f };
            activeCam.fovy = 75.0f;
            activeCam.projection = CAMERA_PERSPECTIVE;
            
            if (wantsToShoot && IsCursorHidden()) {
                if (aw->ammoClip > 0 && aw->reloadTimer <= 0.0f && aw->shootCooldown <= 0.0f) {
                    FireActiveWeapon(activeCam.position, camFwd, activeCam.up);
                } else if (aw->ammoClip == 0 && aw->reloadTimer <= 0.0f && aw->ammoReserve > 0) {
                    // Auto reload on dry fire
                    aw->reloadTimer = info.reloadTime;
                    PlaySound(sounds.reload);
                }
            }
            
            // Reload trigger
            if (IsKeyPressed(KEY_R) && aw->reloadTimer <= 0.0f && aw->ammoClip < info.maxClip && aw->ammoReserve > 0) {
                aw->reloadTimer = info.reloadTime;
                PlaySound(sounds.reload);
            }
            
            // Swapping weapons at pedestals
            for (int i = 0; i < WEAPON_COUNT; i++) {
                Vector3 gunPos = (Vector3){ pedestals[i].position.x, 1.15f, pedestals[i].position.z };
                float dist = Vector3Distance(player.position, gunPos);
                if (dist < 2.2f) {
                    // Calculate if player is looking at the gun model in 3D
                    Vector3 toGun = Vector3Subtract(gunPos, player.position);
                    toGun = Vector3Normalize(toGun);
                    float viewDot = Vector3DotProduct(camFwd, toGun);
                    
                    if (viewDot > 0.65f) {
                        // Prompt available, swap weapon on 'E'
                        if (IsKeyPressed(KEY_E) && aw->type != pedestals[i].weaponType) {
                            WeaponType nextType = pedestals[i].weaponType;
                            aw->type = nextType;
                            aw->ammoClip = weaponInfos[nextType].maxClip;
                            aw->ammoReserve = weaponInfos[nextType].maxReserve;
                            aw->reloadTimer = 0.0f;
                            aw->shootCooldown = 0.0f;
                            
                            AddFloatingText(gunPos, weaponInfos[nextType].name, CYAN, 1.1f);
                            PlaySound(sounds.reload); // Click pickup sound
                        }
                    }
                }
            }
            
            // Check Start Session button trigger (Console at center range X=0, Z=-6.5f)
            if (!session.sessionActive) {
                Vector3 consoleScreenPos = (Vector3){ 0.0f, 0.95f, -6.5f };
                float distToConsole = Vector3Distance(player.position, consoleScreenPos);
                if (distToConsole < 2.5f) {
                    Vector3 toCon = Vector3Subtract(consoleScreenPos, player.position);
                    toCon = Vector3Normalize(toCon);
                    float viewDot = Vector3DotProduct(camFwd, toCon);
                    if (viewDot > 0.65f && IsKeyPressed(KEY_E)) {
                        ResetSession(session.currentSession);
                    }
                }
            }
            
            // 7. Update Session level logic
            if (session.sessionActive) {
                session.sessionTimer -= dt;
                
                if (session.sessionTimer <= 0.0f) {
                    session.sessionActive = false;
                    session.state = STATE_GAME_OVER;
                    if (session.score > session.highScore) {
                        session.highScore = session.score;
                    }
                    PlaySound(sounds.fail);
                    EnableCursor();
                }
            }
            
            // 8. Update Target dummy
            UpdateTarget(dt);
            break;
        }
        
        case STATE_SESSION_CLEAR: {
            session.stateTimer += dt;
            if (IsKeyPressed(KEY_ENTER) && session.stateTimer > 0.5f) {
                ResetSession(session.currentSession + 1);
                DisableCursor();
            }
            break;
        }
        
        case STATE_GAME_OVER: {
            if (IsKeyPressed(KEY_ENTER)) {
                InitializeGame();
                session.state = STATE_PLAYING;
                DisableCursor();
            }
            break;
        }
        
        case STATE_VICTORY: {
            if (IsKeyPressed(KEY_ENTER)) {
                InitializeGame();
                session.state = STATE_TITLE;
            }
            break;
        }
    }
    
    // Dynamic crosshair logic (spreads with movement and reload/recoil)
    float targetSpread = 0.0f;
    if (player.isMoving) targetSpread += 15.0f;
    if (!player.isGrounded) targetSpread += 40.0f;
    targetSpread += player.weapon.recoilAngle * 400.0f;
    if (player.weapon.reloadTimer > 0.0f) targetSpread += 25.0f;
    
    crosshairSpread += (targetSpread - crosshairSpread) * 12.0f * dt;
    if (hitmarkerTimer > 0.0f) hitmarkerTimer -= dt;
    
    // 9. Update floating texts, tracers and physics particles
    UpdateFloatingTexts(dt);
    UpdateTracers(dt);
    UpdateParticles(dt);
}

// 2D Draw HUD / Interface overlays
static void DrawHUD(Camera3D camera) {
    int screenWidth = GetScreenWidth();
    int screenHeight = GetScreenHeight();
    float dt = GetFrameTime();
    
    switch (session.state) {
        case STATE_TITLE: {
            // Draw Title overlay
            DrawRectangle(0, 0, screenWidth, screenHeight, (Color){ 10, 10, 18, 230 });
            
            // Cyber Grid Lines background effect
            for (int i = 0; i < screenHeight; i += 30) {
                DrawLine(0, i, screenWidth, i, (Color){ 0, 100, 255, 30 });
            }
            for (int i = 0; i < screenWidth; i += 50) {
                DrawLine(i, 0, i, screenHeight, (Color){ 0, 100, 255, 30 });
            }
            
            DrawText("CYBER RANGE FPS", screenWidth / 2 - MeasureText("CYBER RANGE FPS", 50) / 2, screenHeight / 4, 50, CYAN);
            DrawText("Practice room simulator built with Raylib & C", screenWidth / 2 - MeasureText("Practice room simulator built with Raylib & C", 20) / 2, screenHeight / 4 + 65, 20, LIGHTGRAY);
            
            // Boxes for details
            int boxW = 550;
            int boxX = screenWidth / 2 - boxW / 2;
            int boxY = screenHeight / 2 - 80;
            DrawRectangleRounded((Rectangle){ boxX, boxY, boxW, 260 }, 0.08f, 6, (Color){ 20, 20, 32, 255 });
            DrawRectangleRoundedLines((Rectangle){ boxX, boxY, boxW, 260 }, 0.08f, 6, BLUE);
            
            DrawText("KEYBOARD CONTROLS:", boxX + 30, boxY + 25, 20, GOLD);
            DrawText("- Move: WASD", boxX + 40, boxY + 55, 18, WHITE);
            DrawText("- Aim / Look: Mouse", boxX + 40, boxY + 80, 18, WHITE);
            DrawText("- Shoot / Select: Left Mouse Button", boxX + 40, boxY + 105, 18, WHITE);
            DrawText("- Reload: R Key", boxX + 40, boxY + 130, 18, WHITE);
            DrawText("- Swap Gun: Walk to pedestal + Press E", boxX + 40, boxY + 155, 18, WHITE);
            DrawText("- Jump: Spacebar", boxX + 40, boxY + 180, 18, WHITE);
            DrawText("- Free Cursor: Press Escape / P Key", boxX + 40, boxY + 205, 18, RED);
            
            DrawText("PRESS [ENTER] TO COMMENCE", screenWidth / 2 - MeasureText("PRESS [ENTER] TO COMMENCE", 22) / 2, screenHeight - 120, 22, GREEN);
            
            break;
        }
        
        case STATE_PLAYING: {
            // 1. Crosshair rendering
            int centerX = screenWidth / 2;
            int centerY = screenHeight / 2;
            float spread = crosshairSpread;
            
            // Draw Reticle lines
            DrawLine(centerX - 12 - (int)spread, centerY, centerX - 4 - (int)spread, centerY, GREEN);
            DrawLine(centerX + 4 + (int)spread, centerY, centerX + 12 + (int)spread, centerY, GREEN);
            DrawLine(centerX, centerY - 12 - (int)spread, centerX, centerY - 4 - (int)spread, GREEN);
            DrawLine(centerX, centerY + 4 + (int)spread, centerX, centerY + 12 + (int)spread, GREEN);
            DrawCircle(centerX, centerY, 1.5f, GREEN); // Tiny dot
            
            // Hitmarker indicator
            if (hitmarkerTimer > 0.0f) {
                Color hitCol = hitmarkerHeadshot ? RED : GOLD;
                float size = 8.0f;
                // Draw diagonal marker ticks
                DrawLine(centerX - size, centerY - size, centerX - 3, centerY - 3, hitCol);
                DrawLine(centerX + size, centerY - size, centerX + 3, centerY - 3, hitCol);
                DrawLine(centerX - size, centerY + size, centerX - 3, centerY + 3, hitCol);
                DrawLine(centerX + size, centerY + size, centerX + 3, centerY + 3, hitCol);
            }
            
            // 2. Headshot / Damage numbers floating billboard conversion
            for (int i = 0; i < MAX_FLOATING_TEXTS; i++) {
                if (!floatingTexts[i].active) continue;
                Vector2 screenPos = GetWorldToScreen(floatingTexts[i].position, camera);
                
                if (screenPos.x > 0 && screenPos.x < screenWidth && screenPos.y > 0 && screenPos.y < screenHeight) {
                    float alpha = floatingTexts[i].life / floatingTexts[i].maxLife;
                    Color textCol = floatingTexts[i].color;
                    textCol.a = (unsigned char)(alpha * 255.0f);
                    
                    int fSize = (int)(24.0f * floatingTexts[i].scale);
                    
                    // Simple drop shadow
                    DrawText(floatingTexts[i].text, (int)screenPos.x - MeasureText(floatingTexts[i].text, fSize) / 2 + 1, (int)screenPos.y - fSize / 2 + 1, fSize, (Color){0,0,0,textCol.a});
                    DrawText(floatingTexts[i].text, (int)screenPos.x - MeasureText(floatingTexts[i].text, fSize) / 2, (int)screenPos.y - fSize / 2, fSize, textCol);
                }
            }
            
            // 3. Swap / Interact prompt overlays
            Vector3 camFwd = {
                cosf(player.pitch) * sinf(player.yaw),
                sinf(player.pitch),
                cosf(player.pitch) * cosf(player.yaw)
            };
            
            // Swap Gun Pedestal prompt
            for (int i = 0; i < WEAPON_COUNT; i++) {
                Vector3 gunPos = (Vector3){ pedestals[i].position.x, 1.15f, pedestals[i].position.z };
                float dist = Vector3Distance(player.position, gunPos);
                if (dist < 2.2f) {
                    Vector3 toGun = Vector3Subtract(gunPos, player.position);
                    toGun = Vector3Normalize(toGun);
                    float viewDot = Vector3DotProduct(camFwd, toGun);
                    
                    if (viewDot > 0.65f) {
                        char prompt[64];
                        sprintf(prompt, "Press E to swap for [%s]", weaponInfos[pedestals[i].weaponType].name);
                        DrawText(prompt, centerX - MeasureText(prompt, 20) / 2, centerY + 45, 20, CYAN);
                    }
                }
            }
            
            // Start Session prompt
            if (!session.sessionActive) {
                Vector3 consoleScreenPos = (Vector3){ 0.0f, 0.95f, -6.5f };
                float distToConsole = Vector3Distance(player.position, consoleScreenPos);
                if (distToConsole < 2.5f) {
                    Vector3 toCon = Vector3Subtract(consoleScreenPos, player.position);
                    toCon = Vector3Normalize(toCon);
                    float viewDot = Vector3DotProduct(camFwd, toCon);
                    if (viewDot > 0.65f) {
                        char prompt[100];
                        sprintf(prompt, "Press [E] to BEGIN Session %d", session.currentSession);
                        DrawText(prompt, centerX - MeasureText(prompt, 20) / 2, centerY + 45, 20, LIME);
                    }
                }
            }
            
            // Reloading HUD bar overlay
            ActiveWeapon aw = player.weapon;
            WeaponInfo info = weaponInfos[aw.type];
            if (aw.reloadTimer > 0.0f) {
                char relText[32];
                sprintf(relText, "RELOADING... %.1fs", aw.reloadTimer);
                DrawText(relText, centerX - MeasureText(relText, 18) / 2, centerY + 70, 18, RED);
                
                float reloadProg = 1.0f - (aw.reloadTimer / info.reloadTime);
                int barW = 120;
                int barH = 6;
                DrawRectangle(centerX - barW/2, centerY + 95, barW, barH, (Color){ 50, 20, 20, 150 });
                DrawRectangle(centerX - barW/2, centerY + 95, (int)(barW * reloadProg), barH, RED);
            }
            
            // 4. Ammo Card overlay (Bottom Right)
            int ammoCardW = 200;
            int ammoCardH = 80;
            int ammoX = screenWidth - ammoCardW - 25;
            int ammoY = screenHeight - ammoCardH - 25;
            
            DrawRectangleRounded((Rectangle){ ammoX, ammoY, ammoCardW, ammoCardH }, 0.12f, 4, (Color){ 20, 20, 30, 200 });
            DrawRectangleRoundedLines((Rectangle){ ammoX, ammoY, ammoCardW, ammoCardH }, 0.12f, 4, info.color);
            
            DrawText("WEAPON AMMO", ammoX + 15, ammoY + 12, 12, LIGHTGRAY);
            DrawText(info.name, ammoX + 15, ammoY + 25, 14, info.color);
            
            char ammoStr[32];
            sprintf(ammoStr, "%d / %d", aw.ammoClip, aw.ammoReserve);
            DrawText(ammoStr, ammoX + 15, ammoY + 42, 26, WHITE);
            
            // Low ammo warning flash
            if (aw.ammoClip == 0 && aw.ammoReserve > 0) {
                if (((int)(GetTime() * 4) % 2) == 0) {
                    DrawText("PRESS R TO RELOAD", centerX - MeasureText("PRESS R TO RELOAD", 20) / 2, centerY + 115, 20, RED);
                }
            } else if (aw.ammoClip == 0 && aw.ammoReserve == 0) {
                if (((int)(GetTime() * 4) % 2) == 0) {
                    DrawText("OUT OF AMMO! SWAP GUN!", centerX - MeasureText("OUT OF AMMO! SWAP GUN!", 20) / 2, centerY + 115, 20, RED);
                }
            }
            
            // 5. Session Panel overlay (Top Left)
            int panelW = 260;
            int panelH = 125;
            int panelX = 25;
            int panelY = 25;
            
            DrawRectangleRounded((Rectangle){ panelX, panelY, panelW, panelH }, 0.08f, 4, (Color){ 20, 20, 30, 200 });
            DrawRectangleRoundedLines((Rectangle){ panelX, panelY, panelW, panelH }, 0.08f, 4, CYAN);
            
            char sessStr[32];
            sprintf(sessStr, "SESSION: %d / 5", session.currentSession);
            DrawText(sessStr, panelX + 15, panelY + 15, 18, CYAN);
            
            if (session.sessionActive) {
                char reqStr[32];
                sprintf(reqStr, "TARGETS: %d / %d", session.targetsDestroyed, session.targetsRequired);
                DrawText(reqStr, panelX + 15, panelY + 45, 16, WHITE);
                
                char timeStr[32];
                sprintf(timeStr, "TIME LEFT: %.1fs", session.sessionTimer);
                Color timeColor = (session.sessionTimer < 10.0f) ? RED : GREEN;
                DrawText(timeStr, panelX + 15, panelY + 70, 16, timeColor);
                
                // Active session target health display (if target alive)
                if (target.active) {
                    int barW = panelW - 30;
                    int barH = 8;
                    float hpProg = target.health / target.maxHealth;
                    DrawRectangle(panelX + 15, panelY + 100, barW, barH, (Color){ 50, 50, 50, 255 });
                    DrawRectangle(panelX + 15, panelY + 100, (int)(barW * hpProg), barH, RED);
                    DrawRectangleLines(panelX + 15, panelY + 100, barW, barH, DARKGRAY);
                }
            } else {
                DrawText("STANDBY IN RANGE", panelX + 15, panelY + 45, 15, LIGHTGRAY);
                DrawText("Walk forward to red", panelX + 15, panelY + 70, 14, GRAY);
                DrawText("fence and press [E] to start", panelX + 15, panelY + 90, 14, GRAY);
            }
            
            // 6. Score Panel overlay (Top Right)
            int scoreW = 200;
            int scoreH = 85;
            int scoreX = screenWidth - scoreW - 25;
            int scoreY = 25;
            
            DrawRectangleRounded((Rectangle){ scoreX, scoreY, scoreW, scoreH }, 0.08f, 4, (Color){ 20, 20, 30, 200 });
            DrawRectangleRoundedLines((Rectangle){ scoreX, scoreY, scoreW, scoreH }, 0.08f, 4, GOLD);
            
            char scoreStr[32];
            sprintf(scoreStr, "SCORE: %06d", session.score);
            DrawText(scoreStr, scoreX + 15, scoreY + 18, 16, WHITE);
            
            char hiScoreStr[32];
            sprintf(hiScoreStr, "HIGH:  %06d", session.highScore);
            DrawText(hiScoreStr, scoreX + 15, scoreY + 45, 16, GOLD);
            
            // 7. General Instruction Card (Bottom Left)
            int ctrlW = 280;
            int ctrlH = 95;
            int ctrlX = 25;
            int ctrlY = screenHeight - ctrlH - 25;
            DrawRectangleRounded((Rectangle){ ctrlX, ctrlY, ctrlW, ctrlH }, 0.08f, 4, (Color){ 10, 10, 18, 180 });
            DrawRectangleRoundedLines((Rectangle){ ctrlX, ctrlY, ctrlW, ctrlH }, 0.08f, 4, (Color){ 50, 50, 70, 255 });
            DrawText("CYBER RANGE SYSTEM:", ctrlX + 12, ctrlY + 10, 12, GRAY);
            DrawText("- Left-Click: Fire laser", ctrlX + 15, ctrlY + 26, 11, LIGHTGRAY);
            DrawText("- [R]: Reload magazine", ctrlX + 15, ctrlY + 40, 11, LIGHTGRAY);
            DrawText("- [E]: Swap weapon / Start panel", ctrlX + 15, ctrlY + 54, 11, LIGHTGRAY);
            DrawText("- [SPACE]: Jet jump boost", ctrlX + 15, ctrlY + 68, 11, LIGHTGRAY);
            
            // Unlocked cursor indicator
            if (!IsCursorHidden()) {
                DrawRectangle(0, 0, screenWidth, screenHeight, (Color){ 0, 0, 0, 100 });
                DrawText("CURSOR RELEASED", centerX - MeasureText("CURSOR RELEASED", 28) / 2, centerY - 60, 28, RED);
                DrawText("Click inside range window to resume focus", centerX - MeasureText("Click inside range window to resume focus", 18) / 2, centerY - 20, 18, WHITE);
            }
            
            break;
        }
        
        case STATE_SESSION_CLEAR: {
            DrawRectangle(0, 0, screenWidth, screenHeight, (Color){ 10, 22, 15, 230 });
            
            // Title
            char clearTitle[64];
            sprintf(clearTitle, "SESSION %d CLEARED!", session.currentSession);
            DrawText(clearTitle, screenWidth / 2 - MeasureText(clearTitle, 40) / 2, screenHeight / 4, 40, GREEN);
            
            // Stat Details box
            int boxW = 500;
            int boxH = 220;
            int boxX = screenWidth / 2 - boxW / 2;
            int boxY = screenHeight / 2 - 80;
            
            DrawRectangleRounded((Rectangle){ boxX, boxY, boxW, boxH }, 0.08f, 6, (Color){ 20, 28, 22, 255 });
            DrawRectangleRoundedLines((Rectangle){ boxX, boxY, boxW, boxH }, 0.08f, 6, GREEN);
            
            // Calculate accuracy
            float accuracy = 0.0f;
            if (session.bulletsFired > 0) {
                accuracy = ((float)session.bulletsHit / session.bulletsFired) * 100.0f;
            }
            
            char statsStr[64];
            sprintf(statsStr, "Accuracy: %.1f%% (%d/%d hits)", accuracy, session.bulletsHit, session.bulletsFired);
            DrawText(statsStr, boxX + 35, boxY + 35, 20, WHITE);
            
            // Performance score
            int sessionBonus = session.currentSession * 500;
            char bonusStr[64];
            sprintf(bonusStr, "Session Completion Bonus: +%d", sessionBonus);
            DrawText(bonusStr, boxX + 35, boxY + 75, 20, GOLD);
            
            // Accumulate bonus score once on clean trigger
            if (session.stateTimer < dt) {
                session.score += sessionBonus;
            }
            
            char finalStr[64];
            sprintf(finalStr, "Total Score: %d PTS", session.score);
            DrawText(finalStr, boxX + 35, boxY + 115, 24, CYAN);
            
            char nextPrompt[128];
            sprintf(nextPrompt, "PRESS [ENTER] TO INITIATE SESSION %d", session.currentSession + 1);
            DrawText(nextPrompt, screenWidth / 2 - MeasureText(nextPrompt, 20) / 2, screenHeight - 140, 20, LIME);
            
            break;
        }
        
        case STATE_GAME_OVER: {
            DrawRectangle(0, 0, screenWidth, screenHeight, (Color){ 25, 10, 10, 230 });
            
            DrawText("SESSION TIMEOUT / FAILED!", screenWidth / 2 - MeasureText("SESSION TIMEOUT / FAILED!", 36) / 2, screenHeight / 4, 36, RED);
            
            int boxW = 480;
            int boxH = 180;
            int boxX = screenWidth / 2 - boxW / 2;
            int boxY = screenHeight / 2 - 60;
            
            DrawRectangleRounded((Rectangle){ boxX, boxY, boxW, boxH }, 0.08f, 6, (Color){ 30, 20, 20, 255 });
            DrawRectangleRoundedLines((Rectangle){ boxX, boxY, boxW, boxH }, 0.08f, 6, RED);
            
            char scoreStr[64];
            sprintf(scoreStr, "Final Score: %d PTS", session.score);
            DrawText(scoreStr, boxX + 35, boxY + 40, 22, WHITE);
            
            char hiScoreStr[64];
            sprintf(hiScoreStr, "All-Time High Score: %d PTS", session.highScore);
            DrawText(hiScoreStr, boxX + 35, boxY + 85, 20, GOLD);
            
            DrawText("PRESS [ENTER] TO RE-ENTER PRACTICE ROOM", screenWidth / 2 - MeasureText("PRESS [ENTER] TO RE-ENTER PRACTICE ROOM", 18) / 2, screenHeight - 160, 18, LIGHTGRAY);
            
            break;
        }
        
        case STATE_VICTORY: {
            DrawRectangle(0, 0, screenWidth, screenHeight, (Color){ 12, 10, 30, 240 });
            
            DrawText("CONGRATULATIONS!", screenWidth / 2 - MeasureText("CONGRATULATIONS!", 40) / 2, screenHeight / 4 - 40, 40, GOLD);
            DrawText("YOU CLEARED ALL 5 CYBER SESSIONS!", screenWidth / 2 - MeasureText("YOU CLEARED ALL 5 CYBER SESSIONS!", 22) / 2, screenHeight / 4 + 15, 22, CYAN);
            
            int boxW = 520;
            int boxH = 180;
            int boxX = screenWidth / 2 - boxW / 2;
            int boxY = screenHeight / 2 - 40;
            
            DrawRectangleRounded((Rectangle){ boxX, boxY, boxW, boxH }, 0.08f, 6, (Color){ 20, 15, 35, 255 });
            DrawRectangleRoundedLines((Rectangle){ boxX, boxY, boxW, boxH }, 0.08f, 6, MAGENTA);
            
            char scoreStr[64];
            sprintf(scoreStr, "Ultimate Score: %d PTS", session.score);
            DrawText(scoreStr, boxX + 35, boxY + 45, 24, WHITE);
            
            char hiScoreStr[64];
            sprintf(hiScoreStr, "High Score Record: %d PTS", session.highScore);
            DrawText(hiScoreStr, boxX + 35, boxY + 95, 20, GOLD);
            
            DrawText("YOU ARE AN EXCEPTIONAL MARKSMAN.", screenWidth / 2 - MeasureText("YOU ARE AN EXCEPTIONAL MARKSMAN.", 18) / 2, screenHeight - 180, 18, LIME);
            DrawText("PRESS [ENTER] FOR MAIN TITLE", screenWidth / 2 - MeasureText("PRESS [ENTER] FOR MAIN TITLE", 18) / 2, screenHeight - 130, 18, LIGHTGRAY);
            
            break;
        }
    }
}

// 3D Scene drawing
static void Draw3DScene(Camera3D camera) {
    // 1. Neon Grid Floor
    // Draw neon lines instead of generic grid helper for rich cyberpunk aesthetics
    float roomMinX = -15.0f;
    float roomMaxX = 15.0f;
    float roomMinZ = -20.0f;
    float roomMaxZ = 15.0f;
    
    // Grid horizontal X lines
    for (float z = roomMinZ; z <= roomMaxZ; z += 1.5f) {
        DrawLine3D((Vector3){ roomMinX, 0.0f, z }, (Vector3){ roomMaxX, 0.0f, z }, (Color){ 0, 100, 255, 60 });
    }
    // Grid horizontal Z lines
    for (float x = roomMinX; x <= roomMaxX; x += 1.5f) {
        DrawLine3D((Vector3){ x, 0.0f, roomMinZ }, (Vector3){ x, 0.0f, roomMaxZ }, (Color){ 0, 100, 255, 60 });
    }
    
    // 2. Ceiling Neon grid
    for (float z = roomMinZ; z <= roomMaxZ; z += 2.0f) {
        DrawLine3D((Vector3){ roomMinX, 10.0f, z }, (Vector3){ roomMaxX, 10.0f, z }, (Color){ 255, 0, 255, 45 });
    }
    for (float x = roomMinX; x <= roomMaxX; x += 2.0f) {
        DrawLine3D((Vector3){ x, 10.0f, roomMinZ }, (Vector3){ x, 10.0f, roomMaxZ }, (Color){ 255, 0, 255, 45 });
    }
    
    // Neon structural border columns (corners of the room)
    DrawCube((Vector3){ roomMinX, 5.0f, roomMinZ }, 0.2f, 10.0f, 0.2f, BLUE);
    DrawCube((Vector3){ roomMaxX, 5.0f, roomMinZ }, 0.2f, 10.0f, 0.2f, BLUE);
    DrawCube((Vector3){ roomMinX, 5.0f, roomMaxZ }, 0.2f, 10.0f, 0.2f, PURPLE);
    DrawCube((Vector3){ roomMaxX, 5.0f, roomMaxZ }, 0.2f, 10.0f, 0.2f, PURPLE);
    
    // 3. Shooting boundary fence line
    // Border at Z = -6.5f (Separating player zone and targets practice area)
    DrawCube((Vector3){ 0.0f, 0.01f, -6.5f }, 30.2f, 0.03f, 0.12f, RED);
    // Draw fence barricade pillars
    for (float px = -14.0f; px <= 14.0f; px += 2.0f) {
        DrawCylinderEx((Vector3){ px, 0.0f, -6.5f }, (Vector3){ px, 0.85f, -6.5f }, 0.05f, 0.05f, 6, (Color){ 55, 55, 70, 255 });
    }
    // Crossbar on fence
    DrawCube((Vector3){ 0.0f, 0.85f, -6.5f }, 30.0f, 0.04f, 0.08f, (Color){ 45, 45, 55, 255 });
    
    // 4. Center console desk: X=0, Z=-6.5f
    Vector3 deskPos = { 0.0f, 0.0f, -6.5f };
    DrawCube((Vector3){ deskPos.x, 0.45f, deskPos.z }, 1.3f, 0.9f, 0.5f, (Color){ 35, 35, 48, 255 });
    DrawCubeWires((Vector3){ deskPos.x, 0.45f, deskPos.z }, 1.3f, 0.9f, 0.5f, GREEN);
    
    // Screen display model (Console monitor facing player)
    DrawCube((Vector3){ deskPos.x, 0.95f, deskPos.z + 0.15f }, 1.0f, 0.45f, 0.06f, (Color){ 15, 20, 28, 255 });
    DrawCubeWires((Vector3){ deskPos.x, 0.95f, deskPos.z + 0.15f }, 1.02f, 0.47f, 0.08f, GREEN);
    
    // 5. Draw Pedestals and hover gun objects
    DrawPedestals(camera);
    
    // 6. Draw active targets
    DrawTarget();
    
    // 7. Draw Bullet Tracers
    for (int i = 0; i < MAX_TRACERS; i++) {
        if (!tracers[i].active) continue;
        float alpha = tracers[i].life / tracers[i].maxLife;
        
        WeaponInfo info = weaponInfos[player.weapon.type];
        Color tColor = info.color;
        tColor.a = (unsigned char)(alpha * 200.0f);
        
        DrawLine3D(tracers[i].start, tracers[i].end, tColor);
        // Core white tracer streak
        Color coreColor = WHITE;
        coreColor.a = (unsigned char)(alpha * 255.0f);
        DrawLine3D(tracers[i].start, tracers[i].end, coreColor);
        
        // Impact glow sphere
        DrawSphere(tracers[i].end, 0.04f, info.color);
    }
    
    // 8. Draw particles
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particles[i].active) continue;
        
        float t = particles[i].life / particles[i].maxLife;
        Color col = particles[i].color;
        col.a = (unsigned char)(t * 255.0f);
        
        DrawCube(particles[i].position, particles[i].size, particles[i].size, particles[i].size, col);
    }
    
    // 9. Projected Console 3D Text rendered to screen
    Vector2 screenPos = GetWorldToScreen((Vector3){ deskPos.x, 1.35f, deskPos.z }, camera);
    if (screenPos.x > 0 && screenPos.x < GetScreenWidth() && screenPos.y > 0 && screenPos.y < GetScreenHeight()) {
        if (!session.sessionActive) {
            DrawText("SYS CONSOLE", (int)screenPos.x - MeasureText("SYS CONSOLE", 12)/2, (int)screenPos.y, 12, GREEN);
            if (((int)(GetTime() * 2) % 2) == 0) {
                DrawText("[PRESS E TO START]", (int)screenPos.x - MeasureText("[PRESS E TO START]", 14)/2, (int)screenPos.y + 15, 14, LIME);
            } else {
                DrawText("[PRESS E TO START]", (int)screenPos.x - MeasureText("[PRESS E TO START]", 14)/2, (int)screenPos.y + 15, 14, GREEN);
            }
        } else {
            char scrStr[32];
            sprintf(scrStr, "S%d RUNNING", session.currentSession);
            DrawText(scrStr, (int)screenPos.x - MeasureText(scrStr, 12)/2, (int)screenPos.y, 12, RED);
            
            char timeStr[32];
            sprintf(timeStr, "TIMER: %.1fs", session.sessionTimer);
            DrawText(timeStr, (int)screenPos.x - MeasureText(timeStr, 12)/2, (int)screenPos.y + 15, 12, GOLD);
        }
    }
    
    // Draw weapon tags on pedestals
    for (int i = 0; i < WEAPON_COUNT; i++) {
        Vector3 pedPos = pedestals[i].position;
        Vector2 textPos = GetWorldToScreen((Vector3){ pedPos.x, 0.95f, pedPos.z }, camera);
        if (textPos.x > 0 && textPos.x < GetScreenWidth() && textPos.y > 0 && textPos.y < GetScreenHeight()) {
            Color infoCol = weaponInfos[pedestals[i].weaponType].color;
            DrawText(pedestals[i].label, (int)textPos.x - MeasureText(pedestals[i].label, 12) / 2, (int)textPos.y, 12, infoCol);
        }
    }
}

int main(void) {
    // Window configuration
    const int screenWidth = 1200;
    const int screenHeight = 800;
    
    InitWindow(screenWidth, screenHeight, "Cyber Shooting Range FPS - C & Raylib");
    InitAudioDevice();
    
    SetTargetFPS(60);
    
    // Load synthesized assets
    InitGameSounds();
    
    InitializeGame();
    
    // Main Game Loop
    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        if (dt > 0.1f) dt = 0.1f; // Clamp delta to avoid massive physics jumps
        
        UpdateGame(dt);
        
        // Camera setup matching player positions and angles
        Camera3D camera = { 0 };
        camera.position = player.position;
        
        // Add vertical head bobbing
        if (player.isMoving && player.isGrounded && session.state == STATE_PLAYING) {
            camera.position.y += sinf(player.bobTimer) * 0.05f;
        }
        
        float finalPitch = player.pitch + player.weapon.recoilAngle;
        Vector3 direction = {
            cosf(finalPitch) * sinf(player.yaw),
            sinf(finalPitch),
            cosf(finalPitch) * cosf(player.yaw)
        };
        camera.target = Vector3Add(camera.position, direction);
        camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
        camera.fovy = 70.0f;
        camera.projection = CAMERA_PERSPECTIVE;
        
        // DRAWING SEGMENT
        BeginDrawing();
        ClearBackground((Color){ 10, 10, 18, 255 }); // Dark space
        
        if (session.state == STATE_PLAYING) {
            BeginMode3D(camera);
            
            Draw3DScene(camera);
            
            // Draw First-Person weapon in screen space
            DrawFPSWeapon(camera, player.yaw, player.pitch);
            
            EndMode3D();
        } else {
            // Background titles screen grid logic
            Camera3D titleCam = { 0 };
            titleCam.position = (Vector3){ 0.0f, 2.0f, 9.0f };
            titleCam.target = (Vector3){ 0.0f, 1.5f, 0.0f };
            titleCam.up = (Vector3){ 0.0f, 1.0f, 0.0f };
            titleCam.fovy = 65.0f;
            titleCam.projection = CAMERA_PERSPECTIVE;
            
            BeginMode3D(titleCam);
            Draw3DScene(titleCam);
            EndMode3D();
        }
        
        // Render 2D overlays on top of 3D
        DrawHUD(camera);
        
        EndDrawing();
    }
    
    // Clean up
    UnloadGameSounds();
    CloseAudioDevice();
    CloseWindow();
    
    return 0;
}
