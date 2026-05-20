#ifndef CROP_H
#define CROP_H

#include "bmp.h"

BMPImage *crop_image(BMPImage *src, int x, int y, int width, int height);

#endif
