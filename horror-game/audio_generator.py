import math
import struct
import os
import random

def write_wav(filename, samples, sample_rate=44100):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with wave.open(filename, 'w') as w:
        w.setnchannels(1) # mono
        w.setsampwidth(2) # 16-bit
        w.setframerate(sample_rate)
        for sample in samples:
            # clamp sample to -1.0 to 1.0
            val = max(-1.0, min(1.0, sample))
            int_val = int(val * 32767)
            w.writeframesraw(struct.pack('<h', int_val))

# Since wave is in standard library, import it here
import wave

def generate_sounds():
    print("Generating sounds...")
    sr = 44100
    random.seed(42) # Deterministic noise

    # 1. Flashlight Click
    print("-> flashlight_click.wav")
    duration = 0.05
    samples = []
    for i in range(int(duration * sr)):
        t = i / sr
        freq = 3500 - 2000 * (t / duration)
        val = math.sin(2 * math.pi * freq * t) * math.exp(-120 * t)
        val += (random.random() * 2.0 - 1.0) * math.exp(-250 * t) * 0.3
        samples.append(val * 0.4)
    write_wav("sounds/flashlight_click.wav", samples, sr)

    # 2. Footstep
    print("-> footstep.wav")
    duration = 0.25
    samples = []
    for i in range(int(duration * sr)):
        t = i / sr
        # Low frequency impact thud (approx 80Hz)
        low_thud = math.sin(2 * math.pi * 80 * t) * math.exp(-22 * t)
        # Higher frequency friction crunch (approx 800Hz)
        crunch_freq = 700 + 300 * math.sin(2 * math.pi * 80 * t)
        crunch = (random.random() * 2.0 - 1.0) * math.exp(-35 * t) * 0.2 * (math.sin(2 * math.pi * crunch_freq * t) + 1.0)
        val = low_thud * 0.8 + crunch * 0.2
        samples.append(val * 0.3)
    write_wav("sounds/footstep.wav", samples, sr)

    # 3. Door Creak
    print("-> door_creak.wav")
    duration = 1.8
    samples = []
    for i in range(int(duration * sr)):
        t = i / sr
        # Friction click rate modulations
        base_freq = 55 + 15 * math.sin(2 * math.pi * 1.2 * t)
        pulse_rate = 14 + 8 * math.sin(2 * math.pi * 0.8 * t)
        pulse = math.sin(2 * math.pi * pulse_rate * t)
        
        # Stick-slip sound: only plays during high pulse parts
        if pulse > 0.1:
            val = math.sin(2 * math.pi * base_freq * t) * pulse * 0.25
        else:
            val = 0.0
        
        # Fade in/out to smooth boundaries
        fade = math.sin(math.pi * (t / duration))
        samples.append(val * fade * 0.3)
    write_wav("sounds/door_creak.wav", samples, sr)

    # 4. Door Slam
    print("-> door_slam.wav")
    duration = 1.2
    samples = []
    for i in range(int(duration * sr)):
        t = i / sr
        thud = math.sin(2 * math.pi * 55 * t) * math.exp(-12 * t)
        crunch = (random.random() * 2.0 - 1.0) * math.exp(-35 * t) * 0.4
        reverb = (random.random() * 2.0 - 1.0) * math.exp(-4 * t) * 0.1
        val = thud * 0.5 + crunch * 0.4 + reverb * 0.1
        samples.append(val * 0.7)
    write_wav("sounds/door_slam.wav", samples, sr)

    # 5. Key Pickup
    print("-> key_pickup.wav")
    duration = 0.6
    samples = []
    for i in range(int(duration * sr)):
        t = i / sr
        chime1 = math.sin(2 * math.pi * 1100 * t)
        chime2 = math.sin(2 * math.pi * 1450 * t)
        chime3 = math.sin(2 * math.pi * 1750 * t)
        val = (chime1 + chime2 * 0.6 + chime3 * 0.45) / 2.05
        fade = math.exp(-8 * t)
        samples.append(val * fade * 0.35)
    write_wav("sounds/key_pickup.wav", samples, sr)

    # 6. Ambient Drone
    print("-> ambient_drone.wav")
    duration = 8.0 # Longer loop
    samples = []
    for i in range(int(duration * sr)):
        t = i / sr
        # Harmonically locked drone components (phase-coherent for looping)
        # Duration is 8.0, so frequencies must be multiples of 0.125 Hz
        hum1 = math.sin(2 * math.pi * 55 * t)       # 55 Hz (440 cycles)
        hum2 = math.sin(2 * math.pi * 110 * t)      # 110 Hz (880 cycles)
        hum3 = math.sin(2 * math.pi * 82.5 * t)     # 82.5 Hz (660 cycles) - minor third/dissonant
        
        # Very slow modulations
        mod1 = 0.55 + 0.3 * math.sin(2 * math.pi * 0.125 * t) # 1 cycle per 8s
        mod2 = 0.55 + 0.35 * math.sin(2 * math.pi * 0.25 * t) # 2 cycles per 8s
        
        # Sub-bass rumble
        sub = math.sin(2 * math.pi * 27.5 * t) * 0.4  # 27.5 Hz (220 cycles)
        
        # Combined drone
        val = (hum1 * mod1 + hum2 * mod2 + hum3 * 0.25 + sub) * 0.25
        samples.append(val)
        
    write_wav("sounds/ambient_drone.wav", samples, sr)

    # 7. Scary Whisper (Resonant Filtered Noise)
    print("-> scary_whisper.wav")
    duration = 3.5
    noise_samples = [random.random() * 2.0 - 1.0 for _ in range(int(duration * sr))]
    
    # Let's apply a sweeping bandpass filter
    # Center frequency sweeps between 300Hz and 1000Hz
    filtered = []
    y1, y2 = 0.0, 0.0
    Q = 8.0 # Narrow peak for wind-like whistle
    
    for idx, x in enumerate(noise_samples):
        t = idx / sr
        # Sweep frequency: sine path
        cf = 650 + 350 * math.sin(2 * math.pi * 0.3 * t)
        
        w0 = 2 * math.pi * cf / sr
        alpha = math.sin(w0) / (2.0 * Q)
        
        b0 = alpha
        b2 = -alpha
        a0 = 1.0 + alpha
        a1 = -2.0 * math.cos(w0)
        a2 = 1.0 - alpha
        
        b0 /= a0
        b2 /= a0
        a1 /= a0
        a2 /= a0
        
        y = b0 * x - a1 * y1 - a2 * y2
        y2 = y1
        y1 = y
        
        # Add amplitude modulation for breathing effect
        amp_mod = 0.4 + 0.3 * math.sin(2 * math.pi * 0.65 * t)
        # Fade in/out
        fade = math.sin(math.pi * (t / duration))
        
        filtered.append(y * amp_mod * fade * 0.6)
        
    write_wav("sounds/scary_whisper.wav", filtered, sr)
    print("Audio generation complete!")

if __name__ == "__main__":
    generate_sounds()
