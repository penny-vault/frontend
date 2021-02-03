<template>
  <ag-grid-vue style="width: 100%; height: 500px;"
    class="ag-theme-alpine"
    :columnDefs="columnDefs"
    :rowData="rowData">
  </ag-grid-vue>
</template>

<script>
import { AgGridVue } from "ag-grid-vue"

export default {
  name: 'Portfolio',
  props: {
    rowData: Array
  },
  components: {
    AgGridVue
  },
  data() {
    return {
      columnDefs: [
        { field: 'date', width: 100, filter: 'agDateColumnFilter', sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
            var d = params.data.date;
            const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d)
            const mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d)
            //const da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(d)
            return `${mo} ${ye}`
          }
        },
        { field: 'ticker', width: 150 },
        { headerName: 'Monthly Return'},
        { headerName: 'VFINX Return'},
        { headerName: 'PRIDX Return'},
        { headerName: 'VFINX Score'},
        { headerName: 'PRIDX Score'}
      ]
    }
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
