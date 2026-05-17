# Ncurses Practice Examples

This directory contains a series of progressive examples to help you learn the `ncurses` library in C.

## Examples

1.  **01_hello_world.c**: The basics of initializing `ncurses`, printing text, and shutting down.
2.  **02_user_input.c**: Handling keyboard input, specifically arrow keys, and moving a character around the screen.
3.  **03_windows.c**: Creating custom windows and drawing borders.
4.  **04_colors.c**: Using colors and text attributes (bold, reverse).

## How to Compile

Run `make` in this directory:

```bash
make
```

## How to Run

After compiling, you can run any of the examples:

```bash
./01_hello_world
./02_user_input
./03_windows
./04_colors
```

## Tips

- Use `man ncurses` for general documentation.
- Use `man <function_name>` (e.g., `man initscr`) for specific function details.
- Always remember to call `endwin()` before your program exits to restore the terminal state.
