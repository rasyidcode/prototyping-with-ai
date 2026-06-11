# Stickman Meme Boxing 3D

A 3D boxing game written in C and powered by Raylib, featuring procedural stickman skeletal animation, synthesized dynamic sound effects, and playable internet meme legends!

![Select Screen mock](assets/gigachad.png) *(Note: Opponents feature high-fidelity AI behaviors based on their actual meme personas)*

## Features

- **Procedural 3D Skeleton Rendering**: Stickmen characters are mathematically animated in real-time, resulting in fluid motions for idle stances, dodges, blocks, punches, hit recoils, and dramatic K.O. collapses.
- **Translucent Over-the-Shoulder View**: The player's stickman is rendered as a wireframe holographic skeleton so it doesn't obstruct the view of the opponent.
- **Dynamic Action Camera**: Features immersive details like subtle head bobbing, dramatic K.O. camera pans, screen shakes on heavy punches, and random crowd flashes.
- **Sound Synthesis Engine**: Programmatic retro arcade-style sound synthesis via raw wave buffer manipulation. No external `.wav` or `.ogg` audio files are required!
- **Meme Character Roster**: Play as or against 4 legends:
  - **John Cena**: Lightning-fast punches. Special ability: *YOU CAN'T SEE ME* (becomes semi-invisible and teleports to execute a rapid 3-hit combo).
  - **Gigachad**: The ultimate jawline. Special ability: *GIGA FURY* (glows gold, gains super armor/uninterruptible stance, infinite stamina, and double damage).
  - **Doge**: Much speed, very punch. Special ability: *SUCH FLURRY* (slows down time and unleashes a rapid 6-jab barrage).
  - **Pepe**: Feels bad counter-puncher. Special ability: *SAD TEAR-COUNTER* (sheds tears that slow down the opponent and sets a buffer to automatically block and counter for double damage).

## Controls

| Key / Input | Action | Description |
|---|---|---|
| **Left Click / J** | Left Hook/Jab | Quick strike using the left glove. Consumes stamina. |
| **Right Click / K** | Right Hook/Jab | Powerful strike using the right glove. Consumes stamina. |
| **Spacebar / S / Down Arrow** | Block | Puts both gloves up to cover the head. Reduces damage by 85%. |
| **A / Left Arrow** | Dodge Left | Leans character to the left to evade right punches. |
| **D / Right Arrow** | Dodge Right | Leans character to the right to evade left punches. |
| **F** | Activate Super Move | Triggers your character's unique meme ultimate when Rage reaches 100%. |
| **Enter / Left Click** | Rematch | Restart the match from the K.O. or Game Over screens. |

## How to Compile & Run

### Prerequisites
Make sure you have `raylib` and its development libraries installed.

### Build Instructions
Run the provided Makefile commands:

```bash
# To compile the game:
make

# To compile and run directly:
make run

# To clean build files:
make clean
```

The game compiles into a standalone binary named `stickman_boxing`.

## Gameplay Tips
- **Watch your Stamina**: Punching drains your stamina. When it hits 0, you become *Exhausted*, lowering your movement and preventing you from punching. Hold Block or stand idle to recover.
- **Timing is Everything**: Watch the opponent's gloves. If they throw a Left Jab, press **A** to dodge left. If they throw a Right Jab, press **D** to dodge right. Successful dodges prevent all damage and fill your Rage meter rapidly!
- **Build Rage**: Land hits or dodge strikes to fill your Rage meter. Once it hits 100, hit **F** immediately to unleash chaos!
