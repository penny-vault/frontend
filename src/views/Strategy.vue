<template>
  <b-container>
    <b-row>
        <b-col>
            <b-card
                header="Strategy Parameters"
                header-bg-variant="primary"
                header-text-variant="white"
                align="left"
                class="ml-0"
            >

<b-form @submit="onSubmit" @reset="onReset">
      <b-form-group
        id="input-group-1"
        label="Email address:"
        label-for="input-1"
        description="We'll never share your email with anyone else."
      >
        <b-form-input
          id="input-1"
          type="email"
          placeholder="Enter email"
          required
        ></b-form-input>
      </b-form-group>

      <b-form-group id="input-group-2" label="Your Name:" label-for="input-2">
        <b-form-input
          id="input-2"
          placeholder="Enter name"
          required
        ></b-form-input>
      </b-form-group>

      <b-form-group id="input-group-3" label="Food:" label-for="input-3">
        <b-form-select
          id="input-3"
          required
        ></b-form-select>
      </b-form-group>

      <b-form-group id="input-group-4">
        <b-form-checkbox-group
          id="checkboxes-4"
        >
          <b-form-checkbox value="me">Check me out</b-form-checkbox>
          <b-form-checkbox value="that">Check that out</b-form-checkbox>
        </b-form-checkbox-group>
      </b-form-group>

      <b-button type="submit" class="mr-2" variant="primary">Submit</b-button>
      <b-button type="reset" variant="danger">Reset</b-button>
    </b-form>

            </b-card>
        </b-col>

        <b-col cols="9" class="left">
        <h3>{{ strategy.name }}</h3>
        <h5>Jan 1990 - Dec 2020</h5>
        <p>Tactical asset allocation model results from Jan 1990 to Dec 2020 are based on dual momentum model holding the best performing asset. Absolute momentum based trend following filter is used to switch any selected assets that have a negative excess return over the risk free rate to cash. The model uses a single performance window of 10 calendar month(s). Tactical asset allocation model trades are executed using the end of month close price each month based on the end of month signals. The time period was constrained by the available data for T. Rowe Price International Discovery (PRIDX) [Jan 1989 - Dec 2020].</p>
        <b-tabs content-class="mt-3">
            <b-tab title="First" active><p>I'm the first tab</p></b-tab>
            <b-tab title="Second"><p>I'm the second tab</p></b-tab>
            <b-tab title="Disabled" disabled><p>I'm a disabled tab!</p></b-tab>
        </b-tabs>

        </b-col>
    </b-row>
  </b-container>
</template>

<script>

export default {
  name: 'Strategy',
  data() {
    return {
      strategy: null
    };
  },
  mounted: async function() {
    // Get the access token from the auth wrapper
    const token = await this.$auth.getTokenSilently();

    // Use Axios to make a call to the API
    const { data } = await this.$axios.get("/strategy/" + this.$route.params.id, {
    headers: {
        Authorization: `Bearer ${token}`    // send the access token through the 'Authorization' header
    }
    });

    this.strategy = data;
  },
  components: {
      //isotope
  },
  methods: {
      onSubmit: function () {},
      onReset: function() {}
  }
}
</script>
