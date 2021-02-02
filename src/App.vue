<template>
  <div id="app">

    <b-navbar toggleable="lg" type="dark" variant="nav">
      <b-container>
        <b-navbar-brand href="/">Penny Vault</b-navbar-brand>
        <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>
        <b-collapse id="nav-collapse" is-nav>
          <b-navbar-nav>
            <b-nav-item to="/portfolio">Portfolios</b-nav-item>
            <b-nav-item to="/strategies">Strategies</b-nav-item>
          </b-navbar-nav>

          <!-- Right aligned nav items -->
          <b-navbar-nav class="ml-auto">
            <b-nav-item-dropdown v-if="$auth.isAuthenticated" right>
              <!-- Using 'button-content' slot -->
              <template slot="button-content">
                <b-icon-person-circle></b-icon-person-circle>
              </template>
              <b-dropdown-item v-if="$auth.isAuthenticated" to="/profile">Profile</b-dropdown-item>
              <b-dropdown-item v-if="$auth.isAuthenticated" @click="logout">Sign Out</b-dropdown-item>
            </b-nav-item-dropdown>
          </b-navbar-nav>
        </b-collapse>
      </b-container>
    </b-navbar>
    <img id="logo" src="@/assets/logo.webp" alt="Penny Vault Logo" />

    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App',
  methods: {
    // Log the user in
    login() {
      this.$auth.loginWithRedirect({ scope: 'read:current_user_metadata' });
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

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.navbar-brand {
  font-family: "Sacramento", sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
}

.navbar {
  margin-bottom: 10px;
}

#overlay {
  position: absolute;
  top: 0;
  width: 100%;
  align-items: center;
}

#inner-container {
  margin-left: auto;
  margin-right: auto;
  width: 1239px;
  text-align: left;
}

#logo {
  position: absolute;
  top: 0px;
  left: calc(100% / 2 - 620px);
  margin-top: 10px;
  height: 55px;
  width: 55px;
}
</style>
