import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Panel from '@/components/ui/Panel.vue'

describe('Panel', () => {
  it('renders title and subtitle', () => {
    const wrapper = mount(Panel, {
      props: { title: 'Holdings', subtitle: '4 positions' },
      slots: { default: '<p>content</p>' }
    })
    expect(wrapper.find('h2').text()).toBe('Holdings')
    expect(wrapper.find('.panel-sub').text()).toBe('4 positions')
  })

  it('renders slot content', () => {
    const wrapper = mount(Panel, {
      slots: { default: '<p class="test">hello</p>' }
    })
    expect(wrapper.find('.test').text()).toBe('hello')
  })

  it('allows header slot override', () => {
    const wrapper = mount(Panel, {
      slots: {
        header: '<div class="custom-header">Custom</div>',
        default: '<p>body</p>'
      }
    })
    expect(wrapper.find('.custom-header').exists()).toBe(true)
  })

  it('does not render header when no title or header slot', () => {
    const wrapper = mount(Panel, {
      slots: { default: '<p>body</p>' }
    })
    expect(wrapper.find('header').exists()).toBe(false)
  })
})
