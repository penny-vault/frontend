import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import TabBar from '@/components/ui/TabBar.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div/>' } }]
  })
}

describe('TabBar', () => {
  const tabs = ['Overview', 'Holdings', 'Settings']

  it('renders all tabs', () => {
    const wrapper = mount(TabBar, {
      props: { tabs, modelValue: 'Overview' },
      global: { plugins: [makeRouter()] }
    })
    expect(wrapper.findAll('a')).toHaveLength(3)
  })

  it('marks the active tab', () => {
    const wrapper = mount(TabBar, {
      props: { tabs, modelValue: 'Holdings' },
      global: { plugins: [makeRouter()] }
    })
    expect(wrapper.findAll('a')[1]!.classes()).toContain('active')
  })

  it('emits update:modelValue on click', async () => {
    const wrapper = mount(TabBar, {
      props: { tabs, modelValue: 'Overview' },
      global: { plugins: [makeRouter()] }
    })
    await wrapper.findAll('a')[2]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['Settings'])
  })
})
