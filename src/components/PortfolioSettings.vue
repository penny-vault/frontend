<template>
<b-form ref="params" @submit="onSubmit">
    <!-- portfolio name -->
    <b-form-group
      label="Portfolio Name"
      v-slot="{ ariaName }"
    >
    <b-form-input
        v-model="name"
        :aria-describedby="ariaName"
      ></b-form-input>
    </b-form-group>

    <!-- notification settings -->
    <b-form-group
      label="Notification frequency"
      v-slot="{ ariaNotification }"
    >
    <b-form-checkbox-group
        v-model="notification"
        :options="notificationOpts"
        :aria-describedby="ariaNotification"
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
    portfolioId: String,
    portfolioSettings: Object
  },
  components: {
  },
  data() {
    return {
        name: "",
        notification: [],
        notificationOpts: [
          { text: 'Daily',    value: 0x00000001 },
          { text: 'Weekly',   value: 0x00000010 },
          { text: 'Monthly',  value: 0x00000100 },
          { text: 'Annually', value: 0x00001000 }
        ]
    }
  },
  mounted: function() {
    this.setFormValues(this.portfolioSettings)
  },
  watch: {
    portfolioSettings: function(n) {
      this.setFormValues(n)
    }
  },
  methods: {
    onSubmit: async function(e) {
      e.preventDefault()
      var notificationCode = 0
      this.notification.forEach( elem => {
        notificationCode |= elem
      })

      var params = {
        name: this.name,
        notifications: notificationCode
      }

      this.$emit("settingsChanged", params)
      this.updatePortfolio(params)
    },
    updatePortfolio: async function(params) {
      // Get the access token from the auth wrapper
      const token = await this.$auth.getTokenSilently()

      // Use Axios to make a call to the API
      try {
        const { data } = await this.$axios.patch("/portfolio/" + this.portfolioId, params, {
          headers: {
            Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
          }
        })
        this.$bvToast.toast(`Saved portfolio settings: ${data.name} (${data.id})`, {
          title: 'Saved',
          variant: 'success',
          autoHideDelay: 5000,
          appendToast: false
        })
        return
      } catch(error) {
        this.$bvToast.toast("Failed to save portfolio settings", {
          title: 'Error',
          variant: 'danger',
          autoHideDelay: 5000,
          appendToast: false
        })
        return
      }

    },
    setFormValues: async function(vals) {
      this.name = vals.name
      this.notification = []
      if (vals.notifications & 0x00000001) {
        this.notification.push(0x00000001)
      }
      if (vals.notifications & 0x00000010) {
        this.notification.push(0x00000010)
      }
      if (vals.notifications & 0x00000100) {
        this.notification.push(0x00000100)
      }
      if (vals.notifications & 0x00001000) {
        this.notification.push(0x00001000)
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
