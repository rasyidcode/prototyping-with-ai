#include "waves.h"

#include "config.h"

static float LaneY(int lane)
{
    const float margin = 62.0f;
    const float spacing = (SCREEN_HEIGHT - margin * 2.0f) / 4.0f;
    return margin + (float)lane * spacing;
}

static void AddEvent(WaveController *waves, float time, AlienType type, int lane)
{
    if (waves->eventCount >= 32) return;
    waves->events[waves->eventCount++] = (WaveEvent){ time, type, lane };
}

static void BuildWave(WaveController *waves)
{
    waves->eventCount = 0;
    waves->nextEvent = 0;
    waves->timer = 0.0f;
    waves->resting = false;
    waves->restTimer = 0.0f;

    int tier = waves->wave % 4;
    float gap = waves->wave > 6 ? 0.36f : 0.48f;
    int count = 5 + waves->wave;
    if (count > 24) count = 24;

    for (int i = 0; i < count; i++) {
        AlienType type = ALIEN_FIGHTER;
        if (tier == 1 && i % 3 == 0) type = ALIEN_SCOUT;
        if (tier == 2 && i % 3 == 1) type = ALIEN_DRIFTER;
        if (tier == 3 && i % 5 == 2) type = ALIEN_BRUTE;
        if (waves->wave >= 5 && i % 6 == 0) type = ALIEN_DRIFTER;
        if (waves->wave >= 7 && i % 7 == 3) type = ALIEN_BRUTE;

        AddEvent(waves, 0.55f + (float)i * gap, type, (i + waves->wave) % 5);
    }

    if (waves->wave % 3 == 0) {
        AddEvent(waves, 1.4f, ALIEN_SCOUT, 0);
        AddEvent(waves, 1.5f, ALIEN_SCOUT, 4);
        AddEvent(waves, 2.8f, ALIEN_BRUTE, 2);
    }
}

void ResetWaves(WaveController *waves)
{
    waves->wave = 1;
    BuildWave(waves);
}

void UpdateWaves(WaveController *waves, Alien aliens[], float dt)
{
    if (waves->resting) {
        waves->restTimer -= dt;
        if (waves->restTimer <= 0.0f) {
            waves->wave++;
            BuildWave(waves);
        }
        return;
    }

    waves->timer += dt;
    while (waves->nextEvent < waves->eventCount &&
           waves->events[waves->nextEvent].time <= waves->timer) {
        WaveEvent event = waves->events[waves->nextEvent];
        if (!SpawnAlien(aliens, event.type, LaneY(event.lane), waves->wave)) break;
        waves->nextEvent++;
    }

    if (waves->nextEvent >= waves->eventCount && ActiveAlienCount(aliens) == 0) {
        waves->resting = true;
        waves->restTimer = 1.6f;
    }
}
