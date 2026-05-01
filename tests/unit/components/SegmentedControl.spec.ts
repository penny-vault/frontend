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
