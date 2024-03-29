<template>
  <div>
  <q-dialog v-model="holdingsCalculator">
    <q-card style="width: 600px; max-width: 80vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Holdings Calculator</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-input
          v-model.number="holdingsCalcInput"
          type="number"
          filled
          class="q-mb-sm"
          style="max-width: 600px"
        />
        <ag-grid-vue style="width: 100%; height: 400px;"
          class="ag-theme-alpine"
          :gridOptions="holdingsCalcGrid"
          :columnDefs="holdingsCalcColumnDefs"
          :rowData="holdings2">
        </ag-grid-vue>
      </q-card-section>
    </q-card>
  </q-dialog>

  <div class="row q-col-gutter-lg">
    <div class="col-lg-8 col-md-12 col-sm-12 col-xs-12">
      <px-card title="Portfolio Holdings by Month" :class="{'full-screen': fullscreenClass}">
        <template v-slot:toolbar>
          <q-btn @click="exportExcel" dense flat size="sm" icon="ion-cloud-download" label="Export Excel" />
          <q-btn @click="fullscreen" dense flat size="sm" :icon="fullscreenIcon" class="q-ml-md" />
        </template>
        <ag-grid-vue style="width: 100%; height: 600px;"
          class="ag-theme-alpine"
          :columnDefs="columnDefs"
          :rowData="rowData"
          :gridOptions="gridOptions"
          @grid-ready="onGridReady"
          :sideBar="sideBar"
          rowSelection="single"
          @selection-changed="onSelectionChanged">
        </ag-grid-vue>
      </px-card>
    </div>

    <div class="col-lg-4 col-md-12 col-sm-12 col-xs-12 q-gutter-y-md">
      <div class="row">
        <div class="col-12">
        <px-card :title="format(holdingsDate, '\'Holdings detail for\' MMM yyyy')">
          <template v-slot:toolbar>
            <q-btn @click="holdingsCalculator = true" dense flat size="sm" icon="ion-calculator" />
          </template>
          <ag-grid-vue style="width: 100%; height: 400px"
            class="ag-theme-alpine"
            :columnDefs="holdingsColumnDefs"
            :rowData="holdings">
          </ag-grid-vue>
        </px-card>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
        <px-card title="Holdings Frequency">
          <holdings-pie-chart width="100%" height="250px" :holdings="rowData"></holdings-pie-chart>
        </px-card>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script>
import { defineComponent, computed, ref, toRefs, onMounted, watch } from 'vue'
import { useStore } from 'vuex'

import { formatPercent, formatNumber } from '../assets/filters'
import { format, addDays } from 'date-fns'

import { AgGridVue } from 'ag-grid-vue3'
import HoldingsPieChart from 'components/HoldingsPieChart.vue'
import PxCard from 'components/PxCard.vue'

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

export default defineComponent({
  name: 'PortfolioSummary',
  components: {
    AgGridVue,
    HoldingsPieChart,
    PxCard
  },
  props: {
    portfolioId: {
      type: String,
      required: true
    }
  },
  setup (props) {
    const { portfolioId } = toRefs(props)
    const $store = useStore()

    const fullscreenIcon = ref('fullscreen')
    const fullscreenClass = ref(false)

    const columnDefs = ref([
      {
        field: 'Time',
        headerName: 'Date',
        width: 110,
        cellClass: 'dateType',
        pinned: 'left',
        filter: 'agDateColumnFilter',
        sortable: true,
        sortingOrder: ['desc', 'asc'],
        sort: 'desc',
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          var d = params.value
          if (params.data.Predicted) {
            d = addDays(d, 5)
          }
          const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d)
          const mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d)
          return `${mo} ${ye}`
        }
      },
      {
        headerName: 'Holdings',
        width: 150,
        sortable: true,
        resizable: true,
        editable: false,
        valueGetter: (params) => {
          let res = new Array()
          params.data.Holdings.forEach((item) => {
            if (item.Ticker !== '$CASH') {
              res.push(item.Ticker)
            }
          })
          return res.sort().join(' ')
        }
      },
      {
        field: 'PercentReturn',
        minWidth: 100,
        width: 110,
        maxWidth: 150,
        headerName: 'Return',
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }

          // filter out predicted rows
          if (params.data.Predicted === true) {
            return "-"
          }

          return formatPercent(params.value)
        },
        cellStyle: params => {
          // negative values are red, positive green
          if (params.value > 0) {
            return {color: 'green'}
          } else if (params.value < 0) {
            return {color: 'red'}
          }
          return null
        }
      },
      {
        field: 'Value',
        width: 200,
        headerName: 'Value',
        cellClass: 'currencyType',
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }

          // filter out predicted rows
          if (params.data.Predicted === true) {
            return "-"
          }

          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value)
        }
      }
    ])

    const holdingsCalcInput = ref(10000)
    const holdingsColumnDefs = ref([
      {
        field: 'Ticker',
        width: 95,
        pinned: 'left',
        sort: 'asc',
        sortable: true,
        resizable: true,
        editable: false,
      },
      {
        field: 'Shares',
        width: 100,
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          return formatNumber(params.value)
        }
      },
      {
        field: 'PercentPortfolio',
        headerName: '%',
        width: 85,
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return formatPercent(params.value)
        }
      },
      {
        field: 'Value',
        width: 150,
        headerName: 'Value',
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value)
        }
      }
    ])
    const holdingsCalcColumnDefs = ref([
      {
        field: 'Ticker',
        width: 125,
        pinned: 'left',
        sort: 'asc',
        sortable: true,
        resizable: true,
        editable: false,
      },
      {
        field: 'Shares',
        width: 100,
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          return formatNumber(params.value)
        }
      },
      {
        field: 'PercentPortfolio',
        headerName: '%',
        width: 85,
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return formatPercent(params.value)
        }
      },
      {
        field: 'Value',
        width: 150,
        headerName: 'Value',
        sortable: true,
        resizable: true,
        editable: false,
        valueFormatter: (params) => {
          if (isNaN(params.value)) {
            return "-"
          }
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value)
        }
      }
    ])

    const holdingsCalcGrid = ref({})
    const dynamicColumns = new Map()
    const gridOptions = ref({
      rowClassRules: {
        'predicted-asset': function(params) {
          return params.data.Predicted
        },
      },
      excelStyles: [
        {
            id: 'numberType',
            numberFormat: {
                format: '0',
            },
        },
        {
          id: 'percentType',
          numberFormat: {
            format: '#,##0.00%'
          }
        },
        {
            id: 'currencyType',
            numberFormat: {
                format: '$#,##0.00',
            },
        },
        {
            id: 'booleanType',
            dataType: 'boolean',
        },
        {
            id: 'stringType',
            dataType: 'String',
        },
        {
            id: 'dateType',
            dataType: 'DateTime',
            numberFormat: {
              format: 'mm/dd/yyy'
            }
        }
      ]
    })

    let gridApi = {}
    let columnApi = {}
    const sideBar = ref(true)
    const holdingsCalculator = ref(false)
    const holdings = ref([])
    const holdings2 = ref([])
    const holdingsDate = ref(new Date())

    // Computed properties
    const rowData = computed(() => $store.state.portfolio.holdings)

    // watch properties
    watch(portfolioId, async (newValue) => {
      $store.dispatch('portfolio/fetchHoldings', { portfolioId: newValue })
    })

    watch(holdingsCalcInput, async (newValue) => {
      if (newValue !== "" && newValue > 0) {
        holdings2.value.forEach( (elem) => {
          let pricePerShare = elem.Value / elem.Shares
          elem.Value = newValue * elem.PercentPortfolio
          elem.Shares = elem.Value / pricePerShare
        })
        holdingsCalcGrid.value.api.refreshCells()
      }
    })

    watch(rowData, async () => {
      getDynamicColumns()
      if (rowData.value.length > 0) {
        let idx = rowData.value.length - 1

        holdings.value = rowData.value[idx].Holdings

        holdings2.value = []
        holdings.value.forEach( (elem) => {
          holdings2.value.push({
            Shares: elem.Shares,
            Ticker: elem.Ticker,
            Value: elem.Value,
            PercentPortfolio: elem.PercentPortfolio
          })
        })
      }
    })

    // creation events
    onMounted(() => {
      gridApi = gridOptions.value.api
      columnApi = gridOptions.value.columnApi
      $store.dispatch('portfolio/fetchHoldings', { portfolioId: portfolioId.value })
      getDynamicColumns()
    })

    // methods
    function getDynamicColumns() {
      if (rowData.value.length > 1) {
        let justificationTmpl = rowData.value[1].Justification
        if (justificationTmpl !== undefined) {
          var keep = new Map()
          justificationTmpl.forEach((elem, idx) => {
            keep.set(elem.Key, 1)
            if (!dynamicColumns.has(elem.Key)) {
              dynamicColumns.set(elem.Key, 1)
              columnDefs.value.push({
                isDynamic: true,
                headerName: elem.Key,
                valueGetter: (params) => {
                  let justMap = new Map()
                  params.data.Justification.forEach((e, i) => {
                    justMap.set(e.Key, e.Value)
                  })
                  return justMap.get(elem.Key) || ""
                },
                valueFormatter: (params) => {
                  if (typeof params.value === "number") {
                    return params.value.toFixed(2)
                  }
                  return params.value
                },
                hide: false,
                sortable: true,
                resizable: true,
                editable: false
              })
            }
          })

          columnDefs.value = columnDefs.value.filter((elem, idx) => {
            if (!elem.isDynamic || keep.has(elem.headerName)) {
              return true
            }
            return false
          })

          setTimeout(function() {
            gridApi.setColumnDefs(columnDefs.value)
          }, 0)
        }
      }
    }

    function onSelectionChanged() {
      var selectedRows = gridApi.getSelectedRows()
      if (selectedRows.length === 1) {
        holdings.value = selectedRows[0].Holdings
        holdings2.value = selectedRows[0].Holdings
        holdingsDate.value = selectedRows[0].Time
      }
    }

    function fullscreen() {
      if (fullscreenClass.value) {
        fullscreenClass.value = false
        fullscreenIcon.value = 'fullscreen'
      } else {
        fullscreenClass.value = true
        fullscreenIcon.value = 'fullscreen_exit'
      }

      setTimeout(function() {
        var allColumnIds = []
        columnApi.getAllColumns().forEach(function (column) {
          allColumnIds.push(column.colId);
        })

        columnApi.autoSizeColumns(allColumnIds, true)
      }, 500)
    }

    function exportExcel(e) {
      e.preventDefault()
      gridApi.exportDataAsExcel({
        processCellCallback: ({column, value}) => {
          switch (column.colDef.cellClass) {
            case "dateType":
              return value.toISOString()
          }
          return value
        },
      })
    }

    function onGridReady(params) {
      gridApi.closeToolPanel()
    }

    return {
      columnApi,
      columnDefs,
      holdingsCalcColumnDefs,
      holdingsColumnDefs,
      exportExcel,
      format,
      fullscreen,
      fullscreenClass,
      fullscreenIcon,
      gridApi,
      gridOptions,
      holdings,
      holdings2,
      holdingsCalcGrid,
      holdingsCalcInput,
      holdingsCalculator,
      holdingsDate,
      onGridReady,
      onSelectionChanged,
      rowData,
      sideBar
    }
  }
})
</script>
