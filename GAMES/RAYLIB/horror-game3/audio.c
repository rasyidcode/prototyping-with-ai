#include "audio.h"

Wave GenSoundWave(int type, float duration) {
    int sampleRate = 22050;
    int frameCount = sampleRate * duration;
    short *data = (short *)malloc(frameCount * sizeof(short));
    
    for (int i = 0; i < frameCount; i++) {
        float t = (float)i / (float)sampleRate;
        if (type == 0) { // Heartbeat (low thud)
            float beat1 = sinf(2.0f * PI * 55.0f * t) * expf(-25.0f * t);
            float t2 = t - 0.22f;
            float beat2 = (t2 > 0) ? sinf(2.0f * PI * 55.0f * t2) * expf(-25.0f * t2) : 0;
            data[i] = (short)((beat1 + beat2 * 0.8f) * 16000.0f);
        } else if (type == 1) { // Item pickup (retro chime)
            float freq1 = 523.25f; // C5
            float freq2 = 659.25f; // E5
            float freq3 = 783.99f; // G5
            float amp1 = expf(-12.0f * t);
            float amp2 = (t > 0.07f) ? expf(-12.0f * (t - 0.07f)) : 0;
            float amp3 = (t > 0.14f) ? expf(-12.0f * (t - 0.14f)) : 0;
            float val = sinf(2.0f * PI * freq1 * t) * amp1 * 0.4f +
                        sinf(2.0f * PI * freq2 * t) * amp2 * 0.4f +
                        sinf(2.0f * PI * freq3 * t) * amp3 * 0.4f;
            data[i] = (short)(val * 16000.0f);
        } else if (type == 2) { // Static / Glitch
            float noise = (((float)rand() / (float)RAND_MAX) * 2.0f - 1.0f);
            float lowFreq = sinf(2.0f * PI * 35.0f * t) * 0.4f;
            float val = (noise * 0.6f + lowFreq * 0.4f) * expf(-1.5f * t);
            data[i] = (short)(val * 18000.0f);
        } else if (type == 3) { // Door creak
            float noise = (((float)rand() / (float)RAND_MAX) * 2.0f - 1.0f);
            float creak = sinf(2.0f * PI * 90.0f * t) * (1.0f - t/duration);
            float val = (noise * 0.15f + creak * 0.85f) * expf(-1.2f * t);
            data[i] = (short)(val * 12000.0f);
        } else if (type == 4) { // Alert/Donation
            float freq1 = 880.00f; // A5
            float freq2 = 1318.51f; // E6
            float val = 0;
            if (t < 0.08f) {
                val = sinf(2.0f * PI * freq1 * t) * 0.5f;
            } else {
                val = sinf(2.0f * PI * freq2 * t) * 0.5f * expf(-7.0f * (t - 0.08f));
            }
            data[i] = (short)(val * 16000.0f);
        } else if (type == 5) { // Footstep (low thud)
            float val = sinf(2.0f * PI * 65.0f * t) * expf(-30.0f * t);
            data[i] = (short)(val * 7000.0f);
        } else {
            data[i] = 0;
        }
    }
    
    Wave wave = { 0 };
    wave.frameCount = frameCount;
    wave.sampleRate = sampleRate;
    wave.sampleSize = 16;
    wave.channels = 1;
    wave.data = data;
    
    return wave;
}

void InitGameSounds(void) {
    InitAudioDevice();
    
    Wave w1 = GenSoundWave(0, 0.5f);
    sndHeartbeat = LoadSoundFromWave(w1);
    UnloadWave(w1);
    
    Wave w2 = GenSoundWave(1, 0.4f);
    sndPickup = LoadSoundFromWave(w2);
    UnloadWave(w2);
    
    Wave w3 = GenSoundWave(2, 1.0f);
    sndStatic = LoadSoundFromWave(w3);
    UnloadWave(w3);
    
    Wave w4 = GenSoundWave(3, 0.7f);
    sndDoor = LoadSoundFromWave(w4);
    UnloadWave(w4);
    
    Wave w5 = GenSoundWave(4, 0.35f);
    sndAlert = LoadSoundFromWave(w5);
    UnloadWave(w5);

    Wave w6 = GenSoundWave(5, 0.15f);
    sndFootstep = LoadSoundFromWave(w6);
    UnloadWave(w6);
}

void FreeGameSounds(void) {
    UnloadSound(sndHeartbeat);
    UnloadSound(sndPickup);
    UnloadSound(sndStatic);
    UnloadSound(sndDoor);
    UnloadSound(sndAlert);
    UnloadSound(sndFootstep);
    CloseAudioDevice();
}
