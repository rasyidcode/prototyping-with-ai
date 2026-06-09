CC := gcc
CFLAGS := -std=c99 -Wall -Wextra -pedantic -O2 -I/usr/local/include
LDFLAGS := -L/usr/local/lib -lraylib -lm -ldl -lpthread -lGL -lrt -lX11
TARGET := space_impact

.PHONY: all run clean

all: $(TARGET)

$(TARGET): main.c
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS)

run: $(TARGET)
	LD_LIBRARY_PATH=/usr/local/lib ./$(TARGET)

clean:
	rm -f $(TARGET)
