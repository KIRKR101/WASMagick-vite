<script setup>
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, Images, Image as ImageIcon } from 'lucide-vue-next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const props = defineProps({
  originalImageUrl: { type: String, default: null },
  processedImageUrl: { type: String, default: null },
  isLoading: { type: Boolean, default: false }
});

const showPlaceholder = computed(() => !props.originalImageUrl);
const isComparing = ref(false);

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

const previewImageRef = ref(null);
const viewportRef = ref(null);

const imageStyle = computed(() => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: `translate(calc(-50% + ${imageX.value}px), calc(-50% + ${imageY.value}px)) scale(${currentZoom.value / 100})`,
    display: showPlaceholder.value ? 'none' : 'block',
    cursor: isPanning.value ? 'grabbing' : 'grab',
    opacity: (props.processedImageUrl || props.originalImageUrl) ? 1 : 0
}));

const displayedImage = computed(() => {
    return isComparing.value ? props.originalImageUrl : props.processedImageUrl || props.originalImageUrl;
});

// Exposed methods for Keyboard shortcuts
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

// Watch for new images to auto-fit
watch(() => props.originalImageUrl, () => {
  currentZoom.value = 100;
  imageX.value = 0;
  imageY.value = 0;
  isComparing.value = false;
  setTimeout(fitImageToScreen, 100);
});

// View Logic
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

defineExpose({
    fitImageToScreen,
    zoomIn,
    zoomOut,
    resetView
});
</script>

<template>
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
                <p>Reset View (Ctrl+0)</p>
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
          <ImageIcon class="icon-lg w-16 h-16 mx-auto mb-4" />
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
            <span class="text-foreground text-sm font-medium">Processing...</span>
          </div>
        </div>
      </div>
    </main>
</template>