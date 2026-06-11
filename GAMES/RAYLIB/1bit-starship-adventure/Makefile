CC := gcc
CFLAGS := -std=c99 -Wall -Wextra -pedantic -O2
LDFLAGS := -lraylib -lGL -lm -lpthread -ldl -lrt -lX11

TARGET := starship
SRC := $(wildcard src/*.c)

.PHONY: all run clean

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) -o $@ $(SRC) $(LDFLAGS)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
