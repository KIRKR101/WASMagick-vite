# WASMagick

WASMagick is a client-side image converter, using magick-wasm.

## Current Features

### Export Settings
*   **Format Conversion**: Convert the output image to various formats.
    *   JPEG
    *   PNG
    *   WebP
    *   JXL (JPEG XL, incompatible on Chromium for now)
    *   AVIF
    *   GIF
    *   TIFF
*   **Quality**: Adjust the compression quality for lossy formats (like JPEG, WebP) on a scale of 1 to 100.
*   **Strip Metadata**: Remove EXIF and other metadata from the final image.

### Geometry
*   **Resize**: Change the image dimensions by specifying a target width and/or height. Aspect ratio is maintained if only one dimension is provided.
*   **Rotate**: Rotate the image by a fixed degree (90°, 180°, -90°).
*   **Flop**: Flip the image horizontally.
*   **Flip**: Flip the image vertically.
*   **Border**: Add a solid-color border with a configurable size and color.
*   **Extent (Canvas)**: Change the canvas size of the image. The original image can be positioned on the new canvas using a gravity setting (e.g., `Center`, `NorthWest`) and the background filled with a specified color.

### Color Adjustments
*   **Brightness**: Adjust the overall brightness of the image (0% to 200%).
*   **Saturation**: Adjust the color intensity of the image (0% to 300%).
*   **Hue**: Shift the colors of the image (0% to 200%).
*   **Contrast**: Increase or decrease the difference between light and dark areas (-100 to 100).
*   **Color Space Transformation**: Convert the image to different color spaces (RGB, Gray, CMYK, HSL, HSV, HWB, LAB).
*   **Normalize**: Automatically enhances contrast by stretching the range of intensity values.
*   **Auto Level**: Automatically adjusts image levels by scaling the minimum and maximum values to the full range.
*   **Auto Orient**: Automatically adjusts the image orientation based on its EXIF metadata.
*   **Levels**: Manually adjust the black point, white point, and gamma for fine-grained tonal correction. This can be applied to all channels or individually to Red, Green, Blue, or Alpha channels.
*   **Threshold**: Converts the image to a high-contrast, black-and-white image based on a specified brightness threshold. This can be applied to all channels or individually.

### Filters & Effects
*   **Blur**: Apply a Gaussian blur with a configurable radius.
*   **Sharpen**: Sharpen the image with a configurable intensity.
*   **Grayscale**: Convert the image to shades of gray.
*   **Sepia**: Apply a sepia tone effect with a configurable threshold.
*   **Charcoal**: Simulate a charcoal drawing effect.
*   **Negate (Invert)**: Invert the colors of the image.
*   **Edge Detect (Canny)**: Detect edges in the image using the Canny algorithm, with configurable strength, lower, and upper thresholds.
*   **Oil Paint**: Simulate an oil painting effect with a configurable brush radius.
*   **Solarize**: Create a photographic effect by inverting pixels that are brighter than a configurable threshold.
*   **Bilateral Blur**: Apply edge-preserving smoothing blur with configurable width, height, intensity sigma, and spatial sigma parameters.
