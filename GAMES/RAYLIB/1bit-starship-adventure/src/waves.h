#ifndef WAVES_H
#define WAVES_H

#include "entities.h"

#include <stdbool.h>

typedef struct WaveEvent {
    float time;
    AlienType type;
    int lane;
} WaveEvent;

typedef struct WaveController {
    int wave;
    int nextEvent;
    int eventCount;
    float timer;
    float restTimer;
    bool resting;
    WaveEvent events[32];
} WaveController;

void ResetWaves(WaveController *waves);
void UpdateWaves(WaveController *waves, Alien aliens[], float dt);

#endif
