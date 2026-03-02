<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Navbar from '@/components/Navbar.vue'

const authStore = useAuthStore()
const route = useRoute()

onMounted(async () => {
  await authStore.initialize()
})
</script>

<template>
  <div class="app-container">
    <Navbar v-if="route.meta.showNavbar" />
    <RouterView />
  </div>
</template>

<style>
</style>
