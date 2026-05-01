<script setup lang="ts">
defineProps<{
  tone: 'ok' | 'warn' | 'err'
  pulse?: boolean
}>()
</script>

<template>
  <span class="status-dot" :class="[tone, { pulse }]" />
</template>

<style scoped>
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gain);
  position: relative;
}
.status-dot.warn {
  background: var(--secondary);
}
.status-dot.err {
  background: var(--loss);
}
.status-dot.ok {
  background: var(--gain);
}
.status-dot.pulse::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: inherit;
  animation: dot-pulse 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  opacity: 0;
}
.status-dot.pulse.ok::before {
  background: var(--gain);
}
.status-dot.pulse.warn::before {
  background: var(--secondary);
}
.status-dot.pulse.err::before {
  background: var(--loss);
}
@keyframes dot-pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-dot.pulse::before {
    animation: none;
  }
}
</style>
