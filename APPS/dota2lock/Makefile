CC ?= gcc
PKG_CFLAGS := $(shell pkg-config --cflags gtk+-3.0 2>/dev/null)
PKG_LIBS := $(shell pkg-config --libs gtk+-3.0 2>/dev/null)
CFLAGS ?= -std=c11 -Wall -Wextra -Wpedantic -O2
CFLAGS += $(PKG_CFLAGS)
LDLIBS += $(PKG_LIBS)

BIN := dota2lock
SRC := src/main.c

.PHONY: all clean

all: $(BIN)

$(BIN): $(SRC)
	$(CC) $(CFLAGS) $(SRC) -o $(BIN) $(LDLIBS)

clean:
	rm -f $(BIN)
