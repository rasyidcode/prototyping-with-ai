#include "crop.h"
#include <stdlib.h>
#include <string.h>

BMPImage *crop_image(BMPImage *src, int x, int y, int width, int height)
{
    int src_w = src->infoHeader.biWidth;
    int src_h = abs(src->infoHeader.biHeight);
    int bpp = src->infoHeader.biBitCount;
    int bpp_bytes = bpp / 8;

    if (x < 0 || y < 0 || width <= 0 || height <= 0 ||
        x + width > src_w || y + height > src_h) {
        return NULL;
    }

    BMPImage *dst = calloc(1, sizeof(BMPImage));
    if (!dst) return NULL;

    dst->fileHeader = src->fileHeader;
    dst->infoHeader = src->infoHeader;

    dst->infoHeader.biWidth = width;
    dst->infoHeader.biHeight = (src->infoHeader.biHeight < 0) ? -height : height;

    int src_row_size = ((bpp * src_w + 31) / 32) * 4;
    int dst_row_size = ((bpp * width + 31) / 32) * 4;
    int dst_data_size = dst_row_size * height;

    dst->pixelData = calloc(1, dst_data_size);
    if (!dst->pixelData) { free(dst); return NULL; }

    dst->fileHeader.bfOffBits = src->fileHeader.bfOffBits;
    dst->fileHeader.bfSize = dst->fileHeader.bfOffBits + dst_data_size;
    dst->infoHeader.biSizeImage = dst_data_size;

    int is_top_down = src->infoHeader.biHeight < 0;

    for (int row = 0; row < height; row++) {
        int src_row = is_top_down ? (y + row) : (src_h - 1 - (y + row));
        int dst_row = is_top_down ? row : (height - 1 - row);

        uint8_t *src_ptr = src->pixelData + src_row * src_row_size + x * bpp_bytes;
        uint8_t *dst_ptr = dst->pixelData + dst_row * dst_row_size;

        memcpy(dst_ptr, src_ptr, width * bpp_bytes);
    }

    return dst;
}
