#ifndef DOWNLOADER_H
#define DOWNLOADER_H

#include <pthread.h>

typedef enum {
    DL_IDLE,
    DL_DOWNLOADING,
    DL_COMPLETED,
    DL_ERROR
} DownloadState;

typedef struct {
    DownloadState state;
    float progress;
    char url[2048];
    char status[256];
    char output_path[1024];
} DownloadJob;

typedef struct {
    DownloadJob job;
    pthread_t thread;
    pthread_mutex_t mutex;
    int running;
} Downloader;

void downloader_init(Downloader *d);
int downloader_start(Downloader *d, const char *url);
DownloadState downloader_get_info(Downloader *d, float *progress, char *status, int status_len, char *output, int output_len);
void downloader_cleanup(Downloader *d);

#endif
