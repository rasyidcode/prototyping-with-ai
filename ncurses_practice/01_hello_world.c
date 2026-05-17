#include <ncurses.h>

int main() {
    // Initialize ncurses
    initscr();
    
    // Print a string to the default window (stdscr)
    printw("Hello, ncurses! Press any key to exit...");
    
    // Refresh the screen to show the changes
    refresh();
    
    // Wait for user input before exiting
    getch();
    
    // End ncurses mode
    endwin();
    
    return 0;
}
