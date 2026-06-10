CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O2

RAYLIB_DIR ?= /usr/local
RAYLIB_INCLUDE = -I$(RAYLIB_DIR)/include
RAYLIB_LIB = -L$(RAYLIB_DIR)/lib
RAYLIB_FLAGS = $(RAYLIB_INCLUDE) $(RAYLIB_LIB) -lraylib -lm -lpthread -ldl -lX11 -lXext -lXcursor -lXrandr -lXinerama -lXi

SRC_DIR = .
BUILD_DIR = build
TARGET = $(BUILD_DIR)/ball

SRCS = $(wildcard $(SRC_DIR)/*.c)
OBJS = $(SRCS:$(SRC_DIR)/%.c=$(BUILD_DIR)/%.o)

.PHONY: all clean run

all: $(TARGET)

$(TARGET): $(OBJS)
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(OBJS) -o $@ $(RAYLIB_FLAGS)

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $(RAYLIB_INCLUDE) -c $< -o $@

run: $(TARGET)
	./$(TARGET)

clean:
	rm -rf $(BUILD_DIR)
