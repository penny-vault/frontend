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

  it('applies tone class to each segment', () => {
    const mixed = [
      { filled: true, tone: 'warn' as const },
      { filled: true, tone: 'err' as const }
    ]
    const wrapper = mount(HealthBar, { props: { segments: mixed } })
    expect(wrapper.findAll('.hseg')[0]!.classes()).toContain('warn')
    expect(wrapper.findAll('.hseg')[1]!.classes()).toContain('err')
  })

  it('adds hovering class when hovering prop is true', () => {
    const wrapper = mount(HealthBar, { props: { segments, hovering: true } })
    expect(wrapper.find('.health').classes()).toContain('hovering')
  })
})
