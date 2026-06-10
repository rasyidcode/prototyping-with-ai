#ifndef CHAT_H
#define CHAT_H

#include "common.h"

void AddChatMessage(const char* badge, const char* username, const char* text, Color color, bool isSpecial);
void ClearChat(void);
void TriggerChatSpam(void);
void DrawChatMessages(int startX, int startY, int width, int height);

#endif // CHAT_H
