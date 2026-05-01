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

  it('renders slot content', () => {
    const wrapper = mount(KpiCard, {
      props: { label: 'Test' },
      slots: { default: '<div class="custom">Custom content</div>' }
    })
    expect(wrapper.find('.custom').text()).toBe('Custom content')
  })
})
