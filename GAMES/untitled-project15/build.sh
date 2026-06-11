#!/bin/bash
# Stop script on first failure
set -e

echo "========================================="
echo "Building Suika Game Clone (C & Raylib)..."
echo "========================================="

# Compile using GCC with optimization and standard warnings
gcc -Wall -Wextra -std=c99 -O3 \
    src/main.c \
    src/game.c \
    src/physics.c \
    src/particles.c \
    src/renderer.c \
    -o suika \
    -lraylib -lGL -lm -lpthread -ldl -lrt -lX11

echo "Build successful! Run with: ./suika"
echo "========================================="
