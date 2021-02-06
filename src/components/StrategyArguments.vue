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

            <b-form-group label="Start Date" label-for="simulationBegin">
            <b-form-datepicker id="simulationBegin" v-model="simulationBegin" :date-format-options="{ year: 'numeric', month: 'short'}" :disabled="disabled"></b-form-datepicker>
            </b-form-group>

            <b-form-group label="End Date" label-for="simulationEnd">
            <b-form-datepicker id="simulationEnd" v-model="simulationEnd" :date-format-options="{ year: 'numeric', month: 'short'}" :disabled="disabled"></b-form-datepicker>
            </b-form-group>

            <b-button v-if="!disabled" type="submit" class="mr-2" variant="info">Submit</b-button>
        </b-form>

    </b-card>
</template>

<script>
export default {
  name: 'StrategyArguments',
  props: {
    spec: Array,
    callback: Function,
    disabled: Boolean
  },
  data() {
    return {
      form: {},
      simulationBegin: new Date(1980,0,1),
      simulationEnd: new Date(),
    }
  },
  mounted: async function() {
      Object.entries(this.spec).forEach(elem => {
        elem = elem[1]
        this.form[elem.arg] = elem.inpdefault
      })
  },
  watch: {
    spec: function(n) {
      Object.entries(n).forEach( elem => {
        elem = elem[1]
        this.form[elem.arg] = elem.inpdefault
      })
    }
  },
  methods: {
      onSubmit: async function(e) {
          e.preventDefault()
          this.$emit("execute", this.form)
      }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
