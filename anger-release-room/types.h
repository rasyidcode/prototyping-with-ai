#ifndef TYPES_H
#define TYPES_H

#include "raylib.h"

// Game limits
#define MAX_OBJECTS 64
#define MAX_DEBRIS 512
#define MAX_DECALS 256
#define MAX_PARTICLES 512
#define MAX_FLOATING_TEXTS 32
#define MAX_FURNITURE 12
#define MAX_SPAWN_SLOTS 24

// Room Dimensions
#define ROOM_WIDTH 20.0f
#define ROOM_DEPTH 20.0f
#define ROOM_HEIGHT 8.0f

// Game States
typedef enum {
    STATE_TITLE,
    STATE_GAMEPLAY,
    STATE_SUMMARY
} GameState;

// Object Types
typedef enum {
    OBJ_BOTTLE,
    OBJ_PLATE,
    OBJ_MUG,
    OBJ_VADO,
    OBJ_MONITOR,
    OBJ_COUNT
} ObjectType;

// Sound Identifiers
typedef enum {
    SND_PICKUP,
    SND_THROW,
    SND_SHATTER_GLASS,
    SND_SHATTER_CERAMIC,
    SND_SHATTER_MONITOR,
    SND_SPAWN,
    SND_CALM_SUCCESS,
    SND_COUNT
} SoundID;

// Breakable Object definition
typedef struct {
    ObjectType type;
    Vector3 position;
    Vector3 velocity;
    Quaternion rotation;
    Vector3 angularVelocity;
    bool isHeld;
    bool isThrown;
    bool isActive;
    float scale;
    Color color;
    Color wireColor;
    float angerValue;
} BreakableObject;

// Debris pieces spawned on shatter
typedef struct {
    Vector3 position;
    Vector3 velocity;
    Vector3 angularVelocity;
    Quaternion rotation;
    Color color;
    float scale;
    float life;
    float maxLife;
    int shapeType; // 0 = cube, 1 = cylinder/sphere slice, etc.
    bool active;
} Debris;

// Decals printed on room surfaces
typedef struct {
    Vector3 position;
    Vector3 normal;
    Color color;
    float size;
    float life; // for fading out, if desired
    bool active;
} Decal;

// Tiny fast particles (splashes, sparks)
typedef struct {
    Vector3 position;
    Vector3 velocity;
    Color color;
    float size;
    float life;
    float maxLife;
    bool active;
    bool isSpark;
} Particle;

// Floating 2D impact text
typedef struct {
    Vector3 position3D; // World position for tracking
    char text[32];
    Color color;
    float life;
    float maxLife;
    float speedY;
    bool active;
} FloatingText;

// Static room fixtures
typedef struct {
    BoundingBox box;
    Color color;
    Color wireColor;
    const char *name;
} Furniture;

// Slot where breakables can spawn
typedef struct {
    Vector3 position;
    int objectIndex; // -1 if empty
    float respawnTimer;
    ObjectType preferredType;
    float rotationY;
} SpawnSlot;

#endif // TYPES_H
