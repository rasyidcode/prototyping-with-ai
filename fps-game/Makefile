CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O2 -I/usr/local/include
LDFLAGS = -L/usr/local/lib -lraylib -lGL -lm -lpthread -ldl -lrt -lX11

SRCS = main.c player.c enemy.c map.c particles.c sound_synth.c drops.c
OBJS = $(SRCS:.c=.o)
TARGET = neon_dread

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(OBJS) -o $(TARGET) $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: all clean
