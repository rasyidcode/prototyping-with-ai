#include "map.h"
#include <math.h>

const int MAP_DATA[MAP_WIDTH * MAP_HEIGHT] = {
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
    1,0,2,2,0,0,3,3,0,0,2,2,2,2,0,0,3,3,0,0,2,2,0,1,
    1,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,1,
    1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
    1,0,0,0,2,2,0,0,0,3,3,0,0,3,3,0,0,0,2,2,0,0,0,1,
    1,0,3,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,3,0,1,
    1,0,3,0,0,0,0,0,2,2,0,0,0,0,2,2,0,0,0,0,0,3,0,1,
    1,0,0,0,0,0,0,0,2,2,0,0,0,0,2,2,0,0,0,0,0,0,0,1,
    1,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,1,
    1,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,1,
    1,0,2,2,0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0,2,2,0,1,
    1,0,2,2,0,0,0,2,2,0,0,0,0,0,0,2,2,0,0,0,2,2,0,1,
    1,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,1,
    1,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,1,
    1,0,0,0,0,0,0,0,2,2,0,0,0,0,2,2,0,0,0,0,0,0,0,1,
    1,0,3,0,0,0,0,0,2,2,0,0,0,0,2,2,0,0,0,0,0,3,0,1,
    1,0,3,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,3,0,1,
    1,0,0,0,2,2,0,0,0,3,3,0,0,3,3,0,0,0,2,2,0,0,0,1,
    1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
    1,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,1,
    1,0,2,2,0,0,3,3,0,0,2,2,2,2,0,0,3,3,0,0,2,2,0,1,
    1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
};

bool IsCellWall(int col, int row) {
    if (col < 0 || col >= MAP_WIDTH || row < 0 || row >= MAP_HEIGHT) return true;
    return MAP_DATA[row * MAP_WIDTH + col] != 0;
}

Vector3 GetSpawnPosition(void) {
    // Center is empty space in our map (col = 12, row = 9 for example, or we search for a 0)
    for (int row = MAP_HEIGHT / 2; row < MAP_HEIGHT; row++) {
        for (int col = MAP_WIDTH / 2; col < MAP_WIDTH; col++) {
            if (MAP_DATA[row * MAP_WIDTH + col] == 0) {
                float cellX = ((float)col - (float)MAP_WIDTH / 2.0f + 0.5f) * CELL_SIZE;
                float cellZ = ((float)row - (float)MAP_HEIGHT / 2.0f + 0.5f) * CELL_SIZE;
                return (Vector3){ cellX, 1.0f, cellZ };
            }
        }
    }
    return (Vector3){ 0.0f, 1.0f, 0.0f };
}

bool CheckMapCollision(Vector3 position, float radius, Vector3 *resolvedPosition) {
    float colF = position.x / CELL_SIZE + (float)MAP_WIDTH / 2.0f - 0.5f;
    float rowF = position.z / CELL_SIZE + (float)MAP_HEIGHT / 2.0f - 0.5f;
    
    int centerCol = (int)roundf(colF);
    int centerRow = (int)roundf(rowF);
    
    bool collided = false;
    Vector3 currentPos = position;
    
    // Check surrounding 3x3 cells
    for (int dRow = -2; dRow <= 2; dRow++) {
        for (int dCol = -2; dCol <= 2; dCol++) {
            int col = centerCol + dCol;
            int row = centerRow + dRow;
            
            if (IsCellWall(col, row)) {
                float cellX = ((float)col - (float)MAP_WIDTH / 2.0f + 0.5f) * CELL_SIZE;
                float cellZ = ((float)row - (float)MAP_HEIGHT / 2.0f + 0.5f) * CELL_SIZE;
                
                float minX = cellX - CELL_SIZE / 2.0f;
                float maxX = cellX + CELL_SIZE / 2.0f;
                float minZ = cellZ - CELL_SIZE / 2.0f;
                float maxZ = cellZ + CELL_SIZE / 2.0f;
                
                // Find closest point on cell boundaries (AABB) to cylinder position
                float closestX = fmaxf(minX, fminf(currentPos.x, maxX));
                float closestZ = fmaxf(minZ, fminf(currentPos.z, maxZ));
                
                float distX = currentPos.x - closestX;
                float distZ = currentPos.z - closestZ;
                float distSq = distX * distX + distZ * distZ;
                
                if (distSq < radius * radius) {
                    collided = true;
                    float dist = sqrtf(distSq);
                    
                    if (dist == 0.0f) {
                        // Push away from cell center
                        float pushX = currentPos.x - cellX;
                        float pushZ = currentPos.z - cellZ;
                        float pushDist = sqrtf(pushX * pushX + pushZ * pushZ);
                        if (pushDist > 0.0f) {
                            currentPos.x += (pushX / pushDist) * radius;
                            currentPos.z += (pushZ / pushDist) * radius;
                        } else {
                            currentPos.x += radius;
                        }
                    } else {
                        float overlap = radius - dist;
                        currentPos.x += (distX / dist) * overlap;
                        currentPos.z += (distZ / dist) * overlap;
                    }
                }
            }
        }
    }
    
    *resolvedPosition = (Vector3){ currentPos.x, position.y, currentPos.z };
    return collided;
}

void DrawMap(void) {
    // Draw Floor Grid
    DrawGrid(24, CELL_SIZE);
    
    // Draw Walls and obstacles
    for (int r = 0; r < MAP_HEIGHT; r++) {
        for (int c = 0; c < MAP_WIDTH; c++) {
            int cellType = MAP_DATA[r * MAP_WIDTH + c];
            if (cellType != 0) {
                float cellX = ((float)c - (float)MAP_WIDTH / 2.0f + 0.5f) * CELL_SIZE;
                float cellZ = ((float)r - (float)MAP_HEIGHT / 2.0f + 0.5f) * CELL_SIZE;
                
                float height = 6.0f;
                Color baseColor = (Color){ 15, 15, 20, 255 };      // Deep cyber dark
                Color wireColor = (Color){ 0, 210, 255, 255 };     // Cyan wireframe
                
                if (cellType == 2) {
                    height = 12.0f;                                // Tall pillars
                    baseColor = (Color){ 20, 10, 25, 255 };        // Deep purple
                    wireColor = (Color){ 255, 0, 180, 255 };       // Neon magenta
                } else if (cellType == 3) {
                    height = 2.0f;                                 // Low barriers
                    baseColor = (Color){ 10, 25, 15, 255 };        // Dark green
                    wireColor = (Color){ 0, 255, 120, 255 };       // Neon green
                }
                
                Vector3 pos = { cellX, height / 2.0f, cellZ };
                
                // Draw filled cube
                DrawCube(pos, CELL_SIZE, height, CELL_SIZE, baseColor);
                
                // Draw neon edges
                DrawCubeWires(pos, CELL_SIZE, height, CELL_SIZE, wireColor);
            }
        }
    }
}
