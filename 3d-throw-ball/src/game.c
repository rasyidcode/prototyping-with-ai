#include "game.h"

// Raylib's vector math helpers (Vector3Add, Vector3Scale, ...). Including the
// header with no special define uses the default "inline" linkage, which is
// header-only and works fine alongside the prebuilt static libraylib.
#include "raymath.h"

#include <math.h>
#include <stdio.h>
#include <string.h>

// --- Helpers -----------------------------------------------------------------

static float v3_dot(Vector3 a, Vector3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

static float v3_len(Vector3 v) {
    return sqrtf(v3_dot(v, v));
}

static Vector3 v3_lerp(Vector3 a, Vector3 b, float t) {
    return (Vector3){
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        a.z + (b.z - a.z) * t,
    };
}

// Intersect a ray with the y=GROUND_Y plane. Returns t along the ray, or -1 if
// the ray is parallel to the plane or hits behind the origin.
static float ray_plane_y(Vector3 ro, Vector3 rd, float plane_y) {
    if (fabsf(rd.y) < 1e-6f) return -1.0f;
    float t = (plane_y - ro.y) / rd.y;
    return t > 0.0f ? t : -1.0f;
}

// Get a world-space point on the ground from the mouse cursor.
static Vector3 mouse_to_ground(Camera cam) {
    Ray ray = GetScreenToWorldRay(GetMousePosition(), cam);
    float t = ray_plane_y(ray.position, ray.direction, GROUND_Y);
    if (t < 0.0f) {
        return (Vector3){0};
    }
    return Vector3Add(ray.position, Vector3Scale(ray.direction, t));
}

// --- Camera (right-mouse orbit only, no built-in mode) -----------------------
// We avoid the built-in UpdateCamera so left mouse stays free for aiming.

static void update_camera(Camera *cam) {
    static float yaw = 0.0f;   // around Y, radians
    static float pitch = 0.35f;
    static float dist = 10.0f;
    static Vector3 target = {0.0f, 1.0f, 0.0f};

    if (IsMouseButtonDown(MOUSE_BUTTON_RIGHT)) {
        Vector2 d = GetMouseDelta();
        yaw   -= d.x * 0.005f;
        pitch -= d.y * 0.005f;
        if (pitch < 0.05f) pitch = 0.05f;
        if (pitch > 1.40f) pitch = 1.40f;
    }
    float wheel = GetMouseWheelMove();
    if (wheel != 0.0f) {
        dist -= wheel * 0.8f;
        if (dist < 3.0f)  dist = 3.0f;
        if (dist > 30.0f) dist = 30.0f;
    }

    cam->position.x = target.x + dist * cosf(pitch) * sinf(yaw);
    cam->position.y = target.y + dist * sinf(pitch);
    cam->position.z = target.z + dist * cosf(pitch) * cosf(yaw);
    cam->target   = target;
    cam->up       = (Vector3){0.0f, 1.0f, 0.0f};
    cam->fovy     = 60.0f;
    cam->projection = CAMERA_PERSPECTIVE;
}

// --- Ball reset / scoring ----------------------------------------------------

static void reset_ball(Game *g) {
    g->ball.position = g->ball_start;
    g->ball.velocity = (Vector3){0};
    g->ball.has_ball = true;
    g->state = GS_AIM;
    g->aim_active = false;
    g->aim_pull   = (Vector3){0};
    g->state_time = GetTime();
}

static void register_shot(Game *g) {
    g->shots++;
}

static void register_score(Game *g) {
    g->score++;
}

// --- Init / shutdown ---------------------------------------------------------

void game_init(Game *g) {
    memset(g, 0, sizeof(*g));

    g->ball_start  = (Vector3){0.0f, BALL_REST_Y, 0.0f};
    g->ring_center = (Vector3){0.0f, RING_HEIGHT, RING_DISTANCE};

    g->camera.position = (Vector3){0.0f, 6.0f, -7.0f};
    g->camera.target   = (Vector3){0.0f, 1.5f, RING_DISTANCE * 0.5f};
    g->camera.up       = (Vector3){0.0f, 1.0f, 0.0f};
    g->camera.fovy     = 60.0f;
    g->camera.projection = CAMERA_PERSPECTIVE;

    reset_ball(g);
}

void game_shutdown(Game *g) {
    (void)g;
}

// --- Scoring test ------------------------------------------------------------
// A score happens when the ball crosses the ring's z-plane inside the inner
// circle AND is moving through it (not grazing the rim from below).
//
// We track "last side" (z < center.z vs z >= center.z) so the score fires
// exactly once per crossing.

static void update_flight(Game *g, float dt) {
    Ball *b = &g->ball;

    // Apply gravity + light drag
    b->velocity.y -= GRAVITY * dt;
    float speed = v3_len(b->velocity);
    if (speed > 0.0f) {
        float drag_factor = 1.0f - AIR_DRAG * dt;
        if (drag_factor < 0.0f) drag_factor = 0.0f;
        b->velocity = Vector3Scale(b->velocity, drag_factor);
    }

    // Integrate
    b->position = Vector3Add(b->position, Vector3Scale(b->velocity, dt));

    // Ground bounce (very simple: stop on contact, no energy loss past 1)
    if (b->position.y - BALL_RADIUS < GROUND_Y) {
        b->position.y = GROUND_Y + BALL_RADIUS;
        if (b->velocity.y < 0.0f) b->velocity.y = -b->velocity.y * 0.45f;
        b->velocity.x *= 0.85f;
        b->velocity.z *= 0.85f;
        // Settle if nearly stopped
        if (v3_len(b->velocity) < 0.2f) {
            b->velocity = (Vector3){0};
        }
    }

    // Score check: did we cross the ring's z-plane from the back side?
    static bool last_was_before = true;
    bool now_after = b->position.z >= g->ring_center.z;
    if (last_was_before && now_after && b->has_ball) {
        // Inside inner radius in the xy plane?
        float dx = b->position.x - g->ring_center.x;
        float dy = b->position.y - g->ring_center.y;
        float horiz = sqrtf(dx * dx + dy * dy);
        if (horiz <= SCORE_RING_RADIUS) {
            // Also require moving through the ring (downward or forward, not up
            // past the top). Simplest: require y to be near ring plane.
            if (fabsf(b->position.y - g->ring_center.y) < SCORE_RING_HALF_THICK * 2.0f) {
                g->state = GS_SCORED;
                register_score(g);
                g->state_time = GetTime();
            }
        }
    }
    last_was_before = !now_after;

    // Miss check: ball has come to rest
    if (b->position.y <= GROUND_Y + BALL_RADIUS + 1e-3f &&
        v3_len(b->velocity) < 0.05f &&
        g->state == GS_FLYING) {
        g->state = GS_MISSED;
        g->state_time = GetTime();
    }
}

// --- Aim handling ------------------------------------------------------------

static void update_aim(Game *g) {
    if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        g->aim_active = true;
        g->aim_start = mouse_to_ground(g->camera);
    }
    if (g->aim_active) {
        Vector3 cur = mouse_to_ground(g->camera);
        Vector3 pull = Vector3Subtract(g->aim_start, cur);   // drag-away
        // Clamp magnitude
        float len = v3_len(pull);
        if (len > MAX_PULL) {
            pull = Vector3Scale(pull, MAX_PULL / len);
        }
        g->aim_pull = pull;
    }
    if (IsMouseButtonReleased(MOUSE_BUTTON_LEFT) && g->aim_active) {
        g->aim_active = false;
        // Throw in the direction of the pull, away from the player
        Vector3 v = g->aim_pull;
        // Make the throw mostly horizontal toward the ring (+Z)
        // Mix the user's drag direction with a forward bias so it's not too
        // punishing if they drag purely vertically.
        v = v3_lerp(v, (Vector3){0.0f, 0.0f, 1.0f}, 0.3f);
        // Scale by speed factor
        float mag = v3_len(v) / MAX_PULL;       // 0..1
        v = Vector3Scale(v, THROW_SPEED_SCALE * (0.4f + mag));
        // Always give an upward kick so the ball can arc
        v.y += THROW_SPEED_SCALE * 0.5f * (0.4f + mag);

        g->ball.velocity = v;
        register_shot(g);
        g->state = GS_FLYING;
        g->state_time = GetTime();
    }
}

// --- Per-frame update --------------------------------------------------------

void game_update(Game *g, float dt) {
    update_camera(&g->camera);

    if (g->state == GS_AIM) {
        update_aim(g);
    } else if (g->state == GS_FLYING) {
        update_flight(g, dt);
    } else {
        // GS_SCORED or GS_MISSED: hold for a moment, then reset
        if (GetTime() - g->state_time > 1.5) {
            reset_ball(g);
        }
        // Allow a manual reset anytime
        if (IsKeyPressed(KEY_R)) reset_ball(g);
    }

    if (IsKeyPressed(KEY_R) && g->state != GS_SCORED && g->state != GS_MISSED) {
        reset_ball(g);
    }
}

// --- Drawing -----------------------------------------------------------------

static void draw_ground(void) {
    // Subtle grid + big plane
    DrawPlane((Vector3){0, GROUND_Y, 0},
              (Vector2){GROUND_SIZE, GROUND_SIZE},
              (Color){30, 80, 50, 255});

    float step = 1.0f;
    Color line = (Color){0, 0, 0, 60};
    for (float i = -GROUND_SIZE / 2; i <= GROUND_SIZE / 2; i += step) {
        DrawLine3D((Vector3){i, GROUND_Y + 0.001f, -GROUND_SIZE / 2},
                   (Vector3){i, GROUND_Y + 0.001f,  GROUND_SIZE / 2},
                   line);
        DrawLine3D((Vector3){-GROUND_SIZE / 2, GROUND_Y + 0.001f, i},
                   (Vector3){ GROUND_SIZE / 2, GROUND_Y + 0.001f, i},
                   line);
    }
}

static void draw_hoop(Vector3 center) {
    // Draw a ring lying in a vertical plane facing the thrower.
    // DrawCircle3D draws a circle in a plane defined by a normal vector; the
    // normal (1,0,0) makes the circle lie in the YZ plane, which is what we
    // want for a hoop facing the -Z direction.
    DrawCircle3D(center, RING_RADIUS, (Vector3){1, 0, 0}, 90.0f,
                 (Color){230, 110, 30, 255});

    // Faint backboard plane behind the ring
    DrawCube((Vector3){center.x, center.y, center.z + 0.05f},
             1.6f, 1.0f, 0.05f, (Color){210, 210, 215, 220});
    // Pole holding it up
    DrawCube((Vector3){center.x, center.y * 0.5f, center.z + 0.05f},
             0.1f, center.y, 0.1f, (Color){150, 150, 160, 255});

    // Shadow circle on the ground for aim reference
    DrawCircle3D((Vector3){center.x, GROUND_Y + 0.01f, center.z},
                 RING_RADIUS, (Vector3){1, 0, 0}, 90.0f,
                 (Color){230, 110, 30, 80});
}

static void draw_aim_indicator(const Game *g) {
    if (!g->aim_active) return;
    Vector3 start = g->ball_start;
    Vector3 end   = Vector3Add(start, g->aim_pull);

    // Dashed look: line + spheres
    DrawLine3D(start, end, (Color){255, 230, 80, 255});
    DrawSphere(end, 0.08f, (Color){255, 230, 80, 200});
    DrawSphere(start, BALL_RADIUS * 0.9f, (Color){255, 230, 80, 120});
}

static void draw_hud(const Game *g) {
    char buf[128];
    snprintf(buf, sizeof(buf), "Score: %d   Shots: %d", g->score, g->shots);
    DrawText(buf, 10, 10, 22, RAYWHITE);

    const char *hint;
    Color hint_color;
    switch (g->state) {
        case GS_AIM:
            hint = "Hold LEFT mouse and drag back to aim. Release to throw. "
                   "RIGHT mouse to orbit. R to reset.";
            hint_color = (Color){200, 200, 200, 255};
            break;
        case GS_FLYING:
            hint = "Ball in flight...";
            hint_color = (Color){200, 200, 200, 255};
            break;
        case GS_SCORED:
            hint = "SCORE! Resetting...";
            hint_color = (Color){120, 230, 120, 255};
            break;
        case GS_MISSED:
            hint = "Missed. Press R or wait to reset.";
            hint_color = (Color){230, 120, 120, 255};
            break;
    }
    DrawText(hint, 10, 40, 18, hint_color);
}

void game_draw(const Game *g) {
    draw_ground();
    draw_hoop(g->ring_center);

    // Ball
    if (g->ball.has_ball) {
        DrawSphere(g->ball.position, BALL_RADIUS, (Color){220, 90, 50, 255});
    }

    // Aim arrow
    draw_aim_indicator(g);

    draw_hud(g);
}
