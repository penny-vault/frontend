<script setup lang="ts">
defineProps<{
  /** Fraction 0–1 representing how full the bar is */
  value: number
  /** CSS gradient or color for the fill */
  gradient?: string
  /** Stagger delay in ms before the grow animation starts */
  delay?: number
  /** When true, the bar grows to its target width */
  animate?: boolean
}>()
</script>

<template>
  <div class="animated-bar">
    <span
      :class="{ grown: animate }"
      :style="{
        '--w': value * 100 + '%',
        '--delay': (delay ?? 0) + 'ms',
        background: gradient
      }"
    />
  </div>
</template>

<style scoped>
.animated-bar {
  height: 3px;
  background: var(--bg-alt);
  border-radius: 1px;
  overflow: hidden;
}
.animated-bar span {
  display: block;
  height: 100%;
  width: 0;
  border-radius: 1px;
  transition: width 900ms cubic-bezier(0.2, 0.8, 0.2, 1);
  transition-delay: var(--delay, 0ms);
}
.animated-bar span.grown {
  width: var(--w, 0%);
}
@media (prefers-reduced-motion: reduce) {
  .animated-bar span {
    transition: none;
  }
}
</style>
