<template>
  <div v-if="!authenticated" class="fullscreen bg-wallpaper text-center">
    <h1 class="text-fancy">Welcome to Penny Vault</h1>
    <q-btn flat color="black" size="xl" label="login" icon="ion-log-in" @click="login()" />
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'Splash',
  setup () {
    const $store = useStore()
    const $router = useRouter()

    const authenticated = computed(() => $store.state.user.authenticated)

    if (authenticated.value) {
      $router.push({
        path: "/app",
        query: null
      })
    }

    return {
      authenticated,
      login () {
        this.$auth.loginWithRedirect({appState: {target: "/"}})
      }
    }
  }
})
</script>

<style scoped>
.bg-wallpaper {
  background-image: url("~assets/wallpaper.webp");
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
}
</style>
