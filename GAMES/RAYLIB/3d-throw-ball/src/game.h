#ifndef GAME_H
#define GAME_H

#include "raylib.h"
#include <stdbool.h>

// --- Tunables ----------------------------------------------------------------

// World layout
#define GROUND_SIZE        20.0f
#define GROUND_Y            0.0f

// Ball
#define BALL_RADIUS         0.25f
#define BALL_REST_Y         0.5f            // ball sits on a small pedestal

// Ring/hoop
#define RING_HEIGHT         3.0f
#define RING_RADIUS         0.6f
#define RING_DISTANCE       6.0f            // distance from ball in +Z
#define RING_THICKNESS      0.05f

// Physics
#define GRAVITY             9.81f
#define AIR_DRAG            0.05f           // 0 = none, 0.1 = heavy

// Aim
#define MAX_PULL            3.0f            // max drag distance
#define THROW_SPEED_SCALE   4.5f            // drag-to-velocity scale

// Scoring
#define SCORE_RING_HALF_THICK (RING_THICKNESS * 0.5f + BALL_RADIUS)
#define SCORE_RING_RADIUS    (RING_RADIUS - BALL_RADIUS)   // must pass through

// --- Game state --------------------------------------------------------------

typedef enum {
    GS_AIM,        // pull back to aim
    GS_FLYING,     // ball is in the air
    GS_SCORED,     // ball passed through the ring
    GS_MISSED,     // ball came to rest without scoring
} GameState;

typedef struct {
    Vector3 position;
    Vector3 velocity;
    bool    has_ball;     // only one ball in flight at a time
} Ball;

typedef struct {
    Camera3D camera;
    Ball     ball;
    Vector3  ball_start;          // where the ball spawns
    Vector3  ring_center;         // world center of the ring
    Vector3  aim_start;           // mouse-down pos on the ground plane
    Vector3  aim_pull;            // current pull vector
    bool     aim_active;          // mouse is held down
    int      score;
    int      shots;
    GameState state;
    double   state_time;          // time the current state was entered
} Game;

void game_init(Game *g);
void game_update(Game *g, float dt);
void game_draw(const Game *g);
void game_shutdown(Game *g);

#endif // GAME_H
