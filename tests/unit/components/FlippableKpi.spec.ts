import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FlippableKpi from '@/components/ui/FlippableKpi.vue'

describe('FlippableKpi', () => {
  it('renders front content and is not flippable when no back slot is provided', () => {
    const wrapper = mount(FlippableKpi, {
      props: { label: 'Up capture' },
      slots: { default: '<div class="kpi-value">1.08</div>' }
    })
    expect(wrapper.find('.fk-scene').exists()).toBe(true)
    expect(wrapper.find('.fk-scene').classes()).not.toContain('fk-flippable')
    expect(wrapper.find('.fk-back').exists()).toBe(false)
    expect(wrapper.find('.fk-hint').exists()).toBe(false)
    expect(wrapper.text()).toContain('1.08')
  })

  it('shows the hint marker and becomes flippable when a back slot is provided', () => {
    const wrapper = mount(FlippableKpi, {
      props: { label: 'Up capture' },
      slots: {
        default: '<div class="kpi-value">1.08</div>',
        back: '<p>108% of benchmark gains</p>'
      }
    })
    expect(wrapper.find('.fk-scene').classes()).toContain('fk-flippable')
    expect(wrapper.find('.fk-hint').exists()).toBe(true)
    expect(wrapper.find('.fk-back').exists()).toBe(true)
  })

  it('toggles the flipped class on click when flippable', async () => {
    const wrapper = mount(FlippableKpi, {
      props: { label: 'Up capture' },
      slots: {
        default: '<div>1.08</div>',
        back: '<p>explanation</p>'
      }
    })
    expect(wrapper.find('.fk-card').classes()).not.toContain('fk-flipped')
    await wrapper.find('.fk-scene').trigger('click')
    expect(wrapper.find('.fk-card').classes()).toContain('fk-flipped')
    await wrapper.find('.fk-scene').trigger('click')
    expect(wrapper.find('.fk-card').classes()).not.toContain('fk-flipped')
  })

  it('does not flip on click when no back slot', async () => {
    const wrapper = mount(FlippableKpi, {
      props: { label: 'Up capture' },
      slots: { default: '<div>1.08</div>' }
    })
    await wrapper.find('.fk-scene').trigger('click')
    expect(wrapper.find('.fk-card').classes()).not.toContain('fk-flipped')
  })

  it('flips on Enter and Space key presses', async () => {
    const wrapper = mount(FlippableKpi, {
      props: { label: 'Up capture' },
      slots: { default: '<div>1.08</div>', back: '<p>back</p>' }
    })
    await wrapper.find('.fk-scene').trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('.fk-card').classes()).toContain('fk-flipped')
    await wrapper.find('.fk-scene').trigger('keydown', { key: ' ' })
    expect(wrapper.find('.fk-card').classes()).not.toContain('fk-flipped')
  })
})
