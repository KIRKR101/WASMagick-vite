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
import { UploadCloud, X, Moon, Sun, Bug, Download, RotateCw, RefreshCcw } from 'lucide-vue-next';

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
</script>

<template>
    <aside class="sidebar bg-background flex flex-col border-r shadow-lg h-screen z-10">
      <header class="brand flex items-center justify-between gap-2 px-4 py-3 border-b h-14 shrink-0">
        <div class="flex items-center gap-2">
            <h1 class="text-lg font-bold tracking-tight text-foreground">WASMagick</h1>
        </div>

        <div class="flex items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button @click="$emit('toggle-debug')" :variant="debugMode ? 'secondary' : 'ghost'" size="icon" class="w-8 h-8">
                            <Bug class="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Toggle Debug Mode</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Button @click="$emit('toggle-theme')" variant="ghost" size="icon" class="w-8 h-8">
                <Sun class="w-4 h-4 dark:hidden" />
                <Moon class="w-4 h-4 hidden dark:block" />
            </Button>
        </div>
      </header>

      <div class="scroll-container flex-grow overflow-y-auto px-4 py-6 custom-scrollbar space-y-6">
        
        <!-- File Input Section -->
        <div class="section-upload">
          <div v-if="!magick.originalImageUrl.value">
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
                <img :src="magick.originalImageUrl.value" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-center h-16">
                <span class="text-sm font-medium text-foreground truncate block">{{ magick.originalName.value }}</span>
                <span class="text-xs text-muted-foreground">{{ (magick.originalImageSize.value / 1024).toFixed(1) }} KB</span>
            </div>
            <Button @click="magick.clearSource()" variant="ghost" size="icon" class="w-6 h-6 absolute top-2 right-2 text-muted-foreground hover:text-destructive">
              <X class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button @click="magick.resetSettings()" variant="secondary" size="sm" class="w-full text-muted-foreground hover:text-foreground">
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
                    <Select v-model="magick.settings.imageFormat">
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
                        <span class="text-xs font-mono text-primary">{{ magick.settings.quality[0] }}</span>
                    </div>
                    <div class="h-9 flex items-center">
                        <Slider v-model="magick.settings.quality" :max="100" :min="1" :step="1" />
                    </div>
                  </div>
              </div>
              
              <div class="flex items-center justify-between bg-muted/30 p-2 rounded-md border">
                <Label for="stripMeta" class="text-xs font-medium cursor-pointer">Strip EXIF Data</Label>
                <Switch id="stripMeta" v-model="magick.settings.stripMeta" class="scale-75 origin-right" />
              </div>
            </AccordionContent>
          </AccordionItem>

          <!-- Geometry -->
          <AccordionItem value="geometry" class="border rounded-lg mb-2 last:mb-0 shadow-sm bg-card overflow-hidden">
            <AccordionTrigger class="px-3 py-3 text-sm font-semibold hover:no-underline hover:bg-muted/30 transition-colors pr-2">
              <div class="flex items-center gap-2">
                  <span>Geometry</span>
                  <div v-if="magick.settings.resizeW || magick.settings.resizeH || magick.settings.rotate !== '0'" class="w-1.5 h-1.5 rounded-full bg-primary"></div>
              </div>
              <Button @click.stop="magick.resetGeometry()" variant="ghost" size="icon" class="w-6 h-6 ml-auto mr-2 text-muted-foreground" title="Reset Geometry">
                <RefreshCcw class="w-3 h-3" />
              </Button>
            </AccordionTrigger>
            <AccordionContent class="px-3 pb-4 pt-1 space-y-4">
              <!-- Resize -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <Label class="text-xs text-muted-foreground">Width (px)</Label>
                  <Input type="number" v-model="magick.settings.resizeW" min="0" placeholder="Auto" class="h-8 text-sm no-spinner" />
                </div>
                <div class="space-y-1.5">
                  <Label class="text-xs text-muted-foreground">Height (px)</Label>
                  <Input type="number" v-model="magick.settings.resizeH" min="0" placeholder="Auto" class="h-8 text-sm no-spinner" />
                </div>
              </div>

              <!-- Rotate & Flip -->
              <div class="grid grid-cols-2 gap-3 items-end">
                <div class="space-y-1.5">
                    <Label class="text-xs text-muted-foreground">Rotate</Label>
                    <Select v-model="magick.settings.rotate">
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
                        <Switch id="flop" v-model="magick.settings.flop" class="scale-75" />
                        <Label for="flop" class="text-xs cursor-pointer">Flop</Label>
                    </div>
                    <div class="w-px h-4 bg-border"></div>
                    <div class="flex items-center gap-1.5" title="Flip (Vertical Mirror)">
                        <Switch id="flip" v-model="magick.settings.flip" class="scale-75" />
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
                             <span class="text-xs font-mono text-muted-foreground">{{ magick.settings.borderSize[0] }}px</span>
                         </div>
                         <Slider v-model="magick.settings.borderSize" :max="50" :min="0" :step="1" />
                      </div>
                      <div class="w-12 space-y-1.5">
                          <Label class="text-xs text-muted-foreground">Color</Label>
                          <div class="h-8 w-full rounded-md border overflow-hidden p-0.5 relative">
                              <input type="color" v-model="magick.settings.borderColor" class="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer" />
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Extent -->
              <div class="space-y-3 pt-2 border-t">
                <Label class="text-xs font-semibold text-foreground/80">Extent (Canvas)</Label>
                <div class="grid grid-cols-2 gap-3">
                    <Input type="number" v-model="magick.settings.extentW" min="0" placeholder="W" class="h-8 text-sm no-spinner" />
                    <Input type="number" v-model="magick.settings.extentH" min="0" placeholder="H" class="h-8 text-sm no-spinner" />
                </div>
                <div class="grid grid-cols-[1fr_3rem] gap-3">
                     <Select v-model="magick.settings.extentGravity">
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
                         <input type="color" v-model="magick.settings.extentBgColor" class="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer" />
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
                         <Switch id="deskewAuto" v-model="magick.settings.deskewAutoCrop" class="scale-75" />
                     </div>
                 </div>
                 <div class="space-y-1.5">
                     <div class="flex justify-between">
                        <Label class="text-xs text-muted-foreground">Threshold</Label>
                        <span class="text-xs font-mono text-muted-foreground">{{ magick.settings.deskewThreshold[0] }}%</span>
                     </div>
                     <Slider v-model="magick.settings.deskewThreshold" :max="100" :min="0" :step="1" />
                 </div>
               </div>
            </AccordionContent>
          </AccordionItem>

          <!-- Color Adjust -->
          <AccordionItem value="color" class="border rounded-lg mb-2 last:mb-0 shadow-sm bg-card overflow-hidden">
            <AccordionTrigger class="px-3 py-3 text-sm font-semibold hover:no-underline hover:bg-muted/30 transition-colors pr-2">
                <div class="flex items-center gap-2">
                    <span>Color Adjust</span>
                    <div v-if="magick.settings.brightness[0] !== 100 || magick.settings.contrast[0] !== 0 || magick.settings.saturation[0] !== 100" class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                </div>
                <Button @click.stop="magick.resetColor()" variant="ghost" size="icon" class="w-6 h-6 ml-auto mr-2 text-muted-foreground" title="Reset Colors">
                    <RefreshCcw class="w-3 h-3" />
                </Button>
            </AccordionTrigger>
            <AccordionContent class="px-3 pb-4 pt-1 space-y-5">
                <!-- Main Sliders -->
                <div class="space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label class="text-xs text-muted-foreground">Brightness</Label>
                            <span class="text-xs font-mono text-primary">{{ magick.settings.brightness[0] }}%</span>
                        </div>
                        <Slider v-model="magick.settings.brightness" :min="0" :max="200" />
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label class="text-xs text-muted-foreground">Contrast</Label>
                            <span class="text-xs font-mono text-primary">{{ magick.settings.contrast[0] }}</span>
                        </div>
                        <Slider v-model="magick.settings.contrast" :min="-100" :max="100" />
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label class="text-xs text-muted-foreground">Saturation</Label>
                            <span class="text-xs font-mono text-primary">{{ magick.settings.saturation[0] }}%</span>
                        </div>
                        <Slider v-model="magick.settings.saturation" :min="0" :max="300" />
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label class="text-xs text-muted-foreground">Hue</Label>
                            <span class="text-xs font-mono text-primary">{{ magick.settings.hue[0] }}%</span>
                        </div>
                        <Slider v-model="magick.settings.hue" :min="0" :max="200" />
                    </div>
                </div>

                <div class="space-y-1.5 pt-2 border-t">
                    <Label class="text-xs text-muted-foreground">Color Space</Label>
                    <Select v-model="magick.settings.colorSpace">
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
                        <Switch id="normalize" v-model="magick.settings.normalizeImage" class="scale-75" />
                     </div>
                     <div class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label class="text-xs cursor-pointer" for="autoLevel">Auto Level</Label>
                        <Switch id="autoLevel" v-model="magick.settings.autoLevel" class="scale-75" />
                     </div>
                     <div class="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <Label class="text-xs cursor-pointer" for="autoOrient">Auto Orient</Label>
                        <Switch id="autoOrient" v-model="magick.settings.autoOrient" class="scale-75" />
                     </div>
                </div>

                <!-- Levels -->
                <div class="space-y-3 pt-2 border-t">
                    <div class="flex items-center justify-between mb-2">
                        <Label class="text-xs font-semibold text-foreground/80">Levels</Label>
                        <Select v-model="magick.settings.levelChannels">
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
                             <div class="flex justify-between"><Label class="text-[10px] text-muted-foreground">Black Point</Label><span class="text-[10px] font-mono">{{ magick.settings.levelBlackpoint[0] }}</span></div>
                             <Slider v-model="magick.settings.levelBlackpoint" :max="100" :min="0" :step="1" />
                         </div>
                         <div class="space-y-1.5">
                             <div class="flex justify-between"><Label class="text-[10px] text-muted-foreground">White Point</Label><span class="text-[10px] font-mono">{{ magick.settings.levelWhitepoint[0] }}</span></div>
                             <Slider v-model="magick.settings.levelWhitepoint" :max="100" :min="0" :step="1" />
                         </div>
                         <div class="space-y-1.5">
                            <Label class="text-[10px] text-muted-foreground">Gamma</Label>
                            <Input type="number" v-model="magick.settings.levelGamma" step="0.1" class="h-7 text-xs no-spinner" />
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
                                    <span class="text-[10px] font-mono">{{ magick.settings.thresholdPercentage[0] }}%</span>
                                </div>
                                <Slider v-model="magick.settings.thresholdPercentage" :max="100" :min="0" :step="1" />
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <Label class="text-xs">Sigmoidal Contrast</Label>
                                    <span class="text-[10px] font-mono">{{ magick.settings.sigmoidalContrast[0] }}</span>
                                </div>
                                <Slider v-model="magick.settings.sigmoidalContrast" :max="20" :min="-20" :step="1" />
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
                    <div v-if="magick.settings.effect !== 'none' || magick.settings.blur[0] > 0 || magick.settings.sharpen[0] > 0" class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                </div>
                <Button @click.stop="magick.resetFilters()" variant="ghost" size="icon" class="w-6 h-6 ml-auto mr-2 text-muted-foreground" title="Reset Filters">
                    <RefreshCcw class="w-3 h-3" />
                </Button>
            </AccordionTrigger>
            <AccordionContent class="px-3 pb-4 pt-1 space-y-4">
                <div class="space-y-1.5">
                    <Label class="text-xs text-muted-foreground">Effect Mode</Label>
                    <Select v-model="magick.settings.effect">
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
                <div v-if="magick.settings.effect !== 'none'" class="p-3 bg-muted/30 rounded-md border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                     <div v-if="magick.settings.effect === 'sepia'" class="space-y-1.5">
                        <div class="flex justify-between"><Label class="text-xs">Threshold</Label><span class="text-xs font-mono">{{ magick.settings.sepiaThreshold[0] }}</span></div>
                        <Slider v-model="magick.settings.sepiaThreshold" />
                     </div>
                     <div v-if="magick.settings.effect === 'oilpaint'" class="space-y-1.5">
                        <div class="flex justify-between"><Label class="text-xs">Radius</Label><span class="text-xs font-mono">{{ magick.settings.oilpaintRadius[0] }}</span></div>
                        <Slider v-model="magick.settings.oilpaintRadius" :max="15" :step="0.5" />
                     </div>
                     <div v-if="magick.settings.effect === 'solarize'" class="space-y-1.5">
                        <div class="flex justify-between"><Label class="text-xs">Factor</Label><span class="text-xs font-mono">{{ magick.settings.solarizeFactor[0] }}</span></div>
                        <Slider v-model="magick.settings.solarizeFactor" />
                     </div>
                     <div v-if="magick.settings.effect === 'cannyEdge'" class="space-y-3">
                         <div class="space-y-1.5">
                            <div class="flex justify-between"><Label class="text-xs">Strength</Label><span class="text-xs font-mono">{{ magick.settings.cannyEdgeStrength[0] }}</span></div>
                            <Slider v-model="magick.settings.cannyEdgeStrength" />
                         </div>
                         <div class="space-y-1.5">
                            <div class="flex justify-between"><Label class="text-xs">Lower</Label><span class="text-xs font-mono">{{ magick.settings.cannyEdgeLower[0] }}%</span></div>
                            <Slider v-model="magick.settings.cannyEdgeLower" />
                         </div>
                         <div class="space-y-1.5">
                            <div class="flex justify-between"><Label class="text-xs">Upper</Label><span class="text-xs font-mono">{{ magick.settings.cannyEdgeUpper[0] }}%</span></div>
                            <Slider v-model="magick.settings.cannyEdgeUpper" />
                         </div>
                     </div>
                     <div v-if="magick.settings.effect === 'bilateralBlur'" class="space-y-3">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1"><Label class="text-[10px]">Width</Label><Slider v-model="magick.settings.bilateralWidth" :max="10" :step="1" /></div>
                            <div class="space-y-1"><Label class="text-[10px]">Height</Label><Slider v-model="magick.settings.bilateralHeight" :max="10" :step="1" /></div>
                        </div>
                     </div>
                </div>

                <div class="space-y-3 pt-2 border-t">
                    <div class="space-y-1.5">
                        <div class="flex justify-between"><Label class="text-xs text-muted-foreground">Blur</Label><span class="text-xs font-mono text-primary">{{ magick.settings.blur[0] }}</span></div>
                        <Slider v-model="magick.settings.blur" :max="20" :step="0.5" />
                    </div>
                    <div class="space-y-1.5">
                         <div class="flex justify-between"><Label class="text-xs text-muted-foreground">Sharpen</Label><span class="text-xs font-mono text-primary">{{ magick.settings.sharpen[0] }}</span></div>
                         <Slider v-model="magick.settings.sharpen" />
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
                <Button @click="magick.processImage(debugMode, () => emit('file-changed'))" :disabled="!magick.wasmLoaded.value || !magick.originalImageUrl.value" class="flex-1 font-semibold shadow-sm">Process</Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                <p>Process Image (Ctrl+Enter)</p>
                </TooltipContent>
            </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
            <Tooltip>
                <TooltipTrigger as-child>
                <Button @click="magick.downloadImage()" :disabled="!magick.processedImageUrl.value" variant="outline" size="icon" class="w-10 shrink-0">
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
           {{ magick.statsMessage.value }}
        </div>
      </div>
    </aside>
</template>

<style scoped>
.accordion-content {
    overflow: hidden;
}
</style>