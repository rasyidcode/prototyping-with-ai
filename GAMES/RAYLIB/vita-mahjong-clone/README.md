# Vita Mahjong Clone (C & Raylib)

A faithful recreation of **Vita Mahjong** written in C using **Raylib**. Designed with senior-friendly accessibility, calm aesthetics, high-contrast visual cues, and guaranteed solvable level generation.

---

## 🎮 Features

- **2.5D Isometric Stacking & Depth Sorting:** 5-layer 3D grid with drop shadows and perspective height layering.
- **Half-Grid Coordinate System:** 2x2 integer units per tile to handle overlapping pyramids and brick-stacking layouts.
- **Senior-Friendly High Legibility:**
  - Extra-large tiles with bold suit numbers and symbols.
  - **Locked Tile Dimming:** Tiles that cannot currently be clicked are dimmed out so players never get lost.
  - **Selected Glow:** Active selection glows golden and lifts upward.
- **Guaranteed Solvable Layout Generator:** Uses a reverse-play simulation algorithm to guarantee that generated boards always have at least one valid path to 100% completion.
- **Authentic Mahjong Solitaire Deck (144 Tiles):**
  - **Suits:** Dots (1-9), Bamboo (1-9), Characters (1-9)
  - **Honors:** Winds (East, South, West, North), Dragons (Red, Green, White)
  - **Bonus:** Flowers (Plum, Orchid, Chrysanthemum, Bamboo) & Seasons (Spring, Summer, Autumn, Winter) with category-wide matching.
- **Vita Boosters & Props:**
  - **Undo (`U`):** Unlimited undo stack.
  - **Hint (`H`):** Highlights an available matching pair.
  - **Shuffle (`S`):** Re-arranges remaining tiles.
  - **Deadlock Detection:** Automatically prompts when no moves are left.
- **Combos & Zen Atmosphere:** Ambient calming background, combo multiplier, and celebration particles.

---

## ⌨️ Controls & Shortcuts

| Action | Shortcut / Mouse |
| :--- | :--- |
| **Select / Match Tile** | Left Click on any unblocked tile |
| **Deselect** | Click the selected tile or empty space |
| **Undo Last Match** | `U` or `Ctrl + Z` |
| **Hint (Show Pair)** | `H` |
| **Shuffle Board** | `S` |
| **Restart / New Game** | `N` |
| **Pause Game** | `P` |

---

## 🛠️ How to Build and Run

### Prerequisites
Make sure Raylib is installed on your Linux system (`/usr/local/include` and `/usr/local/lib` or system packages).

### Build
```bash
make
```

### Run
```bash
make run
```
Or directly execute:
```bash
./bin/vita-mahjong
```

---

## 📂 Code Architecture

- [`src/tile.h`](src/tile.h) & [`src/tile.c`](src/tile.c): Tile data structures, suit categories, matching logic, and vector procedural face rendering with Raylib primitives.
- [`src/board.h`](src/board.h) & [`src/board.c`](src/board.c): Half-grid coordinate math, freedom/occlusion checking, 2.5D reverse-Z mouse picking, Shanghai Turtle layout, and reverse-play solvable generator.
- [`src/game.h`](src/game.h) & [`src/game.c`](src/game.c): Game state machine, undo stack, boosters (Hint/Shuffle), score/combo calculation, particle system, and HUD rendering.
- [`src/main.c`](src/main.c): Game entry point, window initialization, and main game loop.
