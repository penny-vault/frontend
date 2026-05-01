import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnimatedBar from '@/components/ui/AnimatedBar.vue'

describe('AnimatedBar', () => {
  it('renders the bar container', () => {
    const wrapper = mount(AnimatedBar, { props: { value: 0.58 } })
    expect(wrapper.find('.animated-bar').exists()).toBe(true)
  })

  it('sets --w custom property based on value', () => {
    const wrapper = mount(AnimatedBar, { props: { value: 0.5 } })
    const span = wrapper.find<HTMLSpanElement>('.animated-bar span')
    expect(span.element.style.getPropertyValue('--w')).toBe('50%')
  })

  it('does not add grown class when animate is false/absent', () => {
    const wrapper = mount(AnimatedBar, { props: { value: 0.5 } })
    expect(wrapper.find('span').classes()).not.toContain('grown')
  })

  it('adds grown class when animate is true', () => {
    const wrapper = mount(AnimatedBar, { props: { value: 0.5, animate: true } })
    expect(wrapper.find('span').classes()).toContain('grown')
  })

  it('sets custom gradient', () => {
    const gradient = 'linear-gradient(90deg, red, blue)'
    const wrapper = mount(AnimatedBar, { props: { value: 0.5, gradient } })
    expect(wrapper.find('span').element.style.background).toContain('linear-gradient')
  })
})
