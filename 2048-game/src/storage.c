#include "storage.h"

#include <stdio.h>

#define SAVE_PATH "2048_save.dat"
#define SAVE_VERSION 1

SaveData StorageLoad(void)
{
    SaveData data = { 0, 0 };
    int version = 0;
    FILE *file = fopen(SAVE_PATH, "rb");

    if (file == NULL) {
        return data;
    }

    if (fread(&version, sizeof(version), 1, file) != 1 ||
        version != SAVE_VERSION ||
        fread(&data, sizeof(data), 1, file) != 1 ||
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
    int version = SAVE_VERSION;
    FILE *file = fopen(SAVE_PATH, "wb");

    if (file == NULL) {
        return false;
    }

    bool ok = fwrite(&version, sizeof(version), 1, file) == 1 &&
              fwrite(&data, sizeof(data), 1, file) == 1;

    fclose(file);
    return ok;
}
