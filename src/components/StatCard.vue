<template>
  <q-card class="my-card">
    <q-card-section class="q-pb-none">
      <p class="text-weight-bold q-mb-none">{{ title }}</p>
    </q-card-section>
    <q-card-section class="q-pa-none">
    <div :class="footerClass">
      <div class="sass-footer">
        <div class="row">
          <div v-if="directionIndicator" class="col-2">
            <q-icon size="lg" :name="directionIcon" />
          </div>
          <div class="col">
            <h4 class="text-weight-bolder q-mt-none q-mb-none">{{ stat }}</h4>
          </div>
        </div>
      </div>
    </div>
    </q-card-section>
  </q-card>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'StatCard',
  props: {
    color: {
      type: String,
      default: 'primary'
    },
    title: {
      type: String,
      required: true
    },
    value: {
      type: [String, Number],
      required: true
    },
    percent: {
      type: Boolean,
      default: false
    },
    directionIndicator: {
      type: Boolean,
      deafult: false
    }
  },
  computed: {
    directionIcon() {
      if (this.value < 0) {
        return 'ion-arrow-dropdown-circle'
      } else {
        return 'ion-arrow-dropup-circle'
      }
    },
    footerClass() {
      return `bg-gradient-${this.color} footer-shape`
    },
    stat() {
      if (typeof this.value === 'string') {
        return this.value
      } else {
        if (this.percent) {
          return `${(this.value * 100).toFixed(2)}%`
        } else {
          return this.value
        }
      }
    }
  }
})
</script>

<style lang="scss" scoped>
$gradient-primary: linear-gradient(#1693f8, #0d67e9);
$gradient-danger: linear-gradient(#f73769, #f73869);
$gradient-success: linear-gradient(#52b914, #2c9500);
$gradient-warning: linear-gradient(#fb5c00, #cd3804);
$gradient-primary-direction: linear-gradient(to right, lighten($primary, 10%), darken($primary, 8%));
$gradient-secondary-direction: linear-gradient(to right, lighten($secondary, 10%),  darken($secondary, 5%));
$gradient-negative-direction: linear-gradient(to right, #ff3f70, #f73769);
$gradient-positive-direction: linear-gradient(to right, #4bda6c, #3bc05b);
$gradient-info-direction: linear-gradient(to right, #a76cff, #8d41ff);
$gradient-warning-direction: linear-gradient(to right, #ee933a, #ff7336);

@each $bg-gradient-name, $bg-gradient-color in (primary, $gradient-primary-direction),
        (secondary, $gradient-secondary-direction) ,
        (positive, $gradient-positive-direction),
        (negative, $gradient-negative-direction),
        (info, $gradient-info-direction),
        (warning, $gradient-warning-direction) {
  .bg-gradient-#{$bg-gradient-name}{
    background-image: $bg-gradient-color;
    color: white;
    &:hover {
      background-size: 100%;
    }
  }
}

.footer-shape {
  border-radius: 133% 164% 90% 98% / 82% 76% 50% 50%;
  padding: 18px 30px 6px 30px;
  width: 100%;
  bottom: -10px;
  position: relative;
  .sass-footer {
    position: relative;
    margin-bottom: 7px;
    span, i {
      vertical-align: middle;
      font-size: 13px;
    }
    @each $b-l-name, $b-l-color in (primary, $primary),
            (secondary, $secondary) ,
            (positive, $positive),
            (negative, $negative),
            (info, $info),
            (dark, $dark),
            (warning, $warning) {
      .b-l-#{$b-l-name}{
        border-left: 1px solid  lighten($b-l-color, 15%) !important;
      }
    }
    .small-sass {
      position: absolute;
      top: -15px;
      right: -18px;
    }
  }
}
</style>