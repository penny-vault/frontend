<template>
 <div class="q-pa-md">
    <div class="q-gutter-md row items-start">
      <q-select
        filled
        ref="picker"
        v-model="model"
        stack-label
        use-input
        input-debounce="0"
        :label="label"
        menu-anchor="bottom left"
        virtual-scroll-slice-size="4"
        :multiple="multiple"
        :options="options"
        @filter="filterFn"
        @update:model-value="updateModelValue"
      >
        <template v-slot:option="scope">
          <q-item v-bind="scope.itemProps">
            <q-item-section>
              <q-item-label>{{ scope.opt.ticker }}</q-item-label>
              <q-item-label caption>{{ scope.opt.name }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>
        <template v-slot:no-option>
          <q-item>
            <q-item-section class="text-grey">
              No results
            </q-item-section>
          </q-item>
        </template>
        <template v-slot:selected-item="scope">
          <q-chip
            removable
            dense
            @remove="scope.removeAtIndex(scope.index)"
            :tabindex="scope.tabindex"
            color="white"
            text-color="secondary"
            class="q-ma-xs"
          >
            {{ scope.opt.ticker }}
          </q-chip>
        </template>
      </q-select>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useModelWrapper } from '../util/modelWrapper'
import { api } from 'boot/axios'
import { authPlugin } from '../auth'

export default defineComponent({
  name: 'SecurityPicker',
  props: {
    modelValue: [Object, Array],
    multiple: Boolean
  },
  setup (props, { emit }) {
    const options = ref(null)
    const picker = ref(null)
    const label = ref("Select security")

    if (props.multiple === true) {
      label.value = "Select securities"
    }

    return {
      options,
      picker,
      label,
      model: useModelWrapper(props, emit, 'modelValue'),
      filterFn (val, update, abort) {
        update(async () => {
          const accessToken = await authPlugin.getTokenSilently()
          api.get(`/security?q=${val}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Range: "items=0-3"
            }
          }).then(response => {
            options.value = response.data
          }).catch(function (error) {
            console.log(error)
            abort()
          })
        })
      },

      updateModelValue () {
        picker.value.updateInputValue('')
        setTimeout(() => picker.value.hidePopup(), 1)
      }
    }
  }
})
</script>