<script setup>
import { ref, onMounted, computed } from 'vue';
import {
    ImageMagick,
    Magick,
    initializeImageMagick,
    MagickFormat,
    Percentage,
    MagickColor,
    Quantum,
    Gravity,
    Channels,
    ColorSpace,
} from "@imagemagick/magick-wasm";

// Shadcn-Vue Components
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, Images, UploadCloud, Image, X, Moon, Sun, Bug, Download, RotateCw, RefreshCcw } from 'lucide-vue-next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- Reactive State ---

// App State
const isLoading = ref(false);
const wasmLoaded = ref(false);
const statsMessage = ref('Ready');
const debugMode = ref(false);
const isDarkMode = ref(false);

// Image Data
const sourceBytes = ref(null);
const originalName = ref('image');
const originalImageSize = ref(0);
const originalImageUrl = ref(null);
const processedImageUrl = ref(null);
const processedImageFormat = ref(null);
const processedImageName = ref(null);

// UI State
const showPlaceholder = ref(true);
const processBtnDisabled = ref(true);
const downloadBtnDisabled = ref(true);
const isComparing = ref(false);
const isDragging = ref(false);
const globalDragging = ref(false);

// Zoom & Pan State
const currentZoom = ref(100);
const zoomStep = 10;
const isPanning = ref(false);
const imageX = ref(0);
const imageY = ref(0);
let startPointerX = 0;
let startPointerY = 0;
let initialImageX = 0;
let initialImageY = 0;

// Template Refs
const previewImageRef = ref(null);
const viewportRef = ref(null);

// --- Form Controls State ---

// Export Settings
const imageFormat = ref('WebP');
const quality = ref([85]);
const stripMeta = ref(true);

// Geometry
const resizeW = ref(null);
const resizeH = ref(null);
const rotate = ref('0');
const flop = ref(false);
const flip = ref(false);
const borderColor = ref('#ffffff');
const borderSize = ref([0]);
const extentW = ref(null);
const extentH = ref(null);
const extentGravity = ref('Center');
const extentBgColor = ref('#ffffff');
const deskewThreshold = ref([0]);
const deskewAutoCrop = ref(true);

// Color Adjust
const brightness = ref([100]);
const saturation = ref([100]);
const hue = ref([100]);
const contrast = ref([0]);
const normalizeImage = ref(false);
const autoLevel = ref(false);
const autoOrient = ref(false);
const levelBlackpoint = ref([0]);
const levelWhitepoint = ref([100]);
const levelGamma = ref(1.0);
const levelChannels = ref('All');
const thresholdPercentage = ref([50]);
const thresholdChannels = ref('All');

// Filters & Effects
const effect = ref('none');
const blur = ref([0]);
const sharpen = ref([0]);
const sepiaThreshold = ref([80]);
const charcoalIntensity = ref([0]);
const cannyEdgeStrength = ref([0]);
const cannyEdgeLower = ref([10]);
const cannyEdgeUpper = ref([30]);
const oilpaintRadius = ref([0]);
const solarizeFactor = ref([50]);
const bilateralWidth = ref([0]);
const bilateralHeight = ref([0]);
const bilateralIntensitySigma = ref([1.5]);
const bilateralSpatialSigma = ref([1]);
const sigmoidalContrast = ref([0]);
const sigmoidalMidpoint = ref([50]);
const sigmoidalChannels = ref('All');

// Color Adjust
const colorSpace = ref('RGB');


// --- Lifecycle Hooks ---

onMounted(async () => {
    // Check for saved theme preference
    if (localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        isDarkMode.value = true;
    } else {
        document.documentElement.classList.remove('dark');
        isDarkMode.value = false;
    }

    try {
        const response = await fetch('/magick.wasm');
        const wasmBytes = new Uint8Array(await response.arrayBuffer());
        await initializeImageMagick(wasmBytes);
        wasmLoaded.value = true;
        processBtnDisabled.value = false;

        // Log initial version info if debug is on
        if (debugMode.value) {
            console.log('ImageMagick Version:', Magick.imageMagickVersion);
        }
    } catch (e) {
        statsMessage.value = "Error Loading WASM";
        console.error(e);
    }

    // Keyboard shortcuts
    window.addEventListener('keydown', handleKeydown);

    // Global drag and drop
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      globalDragging.value = true;
    });
    document.addEventListener('dragleave', (e) => {
      if (!e.relatedTarget || !document.documentElement.contains(e.relatedTarget)) {
        globalDragging.value = false;
      }
    });
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      globalDragging.value = false;
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileChange({ target: { files: [files[0]] } });
      }
    });
});

// --- Computed Properties ---

const imageStyle = computed(() => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: `translate(calc(-50% + ${imageX.value}px), calc(-50% + ${imageY.value}px)) scale(${currentZoom.value / 100})`,
    display: showPlaceholder.value ? 'none' : 'block',
    cursor: isPanning.value ? 'grabbing' : 'grab',
    opacity: (processedImageUrl.value || originalImageUrl.value) ? 1 : 0
}));

const displayedImage = computed(() => {
    return isComparing.value ? originalImageUrl.value : processedImageUrl.value || originalImageUrl.value;
});


// --- Methods ---

function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value;
    if (isDarkMode.value) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
}

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

function clearImage() {
    sourceBytes.value = null;
    if (originalImageUrl.value) URL.revokeObjectURL(originalImageUrl.value);
    originalImageUrl.value = null;
    if (processedImageUrl.value) URL.revokeObjectURL(processedImageUrl.value);
    processedImageUrl.value = null;
    processedImageFormat.value = null;
    processedImageName.value = null;
    showPlaceholder.value = true;
    downloadBtnDisabled.value = true;
    statsMessage.value = "Ready";
    currentZoom.value = 100;
    imageX.value = 0;
    imageY.value = 0;
    isComparing.value = false;
}

async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    originalName.value = file.name;
    const buffer = await file.arrayBuffer();
    sourceBytes.value = new Uint8Array(buffer);
    originalImageSize.value = sourceBytes.value.length;

    if (originalImageUrl.value) URL.revokeObjectURL(originalImageUrl.value);
    originalImageUrl.value = URL.createObjectURL(new Blob([sourceBytes.value]));

    showPlaceholder.value = false;
    downloadBtnDisabled.value = true;
    statsMessage.value = "Ready";
    currentZoom.value = 100;
    imageX.value = 0;
    imageY.value = 0;
    isComparing.value = false;
    setTimeout(fitImageToScreen, 100);
}

function processImage() {
    if (!sourceBytes.value) {
        alert("Please upload an image first.");
        return;
    }

    isLoading.value = true;
    setTimeout(() => { 
        const startTime = performance.now();
        const appliedOptions = {}; // Object to track applied settings for Debug Mode

        try {
            ImageMagick.read(sourceBytes.value, (image) => {
                // --- Geometry ---
                if (resizeW.value > 0 || resizeH.value > 0) {
                    image.resize(resizeW.value || 0, resizeH.value || 0);
                    appliedOptions.resize = { width: resizeW.value, height: resizeH.value };
                }
                if (parseInt(rotate.value) !== 0) {
                    image.rotate(parseInt(rotate.value));
                    appliedOptions.rotate = parseInt(rotate.value);
                }
                if (flop.value) {
                    image.flop();
                    appliedOptions.flop = true;
                }
                if (flip.value) {
                    image.flip();
                    appliedOptions.flip = true;
                }
                if (borderSize.value[0] > 0) {
                    const { r, g, b } = hexToRgb(borderColor.value);
                    image.borderColor = new MagickColor(r, g, b);
                    image.border(borderSize.value[0]);
                    appliedOptions.border = { size: borderSize.value[0], color: borderColor.value };
                }
                if (extentW.value > 0 || extentH.value > 0) {
                    const { r, g, b } = hexToRgb(extentBgColor.value);
                    image.backgroundColor = new MagickColor(r, g, b);
                    image.extent(extentW.value, extentH.value, Gravity[extentGravity.value]);
                    appliedOptions.extent = { width: extentW.value, height: extentH.value, gravity: extentGravity.value, bg: extentBgColor.value };
                }
                if (deskewThreshold.value[0] > 0) {
                    const angle = image.deskew(new Percentage(deskewThreshold.value[0]), deskewAutoCrop.value);
                    appliedOptions.deskew = { threshold: deskewThreshold.value[0], autoCrop: deskewAutoCrop.value, detectedAngle: angle };
                }

                // --- Color ---
                if (brightness.value[0] !== 100 || saturation.value[0] !== 100 || hue.value[0] !== 100) {
                    image.modulate(new Percentage(brightness.value[0]), new Percentage(saturation.value[0]), new Percentage(hue.value[0]));
                    appliedOptions.modulate = { brightness: brightness.value[0], saturation: saturation.value[0], hue: hue.value[0] };
                }
                if (contrast.value[0] !== 0) {
                    image.brightnessContrast(new Percentage(0), new Percentage(contrast.value[0]));
                    appliedOptions.contrast = contrast.value[0];
                }
                if (normalizeImage.value) {
                    image.normalize();
                    appliedOptions.normalize = true;
                }
                if (autoLevel.value) {
                    image.autoLevel();
                    appliedOptions.autoLevel = true;
                }
                if (autoOrient.value) {
                    image.autoOrient();
                    appliedOptions.autoOrient = true;
                }
                
                if (levelBlackpoint.value[0] !== 0 || levelWhitepoint.value[0] !== 100 || levelGamma.value !== 1.0) {
                    const channels = levelChannels.value === 'All' ? Channels.All : Channels[levelChannels.value];
                    image.level(new Percentage(levelBlackpoint.value[0]), new Percentage(levelWhitepoint.value[0]), levelGamma.value, channels);
                    appliedOptions.level = { black: levelBlackpoint.value[0], white: levelWhitepoint.value[0], gamma: levelGamma.value, channels: levelChannels.value };
                }
                if (thresholdPercentage.value[0] !== 50) {
                    const selectedThresholdChannels = thresholdChannels.value === 'All' ? Channels.All : Channels[thresholdChannels.value];
                    image.threshold(new Percentage(thresholdPercentage.value[0]), selectedThresholdChannels);
                    appliedOptions.threshold = { percent: thresholdPercentage.value[0], channels: thresholdChannels.value };
                }
                if (sigmoidalContrast.value[0] !== 0) {
                    const sigmoidalChannelsSelected = sigmoidalChannels.value === 'All' ? Channels.All : Channels[sigmoidalChannels.value];
                    image.sigmoidalContrast(sigmoidalContrast.value[0], new Percentage(sigmoidalMidpoint.value[0]), sigmoidalChannelsSelected);
                    appliedOptions.sigmoidal = { contrast: sigmoidalContrast.value[0], midpoint: sigmoidalMidpoint.value[0] };
                }
                if (colorSpace.value !== 'RGB') {
                    image.colorSpace = ColorSpace[colorSpace.value];
                    appliedOptions.colorSpace = colorSpace.value;
                }

                // --- Filters ---
                if (blur.value[0] > 0) {
                    image.blur(blur.value[0], blur.value[0] / 2);
                    appliedOptions.blur = blur.value[0];
                }
                if (sharpen.value[0] > 0) {
                    const val = Math.pow(sharpen.value[0] / 100, 2) * 100;
                    image.sharpen(val / 10, val / 5);
                    appliedOptions.sharpen = sharpen.value[0];
                }

                // --- Effects ---
                if (effect.value !== "none") {
                    appliedOptions.effect = effect.value;
                    switch (effect.value) {
                        case "grayscale": image.grayscale(); break;
                        case "sepia": 
                            image.sepiaTone(new Percentage(sepiaThreshold.value[0])); 
                            appliedOptions.sepiaThreshold = sepiaThreshold.value[0];
                            break;
                        case "charcoal": image.charcoal(); break;
                        case "negate": image.negate(); break;
                        case "cannyEdge":
                            const radius = (cannyEdgeStrength.value[0] / 100) * 4;
                            const sigma = (cannyEdgeStrength.value[0] / 100) * 1.5;
                            image.cannyEdge(radius, sigma, new Percentage(cannyEdgeLower.value[0]), new Percentage(cannyEdgeUpper.value[0]));
                            appliedOptions.cannyEdge = { strength: cannyEdgeStrength.value[0], lower: cannyEdgeLower.value[0], upper: cannyEdgeUpper.value[0] };
                            break;
                        case "oilpaint": 
                            image.oilPaint(oilpaintRadius.value[0]); 
                            appliedOptions.oilPaintRadius = oilpaintRadius.value[0];
                            break;
                        case "solarize": 
                            image.solarize(new Percentage(solarizeFactor.value[0])); 
                            appliedOptions.solarizeFactor = solarizeFactor.value[0];
                            break;
                        case "bilateralBlur":
                            image.bilateralBlur(bilateralWidth.value[0], bilateralHeight.value[0], bilateralIntensitySigma.value[0], bilateralSpatialSigma.value[0]);
                            appliedOptions.bilateral = { w: bilateralWidth.value[0], h: bilateralHeight.value[0], iSig: bilateralIntensitySigma.value[0], sSig: bilateralSpatialSigma.value[0] };
                            break;
                    }
                }

                if (stripMeta.value) {
                    image.strip();
                    appliedOptions.stripMeta = true;
                }
                image.quality = quality.value[0];
                appliedOptions.quality = quality.value[0];
                appliedOptions.format = imageFormat.value;
                
                const finalWidth = image.width;
                const finalHeight = image.height;

                image.write(MagickFormat[imageFormat.value], (data) => {
                    const endTime = performance.now();
                    
                    if (debugMode.value) {
                        appliedOptions.outputDimensions = { width: finalWidth, height: finalHeight };
                        appliedOptions.outputSize = data.length;
                        appliedOptions.processTime = Math.round(endTime - startTime) + 'ms';
                        console.log('ImageMagickSettings', appliedOptions);
                    }

                    handleDownload(data, imageFormat.value, Math.round(endTime - startTime), finalWidth, finalHeight, appliedOptions);
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
    downloadBtnDisabled.value = false;
    isComparing.value = false;
    setTimeout(fitImageToScreen, 100);

    const newSizeKB = (blob.size / 1024).toFixed(1);
    const percentageChange = (((blob.size - originalImageSize.value) / originalImageSize.value) * 100).toFixed(1);
    statsMessage.value = `Processed in ${time}ms\nNew Size: ${newSizeKB} KB (${percentageChange > 0 ? '+' : ''}${percentageChange}%)`;
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

function resetSettings() {
    imageFormat.value = 'WebP';
    quality.value = [85];
    stripMeta.value = true;
    resetGeometry();
    resetColor();
    resetFilters();
}

function resetGeometry() {
    resizeW.value = null;
    resizeH.value = null;
    rotate.value = '0';
    flop.value = false;
    flip.value = false;
    borderColor.value = '#ffffff';
    borderSize.value = [0];
    extentW.value = null;
    extentH.value = null;
    extentGravity.value = 'Center';
    extentBgColor.value = '#ffffff';
    deskewThreshold.value = [0];
    deskewAutoCrop.value = true;
}

function resetColor() {
    brightness.value = [100];
    saturation.value = [100];
    hue.value = [100];
    contrast.value = [0];
    colorSpace.value = 'RGB';
    normalizeImage.value = false;
    autoLevel.value = false;
    autoOrient.value = false;
    levelBlackpoint.value = [0];
    levelWhitepoint.value = [100];
    levelGamma.value = 1.0;
    levelChannels.value = 'All';
    thresholdPercentage.value = [50];
    thresholdChannels.value = 'All';
    sigmoidalContrast.value = [0];
    sigmoidalMidpoint.value = [50];
    sigmoidalChannels.value = 'All';
}

function resetFilters() {
    effect.value = 'none';
    blur.value = [0];
    sharpen.value = [0];
    sepiaThreshold.value = [80];
    charcoalIntensity.value = [0];
    cannyEdgeStrength.value = [0];
    cannyEdgeLower.value = [10];
    cannyEdgeUpper.value = [30];
    oilpaintRadius.value = [0];
    solarizeFactor.value = [50];
    bilateralWidth.value = [0];
    bilateralHeight.value = [0];
    bilateralIntensitySigma.value = [1.5];
    bilateralSpatialSigma.value = [1];
}

// Zoom and Pan Handlers
function setZoom(newZoom) {
    const roundedZoom = Math.floor(newZoom / 10) * 10;
    currentZoom.value = Math.max(10, roundedZoom);
}

function fitImageToScreen() {
    if (isComparing.value) return;
    if (!previewImageRef.value || !viewportRef.value) return;
    const img = previewImageRef.value;
    const container = viewportRef.value;
    imageX.value = 0;
    imageY.value = 0;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const padding = 40;
    const cw = container.clientWidth - padding;
    const ch = container.clientHeight - padding;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.min(cw / iw, ch / ih);
    let targetZoom = Math.min(scale, 1) * 100;
    setZoom(targetZoom);
}
function resetView() { fitImageToScreen(); }
function zoomIn() { setZoom(currentZoom.value + zoomStep); }
function zoomOut() { setZoom(currentZoom.value - zoomStep); }
function onWheel(e) {
    if (showPlaceholder.value) return;
    e.preventDefault();
    const oldZoom = currentZoom.value;
    let newZoom = oldZoom + (e.deltaY > 0 ? -zoomStep : zoomStep);
    newZoom = Math.max(10, Math.floor(newZoom / 10) * 10);
    if (newZoom === oldZoom) return;
    if (!viewportRef.value) return;
    const viewportRect = viewportRef.value.getBoundingClientRect();
    const viewportCenterX = viewportRect.left + viewportRect.width / 2;
    const viewportCenterY = viewportRect.top + viewportRect.height / 2;
    const Px = e.clientX - viewportCenterX;
    const Py = e.clientY - viewportCenterY;
    const r = newZoom / oldZoom;
    const newImageX = Px * (1 - r) + imageX.value * r;
    const newImageY = Py * (1 - r) + imageY.value * r;
    currentZoom.value = newZoom;
    imageX.value = newImageX;
    imageY.value = newImageY;
}
function onPointerDown(e) {
    if (showPlaceholder.value || e.button !== 0) return;
    isPanning.value = true;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    initialImageX = imageX.value;
    initialImageY = imageY.value;
}
function onPointerMove(e) {
    if (!isPanning.value) return;
    imageX.value = initialImageX + (e.clientX - startPointerX);
    imageY.value = initialImageY + (e.clientY - startPointerY);
}
function onPointerUp() { isPanning.value = false; }

function handleDragOver(e) {
    e.preventDefault();
    isDragging.value = true;
}
function handleDragLeave() {
    isDragging.value = false;
}
async function handleDrop(e) {
    e.preventDefault();
    isDragging.value = false;
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileChange({ target: { files: [files[0]] } });
    }
}
function handleKeydown(e) {
    const cmdOrCtrl = e.ctrlKey || e.metaKey;
    if (cmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        if (sourceBytes.value) processImage();
    } else if (cmdOrCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        downloadImage();
    } else if (e.key === '0') {
        e.preventDefault();
        resetView();
    } else if (cmdOrCtrl && e.key === '=') {
        e.preventDefault();
        zoomIn();
    } else if (cmdOrCtrl && e.key === '-') {
        e.preventDefault();
        zoomOut();
    }
}
</script>

<template>
  <div class="app-layout min-h-screen grid grid-cols-[360px_1fr] dark:bg-zinc-950">
    <!-- Global drag and drop overlay -->
    <div v-if="globalDragging" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="text-center">
        <UploadCloud class="w-16 h-16 mx-auto mb-4 text-white" />
        <p class="text-lg font-medium text-white">Drop your image here</p>
      </div>
    </div>
    <aside class="sidebar bg-background flex flex-col border-r shadow-lg h-screen z-10">
      <header class="brand flex items-center justify-between gap-2 px-4 py-3 border-b h-14 shrink-0">
        <div class="flex items-center gap-2">
            <h1 class="text-lg font-bold tracking-tight text-foreground">WASMagick</h1>
        </div>

        <div class="flex items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button @click="debugMode = !debugMode" :variant="debugMode ? 'secondary' : 'ghost'" size="icon" class="w-8 h-8">
                            <Bug class="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Toggle Debug Mode</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Button @click="toggleDarkMode" variant="ghost" size="icon" class="w-8 h-8">
                <Sun class="w-4 h-4 dark:hidden" />
                <Moon class="w-4 h-4 hidden dark:block" />
            </Button>
        </div>
      </header>

      <div class="scroll-container flex-grow overflow-y-auto px-4 py-6 custom-scrollbar space-y-6">
        
        <!-- File Input Section -->
        <div class="section-upload">
          <div v-if="!originalImageUrl">
            <Label
              for="fileInput"
              class="drop-zone flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200"
              :class="{ 'border-primary bg-primary/5': isDragging, 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30': !isDragging }"
              @dragover.prevent="handleDragOver"
              @dragleave="handleDragLeave"
              @drop.prevent="handleDrop"
            >
              <UploadCloud class="w-10 h-10 mb-3 text-muted-foreground" />
              <p class="text-sm font-medium text-foreground">Click or Drop Image</p>
              <p class="text-xs text-muted-foreground mt-1">Supports common formats</p>
              <Input type="file" id="fileInput" accept="image/*" @change="handleFileChange" class="hidden" />
            </Label>
          </div>
          <div v-else class="file-preview relative group flex items-start gap-3 p-3 bg-muted/30 border rounded-lg shadow-sm">
            <div class="w-16 h-16 shrink-0 bg-background rounded-md border overflow-hidden flex items-center justify-center">
                <img :src="originalImageUrl" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-center h-16">
                <span class="text-sm font-medium text-foreground truncate block">{{ originalName }}</span>
                <span class="text-xs text-muted-foreground">{{ (originalImageSize / 1024).toFixed(1) }} KB</span>
            </div>
            <Button @click="clearImage" variant="ghost" size="icon" class="w-6 h-6 absolute top-2 right-2 text-muted-foreground hover:text-destructive">
              <X class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button @click="resetSettings" variant="secondary" size="sm" class="w-full text-muted-foreground hover:text-foreground">
          <RotateCw class="w-3.5 h-3.5 mr-2" />
          Reset All Settings
        </Button>

        <!-- Tools Accordion -->
        <Accordion class="accordion-wrapper w-full" type="multiple" collapsible>
          
          <!-- Export Settings -->
          <AccordionItem value="export" class="border rounded-lg mb-2 last:mb-0 shadow-sm bg-card overflow-hidden">
            <AccordionTrigger class="px-3 py-3 text-sm font-semibold hover:no-underline hover:bg-muted/30 transition-colors">Export Settings</AccordionTrigger>
            <AccordionContent class="px-3 pb-4 pt-1 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1.5">
                    <Label class="text-xs text-muted-foreground">Format</Label>
                    <Select v-model="imageFormat">
                      <SelectTrigger class="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jpeg">JPEG</SelectItem>
                        <SelectItem value="Png">PNG</SelectItem>
                        <SelectItem value="WebP">WebP</SelectItem>
                        <SelectItem value="Avif">AVIF</SelectItem>
                        <SelectItem value="Jxl">JXL</SelectItem>
                        <SelectItem value="Tiff">TIFF</SelectItem>
                        <SelectItem value="Gif">GIF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                        <Label class="text-xs text-muted-foreground">Quality</Label>
                        <span class="text-xs font-mono text-primary">{{ quality[0] }}</span>
                    </div>
                    <div class="h-9 flex items-center">
                        <Slider v-model="quality" :max="100" :min="1" :step="1" />
                    </div>
                  </div>
              </div>
              
              <div class="flex items-center justify-between bg-muted/30 p-2 rounded-md border">
                <Label for="stripMeta" class="text-xs font-medium cursor-pointer">Strip EXIF Data</Label>
                <Switch id="stripMeta" v-model="stripMeta" class="scale-75 origin-right" />
              </div>
            </AccordionContent>
          </AccordionItem>

          <!-- Geometry -->
          <AccordionItem value="geometry" class="border rounded-lg mb-2 last:mb-0 shadow-sm bg-card overflow-hidden">
            <AccordionTrigger class="px-3 py-3 text-sm font-semibold hover:no-underline hover:bg-muted/30 transition-colors pr-2">
              <div class="flex items-center gap-2">
                  <span>Geometry</span>
                  <div v-if="resizeW || resizeH || rotate !== '0'" class="w-1.5 h-1.5 rounded-full bg-primary"></div>
              </div>
              <Button @click.stop="resetGeometry" variant="ghost" size="icon" class="w-6 h-6 ml-auto mr-2 text-muted-foreground" title="Reset Geometry">
                <RefreshCcw class="w-3 h-3" />
              </Button>
            </AccordionTrigger>
            <AccordionContent class="px-3 pb-4 pt-1 space-y-4">
              <!-- Resize -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <Label class="text-xs text-muted-foreground">Width (px)</Label>
                  <Input type="number" v-model="resizeW" min="0" placeholder="Auto" class="h-8 text-sm no-spinner" />
                </div>
                <div class="space-y-1.5">
                  <Label class="text-xs text-muted-foreground">Height (px)</Label>
                  <Input type="number" v-model="resizeH" min="0" placeholder="Auto" class="h-8 text-sm no-spinner" />
                </div>
              </div>

              <!-- Rotate & Flip -->
              <div class="grid grid-cols-2 gap-3 items-end">
                <div class="space-y-1.5">
                    <Label class="text-xs text-muted-foreground">Rotate</Label>
                    <Select v-model="rotate">
                    <SelectTrigger class="h-8 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">0°</SelectItem>
                        <SelectItem value="90">90°</SelectItem>
                        <SelectItem value="180">180°</SelectItem>
                        <SelectItem value="-90">-90°</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <div class="flex items-center justify-around h-8 bg-muted/30 rounded-md border">
                    <div class="flex items-center gap-1.5" title="Flop (Horizontal Mirror)">
                        <Switch id="flop" v-model="flop" class="scale-75" />
                        <Label for="flop" class="text-xs cursor-pointer">Flop</Label>
                    </div>
                    <div class="w-px h-4 bg-border"></div>
                    <div class="flex items-center gap-1.5" title="Flip (Vertical Mirror)">
                        <Switch id="flip" v-model="flip" class="scale-75" />
                        <Label for="flip" class="text-xs cursor-pointer">Flip</Label>
                    </div>
                </div>
              </div>

              <!-- Border -->
              <div class="space-y-3 pt-2 border-t">
                  <Label class="text-xs font-semibold text-foreground/80">Border</Label>
                  <div class="flex gap-3">
                      <div class="flex-1 space-y-1.5">
                         <div class="flex justify-between">
                             <Label class="text-xs text-muted-foreground">Size</Label>
                             <span class="text-xs font-mono text-muted-foreground">{{ borderSize[0] }}px</span>
                         </div>
                         <Slider v-model="borderSize" :max="50" :min="0" :step="1" />
                      </div>
                      <div class="w-12 space-y-1.5">
                          <Label class="text-xs text-muted-foreground">Color</Label>
                          <div class="h-8 w-full rounded-md border overflow-hidden p-0.5 relative">
                              <input type="color" v-model="borderColor" class="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer" />
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Extent -->
              <div class="space-y-3 pt-2 border-t">
                <Label class="text-xs font-semibold text-foreground/80">Extent (Canvas)</Label>
                <div class="grid grid-cols-2 gap-3">
                    <Input type="number" v-model="extentW" min="0" placeholder="W" class="h-8 text-sm no-spinner" />
                    <Input type="number" v-model="extentH" min="0" placeholder="H" class="h-8 text-sm no-spinner" />
                </div>
                <div class="grid grid-cols-[1fr_3rem] gap-3">
                     <Select v-model="extentGravity">
                        <SelectTrigger class="h-8 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Center">Center</SelectItem>
                            <SelectItem value="NorthWest">Top Left</SelectItem>
                            <SelectItem value="North">Top</SelectItem>
                            <SelectItem value="NorthEast">Top Right</SelectItem>
                            <SelectItem value="West">Left</SelectItem>
                            <SelectItem value="East">Right</SelectItem>
                            <SelectItem value="SouthWest">Bot Left</SelectItem>
                            <SelectItem value="South">Bottom</SelectItem>
                            <SelectItem value="SouthEast">Bot Right</SelectItem>
                        </SelectContent>
                    </Select>
                    <div class="h-8 rounded-md border overflow-hidden relative">
                         <input type="color" v-model="extentBgColor" class="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer" />
                    </div>
                </div>
              </div>

              <!-- Deskew -->
               <div class="space-y-3 pt-2 border-t">
                 <div class="flex items-center justify-between">
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <Label class="text-xs font-semibold text-foreground/80 cursor-help underline decoration-dotted">Deskew</Label>
                            </TooltipTrigger>
                            <TooltipContent><p>Auto-straighten scanned documents</p></TooltipContent>
                        </Tooltip>
                     </TooltipProvider>
                     <div class="flex items-center gap-2">
                         <Label for="deskewAuto" class="text-[10px] text-muted-foreground">Auto Crop</Label>
                         <Switch id="deskewAuto" v-model="deskewAutoCrop" class="scale-75" />
                     </div>
                 </div>
                 <div class="space-y-1.5">
                     <div class="flex justify-between">
                        <Label class="text-xs text-muted-foreground">Threshold</Label>
                        <span class="text-xs font-mono text-muted-foreground">{{ deskewThreshold[0] }}%</span>
                     </div>
                     <Slider v-model="deskewThreshold" :max="100" :min="0" :step="1" />
                 </div>
               </div>
            </AccordionContent>
          </AccordionItem>

          <!-- Color Adjust -->
          <AccordionItem value="color" class="border rounded-lg mb-2 last:mb-0 shadow-sm bg-card overflow-hidden">
            <AccordionTrigger class="px-3 py-3 text-sm font-semibold hover:no-underline hover:bg-muted/30 transition-colors pr-2">
                <div class="flex items-center gap-2">
                    <span>Color Adjust</span>
                    <div v-if="brightness[0] !== 100 || contrast[0] !== 0 || saturation[0] !== 100" class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                </div>
                <Button @click.stop="resetColor" variant="ghost" size="icon" class="w-6 h-6 ml-auto mr-2 text-muted-foreground" title="Reset Colors">
                    <RefreshCcw class="w-3 h-3" />
                </Button>
            </AccordionTrigger>
            <AccordionContent class="px-3 pb-4 pt-1 space-y-5">
                <!-- Main Sliders -->
                <div class="space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label class="text-xs text-muted-foreground">Brightness</Label>
                            <span class="text-xs font-mono text-primary">{{ brightness[0] }}%</span>
                        </div>
                        <Slider v-model="brightness" :min="0" :max="200" />
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label class="text-xs text-muted-foreground">Contrast</Label>
                            <span class="text-xs font-mono text-primary">{{ contrast[0] }}</span>
                        </div>
                        <Slider v-model="contrast" :min="-100" :max="100" />
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label class="text-xs text-muted-foreground">Saturation</Label>
                            <span class="text-xs font-mono text-primary">{{ saturation[0] }}%</span>
                        </div>
                        <Slider v-model="saturation" :min="0" :max="300" />
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label class="text-xs text-muted-foreground">Hue</Label>
                            <span class="text-xs font-mono text-primary">{{ hue[0] }}%</span>
                        </div>
                        <Slider v-model="hue" :min="0" :max="200" />
                    </div>
                </div>

                <div class="space-y-1.5 pt-2 border-t">
                    <Label class="text-xs text-muted-foreground">Color Space</Label>
                    <Select v-model="colorSpace">
                        <SelectTrigger class="h-8 text-sm">
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="RGB">RGB</SelectItem>
                            <SelectItem value="Gray">Gray</SelectItem>
                            <SelectItem value="CMYK">CMYK</SelectItem>
                            <SelectItem value="HSL">HSL</SelectItem>
                            <SelectItem value="HSV">HSV</SelectItem>
                            <SelectItem value="LAB">LAB</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Auto Toggles -->
                <div class="grid grid-cols-1 gap-2 pt-2 border-t">
                     <div class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label class="text-xs cursor-pointer" for="normalize">Normalize</Label>
                        <Switch id="normalize" v-model="normalizeImage" class="scale-75" />
                     </div>
                     <div class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label class="text-xs cursor-pointer" for="autoLevel">Auto Level</Label>
                        <Switch id="autoLevel" v-model="autoLevel" class="scale-75" />
                     </div>
                     <div class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label class="text-xs cursor-pointer" for="autoOrient">Auto Orient</Label>
                        <Switch id="autoOrient" v-model="autoOrient" class="scale-75" />
                     </div>
                </div>

                <!-- Levels -->
                <div class="space-y-3 pt-2 border-t">
                    <div class="flex items-center justify-between mb-2">
                        <Label class="text-xs font-semibold text-foreground/80">Levels</Label>
                        <Select v-model="levelChannels">
                            <SelectTrigger class="h-6 w-20 text-[10px] px-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All</SelectItem>
                                <SelectItem value="Red">Red</SelectItem>
                                <SelectItem value="Green">Green</SelectItem>
                                <SelectItem value="Blue">Blue</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="space-y-3">
                         <div class="space-y-1.5">
                             <div class="flex justify-between"><Label class="text-[10px] text-muted-foreground">Black Point</Label><span class="text-[10px] font-mono">{{ levelBlackpoint[0] }}</span></div>
                             <Slider v-model="levelBlackpoint" :max="100" :min="0" :step="1" />
                         </div>
                         <div class="space-y-1.5">
                             <div class="flex justify-between"><Label class="text-[10px] text-muted-foreground">White Point</Label><span class="text-[10px] font-mono">{{ levelWhitepoint[0] }}</span></div>
                             <Slider v-model="levelWhitepoint" :max="100" :min="0" :step="1" />
                         </div>
                         <div class="space-y-1.5">
                            <Label class="text-[10px] text-muted-foreground">Gamma</Label>
                            <Input type="number" v-model="levelGamma" step="0.1" class="h-7 text-xs no-spinner" />
                         </div>
                    </div>
                </div>

                <!-- Threshold & Sigmoidal (Advanced) -->
                <Accordion type="single" collapsible class="w-full border-t">
                    <AccordionItem value="adv" class="border-0">
                         <AccordionTrigger class="py-2 text-xs text-muted-foreground">Advanced Color</AccordionTrigger>
                         <AccordionContent class="space-y-4 pt-2">
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <Label class="text-xs">Threshold</Label>
                                    <span class="text-[10px] font-mono">{{ thresholdPercentage[0] }}%</span>
                                </div>
                                <Slider v-model="thresholdPercentage" :max="100" :min="0" :step="1" />
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <Label class="text-xs">Sigmoidal Contrast</Label>
                                    <span class="text-[10px] font-mono">{{ sigmoidalContrast[0] }}</span>
                                </div>
                                <Slider v-model="sigmoidalContrast" :max="20" :min="-20" :step="1" />
                            </div>
                         </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </AccordionContent>
          </AccordionItem>

          <!-- Filters & Effects -->
          <AccordionItem value="filters" class="border rounded-lg mb-2 last:mb-0 shadow-sm bg-card overflow-hidden">
             <AccordionTrigger class="px-3 py-3 text-sm font-semibold hover:no-underline hover:bg-muted/30 transition-colors pr-2">
                <div class="flex items-center gap-2">
                    <span>Filters & Effects</span>
                    <div v-if="effect !== 'none' || blur[0] > 0 || sharpen[0] > 0" class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                </div>
                <Button @click.stop="resetFilters" variant="ghost" size="icon" class="w-6 h-6 ml-auto mr-2 text-muted-foreground" title="Reset Filters">
                    <RefreshCcw class="w-3 h-3" />
                </Button>
            </AccordionTrigger>
            <AccordionContent class="px-3 pb-4 pt-1 space-y-4">
                <div class="space-y-1.5">
                    <Label class="text-xs text-muted-foreground">Effect Mode</Label>
                    <Select v-model="effect">
                        <SelectTrigger class="h-9">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="grayscale">Grayscale</SelectItem>
                        <SelectItem value="sepia">Sepia</SelectItem>
                        <SelectItem value="charcoal">Charcoal</SelectItem>
                        <SelectItem value="negate">Invert</SelectItem>
                        <SelectItem value="cannyEdge">Edge Detect</SelectItem>
                        <SelectItem value="oilpaint">Oil Paint</SelectItem>
                        <SelectItem value="solarize">Solarize</SelectItem>
                        <SelectItem value="bilateralBlur">Bilateral Blur</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Conditional Effect Controls -->
                <div v-if="effect !== 'none'" class="p-3 bg-muted/30 rounded-md border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                     <div v-if="effect === 'sepia'" class="space-y-1.5">
                        <div class="flex justify-between"><Label class="text-xs">Threshold</Label><span class="text-xs font-mono">{{ sepiaThreshold[0] }}</span></div>
                        <Slider v-model="sepiaThreshold" />
                     </div>
                     <div v-if="effect === 'oilpaint'" class="space-y-1.5">
                        <div class="flex justify-between"><Label class="text-xs">Radius</Label><span class="text-xs font-mono">{{ oilpaintRadius[0] }}</span></div>
                        <Slider v-model="oilpaintRadius" :max="15" :step="0.5" />
                     </div>
                     <div v-if="effect === 'solarize'" class="space-y-1.5">
                        <div class="flex justify-between"><Label class="text-xs">Factor</Label><span class="text-xs font-mono">{{ solarizeFactor[0] }}</span></div>
                        <Slider v-model="solarizeFactor" />
                     </div>
                     <div v-if="effect === 'cannyEdge'" class="space-y-3">
                         <div class="space-y-1.5">
                            <div class="flex justify-between"><Label class="text-xs">Strength</Label><span class="text-xs font-mono">{{ cannyEdgeStrength[0] }}</span></div>
                            <Slider v-model="cannyEdgeStrength" />
                         </div>
                         <div class="space-y-1.5">
                            <div class="flex justify-between"><Label class="text-xs">Lower</Label><span class="text-xs font-mono">{{ cannyEdgeLower[0] }}%</span></div>
                            <Slider v-model="cannyEdgeLower" />
                         </div>
                         <div class="space-y-1.5">
                            <div class="flex justify-between"><Label class="text-xs">Upper</Label><span class="text-xs font-mono">{{ cannyEdgeUpper[0] }}%</span></div>
                            <Slider v-model="cannyEdgeUpper" />
                         </div>
                     </div>
                     <div v-if="effect === 'bilateralBlur'" class="space-y-3">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1"><Label class="text-[10px]">Width</Label><Slider v-model="bilateralWidth" :max="10" :step="1" /></div>
                            <div class="space-y-1"><Label class="text-[10px]">Height</Label><Slider v-model="bilateralHeight" :max="10" :step="1" /></div>
                        </div>
                     </div>
                </div>

                <div class="space-y-3 pt-2 border-t">
                    <div class="space-y-1.5">
                        <div class="flex justify-between"><Label class="text-xs text-muted-foreground">Blur</Label><span class="text-xs font-mono text-primary">{{ blur[0] }}</span></div>
                        <Slider v-model="blur" :max="20" :step="0.5" />
                    </div>
                    <div class="space-y-1.5">
                         <div class="flex justify-between"><Label class="text-xs text-muted-foreground">Sharpen</Label><span class="text-xs font-mono text-primary">{{ sharpen[0] }}</span></div>
                         <Slider v-model="sharpen" />
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <!-- Footer Actions -->
      <div class="sidebar-footer p-4 border-t bg-muted/10 space-y-3 shrink-0">
        <div class="flex gap-2">
            <TooltipProvider>
            <Tooltip>
                <TooltipTrigger as-child>
                <Button @click="processImage" :disabled="!wasmLoaded || showPlaceholder" class="flex-1 font-semibold shadow-sm">Process</Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                <p>Process Image (Ctrl+Enter)</p>
                </TooltipContent>
            </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
            <Tooltip>
                <TooltipTrigger as-child>
                <Button @click="downloadImage" :disabled="downloadBtnDisabled" variant="outline" size="icon" class="w-10 shrink-0">
                    <Download class="w-4 h-4" />
                </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                <p>Download (Ctrl+S)</p>
                </TooltipContent>
            </Tooltip>
            </TooltipProvider>
        </div>
        <div id="stats-bar" class="text-xs text-muted-foreground text-center font-mono whitespace-pre-line leading-tight">
           {{ statsMessage }}
        </div>
      </div>
    </aside>

    <main class="canvas-area flex flex-col">
      <TooltipProvider>
        <div class="toolbar flex items-center justify-between p-4 border-b h-14">
          <div class="tool-group flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button @click="zoomOut" variant="outline" size="icon" :disabled="showPlaceholder" class="w-8 h-8">
                  <ZoomOut class="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out (Ctrl+-)</p>
              </TooltipContent>
            </Tooltip>
            <span class="zoom-level text-sm font-medium text-foreground w-12 text-center">{{ currentZoom }}%</span>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button @click="zoomIn" variant="outline" size="icon" :disabled="showPlaceholder" class="w-8 h-8">
                  <ZoomIn class="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In (Ctrl+=)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button @click="resetView" variant="outline" size="icon" :disabled="showPlaceholder" class="w-8 h-8">
                  <Maximize class="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset View (0)</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div class="tool-group">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  @pointerdown.prevent="isComparing = true"
                  @pointerup.prevent="isComparing = false"
                  @pointerleave="isComparing = false"
                  :disabled="!processedImageUrl"
                  :variant="isComparing ? 'default' : 'outline'"
                  class="h-8"
                >
                  <Images class="w-4 h-4 mr-2" />
                  Compare
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Press to Compare</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      <div ref="viewportRef" class="viewport flex flex-col items-center justify-center flex-grow relative overflow-hidden w-full h-full">
        <div v-if="showPlaceholder" class="placeholder-state text-center text-muted-foreground">
          <Image class="icon-lg w-16 h-16 mx-auto mb-4" />
          <h3 class="text-xl font-semibold mb-2">No Image Loaded</h3>
          <p class="text-sm">Import an image from the sidebar to begin.</p>
        </div>
        <img
          ref="previewImageRef"
          :src="displayedImage"
          :style="imageStyle"
          draggable="false"
          @wheel="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointerleave="onPointerUp"
          class="max-w-none max-h-none object-contain will-change-transform transition-[cursor] duration-75 ease-out origin-center"
        />
        <div v-if="isComparing" class="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-md border text-sm font-medium text-foreground shadow-lg z-20">Before</div>
        <div v-if="isLoading" class="loading-overlay absolute inset-0 bg-background/25 backdrop-blur-sm flex justify-center items-center z-10">
          <div class="loading-content flex flex-col items-center gap-3">
            <div class="spinner border-4 border-t-4 border-primary/20 border-t-primary rounded-full w-12 h-12 animate-spin"></div>
            <span class="text-foreground text-lg font-medium">Processing...</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: oklch(0.8 0 0);
  border-radius: 99px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: oklch(0.25 0 0);
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: oklch(0.7 0 0);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: oklch(0.35 0 0);
}

/* Accordion Animation smoothing */
.accordion-content {
    overflow: hidden;
}

/* Hide Spinners on Input[type=number] */
input.no-spinner::-webkit-outer-spin-button,
input.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input.no-spinner[type=number] {
  -moz-appearance: textfield;
}
</style>