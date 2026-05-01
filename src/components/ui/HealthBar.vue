<script setup lang="ts">
export interface HealthSegment {
  filled: boolean
  tone: 'ok' | 'warn' | 'err'
}

defineProps<{
  segments: HealthSegment[]
  /** Stagger base delay in ms for the mount-reveal animation */
  baseDelay?: number
  /** When true, triggers the cascade bounce animation */
  hovering?: boolean
}>()
</script>

<template>
  <div class="health" :class="{ hovering }">
    <span
      v-for="(seg, i) in segments"
      :key="i"
      class="hseg"
      :class="[seg.tone, seg.filled ? 'on' : '']"
      :style="{ '--d': `${(baseDelay ?? 0) + i * 70}ms`, '--i': i }"
    />
  </div>
</template>

<style scoped>
.health {
  display: inline-flex;
  gap: 3px;
}

.hseg {
  width: 10px;
  height: 14px;
  background: var(--border);
  border-radius: 1px;
  transform-origin: bottom;
}

.hseg.on.ok {
  background: var(--gain);
}

.hseg.on.warn {
  background: var(--secondary);
}

.hseg.on.err {
  background: var(--loss);
}

@keyframes hseg-bounce {
  0% {
    transform: scaleY(1);
  }
  30% {
    transform: scaleY(1.32);
  }
  58% {
    transform: scaleY(0.84);
  }
  78% {
    transform: scaleY(1.12);
  }
  92% {
    transform: scaleY(0.96);
  }
  100% {
    transform: scaleY(1);
  }
}

.health.hovering .hseg {
  animation: hseg-bounce 580ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--i, 0) * 55ms);
}

@media (prefers-reduced-motion: reduce) {
  .hseg {
    transform: none;
    opacity: 1;
    transition: none;
  }

  .health.hovering .hseg {
    animation: none;
  }
}
</style>
