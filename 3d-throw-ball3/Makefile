CC ?= cc
PKG_CONFIG ?= pkg-config
TARGET ?= basketball_throw
SRC := main.c

CFLAGS ?= -std=c99 -Wall -Wextra -O2
RAYLIB_CFLAGS := $(shell $(PKG_CONFIG) --cflags raylib 2>/dev/null)
RAYLIB_LIBS := $(shell $(PKG_CONFIG) --libs raylib 2>/dev/null)

ifeq ($(strip $(RAYLIB_LIBS)),)
	RAYLIB_LIBS := -lraylib -lm -lpthread -ldl -lrt -lX11
endif

.PHONY: all clean run

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) $(RAYLIB_CFLAGS) -o $@ $< $(RAYLIB_LIBS)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
