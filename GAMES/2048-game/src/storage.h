#ifndef STORAGE_H
#define STORAGE_H

#include <stdbool.h>

typedef struct SaveData {
    int bestScore;
    int themeIndex;
} SaveData;

SaveData StorageLoad(void);
bool StorageSave(SaveData data);

#endif
