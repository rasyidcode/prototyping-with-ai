CC := gcc

DEBUG_CFLAGS := -std=c99 -Wall -Wextra -pedantic -g -O0
# RELEASE_CFLAGS := -std=99 -Wall -Wextra -pedantic -O2
LDFLAGS := -lraylib -lGL -lm -lpthread -ldl -lrt -lX11

#BUILD_DIR := build
SRC ?=
#TARGET := $(BUILD_DIR)/$(basename $(notdir $(SRC)))
TARGET := $(basename $(notdir $(SRC)))

.PHONY: help check-src build run build-run clean

help:
	$(error Usage: make build|run|build-run file.c)

check-src:
ifeq ($(SRC),)
	$(error Usage: make build|run|build-run SRC=file.c)
endif

build: check-src $(TARGET)

run: check-src
	./$(TARGET)

build-run: check-src $(TARGET) 
	./$(TARGET)

$(TARGET): $(SRC)
# 	mkdir -p $(BUILD_DIR)
	$(CC) $(DEBUG_CFLAGS) -o $@ $< $(LDFLAGS)

clean:
#rm -rf $(BUILD_DIR)
	find . -maxdepth 1 -type f ! -name '*.c' ! -name 'Makefile' -delete
