/***********************************************************
 * Basketball Throw 3D — A Raylib Prototype
 *
 * Controls:
 *   Mouse        – Aim (crosshair follows cursor)
 *   Left Click   – Hold to charge power, release to throw
 *   R            – Reset ball
 *   ESC          – Quit
 ***********************************************************/

#include "raylib.h"
#include "raymath.h"
#include <math.h>
#include <stdio.h>

/* ── Configuration ─────────────────────────────────────── */
#define SCREEN_W    1280
#define SCREEN_H    720

#define GRAVITY     9.81f
#define BALL_RADIUS 0.12f

/* Hoop geometry */
#define RIM_RADIUS  0.225f      /* 45 cm diameter ring                */
#define RIM_Y       3.05f       /* standard rim height                */
#define RIM_Z       5.7f        /* rim-centre z                       */
#define RIM_TUBE_R  0.02f       /* tube radius of the rim             */

#define BB_Z        6.0f        /* backboard centre z                 */
#define BB_W        1.8f        /* backboard width                    */
#define BB_H        1.05f       /* backboard height                   */
#define BB_D        0.05f       /* backboard thickness                */

/* Throw parameters */
#define THROW_Y     1.8f        /* release height (chest level)       */
#define POWER_MIN   5.0f
#define POWER_MAX   15.0f
#define CHARGE_SPEED 6.0f       /* power units / second               */

/* Physics */
#define BOUNCE      0.5f
#define FRICTION    0.92f
#define STOP_VEL    0.1f
#define RESULT_TIME 2.0f

/* ── Types ─────────────────────────────────────────────── */
typedef enum { AIMING, CHARGING, FLYING, RESULT } State;

/* ── Globals ───────────────────────────────────────────── */
static Vector3  ballPos, ballVel, prevBallPos;
static float    ballSpin     = 0.0f;
static State    state        = AIMING;
static float    chargePower  = POWER_MIN;
static float    resultTimer  = 0.0f;
static int      score        = 0;
static int      attempts     = 0;
static bool     scoredShot   = false;
static Camera3D cam;

/* ── Forward declarations ──────────────────────────────── */
static void  Reset(void);
static void  GetAim(float *aH, float *aV);
static void  Throw(void);
static void  PhysicsStep(float dt);
static bool  ScoreCheck(void);
static void  Update(float dt);
static void  DrawTrajectory(void);
static void  DrawBall(void);
static void  DrawHoop(void);
static void  DrawCourt(void);
static void  DrawScene(void);
static void  DrawHUD(void);

/* ═══════════════════════════════════════════════════════ */
/*  MAIN                                                   */
/* ═══════════════════════════════════════════════════════ */
int main(void)
{
    InitWindow(SCREEN_W, SCREEN_H, "Basketball Throw 3D");
    SetTargetFPS(60);

    cam.position   = (Vector3){ 0.0f, 3.5f, -2.5f };
    cam.target     = (Vector3){ 0.0f, 2.5f,  5.0f };
    cam.up         = (Vector3){ 0.0f, 1.0f,  0.0f };
    cam.fovy       = 55.0f;
    cam.projection = CAMERA_PERSPECTIVE;

    Reset();

    while (!WindowShouldClose()) {
        Update(GetFrameTime());

        BeginDrawing();
            ClearBackground((Color){100, 160, 220, 255});   /* sky */
            BeginMode3D(cam);
                DrawScene();
            EndMode3D();
            DrawHUD();
        EndDrawing();
    }

    CloseWindow();
    return 0;
}

/* ═══════════════════════════════════════════════════════ */
/*  GAME LOGIC                                             */
/* ═══════════════════════════════════════════════════════ */
static void Reset(void)
{
    ballPos     = (Vector3){ 0.0f, THROW_Y, 0.0f };
    ballVel     = (Vector3){ 0.0f, 0.0f, 0.0f };
    prevBallPos = ballPos;
    chargePower = POWER_MIN;
    state       = AIMING;
    scoredShot  = false;
}

static void GetAim(float *aH, float *aV)
{
    Vector2 m  = GetMousePosition();
    float   mx = (m.x - SCREEN_W * 0.5f) / (SCREEN_W * 0.5f);
    float   my = (SCREEN_H * 0.5f - m.y) / (SCREEN_H * 0.5f);
    mx = Clamp(mx, -1.0f, 1.0f);
    my = Clamp(my, -1.0f, 1.0f);

    *aH = mx * 20.0f * DEG2RAD;                /* ±20° horizontal  */
    *aV = (50.0f + my * 20.0f) * DEG2RAD;      /* 30–70° vertical  */
}

static void Throw(void)
{
    float aH, aV;
    GetAim(&aH, &aV);

    ballVel.x = chargePower * sinf(aH) * cosf(aV);
    ballVel.y = chargePower * sinf(aV);
    ballVel.z = chargePower * cosf(aH) * cosf(aV);

    state = FLYING;
    attempts++;
}

/* ── Physics ───────────────────────────────────────────── */
static void PhysicsStep(float dt)
{
    prevBallPos = ballPos;

    /* gravity */
    ballVel.y -= GRAVITY * dt;

    /* integrate */
    ballPos.x += ballVel.x * dt;
    ballPos.y += ballVel.y * dt;
    ballPos.z += ballVel.z * dt;

    /* visual spin */
    ballSpin += Vector3Length(ballVel) * dt * 180.0f;

    /* ── floor ───────────────────────────────────────── */
    if (ballPos.y < BALL_RADIUS) {
        ballPos.y  = BALL_RADIUS;
        ballVel.y  = -ballVel.y * BOUNCE;
        ballVel.x *= FRICTION;
        ballVel.z *= FRICTION;
    }

    /* ── backboard ───────────────────────────────────── */
    if (ballPos.z >= BB_Z - BB_D * 0.5f - BALL_RADIUS &&
        ballPos.z <= BB_Z + BB_D * 0.5f + BALL_RADIUS)
    {
        float bbTop = RIM_Y + 0.45f + BB_H * 0.5f;
        float bbBot = RIM_Y + 0.45f - BB_H * 0.5f;
        if (ballPos.y > bbBot && ballPos.y < bbTop &&
            fabsf(ballPos.x) < BB_W * 0.5f)
        {
            ballPos.z = BB_Z - BB_D * 0.5f - BALL_RADIUS;
            ballVel.z = -fabsf(ballVel.z) * BOUNCE;
        }
    }

    /* ── rim (simplified torus collision) ────────────── */
    {
        float dx    = ballPos.x;
        float dz    = ballPos.z - RIM_Z;
        float hDist = sqrtf(dx * dx + dz * dz);
        float fromR = fabsf(hDist - RIM_RADIUS);
        float dy    = ballPos.y - RIM_Y;
        float dist  = sqrtf(fromR * fromR + dy * dy);

        if (dist < BALL_RADIUS + RIM_TUBE_R) {
            Vector3 rimPt;
            if (hDist > 0.001f) {
                rimPt = (Vector3){
                    (dx / hDist) * RIM_RADIUS,
                    RIM_Y,
                    RIM_Z + (dz / hDist) * RIM_RADIUS
                };
            } else {
                rimPt = (Vector3){ RIM_RADIUS, RIM_Y, RIM_Z };
            }

            Vector3 n   = Vector3Normalize(Vector3Subtract(ballPos, rimPt));
            float   dot = Vector3DotProduct(ballVel, n);
            if (dot < 0.0f) {
                ballVel = Vector3Subtract(ballVel,
                              Vector3Scale(n, 2.0f * dot));
                ballVel = Vector3Scale(ballVel, BOUNCE);
                ballPos = Vector3Add(rimPt,
                              Vector3Scale(n,
                                  BALL_RADIUS + RIM_TUBE_R + 0.005f));
            }
        }
    }

    /* ── scoring ─────────────────────────────────────── */
    if (!scoredShot && ScoreCheck()) {
        score++;
        scoredShot = true;
    }

    /* ── stopped / out-of-bounds → result ────────────── */
    bool stopped = (ballPos.y <= BALL_RADIUS + 0.05f &&
                    Vector3Length(ballVel) < STOP_VEL);
    bool oob     = (ballPos.z > BB_Z + 5.0f  ||
                    ballPos.z < -5.0f         ||
                    fabsf(ballPos.x) > 10.0f  ||
                    ballPos.y < -1.0f);

    if (stopped || oob) {
        state       = RESULT;
        resultTimer = RESULT_TIME;
    }
}

static bool ScoreCheck(void)
{
    /* ball crosses the rim plane from above */
    if (prevBallPos.y >= RIM_Y && ballPos.y < RIM_Y) {
        /* interpolate horizontal position at rim height */
        float t  = (prevBallPos.y - RIM_Y) /
                   (prevBallPos.y - ballPos.y);
        float ix = prevBallPos.x + t * (ballPos.x - prevBallPos.x);
        float iz = prevBallPos.z + t * (ballPos.z - prevBallPos.z);
        float d  = sqrtf(ix * ix + (iz - RIM_Z) * (iz - RIM_Z));
        return d < (RIM_RADIUS - BALL_RADIUS * 0.5f);
    }
    return false;
}

/* ── Main update ───────────────────────────────────────── */
static void Update(float dt)
{
    switch (state) {
    case AIMING:
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
            state       = CHARGING;
            chargePower = POWER_MIN;
        }
        break;

    case CHARGING:
        chargePower += CHARGE_SPEED * dt;
        if (chargePower > POWER_MAX) chargePower = POWER_MAX;
        if (IsMouseButtonReleased(MOUSE_BUTTON_LEFT))
            Throw();
        break;

    case FLYING:
        PhysicsStep(dt);
        break;

    case RESULT:
        resultTimer -= dt;
        if (resultTimer <= 0.0f ||
            IsMouseButtonPressed(MOUSE_BUTTON_LEFT) ||
            IsKeyPressed(KEY_R))
        {
            Reset();
        }
        break;
    }

    /* quick reset any time (except result, handled above) */
    if (state != RESULT && IsKeyPressed(KEY_R))
        Reset();
}

/* ═══════════════════════════════════════════════════════ */
/*  RENDERING                                              */
/* ═══════════════════════════════════════════════════════ */
static void DrawTrajectory(void)
{
    if (state != AIMING && state != CHARGING) return;

    float pw = (state == CHARGING)
             ? chargePower
             : (POWER_MIN + POWER_MAX) * 0.5f;
    float aH, aV;
    GetAim(&aH, &aV);

    Vector3 v = {
        pw * sinf(aH) * cosf(aV),
        pw * sinf(aV),
        pw * cosf(aH) * cosf(aV)
    };
    Vector3 p  = ballPos;
    float step = 0.04f;

    for (int i = 0; i < 80; i++) {
        v.y -= GRAVITY * step;
        p.x += v.x * step;
        p.y += v.y * step;
        p.z += v.z * step;
        if (p.y < 0.0f) break;

        unsigned char b = (unsigned char)(255 - i * 3);
        DrawSphere(p, 0.02f, (Color){ b, b, b, 255 });
    }
}

static void DrawBall(void)
{
    DrawSphere(ballPos, BALL_RADIUS, ORANGE);

    /* seam lines */
    DrawCircle3D(ballPos, BALL_RADIUS * 1.01f,
                 (Vector3){1, 0, 0}, ballSpin, DARKBROWN);
    DrawCircle3D(ballPos, BALL_RADIUS * 1.01f,
                 (Vector3){0, 0, 1}, ballSpin * 0.7f, DARKBROWN);
}

static void DrawHoop(void)
{
    /* ── pole ────────────────────────────────────────── */
    float poleTop = RIM_Y + 0.45f + BB_H * 0.5f;
    DrawCylinder((Vector3){ 0, 0, BB_Z + 0.05f },
                 0.06f, 0.06f, poleTop, 8, DARKGRAY);
    DrawCylinderWires((Vector3){ 0, 0, BB_Z + 0.05f },
                      0.06f, 0.06f, poleTop, 8, GRAY);

    /* ── backboard ───────────────────────────────────── */
    Vector3 bbPos = { 0.0f, RIM_Y + 0.45f, BB_Z };
    DrawCube(bbPos, BB_W, BB_H, BB_D,
             (Color){ 220, 220, 230, 255 });
    DrawCubeWires(bbPos, BB_W, BB_H, BB_D, DARKGRAY);

    /* target square on backboard */
    Vector3 sqPos = { 0.0f, RIM_Y + 0.45f, BB_Z - BB_D * 0.5f - 0.001f };
    DrawCube(sqPos, 0.59f, 0.45f, 0.001f,
             (Color){ 200, 200, 210, 255 });
    DrawCubeWires(sqPos, 0.6f, 0.45f, 0.002f, RED);

    /* ── rim (ring of small spheres) ─────────────────── */
    int seg = 24;
    for (int i = 0; i < seg; i++) {
        float a = (float)i / seg * PI * 2.0f;
        DrawSphere(
            (Vector3){ cosf(a) * RIM_RADIUS,
                       RIM_Y,
                       RIM_Z + sinf(a) * RIM_RADIUS },
            RIM_TUBE_R, RED);
    }

    /* ── net ─────────────────────────────────────────── */
    int   ns   = 12;
    float netH = 0.4f;
    /* vertical strings */
    for (int i = 0; i < ns; i++) {
        float a = (float)i / ns * PI * 2.0f;
        Vector3 top = { cosf(a) * RIM_RADIUS, RIM_Y,
                        RIM_Z + sinf(a) * RIM_RADIUS };
        Vector3 bot = { cosf(a) * RIM_RADIUS * 0.25f, RIM_Y - netH,
                        RIM_Z + sinf(a) * RIM_RADIUS * 0.25f };
        DrawLine3D(top, bot, WHITE);
    }
    /* horizontal rings */
    for (int r = 1; r <= 3; r++) {
        float t   = (float)r / 4.0f;
        float rad = RIM_RADIUS * (1.0f - t * 0.75f);
        float y   = RIM_Y - netH * t;
        for (int i = 0; i < ns; i++) {
            float a1 = (float)i       / ns * PI * 2.0f;
            float a2 = (float)(i + 1) / ns * PI * 2.0f;
            DrawLine3D(
                (Vector3){ cosf(a1) * rad, y,
                           RIM_Z + sinf(a1) * rad },
                (Vector3){ cosf(a2) * rad, y,
                           RIM_Z + sinf(a2) * rad },
                WHITE);
        }
    }

    /* ── bracket (rim → backboard) ───────────────────── */
    DrawLine3D((Vector3){ -0.15f, RIM_Y, RIM_Z + RIM_RADIUS },
               (Vector3){ -0.15f, RIM_Y, BB_Z - BB_D * 0.5f }, GRAY);
    DrawLine3D((Vector3){  0.15f, RIM_Y, RIM_Z + RIM_RADIUS },
               (Vector3){  0.15f, RIM_Y, BB_Z - BB_D * 0.5f }, GRAY);
}

static void DrawCourt(void)
{
    /* court floor (wood colour) */
    DrawPlane((Vector3){ 0, 0, 0 }, (Vector2){ 20, 16 },
              (Color){ 180, 120, 60, 255 });

    float ly = 0.01f;
    /* free-throw lane */
    DrawLine3D((Vector3){ -2.5f, ly, 0.0f },
               (Vector3){ -2.5f, ly, BB_Z }, WHITE);
    DrawLine3D((Vector3){  2.5f, ly, 0.0f },
               (Vector3){  2.5f, ly, BB_Z }, WHITE);
    DrawLine3D((Vector3){ -2.5f, ly, 4.2f },
               (Vector3){  2.5f, ly, 4.2f }, WHITE);

    /* free-throw half-circle */
    for (int i = 0; i < 24; i++) {
        float a1 = (float)i       / 24 * PI;
        float a2 = (float)(i + 1) / 24 * PI;
        DrawLine3D(
            (Vector3){ cosf(a1) * 1.8f, ly, 4.2f - sinf(a1) * 1.8f },
            (Vector3){ cosf(a2) * 1.8f, ly, 4.2f - sinf(a2) * 1.8f },
            WHITE);
    }
}

static void DrawScene(void)
{
    DrawCourt();
    DrawHoop();
    DrawBall();
    DrawTrajectory();
}

/* ── HUD ───────────────────────────────────────────────── */
static void DrawHUD(void)
{
    /* score */
    DrawText(TextFormat("Score: %d / %d", score, attempts),
             20, 20, 28, WHITE);

    if (attempts > 0) {
        float pct = (float)score / (float)attempts * 100.0f;
        DrawText(TextFormat("%.0f%%", pct), 20, 55, 22, LIGHTGRAY);
    }

    /* power bar (while charging) */
    if (state == CHARGING) {
        int   bx   = SCREEN_W - 60;
        int   by   = SCREEN_H / 2 - 120;
        int   bw   = 25;
        int   bh   = 240;
        float fill = (chargePower - POWER_MIN) / (POWER_MAX - POWER_MIN);

        DrawRectangle(bx - 2, by - 2, bw + 4, bh + 4,
                      (Color){ 0, 0, 0, 120 });
        DrawRectangle(bx, by, bw, bh, (Color){ 40, 40, 40, 200 });

        Color col = GREEN;
        if (fill > 0.5f) col = YELLOW;
        if (fill > 0.8f) col = RED;

        int fh = (int)(fill * bh);
        DrawRectangle(bx, by + bh - fh, bw, fh, col);
        DrawRectangleLines(bx, by, bw, bh, WHITE);
        DrawText("POWER", bx - 12, by + bh + 8, 16, WHITE);
    }

    /* crosshair (while aiming / charging) */
    if (state == AIMING || state == CHARGING) {
        Vector2 m  = GetMousePosition();
        int     mx = (int)m.x;
        int     my = (int)m.y;
        DrawLine(mx - 12, my, mx + 12, my, WHITE);
        DrawLine(mx, my - 12, mx, my + 12, WHITE);
        DrawCircleLines(mx, my, 18, WHITE);
    }

    /* instructions */
    if (state == AIMING) {
        const char *t1 = "Hold LEFT CLICK to charge, release to throw";
        const char *t2 = "Move mouse to aim  |  R = Reset";
        DrawText(t1, SCREEN_W / 2 - MeasureText(t1, 20) / 2,
                 SCREEN_H - 55, 20, WHITE);
        DrawText(t2, SCREEN_W / 2 - MeasureText(t2, 18) / 2,
                 SCREEN_H - 28, 18, (Color){ 200, 200, 200, 255 });
    }

    /* result messages */
    if (scoredShot) {
        const char *msg = "SCORE!";
        int w = MeasureText(msg, 64);
        /* drop shadow */
        DrawText(msg, SCREEN_W / 2 - w / 2 + 2,
                 SCREEN_H / 2 - 80 + 2, 64,
                 (Color){ 0, 80, 0, 255 });
        DrawText(msg, SCREEN_W / 2 - w / 2,
                 SCREEN_H / 2 - 80, 64, GREEN);
    }
    if (state == RESULT && !scoredShot) {
        const char *msg = "MISS!";
        int w = MeasureText(msg, 64);
        DrawText(msg, SCREEN_W / 2 - w / 2,
                 SCREEN_H / 2 - 80, 64, RED);
    }
    if (state == RESULT) {
        const char *r = "Click or R to try again";
        DrawText(r, SCREEN_W / 2 - MeasureText(r, 20) / 2,
                 SCREEN_H / 2, 20, WHITE);
    }

    DrawFPS(SCREEN_W - 90, 10);
}
