<script setup lang="ts">
import { ref, useSlots, computed } from 'vue'
import KpiCard from '@/components/ui/KpiCard.vue'

defineProps<{
  label: string
}>()

const slots = useSlots()
const hasBack = computed(() => !!slots.back)
const flipped = ref(false)

function toggle(): void {
  if (hasBack.value) flipped.value = !flipped.value
}

function onKey(e: KeyboardEvent): void {
  if (!hasBack.value) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    flipped.value = !flipped.value
  }
}
</script>

<template>
  <div
    class="fk-scene"
    :class="{ 'fk-flippable': hasBack }"
    :tabindex="hasBack ? 0 : undefined"
    :role="hasBack ? 'button' : undefined"
    :aria-pressed="hasBack ? flipped : undefined"
    @click="toggle"
    @keydown="onKey"
  >
    <div class="fk-card" :class="{ 'fk-flipped': flipped }">
      <div class="fk-face fk-front">
        <KpiCard :label="label">
          <slot />
          <span v-if="hasBack" class="fk-hint" aria-hidden="true">ⓘ</span>
        </KpiCard>
      </div>
      <div v-if="hasBack" class="fk-face fk-back">
        <KpiCard :label="label">
          <slot name="back" />
        </KpiCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fk-scene {
  display: grid;
  outline: none;
  perspective: 1000px;
}
.fk-scene.fk-flippable {
  cursor: pointer;
}
.fk-scene:focus-visible {
  box-shadow: 0 0 0 2px var(--primary);
  border-radius: 2px;
}
.fk-card {
  position: relative;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 450ms cubic-bezier(0.4, 0, 0.2, 1);
  transform: rotateY(0deg);
}
.fk-card.fk-flipped {
  transform: rotateY(180deg);
}
.fk-face {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.fk-front {
  position: relative;
  height: 100%;
}
.fk-back {
  position: absolute;
  inset: 0;
  transform: rotateY(180deg);
}
.fk-front :deep(.kpi),
.fk-back :deep(.kpi) {
  height: 100%;
  box-sizing: border-box;
}
.fk-hint {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 11px;
  color: var(--text-4);
  opacity: 0.65;
  pointer-events: none;
}
</style>
