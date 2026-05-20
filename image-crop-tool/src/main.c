#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "bmp.h"
#include "crop.h"

static void print_usage(const char *prog)
{
    fprintf(stderr, "Usage: %s <input.bmp> <output.bmp> <x> <y> <width> <height>\n", prog);
    fprintf(stderr, "Crop a BMP image to the specified region.\n");
}

int main(int argc, char *argv[])
{
    if (argc != 7) {
        print_usage(argv[0]);
        return 1;
    }

    const char *input_path = argv[1];
    const char *output_path = argv[2];

    char *endptr;
    int x = strtol(argv[3], &endptr, 10);
    if (*endptr != '\0') { fprintf(stderr, "Invalid x coordinate\n"); return 1; }
    int y = strtol(argv[4], &endptr, 10);
    if (*endptr != '\0') { fprintf(stderr, "Invalid y coordinate\n"); return 1; }
    int w = strtol(argv[5], &endptr, 10);
    if (*endptr != '\0') { fprintf(stderr, "Invalid width\n"); return 1; }
    int h = strtol(argv[6], &endptr, 10);
    if (*endptr != '\0') { fprintf(stderr, "Invalid height\n"); return 1; }

    BMPImage *src = bmp_read(input_path);
    if (!src) {
        fprintf(stderr, "Error: could not read '%s'\n", input_path);
        return 1;
    }

    BMPImage *dst = crop_image(src, x, y, w, h);
    if (!dst) {
        fprintf(stderr, "Error: invalid crop region (%d,%d,%d,%d) for image %dx%d\n",
                x, y, w, h, src->infoHeader.biWidth, abs(src->infoHeader.biHeight));
        bmp_free(src);
        return 1;
    }

    if (!bmp_write(output_path, dst)) {
        fprintf(stderr, "Error: could not write '%s'\n", output_path);
        bmp_free(src);
        bmp_free(dst);
        return 1;
    }

    printf("Cropped %dx%d region at (%d,%d) -> %s\n", w, h, x, y, output_path);

    bmp_free(src);
    bmp_free(dst);
    return 0;
}
