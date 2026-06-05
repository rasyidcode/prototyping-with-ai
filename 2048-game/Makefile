CC := cc
CFLAGS := -std=c99 -Wall -Wextra -pedantic -O2 -I/usr/local/include
LDFLAGS := -L/usr/local/lib
LDLIBS := -lraylib -lGL -lm -lpthread -ldl -lrt -lX11 -lXrandr -lXi -lXinerama -lXcursor

TARGET := 2048
SRC := src/main.c src/game.c src/storage.c
OBJ := $(SRC:.c=.o)

.PHONY: all run clean

all: $(TARGET)

$(TARGET): $(OBJ)
	$(CC) $(OBJ) $(LDFLAGS) $(LDLIBS) -o $@

src/%.o: src/%.c src/game.h src/storage.h
	$(CC) $(CFLAGS) -c $< -o $@

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET) $(OBJ)
