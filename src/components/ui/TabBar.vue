<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type TabItem = string | { label: string; to?: string; disabled?: boolean }

const props = defineProps<{
  tabs: TabItem[]
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const route = useRoute()
const router = useRouter()
const navRef = ref<HTMLElement | null>(null)
const indicator = ref({ left: 0, width: 0, show: false })

const normalizedTabs = computed(() =>
  props.tabs.map((t): { label: string; to?: string; disabled?: boolean } =>
    typeof t === 'string' ? { label: t } : t
  )
)

// Longest-prefix match wins — prevents a parent route tab lighting up when a child is active.
const activeTabLabel = computed<string | null>(() => {
  const routed = normalizedTabs.value.filter((t) => t.to)
  const currentPath = route.path
  let best: { label: string; to?: string } | null = null
  for (const t of routed) {
    const to = t.to!
    const matches = currentPath === to || currentPath.startsWith(to + '/')
    if (!matches) continue
    if (!best || to.length > best.to!.length) best = t
  }
  return best?.label ?? null
})

function isActive(tab: { label: string; to?: string }): boolean {
  if (tab.to) return activeTabLabel.value === tab.label
  return props.modelValue === tab.label
}

const selectedLabel = computed<string>(() => {
  const routed = activeTabLabel.value
  if (routed) return routed
  if (props.modelValue) return props.modelValue
  const first = normalizedTabs.value.find((t) => !t.disabled)
  return first?.label ?? ''
})

function onSelectChange(event: Event) {
  const label = (event.target as HTMLSelectElement).value
  const tab = normalizedTabs.value.find((t) => t.label === label)
  if (!tab || tab.disabled) return
  if (tab.to) router.push(tab.to)
  else emit('update:modelValue', tab.label)
}

function updateIndicator() {
  if (!navRef.value) return
  const active = navRef.value.querySelector<HTMLElement>('.tab-bar-item.active')
  if (!active) {
    indicator.value = { left: 0, width: 0, show: false }
    return
  }
  indicator.value = { left: active.offsetLeft, width: active.offsetWidth, show: true }
}

watch(
  () => [props.modelValue, route.path],
  () => nextTick(updateIndicator)
)
onMounted(() => {
  nextTick(updateIndicator)
  window.addEventListener('resize', updateIndicator)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateIndicator))
</script>

<template>
  <div class="tab-bar-wrap">
    <nav ref="navRef" class="tab-bar">
      <template v-for="tab in normalizedTabs" :key="tab.label">
        <span v-if="tab.disabled" class="tab-bar-item is-disabled" :aria-disabled="true">
          {{ tab.label }}
        </span>
        <router-link
          v-else-if="tab.to"
          :to="tab.to"
          class="tab-bar-item"
          :class="{ active: isActive(tab) }"
        >
          {{ tab.label }}
        </router-link>
        <a
          v-else
          class="tab-bar-item"
          :class="{ active: isActive(tab) }"
          @click="emit('update:modelValue', tab.label)"
        >
          {{ tab.label }}
        </a>
      </template>
      <span
        class="tab-underline"
        v-show="indicator.show"
        :style="{ transform: `translateX(${indicator.left}px)`, width: indicator.width + 'px' }"
      />
    </nav>
    <div class="tab-bar-select">
      <select :value="selectedLabel" aria-label="Section" @change="onSelectChange">
        <option
          v-for="tab in normalizedTabs"
          :key="tab.label"
          :value="tab.label"
          :disabled="tab.disabled"
        >
          {{ tab.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.tab-bar-wrap {
  margin-top: 8px;
}
.tab-bar {
  position: relative;
  display: flex;
  gap: 4px;
}
.tab-bar-select {
  display: none;
}
.tab-bar-item {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-3);
  cursor: pointer;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 180ms ease;
  position: relative;
  z-index: 1;
}
.tab-bar-item:hover {
  color: var(--text-2);
}
.tab-bar-item.active {
  color: var(--text-1);
}
.tab-bar-item.is-disabled {
  color: var(--text-4);
  cursor: not-allowed;
  opacity: 0.55;
}
.tab-bar-item.is-disabled:hover {
  color: var(--text-4);
}
.tab-underline {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--primary);
  transition:
    transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1),
    width 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
  border-radius: 1px;
  box-shadow: 0 0 12px var(--primary-glow);
}
@media (prefers-reduced-motion: reduce) {
  .tab-underline {
    transition: none;
  }
}
@media (max-width: 720px) {
  .tab-bar {
    display: none;
  }
  .tab-bar-select {
    display: block;
    position: relative;
  }
  .tab-bar-select::after {
    content: '';
    position: absolute;
    right: 14px;
    top: 50%;
    width: 8px;
    height: 8px;
    border-right: 2px solid var(--text-3);
    border-bottom: 2px solid var(--text-3);
    transform: translateY(-75%) rotate(45deg);
    pointer-events: none;
  }
  .tab-bar-select select {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    background: var(--bg-alt);
    color: var(--text-1);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 36px 10px 12px;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
  }
  .tab-bar-select select:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
  }
}
</style>
