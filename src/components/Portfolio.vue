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
        { field: 'date', width: 110, filter: 'agDateColumnFilter', sortable: true, sortingOrder: ['desc', 'asc'], sort: 'desc', resizable: true, editable: false, valueFormatter: (params) => {
            var d = params.data.date;
            const ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d)
            const mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(d)
            //const da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(d)
            return `${mo} ${ye}`
          }
        },
        { field: 'ticker', width: 90, sortable: true, resizable: true, editable: false},
        { field: 'percentReturn', width: 90, headerName: 'Return', sortable: true, resizable: true, editable: false, valueFormatter: (params) => {
            var d = (params.data.percentReturn * 100).toFixed(2);
            return `${d}%`
          }
        }
      ]
    }
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
