CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O2
LDFLAGS = -lraylib -lGL -lm -lpthread -ldl -lrt -lX11

OBJS = globals.o audio.o chat.o map.o textures.o main.o

all: spookstream

spookstream: $(OBJS)
	$(CC) $(CFLAGS) $(OBJS) -o spookstream $(LDFLAGS)

%.o: %.c common.h
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f spookstream $(OBJS)
