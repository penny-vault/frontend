<template>
  <b-container>
    <b-row>
        <h1>Available Strategies</h1>
    </b-row>
    <b-row v-if="loading">
        <img src="https://media.giphy.com/media/jAYUbVXgESSti/source.gif" style="width: 100%;" />
    </b-row>
    <b-row class="left">
        <b-card-group columns>

            <b-card
                v-for="item in items"
                v-bind:key="item.shortcode"
                :header="item.name"
                header-bg-variant="primary"
                header-text-variant="white"
                align="left"
            >
                <p>
                {{ item.description }}
                </p>

                <b-button :to="'/strategy/' + item.shortcode" variant="nav">Launch</b-button>
                <template #footer>
                    <em><b-icon-arrow-up></b-icon-arrow-up> {{ item.ytd_gain }}% YTD</em>
                </template>
            </b-card>

        </b-card-group>
    </b-row>
  </b-container>
</template>

<script>
//import isotope from 'vueisotope'

export default {
  name: 'StrategyCards',
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
    const { data } = await this.$axios.get("/strategy", {
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
