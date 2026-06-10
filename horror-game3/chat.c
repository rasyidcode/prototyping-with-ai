#include "chat.h"

void AddChatMessage(const char* badge, const char* username, const char* text, Color color, bool isSpecial) {
    if (chatCount < MAX_CHAT_MESSAGES) {
        strcpy(chat[chatCount].badge, badge);
        strcpy(chat[chatCount].username, username);
        strcpy(chat[chatCount].text, text);
        chat[chatCount].color = color;
        chat[chatCount].isSpecial = isSpecial;
        chatCount++;
    } else {
        for (int i = 1; i < MAX_CHAT_MESSAGES; i++) {
            chat[i - 1] = chat[i];
        }
        strcpy(chat[MAX_CHAT_MESSAGES - 1].badge, badge);
        strcpy(chat[MAX_CHAT_MESSAGES - 1].username, username);
        strcpy(chat[MAX_CHAT_MESSAGES - 1].text, text);
        chat[MAX_CHAT_MESSAGES - 1].color = color;
        chat[MAX_CHAT_MESSAGES - 1].isSpecial = isSpecial;
    }
}

void ClearChat(void) {
    chatCount = 0;
    memset(chat, 0, sizeof(chat));
}

void TriggerChatSpam(void) {
    const char* usernames[] = {
        "GamerGuy99", "SpookySpook", "LurkMaster", "GhostBuster", "xX_Slayer_Xx", 
        "ShadowWalk", "Nightmare", "Wanderer", "ScreamQueen", "RetroFan", 
        "ChatSpammer", "KappaClown", "PixelHeart", "HexCode", "GlitchArt", 
        "CreepyCrawler", "Fearless", "CozyStreamer", "JumpScared", "Speedrunner",
        "VoidDweller", "Phasmophobe", "Noclipped", "CameraGuy", "Mod_Ready"
    };
    const char* badges[] = { "[SUB]", "[VIP]", "" };
    
    int numUsernames = sizeof(usernames) / sizeof(usernames[0]);
    const char* username = usernames[GetRandomValue(0, numUsernames - 1)];
    const char* badge = badges[GetRandomValue(0, 2)];
    if (GetRandomValue(0, 8) == 0) badge = "[MOD]";
    
    Color userColor = (Color){ GetRandomValue(120, 255), GetRandomValue(120, 255), GetRandomValue(120, 255), 255 };
    if (strcmp(badge, "[MOD]") == 0) userColor = (Color){ 50, 205, 50, 255 };
    if (strcmp(badge, "[VIP]") == 0) userColor = PINK;
    
    char tempText[128] = "";
    const char* text = "";
    bool isSpecial = false;
    
    if (monsterState == MONSTER_CHASE) {
        const char* chaseComments[] = {
            "OMGGGGGGG!", "RUN RUN RUN!!!", "BEHIND YOU!!!!", "WTF WAS THAT?!", 
            "monkaW", "what is that sound?!", "Chat is this real?!", 
            "HE'S COMING!", "STREAMER RUN!!!", "HE'S SO FAST", "CHASE HYPE!",
            "RIP streamer", "monkaS", "F", "F", "Oh no no no", "GG", "monkaOMEGA"
        };
        int numComments = sizeof(chaseComments) / sizeof(chaseComments[0]);
        text = chaseComments[GetRandomValue(0, numComments - 1)];
        
        if (GetRandomValue(0, 10) == 0) {
            isSpecial = true;
            float amt = GetRandomValue(5, 50);
            sprintf(tempText, "donated $%0.2f: \"RUN!!! OMG CHILLS!\"", amt);
            text = tempText;
            badge = "";
            username = usernames[GetRandomValue(0, numUsernames - 1)];
            userColor = GOLD;
            viewerCount += 250;
            donationRaised += amt;
            PlaySound(sndAlert);
        }
    } else {
        if (batteryLevel < 20.0f) {
            const char* lowBatComments[] = {
                "battery is dying!", "use a battery!", "monkaS dark soon", 
                "charge the camera!", "we are going dark!", "stream going offline?"
            };
            int numComments = sizeof(lowBatComments) / sizeof(lowBatComments[0]);
            text = lowBatComments[GetRandomValue(0, numComments - 1)];
        } else if (!flashlightOn) {
            const char* darkComments[] = {
                "turn it back on!", "I can't see anything!", "too dark!", 
                "why off?", "monkaS", "creepy in the dark"
            };
            int numComments = sizeof(darkComments) / sizeof(darkComments[0]);
            text = darkComments[GetRandomValue(0, numComments - 1)];
        } else {
            bool isMoving = IsKeyDown(KEY_W) || IsKeyDown(KEY_A) || IsKeyDown(KEY_S) || IsKeyDown(KEY_D);
            if (!isMoving) {
                const char* idleComments[] = {
                    "ResidentSleeper", "why standing still?", "bro is AFK?", 
                    "is the game paused?", "zzzzz", "do something", "explore!"
                };
                int numComments = sizeof(idleComments) / sizeof(idleComments[0]);
                text = idleComments[GetRandomValue(0, numComments - 1)];
            } else {
                const char* exploreComments[] = {
                    "looks creepy here", "new room hype", "what's in there?", 
                    "spooky sounds", "nice lighting effects", "what is this place?",
                    "any ghosts?", "don't look back", "lurk mode", "POG", "monkaS", "so dark"
                };
                int numComments = sizeof(exploreComments) / sizeof(exploreComments[0]);
                text = exploreComments[GetRandomValue(0, numComments - 1)];
            }
        }
        
        if (GetRandomValue(0, 20) == 0) {
            isSpecial = true;
            int eventType = GetRandomValue(0, 1);
            if (eventType == 0) {
                sprintf(tempText, "subscribed to the channel!");
                badge = "[SUB]";
                userColor = PURPLE;
                viewerCount += 50;
                subscriberCount++;
            } else {
                float amt = GetRandomValue(2, 15);
                sprintf(tempText, "donated $%0.2f: \"Keep going streamer!\"", amt);
                badge = "";
                userColor = GOLD;
                viewerCount += 100;
                donationRaised += amt;
            }
            text = tempText;
            PlaySound(sndAlert);
        }
    }
    
    if (strlen(text) > 0) {
        AddChatMessage(badge, username, text, userColor, isSpecial);
    }
}

void DrawChatMessages(int startX, int startY, int width, int height) {
    int fontSize = 13;
    int spacing = 18;
    int currentY = startY + height - spacing - 10;
    
    for (int i = chatCount - 1; i >= 0; i--) {
        if (currentY < startY) break;
        
        ChatMessage msg = chat[i];
        char fullPrefix[128];
        if (strlen(msg.badge) > 0) {
            sprintf(fullPrefix, "%s %s: ", msg.badge, msg.username);
        } else {
            sprintf(fullPrefix, "%s: ", msg.username);
        }
        
        int prefixWidth = MeasureText(fullPrefix, fontSize);
        
        if (msg.isSpecial) {
            Color bg = (msg.color.r == GOLD.r && msg.color.g == GOLD.g) ? (Color){ 55, 45, 15, 255 } : (Color){ 38, 18, 48, 255 };
            DrawRectangle(startX, currentY - 2, width, spacing + 2, bg);
            DrawRectangleLines(startX, currentY - 2, width, spacing + 2, msg.color);
        }
        
        DrawText(fullPrefix, startX + 6, currentY, fontSize, msg.color);
        
        int maxTextWidth = width - prefixWidth - 15;
        if (MeasureText(msg.text, fontSize) <= maxTextWidth) {
            DrawText(msg.text, startX + 6 + prefixWidth, currentY, fontSize, WHITE);
            currentY -= spacing;
        } else {
            char line1[64] = "";
            char line2[64] = "";
            int len = strlen(msg.text);
            int splitIdx = len / 2;
            
            for (int j = splitIdx; j > 0; j--) {
                if (msg.text[j] == ' ') {
                    splitIdx = j;
                    break;
                }
            }
            
            strncpy(line1, msg.text, splitIdx);
            line1[splitIdx] = '\0';
            strcpy(line2, msg.text + splitIdx + 1);
            
            DrawText(line2, startX + 6 + prefixWidth, currentY, fontSize, WHITE);
            currentY -= spacing;
            
            if (currentY >= startY) {
                DrawText(line1, startX + 6 + prefixWidth, currentY, fontSize, WHITE);
                currentY -= spacing;
            }
        }
    }
}
