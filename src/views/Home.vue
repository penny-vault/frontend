<template>
  <div class="home">
    <Portfolio />

    <!-- Check that the SDK client is not currently loading before accessing is methods -->
    <div v-if="!$auth.loading">
      <!-- show login when not authenticated -->
      <button v-if="!$auth.isAuthenticated" @click="login">Log in</button>
      <!-- show logout when authenticated -->
      <button v-if="$auth.isAuthenticated" @click="logout">Log out</button>
    </div>

  </div>
</template>

<script>
// @ is an alias to /src
import Portfolio from '@/components/Portfolio.vue'

export default {
  name: 'Home',
  components: {
    Portfolio
  },
  mounted: async function() {
    // Use Axios to make a call to the API to get things kicking if it's idle
    await this.$axios.get("/");
  },
  methods: {
    // Log the user in
    login() {
      this.$auth.loginWithRedirect();
    },
    // Log the user out
    logout() {
      this.$auth.logout({
        returnTo: window.location.origin
      });
    }
  }
}
</script>
