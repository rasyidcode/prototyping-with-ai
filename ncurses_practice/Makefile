CC = gcc
CFLAGS = -Wall
LDFLAGS = -lncurses

SOURCES = $(wildcard *.c)
EXECUTABLES = $(SOURCES:.c=)

all: $(EXECUTABLES)

%: %.c
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS)

clean:
	rm -f $(EXECUTABLES)

.PHONY: all clean
