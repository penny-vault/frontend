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
