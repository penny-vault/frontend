<template lang="pug">
section.q-my-sm.q-mr-md.cursor-pointer.text-subtitle1(:id="slugifiedTitle")
  div.doc-card-title {{ title }}
</template>

<script>
export default {
  name: 'DocHeading',
  props: {
    title: String,
    slugifiedTitle: String,
    prefix: String
  },
}
</script>

<style lang="sass" scoped>
$title-color: $dark

.doc-card-title
  margin-left: -24px
  padding: 2px 10px 2px 24px
  background: $title-color
  color: white
  position: relative
  border-radius: 3px 5px 5px 0
  &:after
    content: ''
    position: absolute
    top: 100%
    left: 0
    width: 0
    height: 0
    border: 0 solid transparent
    border-top-color: scale-color($title-color, $lightness: -15%)
    border-width: 9px 0 0 11px
</style>