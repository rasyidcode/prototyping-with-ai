#ifndef AUDIO_H
#define AUDIO_H

#include "common.h"

Wave GenSoundWave(int type, float duration);
void InitGameSounds(void);
void FreeGameSounds(void);

#endif // AUDIO_H
