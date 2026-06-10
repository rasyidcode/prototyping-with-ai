#ifndef TEXTURES_H
#define TEXTURES_H

#include "common.h"

void DrawCubeTexture(Texture2D texture, Vector3 position, float width, float height, float length, Color color);
void InitGameTextures(void);
void FreeGameTextures(void);

#endif // TEXTURES_H
