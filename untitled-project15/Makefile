CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O3
LIBS = -lraylib -lGL -lm -lpthread -ldl -lrt -lX11
SRC = src/main.c src/game.c src/physics.c src/particles.c src/renderer.c
OBJ = $(SRC:.c=.o)
TARGET = suika

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) $(SRC) -o $(TARGET) $(LIBS)

clean:
	rm -f $(TARGET) *.o

.PHONY: all clean
