<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <article class="panel">
    <header v-if="title || $slots.header">
      <slot name="header">
        <div>
          <h2 v-if="title">{{ title }}</h2>
          <p v-if="subtitle" class="panel-sub">{{ subtitle }}</p>
        </div>
      </slot>
    </header>
    <slot />
  </article>
</template>

<style scoped>
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition:
    border-color 220ms ease,
    transform 220ms ease,
    box-shadow 220ms ease;
}
.panel:hover {
  border-color: var(--text-4);
  transform: translateY(-1px);
  box-shadow: var(--shadow-panel);
}
.panel > header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
:deep(h2) {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: var(--text-1);
}
:deep(.panel-sub) {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    transition: none !important;
  }
}
</style>
