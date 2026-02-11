<script setup>
import { reactiveOmit } from "@vueuse/core";
import { ChevronDown } from "lucide-vue-next";
import { AccordionHeader, AccordionTrigger } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTrigger
      v-bind="delegatedProps"
      :class="
        cn(
          'flex flex-1 items-center justify-between py-2.5 text-xs font-medium transition-all duration-50 hover:no-underline [&[data-state=open]>svg]:rotate-180 cursor-pointer',
          props.class,
        )
      "
    >
      <slot />
      <slot name="icon">
        <ChevronDown
          class="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-50"
        />
      </slot>
    </AccordionTrigger>
  </AccordionHeader>
</template>
