CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -pedantic
SRCDIR = src
OBJDIR = obj
SRCS = $(SRCDIR)/main.c $(SRCDIR)/bmp.c $(SRCDIR)/crop.c
OBJS = $(SRCS:$(SRCDIR)/%.c=$(OBJDIR)/%.o)
TARGET = crop

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

$(OBJDIR)/%.o: $(SRCDIR)/%.c | $(OBJDIR)
	$(CC) $(CFLAGS) -c -o $@ $<

$(OBJDIR):
	mkdir -p $(OBJDIR)

clean:
	rm -rf $(OBJDIR) $(TARGET)
