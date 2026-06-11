#ifndef GAME_H
#define GAME_H

#include "raylib.h"
#include "raymath.h"

#define MAP_WIDTH 24
#define MAP_HEIGHT 24
#define CELL_SIZE 4.0f

#define MAX_BULLETS 256
#define MAX_ENEMIES 64
#define MAX_PARTICLES 512

typedef enum {
    STATE_MENU,
    STATE_PLAYING,
    STATE_GAMEOVER,
    STATE_VICTORY,
    STATE_CONTROLS
} GameState;

typedef enum {
    WEAPON_PLASMA,
    WEAPON_SHOTGUN,
    WEAPON_COUNT
} WeaponType;

typedef struct {
    const char *name;
    int damage;
    float fireRate;     // Time between shots in seconds
    int maxClip;
    int clip;
    int maxReserve;
    int reserve;
    float reloadTime;   // In seconds
    float recoilIntensity;
    float range;
} Weapon;

typedef struct {
    Vector3 position;
    Vector3 velocity;
    float yaw;
    float pitch;
    float radius;
    float height;
    float speed;
    float jumpSpeed;
    float health;
    float maxHealth;
    bool isGrounded;
    
    // Weapon state
    Weapon weapons[WEAPON_COUNT];
    int currentWeapon;
    float fireCooldown;
    float reloadTimer;
    bool isReloading;
    
    // Camera settings
    Camera3D camera;
    float headBob;
    float weaponSwayX;
    float weaponSwayY;
    float recoilPitch;
    float recoilYaw;
    float screenShake;
} Player;

typedef enum {
    ENEMY_DRONE,   // Hovering shooter
    ENEMY_WALKER   // Ground rusher
} EnemyType;

typedef struct {
    EnemyType type;
    Vector3 position;
    Vector3 velocity;
    float radius;
    float height;
    float health;
    float maxHealth;
    float speed;
    float attackCooldown;
    bool active;
    int hitFlashTicks; // Visual flash when hit
} Enemy;

typedef struct {
    Vector3 position;
    Vector3 velocity;
    float radius;
    Color color;
    bool active;
    bool isPlayerOwned;
    int damage;
} Bullet;

typedef struct {
    Vector3 position;
    Vector3 velocity;
    Color color;
    float size;
    float life;
    float maxLife;
    bool active;
} Particle;

typedef enum {
    DROP_HEALTH,
    DROP_AMMO
} DropType;

typedef struct {
    DropType type;
    Vector3 position;
    float radius;
    float lifeTime;
    bool active;
} Drop;

#define MAX_DROPS 32

typedef struct {
    Vector3 position;
    char text[16];
    Color color;
    float lifeTime;
    float maxLife;
    bool active;
} FloatingText;

#define MAX_FLOATING_TEXTS 32

// Map representation
extern const int MAP_DATA[MAP_WIDTH * MAP_HEIGHT];

#endif // GAME_H

