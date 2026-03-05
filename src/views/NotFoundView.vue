<script setup lang="ts">
import { useRouter } from 'vue-router'
import { motion } from 'motion-v'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-earth-100 flex flex-col items-center justify-center p-6 text-center">

    <!-- Animated 404 number -->
    <motion.div
      :initial="{ opacity: 0, y: -30, scale: 0.85 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }"
      class="mb-6"
    >
      <p class="text-[120px] leading-none font-serif font-bold text-earth-200 select-none tracking-tight">
        404
      </p>
    </motion.div>

    <!-- Text -->
    <motion.div
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }"
      class="max-w-sm"
    >
      <h1 class="text-earth-900 font-serif text-2xl font-bold mb-3">Page Not Found</h1>
      <p class="text-earth-400 text-sm leading-relaxed mb-8">
        Looks like this page wandered off. The path you're looking for doesn't exist or may have been moved.
      </p>

      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <motion.button
          :whileHover="{ scale: 1.03 }"
          :whileTap="{ scale: 0.97 }"
          @click="router.push('/home')"
          class="px-6 py-3 bg-earth-800 text-white font-bold text-sm rounded-xl hover:bg-earth-900 transition-colors"
        >
          ← Back to Collections
        </motion.button>

        <motion.button
          :whileHover="{ scale: 1.03 }"
          :whileTap="{ scale: 0.97 }"
          @click="router.go(-1)"
          class="px-6 py-3 bg-white border border-earth-200 text-earth-600 font-bold text-sm rounded-xl hover:bg-earth-50 transition-colors"
        >
          Go Back
        </motion.button>
      </div>
    </motion.div>

    <!-- Subtle decorative word card -->
    <motion.div
      :initial="{ opacity: 0, y: 30 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }"
      class="mt-16"
    >
      <div class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-earth-200 rounded-full shadow-sm">
        <div class="w-1.5 h-1.5 rounded-full bg-clay-300"></div>
        <span class="text-earth-400 text-[11px] font-bold uppercase tracking-widest">Flashly Box</span>
        <div class="w-1.5 h-1.5 rounded-full bg-clay-300"></div>
      </div>
    </motion.div>

  </div>
</template>
