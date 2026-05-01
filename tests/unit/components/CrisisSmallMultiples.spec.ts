import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Mock vue-echarts before importing the component
vi.mock('vue-echarts', () => ({
  default: {
    name: 'VChart',
    template: '<div class="csm-chart"><canvas></canvas></div>',
    props: ['option', 'autoresize']
  }
}))

import CrisisSmallMultiples from '@/components/charts/CrisisSmallMultiples.vue'

describe('CrisisSmallMultiples', () => {
  it('renders one mini chart per episode', () => {
    setActivePinia(createPinia())
    const wrapper = mount(CrisisSmallMultiples, {
      props: {
        episodes: [
          {
            label: 'Feb 2020',
            start: '2020-02-01',
            recovery: '2020-08-01',
            depth: -0.25,
            benchmarkDepth: -0.32,
            description: 'Sample crisis description.',
            reveals: 'Sample reveal.',
            days: [
              { date: '2020-02-01', portfolio: 0, benchmark: 0 },
              { date: '2020-03-15', portfolio: -0.25, benchmark: -0.32 },
              { date: '2020-08-01', portfolio: 0, benchmark: -0.05 }
            ]
          },
          {
            label: 'Jan 2022',
            start: '2022-01-01',
            recovery: '2023-03-01',
            depth: -0.15,
            benchmarkDepth: -0.2,
            description: 'Another crisis.',
            reveals: 'Another reveal.',
            days: [
              { date: '2022-01-01', portfolio: 0, benchmark: 0 },
              { date: '2022-06-01', portfolio: -0.15, benchmark: -0.2 },
              { date: '2023-03-01', portfolio: 0, benchmark: -0.05 }
            ]
          }
        ]
      }
    })
    expect(wrapper.findAll('.csm-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('Feb 2020')
    expect(wrapper.text()).toContain('Jan 2022')
  })

  it('renders an empty-state when there are no episodes', () => {
    setActivePinia(createPinia())
    const wrapper = mount(CrisisSmallMultiples, {
      props: { episodes: [] }
    })
    expect(wrapper.find('.csm-empty').exists()).toBe(true)
  })
})
