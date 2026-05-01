<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits<{
  clear: []
}>()
</script>

<template>
  <Transition name="focus-banner">
    <div v-if="visible" class="focus-banner">
      <div class="fb-icon">
        <slot name="icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4.35-4.35" />
          </svg>
        </slot>
      </div>
      <div class="fb-body">
        <slot />
      </div>
      <button class="fb-clear" @click="$emit('clear')" aria-label="Clear">
        Clear
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.focus-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--grad-focus-banner);
  border: 1px solid var(--primary-border);
  border-radius: 2px;
  margin: 2px 0 -4px;
}
.fb-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  width: 24px;
  height: 24px;
  background: var(--primary-soft-15);
  border-radius: 2px;
  flex-shrink: 0;
}
.fb-body {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
:deep(.fb-title) {
  font-size: 12.5px;
  color: var(--text-2);
}
:deep(.fb-depth) {
  color: var(--primary);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin: 0 2px;
}
:deep(.fb-dates) {
  font-size: 11.5px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
:deep(.fb-dates .fb-arr) {
  color: var(--text-5);
  margin: 0 4px;
}
.fb-clear {
  font: inherit;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-3);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 4px 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition:
    color 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}
.fb-clear:hover {
  color: var(--text-1);
  border-color: var(--primary);
  background: var(--primary-soft-08);
}
.focus-banner-enter-active,
.focus-banner-leave-active {
  transition:
    opacity 260ms cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1),
    max-height 300ms cubic-bezier(0.2, 0.8, 0.2, 1),
    margin 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  overflow: hidden;
}
.focus-banner-enter-from,
.focus-banner-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
  margin-top: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.focus-banner-enter-to,
.focus-banner-leave-from {
  opacity: 1;
  max-height: 80px;
}

@media (prefers-reduced-motion: reduce) {
  .focus-banner-enter-active,
  .focus-banner-leave-active {
    transition: none;
  }
}
</style>
