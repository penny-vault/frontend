<template>
  <div class="q-pa-md">
    <h4 class="q-mt-sm q-mb-sm"><q-icon name="app:portfolio" color="grey-9" size="sm" class="q-mr-md q-mb-sm" />My Portfolios</h4>
    <q-breadcrumbs class="q-mb-lg">
      <q-breadcrumbs-el icon="home" to="/app" />
      <q-breadcrumbs-el label="My Portfolios" />
    </q-breadcrumbs>
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
</template>

<script>
import { defineComponent, computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

import { AgGridVue } from 'ag-grid-vue3'
import AgGridBtnCellRenderer from "components/AgGridBtnCellRenderer.vue"

export default defineComponent({
  name: 'PortfolioList',

  components: {
    AgGridVue,
    'btnCellRenderer': AgGridBtnCellRenderer
  },

  setup () {
    const $store = useStore()
    const $router = useRouter()

    const gridOptions = ref({})
    const gridApi = ref({})
    const columnApi = ref({})
    const columnDefs = ref([

      {
        field: "id",
        headerName: "",
        cellRendererFramework: 'btnCellRenderer',
        cellRendererParams: {
          clicked: (function(field) {
            $router.push({ path: `/app/portfolio/${field}` })
          }).bind(this)
        },
        minWidth: 115,
        maxWidth: 115,
        sortable: false,
        editable: false,
        suppressMenu: true,
        filter: false
      },

      { field: 'name',
        sortable: true,
        minWidth: 275,
        filter: 'agTextColumnFilter',
        filterParams: {
          buttons: ['reset', 'apply'],
        },
        checkboxSelection: true },
      { field: 'ytdReturn',
        headerName: 'YTD',
        sortable: true,
        minWidth: 100,
        maxWidth: 100,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.ytdReturn.Status === 2) {
            return params.data.ytdReturn.Float * 100
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) + '%' : '-'
      },
      { field: 'cagr3Year',
        headerName: '3-Yr',
        sortable: true,
        minWidth: 100,
        maxWidth: 100,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.cagr3Year.Status === 2) {
            return params.data.cagr3Year.Float * 100
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) + '%' : '-'
      },
      { field: 'cagr5Year',
        headerName: '5-Yr',
        sortable: true,
        minWidth: 100,
        maxWidth: 100,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.cagr5Year.Status === 2) {
            return params.data.cagr5Year.Float * 100
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) + '%' : '-'
      },
      { field: 'cagr10Year',
        headerName: '10-Yr',
        sortable: true,
        minWidth: 100,
        maxWidth: 100,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.cagr10Year.Status === 2) {
            return params.data.cagr10Year.Float * 100
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) + '%' : '-'
      },
      { field: 'cagrSinceInception',
        headerName: 'Since Inception',
        sortable: true,
        minWidth: 160,
        maxWidth: 160,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.cagrSinceInception.Status === 2) {
            return params.data.cagrSinceInception.Float * 100
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) + '%' : '-'
      },
      { field: 'stdDev',
        headerName: 'Std Dev',
        sortable: true,
        hide: true,
        minWidth: 105,
        maxWidth: 105,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.stdDev.Status === 2) {
            return params.data.stdDev.Float
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) : '-'
      },
      { field: 'downsideDeviation',
        headerName: 'Downside Dev',
        sortable: true,
        hide: true,
        minWidth: 150,
        maxWidth: 150,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.downsideDeviation.Status === 2) {
            return params.data.downsideDeviation.Float * 100
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) + '%' : '-'
      },
      { field: 'maxDrawDown',
        headerName: 'Max Draw Down',
        sortable: true,
        hide: true,
        minWidth: 160,
        maxWidth: 160,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.maxDrawDown.Status === 2) {
            return params.data.maxDrawDown.Float * 100
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) + '%' : '-'
      },
      { field: 'avgDrawDown',
        headerName: 'Avg Draw Down',
        sortable: true,
        hide: true,
        minWidth: 160,
        maxWidth: 160,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.avgDrawDown.Status === 2) {
            return params.data.avgDrawDown.Float * 100
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) + '%' : '-'
      },
      { field: 'sharpeRatio',
        headerName: 'Sharpe',
        sortable: true,
        hide: true,
        minWidth: 100,
        maxWidth: 100,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.sharpeRatio.Status === 2) {
            return params.data.sharpeRatio.Float
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) : '-'
      },
      { field: 'sortinoRatio',
        headerName: 'Sortino',
        sortable: true,
        minWidth: 100,
        maxWidth: 100,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.sortinoRatio.Status === 2) {
            return params.data.sortinoRatio.Float
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) : '-'
      },
      { field: 'ulcerIndex',
        headerName: 'Ulcer Index',
        sortable: true,
        minWidth: 135,
        maxWidth: 135,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.ulcerIndex.Status === 2) {
            return params.data.ulcerIndex.Float
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) : '-'
      },
      { field: 'strategy',
        sortable: true,
        filter: true,
        minWidth: 30, maxWidth: 125,
        enableRowGroup: true,
        enablePivot: true
      },
      { field: 'status',
        sortable: true,
        filter: true,
        minWidth: 40, maxWidth: 125,
        enableRowGroup: true,
        enablePivot: true
      },
      { field: 'startDate',
        headerName: 'Start',
        sortable: true,
        hide: true,
        filter: true,
        minWidth: 100,
        filter: 'agDateColumnFilter',
        valueFormatter: params => params.value.toDateString()
      }
    ])

    //const frameworkComponents = ref({ btnCellRenderer: AgGridBtnCellRenderer })
    const sideBar = ref(true)

    const rowData = computed(() => $store.state.portfolio.portfolios)

    $store.dispatch('portfolio/fetchPortfolios')

    onMounted(() => {
      gridApi.value = gridOptions.value.api;
      columnApi.value = gridOptions.value.columnApi;
    })

    return {
      columnDefs,
      //frameworkComponents,
      rowData,
      gridOptions,
      gridApi,
      columnApi,
      sideBar,
      onGridReady(params) {
        gridApi.value.closeToolPanel()
      }
    }
  }
})
</script>
