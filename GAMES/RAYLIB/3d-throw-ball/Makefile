# Makefile for 3D throw-ball game using Raylib (C)
#
# Usage:
#   make            - build the game (debug)
#   make release    - optimized build
#   make run        - build and run
#   make clean      - remove build artifacts

# --- Toolchain ---------------------------------------------------------------
CC      ?= cc
RAYLIB  := /usr/local

# --- Flags -------------------------------------------------------------------
# CFLAGS_BASE: -Wall -Wextra -std=c11 -MMD -MP track headers, -O2 baseline
# PLATFORM_OS detection -> use the right link libs
CFLAGS_BASE := -std=c11 -Wall -Wextra -MMD -MP -O2 -DPLATFORM_DESKTOP \
               -I$(RAYLIB)/include

# Debug adds -g -O0
CFLAGS_DEBUG   := -g -O0 -DDEBUG
CFLAGS_RELEASE := -O2 -DNDEBUG

# Sources / objects
SRC_DIR  := src
OBJ_DIR  := build/obj
BIN_DIR  := build
TARGET   := $(BIN_DIR)/game

SRCS := $(wildcard $(SRC_DIR)/*.c)
OBJS := $(patsubst $(SRC_DIR)/%.c,$(OBJ_DIR)/%.o,$(SRCS))
DEPS := $(OBJS:.o=.d)

# --- Link libs (Linux) -------------------------------------------------------
# raylib needs: GL, X11, pthread, math, etc. Keep in sync if you build on
# macOS / Windows. Raylib provides these in its examples Makefile per-OS.
PLATFORM_OS := $(shell uname -s)
ifeq ($(PLATFORM_OS),Linux)
    LDFLAGS := -L$(RAYLIB)/lib
    LDLIBS  := $(RAYLIB)/lib/libraylib.a -lm -lpthread -ldl -lrt \
               -lX11 -lGL -lGLX
endif
ifeq ($(PLATFORM_OS),Darwin)
    LDFLAGS := -L$(RAYLIB)/lib
    LDLIBS  := $(RAYLIB)/lib/libraylib.a -framework OpenGL \
               -framework Cocoa -framework IOKit -framework CoreVideo \
               -framework CoreAudio -framework CoreFoundation
endif

# --- Build modes -------------------------------------------------------------
# Default: debug. Override with `make RELEASE=1` or `make release`.
ifeq ($(RELEASE),1)
    CFLAGS := $(CFLAGS_BASE) $(CFLAGS_RELEASE)
else
    CFLAGS := $(CFLAGS_BASE) $(CFLAGS_DEBUG)
endif

# --- Targets -----------------------------------------------------------------
.PHONY: all release run clean

all: $(TARGET)

# Explicit release alias
release:
	$(MAKE) RELEASE=1

$(TARGET): $(OBJS) | $(BIN_DIR)
	$(CC) $(OBJS) -o $@ $(LDFLAGS) $(LDLIBS)

$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c | $(OBJ_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(BIN_DIR) $(OBJ_DIR):
	mkdir -p $@

run: $(TARGET)
	./$(TARGET)

clean:
	rm -rf build

-include $(DEPS)
