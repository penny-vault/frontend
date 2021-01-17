<template>
  <div class="portfolio">
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
            <b-nav-item-dropdown right>
              <!-- Using 'button-content' slot -->
              <template slot="button-content">
                <b-icon-person-circle></b-icon-person-circle>
              </template>
              <b-dropdown-item href="#">Profile</b-dropdown-item>
              <b-dropdown-item href="#">Sign Out</b-dropdown-item>
            </b-nav-item-dropdown>
          </b-navbar-nav>
        </b-collapse>
      </b-container>
    </b-navbar>
    <img id="logo" src="@/assets/logo.png" alt="Penny Vault Logo" />
  </div>
</template>

<script>
export default {
  name: 'Portfolio',
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
<style lang="scss">
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
