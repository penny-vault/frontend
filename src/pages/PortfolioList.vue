<template>
  <div class="q-pa-md">
    <h4 class="q-mt-sm q-mb-sm"><q-icon name="ion-albums" color="blue" size="md" class="q-mr-sm" />My Portfolios</h4>
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
            $router.push({ path: `/app/portfolios/${field}` })
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
        minWidth: 300,
        filter: 'agTextColumnFilter',
        filterParams: {
          buttons: ['reset', 'apply'],
        },
        checkboxSelection: true },
      { field: 'ytd_return',
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
          if (params.data.ytd_return.Valid) {
            return params.data.ytd_return.Float64 * 100
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) + '%' : ''
      },
      { field: 'cagr_since_inception',
        headerName: 'CAGR',
        sortable: true,
        minWidth: 100,
        maxWidth: 100,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['apply', 'reset'],
          closeOnApply: true,
        },
        valueGetter: function (params) {
          if (params.data.cagr_since_inception.Valid) {
            return params.data.cagr_since_inception.Float64 * 100
          } else {
            return NaN
          }
        },
        valueFormatter: params => !isNaN(params.value) ? params.value.toFixed(2) + '%' : ''
      },
      { field: 'strategy',
        sortable: true,
        filter: true,
        minWidth: 50, maxWidth: 125,
        enableRowGroup: true,
        enablePivot: true
      },
      { field: 'start_date',
        headerName: 'Beginning Date',
        sortable: true,
        filter: true,
        minWidth: 100,
        filter: 'agDateColumnFilter',
        valueFormatter: params => params.value.toDateString()
      }
    ])

    //const frameworkComponents = ref({ btnCellRenderer: AgGridBtnCellRenderer })
    const sideBar = ref(true)

    const rowData = computed({
      get: () => $store.state.portfolio.portfolios,
      set: val => {
        $store.commit('portfolio/setPortfolios', val)
      }
    })

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
