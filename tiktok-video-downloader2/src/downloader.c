#include "downloader.h"
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/stat.h>

static void *download_thread_fn(void *arg) {
    Downloader *d = (Downloader *)arg;

    const char *home = getenv("HOME");
    if (!home) home = ".";

    char dir[1024];
    snprintf(dir, sizeof(dir), "%s/Videos/TikTok", home);
    mkdir(dir, 0755);

    char output_tpl[1024];
    snprintf(output_tpl, sizeof(output_tpl),
        "%s/Videos/TikTok/%%(title)s.%%(ext)s", home);

    char cmd[4096];
    snprintf(cmd, sizeof(cmd),
        "yt-dlp \"%s\" -o \"%s\" --no-playlist --newline 2>&1",
        d->job.url, output_tpl);

    FILE *pipe = popen(cmd, "r");
    if (!pipe) {
        pthread_mutex_lock(&d->mutex);
        d->job.state = DL_ERROR;
        snprintf(d->job.status, sizeof(d->job.status), "Failed to launch yt-dlp");
        d->job.progress = 0.0f;
        d->running = 0;
        pthread_mutex_unlock(&d->mutex);
        return NULL;
    }

    char line[4096];
    while (fgets(line, sizeof(line), pipe)) {
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r'))
            line[--len] = '\0';

        pthread_mutex_lock(&d->mutex);

        if (strncmp(line, "[download]", 10) == 0) {
            const char *p = line + 10;
            while (*p == ' ') p++;
            float pct;
            if (sscanf(p, "%f%%", &pct) == 1) {
                d->job.progress = pct / 100.0f;
                if (d->job.progress > 1.0f) d->job.progress = 1.0f;
            }
            snprintf(d->job.status, sizeof(d->job.status),
                "Downloading... %.0f%%", d->job.progress * 100);
        }

        char *dest_marker = strstr(line, "Destination: ");
        if (dest_marker) {
            dest_marker += 13;
            strncpy(d->job.output_path, dest_marker,
                sizeof(d->job.output_path) - 1);
            d->job.output_path[sizeof(d->job.output_path) - 1] = '\0';
        }

        if (strstr(line, "ERROR:") || strstr(line, "Error:")) {
            d->job.state = DL_ERROR;
            snprintf(d->job.status, sizeof(d->job.status), "%s", line);
        }

        pthread_mutex_unlock(&d->mutex);
    }

    int exit_code = pclose(pipe);

    pthread_mutex_lock(&d->mutex);
    if (d->job.state != DL_ERROR) {
        if (exit_code == 0) {
            d->job.state = DL_COMPLETED;
            d->job.progress = 1.0f;
            snprintf(d->job.status, sizeof(d->job.status), "Complete!");
        } else {
            d->job.state = DL_ERROR;
            snprintf(d->job.status, sizeof(d->job.status),
                "yt-dlp exited with code %d", exit_code);
        }
    }
    d->running = 0;
    pthread_mutex_unlock(&d->mutex);

    return NULL;
}

void downloader_init(Downloader *d) {
    d->job.state = DL_IDLE;
    d->job.progress = 0.0f;
    d->job.url[0] = '\0';
    d->job.status[0] = '\0';
    d->job.output_path[0] = '\0';
    d->running = 0;
    pthread_mutex_init(&d->mutex, NULL);
}

int downloader_start(Downloader *d, const char *url) {
    pthread_mutex_lock(&d->mutex);
    if (d->running) {
        pthread_mutex_unlock(&d->mutex);
        return -1;
    }
    d->job.state = DL_DOWNLOADING;
    d->job.progress = 0.0f;
    d->job.output_path[0] = '\0';
    snprintf(d->job.status, sizeof(d->job.status), "Starting...");
    strncpy(d->job.url, url, sizeof(d->job.url) - 1);
    d->job.url[sizeof(d->job.url) - 1] = '\0';
    d->running = 1;
    pthread_mutex_unlock(&d->mutex);

    if (pthread_create(&d->thread, NULL, download_thread_fn, d) != 0) {
        pthread_mutex_lock(&d->mutex);
        d->job.state = DL_ERROR;
        snprintf(d->job.status, sizeof(d->job.status), "Failed to create thread");
        d->running = 0;
        pthread_mutex_unlock(&d->mutex);
        return -1;
    }
    pthread_detach(d->thread);

    return 0;
}

DownloadState downloader_get_info(Downloader *d, float *progress, char *status, int status_len, char *output, int output_len) {
    pthread_mutex_lock(&d->mutex);
    DownloadState state = d->job.state;
    if (progress) *progress = d->job.progress;
    if (status && status_len > 0) {
        strncpy(status, d->job.status, status_len - 1);
        status[status_len - 1] = '\0';
    }
    if (output && output_len > 0) {
        strncpy(output, d->job.output_path, output_len - 1);
        output[output_len - 1] = '\0';
    }
    pthread_mutex_unlock(&d->mutex);
    return state;
}

void downloader_cleanup(Downloader *d) {
    pthread_mutex_destroy(&d->mutex);
}
