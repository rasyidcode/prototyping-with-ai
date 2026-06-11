# Raw Conversation Transcript

## User
Let's make a 1-bit game using Raylib and C, the game is about starship on space fighting alien, it's a 2D game

## Assistant
I’ll inspect the current workspace first so the plan fits whatever is already here: project layout, build tooling, and whether Raylib is already wired in.

The workspace appears empty from `rg --files`, and `git status` shows no tracked changes. I’ll do one more shallow directory check and inspect whether there are hidden project files before locking the plan.

This is a blank project, so the key decisions are product choices rather than repo constraints. I need to pin down the game loop and distribution target so the implementation plan is concrete instead of a generic starter.

Asked:
- Which core 2D shooter format should the first version use?
- What should "1-bit" mean for the visual treatment?
- Which build setup should the plan target?

## User
Selected:
- Side-scroller
- Black/white only
- I already have raylib installed from source so just make a Makefile to compile it

## Assistant
Proposed plan:

# 1-Bit Starship Side-Scroller in C/Raylib

## Summary
Build a new blank Raylib C project for a strict black-and-white 2D side-scrolling shooter. The player controls a starship on the left side of space, shoots incoming aliens from the right, survives waves, and restarts after game over.

## Key Changes
- Add a `Makefile` that compiles the game with local/source-installed Raylib using `gcc`.
- Add `src/main.c` with the complete first playable game:
  - 960x540 window, fixed arcade-style update loop.
  - Player ship movement with keyboard controls.
  - Bullets fired horizontally.
  - Alien waves spawning from the right and moving left.
  - Collision handling for bullets vs aliens and aliens vs player.
  - Score, lives, game over, and restart flow.
- Use strict 1-bit rendering:
  - Only `BLACK` and `RAYWHITE`.
  - Pixel-like primitive art using rectangles/lines, no grayscale, no accent colors.
  - Starfield, ship, aliens, bullets, and explosions drawn as monochrome shapes.

## Controls
- Move: `WASD` or arrow keys.
- Shoot: `Space`.
- Restart after game over: `Enter`.
- Quit: window close or `Esc`.

## Build Interface
- `make` builds the executable.
- `make run` builds and launches it.
- `make clean` removes generated build output.
- Default executable name: `starship`.
- Raylib linker flags will be explicit in the `Makefile`, suitable for a source-installed Linux Raylib setup:
  `-lraylib -lGL -lm -lpthread -ldl -lrt -lX11`

## Test Plan
- Run `make` and confirm the project compiles cleanly.
- Run `make run` and verify:
  - Window opens.
  - Ship moves within bounds.
  - Bullets fire and disappear offscreen.
  - Aliens spawn, move, and collide correctly.
  - Score increments when aliens are destroyed.
  - Lives decrease on player collision.
  - Game over appears at zero lives.
  - `Enter` restarts the game state.

## Assumptions
- Target platform is Linux.
- Raylib headers and libraries are already installed in compiler/linker search paths from the user’s source install.
- First version is a single-player local arcade prototype, not a level editor or asset pipeline.

## User
Implement the plan.

## Assistant
Implemented the Raylib/C 1-bit side-scrolling shooter.

Added `Makefile`, `src/main.c`, and `.gitignore`. The game includes movement, shooting, alien spawning, collisions, lives, score, game over, restart, starfield, particles, and strict black/white primitive rendering.

Verified with:

```sh
make
```

It builds cleanly and produced `./starship`. Run it with:

```sh
make run
```

## User
What else to add on this game?

## Assistant
The current version is a solid arcade core: one alien type, one weapon, score/lives, particles, and restart. The best next additions are the ones that create decisions under pressure without breaking the simple 1-bit style.

My recommendation is to add features in this order:

1. Enemy variety: a fast scout, a tanky alien, and a zig-zag alien. This gives the game more depth without changing the whole architecture.
2. Powerups: rapid fire, double shot, shield, or repair. These make the player chase risk/reward moments.
3. Wave system: instead of pure random spawning, create timed waves with escalating patterns and small breaks.
4. Boss encounter: every few waves, spawn a larger alien with multiple hit points and a patterned attack.
5. Alien bullets: make some aliens fire back, turning it from target practice into a real shooter.
6. High score persistence: save best score to a tiny local file.
7. Juice polish: screen shake, hit freeze, player damage blink, better explosion particles, title/menu screen.
8. 1-bit art upgrade: make the ship and aliens more readable with pixel silhouettes, dithered exhaust, and animated frames while still using only black/white.

If I were picking the next milestone, I’d do enemy variety + wave system + powerups first. That gives the biggest gameplay improvement for the least code complexity.

Asked:
- Which feature pack should the next implementation plan focus on?
- How large should the next step be?

## User
Selected:
- Enemy waves
- Bigger refactor

## Assistant
Proposed plan:

# Enemy Waves Refactor

## Summary
Refactor the single-file prototype into a small multi-file Raylib C game and replace random alien spawning with structured enemy waves. Keep the strict black/white 1-bit style and current controls, while adding meaningful enemy variety and escalating pacing.

## Key Changes
- Split `src/main.c` into focused modules:
  - `main.c` owns Raylib setup and the frame loop.
  - `game.c/.h` owns game state, reset, update, draw, scoring, lives, and game-over flow.
  - `entities.c/.h` owns player, bullets, aliens, stars, particles, collisions, and drawing helpers.
  - `waves.c/.h` owns wave definitions, timing, spawn patterns, and difficulty progression.
- Update `Makefile` to compile all `src/*.c` files into `starship`.
- Add enemy types:
  - Scout: small, fast, low score, straight movement.
  - Fighter: current baseline alien, medium score.
  - Drifter: moves in a vertical sine/zig-zag pattern.
  - Brute: larger, slower, takes multiple hits, higher score.
- Add wave progression:
  - Waves spawn scripted groups instead of pure random aliens.
  - Short rest period between waves.
  - Wave number displayed in the HUD.
  - Difficulty increases by mixing tougher enemies, tighter spawn spacing, and faster movement.
- Preserve current core behavior:
  - `WASD`/arrows move, `Space` shoots, `Enter` restarts.
  - Lives decrease when enemies pass the player or collide with the ship.
  - Particles and starfield remain monochrome.

## Game Rules
- Start at wave 1 with simple fighter/scout groups.
- Every completed wave grants a small score bonus.
- Every third wave introduces more brutes/drifters.
- Game over still happens at zero lives.
- Restart resets score, lives, wave number, active entities, and timers.

## Test Plan
- Run `make clean && make` and confirm all modules compile cleanly.
- Run `make run` and verify:
  - Existing movement, shooting, collisions, score, lives, game over, and restart still work.
  - Enemies spawn in recognizable waves with breaks between them.
  - Each enemy type has distinct movement, size, durability, and score value.
  - Wave counter increments only after all scheduled and active enemies are cleared.
  - No active entity arrays overflow during dense waves.

## Assumptions
- Keep dependency setup unchanged: source-installed Raylib available to `gcc`.
- Keep all rendering primitive-based, with only `BLACK` and `RAYWHITE`.
- No powerups, boss fights, audio, or persistent high score in this milestone.

## User
Implement the plan.

## Assistant
Implemented the enemy waves refactor.

The project is now split into modules:

- `src/main.c` keeps only Raylib setup and the frame loop.
- `src/game.c` owns game state, update, draw, HUD, collisions, lives, score, and restart.
- `src/entities.c` owns bullets, aliens, stars, particles, player shape, and entity rendering.
- `src/waves.c` adds structured wave spawning and escalation.
- `src/config.h` centralizes screen/entity constants.

Gameplay additions include scouts, fighters, drifters, and brutes, wave breaks, a wave HUD counter, escalating spawn patterns, and multi-hit brutes.

Verified with:

```sh
make clean
make
```

Build passes cleanly. Run with:

```sh
make run
```

## User
does enemy shoot projectile?

## Assistant
Not yet. Enemies currently only move toward/through the player. Damage happens when an alien collides with the ship or passes off the left side.

The next good addition would be enemy projectiles:
- Add `EnemyBullet` array.
- Let fighters/drifters shoot left on a cooldown.
- Let brutes fire slower, larger shots.
- Player loses a life on projectile collision.
- Draw enemy bullets as white 1-bit rectangles or small diamonds.

## User
I feel like the game is hard right now, I can't pass the wave 3, don't modify anything, just tell me why this possibly happend

## Assistant
Likely reasons from the current logic:

- Wave 3 adds a brute early. Every third wave adds extra events: two scouts plus one brute. Brutes take 3 hits, move slower, and occupy more space, so they can block lanes while other aliens keep arriving.
- Difficulty scales enemy speed every wave. Every alien gets `+9 speed` per wave. By wave 3, all enemies are already moving faster than wave 1.
- Enemies are dense for the current fire rate. Shooting cooldown is `0.16s`, but wave events spawn around every `0.48s`. If you miss a few shots or focus a brute, smaller aliens can slip through.
- Passing aliens cost lives. You lose a life not only from collision, but also when an alien exits the left side. With only 3 lives, three missed enemies ends the run.
- Wave 3 has mixed pressure. Scouts are fast, fighters are baseline, and the brute needs sustained fire. That creates a target-priority problem before the game has given you upgrades or recovery.

So the main cause is probably: wave 3 introduces multi-hit enemies and extra spawns too early, while the player still has only one basic weapon and 3 lives.

## User
Save our conversation to Markdown files on this directory, so I can use later for reference on our next session

## Assistant
Saved the reference notes here:

- `docs/session-summary.md`
- `docs/design-notes.md`

They cover the project decisions, implemented architecture, controls, build commands, current enemy/wave behavior, why wave 3 may feel hard, and recommended next features.

## User
Add the raw transcript of our conversation as well
