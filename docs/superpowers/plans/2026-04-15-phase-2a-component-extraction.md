# Phase 2a: Component Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 10 reusable UI components + 1 layout from the 2500-line `PortfolioSummary.vue` monolith so every future page can compose from a shared kit without duplication.

**Architecture:** Each component gets its own SFC in `src/components/ui/` (or `src/components/charts/` for ValueChart). Components consume CSS variables from the parent `.d-root` element — no prop-drilling colors. `MainLayout` wraps the router view and owns the app shell (top bar, nav, theme, scroll). PortfolioSummary becomes a thin ~300-line page that imports and composes the extracted components.

**Tech Stack:** Vue 3.5 `<script setup lang="ts">`, CSS custom properties for theming, Vitest for component tests, existing Playwright e2e as integration gate.

**Working directory:** `/Users/jdf/Developer/penny-vault/frontend-ng`

**Source of truth:** The current `src/pages/PortfolioSummary.vue` (2564 lines). Every component is extracted FROM this file. Read it before starting each task.

**Critical rule:** After every task, `npm run typecheck && npm run build && npm run test && npm run e2e` must all pass. The page must look and behave identically.

---

## Task 0: StatusDot

**Files:**
- Create: `src/components/ui/StatusDot.vue`
- Create: `tests/unit/components/StatusDot.spec.ts`
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Create the component**

Extract the `.status-dot` markup + styles from PortfolioSummary.vue into a new SFC:

```vue
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
/* Move ALL CSS rules for .status-dot, .status-dot.warn, .status-dot.err,
   .status-dot.ok, .status-dot.pulse::before, and @keyframes dot-pulse
   from PortfolioSummary.vue into this file */
</style>
```

Search PortfolioSummary.vue `<style>` for every rule matching `.status-dot` (including nested selectors and the `dot-pulse` keyframe). Move them here.

- [ ] **Step 2: Write the test**

`tests/unit/components/StatusDot.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusDot from '@/components/ui/StatusDot.vue'

describe('StatusDot', () => {
  it('renders with the tone class', () => {
    const wrapper = mount(StatusDot, { props: { tone: 'ok' } })
    expect(wrapper.find('.status-dot').classes()).toContain('ok')
  })

  it('adds pulse class when pulse prop is true', () => {
    const wrapper = mount(StatusDot, { props: { tone: 'warn', pulse: true } })
    expect(wrapper.find('.status-dot').classes()).toContain('pulse')
  })

  it('does not add pulse class by default', () => {
    const wrapper = mount(StatusDot, { props: { tone: 'err' } })
    expect(wrapper.find('.status-dot').classes()).not.toContain('pulse')
  })
})
```

- [ ] **Step 3: Use the component in PortfolioSummary.vue**

Import `StatusDot` and replace every `<span class="status-dot" :class="...">` in the template with `<StatusDot :tone="..." :pulse="..." />`. There are ~8 instances (risk gates table, drawdown list, meta row).

Remove the `.status-dot` CSS rules from PortfolioSummary.vue's `<style>` block since they now live in the component.

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract StatusDot component"
```

---

## Task 1: AnimatedBar

**Files:**
- Create: `src/components/ui/AnimatedBar.vue`
- Create: `tests/unit/components/AnimatedBar.spec.ts`
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Create the component**

The animated bar appears in two places: holdings weight bars (`.h-bar`) and drawdown depth bars (`.dd-bar`). Both share the pattern: a container div with a child `<span>` that grows from `width: 0` to `width: var(--w)` on mount, with a staggered delay.

```vue
<script setup lang="ts">
const props = defineProps<{
  /** Fraction 0–1 */
  value: number
  /** CSS gradient for the fill, e.g. 'linear-gradient(90deg, var(--primary) 0%, var(--gain) 100%)' */
  gradient?: string
  /** Stagger delay in ms */
  delay?: number
}>()
</script>

<template>
  <div class="animated-bar">
    <span
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
/* The parent's .is-mounted class triggers the width growth.
   Since scoped CSS can't see parent classes, use :global or
   move the trigger to a prop like `animate`. */
</style>
```

**Design choice:** Add an `animate` boolean prop (default false). The parent sets it to `true` once mounted. In the component: `.animated-bar.animate span { width: var(--w); }`. This replaces the `.is-mounted .h-bar span` pattern.

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnimatedBar from '@/components/ui/AnimatedBar.vue'

describe('AnimatedBar', () => {
  it('renders with width 0 when animate is false', () => {
    const wrapper = mount(AnimatedBar, { props: { value: 0.58 } })
    const bar = wrapper.find('.animated-bar span')
    expect(bar.exists()).toBe(true)
    expect(bar.element.style.getPropertyValue('--w')).toBe('58%')
  })

  it('sets custom gradient via style', () => {
    const gradient = 'linear-gradient(90deg, red, blue)'
    const wrapper = mount(AnimatedBar, { props: { value: 0.5, gradient } })
    expect(wrapper.find('span').element.style.background).toContain('linear-gradient')
  })
})
```

- [ ] **Step 3: Replace in PortfolioSummary.vue**

Replace both `.h-bar` (holdings) and `.dd-bar` (drawdowns) divs with `<AnimatedBar>`. Pass the `animate` prop bound to `mounted` ref. Move the relevant CSS out.

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract AnimatedBar component"
```

---

## Task 2: HealthBar

**Files:**
- Create: `src/components/ui/HealthBar.vue`
- Create: `tests/unit/components/HealthBar.spec.ts`
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Create the component**

Extract the `.health` + `.hseg` markup from the risk gates table. The component renders N segments, each with a filled/empty state and a tone. On hover of the parent row, the segments bounce (cascade).

```vue
<script setup lang="ts">
export interface HealthSegment {
  filled: boolean
  tone: 'ok' | 'warn' | 'err'
}

defineProps<{
  segments: HealthSegment[]
  /** Base delay offset in ms for stagger (parent row index * stride) */
  baseDelay?: number
}>()
</script>

<template>
  <div class="health">
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
/* Move .health, .hseg, .hseg.on.ok/warn/err, @keyframes hseg-bounce,
   and the .pt-row:hover .hseg rule from PortfolioSummary.vue.
   Note: the hover-bounce trigger needs the parent row to have
   a hover state. Use :global(.pt-row:hover) .hseg or restructure
   the bounce trigger to work within the component. */
</style>
```

**Design note:** The cascade bounce on row hover requires the parent `.pt-row:hover` selector. Options: (a) use `:deep()` from the page, (b) add a `hovering` prop, (c) use CSS `:has()`. Recommend (b) — add `hovering?: boolean` prop, and when true, apply the bounce animation.

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HealthBar from '@/components/ui/HealthBar.vue'

describe('HealthBar', () => {
  const segments = [
    { filled: true, tone: 'ok' as const },
    { filled: true, tone: 'ok' as const },
    { filled: true, tone: 'ok' as const },
    { filled: false, tone: 'ok' as const },
    { filled: false, tone: 'ok' as const }
  ]

  it('renders the correct number of segments', () => {
    const wrapper = mount(HealthBar, { props: { segments } })
    expect(wrapper.findAll('.hseg')).toHaveLength(5)
  })

  it('marks filled segments with .on class', () => {
    const wrapper = mount(HealthBar, { props: { segments } })
    const segs = wrapper.findAll('.hseg')
    expect(segs[0]!.classes()).toContain('on')
    expect(segs[3]!.classes()).not.toContain('on')
  })

  it('applies tone class', () => {
    const mixed = [
      { filled: true, tone: 'warn' as const },
      { filled: true, tone: 'err' as const }
    ]
    const wrapper = mount(HealthBar, { props: { segments: mixed } })
    expect(wrapper.findAll('.hseg')[0]!.classes()).toContain('warn')
    expect(wrapper.findAll('.hseg')[1]!.classes()).toContain('err')
  })
})
```

- [ ] **Step 3: Replace in PortfolioSummary.vue**

Replace the `<div class="health">` + `v-for hseg` block in the risk gates table with `<HealthBar>`. Move the CSS.

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract HealthBar component"
```

---

## Task 3: KpiCard

**Files:**
- Create: `src/components/ui/KpiCard.vue`
- Create: `tests/unit/components/KpiCard.spec.ts`
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Create the component**

Extract the `<article class="kpi">` markup and its CSS. The "big" variant gets an extra class and a radial glow.

```vue
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
/* Move .kpi, .kpi.big, .kpi::after, .kpi:hover, .kpi.big::before,
   .kpi-label CSS from PortfolioSummary.vue */
</style>
```

Use a default slot for the value + sub content so the page controls formatting (each KPI card has different content structure).

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KpiCard from '@/components/ui/KpiCard.vue'

describe('KpiCard', () => {
  it('renders the label', () => {
    const wrapper = mount(KpiCard, {
      props: { label: 'Portfolio value' },
      slots: { default: '<div class="kpi-value">$310,000</div>' }
    })
    expect(wrapper.find('.kpi-label').text()).toBe('Portfolio value')
  })

  it('adds big class when big prop is true', () => {
    const wrapper = mount(KpiCard, {
      props: { label: 'Value', big: true },
      slots: { default: '<span>test</span>' }
    })
    expect(wrapper.find('.kpi').classes()).toContain('big')
  })

  it('does not add big class by default', () => {
    const wrapper = mount(KpiCard, {
      props: { label: 'Value' },
      slots: { default: '<span>test</span>' }
    })
    expect(wrapper.find('.kpi').classes()).not.toContain('big')
  })
})
```

- [ ] **Step 3: Replace in PortfolioSummary.vue**

Replace the 6 `<article class="kpi">` blocks with `<KpiCard>` components. The inner content (`.kpi-value`, `.kpi-sub`) stays as slot content in the page. Move the KPI CSS to the component.

Keep `.kpi-value`, `.kpi-sub`, `.kpi-value.up`, `.kpi-value.warn`, `.divider-slash` CSS in the page (these are content styles, not component styles) OR move them into the component if they're always the same.

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract KpiCard component"
```

---

## Task 4: Panel

**Files:**
- Create: `src/components/ui/Panel.vue`
- Create: `tests/unit/components/Panel.spec.ts`
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Create the component**

Extract the `.panel` container with hover lift. Supports optional title/subtitle via props and a header slot override.

```vue
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
/* Move .panel, .panel:hover, .panel > header, .panel h2, .panel-sub CSS
   from PortfolioSummary.vue */
</style>
```

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Panel from '@/components/ui/Panel.vue'

describe('Panel', () => {
  it('renders title and subtitle', () => {
    const wrapper = mount(Panel, {
      props: { title: 'Holdings', subtitle: '4 positions' },
      slots: { default: '<p>content</p>' }
    })
    expect(wrapper.find('h2').text()).toBe('Holdings')
    expect(wrapper.find('.panel-sub').text()).toBe('4 positions')
  })

  it('renders slot content', () => {
    const wrapper = mount(Panel, {
      slots: { default: '<p class="test">hello</p>' }
    })
    expect(wrapper.find('.test').text()).toBe('hello')
  })

  it('allows header slot override', () => {
    const wrapper = mount(Panel, {
      slots: {
        header: '<div class="custom-header">Custom</div>',
        default: '<p>body</p>'
      }
    })
    expect(wrapper.find('.custom-header').exists()).toBe(true)
  })
})
```

- [ ] **Step 3: Replace in PortfolioSummary.vue**

Replace every `<article class="panel ...">` with `<Panel>`. There are ~6 panel instances (chart panel, holdings panel, drawdowns, metrics, returns). Many use the header slot override (custom header with actions). Move `.panel` CSS to the component.

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract Panel component"
```

---

## Task 5: SegmentedControl

**Files:**
- Create: `src/components/ui/SegmentedControl.vue`
- Create: `tests/unit/components/SegmentedControl.spec.ts`
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Create the component**

Extract the `.seg` button group with the sliding `.seg-indicator`. This is the range picker (YTD/1y/3y/5y/10y/All).

```vue
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

watch(() => props.modelValue, () => nextTick(updateIndicator))
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
/* Move .seg, .seg-indicator, .seg button, .seg button.active,
   .seg button:hover CSS from PortfolioSummary.vue */
</style>
```

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'

const options = [
  { key: 'A', label: 'Alpha' },
  { key: 'B', label: 'Beta' },
  { key: 'C', label: 'Gamma' }
] as const

describe('SegmentedControl', () => {
  it('renders all options as buttons', () => {
    const wrapper = mount(SegmentedControl, { props: { options, modelValue: 'A' } })
    expect(wrapper.findAll('button')).toHaveLength(3)
  })

  it('marks the active button', () => {
    const wrapper = mount(SegmentedControl, { props: { options, modelValue: 'B' } })
    const buttons = wrapper.findAll('button')
    expect(buttons[1]!.classes()).toContain('active')
    expect(buttons[0]!.classes()).not.toContain('active')
  })

  it('emits update:modelValue on click', async () => {
    const wrapper = mount(SegmentedControl, { props: { options, modelValue: 'A' } })
    await wrapper.findAll('button')[2]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['C'])
  })
})
```

- [ ] **Step 3: Replace in PortfolioSummary.vue**

Replace the `<div ref="segRef" class="seg">` block with `<SegmentedControl>`. Pass `ranges` as options, bind `v-model` to `range`. Remove the `segRef`, `segIndicator`, `updateSegIndicator` logic from the page script. Move `.seg` CSS to the component.

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract SegmentedControl component"
```

---

## Task 6: TabBar

**Files:**
- Create: `src/components/ui/TabBar.vue`
- Create: `tests/unit/components/TabBar.spec.ts`
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Create the component**

Extract the `.d-tabs` nav with the animated `.tab-underline`. Same sliding-indicator pattern as SegmentedControl but for tab navigation.

```vue
<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  tabs: string[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const tabsRef = ref<HTMLElement | null>(null)
const indicator = ref({ left: 0, width: 0, show: false })

function updateIndicator() {
  if (!tabsRef.value) return
  const active = tabsRef.value.querySelector<HTMLElement>('a.active')
  if (!active) return
  indicator.value = { left: active.offsetLeft, width: active.offsetWidth, show: true }
}

watch(() => props.modelValue, () => nextTick(updateIndicator))
onMounted(() => {
  nextTick(updateIndicator)
  window.addEventListener('resize', updateIndicator)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateIndicator))
</script>

<template>
  <nav ref="tabsRef" class="tab-bar">
    <a
      v-for="tab in tabs"
      :key="tab"
      :class="{ active: modelValue === tab }"
      @click="emit('update:modelValue', tab)"
    >{{ tab }}</a>
    <span
      class="tab-underline"
      v-show="indicator.show"
      :style="{ transform: `translateX(${indicator.left}px)`, width: indicator.width + 'px' }"
    />
  </nav>
</template>

<style scoped>
/* Move .d-tabs (rename to .tab-bar), .d-tabs a, .d-tabs a.active,
   .d-tabs a:hover, .tab-underline CSS from PortfolioSummary.vue */
</style>
```

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TabBar from '@/components/ui/TabBar.vue'

describe('TabBar', () => {
  const tabs = ['Overview', 'Holdings', 'Settings']

  it('renders all tabs', () => {
    const wrapper = mount(TabBar, { props: { tabs, modelValue: 'Overview' } })
    expect(wrapper.findAll('a')).toHaveLength(3)
  })

  it('marks the active tab', () => {
    const wrapper = mount(TabBar, { props: { tabs, modelValue: 'Holdings' } })
    expect(wrapper.findAll('a')[1]!.classes()).toContain('active')
  })

  it('emits update:modelValue on click', async () => {
    const wrapper = mount(TabBar, { props: { tabs, modelValue: 'Overview' } })
    await wrapper.findAll('a')[2]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['Settings'])
  })
})
```

- [ ] **Step 3: Replace in PortfolioSummary.vue**

Replace the `<nav ref="tabsRef" class="d-tabs">` block with `<TabBar>`. Remove `tabsRef`, `tabIndicator`, `updateTabIndicator`, `tabs` array from the page script. Move CSS.

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract TabBar component"
```

---

## Task 7: FocusBanner

**Files:**
- Create: `src/components/ui/FocusBanner.vue`
- Create: `tests/unit/components/FocusBanner.spec.ts`
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Create the component**

Extract the `.focus-banner` with its `<Transition>` wrapper.

```vue
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-4.35-4.35" />
          </svg>
        </slot>
      </div>
      <div class="fb-body">
        <slot />
      </div>
      <button class="fb-clear" @click="$emit('clear')" aria-label="Clear">
        Clear
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
/* Move .focus-banner, .fb-icon, .fb-body, .fb-clear, .fb-clear:hover,
   .focus-banner-enter-active/leave-active/enter-from/leave-to/enter-to/leave-from CSS */
</style>
```

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FocusBanner from '@/components/ui/FocusBanner.vue'

describe('FocusBanner', () => {
  it('renders content when visible', () => {
    const wrapper = mount(FocusBanner, {
      props: { visible: true },
      slots: { default: '<span class="test">Focused</span>' }
    })
    expect(wrapper.find('.test').text()).toBe('Focused')
  })

  it('does not render when not visible', () => {
    const wrapper = mount(FocusBanner, {
      props: { visible: false },
      slots: { default: '<span>Hidden</span>' }
    })
    expect(wrapper.find('.focus-banner').exists()).toBe(false)
  })

  it('emits clear on button click', async () => {
    const wrapper = mount(FocusBanner, {
      props: { visible: true },
      slots: { default: '<span>Content</span>' }
    })
    await wrapper.find('.fb-clear').trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Replace in PortfolioSummary.vue**

Replace the `<Transition name="focus-banner"><div v-if="focusedDrawdown" class="focus-banner">...` block with `<FocusBanner>`. The drawdown detail content becomes the default slot. Move CSS.

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract FocusBanner component"
```

---

## Task 8: ValueChart

**Files:**
- Create: `src/components/charts/ValueChart.vue`
- Modify: `src/pages/PortfolioSummary.vue`

This is the most complex extraction. The chart panel includes: header with title/subtitle, range SegmentedControl (already extracted), log/DD toggles, legend row, focus banner (already extracted), and the ECharts canvas. The chart option computation + drawdown interaction logic moves into this component.

- [ ] **Step 1: Create the component**

Move the chart-related script logic (theme objects, `chartOption` computed, `drawdownSpan`, drawdown highlight logic) and the chart panel template into `ValueChart.vue`.

Props:
```ts
import type { TimeSeries, DrawdownRange, RangeKey, ChartTheme } from '@/util/chart'

defineProps<{
  series: TimeSeries
  drawdowns: DrawdownRange[]
  theme: ChartTheme
}>()
```

The component owns its own internal state: `range`, `logScale`, `showDrawDowns`, `hoveredDrawdown`, `focusedDrawdown`. It emits nothing — all interaction is self-contained.

Move the following from PortfolioSummary.vue script into ValueChart.vue:
- `range`, `logScale`, `showDrawDowns`, `hoveredDrawdown`, `focusedDrawdown` refs
- `drawdownSpan` function
- `toggleFocusDrawdown` function
- `chartOption` computed (the entire `buildValueChartOption` call + markArea/markLine overlay logic)
- The MutableMarkArea/MutableMarkLine types

Move the following template sections:
- The entire chart panel `<article class="panel chart-panel">` content (header, legend, focus banner, `<VChart>`)

Move the following CSS:
- `.chart-panel`, `.chart-tools`, `.legend-row`, `.lg`, `.chart`, and all drawdown-related chart CSS

- [ ] **Step 2: Replace in PortfolioSummary.vue**

Import `ValueChart` and replace the chart panel article with:

```vue
<ValueChart
  :series="chartSeries"
  :drawdowns="(portfolioData?.drawdowns ?? []) as DrawdownRange[]"
  :theme="theme"
  class="reveal"
  :style="{ '--d': '160ms' }"
/>
```

Remove all chart-related script logic, refs, and CSS from PortfolioSummary.vue.

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: extract ValueChart component"
```

---

## Task 9: MainLayout + Router Update

**Files:**
- Create: `src/layouts/MainLayout.vue`
- Modify: `src/router.ts`
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Create the layout**

Extract from PortfolioSummary.vue:
- The outer `<div class="d-root" :class="...">` wrapper with theme/mounted class bindings
- The `<header class="d-top">` (entire top bar: brand, nav, search, theme toggle, bell, avatar)
- The `<div class="d-breadcrumb">` (make this a slot or route-meta-driven)
- The loading skeleton and error banner patterns
- All CSS for `.d-root` (including CSS variables), `.d-top`, `.d-top-l/r/search`, `.brand`, `.logo`, `.scope`, `.icon-btn`, `.d-breadcrumb`, `.av`, `.badge`, `.mode`, scroll-elevation, and `@media` responsive rules
- The `scrolled` and `mounted` refs (useScrolled, useMounted)
- The theme store usage (useUiStore, isLight, toggleTheme)
- The reduced-motion CSS rules

Layout template structure:
```vue
<template>
  <div class="d-root" :class="{ 'is-mounted': mounted, 'theme-light': isLight, 'pv-dark': !isLight }">
    <header class="d-top" :class="{ scrolled }">
      <!-- top bar content -->
    </header>

    <div class="d-breadcrumb">
      <slot name="breadcrumb" />
    </div>

    <slot />
  </div>
</template>
```

- [ ] **Step 2: Update router to use layout**

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { requireAuth } from './auth/guard'
import MainLayout from './layouts/MainLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    beforeEnter: requireAuth,
    children: [
      {
        path: '',
        name: 'portfolio-summary',
        component: () => import('./pages/PortfolioSummary.vue')
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
```

- [ ] **Step 3: Strip layout from PortfolioSummary.vue**

Remove from PortfolioSummary.vue:
- The outer `.d-root` div (the layout now provides it)
- The `<header class="d-top">` block
- The `<div class="d-breadcrumb">` block
- The `scrolled`, `mounted`, `isLight`, `toggleTheme`, `useUiStore` imports (move to layout)
- All layout-related CSS (`.d-root`, `.d-top`, `.brand`, `.logo`, `.icon-btn`, etc.)

PortfolioSummary.vue now starts with:
```vue
<template>
  <template #breadcrumb>
    <a>My portfolios</a>
    <span>/</span>
    <a>Growth sleeve</a>
  </template>

  <div v-if="portfolioLoading || measurementsLoading || !portfolioData" class="loading-skel">
    ...
  </div>
  <main v-if="portfolioData" class="page-main">
    <!-- page content -->
  </main>
</template>
```

**Note:** Using named slots with `<template #breadcrumb>` inside a `<router-view>` child requires the layout to use `<slot>` properly. The layout's default slot is the page content; the breadcrumb slot is named.

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run e2e
```

This is the highest-risk step. The e2e tests check for `.d-root`, `.kpi`, `.chart canvas`, and the theme toggle button — all must still be findable in the DOM after the layout restructure.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: extract MainLayout and update router to nested layout"
```

---

## Task 10: Final Cleanup

**Files:**
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Audit PortfolioSummary.vue**

After all extractions, verify:
- File is under 400 lines
- No duplicated CSS (all component CSS is in the component files)
- No orphaned script logic (all chart/layout/indicator code is in components)
- Only page-level concerns remain: data fetching, hero computed values, risk gates data, holdings data, drawdown list, metrics grid, returns table, and the composition of extracted components

- [ ] **Step 2: Run full verification suite**

```bash
npm run typecheck && npm run lint:check && npm run format:check && npm run test && npm run build && npm run e2e
```

All must exit 0.

- [ ] **Step 3: Verify visual parity**

Start the dev server and visually confirm in a browser:
- Dark mode renders identically to pre-extraction
- Light mode renders identically
- Theme toggle works
- Drawdown hover/focus + chart interaction works
- Scroll elevation on top bar works
- Health bar bounce on hover works
- All animations play on mount

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: final cleanup after component extraction — PortfolioSummary now composes from ui kit"
```

---

## Done-criteria

- [ ] `src/components/ui/` contains: StatusDot, AnimatedBar, HealthBar, KpiCard, Panel, SegmentedControl, TabBar, FocusBanner
- [ ] `src/components/charts/` contains: ValueChart
- [ ] `src/layouts/` contains: MainLayout
- [ ] `src/pages/PortfolioSummary.vue` is under 400 lines
- [ ] All existing Vitest tests pass + new component tests pass
- [ ] Both Playwright e2e smoke tests pass
- [ ] `npm run typecheck && npm run build` exit 0
- [ ] Page looks and behaves identically to pre-extraction state
