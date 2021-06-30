<template>

  <div class="row q-col-gutter-lg">
    <div class="col-xl-8 col-lg-8 col-md-12">
      <px-card title="Returns by Year">
        <annual-returns :portfolio="portfolio.measurements" :benchmark="benchmark.measurements" />
      </px-card>
    </div>
    <div class="col-xl-4 col-lg-4 col-md-12">
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
        <return-heatmap :measurements="portfolio.measurements" />
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
import AnnualReturns from "components/AnnualReturns.vue"
import ReturnHeatmap from "components/ReturnHeatmap.vue"
import PxCard from "components/PxCard.vue"

export default defineComponent({
  name: 'PortfolioReturns',
  components: {
    AgGridVue,
    AnnualReturns,
    ReturnHeatmap,
    PxCard
  },
  setup () {
    const $store = useStore()

    const drawDownsColumnDefs = ref([
      {
        field: 'begin',
        headerName: 'Period',
        width: 185,
        sortable: true,
        resizable: true,
        editable: false,
        cellClass: 'multiline-cell',
        cellRenderer: (params) => {
          let begin = new Date(params.data.begin * 1000)
          let end = new Date(params.data.end * 1000)
          let rangeStr = `${format(begin, 'MMM yyyy')} to ${format(end, 'MMM yyyy')}`
          let daysToRecover = `<br/><span class="cell-sub-text">${differenceInCalendarDays(end, begin)} days to recover</span>`
          return rangeStr + daysToRecover
        }
      },
      {
        field: 'lossPercent',
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
        field: 'recovery',
        headerName: 'Recovered',
        width: 125,
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          return format(new Date(params.value*1000), 'MMM yyyy')
        }
      },
      {
        field: 'recovery',
        headerName: 'Days to Recover',
        width: 100,
        sortable: true,
        resizable: true,
        editable: false,
        hide: true,
        valueGetter: (params) => {
          return differenceInCalendarDays(new Date(params.data.end * 1000), new Date(params.data.begin * 1000))
        }
      }
    ])
    const gridOptions = ref({
      rowHeight: 60,
    })

    let gridApi = {}
    let columnApi = {}

    // Computed properties
    const benchmark = computed(() => $store.state.portfolio.benchmark)
    const portfolio = computed(() => $store.state.portfolio.current.performance )
    const drawDowns = computed(() => $store.state.portfolio.current.performance.metrics.drawDowns )

    // creation events
    onMounted(() => {
      gridApi = gridOptions.value.api
      columnApi = gridOptions.value.columnApi
    })

    function onGridReady(params) {
      gridApi.closeToolPanel()
      var allColumnIds = []
      gridOptions.value.columnApi.getAllColumns().forEach(function (column) {
        allColumnIds.push(column.colId);
      })

      gridOptions.value.columnApi.autoSizeColumns(allColumnIds, true)
    }

    return {
      drawDowns,
      drawDownsColumnDefs,
      gridOptions,
      onGridReady,
      portfolio,
      benchmark
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