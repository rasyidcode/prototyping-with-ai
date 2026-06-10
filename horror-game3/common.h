#ifndef COMMON_H
#define COMMON_H

#include "raylib.h"
#include "raymath.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#ifndef Clamp
#define Clamp(value, min, max) (((value) < (min)) ? (min) : (((value) > (max)) ? (max) : (value)))
#endif

// Game constants
#define SCREEN_WIDTH 1024
#define SCREEN_HEIGHT 768
#define VIEWPORT_WIDTH 768
#define VIEWPORT_HEIGHT 768

#define MAP_WIDTH 20
#define MAP_HEIGHT 21

#define MAX_CHAT_MESSAGES 30
#define MAX_USERNAME_LEN 24
#define MAX_TEXT_LEN 64
#define MAX_OPEN_DOORS 16

// Game States
typedef enum {
    STATE_TITLE,
    STATE_INTRO,
    STATE_PLAYING,
    STATE_GAMEOVER_DEAD,
    STATE_GAMEOVER_BORED,
    STATE_VICTORY
} GameState;

// Monster States
typedef enum {
    MONSTER_PATROL,
    MONSTER_CHASE
} MonsterState;

// Chat message structure
typedef struct {
    char badge[8];
    char username[MAX_USERNAME_LEN];
    char text[MAX_TEXT_LEN];
    Color color;
    bool isSpecial;
} ChatMessage;

// Open door tracking
typedef struct {
    int x, y;
    float timer;
    bool active;
} OpenDoor;

// Global game variables (extern)
extern GameState gameState;
extern Camera camera;
extern float playerAngleX;
extern float playerAngleY;

extern float batteryLevel;
extern bool flashlightOn;
extern int evidenceCount;
extern bool hasKey;
extern int viewerCount;
extern float streamTime;
extern int subscriberCount;
extern float donationGoal;
extern float donationRaised;

// Monster variables
extern Vector3 monsterPos;
extern Vector3 monsterTarget;
extern MonsterState monsterState;
extern float loseSightTimer;

// Open doors list
extern OpenDoor openDoors[MAX_OPEN_DOORS];

// Chat variables
extern ChatMessage chat[MAX_CHAT_MESSAGES];
extern int chatCount;
extern float chatSpawnTimer;

// Textures
extern Texture2D texWall;
extern Texture2D texFloor;
extern Texture2D texCeiling;
extern Texture2D texMonster;
extern Texture2D texBattery;
extern Texture2D texEvidence;
extern Texture2D texKey;
extern Texture2D texFlashlightMask;

// Sounds
extern Sound sndHeartbeat;
extern Sound sndPickup;
extern Sound sndStatic;
extern Sound sndDoor;
extern Sound sndAlert;
extern Sound sndFootstep;

// Map layout
extern int map[MAP_HEIGHT][MAP_WIDTH];

#endif // COMMON_H
