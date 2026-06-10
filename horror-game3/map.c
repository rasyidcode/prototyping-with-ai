#include "map.h"
#include "chat.h"

bool IsWall(float x, float z) {
    int col = (int)floorf(x);
    int row = (int)floorf(z);
    
    if (col < 0 || col >= MAP_WIDTH || row < 0 || row >= MAP_HEIGHT) return true;
    
    int cell = map[row][col];
    // 1 = Solid wall, 2 = Locked Gate, 6 = Closed door
    if (cell == 1 || cell == 2 || cell == 6) return true;
    
    return false;
}

Vector3 CheckCollisionAndMove(Vector3 oldPos, Vector3 newPos, float radius) {
    // Check X movement
    if (IsWall(newPos.x + ((newPos.x > oldPos.x) ? radius : -radius), oldPos.z)) {
        newPos.x = oldPos.x;
    }
    // Check Z movement
    if (IsWall(oldPos.x, newPos.z + ((newPos.z > oldPos.z) ? radius : -radius))) {
        newPos.z = oldPos.z;
    }
    return newPos;
}

bool HasLineOfSight(Vector3 start, Vector3 end) {
    Vector3 dir = Vector3Subtract(end, start);
    float dist = Vector3Length(dir);
    if (dist > 10.0f) return false; // Max sight range
    
    int steps = (int)(dist * 5.0f);
    for (int i = 0; i <= steps; i++) {
        float t = (float)i / (float)steps;
        Vector3 p = Vector3Lerp(start, end, t);
        if (IsWall(p.x, p.z)) return false;
    }
    return true;
}

void UpdateDoors(void) {
    for (int i = 0; i < MAX_OPEN_DOORS; i++) {
        if (openDoors[i].active) {
            openDoors[i].timer -= GetFrameTime();
            if (openDoors[i].timer <= 0.0f) {
                int dx = openDoors[i].x;
                int dy = openDoors[i].y;
                
                int px = (int)floorf(camera.position.x);
                int pz = (int)floorf(camera.position.z);
                int mx = (int)floorf(monsterPos.x);
                int mz = (int)floorf(monsterPos.z);
                
                if ((px == dx && pz == dy) || (mx == dx && mz == dy)) {
                    openDoors[i].timer = 2.0f; // Wait and check again
                } else {
                    map[dy][dx] = 6;
                    openDoors[i].active = false;
                    PlaySound(sndDoor);
                    if (GetRandomValue(0, 3) == 0) {
                        AddChatMessage("", "SpookySpook", "bro did a door close by itself?!", RED, false);
                    }
                }
            }
        }
    }
}
