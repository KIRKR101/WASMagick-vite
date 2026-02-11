<script setup>
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Moon, Sun, Bug, Download, RotateCw, 
  RefreshCcw, FileImage, Settings2, 
  Palette, Wand2, Maximize, Trash2,
} from 'lucide-vue-next';

const props = defineProps({
  magick: { type: Object, required: true },
  debugMode: { type: Boolean, required: true },
  isDarkMode: { type: Boolean, required: true }
});

const emit = defineEmits(['toggle-debug', 'toggle-theme', 'file-changed']);
const isDragging = ref(false);

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

async function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
        if(await props.magick.setSourceFile(file)) {
            emit('file-changed');
        }
    }
}

// Helper to format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
</script>

<template>
    <aside class="sidebar flex flex-col border-r h-screen z-10 select-none">
      <!-- Header -->
      <header class="flex items-center justify-between px-4 py-3 border-b h-14 shrink-0">
        <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Settings2 class="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 class="text-sm font-semibold tracking-tight text-foreground uppercase">WASMagick</h1>
        </div>

        <div class="flex items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button @click="$emit('toggle-debug')" :variant="debugMode ? 'secondary' : 'ghost'" size="sm" class="h-8 w-8 p-0 cursor-pointer rounded-xs">
                            <Bug class="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle Debug Mode</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button @click="$emit('toggle-theme')" variant="ghost" size="sm" class="h-8 w-8 p-0 cursor-pointer rounded-xs">
                            <Sun class="w-4 h-4 dark:hidden" />
                            <Moon class="w-4 h-4 hidden dark:block" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle Theme</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </header>

       <div class="scroll-container flex-grow overflow-y-auto custom-scrollbar">
        
        <!-- File Section -->
        <div class="p-4 space-y-3 border-b">
          <div v-if="!magick.originalImageUrl.value">
            <Label
              for="fileInput"
              class="drop-zone relative flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-xs cursor-pointer transition-all duration-50 group"
              :class="{ 'border-primary bg-primary/10': isDragging, 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50': !isDragging }"
              @dragover.prevent="handleDragOver"
              @dragleave="handleDragLeave"
              @drop.prevent="handleDrop"
            >
              <FileImage class="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-50" />
              <div class="text-center">
                <p class="text-xs font-medium text-foreground">Drop image here or click to browse</p>
                <p class="text-[11px] text-muted-foreground mt-1">Supports any common format</p>
              </div>
              <Input type="file" id="fileInput" accept="image/*" @change="handleFileChange" class="hidden" />
            </Label>
          </div>

          <div v-else class="space-y-2">
            <div class="group flex items-center gap-3 p-2.5 rounded-xs bg-background border border-border hover:border-muted-foreground/30 transition-all duration-50 shadow-sm">
              <div class="w-12 h-12 shrink-0 bg-muted rounded-md overflow-hidden flex items-center justify-center border border-border/50">
                  <img :src="magick.originalImageUrl.value" class="w-full h-full object-cover" alt="Source" />
              </div>
              <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-semibold truncate text-foreground">{{ magick.originalName.value }}</p>
                  <p class="text-[11px] text-muted-foreground">{{ formatFileSize(magick.originalImageSize.value) }}</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                     <Button @click="magick.clearSource()" variant="ghost" size="icon" class="h-8 w-8 hover:text-destructive hover:bg-destructive/10 transition-all duration-50">
                      <Trash2 class="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove Image</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button @click="magick.resetSettings()" variant="outline" size="sm" class="w-full text-[11px] h-8 gap-1.5 uppercase tracking-wider font-semibold hover:bg-muted transition-colors duration-50">
              <RotateCw class="w-3 h-3" />
              Reset All Settings
            </Button>
          </div>
        </div>

        <!-- Tools Accordion -->
        <Accordion class="w-full" type="multiple" :default-value="['export', 'geometry']">

          <!-- Export Section -->
          <AccordionItem value="export" class="border-b px-4">
            <AccordionTrigger class="hover:no-underline py-3.5 group cursor-pointer">
              <div class="flex items-center gap-2.5">
                  <Download class="w-4 h-4 text-primary" />
                  <span class="text-xs font-bold uppercase tracking-wider">Export</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button @click.stop="magick.resetExport()" variant="ghost" size="icon" class="h-6 w-6 ml-auto mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-50">
                      <RefreshCcw class="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Reset Export Settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </AccordionTrigger>
            <AccordionContent class="pb-4 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-2">
                    <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Format</Label>
                    <Select v-model="magick.settings.imageFormat">
                      <SelectTrigger class="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="fmt in ['WebP', 'Jpeg', 'Png', 'Avif', 'Jxl', 'Tiff', 'Gif']" :key="fmt" :value="fmt">{{ fmt }}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Quality</Label>
                        <span class="text-[11px] font-mono font-bold text-foreground">{{ magick.settings.quality[0] }}%</span>
                    </div>
                    <Slider v-model="magick.settings.quality" :max="100" :min="1" :step="1" class="py-2" />
                  </div>
              </div>

              <label for="stripMeta" class="flex items-center justify-between p-3 rounded-sm bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors duration-50 cursor-pointer">
                <span class="text-[11px] font-medium">Strip Metadata (EXIF)</span>
                <Switch id="stripMeta" v-model="magick.settings.stripMeta" class="pointer-events-none" />
              </label>
            </AccordionContent>
          </AccordionItem>

          <!-- Geometry Section -->
          <AccordionItem value="geometry" class="border-b px-4">
            <AccordionTrigger class="hover:no-underline py-3.5 group cursor-pointer">
              <div class="flex items-center gap-2.5">
                  <Maximize class="w-4 h-4 text-primary" />
                  <span class="text-xs font-bold uppercase tracking-wider">Geometry</span>
                  <div v-if="magick.settings.resizeW || magick.settings.resizeH || magick.settings.rotate !== '0' || magick.settings.flip || magick.settings.flop" class="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button @click.stop="magick.resetGeometry()" variant="ghost" size="icon" class="h-6 w-6 ml-auto mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-50">
                      <RefreshCcw class="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Reset Geometry</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </AccordionTrigger>
            <AccordionContent class="pb-4 space-y-5">
              
              <!-- Resize -->
              <div class="space-y-2">
                <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide flex items-center gap-1.5">
                    Resize (pixels)
                </Label>
                <div class="grid grid-cols-2 gap-2">
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">W</span>
                        <Input type="number" v-model="magick.settings.resizeW" placeholder="Auto" class="h-9 pl-8 text-xs font-mono" />
                    </div>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">H</span>
                        <Input type="number" v-model="magick.settings.resizeH" placeholder="Auto" class="h-9 pl-8 text-xs font-mono" />
                    </div>
                </div>
              </div>

              <!-- Rotation & Transform -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-2">
                    <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Rotate</Label>
                    <Select v-model="magick.settings.rotate">
                        <SelectTrigger class="h-9 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">0° (None)</SelectItem>
                            <SelectItem value="90">90° CW</SelectItem>
                            <SelectItem value="180">180°</SelectItem>
                            <SelectItem value="-90">270° CCW</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div class="space-y-2">
                    <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Transform</Label>
                    <div class="grid grid-cols-2 gap-1.5 h-9">
                        <label for="flip" class="flex items-center justify-center gap-1.5 bg-muted/40 rounded-xs border border-border/50 hover:bg-muted/60 transition-colors duration-50 px-2 cursor-pointer">
                            <Switch id="flip" v-model="magick.settings.flip" class="pointer-events-none" />
                            <span class="text-[11px] font-semibold">Flip</span>
                        </label>
                        <label for="flop" class="flex items-center justify-center gap-1.5 bg-muted/40 rounded-xs border border-border/50 hover:bg-muted/60 transition-colors duration-50 px-2 cursor-pointer">
                            <Switch id="flop" v-model="magick.settings.flop" class="pointer-events-none" />
                            <span class="text-[11px] font-semibold">Flop</span>
                        </label>
                    </div>
                </div>
              </div>

              <!-- Auto Orient -->
              <label for="autoOrient" class="flex items-center justify-between p-3 rounded-sm bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors duration-50 cursor-pointer">
                <span class="text-[11px] font-medium">Auto Orient (from EXIF)</span>
                <Switch id="autoOrient" v-model="magick.settings.autoOrient" class="pointer-events-none" />
              </label>

               <!-- Deskew -->
               <div class="space-y-2 p-3 rounded-sm bg-muted/20 border border-border/40">
                    <div class="flex items-center justify-between">
                         <span class="text-[11px] uppercase font-semibold text-muted-foreground tracking-wide">Deskew</span>
                         <label for="deskewAutoCrop" class="flex items-center gap-2 cursor-pointer">
                            <span class="text-[11px] text-muted-foreground">Auto Crop</span>
                            <Switch id="deskewAutoCrop" v-model="magick.settings.deskewAutoCrop" class="scale-75 pointer-events-none" />
                         </label>
                    </div>
                    <div class="flex items-center gap-3">
                         <Slider v-model="magick.settings.deskewThreshold" :max="100" :min="0" :step="1" class="flex-1" />
                         <span class="text-[11px] font-mono font-bold w-10 text-right">{{ magick.settings.deskewThreshold[0] }}%</span>
                    </div>
               </div>

              <!-- Canvas Extent -->
              <div class="space-y-2 pt-2 border-t border-dashed border-border/60">
                 <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide flex items-center gap-1.5">
                    Canvas Extent
                 </Label>
                 <div class="grid grid-cols-2 gap-2">
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">W</span>
                        <Input type="number" v-model="magick.settings.extentW" placeholder="Auto" class="h-9 pl-8 text-xs font-mono" />
                    </div>
                    <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">H</span>
                        <Input type="number" v-model="magick.settings.extentH" placeholder="Auto" class="h-9 pl-8 text-xs font-mono" />
                    </div>
                 </div>
                 <div class="grid grid-cols-[1fr_auto] gap-2">
                    <Select v-model="magick.settings.extentGravity">
                        <SelectTrigger class="h-9 text-xs">
                            <SelectValue placeholder="Gravity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Center">Center</SelectItem>
                            <SelectItem value="NorthWest">Top Left</SelectItem>
                            <SelectItem value="North">Top Center</SelectItem>
                            <SelectItem value="NorthEast">Top Right</SelectItem>
                            <SelectItem value="West">Left</SelectItem>
                            <SelectItem value="East">Right</SelectItem>
                            <SelectItem value="SouthWest">Bottom Left</SelectItem>
                            <SelectItem value="South">Bottom Center</SelectItem>
                            <SelectItem value="SouthEast">Bottom Right</SelectItem>
                        </SelectContent>
                    </Select>
                    <div class="relative w-12 h-9 border border-border rounded-sm overflow-hidden shadow-sm hover:ring-2 hover:ring-primary/50 transition-all duration-50">
                        <input type="color" v-model="magick.settings.extentBgColor" class="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 p-0 border-0 cursor-pointer" title="Background Color" />
                    </div>
                 </div>
              </div>

              <!-- Border -->
              <div class="space-y-2 p-3 rounded-sm bg-muted/20 border border-border/40">
                  <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Border</Label>
                  <div class="flex items-center gap-3">
                      <div class="flex-1 space-y-1.5">
                         <div class="flex justify-between">
                             <span class="text-[11px] text-muted-foreground">Size</span>
                             <span class="text-[11px] font-mono font-bold">{{ magick.settings.borderSize[0] }}px</span>
                         </div>
                         <Slider v-model="magick.settings.borderSize" :max="50" :min="0" :step="1" />
                      </div>
                      <div class="relative w-12 h-9 border border-border rounded-sm overflow-hidden shadow-sm hover:ring-2 hover:ring-primary/50 transition-all duration-50">
                          <input type="color" v-model="magick.settings.borderColor" class="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 p-0 border-0 cursor-pointer" title="Border Color" />
                      </div>
                  </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <!-- Color Section -->
          <AccordionItem value="color" class="border-b px-4">
            <AccordionTrigger class="hover:no-underline py-3.5 group cursor-pointer">
                <div class="flex items-center gap-2.5">
                    <Palette class="w-4 h-4 text-primary" />
                    <span class="text-xs font-bold uppercase tracking-wider">Color</span>
                    <div v-if="magick.settings.normalizeImage || magick.settings.autoLevel || magick.settings.brightness[0] !== 100 || magick.settings.contrast[0] !== 0 || magick.settings.saturation[0] !== 100 || magick.settings.hue[0] !== 100" class="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button @click.stop="magick.resetColor()" variant="ghost" size="icon" class="h-6 w-6 ml-auto mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-50">
                          <RefreshCcw class="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Reset Color Settings</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </AccordionTrigger>
            <AccordionContent class="pb-4 space-y-5">
                <!-- Basic Adjustments -->
                <div class="space-y-4">
                    <div v-for="attr in [
                      { key: 'brightness', label: 'Brightness', unit: '%', min: 0, max: 200 },
                      { key: 'contrast', label: 'Contrast', unit: '', min: -100, max: 100 },
                      { key: 'saturation', label: 'Saturation', unit: '%', min: 0, max: 300 },
                      { key: 'hue', label: 'Hue', unit: '%', min: 0, max: 200 }
                    ]" :key="attr.key" class="space-y-1.5">
                        <div class="flex items-center justify-between">
                            <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">{{ attr.label }}</Label>
                            <span class="text-[11px] font-mono font-bold">{{ magick.settings[attr.key][0] }}{{ attr.unit }}</span>
                        </div>
                        <Slider v-model="magick.settings[attr.key]" :min="attr.min" :max="attr.max" :step="1" />
                    </div>
                </div>

                <!-- Color Space & Toggles -->
                <div class="space-y-3 pt-3 border-t border-dashed border-border/60">
                    <div class="grid grid-cols-2 gap-2">
                        <div class="space-y-2">
                             <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Color Space</Label>
                             <Select v-model="magick.settings.colorSpace">
                                <SelectTrigger class="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RGB">RGB</SelectItem>
                                    <SelectItem value="Gray">Grayscale</SelectItem>
                                    <SelectItem value="CMYK">CMYK</SelectItem>
                                    <SelectItem value="HSL">HSL</SelectItem>
                                    <SelectItem value="HSV">HSV</SelectItem>
                                    <SelectItem value="LAB">LAB</SelectItem>
                                </SelectContent>
                             </Select>
                        </div>
                        <div class="grid grid-cols-1 gap-2">
                          <div class="flex items-end">
                             <label for="normalize" class="flex items-center justify-between px-2.5 h-9 rounded-xs bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors duration-50 w-full cursor-pointer">
                                <span class="text-[11px] font-medium">Normalize</span>
                                <Switch id="normalize" v-model="magick.settings.normalizeImage" class="scale-75 pointer-events-none" />
                            </label>
                          </div>
                        </div>
                    </div>

                    <label for="autoLevel" class="flex items-center justify-between px-2.5 py-2 rounded-xs bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors duration-50 cursor-pointer">
                        <span class="text-[11px] font-medium">Auto Level</span>
                        <Switch id="autoLevel" v-model="magick.settings.autoLevel" class="scale-75 pointer-events-none" />
                    </label>
                </div>

                <!-- Levels -->
                <div class="space-y-3 pt-3 border-t border-dashed border-border/60">
                     <div class="flex items-center justify-between">
                        <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide flex items-center gap-1.5">
                             Levels
                        </Label>
                        <Select v-model="magick.settings.levelChannels">
                            <SelectTrigger class="h-7 w-20 text-[11px] px-2">
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
                             <div class="flex justify-between">
                                <span class="text-[11px] text-muted-foreground">Black Point</span>
                                <span class="text-[11px] font-mono font-bold">{{ magick.settings.levelBlackpoint[0] }}</span>
                             </div>
                             <Slider v-model="magick.settings.levelBlackpoint" :max="100" :min="0" :step="1" />
                         </div>
                         <div class="space-y-1.5">
                             <div class="flex justify-between">
                                <span class="text-[11px] text-muted-foreground">White Point</span>
                                <span class="text-[11px] font-mono font-bold">{{ magick.settings.levelWhitepoint[0] }}</span>
                             </div>
                             <Slider v-model="magick.settings.levelWhitepoint" :max="100" :min="0" :step="1" />
                         </div>
                         <div class="space-y-1.5">
                             <div class="flex justify-between">
                                <span class="text-[11px] text-muted-foreground">Gamma</span>
                                <span class="text-[11px] font-mono font-bold">{{ magick.settings.levelGamma[0].toFixed(1) }}</span>
                             </div>
                             <Slider v-model="magick.settings.levelGamma" :max="3" :min="0.1" :step="0.1" />
                         </div>
                    </div>
                </div>

                <!-- Advanced -->
                <Accordion type="single" collapsible class="w-full border-t border-dashed border-border/60">
                    <AccordionItem value="adv" class="border-0">
                         <AccordionTrigger class="py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground hover:no-underline hover:text-foreground transition-colors duration-50">Advanced Color</AccordionTrigger>
                         <AccordionContent class="space-y-3 pt-2">
                            <div class="space-y-1.5">
                                <div class="flex justify-between items-center">
                                    <span class="text-[11px] text-muted-foreground">Threshold</span>
                                    <span class="text-[11px] font-mono font-bold">{{ magick.settings.thresholdPercentage[0] }}%</span>
                                </div>
                                <Slider v-model="magick.settings.thresholdPercentage" :max="100" :min="0" :step="1" />
                            </div>
                            <div class="space-y-1.5">
                                <div class="flex justify-between items-center">
                                    <span class="text-[11px] text-muted-foreground">Sigmoidal Contrast</span>
                                    <span class="text-[11px] font-mono font-bold">{{ magick.settings.sigmoidalContrast[0] }}</span>
                                </div>
                                <Slider v-model="magick.settings.sigmoidalContrast" :max="20" :min="-20" :step="1" />
                            </div>
                         </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </AccordionContent>
          </AccordionItem>

          <!-- Filters Section -->
          <AccordionItem value="filters" class="border-b px-4">
             <AccordionTrigger class="hover:no-underline py-3.5 group cursor-pointer">
                <div class="flex items-center gap-2.5">
                    <Wand2 class="w-4 h-4 text-primary" />
                    <span class="text-xs font-bold uppercase tracking-wider">Filters</span>
                    <div v-if="magick.settings.effect !== 'none' || magick.settings.blur[0] > 0 || magick.settings.sharpen[0] > 0" class="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button @click.stop="magick.resetFilters()" variant="ghost" size="icon" class="h-6 w-6 ml-auto mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-50">
                          <RefreshCcw class="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Reset Filters</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </AccordionTrigger>
            <AccordionContent class="pb-4 space-y-4">
                <div class="space-y-2">
                    <Label class="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Effect Preset</Label>
                    <Select v-model="magick.settings.effect">
                        <SelectTrigger class="h-9">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None (Original)</SelectItem>
                            <SelectItem value="grayscale">Grayscale</SelectItem>
                            <SelectItem value="sepia">Sepia Tone</SelectItem>
                            <SelectItem value="charcoal">Charcoal Sketch</SelectItem>
                            <SelectItem value="negate">Negative</SelectItem>
                            <SelectItem value="cannyEdge">Edge Detection</SelectItem>
                            <SelectItem value="oilpaint">Oil Paint</SelectItem>
                            <SelectItem value="solarize">Solarize</SelectItem>
                            <SelectItem value="bilateralBlur">Bilateral Blur</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                 <!-- Effect Settings -->
                  <div v-if="magick.settings.effect !== 'none'" class="p-3 border border-border rounded-sm bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-50">
                     <div v-if="magick.settings.effect === 'sepia'" class="space-y-1.5">
                        <div class="flex justify-between">
                          <span class="text-[11px] font-medium text-muted-foreground">Threshold</span>
                          <span class="text-[11px] font-mono font-bold">{{ magick.settings.sepiaThreshold[0] }}%</span>
                        </div>
                        <Slider v-model="magick.settings.sepiaThreshold" :max="100" :min="0" :step="1" />
                     </div>
                     
                     <div v-if="magick.settings.effect === 'oilpaint'" class="space-y-1.5">
                        <div class="flex justify-between">
                          <span class="text-[11px] font-medium text-muted-foreground">Radius</span>
                          <span class="text-[11px] font-mono font-bold">{{ magick.settings.oilpaintRadius[0] }}</span>
                        </div>
                        <Slider v-model="magick.settings.oilpaintRadius" :max="15" :min="0" :step="0.5" />
                     </div>

                     <div v-if="magick.settings.effect === 'solarize'" class="space-y-1.5">
                        <div class="flex justify-between">
                          <span class="text-[11px] font-medium text-muted-foreground">Factor</span>
                          <span class="text-[11px] font-mono font-bold">{{ magick.settings.solarizeFactor[0] }}%</span>
                        </div>
                        <Slider v-model="magick.settings.solarizeFactor" :max="100" :min="0" :step="1" />
                     </div>

                     <div v-if="magick.settings.effect === 'cannyEdge'" class="space-y-3">
                         <div class="space-y-1.5">
                            <div class="flex justify-between">
                              <span class="text-[11px] font-medium text-muted-foreground">Strength</span>
                              <span class="text-[11px] font-mono font-bold">{{ magick.settings.cannyEdgeStrength[0] }}</span>
                            </div>
                            <Slider v-model="magick.settings.cannyEdgeStrength" :max="10" :min="0" :step="0.1" />
                         </div>
                         <div class="space-y-1.5">
                            <div class="flex justify-between">
                              <span class="text-[11px] font-medium text-muted-foreground">Lower Threshold</span>
                              <span class="text-[11px] font-mono font-bold">{{ magick.settings.cannyEdgeLower[0] }}%</span>
                            </div>
                            <Slider v-model="magick.settings.cannyEdgeLower" :max="100" :min="0" :step="1" />
                         </div>
                         <div class="space-y-1.5">
                            <div class="flex justify-between">
                              <span class="text-[11px] font-medium text-muted-foreground">Upper Threshold</span>
                              <span class="text-[11px] font-mono font-bold">{{ magick.settings.cannyEdgeUpper[0] }}%</span>
                            </div>
                            <Slider v-model="magick.settings.cannyEdgeUpper" :max="100" :min="0" :step="1" />
                         </div>
                     </div>

                     <div v-if="magick.settings.effect === 'bilateralBlur'" class="space-y-3">
                        <div class="space-y-1.5">
                            <div class="flex justify-between">
                              <span class="text-[11px] font-medium text-muted-foreground">Width</span>
                              <span class="text-[11px] font-mono font-bold">{{ magick.settings.bilateralWidth[0] }}</span>
                            </div>
                            <Slider v-model="magick.settings.bilateralWidth" :max="20" :min="0" :step="1" />
                        </div>
                        <div class="space-y-1.5">
                            <div class="flex justify-between">
                              <span class="text-[11px] font-medium text-muted-foreground">Height</span>
                              <span class="text-[11px] font-mono font-bold">{{ magick.settings.bilateralHeight[0] }}</span>
                            </div>
                            <Slider v-model="magick.settings.bilateralHeight" :max="20" :min="0" :step="1" />
                        </div>
                     </div>
                     
                     <div v-if="['grayscale', 'negate', 'charcoal'].includes(magick.settings.effect)" class="text-[11px] text-center text-muted-foreground py-1">
                        No additional parameters for this effect
                     </div>
                </div>

                <!-- Blur & Sharpen -->
                <div class="grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-border/60">
                    <div class="space-y-1.5">
                        <div class="flex justify-between">
                          <Label class="text-[11px] uppercase font-semibold text-muted-foreground tracking-wide">Blur</Label>
                          <span class="text-[11px] font-mono font-bold">{{ magick.settings.blur[0] }}</span>
                        </div>
                        <Slider v-model="magick.settings.blur" :max="20" :min="0" :step="0.5" />
                    </div>
                    <div class="space-y-1.5">
                         <div class="flex justify-between">
                           <Label class="text-[11px] uppercase font-semibold text-muted-foreground tracking-wide">Sharpen</Label>
                           <span class="text-[11px] font-mono font-bold">{{ magick.settings.sharpen[0] }}</span>
                         </div>
                         <Slider v-model="magick.settings.sharpen" :max="10" :min="0" :step="0.5" />
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <!-- Footer Actions -->
      <div class="p-4 border-t space-y-3">
        <div class="flex gap-2">
            <Button 
                @click="magick.processImage(debugMode, () => { emit('file-changed'); })" 
                :disabled="!magick.wasmLoaded.value || !magick.originalImageUrl.value" 
                variant="secondary"
                class="flex-1 font-bold uppercase tracking-wider h-11 shadow-md hover:shadow-lg transition-shadow duration-50"
            >
                Process Image
            </Button>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button 
                          @click="magick.downloadImage()" 
                          :disabled="!magick.processedImageUrl.value" 
                          variant="outline" 
                          class="h-11 w-11 p-0 shadow-sm hover:shadow-md transition-shadow duration-50"
                        >
                            <Download class="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download Result</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
        <div class="h-5 flex items-center justify-center">
            <span v-if="magick.statsMessage.value" class="text-[11px] font-bold text-primary tracking-widest font-mono">
                {{ magick.statsMessage.value }}
            </span>
            <span v-else-if="!magick.wasmLoaded.value" class="text-[11px] text-amber-500 font-bold">
                Initializing WASM Engine...
            </span>
            <span v-else class="text-[11px] text-muted-foreground/50 font-semibold tracking-wide">
                Ready to Process
            </span>
        </div>
      </div>
    </aside>
</template>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.2) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.2);
  border-radius: 10px;
  transition: background 0.1s;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.3);
}

/* Remove number input spinners */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance: textfield;
}

input[type=range] {
  cursor: pointer;
}

/* Ensure smooth slider transitions */
[role="slider"] {
  transition: none !important;
}

/* Prevent lag on slider thumb during drag */
.slider-thumb {
  will-change: transform;
  transition: box-shadow 0.1s ease;
}
</style>