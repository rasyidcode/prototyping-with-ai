# Raylib 3D Beginner Lessons

These are tiny 3D programs for learning Raylib by doing.

## Lesson 01

The first lesson teaches the shape of a Raylib program:

1. create a window
2. create a 3D camera
3. update the camera each frame
4. draw simple 3D objects
5. close the window cleanly

```sh
make
./lesson_01
```

## Lesson 02

The second lesson introduces a player cube:

1. store the player position in a `Vector3`
2. read keyboard input
3. move the position using speed and frame time
4. draw the cube at the updated position

```sh
make
./lesson_02
```

## Lesson 03

The third lesson introduces basic collision:

1. create solid wall cubes
2. build `BoundingBox` values for the player and walls
3. calculate a possible next player position
4. reject that movement if the next box hits a wall

```sh
make
./lesson_03
```

If the build says `raylib.h` is missing, Raylib is not installed yet.

On Ubuntu, one common option is to build Raylib from source:

```sh
git clone https://github.com/raysan5/raylib.git
cd raylib/src
make PLATFORM=PLATFORM_DESKTOP
sudo make install
```

## Controls

Lesson 01:

- `W`, `A`, `S`, `D`: move camera
- mouse: look around
- `Esc`: quit

Lesson 02:

- `W`, `A`, `S`, `D`: move player cube
- `Esc`: quit

Lesson 03:

- `W`, `A`, `S`, `D`: move player cube
- arrow keys: also move player cube
- `Esc`: quit

## What To Study First

Open `main.c` and read it from top to bottom. The important idea is that 3D
in Raylib is still a normal game loop: update things, then draw things.

Then open `lesson_02.c`. The important idea is that a moving game object is
usually just data that changes every frame.

Then open `lesson_03.c`. The important idea is that collision usually checks a
possible future position before changing the real position.
