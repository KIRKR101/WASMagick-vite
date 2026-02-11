<script setup>
import { ref, onMounted } from 'vue';
import { UploadCloud } from 'lucide-vue-next';
import EditorSidebar from '@/components/EditorSidebar.vue';
import ImageViewport from '@/components/ImageViewport.vue';
import { useMagick } from '@/composables/useMagick';

const magick = useMagick();
const debugMode = ref(false);
const isDarkMode = ref(false);
const globalDragging = ref(false);
const viewportRef = ref(null); // Reference to the viewport component for zoom methods

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

function handleKeydown(e) {
    const cmdOrCtrl = e.ctrlKey || e.metaKey;
    if (cmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        if (magick.sourceBytes.value) {
            magick.processImage(debugMode.value, () => {
                if(viewportRef.value) viewportRef.value.fitImageToScreen();
            });
        }
    } else if (cmdOrCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        magick.downloadImage();
    } else if (cmdOrCtrl && e.key === '0') {
        e.preventDefault();
        if(viewportRef.value) viewportRef.value.resetView();
    } else if (cmdOrCtrl && e.key === '=') {
        e.preventDefault();
        if(viewportRef.value) viewportRef.value.zoomIn();
    } else if (cmdOrCtrl && e.key === '-') {
        e.preventDefault();
        if(viewportRef.value) viewportRef.value.zoomOut();
    }
}

async function handleGlobalDrop(e) {
      e.preventDefault();
      globalDragging.value = false;
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        if(await magick.setSourceFile(files[0])) {
            if(viewportRef.value) setTimeout(() => viewportRef.value.fitImageToScreen(), 100);
        }
      }
}

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

    // Initialize WASM
    await magick.initWasm(debugMode.value);

    // Global Events
    window.addEventListener('keydown', handleKeydown);

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      globalDragging.value = true;
    });
    document.addEventListener('dragleave', (e) => {
      if (!e.relatedTarget || !document.documentElement.contains(e.relatedTarget)) {
        globalDragging.value = false;
      }
    });
    document.addEventListener('drop', handleGlobalDrop);
});
</script>

<template>
  <div class="app-layout min-h-screen grid grid-cols-[400px_1fr] dark:bg-zinc-950">
    <!-- Global drag and drop overlay -->
    <div v-if="globalDragging" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="text-center">
        <UploadCloud class="w-16 h-16 mx-auto mb-4 text-white" />
        <p class="text-lg font-medium text-white">Drop your image here</p>
      </div>
    </div>
    
    <EditorSidebar 
      :magick="magick" 
      :debug-mode="debugMode"
      :is-dark-mode="isDarkMode"
      @toggle-debug="debugMode = !debugMode" 
      @toggle-theme="toggleDarkMode"
      @file-changed="() => { if(viewportRef.value) setTimeout(() => viewportRef.value.fitImageToScreen(), 100); }"
    />

    <ImageViewport 
      ref="viewportRef"
      :original-image-url="magick.originalImageUrl.value"
      :processed-image-url="magick.processedImageUrl.value"
      :is-loading="magick.isLoading.value"
    />

  </div>
</template>

<style>
:root {
  font-family: 'Google Sans Code', monospace;
}

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
