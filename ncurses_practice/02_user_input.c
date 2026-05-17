#include <ncurses.h>

int main() {
    int x = 10, y = 10;
    int ch;

    initscr();            // Start ncurses mode
    raw();                // Line buffering disabled
    keypad(stdscr, TRUE); // Enable arrow keys
    noecho();             // Don't echo() while we do getch
    curs_set(0);          // Hide cursor

    printw("Use arrow keys to move the '@'. Press 'q' to quit.");
    mvaddch(y, x, '@');
    refresh();

    while ((ch = getch()) != 'q') {
        // Clear previous position
        mvaddch(y, x, ' ');

        switch (ch) {
            case KEY_UP:
                if (y > 0) y--;
                break;
            case KEY_DOWN:
                if (y < LINES - 1) y++;
                break;
            case KEY_LEFT:
                if (x > 0) x--;
                break;
            case KEY_RIGHT:
                if (x < COLS - 1) x++;
                break;
        }

        mvaddch(y, x, '@');
        refresh();
    }

    endwin();
    return 0;
}
