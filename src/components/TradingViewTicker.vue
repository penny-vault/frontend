<template>
  <div class="tradingview-widget-container">
    <iframe :scrolling="scroll" :allowtransparency="transparent" frameborder="0" :src="tradingViewUrl" style="box-sizing: border-box; height: 46px; width: 100%;"></iframe>
  </div>
</template>

<script>
export default {
  name: 'TradingViewTicker',
  props: {
    symbols: {
      type: Array,
      // Object or array defaults must be returned from
      // a factory function
      default: function () {
        return [
          {
            description: 'S&P 500',
            proName: 'AMEX:SPY'
          },
          {
            description: 'Dow 30',
            proName: 'AMEX:IYY'
          },
          {
            description: 'Nasdaq',
            proName: 'NASDAQ:QQQ'
          },
          {
            description: 'MSCI EAFE',
            proName: 'AMEX:EFA'
          },
          {
            description: 'Emerging Markets',
            proName: 'AMEX:EEM'
          }
        ]
      }
    },
    showSymbolLogo: {
      type: Boolean,
      default: true
    },
    colorTheme: {
      type: String,
      default: 'light'
    },
    transparent: {
      type: Boolean,
      default: true
    },
    scroll: {
      type: Boolean,
      default: false
    },
    displayMode: {
      type: String,
      default: 'adaptive'
    },
    locale: {
      type: String,
      default: 'en'
    },
    host: {
      type: String,
      default: 'https://s.tradingview.com'
    },
    path: {
      type: String,
      default: '/embed-widget/ticker-tape/'
    }
  },
  computed: {
    tradingViewUrl: function () {
      const args = {
        symbols: this.symbols,
        showSymbolLogo: this.showSymbolLogo,
        colorTheme: this.colorTheme,
        isTransparent: this.transparent,
        displayMode: this.displayMode,
        width: '100%',
        height: 78,
        utm_source: 'www.tradingview.com',
        utm_medium: 'widget_new',
        utm_campaign: 'ticker-tape'
      }
      return `${this.host}${this.path}?locale=${this.locale}#${encodeURIComponent(JSON.stringify(args))}`
    }
  }
}
</script>
