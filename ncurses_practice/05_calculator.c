#include <ncurses.h>
#include <stdlib.h>
#include <string.h>

void draw_calculator(WINDOW *win, const char *display) {
    werase(win);
    box(win, 0, 0);
    
    // Title
    mvwprintw(win, 0, 2, " Simple ncurses Calculator ");
    
    // Display area
    mvwprintw(win, 2, 2, "Expression: %s", display);
    
    // Instructions at the bottom
    mvwprintw(win, 4, 2, "Keys: [0-9] [+-*/] [Enter:=] [C:Clear] [Q:Quit]");
    
    wrefresh(win);
}

int main() {
    WINDOW *calc_win;
    int height = 7, width = 60;
    int starty, startx;
    int ch;
    char buffer[256] = "";

    initscr();            // Initialize ncurses
    cbreak();             // Disable line buffering
    noecho();             // Don't echo input
    keypad(stdscr, TRUE); // Enable special keys (Enter, etc)

    // Calculate center position
    starty = (LINES - height) / 2;
    startx = (COLS - width) / 2;

    calc_win = newwin(height, width, starty, startx);

    while (1) {
        draw_calculator(calc_win, buffer);
        ch = getch();

        if (ch == 'q' || ch == 'Q') {
            break;
        } else if (ch == 'c' || ch == 'C') {
            buffer[0] = '\0';
        } else if (ch >= '0' && ch <= '9') {
            int len = strlen(buffer);
            if (len < sizeof(buffer) - 1) {
                buffer[len] = ch;
                buffer[len + 1] = '\0';
            }
        } else if (ch == '+' || ch == '-' || ch == '*' || ch == '/') {
            int len = strlen(buffer);
            // Add spaces around operator for easier parsing with sscanf
            if (len > 0 && len < sizeof(buffer) - 4 && buffer[len-1] != ' ') {
                buffer[len] = ' ';
                buffer[len + 1] = ch;
                buffer[len + 2] = ' ';
                buffer[len + 3] = '\0';
            }
        } else if (ch == '\n' || ch == KEY_ENTER || ch == '=') {
            double n1, n2, result = 0;
            char op;
            
            // Try to parse: "num operator num"
            if (sscanf(buffer, "%lf %c %lf", &n1, &op, &n2) == 3) {
                switch (op) {
                    case '+': result = n1 + n2; break;
                    case '-': result = n1 - n2; break;
                    case '*': result = n1 * n2; break;
                    case '/': 
                        if (n2 != 0) result = n1 / n2;
                        else {
                            strcpy(buffer, "Error: Div by 0");
                            continue;
                        }
                        break;
                }
                // Update buffer with the result
                snprintf(buffer, sizeof(buffer), "%.2f", result);
            }
        }
    }

    // Clean up
    delwin(calc_win);
    endwin();

    return 0;
}
