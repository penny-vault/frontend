<template>
    <px-card title="Parameters">
      <div class="q-gutter-md">
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

      <hr class="q-mb-md q-mt-md" />

      <q-form @submit="onSubmit">

      <q-input
        outlined
        v-for="item in spec"
        :key="item.id"
        :name="item.inpid"
        :label="item.name"
        v-model="form[item.arg]"
        :type="item.inptype"
        :disable="disabled"
        :rules="[val => !!val || 'Field is required']"
      />

      <q-input
        outlined
        name="benchmarkTickerId"
        label="Benchmark"
        v-model="benchmarkTickerData"
        type="text"
        :disable="disabled"
      />

      <!-- start date of simulation -->
      <q-input class="q-mt-md" filled v-model="startDate" mask="date" label="Start Date">
        <template v-slot:append>
          <q-icon name="event" class="cursor-pointer">
            <q-popup-proxy ref="qStartDateProxy" transition-show="scale" transition-hide="scale">
              <q-date v-model="startDate" today-btn />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>

      <!-- end date of simulation -->
      <q-input class="q-mt-md" filled v-model="endDate" mask="date" label="End Date">
        <template v-slot:append>
          <q-icon name="event" class="cursor-pointer">
            <q-popup-proxy ref="qEndDateProxy" transition-show="scale" transition-hide="scale">
              <q-date v-model="endDate" today-btn />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>

      <q-btn class="q-mt-sm" v-if="!disabled" type="submit" color="info" label="Run Strategy" />
    </q-form>
  </px-card>
</template>

<script>
import { format, parse } from 'date-fns'
import { defineComponent, ref, watch, toRefs, onMounted } from 'vue'
import PxCard from 'components/PxCard.vue'

const DATE_FORMAT = 'yyyy/MM/dd'

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

    const form = ref({})
    const spec = ref([])
    const frequentlyUsed = ref('')
    const frequentlyUsedOptions = ref([])
    const benchmarkTickerData = ref(`${benchmarkTicker.value}`)
    const startDate = ref(format(props.begin, DATE_FORMAT))
    const endDate = ref(format(props.end, DATE_FORMAT))

    const qStartDateProxy = ref(null)
    const qEndDateProxy = ref(null)

    async function initializeArguments() {
      spec.value = []
      Object.entries(strategy.value.arguments).forEach( elem => {
        const [k, v] = elem
        var item = {
          arg: k,
          name: v.name,
          description: v.description,
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
        form.value[item.arg] = item.inpdefault
      })
    }

    async function initializeFrequentlyUsed() {
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
        userArgs: form.value,
        begin: parse(startDate.value, DATE_FORMAT, new Date()),
        end: parse(endDate.value, DATE_FORMAT, new Date()),
        benchmarkTicker: benchmarkTickerData.value
      }

      Object.entries(strategy.value.arguments).forEach( elem => {
        const [k, v] = elem;
        if (v.typecode == '[]string') {
          options.userArgs[k] = options.userArgs[k].split(' ');
        }
      })

      emit('execute', options)
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
      startDate.value = format(n, DATE_FORMAT)
    })

    watch(end, (n) => {
      endDate.value = format(n, DATE_FORMAT)
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
      benchmarkTickerData,
      form,
      frequentlyUsed,
      frequentlyUsedOptions,
      onSubmit,
      spec,
      startDate,
      endDate,
      qStartDateProxy,
      qEndDateProxy
    }
  }
})
</script>
