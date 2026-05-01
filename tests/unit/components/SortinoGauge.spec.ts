import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-echarts', () => ({
  default: {
    name: 'VChart',
    template: '<div class="sg-chart"><canvas></canvas></div>',
    props: ['option', 'autoresize']
  }
}))

import SortinoGauge from '@/components/charts/SortinoGauge.vue'

describe('SortinoGauge', () => {
  it('renders the gauge root', () => {
    setActivePinia(createPinia())
    const wrapper = mount(SortinoGauge, { props: { sortino: 1.78 } })
    expect(wrapper.find('.sg-chart').exists()).toBe(true)
  })
})
