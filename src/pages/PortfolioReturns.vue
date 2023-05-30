<template>

  <div class="row q-col-gutter-lg">
    <div class="col-xl-8 col-lg-8 col-md-12 col-sm-12 col-xs-12">
      <px-card title="Returns by Year">
        <annual-returns :measurements="measurements" />
      </px-card>
    </div>
    <div class="col-xl-4 col-lg-4 col-md-12 col-sm-12 col-xs-12">
      <px-card title="Draw Downs">
        <ag-grid-vue style="width: 100%; height: 400px"
          class="ag-theme-alpine"
          :columnDefs="drawDownsColumnDefs"
          :gridOptions="gridOptions"
          :rowData="drawDowns">
        </ag-grid-vue>
      </px-card>
    </div>
  </div>

  <div class="row q-col-gutter-lg q-pt-md">
    <div class="col">
      <px-card title="Returns Heatmap">
        <return-heatmap :measurements="measurements" />
      </px-card>
    </div>
  </div>

</template>

<script>
import { defineComponent, computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'

import { formatPercent } from '../assets/filters'
import { format, differenceInCalendarDays } from 'date-fns'

import { AgGridVue } from 'ag-grid-vue3'
import AnnualReturns from 'components/AnnualReturns.vue'
import ReturnHeatmap from 'components/ReturnHeatmap.vue'
import PxCard from 'components/PxCard.vue'

export default defineComponent({
  name: 'PortfolioReturns',
  components: {
    AgGridVue,
    AnnualReturns,
    ReturnHeatmap,
    PxCard
  },
  props: {
    portfolioId: {
      type: String,
      required: true
    }
  },
  setup (props) {
    const $store = useStore()

    const drawDownsColumnDefs = ref([
      {
        field: 'Begin',
        headerName: 'Period',
        width: 185,
        sortable: true,
        resizable: true,
        editable: false,
        cellClass: 'multiline-cell',
        cellRenderer: (params) => {
          const begin = params.data.Begin
          const end = params.data.End
          const recover = params.data.Recovery
          const rangeStr = `${format(begin, 'MMM yyyy')} to ${format(end, 'MMM yyyy')}`
          let daysToRecover = `<br/><span class="cell-sub-text">${differenceInCalendarDays(recover, begin)} days to recover</span>`
          if (params.data.Active) {
            daysToRecover = '<br/><span class="cell-sub-text">not yet recovered</span>'
          }
          return rangeStr + daysToRecover
        }
      },
      {
        field: 'LossPercent',
        width: 85,
        headerName: '%',
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          return formatPercent(params.value)
        }
      },
      {
        field: 'Recovery',
        headerName: 'Recovered',
        width: 125,
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (params.data.Active) {
            return ''
          }
          return format(params.value, 'MMM yyyy')
        }
      },
      {
        field: 'Recovery',
        headerName: 'Days to Recover',
        width: 100,
        sortable: true,
        resizable: true,
        editable: false,
        hide: true,
        valueGetter: (params) => {
          return differenceInCalendarDays(params.data.End, params.data.Begin)
        }
      }
    ])
    const gridOptions = ref({
      rowHeight: 60
    })

    let gridApi = {}
    // eslint-disable-next-line no-unused-vars
    let columnApi = {}

    // Computed properties
    const drawDowns = computed(() => $store.state.portfolio.current.performance.DrawDowns)
    const measurements = computed(() => $store.state.portfolio.measurements)

    // creation events
    onMounted(() => {
      gridApi = gridOptions.value.api
      columnApi = gridOptions.value.columnApi
    })

    function onGridReady (params) {
      gridApi.closeToolPanel()
      const allColumnIds = []
      gridOptions.value.columnApi.getAllColumns().forEach(function (column) {
        allColumnIds.push(column.colId)
      })

      gridOptions.value.columnApi.autoSizeColumns(allColumnIds, true)
    }

    return {
      drawDowns,
      drawDownsColumnDefs,
      gridOptions,
      onGridReady,
      measurements
    }
  }
})
</script>

<style lang="scss">
  .multiline-cell {
    line-height: 20px!important;
    padding-top: 10px!important;
  }
  .cell-sub-text {
    color: #999;
  }
</style>
