CC := cc
CFLAGS := -std=c99 -Wall -Wextra -pedantic -O2

RAYLIB_CFLAGS := $(shell pkg-config --cflags raylib 2>/dev/null)
RAYLIB_LIBS := $(shell pkg-config --libs raylib 2>/dev/null)

ifeq ($(strip $(RAYLIB_LIBS)),)
	RAYLIB_LIBS := -lraylib -lm -lpthread -ldl -lrt -lX11
endif

all: lesson_01 lesson_02 lesson_03

lesson_01: main.c
	$(CC) $(CFLAGS) $(RAYLIB_CFLAGS) main.c -o lesson_01 $(RAYLIB_LIBS)

lesson_02: lesson_02.c
	$(CC) $(CFLAGS) $(RAYLIB_CFLAGS) lesson_02.c -o lesson_02 $(RAYLIB_LIBS)

lesson_03: lesson_03.c
	$(CC) $(CFLAGS) $(RAYLIB_CFLAGS) lesson_03.c -o lesson_03 $(RAYLIB_LIBS)

.PHONY: all clean
clean:
	rm -f lesson_01 lesson_02 lesson_03
