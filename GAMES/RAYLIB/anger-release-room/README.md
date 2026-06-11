# ⚡ ANGER SHATTERROOM ⚡

An immersive 3D clinical therapy sandbox built from scratch in **C** using **Raylib**. Release your internal anger by picking up, charging, and smashing cybernetic objects against the walls of a glowing neon chamber. 

---

## 🎨 Visual & Audio Design Aesthetics

The game uses a **high-fidelity retro-cyberpunk aesthetic** designed to wow the player immediately:
* **The Neon Chamber**: Dark slate floor with a glowing deep-blue grid, framed by neon pink warning bands and hazard columns.
* **Cohesive Neon styling**: All physics objects are rendered with dark inner structures encased in bright neon wire outlines (which glow **gold** when you're close enough to grab them).
* **Visceral Screen Shake**: Impacting walls with a high-power throw triggers a satisfying viewport screenshake proportional to the throw force.
* **Dynamic Rage Vignette**: A pulsing red border vignette encloses the screen when you're angry. As you release your anger and approach a state of calm, the red vignette shrinks and fades away.
* **3D Projected Floating Text**: Shattering items spawns floating 2D comic-style indicators (like `SMASH!`, `EXPLODE!`, or `TINK!`) in screen-space, floating up from the 3D impact coordinate.
* **Procedural Synthesized Sound Effects**: Built-in synth algorithms generate sound waves dynamically at startup! The game generates:
  * Glass clinks and shatters (Bottles & Mugs)
  * Heavy ceramic crashes (Plates)
  * Bass explosions with electrical static (CRT Monitors)
  * Futuristic bubbles (Item Spawns)
  * Mechanical charging hums that accelerate in pitch and tempo
  * A low-frequency sub-bass clinical room drone loop for atmosphere
  * A beautiful arpeggiated victory chime (Calm Success)

---

## 🕹️ Gameplay & Controls

* **W, A, S, D**: Walk around the room.
* **Mouse**: Look and aim.
* **E** or **Right Click**: Grab highlighted items when in range.
* **Q** or **E** (while holding): Drop the item gently on the floor.
* **Left Click (Hold)**: Charge your throwing power. A circular color-shifting HUD meter (green ➡️ yellow ➡️ red) will wrap around your reticle, and the object will shake violently in your hand.
* **Left Click (Release)**: Throw! The speed, damage, screenshake, sound volume, and debris shard count are determined by your charging time.
* **R**: Instantly restock the entire room (puffing cyan smoke particles and playing spawn sounds).
* **Escape**: Quit.

---

## 🛠️ Build & Run Instructions

Since Raylib is installed on your system, compilation is fully handled by the included `Makefile`.

### 1. Compile the Game
Open a terminal in the project directory and run:
```bash
make
```

### 2. Run the Game
Execute the compiled binary:
```bash
./anger_room
```
*(Or use `make run` to compile and launch in one command)*

### 3. Cleaning Build Artifacts
To delete compiled `.o` files and the executable:
```bash
make clean
```

---

## 📂 Project Architecture

* **[types.h](file:///home/rcd/My-Work/prototyping-with-ai/anger-release-room/types.h)**: Defines the structured datatypes (e.g., `BreakableObject`, `Debris` shards, `Particle` splashes, `Decal` markings, `SpawnSlot` tracking, and the global game states).
* **[main.c](file:///home/rcd/My-Work/prototyping-with-ai/anger-release-room/main.c)**: Contains the core game loop, camera movement with collision check, procedural audio synthesizer, physics calculations, and 3D drawing routines.
* **[Makefile](file:///home/rcd/My-Work/prototyping-with-ai/anger-release-room/Makefile)**: Handles build linking flags for standard Linux dependencies (`-lraylib`, `-lGL`, `-lm`, etc.).

---
*Created in pair programming with Antigravity.*
