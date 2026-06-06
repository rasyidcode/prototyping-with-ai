#include "sound_synth.h"
#include <stdlib.h>
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

static Sound gameSounds[SND_COUNT] = { 0 };
static bool audioDeviceReady = false;

// Helper to convert float buffer to 16-bit PCM Wave and load into Raylib Sound
static Sound LoadSoundFromFloatBuffer(const float *samples, int sampleCount, int sampleRate) {
    Wave wave = { 0 };
    wave.frameCount = sampleCount;
    wave.sampleRate = sampleRate;
    wave.sampleSize = 16;
    wave.channels = 1;
    wave.data = malloc(sampleCount * sizeof(short));
    
    if (wave.data != NULL) {
        short *shortData = (short *)wave.data;
        for (int i = 0; i < sampleCount; i++) {
            float s = samples[i];
            // Hard clamping to prevent distortion
            if (s > 1.0f) s = 1.0f;
            if (s < -1.0f) s = -1.0f;
            shortData[i] = (short)(s * 32767.0f);
        }
    }
    
    Sound sound = LoadSoundFromWave(wave);
    UnloadWave(wave); // Free CPU-side copy of Wave data (LoadSoundFromWave copies it to GPU/audio device buffer)
    return sound;
}

void InitGameSounds(void) {
    InitAudioDevice();
    if (!IsAudioDeviceReady()) {
        TraceLog(LOG_WARNING, "Failed to initialize audio device. Running in silent mode.");
        audioDeviceReady = false;
        return;
    }
    audioDeviceReady = true;
    
    int sampleRate = 44100;
    
    // 1. SND_SHOOT_PLASMA (Pitch Sweep down)
    {
        float duration = 0.18f;
        int count = (int)(duration * sampleRate);
        float *samples = malloc(count * sizeof(float));
        float f0 = 1200.0f;
        float f1 = 250.0f;
        
        for (int i = 0; i < count; i++) {
            float t = (float)i / sampleRate;
            // Phase integration for frequency sweep
            float phase = 2.0f * M_PI * (f0 * t + ((f1 - f0) / (2.0f * duration)) * t * t);
            float amp = 1.0f - (t / duration);
            // Mix sine with a tiny bit of triangle/saw wave character to make it buzz
            float sine = sinf(phase);
            float pulse = (sine > 0.0f) ? 0.2f : -0.2f;
            samples[i] = (sine * 0.8f + pulse * 0.2f) * amp * 0.4f; // Master volume adjust
        }
        gameSounds[SND_SHOOT_PLASMA] = LoadSoundFromFloatBuffer(samples, count, sampleRate);
        free(samples);
    }
    
    // 2. SND_SHOOT_SHOTGUN (Bass Boom + White Noise blast)
    {
        float duration = 0.45f;
        int count = (int)(duration * sampleRate);
        float *samples = malloc(count * sizeof(float));
        float lpFilter = 0.0f;
        
        for (int i = 0; i < count; i++) {
            float t = (float)i / sampleRate;
            
            // Bass boom (Sine sweep 180Hz -> 30Hz)
            float bassDuration = 0.25f;
            float bassAmp = (t < bassDuration) ? powf(1.0f - (t / bassDuration), 3.0f) : 0.0f;
            float bassPhase = 2.0f * M_PI * (180.0f * t + ((30.0f - 180.0f) / (2.0f * bassDuration)) * t * t);
            float bass = sinf(bassPhase) * bassAmp;
            
            // Noise blast
            float noiseAmp = powf(1.0f - (t / duration), 2.5f);
            float noiseRaw = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
            
            // Simple low-pass filter on noise to make it boomier
            lpFilter = lpFilter * 0.82f + noiseRaw * 0.18f;
            
            samples[i] = (bass * 0.5f + lpFilter * 0.5f) * noiseAmp * 0.6f;
        }
        gameSounds[SND_SHOOT_SHOTGUN] = LoadSoundFromFloatBuffer(samples, count, sampleRate);
        free(samples);
    }
    
    // 3. SND_HIT_ENEMY (High pitch metallic blip)
    {
        float duration = 0.06f;
        int count = (int)(duration * sampleRate);
        float *samples = malloc(count * sizeof(float));
        for (int i = 0; i < count; i++) {
            float t = (float)i / sampleRate;
            float phase = 2.0f * M_PI * 1500.0f * t;
            float amp = 1.0f - (t / duration);
            // Metallic ring (frequency modulation)
            float mod = sinf(2.0f * M_PI * 300.0f * t);
            samples[i] = sinf(phase + mod * 2.0f) * amp * 0.2f;
        }
        gameSounds[SND_HIT_ENEMY] = LoadSoundFromFloatBuffer(samples, count, sampleRate);
        free(samples);
    }
    
    // 4. SND_EXPLOSION (Rumble + Low-pass White Noise decay)
    {
        float duration = 0.65f;
        int count = (int)(duration * sampleRate);
        float *samples = malloc(count * sizeof(float));
        float lpFilter = 0.0f;
        
        for (int i = 0; i < count; i++) {
            float t = (float)i / sampleRate;
            float amp = powf(1.0f - (t / duration), 2.0f);
            
            // Low rumble sweep
            float rumblePhase = 2.0f * M_PI * (90.0f * t + ((25.0f - 90.0f) / (2.0f * duration)) * t * t);
            float rumble = sinf(rumblePhase) * 0.4f;
            
            // Muffled noise
            float noiseRaw = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
            lpFilter = lpFilter * 0.92f + noiseRaw * 0.08f; // Heavy low-pass
            
            samples[i] = (rumble + lpFilter) * amp * 0.7f;
        }
        gameSounds[SND_EXPLOSION] = LoadSoundFromFloatBuffer(samples, count, sampleRate);
        free(samples);
    }
    
    // 5. SND_HIT_PLAYER (Fleshy thump)
    {
        float duration = 0.25f;
        int count = (int)(duration * sampleRate);
        float *samples = malloc(count * sizeof(float));
        float lpFilter = 0.0f;
        
        for (int i = 0; i < count; i++) {
            float t = (float)i / sampleRate;
            float amp = 1.0f - (t / duration);
            
            // Sweep from 120Hz down to 40Hz
            float sweepPhase = 2.0f * M_PI * (120.0f * t + ((40.0f - 120.0f) / (2.0f * duration)) * t * t);
            float sweep = sinf(sweepPhase) * 0.6f;
            
            float noiseRaw = ((float)rand() / RAND_MAX) * 2.0f - 1.0f;
            lpFilter = lpFilter * 0.85f + noiseRaw * 0.15f;
            
            samples[i] = (sweep + lpFilter * 0.4f) * amp * 0.7f;
        }
        gameSounds[SND_HIT_PLAYER] = LoadSoundFromFloatBuffer(samples, count, sampleRate);
        free(samples);
    }
    
    // 6. SND_JUMP (Upward pitch sweep)
    {
        float duration = 0.12f;
        int count = (int)(duration * sampleRate);
        float *samples = malloc(count * sizeof(float));
        float f0 = 150.0f;
        float f1 = 450.0f;
        for (int i = 0; i < count; i++) {
            float t = (float)i / sampleRate;
            float phase = 2.0f * M_PI * (f0 * t + ((f1 - f0) / (2.0f * duration)) * t * t);
            float amp = 1.0f - (t / duration);
            samples[i] = sinf(phase) * amp * 0.25f;
        }
        gameSounds[SND_JUMP] = LoadSoundFromFloatBuffer(samples, count, sampleRate);
        free(samples);
    }
    
    // 7. SND_RELOAD (Double click/clack sound)
    {
        float duration = 0.40f;
        int count = (int)(duration * sampleRate);
        float *samples = calloc(count, sizeof(float));
        
        // Click 1 at t = 0.08s
        float c1_time = 0.08f;
        int c1_start = (int)(c1_time * sampleRate);
        float c1_dur = 0.03f;
        int c1_len = (int)(c1_dur * sampleRate);
        
        for (int i = 0; i < c1_len && (c1_start + i) < count; i++) {
            float t = (float)i / sampleRate;
            float phase = 2.0f * M_PI * 1100.0f * t;
            float amp = 1.0f - (t / c1_dur);
            samples[c1_start + i] += sinf(phase) * amp * 0.3f;
        }
        
        // Click 2 at t = 0.28s
        float c2_time = 0.28f;
        int c2_start = (int)(c2_time * sampleRate);
        float c2_dur = 0.04f;
        int c2_len = (int)(c2_dur * sampleRate);
        
        for (int i = 0; i < c2_len && (c2_start + i) < count; i++) {
            float t = (float)i / sampleRate;
            float phase = 2.0f * M_PI * 800.0f * t;
            float amp = 1.0f - (t / c2_dur);
            samples[c2_start + i] += sinf(phase) * amp * 0.35f;
        }
        
        gameSounds[SND_RELOAD] = LoadSoundFromFloatBuffer(samples, count, sampleRate);
        free(samples);
    }
    
    // 8. SND_PICKUP (Futuristic upward chime sweep)
    {
        float duration = 0.16f;
        int count = (int)(duration * sampleRate);
        float *samples = malloc(count * sizeof(float));
        float f0 = 550.0f;
        float f1 = 1150.0f;
        for (int i = 0; i < count; i++) {
            float t = (float)i / sampleRate;
            float phase = 2.0f * M_PI * (f0 * t + ((f1 - f0) / (2.0f * duration)) * t * t);
            float amp = 1.0f - (t / duration);
            float mod = sinf(2.0f * M_PI * 5.0f * t);
            samples[i] = sinf(phase + mod * 0.5f) * amp * 0.3f;
        }
        gameSounds[SND_PICKUP] = LoadSoundFromFloatBuffer(samples, count, sampleRate);
        free(samples);
    }
}

void PlayGameSound(SoundType type) {
    if (!audioDeviceReady || type < 0 || type >= SND_COUNT) return;
    PlaySound(gameSounds[type]);
}

void UnloadGameSounds(void) {
    if (!audioDeviceReady) return;
    for (int i = 0; i < SND_COUNT; i++) {
        UnloadSound(gameSounds[i]);
    }
    CloseAudioDevice();
}

static AudioStream musicStream = { 0 };
static volatile float targetBPM = 85.0f;
static volatile float targetBaseCutoff = 120.0f;

// Music synthesizer states (updated on audio thread)
static float currentBPM = 85.0f;
static float currentBaseCutoff = 120.0f;
static float synthPhase = 0.0f;
static float noteEnvelope = 0.0f;
static float lpFilterState = 0.0f;
static float sampleCounter = 0.0f;
static int stepIndex = 0;

// E minor (E), G major (G), D major (D), C major (C) chord arpeggio notes
static const float noteFrequencies[32] = {
    // Bar 1: E minor arpeggio
    41.20f, 41.20f, 82.41f, 41.20f, 41.20f, 41.20f, 82.41f, 41.20f,
    // Bar 2: G major arpeggio
    49.00f, 49.00f, 98.00f, 49.00f, 49.00f, 49.00f, 98.00f, 49.00f,
    // Bar 3: D major arpeggio
    36.71f, 36.71f, 73.42f, 36.71f, 36.71f, 36.71f, 73.42f, 36.71f,
    // Bar 4: C major arpeggio
    32.70f, 32.70f, 65.41f, 32.70f, 32.70f, 32.70f, 65.41f, 32.70f
};

// Audio callback for real-time procedural music synthesis
static void SynthesizeMusicCallback(void *bufferData, unsigned int frames) {
    short *buffer = (short *)bufferData;
    float sampleRate = 44100.0f;
    
    for (unsigned int i = 0; i < frames; i++) {
        // Smoothly interpolate current BPM and Cutoff to prevent audio pops
        currentBPM = currentBPM + 0.0001f * (targetBPM - currentBPM);
        currentBaseCutoff = currentBaseCutoff + 0.0001f * (targetBaseCutoff - currentBaseCutoff);
        
        // Calculate step duration in samples: 1/8 note steps
        // BPM is beats per minute. Each beat has 2 steps (eighth notes).
        // steps per second = (BPM / 60.0f) * 2.0f
        // samples per step = sampleRate / (steps per second) = (sampleRate * 30.0f) / BPM
        float stepDuration = (sampleRate * 30.0f) / currentBPM;
        
        sampleCounter += 1.0f;
        if (sampleCounter >= stepDuration) {
            sampleCounter = 0.0f;
            stepIndex = (stepIndex + 1) % 32;
            noteEnvelope = 1.0f; // Reset envelope trigger
        }
        
        float freq = noteFrequencies[stepIndex];
        
        // Update Sawtooth Oscillator phase
        synthPhase += (2.0f * M_PI * freq) / sampleRate;
        if (synthPhase > 2.0f * M_PI) {
            synthPhase -= 2.0f * M_PI;
        }
        
        // Sawtooth wave value in range [-1.0f, 1.0f]
        float rawSaw = (synthPhase / M_PI) - 1.0f;
        
        // Envelope decay
        noteEnvelope -= 8.0f / sampleRate; // Decays over ~0.12s
        if (noteEnvelope < 0.0f) noteEnvelope = 0.0f;
        
        // Apply envelope to oscillator
        float oscValue = rawSaw * noteEnvelope;
        
        // Low-pass filter frequency modulation (sweeps down as envelope decays)
        float cutoffFreq = currentBaseCutoff + noteEnvelope * 1000.0f;
        
        // 1-pole Low-pass Filter: y[n] = y[n-1] + a * (x[n] - y[n-1])
        // a = 2 * PI * cutoff / sampleRate
        float filterAlpha = (2.0f * M_PI * cutoffFreq) / sampleRate;
        if (filterAlpha > 0.99f) filterAlpha = 0.99f;
        
        lpFilterState += filterAlpha * (oscValue - lpFilterState);
        
        // Scale volume and write to 16-bit mono buffer (volume 0.16f is clean and non-intrusive)
        float finalSample = lpFilterState * 0.16f;
        if (finalSample > 1.0f) finalSample = 1.0f;
        if (finalSample < -1.0f) finalSample = -1.0f;
        
        buffer[i] = (short)(finalSample * 32767.0f);
    }
}

void InitGameMusic(void) {
    if (!audioDeviceReady) return;
    
    // Create mono stream at 44.1kHz, 16-bit
    musicStream = LoadAudioStream(44100, 16, 1);
    if (IsAudioStreamValid(musicStream)) {
        SetAudioStreamVolume(musicStream, 0.7f); // Master music volume slider
        SetAudioStreamCallback(musicStream, SynthesizeMusicCallback);
        PlayAudioStream(musicStream);
        TraceLog(LOG_INFO, "Procedural Cyberpunk Music Stream initialized.");
    }
}

void UpdateGameMusic(int activeEnemies) {
    if (!audioDeviceReady || !IsAudioStreamValid(musicStream)) return;
    
    if (activeEnemies == 0) {
        targetBPM = 85.0f; // Calmer base tempo when no enemies
        targetBaseCutoff = 120.0f; // Muffled dark atmosphere
    } else {
        // Scale intensity linearly up to 10 enemies
        float factor = (float)activeEnemies / 10.0f;
        if (factor > 1.0f) factor = 1.0f;
        
        targetBPM = 85.0f + factor * 50.0f;        // 85 BPM -> 135 BPM max
        targetBaseCutoff = 120.0f + factor * 750.0f; // 120Hz -> 870Hz cutoff
    }
}

void CloseGameMusic(void) {
    if (!audioDeviceReady) return;
    if (IsAudioStreamValid(musicStream)) {
        StopAudioStream(musicStream);
        UnloadAudioStream(musicStream);
        TraceLog(LOG_INFO, "Procedural Music Stream closed.");
    }
}

