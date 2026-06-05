#include "storage.h"

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>

#define SAVE_FILE_NAME "2048_save.txt"
#define SAVE_DIR_NAME "raylib-2048"
#define SAVE_VERSION 1
#define PATH_BUFFER_SIZE 1024

static bool EnsureDir(const char *path)
{
    if (mkdir(path, 0755) == 0 || errno == EEXIST) {
        return true;
    }

    return false;
}

static bool CopyString(char *destination, size_t size, const char *source)
{
    size_t length = strlen(source);

    if (length + 1 > size) {
        return false;
    }

    memcpy(destination, source, length + 1);
    return true;
}

static bool JoinPath(char *destination, size_t size, const char *left, const char *right)
{
    size_t leftLength = strlen(left);
    size_t rightLength = strlen(right);
    bool needsSlash = leftLength > 0 && left[leftLength - 1] != '/';
    size_t total = leftLength + (needsSlash ? 1U : 0U) + rightLength;

    if (total + 1 > size) {
        return false;
    }

    memcpy(destination, left, leftLength);
    if (needsSlash) {
        destination[leftLength] = '/';
        leftLength++;
    }
    memcpy(destination + leftLength, right, rightLength + 1);
    return true;
}

static const char *SavePath(void)
{
    static char path[PATH_BUFFER_SIZE];
    const char *xdgData = getenv("XDG_DATA_HOME");
    const char *home = getenv("HOME");

    if (xdgData != NULL && xdgData[0] != '\0') {
        char dir[PATH_BUFFER_SIZE];

        if (JoinPath(dir, sizeof(dir), xdgData, SAVE_DIR_NAME) &&
            EnsureDir(dir) &&
            JoinPath(path, sizeof(path), dir, SAVE_FILE_NAME)) {
            return path;
        }
    }

    if (home != NULL && home[0] != '\0') {
        char local[PATH_BUFFER_SIZE];
        char share[PATH_BUFFER_SIZE];
        char dir[PATH_BUFFER_SIZE];

        if (JoinPath(local, sizeof(local), home, ".local") &&
            JoinPath(share, sizeof(share), local, "share") &&
            JoinPath(dir, sizeof(dir), share, SAVE_DIR_NAME) &&
            EnsureDir(local) &&
            EnsureDir(share) &&
            EnsureDir(dir) &&
            JoinPath(path, sizeof(path), dir, SAVE_FILE_NAME)) {
            return path;
        }
    }

    CopyString(path, sizeof(path), SAVE_FILE_NAME);
    return path;
}

SaveData StorageLoad(void)
{
    SaveData data = { 0, 0 };
    int version = 0;
    FILE *file = fopen(SavePath(), "r");

    if (file == NULL) {
        return data;
    }

    if (fscanf(file, "version=%d\nbestScore=%d\nthemeIndex=%d\n",
               &version, &data.bestScore, &data.themeIndex) != 3 ||
        version != SAVE_VERSION ||
        data.bestScore < 0 ||
        data.themeIndex < 0) {
        data.bestScore = 0;
        data.themeIndex = 0;
    }

    fclose(file);
    return data;
}

bool StorageSave(SaveData data)
{
    FILE *file = fopen(SavePath(), "w");

    if (file == NULL) {
        return false;
    }

    bool ok = fprintf(file, "version=%d\nbestScore=%d\nthemeIndex=%d\n",
                      SAVE_VERSION, data.bestScore, data.themeIndex) > 0;

    fclose(file);
    return ok;
}
