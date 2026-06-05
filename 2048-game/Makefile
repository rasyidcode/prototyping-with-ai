CC := cc
CFLAGS := -std=c99 -Wall -Wextra -pedantic -O2 -I/usr/local/include
TEST_CFLAGS := -std=c99 -Wall -Wextra -pedantic -O0 -g
LDFLAGS := -L/usr/local/lib
LDLIBS := -lraylib -lGL -lm -lpthread -ldl -lrt -lX11 -lXrandr -lXi -lXinerama -lXcursor

TARGET := 2048
TEST_TARGET := tests/test_game
SRC := src/main.c src/game.c src/storage.c
OBJ := $(SRC:.c=.o)

.PHONY: all run test clean

all: $(TARGET)

$(TARGET): $(OBJ)
	$(CC) $(OBJ) $(LDFLAGS) $(LDLIBS) -o $@

src/%.o: src/%.c src/game.h src/storage.h
	$(CC) $(CFLAGS) -c $< -o $@

$(TEST_TARGET): tests/test_game.c src/game.c src/game.h
	$(CC) $(TEST_CFLAGS) tests/test_game.c src/game.c -o $@

run: $(TARGET)
	./$(TARGET)

test: $(TEST_TARGET)
	./$(TEST_TARGET)

clean:
	rm -f $(TARGET) $(OBJ) $(TEST_TARGET)
