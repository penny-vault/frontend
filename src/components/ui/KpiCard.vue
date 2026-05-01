<script setup lang="ts">
defineProps<{
  label: string
  big?: boolean
}>()
</script>

<template>
  <article class="kpi" :class="{ big }">
    <div class="kpi-label">{{ label }}</div>
    <slot />
  </article>
</template>

<style scoped>
.kpi {
  background: var(--panel);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: background 220ms ease;
  position: relative;
}
.kpi::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid transparent;
  pointer-events: none;
  transition: border-color 220ms ease;
}
.kpi:hover {
  background: var(--panel-hover);
}
.kpi:hover::after {
  border-color: var(--primary-border);
}
.kpi.big {
  background: var(--grad-kpi-big);
  position: relative;
  overflow: hidden;
}
.kpi.big::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: var(--glow-kpi);
  pointer-events: none;
}
.kpi-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
  font-weight: 500;
}
:deep(.kpi-value) {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 34px;
  font-weight: 300;
  letter-spacing: -0.02em;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  position: relative;
  z-index: 1;
}
:deep(.kpi-value.small) {
  font-size: 22px;
  font-weight: 400;
}
:deep(.kpi-value .ccy) {
  color: var(--text-3);
  font-weight: 300;
  margin-right: 2px;
}
:deep(.kpi-value.up) {
  color: var(--gain);
}
:deep(.kpi-value.warn) {
  color: var(--secondary);
}
:deep(.kpi-value .divider-slash) {
  color: var(--text-5);
  font-weight: 300;
}
:deep(.kpi-sub) {
  font-size: 12px;
  color: var(--text-3);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

@media (max-width: 720px) {
  :deep(.kpi-value) {
    font-size: 26px;
  }
}
</style>
