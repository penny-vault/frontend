<template>
<b-form ref="params" @submit="onSubmit" @reset="onReset">
    <b-form-group
      label="Notification frequency"
      v-slot="{ ariaDescribedby }"
    >
    <b-form-checkbox-group
        v-model="notification"
        :options="notificationOpts"
        :aria-describedby="ariaDescribedby"
        switches
      ></b-form-checkbox-group>
    </b-form-group>

    <b-button type="submit" class="mr-2" variant="info">Save</b-button>
</b-form>
</template>

<script>

export default {
  name: 'PortfolioSettings',
  props: {
    portfolioId: String
  },
  components: {
  },
  data() {
    return {
        notification: [], // Must be an array reference!
        notificationOpts: [
          { text: 'Daily', value: 'daily' },
          { text: 'Weekly', value: 'weekly' },
          { text: 'Monthly', value: 'monthly' },
          { text: 'Annually', value: 'annually' }
        ]
    }
  },
  methods: {
      onSubmit: async function(e) {
          e.preventDefault()
      }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
