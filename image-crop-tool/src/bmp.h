#ifndef BMP_H
#define BMP_H

#include <stdint.h>
#include <stdio.h>

#pragma pack(push, 1)
typedef struct {
    uint16_t bfType;
    uint32_t bfSize;
    uint16_t bfReserved1;
    uint16_t bfReserved2;
    uint32_t bfOffBits;
} BMPFileHeader;

typedef struct {
    uint32_t biSize;
    int32_t  biWidth;
    int32_t  biHeight;
    uint16_t biPlanes;
    uint16_t biBitCount;
    uint32_t biCompression;
    uint32_t biSizeImage;
    int32_t  biXPelsPerMeter;
    int32_t  biYPelsPerMeter;
    uint32_t biClrUsed;
    uint32_t biClrImportant;
} BMPInfoHeader;
#pragma pack(pop)

typedef struct {
    BMPFileHeader fileHeader;
    BMPInfoHeader infoHeader;
    uint8_t *pixelData;
} BMPImage;

BMPImage *bmp_read(const char *filename);
int bmp_write(const char *filename, BMPImage *img);
void bmp_free(BMPImage *img);

#endif
