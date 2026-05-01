<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  options: readonly { key: string; label: string }[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const segRef = ref<HTMLElement | null>(null)
const indicator = ref({ left: 0, width: 0, show: false })

function updateIndicator() {
  if (!segRef.value) return
  const active = segRef.value.querySelector<HTMLElement>('button.active')
  if (!active) return
  indicator.value = { left: active.offsetLeft, width: active.offsetWidth, show: true }
}

watch(
  () => props.modelValue,
  () => nextTick(updateIndicator)
)
onMounted(() => {
  nextTick(updateIndicator)
  window.addEventListener('resize', updateIndicator)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateIndicator))
</script>

<template>
  <div ref="segRef" class="seg">
    <span
      class="seg-indicator"
      v-show="indicator.show"
      :style="{ transform: `translateX(${indicator.left - 2}px)`, width: indicator.width + 'px' }"
    />
    <button
      v-for="opt in options"
      :key="opt.key"
      :class="{ active: modelValue === opt.key }"
      @click="emit('update:modelValue', opt.key)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  position: relative;
  display: inline-flex;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 2px;
  isolation: isolate;
}
.seg-indicator {
  position: absolute;
  top: 2px;
  bottom: 2px;
  background: var(--primary);
  border-radius: 2px;
  z-index: 0;
  transition:
    transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1),
    width 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 0 18px var(--primary-glow);
}
.seg button {
  background: transparent;
  border: none;
  padding: 4px 10px;
  font-size: 11.5px;
  cursor: pointer;
  font-weight: 500;
  border-radius: 2px;
  position: relative;
  z-index: 1;
  color: var(--text-3);
  transition: color 240ms ease;
}
.seg button:hover {
  color: var(--text-2);
}
.seg button.active {
  color: var(--bg);
}

@media (prefers-reduced-motion: reduce) {
  .seg-indicator {
    transition: none;
  }
}
</style>
