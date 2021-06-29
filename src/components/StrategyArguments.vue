<template>
    <px-card title="Parameters">
      <template v-slot:toolbar>
        <q-btn @click="panel='standard'" dense flat size="sm" icon="dashboard" color="grey-6"><q-tooltip>Main Settings</q-tooltip></q-btn>
        <q-btn @click="panel='benchmark'" dense flat size="sm" icon="assessment" color="grey-6"><q-tooltip>Benchmark</q-tooltip></q-btn>
        <q-btn @click="panel='advanced'" dense flat size="sm" icon="settings" color="grey-6"><q-tooltip>Advanced Settings</q-tooltip></q-btn>
      </template>

      <q-form @submit="onSubmit">

      <q-tab-panels class="q-mt-sm" v-model="panel" animated>
        <q-tab-panel name="standard" class="q-pa-none">
          <div v-if="!disabled" class="q-gutter-md">
            <q-select
              v-model="frequentlyUsed"
              size="sm"
              :options="frequentlyUsedOptions"
              options-cover
              stack-label
              outlined
              label="Frequently used parameters"
            />
          </div>

          <hr v-if="!disabled" class="q-mb-md q-mt-md" />

          <q-input
            outlined
            v-for="item in standard"
            :key="item.id"
            :name="item.inpid"
            :label="item.name"
            v-model="form[item.arg]"
            :type="item.inptype"
            :disable="disabled"
            :rules="[val => !!val || 'Field is required']"
          />

          <!-- start date of simulation -->
          <q-input class="q-my-none" filled v-model="startDate" mask="date" label="Start Date" :rules="['date', checkStartDate]">
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy ref="qStartDateProxy" transition-show="scale" transition-hide="scale">
                  <q-date v-model="startDate" minimal>
                    <div class="row">
                      <div class="col-grow justify-center">
                        <q-btn label="ytd" size="md" color="info" @click="dateRange(0)" dense flat/>
                      </div>
                      <div class="col-grow justify-center">
                        <q-btn label="1y" size="md" color="info" @click="dateRange(12)" dense flat/>
                      </div>
                      <div class="col-grow justify-center">
                        <q-btn label="3y" size="md" color="info" @click="dateRange(36)" dense flat/>
                      </div>
                      <div class="col-grow justify-center">
                        <q-btn label="5y" size="md" color="info" @click="dateRange(60)" dense flat/>
                      </div>
                      <div class="col-grow justify-center">
                        <q-btn label="10y" size="md" color="info" @click="dateRange(120)" dense flat/>
                      </div>
                      <div class="col-grow justify-center">
                        <q-btn label="15y" size="md" color="info" @click="dateRange(180)" dense flat/>
                      </div>
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <!-- end date of simulation -->
          <q-input class="q-my-none" filled v-model="endDate" mask="date" label="End Date" :rules="['date', checkEndDate]">
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy ref="qEndDateProxy" transition-show="scale" transition-hide="scale">
                  <q-date v-model="endDate" minimal>
                    <div class="row">
                      <div class="col-grow justify-center">
                        <q-btn label="ytd" size="md" color="info" @click="dateRange(0)" dense flat/>
                      </div>
                      <div class="col-grow justify-center">
                        <q-btn label="1y" size="md" color="info" @click="dateRange(12)" dense flat/>
                      </div>
                      <div class="col-grow justify-center">
                        <q-btn label="3y" size="md" color="info" @click="dateRange(36)" dense flat/>
                      </div>
                      <div class="col-grow justify-center">
                        <q-btn label="5y" size="md" color="info" @click="dateRange(60)" dense flat/>
                      </div>
                      <div class="col-grow justify-center">
                        <q-btn label="10y" size="md" color="info" @click="dateRange(120)" dense flat/>
                      </div>
                      <div class="col-grow justify-center">
                        <q-btn label="15y" size="md" color="info" @click="dateRange(180)" dense flat/>
                      </div>
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-tab-panel>
        <q-tab-panel name="benchmark" class="q-pa-none">
          <q-input
            outlined
            name="benchmarkTickerId"
            label="Benchmark"
            v-model="benchmarkTickerData"
            type="text"
            :disable="disabled"
          />
        </q-tab-panel>
        <q-tab-panel name="advanced" class="q-pa-none">
          <q-input
            outlined
            v-for="item in advanced"
            :key="item.id"
            :name="item.inpid"
            :label="item.name"
            v-model="form[item.arg]"
            :type="item.inptype"
            :disable="disabled"
            :rules="[val => !!val || 'Field is required']"
          />
        </q-tab-panel>
      </q-tab-panels>
      <q-btn class="q-mt-sm" v-if="!disabled" type="submit" color="info" label="Run Strategy" />
    </q-form>
  </px-card>
</template>

<script>
import { format, parse, subMonths } from 'date-fns'
import { clone } from 'lodash'
import { defineComponent, ref, watch, toRefs, onMounted } from 'vue'
import PxCard from 'components/PxCard.vue'

export default defineComponent({
  name: 'StrategyArguments',
  props: {
    strategy: Object,
    disabled: {
      type: Boolean,
      default: false
    },
    begin: {
      type: Date,
      default: new Date(1982,7,27)
    },
    end: {
      type: Date,
      default: new Date()
    },
    benchmarkTicker: {
      type: String,
      default: "VFINX"
    }
  },
  components: {
    PxCard
  },
  emits: ['execute'],
  setup(props, { emit }) {
    const { strategy, begin, end, benchmarkTicker } = toRefs(props)

    const dateFmt = ref('yyyy/MM/dd')
    const form = ref({})
    const spec = ref([])
    const standard = ref([])
    const advanced = ref([])
    const panel = ref('standard')
    const frequentlyUsed = ref('')
    const frequentlyUsedOptions = ref([])
    const benchmarkTickerData = ref(`${benchmarkTicker.value}`)
    const startDate = ref(format(props.begin, dateFmt.value))
    const endDate = ref(format(props.end, dateFmt.value))

    const qStartDateProxy = ref(null)
    const qEndDateProxy = ref(null)

    async function initializeArguments() {
      advanced.value = []
      standard.value = []
      Object.entries(strategy.value.arguments).forEach( elem => {
        const [k, v] = elem
        var item = {
          arg: k,
          name: v.name,
          description: v.description,
          advanced: v.advanced,
          id: v.name + "_id",
          inpid: v.name + "_inp_id",
          inptype: "text",
          typecode: v.typecode,
          inpdefault: v.default,
          required: true
        }

        if (v.typecode == "number") {
          item.inptype = "number"
          item.inpdefault = Number(item.inpdefault)
        }

        if (v.typecode == "[]string") {
          var val = item.inpdefault
          if (typeof item.inpdefault === "string") {
            val = JSON.parse(val)
          }
          item.inpdefault = val.join(" ")
        }

        spec.value.push(item)

        if (item.advanced) {
          advanced.value.push(item)
        } else {
          standard.value.push(item)
        }

        form.value[item.arg] = item.inpdefault
      })
    }

    async function initializeFrequentlyUsed() {
      frequentlyUsedOptions.value = []
      Object.entries(strategy.value.suggestedParams).forEach( elem => {
        var opt = {
          label: elem[0],
          value: elem[1]
        }
        frequentlyUsedOptions.value.push(opt)
      })
    }

    async function onSubmit(e) {
      e.preventDefault()
      let options = {
        userArgs: clone(form.value),
        begin: parse(startDate.value, dateFmt.value, new Date()),
        end: parse(endDate.value, dateFmt.value, new Date()),
        benchmarkTicker: clone(benchmarkTickerData.value)
      }

      Object.entries(strategy.value.arguments).forEach( elem => {
        const [k, v] = elem;
        switch (v.typecode) {
          case "[]string":
            options.userArgs[k] = options.userArgs[k].split(' ')
            break
          case "number":
            options.userArgs[k] = Number(options.userArgs[k])
            break
        }
      })

      emit('execute', options)
    }

    function checkStartDate(value) {
      const v = parse(value, dateFmt.value, new Date())
      let e = parse(endDate.value, dateFmt.value, new Date())
      e = subMonths(e, 1)
      return v < e || 'start > end - 1 month'
    }

    function checkEndDate(value) {
      let v = parse(value, dateFmt.value, new Date())
      const s = parse(startDate.value, dateFmt.value, new Date())
      v = subMonths(v, 1)
      return s < v || 'start > end - 1 month'
    }

    function dateRange(value) {
      const today = new Date()
      let start = null
      if (value === 0) {
        // ytd
        start = new Date(today.getFullYear(), 0, 1)
      } else {
        start = subMonths(today, value)
      }

      startDate.value = format(start, dateFmt.value)
      endDate.value = format(today, dateFmt.value)
      qStartDateProxy.value.hide()
      qEndDateProxy.value.hide()
    }

    // watch parameters
    watch(strategy, (n) => {
      initializeArguments()
      initializeFrequentlyUsed()
    })

    watch(frequentlyUsed, (n) => {
      let v = n.value
      spec.value.forEach( elem => {
        let val = v[elem.arg]
        switch (elem.typecode) {
          case "[]string":
            form.value[elem.arg] = JSON.parse(val).join(" ")
            break
          case "number":
            form.value[elem.arg] = Number(val)
            break
          default:
            form.value[elem.arg] = val
        }
      })
    })

    watch(begin, (n) => {
      startDate.value = format(n, dateFmt.value)
    })

    watch(end, (n) => {
      endDate.value = format(n, dateFmt.value)
    })

    watch(startDate, (n) => {
      qStartDateProxy.value.hide()
    })

    watch(endDate, (n) => {
      qEndDateProxy.value.hide()
    })

    // Creation functions
    onMounted(async () => {
      initializeArguments()
      initializeFrequentlyUsed()
    })

    return {
      advanced,
      benchmarkTickerData,
      checkStartDate,
      checkEndDate,
      dateRange,
      form,
      frequentlyUsed,
      frequentlyUsedOptions,
      onSubmit,
      panel,
      spec,
      standard,
      startDate,
      endDate,
      qStartDateProxy,
      qEndDateProxy
    }
  }
})
</script>
