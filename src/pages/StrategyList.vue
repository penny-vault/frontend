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
      },

      { field: 'description',
        sortable: false,
        filter: 'agTextColumnFilter',
        filterParams: {
          buttons: ['reset', 'apply'],
        },
      },
    ])

    //const frameworkComponents = ref({ btnCellRenderer: AgGridBtnCellRenderer })
    const sideBar = ref(true)

    const rowData = computed({
      get: () => $store.state.strategy.list,
      set: val => {
      }
    })

    $store.dispatch('strategy/fetchStrategies')

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
