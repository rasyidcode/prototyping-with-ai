# Session Summary: 1-Bit Starship Adventure

## Original Goal
Build a 1-bit 2D Raylib/C game about a starship in space fighting aliens.

## Chosen Direction
- Genre: side-scrolling shooter.
- Visual style: strict black/white only, using Raylib primitive drawing.
- Build setup: `Makefile` using an existing source-installed Raylib.
- Platform assumption: Linux.

## Initial Implementation
Created a playable single-file prototype with:
- 960x540 Raylib window.
- Starship movement with `WASD` or arrow keys.
- Shooting with `Space`.
- Aliens spawning from the right.
- Bullet/alien and player/alien collision.
- Score, lives, game over, and `Enter` restart.
- Starfield and particle bursts.

## Refactor and Wave Milestone
The game was then refactored into modules:
- `src/main.c`: Raylib setup and main loop.
- `src/game.c` / `src/game.h`: game state, update, draw, HUD, collisions, score/lives, restart.
- `src/entities.c` / `src/entities.h`: player, bullets, aliens, stars, particles, entity drawing and behavior.
- `src/waves.c` / `src/waves.h`: wave controller and scheduled enemy spawning.
- `src/config.h`: shared constants.

The `Makefile` now compiles all `src/*.c` files into `starship`.

## Current Enemy Types
- Scout: small, fast, 1 hit, 15 points.
- Fighter: baseline alien, 1 hit, 20 points.
- Drifter: sine/zig-zag movement, 1 hit, 25 points.
- Brute: large, slow, 3 hits, 60 points.

## Current Controls
- Move: `WASD` or arrow keys.
- Shoot: `Space`.
- Restart after game over: `Enter`.
- Quit: close window or `Esc`.

## Current Build Commands
```sh
make clean
make
make run
```

## Verified
`make clean && make` passed cleanly after the refactor.
