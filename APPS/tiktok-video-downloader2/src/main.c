#include "raylib.h"
#define RAYGUI_IMPLEMENTATION
#include "raygui.h"
#include "downloader.h"
#include <string.h>

int main(void) {
    const int screenWidth = 640;
    const int screenHeight = 480;

    SetConfigFlags(FLAG_WINDOW_RESIZABLE);
    InitWindow(screenWidth, screenHeight, "TikTok Downloader");

    Downloader dl;
    downloader_init(&dl);

    char url[2048] = "";
    bool urlEditMode = false;

    SetTargetFPS(60);

    while (!WindowShouldClose()) {
        float progress = 0.0f;
        char status[256] = "";
        DownloadState state = downloader_get_info(&dl, &progress, status, sizeof(status), NULL, 0);
        bool downloading = (state == DL_DOWNLOADING);

        int sw = GetScreenWidth();

        int cx = sw / 2;
        int boxW = 400;
        int boxX = cx - boxW / 2;

        Rectangle urlBounds = { (float)boxX, 110, (float)boxW, 30 };
        Rectangle downloadBounds = { (float)(cx - 100), 170, 200, 40 };
        Rectangle progressBounds = { (float)boxX, 240, (float)boxW, 20 };

        BeginDrawing();
        ClearBackground((Color){ 30, 30, 35, 255 });

        const char *title = "TikTok Downloader";
        int titleW = MeasureText(title, 30);
        DrawText(title, cx - titleW / 2, 30, 30, RAYWHITE);

        GuiLabel((Rectangle){ (float)boxX, 85, 200, 20 }, "Video URL:");

        int urlLen = strlen(url);
        if (GuiTextBox(urlBounds, url, sizeof(url), urlEditMode))
            urlEditMode = !urlEditMode;

        if (urlLen == 0 && !urlEditMode) {
            DrawText("Paste TikTok URL here...",
                (int)urlBounds.x + 5, (int)urlBounds.y + 6, 20,
                (Color){ 150, 150, 150, 255 });
        }

        if (downloading) {
            GuiButton(downloadBounds, "Download");
        } else {
            if (GuiButton(downloadBounds, "Download")) {
                if (urlLen > 0) {
                    downloader_start(&dl, url);
                }
            }
        }

        GuiProgressBar(progressBounds, NULL, NULL, &progress, 0.0f, 1.0f);

        if (status[0] != '\0') {
            Color textColor = LIGHTGRAY;
            if (state == DL_COMPLETED) textColor = GREEN;
            else if (state == DL_ERROR) textColor = RED;
            else if (state == DL_DOWNLOADING) textColor = SKYBLUE;

            int textW = MeasureText(status, 20);
            DrawText(status, cx - textW / 2, 280, 20, textColor);
        }

        EndDrawing();
    }

    downloader_cleanup(&dl);
    CloseWindow();

    return 0;
}
