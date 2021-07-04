<template>
<!--
  NOTE: We cannot use q-page here because it interfere's with the btnCellRenderer
  hopefully ag grid comes up with a better solution for integration with vue 3
  its very hacky right now.

  Replace with an additional div that has margin set for
-->

<!--  <q-page class="q-pa-xs q-px-md"> -->
  <div class="q-pa-xs q-px-md">
    <div class="row q-gutter-md">
      <div class="col">
        <h4 class="q-mt-sm q-mb-sm"><q-icon name="app:portfolio" color="grey-9" size="sm" class="q-mr-md q-mb-sm" />Strategies</h4>
        <q-breadcrumbs class="q-mb-lg">
          <q-breadcrumbs-el icon="home" to="/app" />
          <q-breadcrumbs-el label="Strategies" />
        </q-breadcrumbs>
      </div>
    </div>
    <div class="row q-col-gutter-lg">
      <div class="col-xl-8 col-lg-8 col-md-12 col-sm-12 col-xs-12">
        <ag-grid-vue style="width: 100%; height: 500px;"
          class="ag-theme-alpine"
          :columnDefs="columnDefs"
          :rowData="rowData"
          :gridOptions="gridOptions"
          @grid-ready="onGridReady"
          :sideBar="sideBar"
          rowSelection="multiple"
        />
      </div>
      <div class="col-xl-4 col-lg-4 col-md-12 col-sm-12 col-xs-12">
        <px-card title="Risk vs Return">
            <am-scatter-plot style="height: 435px" labels="{shortcode}" x-title="Risk (ulcer index)" y-title="Return (10-yr CAGR)" :series-config="series" :data="data" />
        </px-card>
      </div>
    </div>
  </div>
<!--  </q-page> -->
</template>

<script>
import { defineComponent, computed, ref, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { formatPercent, formatNumber } from '../assets/filters'

import { AgGridVue } from 'ag-grid-vue3'
import AgGridBtnCellRenderer from "components/AgGridBtnCellRenderer.vue"

import AmScatterPlot from 'src/components/AmScatterPlot.vue'
import PxCard from 'components/PxCard.vue'

export default defineComponent({
  name: 'PortfolioList',

  components: {
    AgGridVue,
    AmScatterPlot,
    'btnCellRenderer': AgGridBtnCellRenderer,
    PxCard,
  },

  setup () {
    const $store = useStore()
    const $router = useRouter()

    const series = ref([{
      valueX: 'x',
      valueY: 'y',
      tooltipText: '[bold]{strategy}[/]\nReturn: {valueY}%\nRisk: {valueX}'
    }])

    const gridOptions = ref({
      defaultColDef: {
        flex: 1,
        minWidth: 200,
        sortable: true,
        resizable: true,
        floatingFilter: true,
      },
    })
    const gridApi = ref({})
    const columnApi = ref({})
    const columnDefs = ref([
      {
        field: "shortcode",
        headerName: "",
        cellRendererFramework: 'btnCellRenderer',
        cellRendererParams: {
          clicked: (function(field) {
            $router.push({ path: `/app/strategy/${field}` })
          }).bind(this)
        },
        minWidth: 115,
        maxWidth: 115,
        resizable: true,
        sortable: false,
        editable: false,
        floatingFilter: false,
        suppressMenu: true,
        filter: false,
      },

      {
        field: 'name',
        minWidth: 250,
        filter: 'agTextColumnFilter',
        filterParams: {
          buttons: ['reset', 'apply'],
        },
      },

      {
        headerName: "% YTD",
        minWidth: 80,
        width: 110,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.ytd_return.Valid) {
            return params.data.metrics.ytd_return.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatPercent(params.value)
        }
      },

      {
        headerName: "CAGR Since Inception",
        minWidth: 80,
        width: 110,
        hide: true,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.cagr_since_inception.Valid) {
            return params.data.metrics.cagr_since_inception.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatPercent(params.value)
        }
      },

      {
        headerName: "CAGR 3-yr",
        minWidth: 80,
        width: 110,
        hide: true,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.cagr_3yr.Valid) {
            return params.data.metrics.cagr_3yr.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatPercent(params.value)
        }
      },

      {
        headerName: "CAGR 5-yr",
        minWidth: 80,
        width: 110,
        hide: true,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.cagr_5yr.Valid) {
            return params.data.metrics.cagr_5yr.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatPercent(params.value)
        }
      },

      {
        headerName: "CAGR 10-yr",
        minWidth: 80,
        width: 110,
        hide: false,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.cagr_10yr.Valid) {
            return params.data.metrics.cagr_10yr.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatPercent(params.value)
        }
      },

      {
        headerName: "Std. Dev.",
        minWidth: 80,
        width: 110,
        hide: true,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.std_dev.Valid) {
            return params.data.metrics.std_dev.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatPercent(params.value)
        }
      },

      {
        headerName: "Downside Deviation",
        hide: true,
        minWidth: 80,
        width: 110,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.downside_deviation.Valid) {
            return params.data.metrics.downside_deviation.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatPercent(params.value)
        }
      },

      {
        headerName: "Max DD",
        minWidth: 80,
        width: 110,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.max_draw_down.Valid) {
            return params.data.metrics.max_draw_down.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatPercent(params.value)
        }
      },

      {
        headerName: "Avg DD",
        hide: true,
        minWidth: 80,
        width: 110,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.avg_draw_down.Valid) {
            return params.data.metrics.avg_draw_down.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatPercent(params.value)
        }
      },

      {
        headerName: "Sharpe",
        hide: true,
        minWidth: 80,
        width: 110,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.sharpe_ratio.Valid) {
            return params.data.metrics.sharpe_ratio.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatNumber(params.value)
        }
      },

      {
        headerName: "Sortino",
        minWidth: 80,
        width: 110,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.sortino_ratio.Valid) {
            return params.data.metrics.sortino_ratio.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatNumber(params.value)
        }
      },

      {
        headerName: "Ulcer Idx",
        minWidth: 80,
        width: 110,
        filter: 'agNumberColumnFilter',
        valueGetter: (params) => {
          if (params.data.metrics.ulcer_index.Valid) {
            return params.data.metrics.ulcer_index.Float64
          }
          return NaN
        },
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return '-'
          }
          return formatNumber(params.value)
        }
      },

    ])

    const sideBar = ref(true)

    const rowData = computed(() => $store.state.strategy.list)

    const data = ref([])
    updateChartData()

    $store.dispatch('strategy/fetchStrategies')

    async function updateChartData () {
      data.value = new Array()
      rowData.value.forEach((elem) => {
        data.value.push({
          x: (elem.metrics.ulcer_index.Float64).toFixed(2),
          y: (elem.metrics.cagr_10yr.Float64 * 100).toFixed(2),
          strategy: elem.name,
          shortcode: elem.shortcode
        })
      })
    }

    watch(rowData, async (n) => {
      updateChartData()
    })

    onMounted(() => {
      gridApi.value = gridOptions.value.api;
      columnApi.value = gridOptions.value.columnApi;
    })

    return {
      columnApi,
      columnDefs,
      data,
      gridApi,
      gridOptions,
      rowData,
      series,
      sideBar,
      onGridReady(params) {
        //gridApi.value.sizeColumnsToFit();
        gridApi.value.closeToolPanel()
      }
    }
  }
})
</script>
