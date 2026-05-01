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
