<template>
  <button @click="btnClickedHandler()" class="grid-button"><i class="notranslate material-icons q-icon" style="margin-bottom: 3px" aria-hidden="true" role="img">launch</i> Launch</button>
</template>

<script>
// NOTE: q-btn doesn't work here for some reason
// if we can't get this working the custom style below should be removed and
// the template should be modified to use q-btn
export default {
  methods: {
    btnClickedHandler () {
      this.params.clicked(this.params.value)
    }
  }
}
</script>

<style lang="scss">
  .grid-button {
    --q-primary: #1976d2;
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: auto;
    margin: 0;
    overflow: visible;
    align-items: stretch;
    background: white;
    flex-direction: column;
    line-height: 1.715em;
    vertical-align: middle;
    cursor: pointer;
    border-color: var(--q-primary)!important;
    border-radius: 3px;
    border-width: 1px;
    color: var(--q-primary)!important;
    user-select: none!important;
  }

  .grid-button:hover {
    background-color: rgb(238, 238, 238)!important;
  }
</style>
