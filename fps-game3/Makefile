CC = gcc
CFLAGS = -Wall -std=c99 -O3
LIBS = -lraylib -lGL -lm -lpthread -ldl -lrt -lX11

all: game

game: main.c
	$(CC) $(CFLAGS) main.c -o game $(LIBS)

clean:
	rm -f game

.PHONY: all clean
