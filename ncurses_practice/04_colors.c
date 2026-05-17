#include <ncurses.h>

int main() {
    initscr();

    if (has_colors() == FALSE) {
        endwin();
        printf("Your terminal does not support color\n");
        return 1;
    }

    start_color(); // Start color functionality

    // Initialize color pairs: (pair_number, foreground, background)
    init_pair(1, COLOR_RED, COLOR_BLACK);
    init_pair(2, COLOR_GREEN, COLOR_BLACK);
    init_pair(3, COLOR_CYAN, COLOR_BLUE);

    attron(COLOR_PAIR(1));
    printw("This is red text on black background\n");
    attroff(COLOR_PAIR(1));

    attron(COLOR_PAIR(2) | A_BOLD);
    printw("This is bold green text\n");
    attroff(COLOR_PAIR(2) | A_BOLD);

    attron(COLOR_PAIR(3) | A_REVERSE);
    printw("This is reversed cyan/blue colors\n");
    attroff(COLOR_PAIR(3) | A_REVERSE);

    printw("\nPress any key to exit...");
    refresh();
    getch();

    endwin();
    return 0;
}
