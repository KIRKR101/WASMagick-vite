import { ref, reactive } from 'vue';
import {
    ImageMagick,
    Magick,
    initializeImageMagick,
    MagickFormat,
    Percentage,
    MagickColor,
    Gravity,
    Channels,
    ColorSpace,
} from "@imagemagick/magick-wasm";

export function useMagick() {
    // --- State ---
    const wasmLoaded = ref(false);
    const isLoading = ref(false);
    const statsMessage = ref('Ready');
    
    // Image Data
    const sourceBytes = ref(null);
    const originalName = ref('image');
    const originalImageSize = ref(0);
    const originalImageUrl = ref(null);
    const processedImageUrl = ref(null);
    const processedImageFormat = ref(null);
    const processedImageName = ref(null);

    // Settings Grouped Reactive Object
    const settings = reactive({
        // Export
        imageFormat: 'WebP',
        quality: [85],
        stripMeta: true,
        
        // Geometry
        resizeW: null,
        resizeH: null,
        rotate: '0',
        flop: false,
        flip: false,
        borderColor: '#ffffff',
        borderSize: [0],
        extentW: null,
        extentH: null,
        extentGravity: 'Center',
        extentBgColor: '#ffffff',
        deskewThreshold: [0],
        deskewAutoCrop: true,
        
        // Color Adjust
        brightness: [100],
        saturation: [100],
        hue: [100],
        contrast: [0],
        normalizeImage: false,
        autoLevel: false,
        autoOrient: false,
        levelBlackpoint: [0],
        levelWhitepoint: [100],
        levelGamma: [1.0],
        levelChannels: 'All',
        thresholdPercentage: [50],
        thresholdChannels: 'All',
        sigmoidalContrast: [0],
        sigmoidalMidpoint: [50],
        sigmoidalChannels: 'All',
        colorSpace: 'RGB',
        
        // Filters & Effects
        effect: 'none',
        blur: [0],
        sharpen: [0],
        sepiaThreshold: [80],
        charcoalIntensity: [0],
        cannyEdgeStrength: [0],
        cannyEdgeLower: [10],
        cannyEdgeUpper: [30],
        oilpaintRadius: [0],
        solarizeFactor: [50],
        bilateralWidth: [0],
        bilateralHeight: [0],
        bilateralIntensitySigma: [1.5],
        bilateralSpatialSigma: [1],
    });

    // --- Helpers ---
    function hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.startsWith("#")) hex = hex.slice(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
        return { r, g, b };
    }

    // --- Actions ---

    async function initWasm(debugMode = false) {
        try {
            const response = await fetch('/magick.wasm');
            const wasmBytes = new Uint8Array(await response.arrayBuffer());
            await initializeImageMagick(wasmBytes);
            wasmLoaded.value = true;

            console.log('ImageMagick WASM loaded, Version:', Magick.imageMagickVersion);
            
            if (debugMode) {
                console.log('Debug mode enabled');
            }
        } catch (e) {
            statsMessage.value = "Error Loading WASM";
            console.error(e);
        }
    }

    // Reset Helpers
    function resetGeometry() {
        settings.resizeW = null;
        settings.resizeH = null;
        settings.rotate = '0';
        settings.flop = false;
        settings.flip = false;
        settings.borderColor = '#ffffff';
        settings.borderSize = [0];
        settings.extentW = null;
        settings.extentH = null;
        settings.extentGravity = 'Center';
        settings.extentBgColor = '#ffffff';
        settings.deskewThreshold = [0];
        settings.deskewAutoCrop = true;
    }

    function resetColor() {
        settings.brightness = [100];
        settings.saturation = [100];
        settings.hue = [100];
        settings.contrast = [0];
        settings.colorSpace = 'RGB';
        settings.normalizeImage = false;
        settings.autoLevel = false;
        settings.autoOrient = false;
        settings.levelBlackpoint = [0];
        settings.levelWhitepoint = [100];
        settings.levelGamma = [1.0];
        settings.levelChannels = 'All';
        settings.thresholdPercentage = [50];
        settings.thresholdChannels = 'All';
        settings.sigmoidalContrast = [0];
        settings.sigmoidalMidpoint = [50];
        settings.sigmoidalChannels = 'All';
    }

    function resetFilters() {
        settings.effect = 'none';
        settings.blur = [0];
        settings.sharpen = [0];
        settings.sepiaThreshold = [80];
        settings.charcoalIntensity = [0];
        settings.cannyEdgeStrength = [0];
        settings.cannyEdgeLower = [10];
        settings.cannyEdgeUpper = [30];
        settings.oilpaintRadius = [0];
        settings.solarizeFactor = [50];
        settings.bilateralWidth = [0];
        settings.bilateralHeight = [0];
        settings.bilateralIntensitySigma = [1.5];
        settings.bilateralSpatialSigma = [1];
    }

    function resetExport() {
        settings.imageFormat = 'WebP';
        settings.quality = [85];
        settings.stripMeta = true;
    }

    function resetSettings() {
        settings.imageFormat = 'WebP';
        settings.quality = [85];
        settings.stripMeta = true;
        resetGeometry();
        resetColor();
        resetFilters();
    }

    async function setSourceFile(file) {
        if (!file) return;
        originalName.value = file.name;
        const buffer = await file.arrayBuffer();
        sourceBytes.value = new Uint8Array(buffer);
        originalImageSize.value = sourceBytes.value.length;

        if (originalImageUrl.value) URL.revokeObjectURL(originalImageUrl.value);
        originalImageUrl.value = URL.createObjectURL(new Blob([sourceBytes.value]));
        
        // Reset processed
        if (processedImageUrl.value) URL.revokeObjectURL(processedImageUrl.value);
        processedImageUrl.value = null;
        processedImageFormat.value = null;
        processedImageName.value = null;
        
        statsMessage.value = "Ready";
        return true; // Signal success to trigger fitToScreen
    }

    function clearSource() {
        sourceBytes.value = null;
        if (originalImageUrl.value) URL.revokeObjectURL(originalImageUrl.value);
        originalImageUrl.value = null;
        if (processedImageUrl.value) URL.revokeObjectURL(processedImageUrl.value);
        processedImageUrl.value = null;
        processedImageFormat.value = null;
        processedImageName.value = null;
        statsMessage.value = "Ready";
    }

    function processImage(debugMode = false, onComplete) {
        if (!sourceBytes.value) {
            alert("Please upload an image first.");
            return;
        }

        isLoading.value = true;
        setTimeout(() => {
            const startTime = performance.now();
            const appliedOptions = {};

            try {
                ImageMagick.read(sourceBytes.value, (image) => {
                    // Geometry
                    if (settings.resizeW > 0 || settings.resizeH > 0) {
                        image.resize(settings.resizeW || 0, settings.resizeH || 0);
                        appliedOptions.resize = { width: settings.resizeW, height: settings.resizeH };
                    }
                    if (parseInt(settings.rotate) !== 0) {
                        image.rotate(parseInt(settings.rotate));
                        appliedOptions.rotate = parseInt(settings.rotate);
                    }
                    if (settings.flop) {
                        image.flop();
                        appliedOptions.flop = true;
                    }
                    if (settings.flip) {
                        image.flip();
                        appliedOptions.flip = true;
                    }
                    if (settings.borderSize[0] > 0) {
                        const { r, g, b } = hexToRgb(settings.borderColor);
                        image.borderColor = new MagickColor(r, g, b);
                        image.border(settings.borderSize[0]);
                        appliedOptions.border = { size: settings.borderSize[0], color: settings.borderColor };
                    }
                    if (settings.extentW > 0 || settings.extentH > 0) {
                        const { r, g, b } = hexToRgb(settings.extentBgColor);
                        image.backgroundColor = new MagickColor(r, g, b);
                        image.extent(settings.extentW, settings.extentH, Gravity[settings.extentGravity]);
                        appliedOptions.extent = { width: settings.extentW, height: settings.extentH, gravity: settings.extentGravity, bg: settings.extentBgColor };
                    }
                    if (settings.deskewThreshold[0] > 0) {
                        const angle = image.deskew(new Percentage(settings.deskewThreshold[0]), settings.deskewAutoCrop);
                        appliedOptions.deskew = { threshold: settings.deskewThreshold[0], autoCrop: settings.deskewAutoCrop, detectedAngle: angle };
                    }

                    // Color
                    if (settings.brightness[0] !== 100 || settings.saturation[0] !== 100 || settings.hue[0] !== 100) {
                        image.modulate(new Percentage(settings.brightness[0]), new Percentage(settings.saturation[0]), new Percentage(settings.hue[0]));
                        appliedOptions.modulate = { brightness: settings.brightness[0], saturation: settings.saturation[0], hue: settings.hue[0] };
                    }
                    if (settings.contrast[0] !== 0) {
                        image.brightnessContrast(new Percentage(0), new Percentage(settings.contrast[0]));
                        appliedOptions.contrast = settings.contrast[0];
                    }
                    if (settings.normalizeImage) {
                        image.normalize();
                        appliedOptions.normalize = true;
                    }
                    if (settings.autoLevel) {
                        image.autoLevel();
                        appliedOptions.autoLevel = true;
                    }
                    if (settings.autoOrient) {
                        image.autoOrient();
                        appliedOptions.autoOrient = true;
                    }
                    if (settings.levelBlackpoint[0] !== 0 || settings.levelWhitepoint[0] !== 100 || settings.levelGamma[0] !== 1.0) {
                        const channels = settings.levelChannels === 'All' ? Channels.All : Channels[settings.levelChannels];
                        image.level(new Percentage(settings.levelBlackpoint[0]), new Percentage(settings.levelWhitepoint[0]), settings.levelGamma[0], channels);
                        appliedOptions.level = { black: settings.levelBlackpoint[0], white: settings.levelWhitepoint[0], gamma: settings.levelGamma[0], channels: settings.levelChannels };
                    }
                    if (settings.thresholdPercentage[0] !== 50) {
                        const selectedThresholdChannels = settings.thresholdChannels === 'All' ? Channels.All : Channels[settings.thresholdChannels];
                        image.threshold(new Percentage(settings.thresholdPercentage[0]), selectedThresholdChannels);
                        appliedOptions.threshold = { percent: settings.thresholdPercentage[0], channels: settings.thresholdChannels };
                    }
                    if (settings.sigmoidalContrast[0] !== 0) {
                        const sigmoidalChannelsSelected = settings.sigmoidalChannels === 'All' ? Channels.All : Channels[settings.sigmoidalChannels];
                        image.sigmoidalContrast(settings.sigmoidalContrast[0], new Percentage(settings.sigmoidalMidpoint[0]), sigmoidalChannelsSelected);
                        appliedOptions.sigmoidal = { contrast: settings.sigmoidalContrast[0], midpoint: settings.sigmoidalMidpoint[0] };
                    }
                    if (settings.colorSpace !== 'RGB') {
                        image.colorSpace = ColorSpace[settings.colorSpace];
                        appliedOptions.colorSpace = settings.colorSpace;
                    }

                    // Filters & Effects
                    if (settings.blur[0] > 0) {
                        image.blur(settings.blur[0], settings.blur[0] / 2);
                        appliedOptions.blur = settings.blur[0];
                    }
                    if (settings.sharpen[0] > 0) {
                        const val = Math.pow(settings.sharpen[0] / 100, 2) * 100;
                        image.sharpen(val / 10, val / 5);
                        appliedOptions.sharpen = settings.sharpen[0];
                    }

                    if (settings.effect !== "none") {
                        appliedOptions.effect = settings.effect;
                        switch (settings.effect) {
                            case "grayscale": image.grayscale(); break;
                            case "sepia":
                                image.sepiaTone(new Percentage(settings.sepiaThreshold[0]));
                                appliedOptions.sepiaThreshold = settings.sepiaThreshold[0];
                                break;
                            case "charcoal": image.charcoal(); break;
                            case "negate": image.negate(); break;
                            case "cannyEdge":
                                const radius = (settings.cannyEdgeStrength[0] / 100) * 4;
                                const sigma = (settings.cannyEdgeStrength[0] / 100) * 1.5;
                                image.cannyEdge(radius, sigma, new Percentage(settings.cannyEdgeLower[0]), new Percentage(settings.cannyEdgeUpper[0]));
                                appliedOptions.cannyEdge = { strength: settings.cannyEdgeStrength[0], lower: settings.cannyEdgeLower[0], upper: settings.cannyEdgeUpper[0] };
                                break;
                            case "oilpaint":
                                image.oilPaint(settings.oilpaintRadius[0]);
                                appliedOptions.oilPaintRadius = settings.oilpaintRadius[0];
                                break;
                            case "solarize":
                                image.solarize(new Percentage(settings.solarizeFactor[0]));
                                appliedOptions.solarizeFactor = settings.solarizeFactor[0];
                                break;
                            case "bilateralBlur":
                                image.bilateralBlur(settings.bilateralWidth[0], settings.bilateralHeight[0], settings.bilateralIntensitySigma[0], settings.bilateralSpatialSigma[0]);
                                appliedOptions.bilateral = { w: settings.bilateralWidth[0], h: settings.bilateralHeight[0], iSig: settings.bilateralIntensitySigma[0], sSig: settings.bilateralSpatialSigma[0] };
                                break;
                        }
                    }

                    if (settings.stripMeta) {
                        image.strip();
                        appliedOptions.stripMeta = true;
                    }
                    image.quality = settings.quality[0];
                    appliedOptions.quality = settings.quality[0];
                    appliedOptions.format = settings.imageFormat;
                    
                    const finalWidth = image.width;
                    const finalHeight = image.height;

                    image.write(MagickFormat[settings.imageFormat], (data) => {
                        const endTime = performance.now();
                        if (debugMode) {
                            appliedOptions.outputDimensions = { width: finalWidth, height: finalHeight };
                            appliedOptions.outputSize = data.length;
                            appliedOptions.processTime = Math.round(endTime - startTime) + 'ms';
                            console.log('ImageMagickSettings', appliedOptions);
                        }
                        handleDownload(data, settings.imageFormat, Math.round(endTime - startTime), finalWidth, finalHeight, appliedOptions);
                        if (onComplete) onComplete();
                    });
                });
            } catch (err) {
                console.error("Image processing failed:", err);
                alert("Processing failed: " + err.message);
                isLoading.value = false;
            }
        }, 50);
    }

    function handleDownload(data, format, time, newWidth, newHeight, appliedOptions) {
        const mimeType = `image/${format.toLowerCase()}`;
        const blob = new Blob([data], { type: mimeType });

        if (processedImageUrl.value) URL.revokeObjectURL(processedImageUrl.value);
        processedImageUrl.value = URL.createObjectURL(blob);
        processedImageFormat.value = format.toLowerCase();
        processedImageName.value = `${originalName.value}-edited.${processedImageFormat.value}`;

        isLoading.value = false;

        const newSizeKB = (blob.size / 1024).toFixed(1);
        const percentageChange = (((blob.size - originalImageSize.value) / originalImageSize.value) * 100).toFixed(1);
        statsMessage.value = `Processed in ${time}ms, New Size: ${newSizeKB} KB (${percentageChange > 0 ? '+' : ''}${percentageChange}%)`;
    }

    function downloadImage() {
        if (processedImageUrl.value && processedImageName.value) {
            const a = document.createElement("a");
            a.href = processedImageUrl.value;
            a.download = processedImageName.value;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    return {
        // State
        wasmLoaded,
        isLoading,
        statsMessage,
        sourceBytes,
        originalName,
        originalImageSize,
        originalImageUrl,
        processedImageUrl,
        processedImageName,
        settings,
        // Actions
        initWasm,
        resetSettings,
        resetGeometry,
        resetColor,
        resetFilters,
        resetExport,
        setSourceFile,
        clearSource,
        processImage,
        downloadImage
    };
}