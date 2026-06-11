#include "bmp.h"
#include <stdlib.h>
#include <string.h>

BMPImage *bmp_read(const char *filename)
{
    FILE *fp = fopen(filename, "rb");
    if (!fp) return NULL;

    BMPImage *img = calloc(1, sizeof(BMPImage));
    if (!img) { fclose(fp); return NULL; }

    if (fread(&img->fileHeader, sizeof(BMPFileHeader), 1, fp) != 1) goto fail;

    if (img->fileHeader.bfType != 0x4D42) goto fail;

    if (fread(&img->infoHeader, sizeof(BMPInfoHeader), 1, fp) != 1) goto fail;

    if (img->infoHeader.biSize != 40) goto fail;
    if (img->infoHeader.biCompression != 0) goto fail;
    if (img->infoHeader.biBitCount != 24 && img->infoHeader.biBitCount != 32) goto fail;

    int bpp = img->infoHeader.biBitCount;
    int width = img->infoHeader.biWidth;
    int abs_height = abs(img->infoHeader.biHeight);
    int row_size = ((bpp * width + 31) / 32) * 4;
    int data_size = row_size * abs_height;

    img->pixelData = malloc(data_size);
    if (!img->pixelData) goto fail;

    if (fseek(fp, img->fileHeader.bfOffBits, SEEK_SET) != 0) goto fail;

    if ((int)fread(img->pixelData, 1, data_size, fp) != data_size) goto fail;

    fclose(fp);
    return img;

fail:
    fclose(fp);
    bmp_free(img);
    return NULL;
}

int bmp_write(const char *filename, BMPImage *img)
{
    FILE *fp = fopen(filename, "wb");
    if (!fp) return 0;

    int bpp = img->infoHeader.biBitCount;
    int width = img->infoHeader.biWidth;
    int abs_height = abs(img->infoHeader.biHeight);
    int row_size = ((bpp * width + 31) / 32) * 4;
    int pixel_data_size = row_size * abs_height;

    img->fileHeader.bfSize = img->fileHeader.bfOffBits + pixel_data_size;
    img->infoHeader.biSizeImage = pixel_data_size;

    fwrite(&img->fileHeader, sizeof(BMPFileHeader), 1, fp);
    fwrite(&img->infoHeader, sizeof(BMPInfoHeader), 1, fp);

    fwrite(img->pixelData, 1, pixel_data_size, fp);

    fclose(fp);
    return 1;
}

void bmp_free(BMPImage *img)
{
    if (img) {
        free(img->pixelData);
        free(img);
    }
}
