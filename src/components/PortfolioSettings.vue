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
    <b-button type="button" class="mr-2" variant="danger" @click="deletePortfolio">Delete</b-button>
</b-form>

</template>

<script>

const NoNotify = 0x00000001
const Daily    = 0x00000010
const Weekly   = 0x00000100
const Monthly  = 0x00001000
const Annually = 0x00010000

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
          { text: 'Daily',    value: Daily },
          { text: 'Weekly',   value: Weekly },
          { text: 'Monthly',  value: Monthly },
          { text: 'Annually', value: Annually }
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
      var notificationCode = NoNotify
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
    deletePortfolio: async function() {
      // Get the access token from the auth wrapper
      const token = await this.$auth.getTokenSilently()

      this.$bvModal.msgBoxConfirm('Please confirm that you want to delete this portfolio.', {
          title: 'Confirm',
          size: 'sm',
          buttonSize: 'sm',
          okVariant: 'danger',
          okTitle: 'DELETE',
          cancelTitle: 'CANCEL',
          footerClass: 'p-2',
          hideHeaderClose: false,
          centered: true
        })
        .then(value => {
          if (!value) {
            return
          }

          // Use Axios to make a call to the API
          this.$axios.delete("/portfolio/" + this.portfolioId, {
              headers: {
                Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
              }
            }).then( resp => {
              this.$bvToast.toast(`Deleted saved portfolio ${resp}`, {
              title: 'Deleted',
              variant: 'success',
              autoHideDelay: 5000,
              appendToast: false
            })
            this.$router.replace("/portfolio/")
            return
            }).catch( err => {
            this.$bvToast.toast(`Failed to delete portfolio: ${err}`, {
              title: 'Error',
              variant: 'danger',
              autoHideDelay: 5000,
              appendToast: false
            })
          })
        })
        .catch(err => {
          this.$bvToast.toast(`Failed to delete portfolio: ${err}`, {
            title: 'Error',
            variant: 'danger',
            autoHideDelay: 5000,
            appendToast: false
          })
        })
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
      if ((vals.notifications & Daily) == Daily) {
        this.notification.push(Daily)
      }
      if ((vals.notifications & Weekly) == Weekly) {
        this.notification.push(Weekly)
      }
      if ((vals.notifications & Monthly) == Monthly) {
        this.notification.push(Monthly)
      }
      if ((vals.notifications & Annually) == Annually) {
        this.notification.push(Annually)
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
