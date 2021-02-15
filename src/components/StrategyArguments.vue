<template>
    <b-card
        header="Strategy Parameters"
        header-bg-variant="primary"
        header-text-variant="white"
        align="left"
        class="ml-0"
    >

        <b-form ref="params" @submit="onSubmit">
            <b-form-group v-for="item in spec" :label="item.name" :description="item.description" :key="item.id" :label-for="item.inpid">
            <b-form-input
                :id="item.inpid"
                v-model="form[item.arg]"
                :type="item.inptype"
                :required="item.required"
                :disabled="disabled"
            ></b-form-input>
            </b-form-group>

            <b-form-group label="Benchmark" description="Symbol to compare performance against" label-for="benchmarkTickerId">
            <b-form-input
                id="benchmarkTickerId"
                v-model="benchmarkTickerData"
                type="text"
                :disabled="disabled"
            ></b-form-input>
            </b-form-group>

            <b-form-group label="Date Range" label-for="simulationDates">
              <VueCtkDateTimePicker class="datePicker" id="simulationDates" v-model="simulationDates" formatted="DD MMM YY" :custom-shortcuts="shortcuts" :disabled="disabled" :disabled-weekly="disabledDates" noWeekendDays noLabel range />
            </b-form-group>

            <b-button v-if="!disabled" type="submit" class="mr-2" variant="info">Submit</b-button>
        </b-form>

    </b-card>
</template>

<script>
import Moment from 'moment'
import VueCtkDateTimePicker from 'vue-ctk-date-time-picker';
import 'vue-ctk-date-time-picker/dist/vue-ctk-date-time-picker.css';

export default {
  name: 'StrategyArguments',
  props: {
    spec: Array,
    callback: Function,
    disabled: Boolean,
    begin: Date,
    end: Date,
    benchmarkTicker: {
      type: String,
      default: "VFINX"
    }
  },
  data() {
    return {
      form: {},
      benchmarkTickerData: this.benchmarkTicker,
      disabledDates: [0,6],
      shortcuts: [
        { key: 'thisYear', label: 'This year', value: 'year' },
        { key: 'lastYear', label: 'Last year', value: '-year' },
        { key: 'last3Years', label: 'Last 3 years', value: () => {
          return {
            start: Moment().subtract(3, 'years'),
            end: Moment()
          }}
        },
        { key: 'last5Years', label: 'Last 5 years', value: () => {
          return {
            start: Moment().subtract(5, 'years'),
            end: Moment()
          }}
        },
        { key: 'last10Years', label: 'Last 10 years', value: () => {
          return {
            start: Moment().subtract(10, 'years'),
            end: Moment()
          }}
        },
        { key: 'last15Years', label: 'Last 15 years', value: () => {
          return {
            start: Moment().subtract(15, 'years'),
            end: Moment()
          }}
        }
      ],
      simulationDates: {"start": new Date(1980,0,1), "end": new Date()}
    }
  },
  components: {
    VueCtkDateTimePicker
  },
  mounted: async function() {
      Object.entries(this.spec).forEach(elem => {
        elem = elem[1]
        this.form[elem.arg] = elem.inpdefault
      })
      if (this.begin != 0) {
        this.simulationDates.start = this.begin
      }
      if (this.end != 0) {
        this.simulationDates.end = this.end
      }
  },
  watch: {
    spec: function(n) {
      Object.entries(n).forEach( elem => {
        elem = elem[1]
        this.form[elem.arg] = elem.inpdefault
      })
    },
    begin: function(n) {
      this.simulationDates.start = n
    },
    end: function(n) {
      this.simulationDates.end = n
    }
  },
  methods: {
      onSubmit: async function(e) {
          e.preventDefault()
          this.$emit("execute", this.form, this.simulationDates.start, this.simulationDates.end, this.benchmarkTickerData)
      }
  }
}
</script>

<style scoped>

</style>
