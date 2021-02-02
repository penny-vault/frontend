<template>
  <div class="home">
    <div class="background"></div>
    <Portfolio />

    <div class="banner">
      Welcome to Penny Vault!
      <!-- Check that the SDK client is not currently loading before accessing is methods -->
      <span v-if="!$auth.loading">
        <!-- show login when not authenticated -->
        <span v-if="!$auth.isAuthenticated">
        <p>
          Please login to get started: <b-button class="helvetica" variant="dark" size="lg" @click="login">Login</b-button>

        </p>
        </span>
      </span>
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

<style lang="scss" scoped>
.background {
  margin: 0;
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: -999;
  background-image: url("../assets/wallpaper.webp");
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.helvetica {
  font-family: "Helvetica", sans-serif;
}

.banner {
  font-family: "Sacramento", sans-serif;
  font-weight: 900;
  font-size: 4rem;
  text-align: left;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: left;
  margin-left: 100px;
  margin-top: 300px;
  color: black;
}
</style>