<script setup lang="ts">
import { watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth0 } from '@auth0/auth0-vue'
import Button from 'primevue/button'

const router = useRouter()
const isMockMode = import.meta.env.VITE_USE_MOCKS === '1'
const auth = isMockMode ? null : useAuth0()

if (!isMockMode && auth) {
  watchEffect(() => {
    if (!auth.isLoading.value && auth.isAuthenticated.value) {
      router.replace('/portfolios')
    }
  })
}

function handleLogin() {
  if (isMockMode) {
    router.push('/portfolios')
  } else {
    auth?.loginWithRedirect()
  }
}
</script>

<template>
  <h1 class="splash-heading">Welcome to Penny Vault</h1>
  <Button
    :label="isMockMode ? 'Login as demo' : 'Login'"
    icon="pi pi-sign-in"
    class="splash-login"
    text
    @click="handleLogin"
  />
</template>

<style scoped>
.splash-heading {
  font-family: 'Sacramento', cursive;
  font-size: 72px;
  font-weight: normal;
  color: #1c1917;
  text-shadow: 0 1px 8px rgba(255, 255, 255, 0.5);
  margin-bottom: 24px;
  line-height: 1.1;
}
.splash-login {
  font-size: 20px !important;
  font-weight: 500 !important;
  color: #1c1917 !important;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.4);
  letter-spacing: 0.01em;
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}
.splash-login:hover {
  transform: translateX(4px);
  opacity: 0.9;
}
.splash-login:active {
  transform: translateX(0);
}
@media (max-width: 600px) {
  .splash-heading {
    font-size: 48px;
  }
}
</style>
