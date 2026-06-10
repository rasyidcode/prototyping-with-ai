CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -I/usr/local/include -O2
LDFLAGS = -L/usr/local/lib -lraylib -lGL -lm -lpthread -ldl -lrt -lX11

# Add standard X11 extensions to avoid linker errors on some Linux setups
EXT_LIBS = -lXrandr -lXinerama -lXi -lXcursor

TARGET = anger_room
SRCS = main.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(OBJS) -o $(TARGET) $(LDFLAGS) $(EXT_LIBS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

run: all
	./$(TARGET)

.PHONY: all clean run
