CC ?= cc
PKG_CONFIG ?= pkg-config

CFLAGS ?= -std=c99 -O2 -Wall -Wextra
RAYLIB_CFLAGS := $(shell $(PKG_CONFIG) --cflags raylib 2>/dev/null)
RAYLIB_LIBS := $(shell $(PKG_CONFIG) --libs raylib 2>/dev/null || echo "-lraylib -lm -lpthread -ldl -lrt -lX11")

TARGET := alien_ascii_ship
SRC := main.c

.PHONY: all run clean

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) $(RAYLIB_CFLAGS) -o $@ $< $(RAYLIB_LIBS)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
