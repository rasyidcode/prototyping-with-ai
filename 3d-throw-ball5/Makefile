CC = gcc
CFLAGS = -Wall -std=c99 -O2
LDFLAGS = -lraylib -lGL -lm -lpthread -ldl -lrt -lX11

TARGET = game
SRC = main.c

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(SRC) -o $(TARGET) $(CFLAGS) $(LDFLAGS)

clean:
	rm -f $(TARGET)

.PHONY: all clean
