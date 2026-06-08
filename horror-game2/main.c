/***********************************************************************************
 *
 *   SPECTRAL DESCENT — A 3D Reverse-Horror Prototype
 *
 *   You are the ghost. The investigator doesn't stand a chance.
 *
 *   Built with Raylib (https://www.raylib.com/)
 *   Compile: gcc main.c -o spectral -lraylib -lm -lpthread -ldl -lrt -lX11
 *
 ***********************************************************************************/

#include "raylib.h"
#include "raymath.h"
#include <stdio.h>
#include <math.h>

/* ═══════════════════════════════════════════════════════════════════════════════
 *  CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════════ */

#define SCREEN_WIDTH        1280
#define SCREEN_HEIGHT       720
#define TARGET_FPS          60

#define INTERACTION_RADIUS  3.0f    /* How close the ghost must be to interact   */
#define SCARE_RADIUS        6.0f    /* How close the human must be to get scared */
#define SANITY_DRAIN        25.0f   /* Sanity lost per successful scare          */
#define PANIC_THRESHOLD     40.0f   /* Sanity level that triggers panic          */
#define FLICKER_DURATION    2.0f    /* Seconds a haunted effect lasts            */

#define HUMAN_BASE_SPEED    2.0f    /* Normal walking speed                      */
#define HUMAN_PANIC_SPEED   4.0f    /* Panicked movement speed (2x)              */
#define WAYPOINT_TOLERANCE  0.5f    /* Distance to consider a waypoint "reached" */

#define NUM_WAYPOINTS       4
#define NUM_OBJECTS          2

/* ═══════════════════════════════════════════════════════════════════════════════
 *  ENUMERATIONS
 * ═══════════════════════════════════════════════════════════════════════════════ */

/* Top-level game state machine */
typedef enum {
    GAME_PLAYING,
    GAME_OVER
} GameState;

/* AI behavioral states for the human investigator */
typedef enum {
    AI_WANDERING,   /* Calmly patrolling waypoints                */
    AI_PANICKED,    /* Sanity < 40: erratic, moves at double speed */
    AI_FLED         /* Sanity == 0: the investigator has fled      */
} AIState;

/* Types of haunted objects the ghost can possess */
typedef enum {
    OBJECT_LAMP,
    OBJECT_TV
} ObjectType;

/* ═══════════════════════════════════════════════════════════════════════════════
 *  DATA STRUCTURES
 * ═══════════════════════════════════════════════════════════════════════════════ */

/* The human AI investigator */
typedef struct {
    Vector3 position;       /* Current world position               */
    float   sanity;         /* Mental fortitude, 100.0 → 0.0        */
    float   maxSpeed;       /* Current movement speed                */
    AIState state;          /* Behavioral state                      */
    int     waypointIndex;  /* Index of the current target waypoint  */
} Human;

/* An interactive haunted object in the environment */
typedef struct {
    Vector3    position;       /* World position of the object       */
    ObjectType type;           /* What kind of object this is        */
    bool       isActive;       /* Is the haunted effect active?      */
    float      activeTimer;    /* Countdown timer for the effect     */
    Color      baseColor;      /* Default color when dormant         */
    Color      activeColor;    /* Color when possessed/flickering    */
} HauntedObject;

/* ═══════════════════════════════════════════════════════════════════════════════
 *  ROOM / WAYPOINT LAYOUT
 *
 *  The floor plan is a cross-shaped arrangement of four rooms connected
 *  by a central corridor. Each waypoint sits at the center of a room.
 *
 *       [Room 2]
 *          |
 *  [Room 1]---+---[Room 3]
 *          |
 *       [Room 0]
 *
 * ═══════════════════════════════════════════════════════════════════════════════ */

static const Vector3 WAYPOINTS[NUM_WAYPOINTS] = {
    {  0.0f, 0.0f,  10.0f },   /* Room 0 — South room (start)     */
    {-10.0f, 0.0f,   0.0f },   /* Room 1 — West room              */
    {  0.0f, 0.0f, -10.0f },   /* Room 2 — North room             */
    { 10.0f, 0.0f,   0.0f },   /* Room 3 — East room              */
};

/* ═══════════════════════════════════════════════════════════════════════════════
 *  HELPER: Get a readable name for the AI state
 * ═══════════════════════════════════════════════════════════════════════════════ */
static const char *AIStateToString(AIState s)
{
    switch (s) {
        case AI_WANDERING: return "WANDERING";
        case AI_PANICKED:  return "PANICKED";
        case AI_FLED:      return "FLED";
        default:           return "UNKNOWN";
    }
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  DRAWING HELPERS — build the world from Raylib primitives
 * ═══════════════════════════════════════════════════════════════════════════════ */

/*
 * DrawRoom: renders a room as a wireframe cube outline with a solid floor slab.
 * The room is 8×4×8 units centered on `center` (Y is lifted so floor sits at y=0).
 */
static void DrawRoom(Vector3 center, Color wallColor)
{
    Vector3 roomPos = { center.x, 2.0f, center.z };

    /* Translucent floor slab */
    DrawCube(center, 8.0f, 0.05f, 8.0f, Fade(wallColor, 0.15f));

    /* Wireframe walls */
    DrawCubeWires(roomPos, 8.0f, 4.0f, 8.0f, wallColor);
}

/*
 * DrawCorridor: draws a narrow corridor connecting two rooms.
 * We approximate it with a thin floor strip and wireframe walls.
 */
static void DrawCorridor(Vector3 a, Vector3 b, Color color)
{
    Vector3 mid = Vector3Lerp(a, b, 0.5f);
    float dx = fabsf(b.x - a.x);
    float dz = fabsf(b.z - a.z);

    /* Corridor dimensions: 3 units wide, stretches between rooms */
    float sizeX = (dx > 0.1f) ? dx : 3.0f;
    float sizeZ = (dz > 0.1f) ? dz : 3.0f;

    DrawCube(mid, sizeX, 0.05f, sizeZ, Fade(color, 0.1f));
    DrawCubeWires((Vector3){ mid.x, 2.0f, mid.z }, sizeX, 4.0f, sizeZ, Fade(color, 0.4f));
}

/*
 * DrawLamp: a floor lamp made from a thin cylinder post topped with a sphere bulb.
 */
static void DrawLamp(Vector3 pos, Color color)
{
    /* Post */
    DrawCylinder(pos, 0.1f, 0.1f, 2.0f, 8, Fade(GRAY, 0.8f));

    /* Lamp shade (cone) */
    Vector3 shadePos = { pos.x, pos.y + 2.0f, pos.z };
    DrawCylinder(shadePos, 0.0f, 0.5f, 0.4f, 8, Fade(color, 0.7f));

    /* Light bulb */
    Vector3 bulbPos = { pos.x, pos.y + 2.2f, pos.z };
    DrawSphere(bulbPos, 0.15f, color);
}

/*
 * DrawTV: a television set made from a flat cube (screen) on a small stand.
 */
static void DrawTV(Vector3 pos, Color color)
{
    /* Stand */
    DrawCube(pos, 0.6f, 0.8f, 0.3f, DARKGRAY);

    /* Screen */
    Vector3 screenPos = { pos.x, pos.y + 1.2f, pos.z };
    DrawCube(screenPos, 1.6f, 1.0f, 0.1f, Fade(DARKGRAY, 0.9f));

    /* Screen glow / content */
    Vector3 glowPos = { pos.x, pos.y + 1.2f, pos.z + 0.06f };
    DrawCube(glowPos, 1.4f, 0.85f, 0.02f, color);
}

/*
 * DrawHumanInvestigator: the human is a colored cylinder (body) topped with
 * a sphere (head). A small cone indicates their facing direction.
 */
static void DrawHuman(Vector3 pos, AIState state)
{
    Color bodyColor;
    switch (state) {
        case AI_WANDERING: bodyColor = (Color){ 60, 140, 220, 255 }; break;  /* Blue  */
        case AI_PANICKED:  bodyColor = (Color){ 220, 100, 50, 255 };  break;  /* Orange */
        case AI_FLED:      bodyColor = (Color){ 100, 100, 100, 180 }; break;  /* Gray   */
        default:           bodyColor = BLUE; break;
    }

    /* Body cylinder */
    DrawCylinder(pos, 0.35f, 0.3f, 1.6f, 10, bodyColor);

    /* Head sphere */
    Vector3 headPos = { pos.x, pos.y + 1.9f, pos.z };
    DrawSphere(headPos, 0.25f, (Color){ 240, 200, 170, 255 });   /* Skin tone */

    /* Feet */
    DrawSphere((Vector3){ pos.x - 0.15f, pos.y, pos.z }, 0.12f, DARKBROWN);
    DrawSphere((Vector3){ pos.x + 0.15f, pos.y, pos.z }, 0.12f, DARKBROWN);
}

/*
 * DrawGhostParticles: subtle floating particles around the camera to remind
 * the player they are an ethereal entity. Uses sine waves for gentle bobbing.
 */
static void DrawGhostParticles(Vector3 camPos, float time)
{
    for (int i = 0; i < 6; i++) {
        float angle = (float)i * (360.0f / 6.0f) + time * 30.0f;
        float rad   = angle * DEG2RAD;
        float radius = 1.2f + 0.3f * sinf(time * 2.0f + (float)i);

        Vector3 p = {
            camPos.x + cosf(rad) * radius,
            camPos.y + 0.5f * sinf(time * 3.0f + (float)i * 1.5f),
            camPos.z + sinf(rad) * radius
        };

        float alpha = 0.15f + 0.1f * sinf(time * 4.0f + (float)i);
        DrawSphere(p, 0.04f, Fade(WHITE, alpha));
    }
}

/* ═══════════════════════════════════════════════════════════════════════════════
 *  MAIN ENTRY POINT
 * ═══════════════════════════════════════════════════════════════════════════════ */

int main(void)
{
    /* ─── Window Initialization ─────────────────────────────────────────── */
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "SPECTRAL DESCENT — Reverse Horror Prototype");
    SetTargetFPS(TARGET_FPS);
    DisableCursor();              /* Lock mouse for first-person camera control */

    /* ─── Ghost (Player Camera) Setup ───────────────────────────────────── */
    Camera3D camera = { 0 };
    camera.position   = (Vector3){ 0.0f, 2.0f, 12.0f };
    camera.target     = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.up         = (Vector3){ 0.0f, 1.0f, 0.0f };
    camera.fovy       = 60.0f;
    camera.projection = CAMERA_PERSPECTIVE;

    /* ─── Human Investigator Setup ──────────────────────────────────────── */
    Human human = {
        .position      = WAYPOINTS[0],
        .sanity        = 100.0f,
        .maxSpeed      = HUMAN_BASE_SPEED,
        .state         = AI_WANDERING,
        .waypointIndex = 0
    };

    /* ─── Haunted Objects Setup ─────────────────────────────────────────── */
    HauntedObject objects[NUM_OBJECTS] = {
        {
            .position    = { -8.0f, 0.0f, 0.0f },     /* West room — Lamp  */
            .type        = OBJECT_LAMP,
            .isActive    = false,
            .activeTimer = 0.0f,
            .baseColor   = (Color){ 180, 180, 120, 255 },  /* Warm off-white  */
            .activeColor = (Color){ 255, 80, 80, 255 }     /* Angry red glow  */
        },
        {
            .position    = { 8.0f, 0.0f, 0.0f },      /* East room — TV    */
            .type        = OBJECT_TV,
            .isActive    = false,
            .activeTimer = 0.0f,
            .baseColor   = (Color){ 40, 80, 120, 255 },    /* Dim blue screen */
            .activeColor = (Color){ 0, 255, 100, 255 }     /* Eerie green     */
        }
    };

    /* ─── Game State ────────────────────────────────────────────────────── */
    GameState gameState  = GAME_PLAYING;
    float     gameTime   = 0.0f;          /* Accumulated game time for animations */

    /* Text buffers for HUD */
    char sanityText[64];
    char stateText[64];
    char promptText[128];

    /* Track which object (if any) the ghost is close enough to interact with */
    int nearObjectIndex = -1;

    /* ═══════════════════════════════════════════════════════════════════════
     *  MAIN GAME LOOP
     * ═══════════════════════════════════════════════════════════════════════ */
    while (!WindowShouldClose())
    {
        float dt = GetFrameTime();
        gameTime += dt;

        /* ─────────────────────────────────────────────────────────────────
         *  UPDATE — PLAYING STATE
         * ───────────────────────────────────────────────────────────────── */
        if (gameState == GAME_PLAYING)
        {
            /* ── Update Ghost Camera (free-fly, no collision) ─────────── */
            UpdateCamera(&camera, CAMERA_FREE);

            /* ── Update Human AI ──────────────────────────────────────── */
            if (human.state != AI_FLED)
            {
                /* Determine current target waypoint */
                Vector3 target = WAYPOINTS[human.waypointIndex];

                /* Move towards the current waypoint */
                float speed = human.maxSpeed * dt;
                human.position = Vector3MoveTowards(human.position, target, speed);

                /* Check if we've arrived at the waypoint */
                float distToWP = Vector3Distance(human.position, target);
                if (distToWP < WAYPOINT_TOLERANCE)
                {
                    /* Advance to the next waypoint (loop around) */
                    human.waypointIndex = (human.waypointIndex + 1) % NUM_WAYPOINTS;
                }

                /* ── Sanity-based behavior transitions ────────────────── */
                if (human.sanity <= 0.0f)
                {
                    human.sanity = 0.0f;
                    human.state  = AI_FLED;
                    gameState    = GAME_OVER;   /* Victory! */
                }
                else if (human.sanity < PANIC_THRESHOLD && human.state == AI_WANDERING)
                {
                    human.state    = AI_PANICKED;
                    human.maxSpeed = HUMAN_PANIC_SPEED;
                }
            }

            /* ── Update Haunted Objects ───────────────────────────────── */
            nearObjectIndex = -1;

            for (int i = 0; i < NUM_OBJECTS; i++)
            {
                /* Tick down the active effect timer */
                if (objects[i].isActive)
                {
                    objects[i].activeTimer -= dt;
                    if (objects[i].activeTimer <= 0.0f)
                    {
                        objects[i].isActive    = false;
                        objects[i].activeTimer = 0.0f;
                    }
                }

                /* Check ghost proximity for interaction prompt */
                float ghostDist = Vector3Distance(camera.position, objects[i].position);
                if (ghostDist < INTERACTION_RADIUS && !objects[i].isActive)
                {
                    nearObjectIndex = i;
                }
            }

            /* ── Handle Interaction Input ─────────────────────────────── */
            if (nearObjectIndex >= 0 && IsKeyPressed(KEY_E))
            {
                int i = nearObjectIndex;

                /* Activate the haunted effect */
                objects[i].isActive    = true;
                objects[i].activeTimer = FLICKER_DURATION;

                /* Check if the human is close enough to be scared */
                float humanDist = Vector3Distance(human.position, objects[i].position);
                if (humanDist < SCARE_RADIUS && human.state != AI_FLED)
                {
                    human.sanity -= SANITY_DRAIN;
                    if (human.sanity < 0.0f) human.sanity = 0.0f;
                }
            }
        }

        /* ─────────────────────────────────────────────────────────────────
         *  RENDER
         * ───────────────────────────────────────────────────────────────── */
        BeginDrawing();
        ClearBackground((Color){ 10, 8, 18, 255 });   /* Deep midnight blue-black */

        if (gameState == GAME_PLAYING)
        {
            /* ── 3D WORLD ─────────────────────────────────────────────── */
            BeginMode3D(camera);

                /* Ground grid */
                DrawGrid(40, 1.0f);

                /* Draw the four rooms */
                DrawRoom(WAYPOINTS[0], (Color){ 60, 60, 80, 255 });
                DrawRoom(WAYPOINTS[1], (Color){ 80, 60, 60, 255 });
                DrawRoom(WAYPOINTS[2], (Color){ 60, 80, 60, 255 });
                DrawRoom(WAYPOINTS[3], (Color){ 80, 70, 50, 255 });

                /* Draw corridors connecting adjacent rooms through center */
                Vector3 center = { 0.0f, 0.0f, 0.0f };
                DrawCorridor(WAYPOINTS[0], center, (Color){ 50, 50, 70, 255 });
                DrawCorridor(WAYPOINTS[1], center, (Color){ 50, 50, 70, 255 });
                DrawCorridor(WAYPOINTS[2], center, (Color){ 50, 50, 70, 255 });
                DrawCorridor(WAYPOINTS[3], center, (Color){ 50, 50, 70, 255 });

                /* Draw Haunted Objects */
                for (int i = 0; i < NUM_OBJECTS; i++)
                {
                    Color drawColor = objects[i].isActive
                        ? objects[i].activeColor
                        : objects[i].baseColor;

                    /* If active, make the color pulse for a flickering effect */
                    if (objects[i].isActive)
                    {
                        float pulse = 0.6f + 0.4f * sinf(gameTime * 20.0f);
                        drawColor = Fade(drawColor, pulse);

                        /* Draw a glow sphere around the object */
                        DrawSphere(
                            (Vector3){ objects[i].position.x,
                                       objects[i].position.y + 1.0f,
                                       objects[i].position.z },
                            1.5f,
                            Fade(objects[i].activeColor, 0.08f)
                        );
                    }

                    if (objects[i].type == OBJECT_LAMP)
                    {
                        DrawLamp(objects[i].position, drawColor);
                    }
                    else if (objects[i].type == OBJECT_TV)
                    {
                        DrawTV(objects[i].position, drawColor);
                    }

                    /* Interaction radius indicator (subtle ring on the ground) */
                    DrawCircle3D(
                        objects[i].position,
                        INTERACTION_RADIUS,
                        (Vector3){ 1, 0, 0 }, 90.0f,
                        Fade(objects[i].baseColor, 0.1f)
                    );
                }

                /* Draw the Human Investigator */
                if (human.state != AI_FLED)
                {
                    DrawHuman(human.position, human.state);

                    /* Draw a subtle sanity indicator above the human's head */
                    float sanityRatio = human.sanity / 100.0f;
                    Color barColor = (human.state == AI_PANICKED)
                        ? (Color){ 255, 100, 50, 200 }
                        : (Color){ 50, 200, 100, 200 };

                    Vector3 barPos = { human.position.x - 0.5f,
                                       human.position.y + 2.5f,
                                       human.position.z };
                    DrawCube(barPos, sanityRatio * 1.0f, 0.08f, 0.08f, barColor);
                }

                /* Ghost particles around the camera */
                DrawGhostParticles(camera.position, gameTime);

                /* Waypoint markers (small dim spheres for debugging) */
                for (int i = 0; i < NUM_WAYPOINTS; i++)
                {
                    DrawSphere(
                        (Vector3){ WAYPOINTS[i].x, 0.1f, WAYPOINTS[i].z },
                        0.15f,
                        Fade(YELLOW, 0.2f)
                    );
                }

            EndMode3D();

            /* ── 2D HUD OVERLAY ───────────────────────────────────────── */

            /* Semi-transparent header bar */
            DrawRectangle(0, 0, SCREEN_WIDTH, 55, Fade(BLACK, 0.7f));
            DrawText("SPECTRAL DESCENT", 15, 15, 24, Fade(WHITE, 0.9f));

            /* Sanity readout */
            snprintf(sanityText, sizeof(sanityText), "Investigator Sanity: %.0f%%", human.sanity);
            Color sanityColor = (human.sanity > PANIC_THRESHOLD)
                ? (Color){ 100, 220, 140, 255 }
                : (Color){ 255, 90, 60, 255 };
            DrawText(sanityText, SCREEN_WIDTH - 320, 8, 20, sanityColor);

            /* AI State readout */
            snprintf(stateText, sizeof(stateText), "AI State: %s", AIStateToString(human.state));
            Color stateColor;
            switch (human.state) {
                case AI_WANDERING: stateColor = (Color){ 140, 180, 255, 255 }; break;
                case AI_PANICKED:  stateColor = (Color){ 255, 160, 60, 255 };  break;
                case AI_FLED:      stateColor = (Color){ 160, 160, 160, 255 }; break;
                default:           stateColor = WHITE; break;
            }
            DrawText(stateText, SCREEN_WIDTH - 320, 32, 18, stateColor);

            /* Sanity bar */
            int barX = 15, barY = 48;
            int barW = 200, barH = 6;
            DrawRectangle(barX, barY, barW, barH, Fade(DARKGRAY, 0.6f));
            DrawRectangle(barX, barY, (int)(barW * (human.sanity / 100.0f)), barH, sanityColor);

            /* Interaction prompt */
            if (nearObjectIndex >= 0)
            {
                const char *objName = (objects[nearObjectIndex].type == OBJECT_LAMP)
                    ? "Lamp" : "TV";
                const char *action  = (objects[nearObjectIndex].type == OBJECT_LAMP)
                    ? "Flicker" : "Possess";

                snprintf(promptText, sizeof(promptText),
                         "Press [E] to %s %s", action, objName);

                int textW = MeasureText(promptText, 24);
                int px = (SCREEN_WIDTH - textW) / 2;
                int py = SCREEN_HEIGHT / 2 + 60;

                /* Pulsing prompt background */
                float promptAlpha = 0.6f + 0.2f * sinf(gameTime * 5.0f);
                DrawRectangle(px - 12, py - 6, textW + 24, 36,
                              Fade(BLACK, promptAlpha));
                DrawRectangleLines(px - 12, py - 6, textW + 24, 36,
                                   Fade(WHITE, 0.4f));
                DrawText(promptText, px, py, 24, Fade(WHITE, 0.95f));
            }

            /* Object status indicators */
            for (int i = 0; i < NUM_OBJECTS; i++)
            {
                const char *name = (objects[i].type == OBJECT_LAMP) ? "LAMP" : "TV";
                const char *status = objects[i].isActive ? "ACTIVE" : "dormant";
                Color statusColor = objects[i].isActive
                    ? objects[i].activeColor : Fade(GRAY, 0.6f);

                char objStatus[64];
                snprintf(objStatus, sizeof(objStatus), "%s: %s", name, status);
                DrawText(objStatus, 15, 65 + i * 22, 16, statusColor);
            }

            /* Controls help — bottom of screen */
            DrawRectangle(0, SCREEN_HEIGHT - 45, SCREEN_WIDTH, 45, Fade(BLACK, 0.65f));
            DrawText("WASD: Float  |  Mouse: Look  |  E: Haunt Object  |  "
                     "Get close to objects, then haunt them when the investigator is near!",
                     15, SCREEN_HEIGHT - 32, 16, Fade(WHITE, 0.6f));

            /* Crosshair */
            int cx = SCREEN_WIDTH / 2;
            int cy = SCREEN_HEIGHT / 2;
            DrawLine(cx - 8, cy, cx + 8, cy, Fade(WHITE, 0.3f));
            DrawLine(cx, cy - 8, cx, cy + 8, Fade(WHITE, 0.3f));
        }
        else /* GAME_OVER */
        {
            /* ── Victory Screen ───────────────────────────────────────── */

            /* Animated background pulse */
            float pulse = 0.5f + 0.5f * sinf(gameTime * 2.0f);
            ClearBackground((Color){ (unsigned char)(10 + 20 * pulse),
                                     (unsigned char)(30 * pulse),
                                     (unsigned char)(15 + 10 * pulse), 255 });

            const char *victoryTitle = "THE INVESTIGATOR HAS FLED!";
            int titleW = MeasureText(victoryTitle, 48);
            DrawText(victoryTitle,
                     (SCREEN_WIDTH - titleW) / 2,
                     SCREEN_HEIGHT / 2 - 80,
                     48,
                     (Color){ 100, 255, 140, 255 });

            const char *victorySubtitle = "Victory! The house remains yours... forever.";
            int subW = MeasureText(victorySubtitle, 24);
            DrawText(victorySubtitle,
                     (SCREEN_WIDTH - subW) / 2,
                     SCREEN_HEIGHT / 2 - 20,
                     24,
                     Fade(WHITE, 0.8f));

            const char *restartMsg = "Press [R] to Haunt Again  |  Press [ESC] to Quit";
            int restartW = MeasureText(restartMsg, 20);
            DrawText(restartMsg,
                     (SCREEN_WIDTH - restartW) / 2,
                     SCREEN_HEIGHT / 2 + 40,
                     20,
                     Fade(WHITE, 0.5f + 0.3f * sinf(gameTime * 4.0f)));

            /* Handle restart */
            if (IsKeyPressed(KEY_R))
            {
                /* Reset all game state */
                human.position      = WAYPOINTS[0];
                human.sanity        = 100.0f;
                human.maxSpeed      = HUMAN_BASE_SPEED;
                human.state         = AI_WANDERING;
                human.waypointIndex = 0;

                for (int i = 0; i < NUM_OBJECTS; i++)
                {
                    objects[i].isActive    = false;
                    objects[i].activeTimer = 0.0f;
                }

                camera.position = (Vector3){ 0.0f, 2.0f, 12.0f };
                camera.target   = (Vector3){ 0.0f, 1.0f, 0.0f };

                gameState = GAME_PLAYING;
                gameTime  = 0.0f;
            }
        }

        EndDrawing();
    }

    /* ─── Cleanup ───────────────────────────────────────────────────────── */
    CloseWindow();
    return 0;
}
