import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PredictionPanel from '@/components/holdings/PredictionPanel.vue'
import type { PredictionResponse } from '@/api/endpoints/portfolios'

const prediction: PredictionResponse = {
  date: '2026-05-29',
  transactions: [
    {
      type: 'sell',
      ticker: 'VEA',
      figi: 'BBG000BK5W78',
      quantity: 420,
      price: 52.1,
      amount: 21882,
      justification: 'Momentum rank fell below hold threshold'
    },
    {
      type: 'buy',
      ticker: 'VTI',
      figi: 'BBG000BDTBL9',
      quantity: 80,
      price: 238.4,
      amount: 19072
    }
  ],
  holdings: [
    { ticker: 'BND', figi: null, quantity: 700, marketValue: 50400, weight: 0.1976 },
    { ticker: 'VTI', figi: 'BBG000BDTBL9', quantity: 710, marketValue: 169264, weight: 0.6635 }
  ],
  totalMarketValue: 219664
}

describe('PredictionPanel', () => {
  it('renders the predicted trade date and invested value', () => {
    const wrapper = mount(PredictionPanel, { props: { prediction } })
    expect(wrapper.find('.pp-date').text()).toBe('May 29, 2026')
    expect(wrapper.find('.pp-total').text()).toContain('$219,664')
  })

  it('renders one row per predicted order with type styling', () => {
    const wrapper = mount(PredictionPanel, { props: { prediction } })
    const orders = wrapper.findAll('.pp-order')
    expect(orders).toHaveLength(2)
    expect(orders[0]!.find('.pp-type').classes()).toContain('tx-sell')
    expect(orders[0]!.find('.pp-ticker').text()).toBe('VEA')
    expect(orders[0]!.find('.pp-why').text()).toBe('Momentum rank fell below hold threshold')
    expect(orders[1]!.find('.pp-type').classes()).toContain('tx-buy')
    expect(orders[1]!.find('.pp-why').exists()).toBe(false)
  })

  it('renders a null ticker as a dash', () => {
    const withNullTicker: PredictionResponse = {
      ...prediction,
      transactions: [{ type: 'fee', ticker: null, amount: 12 }]
    }
    const wrapper = mount(PredictionPanel, { props: { prediction: withNullTicker } })
    expect(wrapper.find('.pp-order .pp-ticker').text()).toBe('—')
  })

  it('sorts positions by weight descending', () => {
    const wrapper = mount(PredictionPanel, { props: { prediction } })
    const tickers = wrapper.findAll('.pp-row .pp-ticker').map((w) => w.text())
    expect(tickers).toEqual(['VTI', 'BND'])
  })

  it('shows the no-trades message when transactions is empty', () => {
    const noTrades: PredictionResponse = { ...prediction, transactions: [] }
    const wrapper = mount(PredictionPanel, { props: { prediction: noTrades } })
    expect(wrapper.find('.pp-empty').text()).toContain('No trades predicted')
    expect(wrapper.findAll('.pp-order')).toHaveLength(0)
    expect(wrapper.findAll('.pp-row')).toHaveLength(2)
  })

  it('shows the all-cash message when holdings is empty', () => {
    const allCash: PredictionResponse = { ...prediction, holdings: [], totalMarketValue: 0 }
    const wrapper = mount(PredictionPanel, { props: { prediction: allCash } })
    expect(wrapper.text()).toContain('entirely in cash')
  })
})
