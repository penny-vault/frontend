<template>
  <q-item clickable v-ripple :to="link">
    <q-item-section v-if="icon" avatar>
      <q-icon :name="icon" color="grey-4" />
    </q-item-section>

    <q-item-section>
      <q-item-label class="text-grey-4">{{ title }}</q-item-label>
      <q-item-label v-if="caption" caption>
        {{ caption }}
      </q-item-label>
    </q-item-section>
  </q-item>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'EssentialLink',
  props: {
    title: {
      type: String,
      required: true
    },

    caption: {
      type: String,
      default: ''
    },

    link: {
      type: String,
      default: '#'
    },

    icon: {
      type: String,
      default: ''
    }
  }
})
</script>

<style lang="scss" scoped>
  a:hover {
    background: rgba(.5, .5, .5, .2);
  }
</style>