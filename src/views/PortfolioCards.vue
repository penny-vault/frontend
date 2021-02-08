<template>
  <b-container>
    <b-row>
        <h1>My Portfolios</h1>
    </b-row>
    <b-row v-if="loading">
      <div class="ml-5 mr-5 mt-5">
        Loading portfolios ...
        <b-progress :value="100" variant="primary" striped animated class="mt-2"></b-progress>
      </div>
    </b-row>
    <b-row class="left">
        <b-card-group columns>

            <b-card
                v-for="item in items"
                v-bind:key="item.id"
                :header="item.name"
                header-bg-variant="primary"
                header-text-variant="white"
                align="left"
            >
                <div class="name">YTD Return</div>
                <div class="metric">{{ item.ytd_return | formatPercent }}</div>

                <div class="name">Arguments</div>
                <div class="metric">{{ item.arguments | formatArguments }}</div>
                <br/>
                <b-button :to="'/portfolio/' + item.id" variant="nav">Launch</b-button>
                <template #footer>
                    <!-- <em><b-icon-arrow-up></b-icon-arrow-up> {{ item.ytd_gain }}% YTD</em> -->
                </template>
            </b-card>

        </b-card-group>
    </b-row>
  </b-container>
</template>

<script>
import Vue from 'vue'

Vue.filter("formatPercent", function (value) {
  var v;
  if (typeof value === "number") {
    v = value * 100
    v = v.toFixed(2)
    return `${v}%`
  } else if (typeof value === "object") {
    if (value["Valid"]) {
      v = value["Float64"] * 100
      v = v.toFixed(2)
      return `${v}%`
    }
  }

  return ``
})

Vue.filter("formatArguments", function (value) {
  return value["inTickers"].join(" ") + " " + value["outTicker"]
})

export default {
  name: 'PortfolioCards',
  data() {
    return {
      items: [],
      loading: true
    };
  },
  mounted: async function() {
    // Get the access token from the auth wrapper
    const token = await this.$auth.getTokenSilently();

    // Use Axios to make a call to the API
    const { data } = await this.$axios.get("/portfolio", {
    headers: {
        Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
    }
    });

    this.items = data;
    this.loading = false;
  },
  components: {
      //isotope
  }
}
</script>

<style scoped>
  .metric {
    font-weight: 900;
    font-size: 2rem;
  }

  .name {
    font-weight: 100;
    color: #666;
    font-size: .75rem;
  }
</style>