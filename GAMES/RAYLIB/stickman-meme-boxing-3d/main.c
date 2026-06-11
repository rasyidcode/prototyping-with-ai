#include "raylib.h"
#include "raymath.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

//------------------------------------------------------------------------------------
// Game Settings & Types
//------------------------------------------------------------------------------------
#define SCREEN_WIDTH 1280
#define SCREEN_HEIGHT 720
#define MAX_PARTICLES 300
#define MAX_TEXT_EFFECTS 15
#define MAX_FLASHES 20

typedef enum {
    STATE_MENU,
    STATE_CHAR_SELECT,
    STATE_INTRO,
    STATE_GAMEPLAY,
    STATE_KO,
    STATE_GAMEOVER
} GameState;

typedef enum {
    MEME_CENA,
    MEME_GIGACHAD,
    MEME_DOGE,
    MEME_PEPE,
    MEME_COUNT
} MemeType;

// Character Statistics & Info
typedef struct {
    const char *name;
    const char *tagline;
    const char *specialName;
    const char *specialDesc;
    int maxHealth;
    float speed;        // punch speed multiplier
    float powerMultiplier;
    Color color;
    const char *imagePath;
    Texture2D texture;
} MemeCharacter;

// Stickman Skeletal Structure (3D joints)
typedef struct {
    Vector3 head;
    Vector3 neck;
    Vector3 spine;
    Vector3 hipCenter;
    Vector3 hipLeft;
    Vector3 hipRight;
    Vector3 shoulderLeft;
    Vector3 shoulderRight;
    Vector3 elbowLeft;
    Vector3 elbowRight;
    Vector3 handLeft;
    Vector3 handRight;
    Vector3 kneeLeft;
    Vector3 kneeRight;
    Vector3 footLeft;
    Vector3 footRight;
} StickmanSkeleton;

// Fighter instance data
typedef struct {
    Vector3 position;
    Vector3 forward;
    Vector3 right;
    
    // Animation LERPs
    float currentLeanX;
    float currentLeanZ;
    float punchProgress;
    bool isPunchingLeft;
    bool isPunchingRight;
    bool isBlocking;
    int dodgeState;          // -1 = Left, 0 = Center, 1 = Right
    float dodgeTimer;
    
    float hitReactionTimer;
    float dizzyTimer;
    float koProgress;
    bool isKo;
    
    // Stats
    int health;
    int maxHealth;
    float stamina;
    float maxStamina;
    float rage;              // 0.0f to 100.0f
    
    // Character details
    MemeType meme;
    
    // Special Abilities state
    bool isSuperActive;
    float superModeTimer;
    int superSeqStep;
    float superSeqTimer;
    float counterActiveTimer; // Pepe specific
} Stickman;

// Visual Particle System
typedef struct {
    Vector3 position;
    Vector3 velocity;
    Color color;
    float size;
    float life;              // 1.0f down to 0.0f
    bool active;
    bool isStar;
} Particle;

// 3D-to-2D Floating text popups
typedef struct {
    Vector3 position;
    char text[32];
    Color color;
    float size;
    float life;
    bool active;
} TextEffect;

// Crowd Flashlight simulator
typedef struct {
    Vector2 position;
    float life;
    bool active;
} CameraFlash;

// Synthesized Game Sound Effects
typedef struct {
    Sound hit;
    Sound block;
    Sound dodge;
    Sound bell;
    Sound ko;
    Sound superCharge;
    Sound superActivate;
} SynthSounds;

//------------------------------------------------------------------------------------
// Global Data
//------------------------------------------------------------------------------------
static MemeCharacter characters[MEME_COUNT] = {
    {
        "JOHN CENA",
        "Fast, elusive, can't be seen.",
        "YOU CAN'T SEE ME",
        "Vanishes into semi-invisibility and strikes rapidly from 3 directions.",
        100, 1.4f, 1.0f, (Color){ 0, 180, 255, 255 }, "assets/john_cena.png", { 0 }
    },
    {
        "GIGACHAD",
        "Ultimate jawline. Heavy hitter.",
        "GIGA FURY",
        "Glows golden, gains infinite stamina, super armor, and double punch damage.",
        160, 0.8f, 2.0f, (Color){ 255, 215, 0, 255 }, "assets/gigachad.png", { 0 }
    },
    {
        "DOGE",
        "Such speed, much wow. Chaotic dodge.",
        "SUCH FLURRY",
        "Time slows down while Doge unleashes an automatic 6-jab barrage.",
        85, 1.5f, 0.7f, (Color){ 255, 165, 0, 255 }, "assets/doge.png", { 0 }
    },
    {
        "PEPE",
        "Feels bad man. Counter-puncher.",
        "SAD TEAR-COUNTER",
        "Creates a pool of tears slowing the opponent; automatically counters punches.",
        120, 1.0f, 1.2f, (Color){ 0, 220, 100, 255 }, "assets/pepe.png", { 0 }
    }
};

static Particle particles[MAX_PARTICLES] = { 0 };
static TextEffect textEffects[MAX_TEXT_EFFECTS] = { 0 };
static CameraFlash cameraFlashes[MAX_FLASHES] = { 0 };

static SynthSounds sounds = { 0 };
static float timeScale = 1.0f;
static float globalTime = 0.0f;
static float screenShake = 0.0f;

// Menu selections
static int playerSelectedMeme = MEME_CENA;
static int opponentSelectedMeme = MEME_GIGACHAD;

//------------------------------------------------------------------------------------
// Programmatic Audio Synthesizers (no external WAVs needed!)
//------------------------------------------------------------------------------------
Sound GenHitSound(void) {
    int sampleRate = 44100;
    float duration = 0.12f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleRate;
        float amp = 1.0f - (t / duration);
        // Exponential-like frequency drop: starts at 160Hz and drops to 30Hz
        float freq = 160.0f * (1.0f - t/duration) + 30.0f;
        float noise = ((float)rand() / RAND_MAX * 2.0f - 1.0f) * 0.25f;
        float val = sinf(2.0f * PI * freq * t) * 0.75f + noise;
        data[i] = (short)(val * amp * 32767.0f);
    }
    Wave wave = { sampleCount, sampleRate, 16, 1, data };
    Sound s = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return s;
}

Sound GenBlockSound(void) {
    int sampleRate = 44100;
    float duration = 0.07f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleRate;
        float amp = 1.0f - (t / duration);
        // Wooden hollow thud frequency (starts at 380Hz, decays to 180Hz)
        float freq = 380.0f * (1.0f - t/duration) + 180.0f;
        float val = sinf(2.0f * PI * freq * t);
        data[i] = (short)(val * amp * 28000.0f);
    }
    Wave wave = { sampleCount, sampleRate, 16, 1, data };
    Sound s = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return s;
}

Sound GenDodgeSound(void) {
    int sampleRate = 44100;
    float duration = 0.16f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleRate;
        float amp = sinf(PI * (t / duration)); // parabolic envelope
        // Swift frequency sweep from 150Hz up to 550Hz
        float freq = 150.0f + 400.0f * (t / duration);
        float val = sinf(2.0f * PI * freq * t) * 0.7f;
        data[i] = (short)(val * amp * 22000.0f);
    }
    Wave wave = { sampleCount, sampleRate, 16, 1, data };
    Sound s = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return s;
}

Sound GenBellSound(void) {
    int sampleRate = 44100;
    float duration = 1.8f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleRate;
        float amp = expf(-2.5f * t);
        // Metallic bell harmonic combination (fundamental 659.25Hz = E5)
        float f0 = 659.25f;
        float val = sinf(2.0f * PI * f0 * t) * 0.45f +
                    sinf(2.0f * PI * f0 * 1.5f * t) * 0.25f +
                    sinf(2.0f * PI * f0 * 2.0f * t) * 0.15f +
                    sinf(2.0f * PI * f0 * 2.51f * t) * 0.10f +
                    sinf(2.0f * PI * f0 * 3.0f * t) * 0.05f;
        data[i] = (short)(val * amp * 32767.0f);
    }
    Wave wave = { sampleCount, sampleRate, 16, 1, data };
    Sound s = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return s;
}

Sound GenKOSound(void) {
    int sampleRate = 44100;
    float duration = 2.5f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleRate;
        float amp = 1.0f - (t / duration);
        // Deep crowd noise and rumble
        float noise = ((float)rand() / RAND_MAX * 2.0f - 1.0f) * 0.5f;
        float rumble = sinf(2.0f * PI * (65.0f + 15.0f * noise) * t) * 0.5f;
        float val = noise * 0.4f + rumble;
        data[i] = (short)(val * amp * 25000.0f);
    }
    Wave wave = { sampleCount, sampleRate, 16, 1, data };
    Sound s = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return s;
}

Sound GenSuperChargeSound(void) {
    int sampleRate = 44100;
    float duration = 1.0f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleRate;
        float amp = t / duration; // fade in
        float freq = 80.0f + 300.0f * (t / duration) + 20.0f * sinf(2.0f * PI * 15.0f * t); // vibrato sweep
        float val = sinf(2.0f * PI * freq * t) * 0.8f;
        data[i] = (short)(val * amp * 28000.0f);
    }
    Wave wave = { sampleCount, sampleRate, 16, 1, data };
    Sound s = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return s;
}

Sound GenSuperActivateSound(void) {
    int sampleRate = 44100;
    float duration = 1.5f;
    int sampleCount = (int)(sampleRate * duration);
    short *data = (short *)malloc(sampleCount * sizeof(short));
    for (int i = 0; i < sampleCount; i++) {
        float t = (float)i / sampleRate;
        float amp = expf(-2.0f * t);
        float freq = 440.0f * expf(-3.0f * t) + 80.0f;
        float noise = ((float)rand() / RAND_MAX * 2.0f - 1.0f) * 0.3f;
        float val = sinf(2.0f * PI * freq * t) * 0.7f + noise;
        data[i] = (short)(val * amp * 32767.0f);
    }
    Wave wave = { sampleCount, sampleRate, 16, 1, data };
    Sound s = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return s;
}

//------------------------------------------------------------------------------------
// Helper Functions: Particles & Floating Text
//------------------------------------------------------------------------------------
void SpawnParticles(Vector3 pos, Color color, int count, bool isStar) {
    for (int i = 0; i < count; i++) {
        int index = -1;
        for (int p = 0; p < MAX_PARTICLES; p++) {
            if (!particles[p].active) {
                index = p;
                break;
            }
        }
        if (index == -1) break;
        particles[index].active = true;
        particles[index].position = pos;
        
        float speed = 1.5f + ((float)rand() / RAND_MAX * 2.5f);
        float angle = ((float)rand() / RAND_MAX) * 2.0f * PI;
        float elev = ((float)rand() / RAND_MAX * 2.0f - 1.0f) * PI * 0.3f;
        
        particles[index].velocity.x = cosf(angle) * cosf(elev) * speed;
        particles[index].velocity.y = sinf(elev) * speed + 1.5f; // upward boost
        particles[index].velocity.z = sinf(angle) * cosf(elev) * speed;
        
        particles[index].color = color;
        particles[index].size = 0.04f + ((float)rand() / RAND_MAX * 0.08f);
        particles[index].life = 1.0f;
        particles[index].isStar = isStar;
    }
}

void SpawnTextEffect(Vector3 pos, const char *text, Color color) {
    for (int i = 0; i < MAX_TEXT_EFFECTS; i++) {
        if (!textEffects[i].active) {
            textEffects[i].active = true;
            textEffects[i].position = pos;
            textEffects[i].position.x += ((float)rand() / RAND_MAX * 2.0f - 1.0f) * 0.4f;
            textEffects[i].position.y += ((float)rand() / RAND_MAX * 2.0f - 1.0f) * 0.4f;
            textEffects[i].position.z += ((float)rand() / RAND_MAX * 2.0f - 1.0f) * 0.2f;
            strncpy(textEffects[i].text, text, sizeof(textEffects[i].text) - 1);
            textEffects[i].text[sizeof(textEffects[i].text) - 1] = '\0';
            textEffects[i].color = color;
            textEffects[i].size = 1.0f;
            textEffects[i].life = 1.0f;
            break;
        }
    }
}

void TriggerCameraFlash(void) {
    for (int i = 0; i < MAX_FLASHES; i++) {
        if (!cameraFlashes[i].active) {
            cameraFlashes[i].active = true;
            cameraFlashes[i].position.x = (float)(rand() % SCREEN_WIDTH);
            cameraFlashes[i].position.y = (float)(rand() % (SCREEN_HEIGHT / 2));
            cameraFlashes[i].life = 0.15f; // very short flash
            break;
        }
    }
}

// Draw a neon-cylinder skeleton bone (inner white core, outer colored glow)
void DrawGlowCylinder(Vector3 start, Vector3 end, float radius, Color color, float alpha) {
    if (alpha <= 0.0f) return;
    Color glowColor = ColorAlpha(color, 0.25f * alpha);
    Color coreColor = ColorAlpha(WHITE, alpha);
    
    // Draw outer glow cylinder
    DrawCylinderEx(start, end, radius * 2.5f, radius * 2.5f, 6, glowColor);
    // Draw inner core cylinder
    DrawCylinderEx(start, end, radius, radius, 6, coreColor);
}

//------------------------------------------------------------------------------------
// Skeletal Math & Procedural Animation
//------------------------------------------------------------------------------------
void CalculateSkeleton(Stickman *s, StickmanSkeleton *sk, float time, Vector3 opponentHead) {
    Vector3 base = s->position;
    
    // Smoothly calculate animation coefficients
    float bobbing = s->isKo ? 0.0f : sinf(time * 8.0f) * 0.03f;
    float punchFactor = 0.0f;
    
    // Base joints
    Vector3 hipCenter = Vector3Add(base, (Vector3){ 0.0f, 0.9f + bobbing, 0.0f });
    Vector3 spine = Vector3Add(base, (Vector3){ 0.0f, 1.3f + bobbing, 0.0f });
    Vector3 neck = Vector3Add(base, (Vector3){ 0.0f, 1.6f + bobbing, 0.0f });
    
    // Leaning offset due to dodging & hits
    Vector3 leanOffset = Vector3Zero();
    leanOffset = Vector3Add(leanOffset, Vector3Scale(s->right, s->currentLeanX));
    leanOffset = Vector3Add(leanOffset, Vector3Scale(s->forward, s->currentLeanZ));
    
    spine = Vector3Add(spine, Vector3Scale(leanOffset, 0.5f));
    neck = Vector3Add(neck, leanOffset);
    Vector3 head = Vector3Add(neck, (Vector3){ 0.0f, 0.3f, 0.0f });
    
    // Left & Right shoulders / hips
    Vector3 shoulderLeft = Vector3Add(neck, Vector3Scale(s->right, -0.28f));
    Vector3 shoulderRight = Vector3Add(neck, Vector3Scale(s->right, 0.28f));
    Vector3 hipLeft = Vector3Add(hipCenter, Vector3Scale(s->right, -0.15f));
    Vector3 hipRight = Vector3Add(hipCenter, Vector3Scale(s->right, 0.15f));
    
    // Guard pose (default hands position guarding head)
    Vector3 guardLeft = Vector3Add(neck, Vector3Add(Vector3Scale(s->forward, 0.35f), Vector3Add(Vector3Scale(s->right, -0.16f), (Vector3){ 0.0f, 0.08f, 0.0f })));
    Vector3 guardRight = Vector3Add(neck, Vector3Add(Vector3Scale(s->forward, 0.35f), Vector3Add(Vector3Scale(s->right, 0.16f), (Vector3){ 0.0f, 0.08f, 0.0f })));
    
    if (s->isBlocking) {
        // Hands close together, directly guarding face
        guardLeft = Vector3Add(head, Vector3Add(Vector3Scale(s->forward, 0.22f), Vector3Scale(s->right, -0.08f)));
        guardRight = Vector3Add(head, Vector3Add(Vector3Scale(s->forward, 0.22f), Vector3Scale(s->right, 0.08f)));
    } else if (s->dizzyTimer > 0.0f) {
        // Hands low down, exhausted stance
        guardLeft = Vector3Add(hipLeft, Vector3Add(Vector3Scale(s->right, -0.12f), (Vector3){0, 0.15f, 0.1f}));
        guardRight = Vector3Add(hipRight, Vector3Add(Vector3Scale(s->right, 0.12f), (Vector3){0, 0.15f, 0.1f}));
    }
    
    // Feet positions (staggered stance)
    Vector3 footLeft = Vector3Add(base, Vector3Add(Vector3Scale(s->right, -0.22f), Vector3Scale(s->forward, -0.15f)));
    Vector3 footRight = Vector3Add(base, Vector3Add(Vector3Scale(s->right, 0.22f), Vector3Scale(s->forward, 0.15f)));
    
    Vector3 kneeLeft = Vector3Add(Vector3Lerp(hipLeft, footLeft, 0.5f), Vector3Scale(s->forward, 0.08f));
    Vector3 kneeRight = Vector3Add(Vector3Lerp(hipRight, footRight, 0.5f), Vector3Scale(s->forward, 0.08f));
    
    // Default Elbow Guards
    Vector3 elbowLeft = Vector3Add(Vector3Lerp(shoulderLeft, guardLeft, 0.5f), Vector3Add(Vector3Scale(s->right, -0.15f), (Vector3){ 0.0f, -0.05f, -0.05f }));
    Vector3 elbowRight = Vector3Add(Vector3Lerp(shoulderRight, guardRight, 0.5f), Vector3Add(Vector3Scale(s->right, 0.15f), (Vector3){ 0.0f, -0.05f, -0.05f }));
    
    Vector3 handLeft = guardLeft;
    Vector3 handRight = guardRight;
    
    // Left Punch Interpolation
    if (s->isPunchingLeft) {
        float progress = s->punchProgress;
        punchFactor = (progress < 0.5f) ? (progress / 0.5f) : (1.0f - (progress - 0.5f) / 0.5f);
        // Smooth sine interpolation
        punchFactor = sinf(punchFactor * PI * 0.5f);
        
        // Target: Opponent head with offset
        Vector3 target = opponentHead;
        handLeft = Vector3Lerp(guardLeft, target, punchFactor);
        elbowLeft = Vector3Lerp(elbowLeft, Vector3Lerp(shoulderLeft, handLeft, 0.5f), punchFactor);
    }
    
    // Right Punch Interpolation
    if (s->isPunchingRight) {
        float progress = s->punchProgress;
        punchFactor = (progress < 0.5f) ? (progress / 0.5f) : (1.0f - (progress - 0.5f) / 0.5f);
        punchFactor = sinf(punchFactor * PI * 0.5f);
        
        Vector3 target = opponentHead;
        handRight = Vector3Lerp(guardRight, target, punchFactor);
        elbowRight = Vector3Lerp(elbowRight, Vector3Lerp(shoulderRight, handRight, 0.5f), punchFactor);
    }
    
    // Collapse pose when Knocked Out (KO)
    if (s->isKo) {
        float p = s->koProgress;
        // Target floor positions for collapse
        Vector3 koHip = Vector3Add(base, (Vector3){ 0, 0.15f, 0.0f });
        Vector3 koSpine = Vector3Add(base, Vector3Add((Vector3){ 0, 0.12f, 0 }, Vector3Scale(s->forward, -0.3f)));
        Vector3 koNeck = Vector3Add(base, Vector3Add((Vector3){ 0, 0.10f, 0 }, Vector3Scale(s->forward, -0.7f)));
        Vector3 koHead = Vector3Add(base, Vector3Add((Vector3){ 0, 0.10f, 0 }, Vector3Scale(s->forward, -1.0f)));
        
        Vector3 koShoulderL = Vector3Add(koNeck, Vector3Scale(s->right, -0.22f));
        Vector3 koShoulderR = Vector3Add(koNeck, Vector3Scale(s->right, 0.22f));
        Vector3 koHipL = Vector3Add(koHip, Vector3Scale(s->right, -0.12f));
        Vector3 koHipR = Vector3Add(koHip, Vector3Scale(s->right, 0.12f));
        
        Vector3 koHandL = Vector3Add(base, Vector3Add(Vector3Scale(s->right, -0.5f), Vector3Scale(s->forward, -0.4f)));
        Vector3 koHandR = Vector3Add(base, Vector3Add(Vector3Scale(s->right, 0.4f), Vector3Scale(s->forward, -0.5f)));
        Vector3 koFootL = Vector3Add(base, Vector3Add(Vector3Scale(s->right, -0.15f), Vector3Scale(s->forward, 0.3f)));
        Vector3 koFootR = Vector3Add(base, Vector3Add(Vector3Scale(s->right, 0.15f), Vector3Scale(s->forward, 0.4f)));
        
        hipCenter = Vector3Lerp(hipCenter, koHip, p);
        spine = Vector3Lerp(spine, koSpine, p);
        neck = Vector3Lerp(neck, koNeck, p);
        head = Vector3Lerp(head, koHead, p);
        
        shoulderLeft = Vector3Lerp(shoulderLeft, koShoulderL, p);
        shoulderRight = Vector3Lerp(shoulderRight, koShoulderR, p);
        hipLeft = Vector3Lerp(hipLeft, koHipL, p);
        hipRight = Vector3Lerp(hipRight, koHipR, p);
        
        handLeft = Vector3Lerp(handLeft, koHandL, p);
        handRight = Vector3Lerp(handRight, koHandR, p);
        elbowLeft = Vector3Lerp(elbowLeft, Vector3Lerp(shoulderLeft, handLeft, 0.5f), p);
        elbowRight = Vector3Lerp(elbowRight, Vector3Lerp(shoulderRight, handRight, 0.5f), p);
        
        footLeft = Vector3Lerp(footLeft, koFootL, p);
        footRight = Vector3Lerp(footRight, koFootR, p);
        kneeLeft = Vector3Lerp(kneeLeft, Vector3Lerp(hipLeft, footLeft, 0.5f), p);
        kneeRight = Vector3Lerp(kneeRight, Vector3Lerp(hipRight, footRight, 0.5f), p);
    }
    
    // Output skeleton
    sk->head = head;
    sk->neck = neck;
    sk->spine = spine;
    sk->hipCenter = hipCenter;
    sk->hipLeft = hipLeft;
    sk->hipRight = hipRight;
    sk->shoulderLeft = shoulderLeft;
    sk->shoulderRight = shoulderRight;
    sk->elbowLeft = elbowLeft;
    sk->elbowRight = elbowRight;
    sk->handLeft = handLeft;
    sk->handRight = handRight;
    sk->kneeLeft = kneeLeft;
    sk->kneeRight = kneeRight;
    sk->footLeft = footLeft;
    sk->footRight = footRight;
}

//------------------------------------------------------------------------------------
// Rendering - Draw Stickman Skeleton
//------------------------------------------------------------------------------------
void DrawStickman(StickmanSkeleton *sk, Color color, Color gloveColor, bool wireframe, float alpha) {
    float rJoint = 0.08f;
    float rBone = 0.04f;
    float rGlove = 0.16f;
    
    // Draw Joints
    Color jointColor = wireframe ? ColorAlpha(color, 0.35f * alpha) : ColorAlpha(color, alpha);
    Color activeGloveColor = ColorAlpha(gloveColor, alpha);
    
    DrawSphere(sk->neck, rJoint, jointColor);
    DrawSphere(sk->spine, rJoint, jointColor);
    DrawSphere(sk->hipCenter, rJoint, jointColor);
    DrawSphere(sk->shoulderLeft, rJoint - 0.01f, jointColor);
    DrawSphere(sk->shoulderRight, rJoint - 0.01f, jointColor);
    DrawSphere(sk->elbowLeft, rJoint - 0.01f, jointColor);
    DrawSphere(sk->elbowRight, rJoint - 0.01f, jointColor);
    DrawSphere(sk->hipLeft, rJoint - 0.01f, jointColor);
    DrawSphere(sk->hipRight, rJoint - 0.01f, jointColor);
    DrawSphere(sk->kneeLeft, rJoint - 0.01f, jointColor);
    DrawSphere(sk->kneeRight, rJoint - 0.01f, jointColor);
    
    // Draw Bones
    DrawGlowCylinder(sk->neck, sk->spine, rBone, color, alpha);
    DrawGlowCylinder(sk->spine, sk->hipCenter, rBone, color, alpha);
    
    DrawGlowCylinder(sk->neck, sk->shoulderLeft, rBone, color, alpha);
    DrawGlowCylinder(sk->shoulderLeft, sk->elbowLeft, rBone - 0.01f, color, alpha);
    DrawGlowCylinder(sk->elbowLeft, sk->handLeft, rBone - 0.01f, color, alpha);
    
    DrawGlowCylinder(sk->neck, sk->shoulderRight, rBone, color, alpha);
    DrawGlowCylinder(sk->shoulderRight, sk->elbowRight, rBone - 0.01f, color, alpha);
    DrawGlowCylinder(sk->elbowRight, sk->handRight, rBone - 0.01f, color, alpha);
    
    DrawGlowCylinder(sk->hipCenter, sk->hipLeft, rBone, color, alpha);
    DrawGlowCylinder(sk->hipLeft, sk->kneeLeft, rBone - 0.01f, color, alpha);
    DrawGlowCylinder(sk->kneeLeft, sk->footLeft, rBone - 0.01f, color, alpha);
    
    DrawGlowCylinder(sk->hipCenter, sk->hipRight, rBone, color, alpha);
    DrawGlowCylinder(sk->hipRight, sk->kneeRight, rBone - 0.01f, color, alpha);
    DrawGlowCylinder(sk->kneeRight, sk->footRight, rBone - 0.01f, color, alpha);
    
    // Draw Gloves (larger spheres)
    DrawSphere(sk->handLeft, rGlove, activeGloveColor);
    DrawSphere(sk->handRight, rGlove, activeGloveColor);
}

//------------------------------------------------------------------------------------
// Rendering - Draw Arena
//------------------------------------------------------------------------------------
void DrawArena(void) {
    // Canvas floor
    DrawPlane((Vector3){ 0, 0, 0 }, (Vector2){ 12, 12 }, (Color){40, 40, 45, 255});
    DrawPlane((Vector3){ 0, 0.005f, 0 }, (Vector2){ 11.5f, 11.5f }, (Color){30, 30, 32, 255});
    
    // Red center circle
    DrawCircle3D((Vector3){ 0, 0.01f, 0 }, 2.0f, (Vector3){ 1, 0, 0 }, 90.0f, ColorAlpha(RED, 0.15f));
    DrawCircle3D((Vector3){ 0, 0.01f, 0 }, 1.9f, (Vector3){ 1, 0, 0 }, 90.0f, (Color){30, 30, 32, 255});
    
    // Draw Ring posts
    Vector3 posts[4] = {
        { -5.8f, 0.0f, -5.8f },
        {  5.8f, 0.0f, -5.8f },
        {  5.8f, 0.0f,  5.8f },
        { -5.8f, 0.0f,  5.8f }
    };
    
    for (int i = 0; i < 4; i++) {
        DrawCylinderEx(posts[i], (Vector3){ posts[i].x, 3.2f, posts[i].z }, 0.14f, 0.14f, 8, (Color){20, 20, 20, 255});
        DrawSphere((Vector3){ posts[i].x, 3.2f, posts[i].z }, 0.18f, GOLD);
    }
    
    // Ropes running along the posts
    float ropeHeights[3] = { 0.8f, 1.7f, 2.6f };
    Color ropeColors[3] = { RED, WHITE, BLUE };
    for (int r = 0; r < 3; r++) {
        float h = ropeHeights[r];
        Color c = ropeColors[r];
        for (int i = 0; i < 4; i++) {
            Vector3 p1 = posts[i];
            Vector3 p2 = posts[(i + 1) % 4];
            p1.y = h;
            p2.y = h;
            DrawCylinderEx(p1, p2, 0.03f, 0.03f, 6, c);
        }
    }
}

// Simple word wrap helper for character description
void DrawTextWrapped(const char *text, int x, int y, int width, int fontSize, Color color) {
    char buffer[256];
    strncpy(buffer, text, sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0';
    
    char *words[64];
    int wordCount = 0;
    char *token = strtok(buffer, " ");
    while (token && wordCount < 64) {
        words[wordCount++] = token;
        token = strtok(NULL, " ");
    }
    
    char line[256] = "";
    int currentY = y;
    for (int i = 0; i < wordCount; i++) {
        char testLine[256];
        if (line[0] == '\0') {
            strcpy(testLine, words[i]);
        } else {
            sprintf(testLine, "%s %s", line, words[i]);
        }
        
        int textWidth = MeasureText(testLine, fontSize);
        if (textWidth > width) {
            DrawText(line, x, currentY, fontSize, color);
            currentY += fontSize + 4;
            strcpy(line, words[i]);
        } else {
            strcpy(line, testLine);
        }
    }
    if (line[0] != '\0') {
        DrawText(line, x, currentY, fontSize, color);
    }
}

//------------------------------------------------------------------------------------
// UI Card Drawer (Select screen)
//------------------------------------------------------------------------------------
bool DrawCharacterCard(MemeCharacter *ch, Rectangle rect, bool selected, bool hovered) {
    // Background and neon borders
    DrawRectangleRec(rect, selected ? ColorAlpha(ch->color, 0.15f) : (hovered ? ColorAlpha(GRAY, 0.1f) : ColorAlpha(BLACK, 0.3f)));
    DrawRectangleLinesEx(rect, 3.0f, selected ? ch->color : (hovered ? LIGHTGRAY : (Color){60, 60, 65, 255}));
    
    // Portrait image fit
    float padding = 8.0f;
    Rectangle imgRect = { rect.x + padding, rect.y + padding, rect.width - 2*padding, rect.height - 55.0f };
    if (ch->texture.id > 0) {
        DrawTexturePro(ch->texture, (Rectangle){0, 0, ch->texture.width, ch->texture.height}, imgRect, (Vector2){0,0}, 0.0f, WHITE);
    } else {
        DrawRectangleRec(imgRect, DARKGRAY);
        DrawText("NO FACE", imgRect.x + imgRect.width/2 - MeasureText("NO FACE", 16)/2, imgRect.y + imgRect.height/2 - 8, 16, LIGHTGRAY);
    }
    
    // Text Name
    int fontSize = 20;
    int nameW = MeasureText(ch->name, fontSize);
    DrawText(ch->name, rect.x + rect.width/2 - nameW/2, rect.y + rect.height - 35.0f, fontSize, selected ? ch->color : WHITE);
    
    // Mouse hover check
    Vector2 m = GetMousePosition();
    bool clicked = false;
    if (CheckCollisionPointRec(m, rect)) {
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
            clicked = true;
        }
    }
    return clicked;
}

// Draw a beautiful progress bar for stats
void DrawStatBar(const char *label, float val, float maxVal, float x, float y, float w, float h, Color color) {
    DrawText(label, x, y, 16, LIGHTGRAY);
    
    Rectangle bg = { x + 80.0f, y + 2.0f, w - 80.0f, h };
    Rectangle fill = { x + 80.0f + 2.0f, y + 4.0f, (w - 80.0f - 4.0f) * (val / maxVal), h - 4.0f };
    
    DrawRectangleRec(bg, (Color){ 30, 30, 35, 255 });
    DrawRectangleLinesEx(bg, 1.0f, GRAY);
    DrawRectangleRec(fill, color);
}

//------------------------------------------------------------------------------------
// MAIN IMPLEMENTATION
//------------------------------------------------------------------------------------
int main(void) {
    // Random initialization
    srand((unsigned int)time(NULL));

    // Initialize Window
    SetConfigFlags(FLAG_VSYNC_HINT);
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "Stickman Meme Boxing 3D");
    SetTargetFPS(60);

    // Initialize Audio
    InitAudioDevice();
    
    // Pre-synthesize game sound effects programmatically
    sounds.hit = GenHitSound();
    sounds.block = GenBlockSound();
    sounds.dodge = GenDodgeSound();
    sounds.bell = GenBellSound();
    sounds.ko = GenKOSound();
    sounds.superCharge = GenSuperChargeSound();
    sounds.superActivate = GenSuperActivateSound();
    
    // Load character textures
    for (int i = 0; i < MEME_COUNT; i++) {
        characters[i].texture = LoadTexture(characters[i].imagePath);
    }
    
    // Initialize Camera
    Camera3D camera = { 0 };
    camera.position = (Vector3){ 0.0f, 2.2f, 4.8f }; // Over the shoulder base position
    camera.target = (Vector3){ 0.0f, 1.3f, -2.5f };
    camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.fovy = 52.0f;
    camera.projection = CAMERA_PERSPECTIVE;
    
    // Gameplay Core States
    GameState state = STATE_MENU;
    
    // Player and Opponent instances
    Stickman player = { 0 };
    Stickman opponent = { 0 };
    
    StickmanSkeleton playerSkeleton = { 0 };
    StickmanSkeleton opponentSkeleton = { 0 };
    
    float roundTimer = 60.0f;
    float introTimer = 0.0f;
    float koTimer = 0.0f;
    float endScreenTimer = 0.0f;
    
    char topMsg[32] = "";
    char middleMsg[32] = "";
    
    // Main Game Loop
    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        
        // Update background camera flashes
        if (state == STATE_GAMEPLAY || state == STATE_KO || state == STATE_INTRO) {
            if (rand() % 50 == 0) {
                TriggerCameraFlash();
            }
            for (int i = 0; i < MAX_FLASHES; i++) {
                if (cameraFlashes[i].active) {
                    cameraFlashes[i].life -= dt;
                    if (cameraFlashes[i].life <= 0.0f) cameraFlashes[i].active = false;
                }
            }
        }
        
        // Update particles
        for (int i = 0; i < MAX_PARTICLES; i++) {
            if (particles[i].active) {
                particles[i].position = Vector3Add(particles[i].position, Vector3Scale(particles[i].velocity, dt * timeScale));
                // Add gravity
                particles[i].velocity.y -= 9.81f * dt * timeScale;
                particles[i].life -= dt * timeScale * 1.6f;
                if (particles[i].life <= 0.0f) {
                    particles[i].active = false;
                }
            }
        }
        
        // Update floating texts
        for (int i = 0; i < MAX_TEXT_EFFECTS; i++) {
            if (textEffects[i].active) {
                textEffects[i].position.y += 0.8f * dt * timeScale; // float up
                textEffects[i].life -= dt * timeScale * 1.5f;
                if (textEffects[i].life <= 0.0f) {
                    textEffects[i].active = false;
                }
            }
        }
        
        globalTime += dt * timeScale;
        
        // Screen shake decay
        if (screenShake > 0.0f) {
            screenShake = Lerp(screenShake, 0.0f, 9.0f * dt);
        }
        
        // Time scale decay back to 1.0
        if (timeScale < 1.0f && state != STATE_KO) {
            timeScale = Lerp(timeScale, 1.0f, 2.0f * dt);
        }
        
        //--------------------------------------------------------------------------------
        // State Machine Updates
        //--------------------------------------------------------------------------------
        switch (state) {
            case STATE_MENU: {
                if (IsKeyPressed(KEY_ENTER) || IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
                    state = STATE_CHAR_SELECT;
                    PlaySound(sounds.block);
                }
                break;
            }
            case STATE_CHAR_SELECT: {
                // Done on character select render loop via interactive buttons.
                // Selecting player character card, opponent character card.
                break;
            }
            case STATE_INTRO: {
                introTimer -= dt;
                
                // Animate camera flying in
                float t = (2.0f - introTimer) / 2.0f; // 0.0 to 1.0
                if (t > 1.0f) t = 1.0f;
                
                camera.position = Vector3Lerp((Vector3){ 0.0f, 4.0f, 8.5f }, (Vector3){ 0.0f, 2.1f, 4.8f }, t);
                camera.target = Vector3Lerp((Vector3){ 0.0f, 1.8f, -1.0f }, (Vector3){ 0.0f, 1.3f, -2.5f }, t);
                
                if (introTimer <= 0.0f) {
                    state = STATE_GAMEPLAY;
                    roundTimer = 60.0f;
                    PlaySound(sounds.bell);
                    SpawnTextEffect((Vector3){0, 1.7f, -1.0f}, "FIGHT!", ORANGE);
                }
                break;
            }
            case STATE_GAMEPLAY: {
                roundTimer -= dt * timeScale;
                if (roundTimer <= 0.0f) {
                    roundTimer = 0.0f;
                    // Determine winner by health percentage
                    state = STATE_GAMEOVER;
                    PlaySound(sounds.bell);
                    if (player.health > opponent.health) {
                        strcpy(middleMsg, "YOU WIN!");
                    } else if (opponent.health > player.health) {
                        strcpy(middleMsg, "YOU LOSE!");
                    } else {
                        strcpy(middleMsg, "DRAW!");
                    }
                    endScreenTimer = 3.0f;
                }
                
                //------------------------------------------------------------------------
                // Character Super Timers
                //------------------------------------------------------------------------
                // Player Special buffs
                if (player.superModeTimer > 0.0f) {
                    player.superModeTimer -= dt * timeScale;
                    if (player.superModeTimer <= 0.0f) {
                        player.isSuperActive = false;
                    }
                }
                if (player.counterActiveTimer > 0.0f) {
                    player.counterActiveTimer -= dt * timeScale;
                }
                
                // Opponent Special buffs
                if (opponent.superModeTimer > 0.0f) {
                    opponent.superModeTimer -= dt * timeScale;
                    if (opponent.superModeTimer <= 0.0f) {
                        opponent.isSuperActive = false;
                    }
                }
                if (opponent.counterActiveTimer > 0.0f) {
                    opponent.counterActiveTimer -= dt * timeScale;
                }
                
                //------------------------------------------------------------------------
                // PLAYER UPDATE
                //------------------------------------------------------------------------
                // Recovery
                if (!player.isBlocking) {
                    player.stamina = Lerp(player.stamina, player.maxStamina, 0.4f * dt * timeScale);
                } else {
                    player.stamina = Lerp(player.stamina, player.maxStamina, 0.15f * dt * timeScale);
                }
                
                // Input handling
                player.isBlocking = false;
                player.dodgeState = 0;
                
                // Recover from dizzy
                if (player.dizzyTimer > 0.0f) {
                    player.dizzyTimer -= dt * timeScale;
                } else {
                    if (IsKeyDown(KEY_S) || IsKeyDown(KEY_DOWN) || IsKeyDown(KEY_SPACE)) {
                        player.isBlocking = true;
                    } else if (IsKeyDown(KEY_A) || IsKeyDown(KEY_LEFT)) {
                        player.dodgeState = -1; // Dodge Left
                        player.dodgeTimer = 0.25f;
                    } else if (IsKeyDown(KEY_D) || IsKeyDown(KEY_RIGHT)) {
                        player.dodgeState = 1;  // Dodge Right
                        player.dodgeTimer = 0.25f;
                    }
                    
                    // Jabs (Left and Right Hook)
                    if (!player.isPunchingLeft && !player.isPunchingRight && !player.isBlocking) {
                        // Left Punch
                        if (IsKeyPressed(KEY_J) || IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
                            if (player.stamina > 15.0f) {
                                player.isPunchingLeft = true;
                                player.punchProgress = 0.0f;
                                player.stamina -= 18.0f;
                                PlaySound(sounds.dodge);
                            } else {
                                SpawnTextEffect(player.position, "EXHAUSTED", ORANGE);
                            }
                        }
                        // Right Punch
                        else if (IsKeyPressed(KEY_K) || IsMouseButtonPressed(MOUSE_BUTTON_RIGHT)) {
                            if (player.stamina > 15.0f) {
                                player.isPunchingRight = true;
                                player.punchProgress = 0.0f;
                                player.stamina -= 22.0f;
                                PlaySound(sounds.dodge);
                            } else {
                                SpawnTextEffect(player.position, "EXHAUSTED", ORANGE);
                            }
                        }
                    }
                    
                    // Trigger Super Move (if rage is full)
                    if (player.rage >= 100.0f && IsKeyPressed(KEY_F)) {
                        player.rage = 0.0f;
                        player.isSuperActive = true;
                        PlaySound(sounds.superActivate);
                        
                        // Setup special ability
                        if (player.meme == MEME_CENA) {
                            player.superSeqStep = 1;
                            player.superSeqTimer = 0.0f;
                            timeScale = 0.3f;
                            SpawnTextEffect(opponent.position, "YOU CAN'T SEE ME!", SKYBLUE);
                        } else if (player.meme == MEME_GIGACHAD) {
                            player.superModeTimer = 5.0f;
                            SpawnTextEffect(player.position, "GIGA FURY ACTIVATED", GOLD);
                            SpawnParticles(player.position, GOLD, 50, true);
                            screenShake = 0.4f;
                        } else if (player.meme == MEME_DOGE) {
                            player.superSeqStep = 1;
                            player.superSeqTimer = 0.0f;
                            timeScale = 0.2f;
                            SpawnTextEffect(opponent.position, "MUCH SPEED!!", ORANGE);
                        } else if (player.meme == MEME_PEPE) {
                            player.counterActiveTimer = 3.5f;
                            SpawnTextEffect(player.position, "TRY PUNCHING ME", LIME);
                            // Tear particle burst
                            SpawnParticles((Vector3){player.position.x, player.position.y + 1.8f, player.position.z}, LIME, 40, false);
                        }
                    }
                }
                
                // Animate Player punch
                if (player.isPunchingLeft || player.isPunchingRight) {
                    float spd = characters[player.meme].speed;
                    // Gigachad super fury buffed punch speed
                    if (player.meme == MEME_GIGACHAD && player.superModeTimer > 0.0f) {
                        spd *= 1.5f;
                    }
                    
                    player.punchProgress += dt * 5.0f * spd * timeScale;
                    
                    // Punch Hit registration (occurs at peak of punch)
                    if (player.punchProgress >= 0.5f && player.punchProgress - dt * 5.0f * spd * timeScale < 0.5f) {
                        // Check if hit connects
                        Vector3 hitPos = (Vector3){ opponent.position.x, opponent.position.y + 1.7f, opponent.position.z };
                        
                        // Check dodge
                        bool dodged = false;
                        if (opponent.dodgeState != 0) {
                            // Opponent dodges correctly
                            // If player throws left punch, opponent needs to dodge left (relative to camera, which is right)
                            if ((player.isPunchingLeft && opponent.dodgeState == -1) || 
                                (player.isPunchingRight && opponent.dodgeState == 1)) {
                                dodged = true;
                            }
                        }
                        
                        // Cena invisibility dodge chance
                        if (opponent.meme == MEME_CENA && opponent.isSuperActive && (rand() % 4 != 0)) {
                            dodged = true;
                        }
                        
                        if (dodged) {
                            PlaySound(sounds.dodge);
                            SpawnTextEffect(hitPos, "DODGED", SKYBLUE);
                            opponent.rage = fminf(opponent.rage + 15.0f, 100.0f);
                        } else if (opponent.isBlocking) {
                            // Block hit
                            PlaySound(sounds.block);
                            int baseDamage = (int)(8.0f * characters[player.meme].powerMultiplier);
                            if (player.meme == MEME_GIGACHAD && player.superModeTimer > 0.0f) baseDamage *= 2.0f;
                            
                            int damage = baseDamage * 0.15f; // 85% reduction
                            opponent.health -= damage;
                            opponent.stamina = fmaxf(opponent.stamina - 20.0f, 0.0f);
                            
                            SpawnTextEffect(hitPos, "BLOCKED", GRAY);
                            SpawnParticles(hitPos, WHITE, 8, false);
                            
                            // Pepe counter trigger
                            if (opponent.meme == MEME_PEPE && opponent.counterActiveTimer > 0.0f) {
                                opponent.counterActiveTimer = 0.0f;
                                opponent.isPunchingRight = true;
                                opponent.punchProgress = 0.1f;
                                opponent.stamina = opponent.maxStamina;
                                SpawnTextEffect(opponent.position, "FEELS BAD COUNTER!", LIME);
                            }
                        } else {
                            // Hard hit
                            PlaySound(sounds.hit);
                            int damage = (int)((10 + rand() % 6) * characters[player.meme].powerMultiplier);
                            
                            // Check Gigachad super
                            if (player.meme == MEME_GIGACHAD && player.superModeTimer > 0.0f) {
                                damage *= 2.5f;
                                screenShake = 0.5f;
                                SpawnParticles(hitPos, GOLD, 25, true);
                            } else {
                                screenShake = 0.25f;
                                SpawnParticles(hitPos, RED, 15, false);
                                SpawnParticles(hitPos, GOLD, 8, true);
                            }
                            
                            opponent.health -= damage;
                            
                            // Trigger recoil
                            if (opponent.superModeTimer <= 0.0f) { // Gigachad has super armor, no stagger
                                opponent.hitReactionTimer = 0.22f;
                                // Dizzy check
                                if (opponent.health < 25 && rand() % 2 == 0) {
                                    opponent.dizzyTimer = 1.5f;
                                }
                            }
                            
                            // Visual Floating Text
                            const char *splash = "POW!";
                            if (damage > 20) splash = "CRITICAL!";
                            else if (player.meme == MEME_DOGE) splash = "MUCH HIT!";
                            SpawnTextEffect(hitPos, splash, characters[player.meme].color);
                            
                            player.rage = fminf(player.rage + 15.0f, 100.0f);
                        }
                        
                        // Check Opponent KO
                        if (opponent.health <= 0) {
                            opponent.health = 0;
                            state = STATE_KO;
                            opponent.isKo = true;
                            opponent.koProgress = 0.0f;
                            koTimer = 3.5f;
                            timeScale = 0.15f; // super slow motion KO
                            PlaySound(sounds.ko);
                            PlaySound(sounds.bell);
                            strcpy(topMsg, "K.O.!");
                        }
                    }
                    
                    if (player.punchProgress >= 1.0f) {
                        player.isPunchingLeft = false;
                        player.isPunchingRight = false;
                        player.punchProgress = 0.0f;
                    }
                }
                
                // John Cena special auto sequence
                if (player.meme == MEME_CENA && player.isSuperActive) {
                    player.superSeqTimer += dt / timeScale;
                    if (player.superSeqStep == 1 && player.superSeqTimer > 0.4f) {
                        // Vanish and punch 1
                        player.position.x = -1.2f; // teleport left
                        player.isPunchingRight = true;
                        player.punchProgress = 0.0f;
                        player.superSeqStep = 2;
                        player.superSeqTimer = 0.0f;
                        PlaySound(sounds.dodge);
                    }
                    else if (player.superSeqStep == 2 && player.superSeqTimer > 0.5f && !player.isPunchingRight) {
                        // Teleport right and punch 2
                        player.position.x = 1.2f;
                        player.isPunchingLeft = true;
                        player.punchProgress = 0.0f;
                        player.superSeqStep = 3;
                        player.superSeqTimer = 0.0f;
                        PlaySound(sounds.dodge);
                    }
                    else if (player.superSeqStep == 3 && player.superSeqTimer > 0.5f && !player.isPunchingLeft) {
                        // Teleport center and giant overhead
                        player.position.x = 0.0f;
                        player.isPunchingRight = true;
                        player.punchProgress = 0.0f;
                        player.superSeqStep = 4;
                        player.superSeqTimer = 0.0f;
                        // Buff the power of this hit
                        characters[player.meme].powerMultiplier = 2.5f;
                        PlaySound(sounds.superActivate);
                    }
                    else if (player.superSeqStep == 4 && !player.isPunchingRight) {
                        player.isSuperActive = false;
                        characters[player.meme].powerMultiplier = 1.0f; // reset power
                        timeScale = 1.0f;
                    }
                }
                
                // Doge special auto flurry
                if (player.meme == MEME_DOGE && player.isSuperActive) {
                    player.superSeqTimer += dt / timeScale;
                    // Trigger rapid jabs
                    if (player.superSeqStep >= 1 && player.superSeqStep <= 6) {
                        if (!player.isPunchingLeft && !player.isPunchingRight) {
                            if (player.superSeqStep % 2 == 0) player.isPunchingLeft = true;
                            else player.isPunchingRight = true;
                            player.punchProgress = 0.0f;
                            player.superSeqStep++;
                            PlaySound(sounds.dodge);
                            
                            // Spawn random comic text
                            const char *dogeText[] = { "MUCH WOW", "SO SPEED", "VERY BOX", "SUCH PUNCH", "WOW" };
                            SpawnTextEffect(opponent.position, dogeText[rand() % 5], ORANGE);
                        }
                    } else if (player.superSeqStep > 6 && !player.isPunchingLeft && !player.isPunchingRight) {
                        player.isSuperActive = false;
                        timeScale = 1.0f;
                    }
                }
                
                // LERP Player leans back to idle
                float targetLeanX = player.dodgeState * 0.35f;
                float targetLeanZ = (player.hitReactionTimer > 0.0f) ? -0.45f : 0.0f;
                
                player.currentLeanX = Lerp(player.currentLeanX, targetLeanX, 15.0f * dt * timeScale);
                player.currentLeanZ = Lerp(player.currentLeanZ, targetLeanZ, 15.0f * dt * timeScale);
                
                if (player.hitReactionTimer > 0.0f) player.hitReactionTimer -= dt * timeScale;
                
                //------------------------------------------------------------------------
                // OPPONENT UPDATE (AI)
                //------------------------------------------------------------------------
                // Recovery
                if (!opponent.isBlocking) {
                    opponent.stamina = Lerp(opponent.stamina, opponent.maxStamina, 0.4f * dt * timeScale);
                } else {
                    opponent.stamina = Lerp(opponent.stamina, opponent.maxStamina, 0.15f * dt * timeScale);
                }
                
                // Recover from dizzy
                if (opponent.dizzyTimer > 0.0f) {
                    opponent.dizzyTimer -= dt * timeScale;
                } else if (opponent.hitReactionTimer <= 0.0f && !opponent.isSuperActive) {
                    // AI Decision Tree
                    opponent.superSeqTimer += dt * timeScale;
                    if (opponent.superSeqTimer > (0.4f + (float)(rand() % 5) / 10.0f)) {
                        opponent.superSeqTimer = 0.0f;
                        
                        // Decide behavior
                        int roll = rand() % 100;
                        
                        // Gigachad AI: punch heavy
                        if (opponent.meme == MEME_GIGACHAD) {
                            if (roll < 55) { // punch
                                if (opponent.stamina > 25.0f) {
                                    if (rand() % 2 == 0) opponent.isPunchingLeft = true;
                                    else opponent.isPunchingRight = true;
                                    opponent.punchProgress = 0.0f;
                                    opponent.stamina -= 20.0f;
                                    PlaySound(sounds.dodge);
                                }
                            } else if (roll < 85) { // block
                                opponent.isBlocking = true;
                                opponent.dodgeTimer = 0.6f; // hold block
                            }
                        }
                        // Cena AI: rapid dodge and punch
                        else if (opponent.meme == MEME_CENA) {
                            if (roll < 45) { // punch fast
                                if (opponent.stamina > 15.0f) {
                                    if (rand() % 2 == 0) opponent.isPunchingLeft = true;
                                    else opponent.isPunchingRight = true;
                                    opponent.punchProgress = 0.0f;
                                    opponent.stamina -= 15.0f;
                                    PlaySound(sounds.dodge);
                                }
                            } else if (roll < 75) { // dodge
                                opponent.dodgeState = (rand() % 2 == 0) ? -1 : 1;
                                opponent.dodgeTimer = 0.3f;
                            }
                        }
                        // Doge AI: erratic dodge spam
                        else if (opponent.meme == MEME_DOGE) {
                            if (roll < 35) { // light jab
                                if (opponent.stamina > 10.0f) {
                                    if (rand() % 2 == 0) opponent.isPunchingLeft = true;
                                    else opponent.isPunchingRight = true;
                                    opponent.punchProgress = 0.0f;
                                    opponent.stamina -= 12.0f;
                                    PlaySound(sounds.dodge);
                                }
                            } else if (roll < 80) { // dodge constantly
                                opponent.dodgeState = (rand() % 2 == 0) ? -1 : 1;
                                opponent.dodgeTimer = 0.35f;
                            }
                        }
                        // Pepe AI: heavy blocking
                        else if (opponent.meme == MEME_PEPE) {
                            if (roll < 30) { // counter setup punch
                                if (opponent.stamina > 20.0f) {
                                    opponent.isPunchingLeft = true;
                                    opponent.punchProgress = 0.0f;
                                    opponent.stamina -= 18.0f;
                                    PlaySound(sounds.dodge);
                                }
                            } else if (roll < 80) { // block
                                opponent.isBlocking = true;
                                opponent.dodgeTimer = 0.7f;
                            }
                        }
                    }
                    
                    // Keep holding block/dodge if active
                    if (opponent.dodgeTimer > 0.0f) {
                        opponent.dodgeTimer -= dt * timeScale;
                        if (opponent.dodgeTimer <= 0.0f) {
                            opponent.dodgeState = 0;
                            opponent.isBlocking = false;
                        }
                    }
                    
                    // AI Special Activation when Rage is Full
                    if (opponent.rage >= 100.0f && rand() % 50 == 0) {
                        opponent.rage = 0.0f;
                        opponent.isSuperActive = true;
                        PlaySound(sounds.superActivate);
                        
                        if (opponent.meme == MEME_CENA) {
                            opponent.superSeqStep = 1;
                            opponent.superSeqTimer = 0.0f;
                            timeScale = 0.3f;
                            SpawnTextEffect(player.position, "YOU CAN'T SEE ME!", SKYBLUE);
                        } else if (opponent.meme == MEME_GIGACHAD) {
                            opponent.superModeTimer = 5.0f;
                            SpawnTextEffect(opponent.position, "GIGA FURY ACTIVATED", GOLD);
                            SpawnParticles(opponent.position, GOLD, 50, true);
                            screenShake = 0.4f;
                        } else if (opponent.meme == MEME_DOGE) {
                            opponent.superSeqStep = 1;
                            opponent.superSeqTimer = 0.0f;
                            timeScale = 0.2f;
                            SpawnTextEffect(player.position, "SO SPEED!!", ORANGE);
                        } else if (opponent.meme == MEME_PEPE) {
                            opponent.counterActiveTimer = 3.5f;
                            SpawnTextEffect(opponent.position, "TRY PUNCHING ME", LIME);
                            SpawnParticles((Vector3){opponent.position.x, opponent.position.y + 1.8f, opponent.position.z}, LIME, 40, false);
                        }
                    }
                }
                
                // Animate Opponent punch
                if (opponent.isPunchingLeft || opponent.isPunchingRight) {
                    float spd = characters[opponent.meme].speed;
                    if (opponent.meme == MEME_GIGACHAD && opponent.superModeTimer > 0.0f) {
                        spd *= 1.5f;
                    }
                    
                    opponent.punchProgress += dt * 5.0f * spd * timeScale;
                    
                    // Punch Hit Peak Check
                    if (opponent.punchProgress >= 0.5f && opponent.punchProgress - dt * 5.0f * spd * timeScale < 0.5f) {
                        Vector3 hitPos = (Vector3){ player.position.x, player.position.y + 1.7f, player.position.z };
                        
                        bool dodged = false;
                        if (player.dodgeState != 0) {
                            if ((opponent.isPunchingLeft && player.dodgeState == -1) || 
                                (opponent.isPunchingRight && player.dodgeState == 1)) {
                                dodged = true;
                            }
                        }
                        
                        if (player.meme == MEME_CENA && player.isSuperActive && (rand() % 4 != 0)) {
                            dodged = true;
                        }
                        
                        if (dodged) {
                            PlaySound(sounds.dodge);
                            SpawnTextEffect(hitPos, "EVADED", SKYBLUE);
                            player.rage = fminf(player.rage + 15.0f, 100.0f);
                        } else if (player.isBlocking) {
                            PlaySound(sounds.block);
                            int baseDamage = (int)(8.0f * characters[opponent.meme].powerMultiplier);
                            if (opponent.meme == MEME_GIGACHAD && opponent.superModeTimer > 0.0f) baseDamage *= 2.0f;
                            
                            int damage = baseDamage * 0.15f;
                            player.health -= damage;
                            player.stamina = fmaxf(player.stamina - 20.0f, 0.0f);
                            
                            SpawnTextEffect(hitPos, "BLOCKED", GRAY);
                            SpawnParticles(hitPos, WHITE, 8, false);
                            
                            if (player.meme == MEME_PEPE && player.counterActiveTimer > 0.0f) {
                                player.counterActiveTimer = 0.0f;
                                player.isPunchingRight = true;
                                player.punchProgress = 0.1f;
                                player.stamina = player.maxStamina;
                                SpawnTextEffect(player.position, "FEELS BAD COUNTER!", LIME);
                            }
                        } else {
                            PlaySound(sounds.hit);
                            int damage = (int)((10 + rand() % 6) * characters[opponent.meme].powerMultiplier);
                            if (opponent.meme == MEME_GIGACHAD && opponent.superModeTimer > 0.0f) {
                                damage *= 2.5f;
                                screenShake = 0.5f;
                                SpawnParticles(hitPos, GOLD, 25, true);
                            } else {
                                screenShake = 0.25f;
                                SpawnParticles(hitPos, RED, 15, false);
                                SpawnParticles(hitPos, GOLD, 8, true);
                            }
                            
                            player.health -= damage;
                            
                            if (player.superModeTimer <= 0.0f) {
                                player.hitReactionTimer = 0.22f;
                                if (player.health < 25 && rand() % 2 == 0) {
                                    player.dizzyTimer = 1.5f;
                                }
                            }
                            
                            const char *splash = "POW!";
                            if (damage > 20) splash = "CRITICAL!";
                            else if (opponent.meme == MEME_DOGE) splash = "SO HURT!";
                            SpawnTextEffect(hitPos, splash, characters[opponent.meme].color);
                            
                            opponent.rage = fminf(opponent.rage + 15.0f, 100.0f);
                        }
                        
                        // Check Player KO
                        if (player.health <= 0) {
                            player.health = 0;
                            state = STATE_KO;
                            player.isKo = true;
                            player.koProgress = 0.0f;
                            koTimer = 3.5f;
                            timeScale = 0.15f;
                            PlaySound(sounds.ko);
                            PlaySound(sounds.bell);
                            strcpy(topMsg, "K.O.!");
                        }
                    }
                    
                    if (opponent.punchProgress >= 1.0f) {
                        opponent.isPunchingLeft = false;
                        opponent.isPunchingRight = false;
                        opponent.punchProgress = 0.0f;
                    }
                }
                
                // Opponent Cena auto special sequence
                if (opponent.meme == MEME_CENA && opponent.isSuperActive) {
                    opponent.superSeqTimer += dt / timeScale;
                    if (opponent.superSeqStep == 1 && opponent.superSeqTimer > 0.4f) {
                        opponent.position.x = 1.2f; // teleport left relative
                        opponent.isPunchingRight = true;
                        opponent.punchProgress = 0.0f;
                        opponent.superSeqStep = 2;
                        opponent.superSeqTimer = 0.0f;
                        PlaySound(sounds.dodge);
                    }
                    else if (opponent.superSeqStep == 2 && opponent.superSeqTimer > 0.5f && !opponent.isPunchingRight) {
                        opponent.position.x = -1.2f;
                        opponent.isPunchingLeft = true;
                        opponent.punchProgress = 0.0f;
                        opponent.superSeqStep = 3;
                        opponent.superSeqTimer = 0.0f;
                        PlaySound(sounds.dodge);
                    }
                    else if (opponent.superSeqStep == 3 && opponent.superSeqTimer > 0.5f && !opponent.isPunchingLeft) {
                        opponent.position.x = 0.0f;
                        opponent.isPunchingRight = true;
                        opponent.punchProgress = 0.0f;
                        opponent.superSeqStep = 4;
                        opponent.superSeqTimer = 0.0f;
                        characters[opponent.meme].powerMultiplier = 2.5f;
                        PlaySound(sounds.superActivate);
                    }
                    else if (opponent.superSeqStep == 4 && !opponent.isPunchingRight) {
                        opponent.isSuperActive = false;
                        characters[opponent.meme].powerMultiplier = 1.0f;
                        timeScale = 1.0f;
                    }
                }
                
                // Opponent Doge flurry
                if (opponent.meme == MEME_DOGE && opponent.isSuperActive) {
                    opponent.superSeqTimer += dt / timeScale;
                    if (opponent.superSeqStep >= 1 && opponent.superSeqStep <= 6) {
                        if (!opponent.isPunchingLeft && !opponent.isPunchingRight) {
                            if (opponent.superSeqStep % 2 == 0) opponent.isPunchingLeft = true;
                            else opponent.isPunchingRight = true;
                            opponent.punchProgress = 0.0f;
                            opponent.superSeqStep++;
                            PlaySound(sounds.dodge);
                            
                            const char *dogeText[] = { "MUCH WOW", "SO SPEED", "VERY BOX", "SUCH PUNCH", "WOW" };
                            SpawnTextEffect(player.position, dogeText[rand() % 5], ORANGE);
                        }
                    } else if (opponent.superSeqStep > 6 && !opponent.isPunchingLeft && !opponent.isPunchingRight) {
                        opponent.isSuperActive = false;
                        timeScale = 1.0f;
                    }
                }
                
                // LERP Opponent lean back to idle
                float targetOppLeanX = opponent.dodgeState * 0.35f;
                float targetOppLeanZ = (opponent.hitReactionTimer > 0.0f) ? -0.45f : 0.0f;
                
                opponent.currentLeanX = Lerp(opponent.currentLeanX, targetOppLeanX, 15.0f * dt * timeScale);
                opponent.currentLeanZ = Lerp(opponent.currentLeanZ, targetOppLeanZ, 15.0f * dt * timeScale);
                
                if (opponent.hitReactionTimer > 0.0f) opponent.hitReactionTimer -= dt * timeScale;
                
                break;
            }
            case STATE_KO: {
                koTimer -= dt / timeScale; // actual real time countdown
                
                // Progress collapse animations
                if (player.isKo) {
                    player.koProgress = fminf(player.koProgress + dt * 4.0f, 1.0f);
                }
                if (opponent.isKo) {
                    opponent.koProgress = fminf(opponent.koProgress + dt * 4.0f, 1.0f);
                }
                
                // Camera slow-motion pan
                camera.position = Vector3RotateByAxisAngle(camera.position, (Vector3){0, 1, 0}, 0.15f * dt);
                
                if (koTimer <= 0.0f) {
                    state = STATE_GAMEOVER;
                    timeScale = 1.0f;
                    if (player.isKo) {
                        strcpy(middleMsg, "YOU LOSE!");
                    } else {
                        strcpy(middleMsg, "YOU WIN!");
                    }
                    endScreenTimer = 3.0f;
                }
                break;
            }
            case STATE_GAMEOVER: {
                if (endScreenTimer > 0.0f) endScreenTimer -= dt;
                
                // Press Enter to restart
                if (endScreenTimer <= 0.0f) {
                    if (IsKeyPressed(KEY_ENTER) || IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
                        state = STATE_CHAR_SELECT;
                        PlaySound(sounds.bell);
                    }
                }
                break;
            }
        }
        
        // Compute procedural skeletal layouts
        Vector3 playerHeadLoc = (Vector3){ player.position.x, player.position.y + 1.9f, player.position.z };
        Vector3 opponentHeadLoc = (Vector3){ opponent.position.x, opponent.position.y + 1.9f, opponent.position.z };
        
        CalculateSkeleton(&player, &playerSkeleton, globalTime, opponentHeadLoc);
        CalculateSkeleton(&opponent, &opponentSkeleton, globalTime, playerHeadLoc);
        
        // Apply camera shake values
        Vector3 shakenCamPos = camera.position;
        Vector3 shakenCamTar = camera.target;
        if (screenShake > 0.01f) {
            float rx = ((float)rand() / RAND_MAX * 2.0f - 1.0f) * screenShake * 0.4f;
            float ry = ((float)rand() / RAND_MAX * 2.0f - 1.0f) * screenShake * 0.4f;
            float rz = ((float)rand() / RAND_MAX * 2.0f - 1.0f) * screenShake * 0.4f;
            
            shakenCamPos.x += rx;
            shakenCamPos.y += ry;
            shakenCamPos.z += rz;
            shakenCamTar.x += rx;
            shakenCamTar.y += ry;
            shakenCamTar.z += rz;
        }
        
        //--------------------------------------------------------------------------------
        // DRAWING
        //--------------------------------------------------------------------------------
        BeginDrawing();
        ClearBackground((Color){ 10, 10, 15, 255 });
        
        if (state == STATE_GAMEPLAY || state == STATE_KO || state == STATE_INTRO || state == STATE_GAMEOVER) {
            //----------------------------------------------------------------------------
            // 3D Rendering Mode
            //----------------------------------------------------------------------------
            BeginMode3D((Camera3D){ shakenCamPos, shakenCamTar, camera.up, camera.fovy, camera.projection });
            
            DrawArena();
            
            // Draw Opponent Stickman Skeleton (fully opaque)
            float oppAlpha = 1.0f;
            // John Cena special semi-invisibility
            if (opponent.meme == MEME_CENA && opponent.isSuperActive) {
                oppAlpha = 0.12f + 0.1f * sinf(globalTime * 20.0f);
            }
            DrawStickman(&opponentSkeleton, characters[opponent.meme].color, RED, false, oppAlpha);
            
            // Draw Player Stickman Skeleton (wireframe/translucent blue so he doesn't occlude opponent)
            float playerAlpha = 0.5f;
            if (player.meme == MEME_CENA && player.isSuperActive) {
                playerAlpha = 0.12f + 0.08f * sinf(globalTime * 20.0f);
            }
            DrawStickman(&playerSkeleton, ColorAlpha(SKYBLUE, 0.6f), ColorAlpha(RED, 0.8f), true, playerAlpha);
            
            // Draw Opponent Head (just the meme billboard)
            DrawBillboard(camera, characters[opponent.meme].texture, opponentSkeleton.head, 0.65f, ColorAlpha(WHITE, oppAlpha));
            
            // Draw Player Head (just a neon blue sphere, as it faces away from us)
            DrawSphere(playerSkeleton.head, 0.26f, ColorAlpha(SKYBLUE, 0.6f * playerAlpha));
            
            // Pepe crying tears special effect
            if (player.meme == MEME_PEPE && player.counterActiveTimer > 0.0f && (rand() % 4 == 0)) {
                Vector3 tearLoc = Vector3Add(playerSkeleton.head, (Vector3){0, -0.1f, 0.1f});
                SpawnParticles(tearLoc, BLUE, 3, false);
            }
            if (opponent.meme == MEME_PEPE && opponent.counterActiveTimer > 0.0f && (rand() % 4 == 0)) {
                Vector3 tearLoc = Vector3Add(opponentSkeleton.head, (Vector3){0, -0.1f, -0.1f});
                SpawnParticles(tearLoc, BLUE, 3, false);
            }
            
            // Draw Particles
            for (int i = 0; i < MAX_PARTICLES; i++) {
                if (particles[i].active) {
                    DrawSphere(particles[i].position, particles[i].size * particles[i].life, ColorAlpha(particles[i].color, particles[i].life));
                }
            }
            
            // Draw Spotlight Cone last (so it doesn't clip background depth testing)
            DrawCylinderEx((Vector3){0, 8.0f, 0}, (Vector3){0, 0.02f, 0}, 0.5f, 6.0f, 16, (Color){ 255, 255, 200, 12 });
            
            EndMode3D();
            
            //----------------------------------------------------------------------------
            // 2D Interface Overlays
            //----------------------------------------------------------------------------
            
            // Draw Camera Crowd flashes
            for (int i = 0; i < MAX_FLASHES; i++) {
                if (cameraFlashes[i].active) {
                    DrawCircleV(cameraFlashes[i].position, 12.0f * (cameraFlashes[i].life / 0.15f), ColorAlpha(WHITE, cameraFlashes[i].life / 0.15f));
                }
            }
            
            // Project and draw Floating Comic texts
            for (int i = 0; i < MAX_TEXT_EFFECTS; i++) {
                if (textEffects[i].active) {
                    Vector2 screenPos = GetWorldToScreen(textEffects[i].position, camera);
                    if (screenPos.x >= 0 && screenPos.y >= 0) {
                        int fontSize = (int)(25.0f * textEffects[i].size * (0.5f + 0.5f * textEffects[i].life));
                        int w = MeasureText(textEffects[i].text, fontSize);
                        
                        // Shadow
                        DrawText(textEffects[i].text, screenPos.x - w/2 + 2, screenPos.y - fontSize/2 + 2, fontSize, BLACK);
                        // Text core
                        DrawText(textEffects[i].text, screenPos.x - w/2, screenPos.y - fontSize/2, fontSize, ColorAlpha(textEffects[i].color, textEffects[i].life));
                    }
                }
            }
            
            // Draw UI HUD (Health & Stamina Bars)
            // Left HUD: Player
            DrawRectangle(25, 25, 400, 110, ColorAlpha(BLACK, 0.4f));
            DrawRectangleLines(25, 25, 400, 110, SKYBLUE);
            DrawText(characters[player.meme].name, 40, 35, 20, SKYBLUE);
            
            // Player HP
            float hpPct = (float)player.health / player.maxHealth;
            DrawRectangle(140, 65, 260, 16, (Color){60, 20, 20, 255});
            DrawRectangle(140, 65, (int)(260 * hpPct), 16, characters[player.meme].color);
            DrawRectangleLines(140, 65, 260, 16, GRAY);
            DrawText("HP", 40, 65, 16, WHITE);
            
            // Player Stamina
            float stamPct = player.stamina / player.maxStamina;
            DrawRectangle(140, 85, 260, 10, (Color){20, 30, 40, 255});
            DrawRectangle(140, 85, (int)(260 * stamPct), 10, SKYBLUE);
            DrawRectangleLines(140, 85, 260, 10, GRAY);
            DrawText("STAMINA", 40, 82, 14, LIGHTGRAY);
            
            // Player Rage Bar
            float ragePct = player.rage / 100.0f;
            DrawRectangle(140, 100, 260, 8, (Color){30, 10, 30, 255});
            DrawRectangle(140, 100, (int)(260 * ragePct), 8, MAGENTA);
            DrawRectangleLines(140, 100, 260, 8, GRAY);
            DrawText("RAGE", 40, 96, 12, MAGENTA);
            if (player.rage >= 100.0f) {
                // Flashing rage notification
                if ((int)(globalTime * 5.0f) % 2 == 0) {
                    DrawText("PRESS [F] FOR SPECIAL!", 140, 110, 14, GOLD);
                }
            }
            if (player.superModeTimer > 0.0f) {
                DrawText("SUPER ACTIVE!", 140, 110, 14, GOLD);
            }
            
            // Right HUD: Opponent
            DrawRectangle(SCREEN_WIDTH - 425, 25, 400, 110, ColorAlpha(BLACK, 0.4f));
            DrawRectangleLines(SCREEN_WIDTH - 425, 25, 400, 110, ORANGE);
            int oppNameW = MeasureText(characters[opponent.meme].name, 20);
            DrawText(characters[opponent.meme].name, SCREEN_WIDTH - 40 - oppNameW, 35, 20, ORANGE);
            
            // Opponent HP
            float oppHpPct = (float)opponent.health / opponent.maxHealth;
            DrawRectangle(SCREEN_WIDTH - 400, 65, 260, 16, (Color){60, 20, 20, 255});
            DrawRectangle(SCREEN_WIDTH - 400, 65, (int)(260 * oppHpPct), 16, characters[opponent.meme].color);
            DrawRectangleLines(SCREEN_WIDTH - 400, 65, 260, 16, GRAY);
            DrawText("HP", SCREEN_WIDTH - 425, 65, 16, WHITE);
            
            // Opponent Stamina
            float oppStamPct = opponent.stamina / opponent.maxStamina;
            DrawRectangle(SCREEN_WIDTH - 400, 85, 260, 10, (Color){20, 30, 40, 255});
            DrawRectangle(SCREEN_WIDTH - 400, 85, (int)(260 * oppStamPct), 10, SKYBLUE);
            DrawRectangleLines(SCREEN_WIDTH - 400, 85, 260, 10, GRAY);
            DrawText("STAMINA", SCREEN_WIDTH - 400 - 80, 82, 14, LIGHTGRAY);
            
            // Opponent Rage Bar
            float oppRagePct = opponent.rage / 100.0f;
            DrawRectangle(SCREEN_WIDTH - 400, 100, 260, 8, (Color){30, 10, 30, 255});
            DrawRectangle(SCREEN_WIDTH - 400, 100, (int)(260 * oppRagePct), 8, MAGENTA);
            DrawRectangleLines(SCREEN_WIDTH - 400, 100, 260, 8, GRAY);
            DrawText("RAGE", SCREEN_WIDTH - 400 - 50, 96, 12, MAGENTA);
            if (opponent.superModeTimer > 0.0f) {
                DrawText("SUPER ACTIVE!", SCREEN_WIDTH - 400, 110, 14, GOLD);
            }
            
            // Round Timer UI
            DrawRectangle(SCREEN_WIDTH/2 - 60, 25, 120, 50, ColorAlpha(BLACK, 0.6f));
            DrawRectangleLines(SCREEN_WIDTH/2 - 60, 25, 120, 50, GOLD);
            char timerStr[16];
            sprintf(timerStr, "%02d", (int)roundTimer);
            int timeW = MeasureText(timerStr, 32);
            DrawText(timerStr, SCREEN_WIDTH/2 - timeW/2, 32, 32, GOLD);
            
            // Draw Control guide in gameplay
            DrawText("[J / LMB] Left Jab   [K / RMB] Right Jab   [S / SPACE] Block   [A/D] Dodge Left/Right", 25, SCREEN_HEIGHT - 35, 16, LIGHTGRAY);
            
            // Top large texts (Fight, KO, round timers)
            if (state == STATE_INTRO) {
                int introW = MeasureText("ROUND 1", 50);
                DrawText("ROUND 1", SCREEN_WIDTH/2 - introW/2, SCREEN_HEIGHT/2 - 60, 50, GOLD);
                
                int fightW = MeasureText("READY...", 40);
                DrawText("READY...", SCREEN_WIDTH/2 - fightW/2, SCREEN_HEIGHT/2 + 10, 40, WHITE);
            }
            else if (state == STATE_KO) {
                int koW = MeasureText("K.O.!", 80);
                DrawText("K.O.!", SCREEN_WIDTH/2 - koW/2 + 4, SCREEN_HEIGHT/2 - 100 + 4, 80, BLACK);
                DrawText("K.O.!", SCREEN_WIDTH/2 - koW/2, SCREEN_HEIGHT/2 - 100, 80, RED);
            }
            else if (state == STATE_GAMEOVER) {
                int winW = MeasureText(middleMsg, 80);
                DrawText(middleMsg, SCREEN_WIDTH/2 - winW/2 + 4, SCREEN_HEIGHT/2 - 100 + 4, 80, BLACK);
                DrawText(middleMsg, SCREEN_WIDTH/2 - winW/2, SCREEN_HEIGHT/2 - 100, 80, GOLD);
                
                if (endScreenTimer <= 0.0f) {
                    int rstW = MeasureText("PRESS ENTER / CLICK TO REMATCH", 24);
                    DrawText("PRESS ENTER / CLICK TO REMATCH", SCREEN_WIDTH/2 - rstW/2, SCREEN_HEIGHT/2 + 30, 24, WHITE);
                }
            }
        }
        else if (state == STATE_MENU) {
            //----------------------------------------------------------------------------
            // Main Menu Drawing
            //----------------------------------------------------------------------------
            // Draw neon Grid lines in background
            for (int x = 0; x < SCREEN_WIDTH; x += 60) {
                DrawLine(x, 0, x, SCREEN_HEIGHT, (Color){ 20, 20, 30, 255 });
            }
            for (int y = 0; y < SCREEN_HEIGHT; y += 60) {
                DrawLine(0, y, SCREEN_WIDTH, y, (Color){ 20, 20, 30, 255 });
            }
            
            // Draw glowing title
            const char *title = "STICKMAN MEME BOXING 3D";
            int titleSize = 58;
            int titleW = MeasureText(title, titleSize);
            
            // Pulsing title glow
            float titlePulse = sinf(GetTime() * 4.0f) * 0.15f + 0.85f;
            DrawText(title, SCREEN_WIDTH/2 - titleW/2 + 4, SCREEN_HEIGHT/3 - 40 + 4, titleSize, BLACK);
            DrawText(title, SCREEN_WIDTH/2 - titleW/2, SCREEN_HEIGHT/3 - 40, titleSize, ColorAlpha(SKYBLUE, titlePulse));
            
            // Draw tagline
            const char *tag = "Fight the internet's legends in dynamic 3D physics!";
            int tagW = MeasureText(tag, 22);
            DrawText(tag, SCREEN_WIDTH/2 - tagW/2, SCREEN_HEIGHT/3 + 40, 22, LIGHTGRAY);
            
            // Click to Play button
            const char *btnText = "PRESS ENTER OR CLICK TO START";
            int btnW = MeasureText(btnText, 26);
            float btnPulse = sinf(GetTime() * 7.0f) * 0.25f + 0.75f;
            DrawText(btnText, SCREEN_WIDTH/2 - btnW/2, SCREEN_HEIGHT * 2/3, 26, ColorAlpha(GOLD, btnPulse));
            
            DrawText("Built with C & Raylib", 20, SCREEN_HEIGHT - 35, 16, DARKGRAY);
        }
        else if (state == STATE_CHAR_SELECT) {
            //----------------------------------------------------------------------------
            // Character Select Screen Drawing
            //----------------------------------------------------------------------------
            // Title
            int selectW = MeasureText("SELECT FIGHTERS", 38);
            DrawText("SELECT FIGHTERS", SCREEN_WIDTH/2 - selectW/2, 30, 38, GOLD);
            
            // Card layout metrics
            float cardW = 125.0f;
            float cardH = 175.0f;
            float cardGap = 20.0f;
            
            // Player side Cards (Left) - 2x2 layout to prevent overlapping
            DrawText("YOUR FIGHTER", 95, 95, 22, SKYBLUE);
            for (int i = 0; i < MEME_COUNT; i++) {
                float x = 50.0f + (i % 2) * (cardW + cardGap);
                float y = 135.0f + (i / 2) * (cardH + cardGap);
                Rectangle cardRect = { x, y, cardW, cardH };
                
                Vector2 m = GetMousePosition();
                bool hovered = CheckCollisionPointRec(m, cardRect);
                bool selected = (playerSelectedMeme == i);
                
                if (DrawCharacterCard(&characters[i], cardRect, selected, hovered)) {
                    playerSelectedMeme = i;
                    PlaySound(sounds.block);
                }
            }
            
            // Opponent side Cards (Right) - 2x2 layout to prevent overlapping
            int oppNameWText = MeasureText("YOUR OPPONENT", 22);
            DrawText("YOUR OPPONENT", SCREEN_WIDTH - 95 - oppNameWText, 95, 22, ORANGE);
            for (int i = 0; i < MEME_COUNT; i++) {
                float x = SCREEN_WIDTH - 50.0f - cardW - (1 - (i % 2)) * (cardW + cardGap);
                float y = 135.0f + (i / 2) * (cardH + cardGap);
                Rectangle cardRect = { x, y, cardW, cardH };
                
                Vector2 m = GetMousePosition();
                bool hovered = CheckCollisionPointRec(m, cardRect);
                bool selected = (opponentSelectedMeme == i);
                
                if (DrawCharacterCard(&characters[i], cardRect, selected, hovered)) {
                    opponentSelectedMeme = i;
                    PlaySound(sounds.block);
                }
            }
            
            // Display hovered/selected details in center-bottom
            int currentViewedMeme = playerSelectedMeme; // default to showing player selection details
            Vector2 m = GetMousePosition();
            
            // Check if mouse is hovering over any opponent card
            for (int i = 0; i < MEME_COUNT; i++) {
                Rectangle cardRectPl = { 120.0f + i * (cardW + cardGap), 140.0f, cardW, cardH };
                Rectangle cardRectOpp = { SCREEN_WIDTH - 120.0f - (MEME_COUNT - i) * (cardW + cardGap), 140.0f, cardW, cardH };
                if (CheckCollisionPointRec(m, cardRectPl)) currentViewedMeme = i;
                if (CheckCollisionPointRec(m, cardRectOpp)) currentViewedMeme = i;
            }
            
            MemeCharacter *ch = &characters[currentViewedMeme];
            
            // Details box - Centered and scaled to fit the 2x2 card layout margins
            float detailsW = 580.0f;
            float detailsX = SCREEN_WIDTH/2 - detailsW/2;
            float detailsY = 350.0f;
            float detailsH = 220.0f;
            
            DrawRectangleRec((Rectangle){detailsX, detailsY, detailsW, detailsH}, ColorAlpha(BLACK, 0.4f));
            DrawRectangleLinesEx((Rectangle){detailsX, detailsY, detailsW, detailsH}, 2.0f, ch->color);
            
            DrawText(ch->name, detailsX + 20, detailsY + 20, 24, ch->color);
            DrawText(ch->tagline, detailsX + 20, detailsY + 50, 16, LIGHTGRAY);
            
            // Stats Bars - Left Column
            DrawStatBar("HP", (float)ch->maxHealth, 160.0f, detailsX + 20, detailsY + 90, 240.0f, 12.0f, ch->color);
            DrawStatBar("SPEED", ch->speed, 1.6f, detailsX + 20, detailsY + 120, 240.0f, 12.0f, ch->color);
            DrawStatBar("POWER", ch->powerMultiplier, 2.2f, detailsX + 20, detailsY + 150, 240.0f, 12.0f, ch->color);
            
            // Special Move details - Right Column
            DrawText("SPECIAL MOVE:", detailsX + 280, detailsY + 25, 16, MAGENTA);
            DrawText(ch->specialName, detailsX + 280, detailsY + 45, 18, GOLD);
            
            Rectangle descRect = { detailsX + 280, detailsY + 75, 280, 120 };
            DrawTextWrapped(ch->specialDesc, descRect.x, descRect.y, descRect.width, 14, LIGHTGRAY);
            
            // Start Fight Button
            Rectangle btnRect = { SCREEN_WIDTH/2 - 130, 600, 260, 55 };
            bool btnHovered = CheckCollisionPointRec(m, btnRect);
            DrawRectangleRec(btnRect, btnHovered ? GOLD : ColorAlpha(GOLD, 0.8f));
            DrawRectangleLinesEx(btnRect, 2.0f, WHITE);
            
            const char *fightText = "FIGHT!";
            int fW = MeasureText(fightText, 28);
            DrawText(fightText, btnRect.x + btnRect.width/2 - fW/2, btnRect.y + btnRect.height/2 - 14, 28, BLACK);
            
            if (btnHovered && IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
                // Initialize Gameplay values
                state = STATE_INTRO;
                introTimer = 2.0f;
                timeScale = 1.0f;
                PlaySound(sounds.bell);
                
                // Initialize Player
                player.position = (Vector3){ 0.0f, 0.0f, 2.2f };
                player.forward = (Vector3){ 0.0f, 0.0f, -1.0f };
                player.right = (Vector3){ 1.0f, 0.0f, 0.0f };
                player.health = characters[playerSelectedMeme].maxHealth;
                player.maxHealth = characters[playerSelectedMeme].maxHealth;
                player.stamina = 100.0f;
                player.maxStamina = 100.0f;
                player.rage = 0.0f;
                player.meme = playerSelectedMeme;
                player.isPunchingLeft = false;
                player.isPunchingRight = false;
                player.isBlocking = false;
                player.dodgeState = 0;
                player.hitReactionTimer = 0.0f;
                player.dizzyTimer = 0.0f;
                player.isKo = false;
                player.koProgress = 0.0f;
                player.superModeTimer = 0.0f;
                player.counterActiveTimer = 0.0f;
                player.isSuperActive = false;
                
                // Initialize Opponent
                opponent.position = (Vector3){ 0.0f, 0.0f, -2.2f };
                opponent.forward = (Vector3){ 0.0f, 0.0f, 1.0f };
                opponent.right = (Vector3){ -1.0f, 0.0f, 0.0f };
                opponent.health = characters[opponentSelectedMeme].maxHealth;
                opponent.maxHealth = characters[opponentSelectedMeme].maxHealth;
                opponent.stamina = 100.0f;
                opponent.maxStamina = 100.0f;
                opponent.rage = 0.0f;
                opponent.meme = opponentSelectedMeme;
                opponent.isPunchingLeft = false;
                opponent.isPunchingRight = false;
                opponent.isBlocking = false;
                opponent.dodgeState = 0;
                opponent.hitReactionTimer = 0.0f;
                opponent.dizzyTimer = 0.0f;
                opponent.isKo = false;
                opponent.koProgress = 0.0f;
                opponent.superModeTimer = 0.0f;
                opponent.counterActiveTimer = 0.0f;
                opponent.isSuperActive = false;
                
                // Clear particles
                memset(particles, 0, sizeof(particles));
                memset(textEffects, 0, sizeof(textEffects));
                
                // Reset power multiplier
                for(int k=0; k<MEME_COUNT; k++) {
                    // Gigachad base multiplier is 2.0x, Cena 1.0x, Doge 0.7x, Pepe 1.2x
                    if (k == MEME_CENA) characters[k].powerMultiplier = 1.0f;
                    if (k == MEME_GIGACHAD) characters[k].powerMultiplier = 2.0f;
                    if (k == MEME_DOGE) characters[k].powerMultiplier = 0.7f;
                    if (k == MEME_PEPE) characters[k].powerMultiplier = 1.2f;
                }
            }
        }
        
        EndDrawing();
    }
    
    //------------------------------------------------------------------------------------
    // Cleanup
    //------------------------------------------------------------------------------------
    // Unload Textures
    for (int i = 0; i < MEME_COUNT; i++) {
        UnloadTexture(characters[i].texture);
    }
    
    // Unload sound buffers
    UnloadSound(sounds.hit);
    UnloadSound(sounds.block);
    UnloadSound(sounds.dodge);
    UnloadSound(sounds.bell);
    UnloadSound(sounds.ko);
    UnloadSound(sounds.superCharge);
    UnloadSound(sounds.superActivate);
    
    CloseAudioDevice();
    CloseWindow();

    return 0;
}
