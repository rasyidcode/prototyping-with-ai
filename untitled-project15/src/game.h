#ifndef GAME_H
#define GAME_H

#include "raylib.h"
#include <stdbool.h>

// Screen & Container Dimensions
#define SCREEN_WIDTH 900
#define SCREEN_HEIGHT 850

#define CONTAINER_WIDTH 460
#define CONTAINER_HEIGHT 620
#define CONTAINER_X ((SCREEN_WIDTH - CONTAINER_WIDTH) / 2) // Center the container
#define CONTAINER_Y (SCREEN_HEIGHT - CONTAINER_HEIGHT - 40) // Bottom-aligned with a margin

#define DEATH_LINE_Y (CONTAINER_Y + 70) // Y coordinate of the warning line

// Game Physics Settings
#define GRAVITY 600.0f
#define PHYSICS_SUBSTEPS 8
#define BOUNCINESS 0.15f   // Restitution coefficient for elastic collisions
#define FRICTION 0.985f    // Friction applied during collisions
#define AIR_RESISTANCE 0.998f

// Maximum capacities
#define MAX_FRUITS 300
#define MAX_PARTICLES 400
#define MAX_FLOATING_TEXTS 50

// Evolution stages
typedef enum {
    FRUIT_CHERRY = 0,
    FRUIT_STRAWBERRY,
    FRUIT_GRAPE,
    FRUIT_DEKOPON,
    FRUIT_PERSIMMON,
    FRUIT_APPLE,
    FRUIT_PEAR,
    FRUIT_PEACH,
    FRUIT_PINEAPPLE,
    FRUIT_MELON,
    FRUIT_WATERMELON,
    FRUIT_COUNT
} FruitType;

// Structural definitions
typedef struct {
    FruitType type;
    float radius;
    float mass;
    Color color;
    const char* name;
    int scoreValue;
} FruitDef;

// Fruit definition global configuration lookup
extern const FruitDef FRUIT_DEFS[FRUIT_COUNT];

typedef struct {
    Vector2 position;
    Vector2 velocity;
    FruitType type;
    float radius;
    float mass;
    float rotation;
    float scale;             // For spring animation on spawn/merge
    float scaleTarget;
    bool active;
    bool isStatic;           // Held by dropper at the top
    float timeAboveLimit;     // Time spent above the death line
    unsigned int id;         // Unique identifier to help track merges
} Fruit;

typedef struct {
    Vector2 position;
    Vector2 velocity;
    Color color;
    float radius;
    float alpha;
    float life;              // Remaining lifespan in seconds
    float maxLife;
} Particle;

typedef struct {
    Vector2 position;
    char text[32];
    Color color;
    float alpha;
    float life;
    float maxLife;
    float velocityY;
} FloatingText;

typedef enum {
    STATE_START,
    STATE_PLAYING,
    STATE_GAMEOVER
} GameState;

// Global Game State Structure
typedef struct {
    GameState state;
    Fruit fruits[MAX_FRUITS];
    int fruitCount;
    unsigned int nextFruitId;
    
    Particle particles[MAX_PARTICLES];
    int particleCount;
    
    FloatingText floatingTexts[MAX_FLOATING_TEXTS];
    int floatingTextCount;
    
    int score;
    int highScore;
    
    // Dropper state
    float dropperX;
    FruitType currentDroppedType;
    FruitType nextDroppedType;
    bool hasDropped;
    float dropCooldownTimer;
    
    // Game over tracking
    bool warningActive;
    float warningTime; // Track if any fruit is above the death line
    
    // Sound/Visual elements
    float scoreVisual; // Animated score
} Game;

extern Game game;

// Core functions
void InitGame(void);
void UpdateGame(float dt);
void DrawGame(void);
void UnloadGame(void);

// Physics functions
void UpdatePhysics(float dt);
void ResolveBoundaryCollisions(Fruit* f);
void ResolveCircleCollisions(void);

// Particle functions
void SpawnParticleBurst(Vector2 position, Color color, int count);
void UpdateParticles(float dt);
void DrawParticles(void);

// Floating text functions
void SpawnFloatingText(Vector2 position, const char* text, Color color);
void UpdateFloatingTexts(float dt);
void DrawFloatingTexts(void);

// Procedural drawing utilities (renderer.c)
void DrawGlossyCircle(Vector2 center, float radius, Color color, float scale, float rotation, FruitType type);
void DrawEvoWheel(Vector2 center, float radius);

#endif // GAME_H
