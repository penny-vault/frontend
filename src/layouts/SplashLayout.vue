<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="splash-root">
    <RouterView />
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'Sacramento';
  src: url('/Sacramento-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
.splash-root {
  min-height: 100vh;
  background: url('/wallpaper.png') center / cover no-repeat;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  font-family: 'IBM Plex Sans', 'Inter', sans-serif;
  color: #1c1917;
  padding: 64px 56px;
}
@media (max-width: 600px) {
  .splash-root {
    padding: 40px 24px;
  }
}
</style>
