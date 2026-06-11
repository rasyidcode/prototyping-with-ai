#include "raylib.h"
#include "raymath.h"

#include <math.h>
#include <stdlib.h>
#include <string.h>

#ifndef PI
#define PI 3.14159265358979323846f
#endif

#define SCREEN_WIDTH 1280
#define SCREEN_HEIGHT 720
#define STAR_COUNT 520
#define NEBULA_COUNT 120
#define COMET_COUNT 9
#define MAX_LASERS 96
#define MAX_PARTICLES 900
#define TWO_PI (PI*2.0f)

typedef struct Star {
    Vector2 position;
    float speed;
    float phase;
    float size;
    Color color;
    char glyph[2];
} Star;

typedef struct NebulaGlyph {
    Vector2 origin;
    float radius;
    float speed;
    float phase;
    Color color;
    char glyph[2];
} NebulaGlyph;

typedef struct Comet {
    Vector2 position;
    Vector2 velocity;
    float phase;
    char glyph[2];
} Comet;

typedef struct Laser {
    bool active;
    Vector2 position;
    Vector2 previous;
    Vector2 velocity;
    float life;
    float age;
} Laser;

typedef struct Particle {
    bool active;
    Vector2 position;
    Vector2 velocity;
    float life;
    float age;
    float size;
    Color color;
    char glyph[2];
} Particle;

typedef struct Ship {
    Vector2 position;
    Vector2 velocity;
    float angle;
    float shotCooldown;
} Ship;

static float RandFloat(float min, float max)
{
    return min + (max - min)*(float)GetRandomValue(0, 10000)/10000.0f;
}

static Vector2 FromAngle(float angle)
{
    return (Vector2){ cosf(angle), sinf(angle) };
}

static Vector2 RotatePoint(Vector2 point, float angle)
{
    float c = cosf(angle);
    float s = sinf(angle);
    return (Vector2){ point.x*c - point.y*s, point.x*s + point.y*c };
}

static void WrapPosition(Vector2 *position, float margin)
{
    if (position->x < -margin) position->x = SCREEN_WIDTH + margin;
    if (position->x > SCREEN_WIDTH + margin) position->x = -margin;
    if (position->y < -margin) position->y = SCREEN_HEIGHT + margin;
    if (position->y > SCREEN_HEIGHT + margin) position->y = -margin;
}

static Color FadeAlpha(Color color, float alpha)
{
    Color out = color;
    out.a = (unsigned char)Clamp(alpha*255.0f, 0.0f, 255.0f);
    return out;
}

static Sound CreateLaserSound(void)
{
    const int sampleRate = 44100;
    const float seconds = 0.16f;
    const int frames = (int)(sampleRate*seconds);
    short *samples = (short *)MemAlloc((unsigned int)frames*sizeof(short));

    for (int i = 0; i < frames; i++) {
        float t = (float)i/(float)sampleRate;
        float u = (float)i/(float)frames;
        float freq = 1180.0f - 780.0f*u;
        float envelope = expf(-13.0f*u);
        float chirp = sinf(TWO_PI*freq*t + 18.0f*u*u);
        float snap = sinf(TWO_PI*(freq*2.25f)*t)*expf(-40.0f*u);
        float sample = (chirp*0.75f + snap*0.25f)*envelope;
        samples[i] = (short)(sample*30000.0f);
    }

    Wave wave = {
        .frameCount = (unsigned int)frames,
        .sampleRate = sampleRate,
        .sampleSize = 16,
        .channels = 1,
        .data = samples
    };
    Sound sound = LoadSoundFromWave(wave);
    UnloadWave(wave);
    return sound;
}

static void InitBackground(Star stars[], NebulaGlyph nebula[], Comet comets[])
{
    const char *starGlyphs[] = { ".", "'", ":", "+", "*", "`" };
    const Color starColors[] = {
        (Color){ 140, 210, 255, 255 },
        (Color){ 255, 255, 220, 255 },
        (Color){ 195, 155, 255, 255 },
        (Color){ 130, 255, 210, 255 }
    };

    for (int i = 0; i < STAR_COUNT; i++) {
        stars[i].position = (Vector2){ RandFloat(0, SCREEN_WIDTH), RandFloat(0, SCREEN_HEIGHT) };
        stars[i].speed = RandFloat(8.0f, 70.0f);
        stars[i].phase = RandFloat(0.0f, TWO_PI);
        stars[i].size = RandFloat(14.0f, 26.0f);
        stars[i].color = starColors[GetRandomValue(0, 3)];
        strcpy(stars[i].glyph, starGlyphs[GetRandomValue(0, 5)]);
    }

    const char *nebulaGlyphs[] = { "~", "=", "-", "+", ":", "." };
    const Color nebulaColors[] = {
        (Color){ 88, 214, 255, 90 },
        (Color){ 211, 110, 255, 90 },
        (Color){ 85, 255, 176, 85 },
        (Color){ 255, 187, 93, 75 }
    };

    for (int i = 0; i < NEBULA_COUNT; i++) {
        nebula[i].origin = (Vector2){ RandFloat(-120, SCREEN_WIDTH + 120), RandFloat(-80, SCREEN_HEIGHT + 80) };
        nebula[i].radius = RandFloat(18.0f, 140.0f);
        nebula[i].speed = RandFloat(4.0f, 20.0f);
        nebula[i].phase = RandFloat(0.0f, TWO_PI);
        nebula[i].color = nebulaColors[GetRandomValue(0, 3)];
        strcpy(nebula[i].glyph, nebulaGlyphs[GetRandomValue(0, 5)]);
    }

    const char *cometGlyphs[] = { ">", "}", ")", "/" };
    for (int i = 0; i < COMET_COUNT; i++) {
        comets[i].position = (Vector2){ RandFloat(0, SCREEN_WIDTH), RandFloat(0, SCREEN_HEIGHT) };
        comets[i].velocity = (Vector2){ RandFloat(45.0f, 140.0f), RandFloat(-22.0f, 22.0f) };
        comets[i].phase = RandFloat(0.0f, TWO_PI);
        strcpy(comets[i].glyph, cometGlyphs[GetRandomValue(0, 3)]);
    }
}

static void SpawnParticle(Particle particles[], Vector2 position, Vector2 velocity, float life, float size, Color color, const char *glyph)
{
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particles[i].active) {
            particles[i].active = true;
            particles[i].position = position;
            particles[i].velocity = velocity;
            particles[i].life = life;
            particles[i].age = 0.0f;
            particles[i].size = size;
            particles[i].color = color;
            particles[i].glyph[0] = glyph[0];
            particles[i].glyph[1] = '\0';
            return;
        }
    }
}

static void SpawnExhaust(Particle particles[], const Ship *ship)
{
    Vector2 back = Vector2Scale(FromAngle(ship->angle), -1.0f);
    Vector2 base = Vector2Add(ship->position, Vector2Scale(back, 31.0f));
    Vector2 side = RotatePoint((Vector2){ 0.0f, RandFloat(-8.0f, 8.0f) }, ship->angle);
    Vector2 velocity = Vector2Add(Vector2Scale(back, RandFloat(70.0f, 190.0f)), (Vector2){ RandFloat(-35.0f, 35.0f), RandFloat(-35.0f, 35.0f) });
    Color color = GetRandomValue(0, 1) ? (Color){ 93, 255, 215, 230 } : (Color){ 255, 105, 219, 220 };
    SpawnParticle(particles, Vector2Add(base, side), velocity, RandFloat(0.32f, 0.62f), RandFloat(14.0f, 24.0f), color, GetRandomValue(0, 1) ? "*" : "+");
}

static void SpawnMuzzleBurst(Particle particles[], Vector2 nose, float angle)
{
    Vector2 forward = FromAngle(angle);
    for (int i = 0; i < 34; i++) {
        Vector2 spray = FromAngle(angle + RandFloat(-0.95f, 0.95f));
        Vector2 velocity = Vector2Add(Vector2Scale(forward, RandFloat(180.0f, 420.0f)), Vector2Scale(spray, RandFloat(35.0f, 180.0f)));
        Color color = GetRandomValue(0, 1) ? (Color){ 80, 255, 232, 255 } : (Color){ 255, 71, 213, 255 };
        SpawnParticle(particles, nose, velocity, RandFloat(0.18f, 0.42f), RandFloat(13.0f, 25.0f), color, GetRandomValue(0, 2) == 0 ? "." : "*");
    }
}

static void FireLaser(Laser lasers[], Particle particles[], Ship *ship, Sound laserSound)
{
    if (ship->shotCooldown > 0.0f) return;

    Vector2 forward = FromAngle(ship->angle);
    Vector2 nose = Vector2Add(ship->position, Vector2Scale(forward, 42.0f));

    for (int i = 0; i < MAX_LASERS; i++) {
        if (!lasers[i].active) {
            lasers[i].active = true;
            lasers[i].position = nose;
            lasers[i].previous = nose;
            lasers[i].velocity = Vector2Add(ship->velocity, Vector2Scale(forward, 850.0f));
            lasers[i].life = 1.15f;
            lasers[i].age = 0.0f;
            ship->shotCooldown = 0.095f;
            SpawnMuzzleBurst(particles, nose, ship->angle);
            SetSoundPitch(laserSound, RandFloat(0.92f, 1.1f));
            PlaySound(laserSound);
            return;
        }
    }
}

static void UpdateShip(Ship *ship, Laser lasers[], Particle particles[], Sound laserSound, float dt)
{
    const float turnSpeed = 4.15f;
    const float thrust = 455.0f;
    const float reverseThrust = 280.0f;
    const float drag = 0.986f;

    if (IsKeyDown(KEY_A) || IsKeyDown(KEY_LEFT)) ship->angle -= turnSpeed*dt;
    if (IsKeyDown(KEY_D) || IsKeyDown(KEY_RIGHT)) ship->angle += turnSpeed*dt;

    Vector2 forward = FromAngle(ship->angle);

    if (IsKeyDown(KEY_W) || IsKeyDown(KEY_UP)) {
        ship->velocity = Vector2Add(ship->velocity, Vector2Scale(forward, thrust*dt));
        for (int i = 0; i < 3; i++) SpawnExhaust(particles, ship);
    }

    if (IsKeyDown(KEY_S) || IsKeyDown(KEY_DOWN)) {
        ship->velocity = Vector2Subtract(ship->velocity, Vector2Scale(forward, reverseThrust*dt));
        if (GetRandomValue(0, 1) == 0) SpawnExhaust(particles, ship);
    }

    if (IsKeyPressed(KEY_SPACE) || IsKeyDown(KEY_SPACE)) FireLaser(lasers, particles, ship, laserSound);

    ship->velocity = Vector2Scale(ship->velocity, powf(drag, dt*60.0f));
    float speed = Vector2Length(ship->velocity);
    if (speed > 560.0f) ship->velocity = Vector2Scale(Vector2Normalize(ship->velocity), 560.0f);

    ship->position = Vector2Add(ship->position, Vector2Scale(ship->velocity, dt));
    ship->shotCooldown = fmaxf(0.0f, ship->shotCooldown - dt);
    WrapPosition(&ship->position, 60.0f);
}

static void UpdateLasers(Laser lasers[], Particle particles[], float dt)
{
    for (int i = 0; i < MAX_LASERS; i++) {
        if (!lasers[i].active) continue;

        lasers[i].previous = lasers[i].position;
        lasers[i].position = Vector2Add(lasers[i].position, Vector2Scale(lasers[i].velocity, dt));
        lasers[i].age += dt;

        if (GetRandomValue(0, 1) == 0) {
            Vector2 jitter = (Vector2){ RandFloat(-18.0f, 18.0f), RandFloat(-18.0f, 18.0f) };
            SpawnParticle(particles, Vector2Add(lasers[i].position, jitter), Vector2Scale(jitter, 1.5f), 0.22f, RandFloat(12.0f, 19.0f), (Color){ 96, 244, 255, 190 }, ".");
        }

        bool out = lasers[i].position.x < -80 || lasers[i].position.x > SCREEN_WIDTH + 80 ||
                   lasers[i].position.y < -80 || lasers[i].position.y > SCREEN_HEIGHT + 80;
        if (lasers[i].age >= lasers[i].life || out) lasers[i].active = false;
    }
}

static void UpdateParticles(Particle particles[], float dt)
{
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particles[i].active) continue;
        particles[i].age += dt;
        if (particles[i].age >= particles[i].life) {
            particles[i].active = false;
            continue;
        }
        particles[i].velocity = Vector2Scale(particles[i].velocity, powf(0.985f, dt*60.0f));
        particles[i].position = Vector2Add(particles[i].position, Vector2Scale(particles[i].velocity, dt));
    }
}

static void DrawBackground(Star stars[], NebulaGlyph nebula[], Comet comets[], Font font, float time, float dt)
{
    ClearBackground((Color){ 3, 6, 15, 255 });

    DrawRectangleGradientV(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, (Color){ 5, 10, 24, 255 }, (Color){ 18, 8, 31, 255 });

    for (int i = 0; i < NEBULA_COUNT; i++) {
        Vector2 wobble = {
            sinf(time*0.22f + nebula[i].phase)*nebula[i].radius,
            cosf(time*0.18f + nebula[i].phase*1.7f)*nebula[i].radius*0.52f
        };
        Vector2 pos = Vector2Add(nebula[i].origin, wobble);
        pos.x -= nebula[i].speed*dt;
        nebula[i].origin.x -= nebula[i].speed*dt;
        if (nebula[i].origin.x < -180.0f) nebula[i].origin.x = SCREEN_WIDTH + RandFloat(60.0f, 180.0f);

        float alphaPulse = 0.44f + 0.34f*sinf(time*0.9f + nebula[i].phase);
        DrawTextEx(font, nebula[i].glyph, pos, RandFloat(18.0f, 22.0f), 1.0f, FadeAlpha(nebula[i].color, alphaPulse));
    }

    for (int i = 0; i < STAR_COUNT; i++) {
        stars[i].position.x -= stars[i].speed*dt;
        stars[i].position.y += sinf(time*0.45f + stars[i].phase)*0.015f*stars[i].speed;
        if (stars[i].position.x < -20.0f) {
            stars[i].position.x = SCREEN_WIDTH + 20.0f;
            stars[i].position.y = RandFloat(0, SCREEN_HEIGHT);
        }

        float twinkle = 0.38f + 0.62f*fabsf(sinf(time*1.9f + stars[i].phase));
        DrawTextEx(font, stars[i].glyph, stars[i].position, stars[i].size, 1.0f, FadeAlpha(stars[i].color, twinkle));
    }

    for (int i = 0; i < COMET_COUNT; i++) {
        comets[i].position = Vector2Add(comets[i].position, Vector2Scale(comets[i].velocity, dt));
        if (comets[i].position.x > SCREEN_WIDTH + 160.0f || comets[i].position.y < -90.0f || comets[i].position.y > SCREEN_HEIGHT + 90.0f) {
            comets[i].position = (Vector2){ RandFloat(-260.0f, -40.0f), RandFloat(30.0f, SCREEN_HEIGHT - 30.0f) };
            comets[i].velocity = (Vector2){ RandFloat(55.0f, 170.0f), RandFloat(-30.0f, 30.0f) };
        }

        for (int t = 0; t < 8; t++) {
            Vector2 trail = Vector2Subtract(comets[i].position, Vector2Scale(Vector2Normalize(comets[i].velocity), (float)t*22.0f));
            DrawTextEx(font, t == 0 ? comets[i].glyph : "-", trail, 18.0f - t*0.8f, 1.0f, FadeAlpha((Color){ 112, 255, 232, 255 }, 0.55f - t*0.055f));
        }
    }
}

static void DrawLaserBeams(const Laser lasers[])
{
    for (int i = 0; i < MAX_LASERS; i++) {
        if (!lasers[i].active) continue;
        float fade = 1.0f - lasers[i].age/lasers[i].life;
        DrawLineEx(lasers[i].previous, lasers[i].position, 10.0f, FadeAlpha((Color){ 255, 49, 211, 255 }, 0.30f*fade));
        DrawLineEx(lasers[i].previous, lasers[i].position, 5.0f, FadeAlpha((Color){ 74, 245, 255, 255 }, 0.72f*fade));
        DrawLineEx(lasers[i].previous, lasers[i].position, 2.0f, FadeAlpha(RAYWHITE, 0.95f*fade));
    }
}

static void DrawParticles(const Particle particles[], Font font)
{
    for (int i = 0; i < MAX_PARTICLES; i++) {
        if (!particles[i].active) continue;
        float fade = 1.0f - particles[i].age/particles[i].life;
        DrawTextEx(font, particles[i].glyph, particles[i].position, particles[i].size, 1.0f, FadeAlpha(particles[i].color, fade));
    }
}

static void DrawShipAscii(const Ship *ship, Font font, float time)
{
    typedef struct ShipGlyph {
        const char *text;
        Vector2 offset;
        float size;
        Color color;
    } ShipGlyph;

    const Color hull = (Color){ 138, 255, 221, 255 };
    const Color glass = (Color){ 255, 84, 229, 255 };
    const Color edge = (Color){ 245, 251, 211, 255 };
    const Color engine = (Color){ 120, 169, 255, 255 };
    const ShipGlyph glyphs[] = {
        { "^",  {  32,   0 }, 30, edge },
        { "<",  {   7, -17 }, 24, hull },
        { ">",  {   7,  17 }, 24, hull },
        { "@",  {   1,   0 }, 26, glass },
        { "=",  { -19, -13 }, 22, hull },
        { "=",  { -19,  13 }, 22, hull },
        { "#",  { -30,   0 }, 24, engine },
        { ".",  { -45, -10 }, 20, (Color){ 255, 82, 214, 255 } },
        { ".",  { -45,  10 }, 20, (Color){ 78, 255, 227, 255 } }
    };

    Vector2 forward = FromAngle(ship->angle);
    Vector2 nose = Vector2Add(ship->position, Vector2Scale(forward, 38.0f));
    float pulse = 0.65f + 0.35f*sinf(time*10.0f);

    DrawCircleV(nose, 11.0f + 4.0f*pulse, FadeAlpha((Color){ 90, 255, 235, 255 }, 0.18f));
    DrawCircleV(ship->position, 42.0f, FadeAlpha((Color){ 137, 87, 255, 255 }, 0.11f));

    for (int i = 0; i < (int)(sizeof(glyphs)/sizeof(glyphs[0])); i++) {
        Vector2 pos = Vector2Add(ship->position, RotatePoint(glyphs[i].offset, ship->angle));
        Vector2 measured = MeasureTextEx(font, glyphs[i].text, glyphs[i].size, 1.0f);
        Color color = glyphs[i].color;
        if (glyphs[i].text[0] == '.') color = FadeAlpha(color, pulse);
        DrawTextPro(font, glyphs[i].text, pos, Vector2Scale(measured, 0.5f), ship->angle*RAD2DEG + 90.0f, glyphs[i].size, 1.0f, color);
    }
}

static void DrawHud(Font font)
{
    DrawRectangle(16, 14, 446, 72, (Color){ 0, 0, 0, 92 });
    DrawTextEx(font, "ALIEN ASCII FIGHTER", (Vector2){ 28, 24 }, 22, 1, (Color){ 112, 255, 229, 255 });
    DrawTextEx(font, "WASD/ARROWS move + rotate    SPACE laser", (Vector2){ 28, 54 }, 19, 1, (Color){ 239, 239, 216, 230 });
}

int main(void)
{
    SetConfigFlags(FLAG_MSAA_4X_HINT | FLAG_WINDOW_RESIZABLE);
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "Alien ASCII Ship");
    InitAudioDevice();
    SetTargetFPS(60);

    Font font = GetFontDefault();
    Sound laserSound = CreateLaserSound();
    SetSoundVolume(laserSound, 0.55f);

    Star stars[STAR_COUNT] = { 0 };
    NebulaGlyph nebula[NEBULA_COUNT] = { 0 };
    Comet comets[COMET_COUNT] = { 0 };
    Laser lasers[MAX_LASERS] = { 0 };
    Particle particles[MAX_PARTICLES] = { 0 };

    InitBackground(stars, nebula, comets);

    Ship ship = {
        .position = (Vector2){ SCREEN_WIDTH*0.5f, SCREEN_HEIGHT*0.5f },
        .velocity = (Vector2){ 0.0f, 0.0f },
        .angle = -PI*0.5f,
        .shotCooldown = 0.0f
    };

    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        if (dt > 0.033f) dt = 0.033f;
        float time = GetTime();

        UpdateShip(&ship, lasers, particles, laserSound, dt);
        UpdateLasers(lasers, particles, dt);
        UpdateParticles(particles, dt);

        BeginDrawing();
        DrawBackground(stars, nebula, comets, font, time, dt);
        DrawLaserBeams(lasers);
        DrawParticles(particles, font);
        DrawShipAscii(&ship, font, time);
        DrawHud(font);
        EndDrawing();
    }

    UnloadSound(laserSound);
    CloseAudioDevice();
    CloseWindow();
    return 0;
}
