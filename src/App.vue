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
import { ZoomIn, ZoomOut, Fullscreen, Images, UploadCloud, Image, X, Moon, Sun, Bug, Download, RotateCw } from 'lucide-vue-next';
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

// --- Form Controls State ---

// Export Settings
const imageFormat = ref('WebP');
const quality = ref([85]);
const stripMeta = ref(true);

// Geometry
const resizeW = ref(0);
const resizeH = ref(0);
const rotate = ref('0');
const flop = ref(false);
const flip = ref(false);
const borderColor = ref('#ffffff');
const borderSize = ref([0]);
const extentW = ref(0);
const extentH = ref(0);
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

        if (debugMode.value) {
            console.log('ImageMagick Version:', Magick.imageMagickVersion);
            console.log('Delegates:', Magick.delegates);
            console.log('Features:', Magick.features);
            console.log('Quantum Depth:', Quantum.depth);
        }
    } catch (e) {
        statsMessage.value = "Error Loading WASM";
        console.error(e);
    }
});

// --- Computed Properties ---

const imageStyle = computed(() => ({
    transform: `scale(${currentZoom.value / 100}) translate(${imageX.value}px, ${imageY.value}px)`,
    display: showPlaceholder.value ? 'none' : 'block',
    cursor: isPanning.value ? 'grabbing' : 'grab',
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
    // Reset view
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

    // Reset view
    currentZoom.value = 100;
    imageX.value = 0;
    imageY.value = 0;
    isComparing.value = false;
}

function processImage() {
    if (!sourceBytes.value) {
        alert("Please upload an image first.");
        return;
    }

    isLoading.value = true;
    setTimeout(() => { // Allow UI to update
        const startTime = performance.now();
        const appliedOptions = {};

        try {
            ImageMagick.read(sourceBytes.value, (image) => {
                // Geometry
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
                    appliedOptions.border = { color: borderColor.value, size: borderSize.value[0] };
                }
                if (extentW.value > 0 || extentH.value > 0) {
                    const { r, g, b } = hexToRgb(extentBgColor.value);
                    image.backgroundColor = new MagickColor(r, g, b);
                    image.extent(extentW.value, extentH.value, Gravity[extentGravity.value]);
                    appliedOptions.extent = { width: extentW.value, height: extentH.value, gravity: extentGravity.value, backgroundColor: extentBgColor.value };
                }
                if (deskewThreshold.value[0] > 0) {
                    const angle = image.deskew(new Percentage(deskewThreshold.value[0]), deskewAutoCrop.value);
                    appliedOptions.deskew = { angle, threshold: deskewThreshold.value[0], autoCrop: deskewAutoCrop.value };
                }

                // Color
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
                    appliedOptions.level = { blackPoint: levelBlackpoint.value[0], whitePoint: levelWhitepoint.value[0], gamma: levelGamma.value, channels: levelChannels.value };
                }
                if (thresholdPercentage.value[0] !== 50) {
                    const selectedThresholdChannels = thresholdChannels.value === 'All' ? Channels.All : Channels[thresholdChannels.value];
                    image.threshold(new Percentage(thresholdPercentage.value[0]), selectedThresholdChannels);
                    appliedOptions.threshold = { percentage: thresholdPercentage.value[0], channels: thresholdChannels.value };
                }

                if (sigmoidalContrast.value[0] !== 0) {
                    const sigmoidalChannelsSelected = sigmoidalChannels.value === 'All' ? Channels.All : Channels[sigmoidalChannels.value];
                    image.sigmoidalContrast(sigmoidalContrast.value[0], new Percentage(sigmoidalMidpoint.value[0]), sigmoidalChannelsSelected);
                    appliedOptions.sigmoidalContrast = { contrast: sigmoidalContrast.value[0], midpoint: sigmoidalMidpoint.value[0], channels: sigmoidalChannels.value };
                }

                if (colorSpace.value !== 'RGB') {
                    image.colorSpace = ColorSpace[colorSpace.value];
                    appliedOptions.colorSpace = colorSpace.value;
                }

                // Filters
                if (blur.value[0] > 0) {
                    image.blur(blur.value[0], blur.value[0] / 2);
                    appliedOptions.blur = blur.value[0];
                }
                if (sharpen.value[0] > 0) {
                    const val = Math.pow(sharpen.value[0] / 100, 2) * 100;
                    image.sharpen(val / 10, val / 5);
                    appliedOptions.sharpen = sharpen.value[0];
                }

                // Effects
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
                            appliedOptions.oilpaintRadius = oilpaintRadius.value[0];
                            break;
                        case "solarize":
                            image.solarize(new Percentage(solarizeFactor.value[0]));
                            appliedOptions.solarizeFactor = solarizeFactor.value[0];
                            break;
                        case "bilateralBlur":
                            image.bilateralBlur(bilateralWidth.value[0], bilateralHeight.value[0], bilateralIntensitySigma.value[0], bilateralSpatialSigma.value[0]);
                            appliedOptions.bilateralBlur = { width: bilateralWidth.value[0], height: bilateralHeight.value[0], intensitySigma: bilateralIntensitySigma.value[0], spatialSigma: bilateralSpatialSigma.value[0] };
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
                        appliedOptions.dimensions = { width: finalWidth, height: finalHeight };
                        appliedOptions.fileSize = data.length;
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

    const newSizeKB = (blob.size / 1024).toFixed(1);
    const percentageChange = (((blob.size - originalImageSize.value) / originalImageSize.value) * 100).toFixed(1);
    statsMessage.value = `Processed in ${time}ms | New Size: ${newSizeKB} KB (${percentageChange > 0 ? '+' : ''}${percentageChange}%)`;
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
    // Export Settings
    imageFormat.value = 'WebP';
    quality.value = [85];
    stripMeta.value = true;

    // Geometry
    resizeW.value = 0;
    resizeH.value = 0;
    rotate.value = '0';
    flop.value = false;
    flip.value = false;
    borderColor.value = '#ffffff';
    borderSize.value = [0];
    extentW.value = 0;
    extentH.value = 0;
    extentGravity.value = 'Center';
    extentBgColor.value = '#ffffff';
    deskewThreshold.value = [0];
    deskewAutoCrop.value = true;

    // Color Adjust
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

    // Filters & Effects
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
function resetView() { currentZoom.value = 100; imageX.value = 0; imageY.value = 0; }
function zoomIn() { currentZoom.value += zoomStep; }
function zoomOut() { currentZoom.value = Math.max(10, currentZoom.value - zoomStep); }
function onWheel(e) {
    if (showPlaceholder.value) return;
    e.preventDefault();
    const zoomAmount = e.deltaY > 0 ? -zoomStep : zoomStep;
    currentZoom.value = Math.max(10, currentZoom.value + zoomAmount);
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
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    imageX.value = initialImageX + dx / (currentZoom.value / 100);
    imageY.value = initialImageY + dy / (currentZoom.value / 100);
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

</script>

<template>
  <div class="app-layout min-h-screen grid grid-cols-[320px_1fr] dark:bg-zinc-950">
    <aside class="sidebar bg-background flex flex-col border-r shadow-lg h-screen">
      <header class="brand flex items-center justify-between gap-2 p-4 border-b h-14">
        <h1 class="text-xl font-semibold text-foreground">WASMagick</h1>

        <div class="flex items-center gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button @click="debugMode = !debugMode" :variant="debugMode ? 'secondary' : 'ghost'" size="icon" class="w-8 h-8">
                            <Bug class="w-5 h-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Toggle Debug Mode</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Button @click="toggleDarkMode" variant="ghost" size="icon" class="w-8 h-8">
                <Sun class="w-5 h-5 dark:hidden" />
                <Moon class="w-5 h-5 hidden dark:block" />
            </Button>
        </div>
      </header>

      <div class="scroll-container flex-grow overflow-y-auto p-4 custom-scrollbar">
        <div class="panel-section mb-6">
          <div v-if="!originalImageUrl">
            <Label
              for="fileInput"
              class="drop-zone flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200"
              :class="{ 'border-primary bg-primary/5': isDragging, 'border-border bg-muted/20 hover:border-muted-foreground/50': !isDragging }"
              @dragover.prevent="handleDragOver"
              @dragleave="handleDragLeave"
              @drop.prevent="handleDrop"
            >
              <UploadCloud class="w-10 h-10 mb-2 text-muted-foreground" />
              <p class="text-sm text-muted-foreground">Click or Drop Image</p>
              <Input type="file" id="fileInput" accept="image/*" @change="handleFileChange" class="hidden" />
            </Label>
          </div>
          <div v-else class="file-preview flex items-center gap-2 p-4 bg-muted/10 border rounded-lg">
            <img :src="originalImageUrl" class="w-16 h-16 object-cover rounded" />
            <span class="text-sm text-foreground truncate flex-1">{{ originalName }}</span>
            <Button @click="clearImage" variant="ghost" size="icon" class="w-6 h-6 shrink-0">
              <X class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button @click="resetSettings" variant="outline" class="w-full mb-6">
          <RotateCw class="w-4 h-4 mr-2" />
          Reset Settings
        </Button>

        <Accordion class="accordion-wrapper pb-4" type="multiple" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger class="font-semibold text-foreground hover:no-underline">Export Settings</AccordionTrigger>
            <AccordionContent class="accordion-content flex flex-col gap-2">
              <div class="field">
                <Label class="text-sm text-muted-foreground">Format</Label>
                <Select v-model="imageFormat">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select a format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jpeg">JPEG</SelectItem>
                    <SelectItem value="Png">PNG</SelectItem>
                    <SelectItem value="WebP">WebP</SelectItem>
                    <SelectItem value="Jxl">JXL</SelectItem>
                    <SelectItem value="Avif">AVIF</SelectItem>
                    <SelectItem value="Gif">GIF</SelectItem>
                    <SelectItem value="Tiff">TIFF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Quality
                  <span class="text-xs font-medium text-primary">{{ quality[0] }}</span>
                </Label>
                <Slider v-model="quality" :max="100" :min="1" :step="1" />
              </div>
              <div class="flex items-center space-x-2">
                <Switch id="stripMeta" v-model="stripMeta" />
                <Label for="stripMeta" class="text-sm text-muted-foreground">Strip EXIF Metadata</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger class="font-semibold text-foreground hover:no-underline">Geometry</AccordionTrigger>
            <AccordionContent class="accordion-content flex flex-col gap-2">
              <div class="control-grid grid grid-cols-2 gap-2">
                <div class="field">
                  <Label class="text-sm text-muted-foreground">Width (px, 0 = auto)</Label>
                  <Input type="number" v-model="resizeW" min="0" class="w-full" />
                </div>
                <div class="field">
                  <Label class="text-sm text-muted-foreground">Height (px, 0 = auto)</Label>
                  <Input type="number" v-model="resizeH" min="0" class="w-full" />
                </div>
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground">Rotate</Label>
                <Select v-model="rotate">
                  <SelectTrigger class="w-full">
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
              <div class="flex items-center space-x-4 mb-1">
                <div class="flex items-center space-x-2">
                  <Switch id="flop" v-model="flop" />
                  <Label for="flop" class="text-sm text-muted-foreground">Flop</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <Switch id="flip" v-model="flip" />
                  <Label for="flip" class="text-sm text-muted-foreground">Flip</Label>
                </div>
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground">Border Color</Label>
                <Input type="color" v-model="borderColor" class="h-10 w-full" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Border Size
                  <span class="text-xs font-medium text-primary">{{ borderSize[0] }}</span>
                </Label>
                <Slider v-model="borderSize" :max="50" :min="0" :step="1" />
              </div>
              <div class="control-grid grid grid-cols-2 gap-2">
                <div class="field">
                  <Label class="text-sm text-muted-foreground">Extent Width (px)</Label>
                  <Input type="number" v-model="extentW" min="0" class="w-full" />
                </div>
                <div class="field">
                  <Label class="text-sm text-muted-foreground">Extent Height (px)</Label>
                  <Input type="number" v-model="extentH" min="0" class="w-full" />
                </div>
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground">Extent Gravity</Label>
                <Select v-model="extentGravity">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Forget">Forget</SelectItem>
                    <SelectItem value="NorthWest">NorthWest</SelectItem>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="NorthEast">NorthEast</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                    <SelectItem value="Center">Center</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="SouthWest">SouthWest</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="SouthEast">SouthEast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground">Extent Background Color</Label>
                <Input type="color" v-model="extentBgColor" class="h-10 w-full" />
              </div>

              <div class="field">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2 cursor-help">
                        Deskew Threshold
                        <span class="text-xs font-medium text-primary">{{ deskewThreshold[0] }}</span>
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Removes skew from an image, common in scanned documents. Returns the detected skew angle.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Slider v-model="deskewThreshold" :max="100" :min="0" :step="1" />
              </div>
              <div class="flex items-center space-x-2">
                <Switch id="deskewAutoCrop" v-model="deskewAutoCrop" />
                <Label for="deskewAutoCrop" class="text-sm text-muted-foreground">Deskew Auto Crop</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger class="font-semibold text-foreground hover:no-underline">Color Adjust</AccordionTrigger>
            <AccordionContent class="accordion-content flex flex-col gap-2">
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Brightness
                  <span class="text-xs font-medium text-primary">{{ brightness[0] }}%</span>
                </Label>
                <Slider v-model="brightness" :min="0" :max="200" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Saturation
                  <span class="text-xs font-medium text-primary">{{ saturation[0] }}%</span>
                </Label>
                <Slider v-model="saturation" :min="0" :max="300" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Hue
                  <span class="text-xs font-medium text-primary">{{ hue[0] }}%</span>
                </Label>
                <Slider v-model="hue" :min="0" :max="200" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Contrast
                  <span class="text-xs font-medium text-primary">{{ contrast[0] }}</span>
                </Label>
                <Slider v-model="contrast" :min="-100" :max="100" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground">Color Space</Label>
                <Select v-model="colorSpace">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select color space" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RGB">RGB</SelectItem>
                    <SelectItem value="Gray">Gray</SelectItem>
                    <SelectItem value="CMYK">CMYK</SelectItem>
                    <SelectItem value="HSL">HSL</SelectItem>
                    <SelectItem value="HSV">HSV</SelectItem>
                    <SelectItem value="HWB">HWB</SelectItem>
                    <SelectItem value="LAB">LAB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <hr class="my-4 border-border">
              
              <div class="flex flex-col gap-2 mb-2">
                <TooltipProvider>
                  <div class="flex items-center space-x-2">
                    <Switch id="normalize" v-model="normalizeImage" />
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Label for="normalize" class="text-sm text-muted-foreground cursor-help">Normalize</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Normalize image (increase contrast by normalizing the pixel values to span the full range of color values).</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <TooltipProvider>
                  <div class="flex items-center space-x-2">
                    <Switch id="autoLevel" v-model="autoLevel" />
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Label for="autoLevel" class="text-sm text-muted-foreground cursor-help">Auto Level</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Adjusts the levels of an image channel by scaling the minimum and maximum values to the full quantum range.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <TooltipProvider>
                  <div class="flex items-center space-x-2">
                    <Switch id="autoOrient" v-model="autoOrient" />
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Label for="autoOrient" class="text-sm text-muted-foreground cursor-help">Auto Orient</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Adjusts an image so that its orientation is suitable for viewing.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
              
              <hr class="my-4 border-border">
              
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Level Black Point
                  <span class="text-xs font-medium text-primary">{{ levelBlackpoint[0] }}</span>
                </Label>
                <Slider v-model="levelBlackpoint" :max="100" :min="0" :step="1" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Level White Point
                  <span class="text-xs font-medium text-primary">{{ levelWhitepoint[0] }}</span>
                </Label>
                <Slider v-model="levelWhitepoint" :max="100" :min="0" :step="1" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground">Level Gamma</Label>
                <Input type="number" v-model="levelGamma" step="0.1" class="w-full" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground">Level Channels</Label>
                <Select v-model="levelChannels">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Red">Red</SelectItem>
                    <SelectItem value="Green">Green</SelectItem>
                    <SelectItem value="Blue">Blue</SelectItem>
                    <SelectItem value="Alpha">Alpha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <hr class="my-4 border-border">
              
              <div class="field">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2 cursor-help">
                        Threshold
                        <span class="text-xs font-medium text-primary">{{ thresholdPercentage[0] }}</span>
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Converts pixels above the threshold to white and pixels below to black, creating a black and white image.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Slider v-model="thresholdPercentage" :max="100" :min="0" :step="1" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground">Threshold Channels</Label>
                <Select v-model="thresholdChannels">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Red">Red</SelectItem>
                    <SelectItem value="Green">Green</SelectItem>
                    <SelectItem value="Blue">Blue</SelectItem>
                    <SelectItem value="Alpha">Alpha</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="field">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2 cursor-help">
                        Sigmoidal Contrast
                        <span class="text-xs font-medium text-primary">{{ sigmoidalContrast[0] }}</span>
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Adjust the image contrast with a non-linear sigmoidal contrast algorithm, which often produces more photorealistic results than a linear contrast adjustment.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Slider v-model="sigmoidalContrast" :max="20" :min="-20" :step="1" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Sigmoidal Midpoint
                  <span class="text-xs font-medium text-primary">{{ sigmoidalMidpoint[0] }}</span>
                </Label>
                <Slider v-model="sigmoidalMidpoint" :max="100" :min="0" :step="1" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground">Sigmoidal Channels</Label>
                <Select v-model="sigmoidalChannels">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Red">Red</SelectItem>
                    <SelectItem value="Green">Green</SelectItem>
                    <SelectItem value="Blue">Blue</SelectItem>
                    <SelectItem value="Alpha">Alpha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger class="font-semibold text-foreground hover:no-underline">Filters & Effects</AccordionTrigger>
            <AccordionContent class="accordion-content flex flex-col gap-2">
              <div class="field">
                <Label class="text-sm text-muted-foreground">Effect</Label>
                <Select v-model="effect">
                  <SelectTrigger class="w-full">
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
              <div v-if="effect === 'sepia'" class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Sepia Threshold
                  <span class="text-xs font-medium text-primary">{{ sepiaThreshold[0] }}</span>
                </Label>
                <Slider v-model="sepiaThreshold" />
              </div>
              <div v-if="effect === 'oilpaint'" class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Oil Paint Radius
                  <span class="text-xs font-medium text-primary">{{ oilpaintRadius[0] }}</span>
                </Label>
                <Slider v-model="oilpaintRadius" :max="15" :step="0.5" />
              </div>
              <div v-if="effect === 'solarize'" class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Solarize Factor
                  <span class="text-xs font-medium text-primary">{{ solarizeFactor[0] }}</span>
                </Label>
                <Slider v-model="solarizeFactor" />
              </div>
              <div v-if="effect === 'cannyEdge'" class="gap-2">
                <div class="field">
                  <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                    Strength
                    <span class="text-xs font-medium text-primary">{{ cannyEdgeStrength[0] }}</span>
                  </Label>
                  <Slider v-model="cannyEdgeStrength" />
                </div>
                <div class="field">
                  <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                    Lower Threshold
                    <span class="text-xs font-medium text-primary">{{ cannyEdgeLower[0] }}%</span>
                  </Label>
                  <Slider v-model="cannyEdgeLower" />
                </div>
                <div class="field">
                  <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                    Upper Threshold
                    <span class="text-xs font-medium text-primary">{{ cannyEdgeUpper[0] }}%</span>
                  </Label>
                  <Slider v-model="cannyEdgeUpper" />
                </div>
              </div>
              <div v-if="effect === 'bilateralBlur'" class="gap-2">
                <div class="field">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2 cursor-help">
                          Bilateral Width
                          <span class="text-xs font-medium text-primary">{{ bilateralWidth[0] }}</span>
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Width of the neighborhood in pixels for bilateral blur (edge-preserving smoothing).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Slider v-model="bilateralWidth" :max="10" :min="0" :step="1" />
                </div>
                <div class="field">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2 cursor-help">
                          Bilateral Height
                          <span class="text-xs font-medium text-primary">{{ bilateralHeight[0] }}</span>
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Height of the neighborhood in pixels for bilateral blur (edge-preserving smoothing).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Slider v-model="bilateralHeight" :max="10" :min="0" :step="1" />
                </div>
                <div class="field">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2 cursor-help">
                          Bilateral Intensity Sigma
                          <span class="text-xs font-medium text-primary">{{ bilateralIntensitySigma[0] }}</span>
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sigma in the intensity space for bilateral blur (controls how edges are preserved).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Slider v-model="bilateralIntensitySigma" :max="5" :min="0.1" :step="0.1" />
                </div>
                <div class="field">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2 cursor-help">
                          Bilateral Spatial Sigma
                          <span class="text-xs font-medium text-primary">{{ bilateralSpatialSigma[0] }}</span>
                        </Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sigma in the coordinate space for bilateral blur (controls smoothing extent).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Slider v-model="bilateralSpatialSigma" :max="5" :min="0.1" :step="0.1" />
                </div>
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Blur
                  <span class="text-xs font-medium text-primary">{{ blur[0] }}</span>
                </Label>
                <Slider v-model="blur" :max="20" :step="0.5" />
              </div>
              <div class="field">
                <Label class="text-sm text-muted-foreground flex items-center justify-between mb-2">
                  Sharpen
                  <span class="text-xs font-medium text-primary">{{ sharpen[0] }}</span>
                </Label>
                <Slider v-model="sharpen" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div class="sidebar-footer p-4 border-t flex flex-col gap-3">
        <Button @click="processImage" :disabled="!wasmLoaded || showPlaceholder" class="w-full">Process Image</Button>
        <Button @click="downloadImage" :disabled="downloadBtnDisabled" variant="secondary" class="w-full">
          Download
          <Download class="w-4 h-4 mr-2" />
        </Button>
        <div id="stats-bar" class="text-sm text-muted-foreground text-center">
          {{ statsMessage }}
        </div>
      </div>
    </aside>

    <main class="canvas-area flex flex-col">
      <TooltipProvider>
        <div class="toolbar flex items-center justify-between py-2 px-4 border-b h-14">
          <div class="tool-group flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button @click="zoomOut" variant="outline" size="icon" :disabled="showPlaceholder" class="w-8 h-8">
                  <ZoomOut class="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out</p>
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
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button @click="resetView" variant="outline" size="icon" :disabled="showPlaceholder" class="w-8 h-8">
                  <Fullscreen class="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset View</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div class="tool-group">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  @click="isComparing = !isComparing"
                  :disabled="!processedImageUrl"
                  :variant="isComparing ? 'default' : 'outline'"
                  class="h-8"
                >
                  <Images class="w-4 h-4 mr-2" />
                  Compare
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Compare with Original</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      <div class="viewport flex-grow relative flex items-center justify-center overflow-hidden">
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
          class="max-w-full max-h-full object-contain will-change-transform transition-[cursor] duration-75 ease-out"
        />
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
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: oklch(0.8 0 0); /* Light gray for scrollbar thumb */
  border-radius: 4px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: oklch(0.25 0 0); /* Darker gray for scrollbar thumb in dark mode */
}

.accordion-content .field:not(:last-of-type) {
  margin-bottom: 1rem; /* Apply consistent bottom margin to all fields within accordion content, except the last one */
}
</style>
