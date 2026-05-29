# Watermelon Game

A minimal Suika-style Watermelon Game prototype written in C with Raylib and Physac.

## Build

This assumes Raylib is already installed from source and available to the system compiler/linker.

```bash
gcc main.c -o watermelon -lraylib -lm -ldl -lpthread -lGL -lrt -lX11
./watermelon
```

If Raylib is installed in a non-standard path, add your include and library paths:

```bash
gcc main.c -o watermelon -I/path/to/raylib/src -L/path/to/raylib/src -lraylib -lm -ldl -lpthread -lGL -lrt -lX11
```

## Controls

- Move mouse: aim drop position
- Left click or Space: drop fruit
- R: restart
- Esc: quit
