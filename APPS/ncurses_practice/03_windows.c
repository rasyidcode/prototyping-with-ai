#include <ncurses.h>

int main() {
    WINDOW *my_win;
    int startx, starty, width, height;

    initscr();
    cbreak();             // Line buffering disabled, pass on everything to me
    keypad(stdscr, TRUE); // I need that nifty F1

    height = 10;
    width = 40;
    starty = (LINES - height) / 2; // Center vertically
    startx = (COLS - width) / 2;   // Center horizontally

    printw("Press 'q' to exit. Here is a window centered on the screen.");
    refresh();

    // Create the window
    my_win = newwin(height, width, starty, startx);
    box(my_win, 0, 0); // Draw a border
    mvwprintw(my_win, 1, 1, "This is a custom window!");
    wrefresh(my_win);

    while (getch() != 'q');

    // Clean up
    delwin(my_win);
    endwin();

    return 0;
}
