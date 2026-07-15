import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HoldingsDetailPanel from '@/components/holdings/HoldingsDetailPanel.vue'
import type { HoldingsHistoryEntry, PredictedTransaction } from '@/api/endpoints/portfolios'
import { predictionToEntry } from '@/util/holdings'

const historyEntry: HoldingsHistoryEntry = {
  batchId: 3,
  timestamp: '2026-04-30T00:00:00Z',
  items: [
    { ticker: 'VTI', quantity: 780, avgCost: 230, lastTradeValue: 180000 },
    { ticker: 'BND', quantity: 860, avgCost: 72, lastTradeValue: 62000 }
  ],
  portfolioValue: 242000
}

const prediction = {
  date: '2026-05-29',
  transactions: [
    {
      type: 'sell',
      ticker: 'VEA',
      quantity: 420,
      price: 52.1,
      amount: 21882,
      justification: 'Momentum rank fell below hold threshold'
    },
    { type: 'buy', ticker: 'VTI', quantity: 80, price: 238.4, amount: 19072 }
  ] as PredictedTransaction[],
  holdings: [
    { ticker: 'VTI', figi: 'BBG000BDTBL9', quantity: 710, marketValue: 169264, weight: 0.6635 },
    { ticker: 'BND', figi: null, quantity: 700, marketValue: 50400, weight: 0.1976 }
  ],
  totalMarketValue: 219664,
  annotations: []
}

describe('HoldingsDetailPanel', () => {
  it('renders the standard title without orders for history entries', () => {
    const wrapper = mount(HoldingsDetailPanel, {
      props: { entry: historyEntry, hoveredTicker: null }
    })
    expect(wrapper.find('.hdp-title').text()).toContain('Holdings detail for')
    expect(wrapper.find('.hdp-pred-badge').exists()).toBe(false)
    expect(wrapper.find('.hdp-orders').exists()).toBe(false)
  })

  it('renders predicted mode with badge, orders, and estimate note', () => {
    const wrapper = mount(HoldingsDetailPanel, {
      props: {
        entry: predictionToEntry(prediction),
        hoveredTicker: null,
        predicted: true,
        predictedTransactions: prediction.transactions
      }
    })
    expect(wrapper.find('.hdp-pred-badge').text()).toBe('Predicted')
    expect(wrapper.find('.hdp-title').text()).toContain('Holdings after trading on')
    const orders = wrapper.findAll('.hdp-order')
    expect(orders).toHaveLength(2)
    expect(orders[0]!.find('.hdp-order-type').classes()).toContain('tx-sell')
    expect(orders[0]!.find('.hdp-order-why').text()).toBe('Momentum rank fell below hold threshold')
    expect(orders[1]!.find('.hdp-order-type').classes()).toContain('tx-buy')
    expect(orders[1]!.find('.hdp-order-why').exists()).toBe(false)
    expect(wrapper.find('.hdp-pred-note').text()).toContain('estimated at last close')
  })

  it('shows the no-trades message when the predicted transactions are empty', () => {
    const wrapper = mount(HoldingsDetailPanel, {
      props: {
        entry: predictionToEntry({ ...prediction, transactions: [] }),
        hoveredTicker: null,
        predicted: true,
        predictedTransactions: []
      }
    })
    expect(wrapper.find('.hdp-orders-empty').text()).toContain('No trades predicted')
    expect(wrapper.findAll('.hdp-order')).toHaveLength(0)
  })

  it('shows the all-cash message when a predicted entry has no holdings', () => {
    const wrapper = mount(HoldingsDetailPanel, {
      props: {
        entry: predictionToEntry({ ...prediction, holdings: [], totalMarketValue: 0 }),
        hoveredTicker: null,
        predicted: true,
        predictedTransactions: prediction.transactions
      }
    })
    expect(wrapper.find('.hdp-empty').text()).toContain('entirely in cash')
  })
})
