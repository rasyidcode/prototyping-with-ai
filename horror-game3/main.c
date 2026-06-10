#include "common.h"
#include "audio.h"
#include "chat.h"
#include "map.h"
#include "textures.h"

// Initialize player settings and game structures
void RestartGame(void) {
    gameState = STATE_PLAYING;
    camera.position = (Vector3){ 1.5f, 0.5f, 1.5f };
    camera.target = (Vector3){ 2.5f, 0.5f, 1.5f };
    camera.up = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.fovy = 60.0f;
    camera.projection = CAMERA_PERSPECTIVE;
    
    playerAngleX = 0.0f;
    playerAngleY = 0.0f;
    
    batteryLevel = 100.0f;
    flashlightOn = true;
    evidenceCount = 0;
    hasKey = false;
    viewerCount = 200;
    streamTime = 0.0f;
    subscriberCount = 45;
    donationRaised = 124.00f;
    
    monsterPos = (Vector3){ 1.5f, 0.5f, 17.5f };
    monsterTarget = monsterPos;
    monsterState = MONSTER_PATROL;
    loseSightTimer = 0.0f;
    
    memset(openDoors, 0, sizeof(openDoors));
    
    // Reset map layout items (restore USBs, batteries, keys)
    int initialMap[MAP_HEIGHT][MAP_WIDTH] = {
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
    memcpy(map, initialMap, sizeof(map));
    
    ClearChat();
    AddChatMessage("", "System", "Stream initialized. Welcome back, hunter!", PURPLE, true);
    AddChatMessage("[MOD]", "Mod_Ready", "Mods are active. Keep the chat clean!", GREEN, false);
    
    DisableCursor();
}

// Update game physics, triggers, input, and AI
void UpdateGame(void) {
    if (gameState == STATE_PLAYING) {
        streamTime += GetFrameTime();
        
        // Battery Drain
        if (flashlightOn) {
            batteryLevel -= 0.6f * GetFrameTime();
        } else {
            batteryLevel -= 0.04f * GetFrameTime();
        }
        if (batteryLevel <= 0.0f) {
            batteryLevel = 0.0f;
            flashlightOn = false;
        }
        
        // Mouse look & Keyboard movement
        Vector2 mouseDelta = GetMouseDelta();
        playerAngleX -= mouseDelta.x * 0.003f;
        playerAngleY -= mouseDelta.y * 0.003f;
        
        // Clamp pitch to look up/down securely
        if (playerAngleY > 1.35f) playerAngleY = 1.35f;
        if (playerAngleY < -1.35f) playerAngleY = -1.35f;
        
        Vector3 forward = { sinf(playerAngleX), 0.0f, cosf(playerAngleX) };
        Vector3 right = { -cosf(playerAngleX), 0.0f, sinf(playerAngleX) };
        
        Vector3 moveDir = { 0.0f, 0.0f, 0.0f };
        bool isMoving = false;
        bool isRunning = false;
        
        if (IsKeyDown(KEY_W)) { moveDir = Vector3Add(moveDir, forward); isMoving = true; }
        if (IsKeyDown(KEY_S)) { moveDir = Vector3Subtract(moveDir, forward); isMoving = true; }
        if (IsKeyDown(KEY_A)) { moveDir = Vector3Subtract(moveDir, right); isMoving = true; }
        if (IsKeyDown(KEY_D)) { moveDir = Vector3Add(moveDir, right); isMoving = true; }
        
        if (isMoving) {
            if (IsKeyDown(KEY_LEFT_SHIFT) && batteryLevel > 0.0f) {
                isRunning = true;
            }
            
            moveDir = Vector3Normalize(moveDir);
            float speed = isRunning ? 3.0f : 1.5f;
            
            Vector3 oldPos = camera.position;
            Vector3 newPos = Vector3Add(oldPos, Vector3Scale(moveDir, speed * GetFrameTime()));
            
            camera.position = CheckCollisionAndMove(oldPos, newPos, 0.28f);
            
            // Step sound
            static float stepTimer = 0.0f;
            stepTimer += GetFrameTime();
            float stepDelay = isRunning ? 0.35f : 0.6f;
            if (stepTimer >= stepDelay) {
                PlaySound(sndFootstep);
                stepTimer = 0.0f;
            }
        }
        
        // Toggle Flashlight
        if (IsKeyPressed(KEY_F) || IsKeyPressed(KEY_L)) {
            if (batteryLevel > 0.0f) {
                flashlightOn = !flashlightOn;
                PlaySound(sndFootstep); // Use footstep as key click
                if (flashlightOn) {
                    AddChatMessage("", "Streamer", "*Turned on camera light*", WHITE, false);
                } else {
                    AddChatMessage("", "Streamer", "*Turned off camera light*", WHITE, false);
                }
            }
        }
        
        // Set camera target direction
        camera.target.x = camera.position.x + sinf(playerAngleX) * cosf(playerAngleY);
        camera.target.y = camera.position.y + sinf(playerAngleY);
        camera.target.z = camera.position.z + cosf(playerAngleX) * cosf(playerAngleY);
        
        // Interaction (E key)
        if (IsKeyPressed(KEY_E)) {
            int px = (int)floorf(camera.position.x);
            int pz = (int)floorf(camera.position.z);
            int dx[] = { 0, 0, 1, -1 };
            int dz[] = { 1, -1, 0, 0 };
            
            for (int i = 0; i < 4; i++) {
                int nx = px + dx[i];
                int nz = pz + dz[i];
                
                if (nx >= 0 && nx < MAP_WIDTH && nz >= 0 && nz < MAP_HEIGHT) {
                    if (map[nz][nx] == 6) { // Wood Door
                        map[nz][nx] = 0;
                        PlaySound(sndDoor);
                        AddChatMessage("", "Streamer", "*Opened the door*", WHITE, false);
                        
                        // Queue door auto-close
                        for (int d = 0; d < MAX_OPEN_DOORS; d++) {
                            if (!openDoors[d].active) {
                                openDoors[d].x = nx;
                                openDoors[d].y = nz;
                                openDoors[d].timer = 5.0f;
                                openDoors[d].active = true;
                                break;
                            }
                        }
                        break;
                    } else if (map[nz][nx] == 2) { // Red Locked Gate
                        if (hasKey) {
                            map[nz][nx] = 0;
                            hasKey = false;
                            PlaySound(sndDoor);
                            AddChatMessage("", "Streamer", "*Unlocked the main gate*", GOLD, false);
                            AddChatMessage("", "System", "THE RED GATE IS OPEN! RUN FOR THE EXIT!", GOLD, true);
                        } else {
                            AddChatMessage("", "System", "The main gate is locked! Needs the Gate Key.", RED, false);
                            AddChatMessage("", "Viewer", "look for the gold key in the center cells!", YELLOW, false);
                        }
                        break;
                    }
                }
            }
        }
        
        // Update Auto-Closing Doors
        UpdateDoors();
        
        // Item Pickups & Exit Check
        int px = (int)floorf(camera.position.x);
        int pz = (int)floorf(camera.position.z);
        if (px >= 0 && px < MAP_WIDTH && pz >= 0 && pz < MAP_HEIGHT) {
            int cell = map[pz][px];
            if (cell == 3) { // USB Evidence
                map[pz][px] = 0;
                evidenceCount++;
                PlaySound(sndPickup);
                char evStr[64];
                sprintf(evStr, "Secured Evidence USB (%d/3)!", evidenceCount);
                AddChatMessage("", "System", evStr, BLUE, true);
                AddChatMessage("", "Viewer_Pog", "EVIDENCE SECURED! LETS GOOO", PURPLE, false);
                viewerCount += 300;
                PlaySound(sndAlert);
            } else if (cell == 4) { // Battery
                map[pz][px] = 0;
                batteryLevel += 35.0f;
                if (batteryLevel > 100.0f) batteryLevel = 100.0f;
                PlaySound(sndPickup);
                AddChatMessage("", "System", "Camera battery charged (+35%)!", GREEN, false);
                AddChatMessage("", "Lurker", "🔋 battery backup secure", WHITE, false);
            } else if (cell == 7) { // Gate Key
                map[pz][px] = 0;
                hasKey = true;
                PlaySound(sndPickup);
                AddChatMessage("", "System", "Gate Key acquired!", GOLD, true);
                AddChatMessage("[MOD]", "Mod", "The Gate Key matches the RED locked gate!", GREEN, false);
                viewerCount += 200;
                PlaySound(sndAlert);
            } else if (cell == 5) { // Exit Gate
                if (evidenceCount >= 3) {
                    gameState = STATE_VICTORY;
                    EnableCursor();
                    PlaySound(sndAlert);
                } else {
                    static float exitWarning = 0.0f;
                    if (GetTime() - exitWarning > 4.0f) {
                        AddChatMessage("", "System", "Must collect all 3 evidence USBs first!", RED, false);
                        AddChatMessage("", "Chat", "Go get the USBs streamer!", YELLOW, false);
                        exitWarning = GetTime();
                    }
                }
            }
        }
        
        // Monster AI update
        float distToPlayer = Vector3Distance(monsterPos, camera.position);
        
        // Caught by monster
        if (distToPlayer < 0.5f) {
            gameState = STATE_GAMEOVER_DEAD;
            EnableCursor();
            PlaySound(sndStatic);
            ClearChat();
            AddChatMessage("", "System", "Stream connection lost.", RED, true);
            AddChatMessage("", "Chat", "F in the chat...", GRAY, false);
            AddChatMessage("", "Viewer", "OMG WAS HE ATTACKED?!", RED, false);
            return;
        }
        
        // Hear footsteps or sight check
        bool hasLOS = HasLineOfSight(monsterPos, camera.position);
        bool playerRunning = isMoving && isRunning;
        
        // Heartbeat chime rate based on proximity
        static float heartbeatTimer = 0.0f;
        heartbeatTimer += GetFrameTime();
        float heartDelay = 1.6f;
        if (distToPlayer < 10.0f) {
            heartDelay = 0.25f + (distToPlayer / 10.0f) * 1.35f;
        }
        if (heartbeatTimer >= heartDelay) {
            PlaySound(sndHeartbeat);
            heartbeatTimer = 0.0f;
        }
        
        // State updates
        if (monsterState == MONSTER_PATROL) {
            if ((hasLOS && (flashlightOn || distToPlayer < 3.5f)) || (playerRunning && distToPlayer < 7.0f)) {
                monsterState = MONSTER_CHASE;
                PlaySound(sndStatic);
                AddChatMessage("", "System", "WARNING: Anomalous entity detected! IT IS CHASING YOU!", RED, true);
                AddChatMessage("", "Viewer", "WHAT IS THAT?! RUNNNNN!", RED, false);
                AddChatMessage("[MOD]", "Mod", "OMG SPAM THE RUN EMOJIS! 🏃‍♂️💨", GREEN, false);
                viewerCount += 400; // instant viewer spike
            }
        } else if (monsterState == MONSTER_CHASE) {
            if (!hasLOS) {
                loseSightTimer += GetFrameTime();
                if (loseSightTimer > 4.0f) {
                    monsterState = MONSTER_PATROL;
                    monsterTarget = (Vector3){ floorf(monsterPos.x) + 0.5f, 0.5f, floorf(monsterPos.z) + 0.5f };
                    AddChatMessage("", "System", "Lost direct contact with the anomalous entity.", GREEN, false);
                    AddChatMessage("", "Lurker", "Phew, that was close", WHITE, false);
                    loseSightTimer = 0.0f;
                }
            } else {
                loseSightTimer = 0.0f;
            }
        }
        
        // Move Monster
        if (monsterState == MONSTER_CHASE) {
            monsterTarget = camera.position;
        } else {
            // Patrol node check
            if (Vector3Distance(monsterPos, monsterTarget) < 0.1f) {
                int mx = (int)floorf(monsterPos.x);
                int mz = (int)floorf(monsterPos.z);
                int dx[] = { 0, 0, 1, -1 };
                int dz[] = { 1, -1, 0, 0 };
                
                int validDirs[4];
                int validCount = 0;
                for (int i = 0; i < 4; i++) {
                    int nx = mx + dx[i];
                    int nz = mz + dz[i];
                    if (nx >= 0 && nx < MAP_WIDTH && nz >= 0 && nz < MAP_HEIGHT) {
                        int cell = map[nz][nx];
                        if (cell != 1 && cell != 2 && cell != 6) {
                            validDirs[validCount++] = i;
                        }
                    }
                }
                if (validCount > 0) {
                    int chosen = validDirs[GetRandomValue(0, validCount - 1)];
                    monsterTarget = (Vector3){ (mx + dx[chosen]) + 0.5f, 0.5f, (mz + dz[chosen]) + 0.5f };
                }
            }
        }
        
        Vector3 mDir = Vector3Subtract(monsterTarget, monsterPos);
        mDir.y = 0.0f;
        float mDist = Vector3Length(mDir);
        if (mDist > 0.01f) {
            mDir = Vector3Scale(mDir, 1.0f / mDist);
            float speed = (monsterState == MONSTER_CHASE) ? 2.3f : 1.0f;
            monsterPos = Vector3Add(monsterPos, Vector3Scale(mDir, speed * GetFrameTime()));
        }
        
        // Chat update spawning
        chatSpawnTimer -= GetFrameTime();
        if (chatSpawnTimer <= 0.0f) {
            TriggerChatSpam();
            if (monsterState == MONSTER_CHASE) {
                chatSpawnTimer = (float)GetRandomValue(12, 35) / 100.0f; // 0.12s to 0.35s
            } else {
                if (isMoving) {
                    chatSpawnTimer = (float)GetRandomValue(12, 28) / 10.0f; // 1.2s to 2.8s
                } else {
                    chatSpawnTimer = (float)GetRandomValue(28, 48) / 10.0f; // 2.8s to 4.8s
                }
            }
        }
        
        // Viewer Count Dynamics
        static float viewTimer = 0.0f;
        viewTimer += GetFrameTime();
        if (viewTimer >= 1.0f) {
            if (monsterState == MONSTER_CHASE) {
                viewerCount += GetRandomValue(35, 75);
            } else {
                if (isMoving && flashlightOn) {
                    viewerCount += GetRandomValue(-2, 6);
                } else if (!flashlightOn) {
                    viewerCount -= GetRandomValue(4, 12);
                } else {
                    viewerCount -= GetRandomValue(6, 16);
                }
            }
            if (viewerCount < 0) viewerCount = 0;
            if (viewerCount == 0) {
                gameState = STATE_GAMEOVER_BORED;
                EnableCursor();
                PlaySound(sndStatic);
            }
            viewTimer = 0.0f;
        }
    } else {
        // Update intro countdown timer automatically
        if (gameState == STATE_INTRO) {
            streamTime += GetFrameTime();
            if (streamTime >= 3.0f) {
                RestartGame();
            }
        }

        // Menu States
        if (IsKeyPressed(KEY_ENTER)) {
            if (gameState == STATE_TITLE) {
                gameState = STATE_INTRO;
                streamTime = 0.0f;
                ClearChat();
            } else if (gameState == STATE_INTRO) {
                RestartGame();
            } else if (gameState == STATE_GAMEOVER_DEAD || gameState == STATE_GAMEOVER_BORED || gameState == STATE_VICTORY) {
                gameState = STATE_TITLE;
            }
        }
        
        // Simulate waiting chat in title and intro
        chatSpawnTimer -= GetFrameTime();
        if (chatSpawnTimer <= 0.0f) {
            if (gameState == STATE_TITLE) {
                const char* waitingChat[] = {
                    "is the stream starting?", "lets goooo", "hype!", "asylum hype!", "first", 
                    "cant wait for this stream", "he is finally streaming horror"
                };
                AddChatMessage("", "WaitingViewer", waitingChat[GetRandomValue(0, 6)], LIGHTGRAY, false);
                chatSpawnTimer = (float)GetRandomValue(15, 35) / 10.0f;
            } else if (gameState == STATE_INTRO) {
                const char* startingChat[] = {
                    "OMG IT'S STARTING!", "LETS GO!", "hello chat", "hello from UK", 
                    "this is gonna be so scary!", "hype hype hype", "streamer is ready!"
                };
                AddChatMessage("[SUB]", "StreamLover", startingChat[GetRandomValue(0, 6)], PURPLE, false);
                chatSpawnTimer = (float)GetRandomValue(5, 12) / 10.0f;
            }
        }
    }
}

// Draw the screen
void DrawGame(RenderTexture2D viewportTarget) {
    // 1. Draw 3D Viewport scene
    BeginTextureMode(viewportTarget);
    ClearBackground((Color){ 10, 10, 10, 255 });
    
    if (gameState == STATE_PLAYING) {
        BeginMode3D(camera);
        
        // Loop and render map elements
        for (int z = 0; z < MAP_HEIGHT; z++) {
            for (int x = 0; x < MAP_WIDTH; x++) {
                int cell = map[z][x];
                Vector3 center = { x + 0.5f, 0.5f, z + 0.5f };
                
                // Software spotlight factor
                float dist = Vector3Distance(camera.position, center);
                float maxLight = flashlightOn ? 8.0f : 2.0f;
                float factor = 1.0f - (dist / maxLight);
                if (factor < 0.0f) factor = 0.0f;
                
                if (flashlightOn) {
                    Vector3 cDir = Vector3Normalize(Vector3Subtract(camera.target, camera.position));
                    Vector3 oDir = Vector3Normalize(Vector3Subtract(center, camera.position));
                    float cosAngle = Vector3DotProduct(cDir, oDir);
                    if (cosAngle < 0.82f) {
                        float ambient = 1.0f - (dist / 2.0f);
                        if (ambient < 0.0f) ambient = 0.0f;
                        factor = factor * 0.08f + ambient * 0.05f;
                    } else {
                        float spot = (cosAngle - 0.82f) / 0.18f;
                        factor = factor * (0.15f + 0.85f * spot);
                    }
                } else {
                    factor = (1.0f - (dist / 1.8f)) * 0.12f;
                    if (factor < 0.0f) factor = 0.0f;
                }
                
                unsigned char val = (unsigned char)(factor * 255);
                Color tint = (Color){ val, val, val, 255 };
                
                if (cell == 1) { // Wall (2 units tall)
                    DrawCubeTexture(texWall, center, 1.0f, 1.0f, 1.0f, tint);
                    DrawCubeTexture(texWall, (Vector3){ center.x, 1.5f, center.z }, 1.0f, 1.0f, 1.0f, tint);
                } else if (cell == 2) { // Locked Gate
                    // Draw red gate
                    DrawCube((Vector3){ center.x, 0.5f, center.z }, 1.0f, 1.0f, 1.0f, (Color){ val, 0, 0, 255 });
                } else if (cell == 6) { // Closed wood door
                    DrawCube((Vector3){ center.x, 0.5f, center.z }, 1.0f, 1.0f, 1.0f, (Color){ (unsigned char)(val * 0.5f), (unsigned char)(val * 0.3f), (unsigned char)(val * 0.15f), 255 });
                }
                
                // Floor and Ceiling for non-walls
                if (cell != 1) {
                    DrawCubeTexture(texFloor, (Vector3){ center.x, -0.5f, center.z }, 1.0f, 1.0f, 1.0f, tint);
                    DrawCubeTexture(texCeiling, (Vector3){ center.x, 1.5f, center.z }, 1.0f, 1.0f, 1.0f, tint);
                }
                
                // Render rotating / bobbing items
                float bob = sinf(GetTime() * 4.0f + x + z) * 0.05f;
                if (cell == 3) { // USB Evidence
                    DrawBillboard(camera, texEvidence, (Vector3){ center.x, 0.25f + bob, center.z }, 0.45f, tint);
                } else if (cell == 4) { // Battery
                    DrawBillboard(camera, texBattery, (Vector3){ center.x, 0.25f + bob, center.z }, 0.45f, tint);
                } else if (cell == 7) { // Gate Key
                    DrawBillboard(camera, texKey, (Vector3){ center.x, 0.25f + bob, center.z }, 0.45f, tint);
                }
            }
        }
        
        // Draw Monster Billboard
        float mDist = Vector3Distance(camera.position, monsterPos);
        float mLight = flashlightOn ? 8.0f : 2.0f;
        float mFactor = 1.0f - (mDist / mLight);
        if (mFactor < 0.0f) mFactor = 0.0f;
        
        if (flashlightOn) {
            Vector3 cDir = Vector3Normalize(Vector3Subtract(camera.target, camera.position));
            Vector3 mDir = Vector3Normalize(Vector3Subtract(monsterPos, camera.position));
            float cosAngle = Vector3DotProduct(cDir, mDir);
            if (cosAngle < 0.82f) {
                float ambient = 1.0f - (mDist / 2.0f);
                if (ambient < 0.0f) ambient = 0.0f;
                mFactor = mFactor * 0.08f + ambient * 0.05f;
            } else {
                float spot = (cosAngle - 0.82f) / 0.18f;
                mFactor = mFactor * (0.15f + 0.85f * spot);
            }
        } else {
            mFactor = (1.0f - (mDist / 1.8f)) * 0.12f;
            if (mFactor < 0.0f) mFactor = 0.0f;
        }
        
        unsigned char mVal = (unsigned char)(mFactor * 255);
        Color mTint = (Color){ mVal, mVal, mVal, 255 };
        // If monster is chasing and close, give it a subtle red glow
        if (monsterState == MONSTER_CHASE) {
            mTint.r = Clamp(mTint.r + 40, 0, 255);
        }
        
        DrawBillboard(camera, texMonster, (Vector3){ monsterPos.x, 0.4f, monsterPos.z }, 0.75f, mTint);
        
        EndMode3D();
        
        // Vignette Overlay (simulates spotlight falloff in 2D)
        if (flashlightOn) {
            DrawTexturePro(texFlashlightMask, (Rectangle){ 0, 0, 512, 512 }, (Rectangle){ 0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT }, (Vector2){ 0, 0 }, 0.0f, WHITE);
        } else {
            // Pitch black except tiny center circle (camera back screen glow)
            DrawRectangle(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, (Color){ 0, 0, 0, 245 });
        }
        
        // Draw Camera Screen overlay (Scanlines, Battery, REC)
        // Blinking REC dot
        if (((int)(GetTime() * 1.5f) % 2) == 0) {
            DrawCircle(35, 35, 6, RED);
        }
        DrawText("REC", 50, 27, 14, WHITE);
        
        int mins = (int)streamTime / 60;
        int secs = (int)streamTime % 60;
        char recTime[16];
        sprintf(recTime, "%02d:%02d", mins, secs);
        DrawText(recTime, 95, 27, 14, WHITE);
        
        // Live Icon
        DrawRectangle(VIEWPORT_WIDTH - 150, 25, 45, 20, (Color){ 145, 70, 255, 255 }); // Twitch purple theme
        DrawText("LIVE", VIEWPORT_WIDTH - 142, 29, 11, WHITE);
        
        char vStr[32];
        sprintf(vStr, "%d viewers", viewerCount);
        DrawText(vStr, VIEWPORT_WIDTH - 98, 29, 13, LIGHTGRAY);
        
        // Battery meter
        char batStr[16];
        sprintf(batStr, "%d%%", (int)batteryLevel);
        Color batCol = (batteryLevel > 20.0f) ? GREEN : RED;
        DrawText(batStr, VIEWPORT_WIDTH - 70, VIEWPORT_HEIGHT - 45, 16, batCol);
        DrawRectangleLines(VIEWPORT_WIDTH - 120, VIEWPORT_HEIGHT - 45, 42, 18, batCol);
        DrawRectangle(VIEWPORT_WIDTH - 118, VIEWPORT_HEIGHT - 43, (int)(38 * (batteryLevel / 100.0f)), 14, batCol);
        DrawRectangle(VIEWPORT_WIDTH - 78, VIEWPORT_HEIGHT - 39, 3, 6, batCol);
        
        // Items & Objective UI
        char evStr[32];
        sprintf(evStr, "USB EVIDENCE: %d/3", evidenceCount);
        DrawText(evStr, 30, VIEWPORT_HEIGHT - 45, 16, BLUE);
        
        if (hasKey) {
            DrawText("GATE KEY ACQUIRED", 30, VIEWPORT_HEIGHT - 70, 14, GOLD);
        }
        
        // Interaction prompt
        int px = (int)floorf(camera.position.x);
        int pz = (int)floorf(camera.position.z);
        int dx[] = { 0, 0, 1, -1 };
        int dz[] = { 1, -1, 0, 0 };
        for (int i = 0; i < 4; i++) {
            int nx = px + dx[i];
            int nz = pz + dz[i];
            if (nx >= 0 && nx < MAP_WIDTH && nz >= 0 && nz < MAP_HEIGHT) {
                if (map[nz][nx] == 6) {
                    DrawText("Press E to open Door", VIEWPORT_WIDTH / 2 - MeasureText("Press E to open Door", 16) / 2, VIEWPORT_HEIGHT / 2 + 30, 16, YELLOW);
                    break;
                } else if (map[nz][nx] == 2) {
                    if (hasKey) {
                        DrawText("Press E to unlock Gate", VIEWPORT_WIDTH / 2 - MeasureText("Press E to unlock Gate", 16) / 2, VIEWPORT_HEIGHT / 2 + 30, 16, YELLOW);
                    } else {
                        DrawText("Gate Locked (Needs Key)", VIEWPORT_WIDTH / 2 - MeasureText("Gate Locked (Needs Key)", 16) / 2, VIEWPORT_HEIGHT / 2 + 30, 16, RED);
                    }
                    break;
                }
            }
        }
        
        // Camera Glitch overlays
        if (monsterState == MONSTER_CHASE) {
            float dist = Vector3Distance(camera.position, monsterPos);
            float strength = 0.0f;
            if (dist < 6.0f) {
                strength = 1.0f - (dist / 6.0f); // stronger glitch close up
            }
            
            // Random static panels
            int strips = GetRandomValue(1, 4 + (int)(strength * 6));
            for (int i = 0; i < strips; i++) {
                int sy = GetRandomValue(0, VIEWPORT_HEIGHT - 20);
                int sh = GetRandomValue(3, 16 + (int)(strength * 20));
                DrawRectangle(0, sy, VIEWPORT_WIDTH, sh, (Color){ 255, 255, 255, (unsigned char)(20 + strength * 110) });
            }
        }
        
        if (batteryLevel <= 0.0f) {
            // Dark gray noise when battery dies
            for (int i = 0; i < 350; i++) {
                int rx = GetRandomValue(0, VIEWPORT_WIDTH);
                int ry = GetRandomValue(0, VIEWPORT_HEIGHT);
                DrawPixel(rx, ry, (Color){ 255, 255, 255, 80 });
            }
        }
    } else {
        // Render Viewport Menus
        if (gameState == STATE_TITLE) {
            DrawRectangle(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, (Color){ 15, 10, 18, 255 });
            
            // Title text with glow
            DrawText("ASYLUM LIVE", VIEWPORT_WIDTH / 2 - MeasureText("ASYLUM LIVE", 48) / 2 + 2, 222, 48, (Color){ 120, 20, 40, 255 });
            DrawText("ASYLUM LIVE", VIEWPORT_WIDTH / 2 - MeasureText("ASYLUM LIVE", 48) / 2, 220, 48, RED);
            
            DrawText("A Horror Streaming Simulator", VIEWPORT_WIDTH / 2 - MeasureText("A Horror Streaming Simulator", 18) / 2, 280, 18, LIGHTGRAY);
            
            DrawText("OBJECTIVE:", VIEWPORT_WIDTH / 2 - MeasureText("OBJECTIVE:", 16) / 2, 380, 16, GOLD);
            DrawText("- Find 3 USB Evidence drives in the asylum", VIEWPORT_WIDTH / 2 - 180, 410, 14, WHITE);
            DrawText("- Search the center cells for the Gate Key", VIEWPORT_WIDTH / 2 - 180, 435, 14, WHITE);
            DrawText("- Unlock the RED gate & escape at the bottom", VIEWPORT_WIDTH / 2 - 180, 460, 14, WHITE);
            DrawText("- Keep moving to keep viewers entertained!", VIEWPORT_WIDTH / 2 - 180, 485, 14, WHITE);
            
            DrawText("CONTROLS:", VIEWPORT_WIDTH / 2 - MeasureText("CONTROLS:", 16) / 2, 540, 16, PURPLE);
            DrawText("WASD: Move  |  SHIFT: Run  |  MOUSE: Look  |  F: Light  |  E: Interact", VIEWPORT_WIDTH / 2 - MeasureText("WASD: Move  |  SHIFT: Run  |  MOUSE: Look  |  F: Light  |  E: Interact", 13) / 2, 570, 13, LIGHTGRAY);
            
            // Pulse press enter
            float alphaPulse = sinf(GetTime() * 4.0f) * 0.5f + 0.5f;
            Color textCol = (Color){ 255, 255, 255, (unsigned char)(alphaPulse * 255) };
            DrawText("PRESS ENTER TO START STREAM", VIEWPORT_WIDTH / 2 - MeasureText("PRESS ENTER TO START STREAM", 18) / 2, 650, 18, textCol);
            
        } else if (gameState == STATE_INTRO) {
            DrawRectangle(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, BLACK);
            DrawText("STARTING LIVE STREAM...", VIEWPORT_WIDTH / 2 - MeasureText("STARTING LIVE STREAM...", 24) / 2, 300, 24, PURPLE);
            
            int countdown = 3 - (int)streamTime;
            if (countdown < 1) countdown = 1;
            char countStr[16];
            sprintf(countStr, "%d", countdown);
            DrawText(countStr, VIEWPORT_WIDTH / 2 - MeasureText(countStr, 40) / 2, 360, 40, RED);
            DrawText("Standby - preparing feed connection", VIEWPORT_WIDTH / 2 - MeasureText("Standby - preparing feed connection", 14) / 2, 450, 14, GRAY);
            
        } else if (gameState == STATE_GAMEOVER_DEAD || gameState == STATE_GAMEOVER_BORED) {
            // Red/gray VHS static screen
            DrawRectangle(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, BLACK);
            for (int i = 0; i < 800; i++) {
                int rx = GetRandomValue(0, VIEWPORT_WIDTH);
                int ry = GetRandomValue(0, VIEWPORT_HEIGHT);
                int rVal = GetRandomValue(10, 80);
                DrawPixel(rx, ry, (Color){ (unsigned char)(rVal + 50), (unsigned char)rVal, (unsigned char)rVal, 255 });
            }
            
            DrawText("STREAM OFFLINE", VIEWPORT_WIDTH / 2 - MeasureText("STREAM OFFLINE", 36) / 2, 260, 36, RED);
            
            if (gameState == STATE_GAMEOVER_DEAD) {
                DrawText("BROADCASTER DISCONNECTED", VIEWPORT_WIDTH / 2 - MeasureText("BROADCASTER DISCONNECTED", 16) / 2, 310, 16, LIGHTGRAY);
                DrawText("Reason: Physical trauma / Camera destroyed", VIEWPORT_WIDTH / 2 - MeasureText("Reason: Physical trauma / Camera destroyed", 14) / 2, 340, 14, RED);
            } else {
                DrawText("0 VIEWERS - INACTIVITY DISCONNECT", VIEWPORT_WIDTH / 2 - MeasureText("0 VIEWERS - INACTIVITY DISCONNECT", 16) / 2, 310, 16, LIGHTGRAY);
                DrawText("Reason: Broadcast grew too boring. Viewers left.", VIEWPORT_WIDTH / 2 - MeasureText("Reason: Broadcast grew too boring. Viewers left.", 14) / 2, 340, 14, RED);
            }
            
            DrawText("PRESS ENTER TO RETRY", VIEWPORT_WIDTH / 2 - MeasureText("PRESS ENTER TO RETRY", 18) / 2, 500, 18, WHITE);
            
        } else if (gameState == STATE_VICTORY) {
            DrawRectangle(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, (Color){ 20, 35, 25, 255 });
            DrawText("STREAM COMPLETE", VIEWPORT_WIDTH / 2 - MeasureText("STREAM COMPLETE", 36) / 2, 220, 36, GREEN);
            DrawText("YOU ESCAPED THE ASYLUM!", VIEWPORT_WIDTH / 2 - MeasureText("YOU ESCAPED THE ASYLUM!", 20) / 2, 280, 20, WHITE);
            
            char stat1[64], stat2[64], stat3[64];
            sprintf(stat1, "Final Viewers: %d", viewerCount);
            sprintf(stat2, "Total Stream Time: %02d:%02d", (int)streamTime / 60, (int)streamTime % 60);
            sprintf(stat3, "Donation Earnings: $%0.2f", donationRaised);
            
            DrawText(stat1, VIEWPORT_WIDTH / 2 - MeasureText(stat1, 16) / 2, 360, 16, LIGHTGRAY);
            DrawText(stat2, VIEWPORT_WIDTH / 2 - MeasureText(stat2, 16) / 2, 390, 16, LIGHTGRAY);
            DrawText(stat3, VIEWPORT_WIDTH / 2 - MeasureText(stat3, 16) / 2, 420, 16, GOLD);
            
            DrawText("POGCHAMP HYPE! YOU ARE VIRAL!", VIEWPORT_WIDTH / 2 - MeasureText("POGCHAMP HYPE! YOU ARE VIRAL!", 18) / 2, 490, 18, PURPLE);
            
            DrawText("PRESS ENTER TO RETURN TO MAIN MENU", VIEWPORT_WIDTH / 2 - MeasureText("PRESS ENTER TO RETURN TO MAIN MENU", 16) / 2, 600, 16, WHITE);
        }
    }
    
    // CRT scanlines overlay
    for (int y = 0; y < VIEWPORT_HEIGHT; y += 3) {
        DrawRectangle(0, y, VIEWPORT_WIDTH, 1, (Color){ 0, 0, 0, 35 });
    }
    
    EndTextureMode();
    
    // 2. Draw viewport texture to the left 75% of window
    DrawTextureRec(viewportTarget.texture, (Rectangle){ 0, 0, (float)viewportTarget.texture.width, (float)-viewportTarget.texture.height }, (Vector2){ 0, 0 }, WHITE);
    
    // 3. Draw Stream Dashboard to the right 25% of window (width 256, height 768)
    DrawRectangle(VIEWPORT_WIDTH, 0, SCREEN_WIDTH - VIEWPORT_WIDTH, SCREEN_HEIGHT, (Color){ 16, 12, 22, 255 });
    DrawLine(VIEWPORT_WIDTH, 0, VIEWPORT_WIDTH, SCREEN_HEIGHT, (Color){ 45, 35, 55, 255 });
    
    // Dashboard header details
    DrawText("STREAM DASHBOARD", VIEWPORT_WIDTH + 15, 20, 15, PURPLE);
    DrawLine(VIEWPORT_WIDTH + 15, 42, SCREEN_WIDTH - 15, 42, (Color){ 55, 45, 65, 255 });
    
    if (gameState == STATE_PLAYING || gameState == STATE_INTRO) {
        DrawText("STATUS: ONLINE", VIEWPORT_WIDTH + 15, 55, 12, (Color){ 50, 205, 50, 255 });
        char subStr[32];
        sprintf(subStr, "Subs: %d", subscriberCount);
        DrawText(subStr, VIEWPORT_WIDTH + 15, 75, 12, LIGHTGRAY);
        
        // Donation Goal bar
        char goalText[64];
        sprintf(goalText, "Donations: $%0.2f / $%0.2f", donationRaised, donationGoal);
        DrawText(goalText, VIEWPORT_WIDTH + 15, 95, 11, GOLD);
        DrawRectangle(VIEWPORT_WIDTH + 15, 112, SCREEN_WIDTH - VIEWPORT_WIDTH - 30, 8, (Color){ 30, 25, 40, 255 });
        float progress = donationRaised / donationGoal;
        if (progress > 1.0f) progress = 1.0f;
        DrawRectangle(VIEWPORT_WIDTH + 15, 112, (int)((SCREEN_WIDTH - VIEWPORT_WIDTH - 30) * progress), 8, GOLD);
    } else {
        DrawText("STATUS: OFFLINE", VIEWPORT_WIDTH + 15, 55, 12, RED);
        DrawText("Subs: --", VIEWPORT_WIDTH + 15, 75, 12, GRAY);
        DrawText("Donations: --", VIEWPORT_WIDTH + 15, 95, 11, GRAY);
    }
    
    DrawText("LIVE CHAT", VIEWPORT_WIDTH + 15, 140, 13, LIGHTGRAY);
    DrawLine(VIEWPORT_WIDTH + 15, 158, SCREEN_WIDTH - 15, 158, (Color){ 55, 45, 65, 255 });
    
    // Render Chat Box
    DrawChatMessages(VIEWPORT_WIDTH + 10, 170, SCREEN_WIDTH - VIEWPORT_WIDTH - 20, SCREEN_HEIGHT - 190);
}

int main(void) {
    // Set config flags and initialize window
    SetConfigFlags(FLAG_VSYNC_HINT);
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "SpookStream: Asylum Live [Raylib Horror]");
    SetTargetFPS(60);
    
    // Initialize procedural textures and sounds
    InitGameTextures();
    InitGameSounds();
    
    // Create the viewport render target texture (768x768)
    RenderTexture2D viewportTarget = LoadRenderTexture(VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    
    // Set up waiting chat messages for the title screen
    AddChatMessage("", "Moderator", "Waiting for stream start...", GREEN, false);
    AddChatMessage("", "GamerBoy", "Is he streaming the asylum tonight?", LIGHTGRAY, false);
    AddChatMessage("[VIP]", "NightScary", "hype train incoming! let's go", PINK, false);
    
    // Main loop
    while (!WindowShouldClose()) {
        UpdateGame();
        
        BeginDrawing();
        ClearBackground(BLACK);
        
        DrawGame(viewportTarget);
        
        EndDrawing();
    }
    
    // Clean up resources
    UnloadRenderTexture(viewportTarget);
    FreeGameTextures();
    FreeGameSounds();
    CloseWindow();
    
    return 0;
}
