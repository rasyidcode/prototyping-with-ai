CC      = gcc
CFLAGS  = -std=c99 -Wall -Wextra -O2 -D_GNU_SOURCE
RAYLIB_LIBS = -lraylib -lX11 -lXrandr -lXinerama -lXcursor -lXi -lGL -ldl
LDFLAGS = $(RAYLIB_LIBS) -lpthread -lm
OUT     = tiktok-dl
SRC     = src/main.c src/downloader.c

# Allow overriding raylib path: make RAYLIB_PATH=/path/to/raylib
ifdef RAYLIB_PATH
    CFLAGS  += -I$(RAYLIB_PATH)/include
    LDFLAGS := -L$(RAYLIB_PATH)/lib $(LDFLAGS)
else
    RAYLIB_CFLAGS = $(shell pkg-config --cflags raylib 2>/dev/null)
    ifneq ($(RAYLIB_CFLAGS),)
        CFLAGS  += $(RAYLIB_CFLAGS)
        LDFLAGS := $(shell pkg-config --libs raylib 2>/dev/null) -lpthread -lm
    endif
endif

all: $(OUT)

$(OUT): $(SRC) src/downloader.h
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

clean:
	rm -f $(OUT)

.PHONY: all clean
