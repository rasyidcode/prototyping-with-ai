#ifndef SOUND_SYNTH_H
#define SOUND_SYNTH_H

#include "raylib.h"

typedef enum {
    SND_SHOOT_PLASMA,
    SND_SHOOT_SHOTGUN,
    SND_HIT_ENEMY,
    SND_EXPLOSION,
    SND_HIT_PLAYER,
    SND_JUMP,
    SND_RELOAD,
    SND_PICKUP,
    SND_COUNT
} SoundType;

void InitGameSounds(void);
void PlayGameSound(SoundType type);
void UnloadGameSounds(void);

// Procedural music stream functions
void InitGameMusic(void);
void UpdateGameMusic(int activeEnemies);
void CloseGameMusic(void);

#endif // SOUND_SYNTH_H

