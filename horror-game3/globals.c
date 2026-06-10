#include "common.h"

GameState gameState = STATE_TITLE;
Camera camera = { 0 };
float playerAngleX = 0.0f;
float playerAngleY = 0.0f;

float batteryLevel = 100.0f;
bool flashlightOn = true;
int evidenceCount = 0;
bool hasKey = false;
int viewerCount = 200;
float streamTime = 0.0f;
int subscriberCount = 45;
float donationGoal = 500.0f;
float donationRaised = 124.00f;

Vector3 monsterPos = { 1.5f, 0.5f, 17.5f };
Vector3 monsterTarget = { 1.5f, 0.5f, 17.5f };
MonsterState monsterState = MONSTER_PATROL;
float loseSightTimer = 0.0f;

OpenDoor openDoors[MAX_OPEN_DOORS] = { 0 };

ChatMessage chat[MAX_CHAT_MESSAGES] = { 0 };
int chatCount = 0;
float chatSpawnTimer = 0.0f;

Texture2D texWall;
Texture2D texFloor;
Texture2D texCeiling;
Texture2D texMonster;
Texture2D texBattery;
Texture2D texEvidence;
Texture2D texKey;
Texture2D texFlashlightMask;

Sound sndHeartbeat;
Sound sndPickup;
Sound sndStatic;
Sound sndDoor;
Sound sndAlert;
Sound sndFootstep;

int map[MAP_HEIGHT][MAP_WIDTH] = {
    {1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1},
    {1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1},
    {1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,1,1,1,0,1},
    {1,0,1,0,0,0,1,4,1,0,0,0,1,0,0,0,0,1,0,1},
    {1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,0,1},
    {1,0,0,0,0,0,1,0,0,0,0,0,1,0,1,3,0,1,0,1},
    {1,1,1,1,6,1,1,1,1,6,1,0,1,0,1,1,1,1,0,1},
    {1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1},
    {1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,1,6,1,1,1},
    {1,0,1,3,0,0,1,0,1,0,0,0,0,0,1,0,0,0,4,1},
    {1,0,1,1,0,1,1,0,1,1,1,1,1,0,1,0,1,1,0,1},
    {1,0,0,0,0,1,0,0,0,0,0,0,1,0,1,7,1,0,0,1},
    {1,1,1,1,6,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1},
    {1,0,0,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0,0,1},
    {1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,1,0,1},
    {1,0,1,4,1,0,0,0,1,0,0,0,1,0,0,0,0,1,0,1},
    {1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1},
    {1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,3,1},
    {1,0,1,1,1,1,1,1,1,2,1,1,1,1,1,1,0,1,1,1},
    {1,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,1},
    {1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1}
};
