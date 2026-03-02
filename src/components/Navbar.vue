<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { motion } from 'motion-v'
import logo from '@/assets/logo.jpg'

const authStore = useAuthStore()
</script>

<template>
  <motion.header
    :initial="{ opacity: 0, y: -20 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }"
    class="bg-white border-b border-earth-100 px-6 py-6 md:px-12 md:py-8 sticky top-0 z-10 shadow-sm"
  >
    <div class="max-w-5xl mx-auto flex justify-between items-center">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-earth-800 rounded-xl flex items-center justify-center overflow-hidden border-2 border-earth-700/50 shadow-sm">
          <img :src="logo" alt="Flashly Box Logo" class="w-full h-full object-cover" />
        </div>
        <div>
          <h1 class="text-2xl font-serif text-earth-900 tracking-tight leading-none">Flashly Box</h1>
          <p class="text-earth-500 text-xs font-sans font-semibold tracking-widest uppercase mt-1">Collections</p>
        </div>
      </div>
      
      <div class="flex items-center gap-4">
        <motion.button
          :whileHover="{ scale: 1.05, x: 2 }"
          :whileTap="{ scale: 0.95 }"
          @click="authStore.signOut()" 
          class="group flex items-center gap-2 text-earth-500 font-bold text-sm tracking-wide hover:text-earth-800 transition-colors"
        >
          <span>Logout</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </motion.button>
      </div>
    </div>
  </motion.header>
</template>
