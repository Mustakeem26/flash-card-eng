<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { motion, AnimatePresence } from 'motion-v'
import logo from '@/assets/Flashly-logo.webp'

const authStore = useAuthStore()

const menuOpen = ref(false)
const showConfirm = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  showConfirm.value = false
}

function requestLogout() {
  showConfirm.value = true
}

function cancelLogout() {
  showConfirm.value = false
}

function confirmLogout() {
  menuOpen.value = false
  showConfirm.value = false
  authStore.signOut()
}

function closeMenu() {
  menuOpen.value = false
  showConfirm.value = false
}
</script>

<template>
  <motion.header
    :initial="{ opacity: 0, y: -20 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }"
    class="bg-white border-b border-earth-100 px-6 py-6 md:px-12 md:py-8 sticky top-0 z-10 shadow-sm"
  >
    <div class="max-w-5xl mx-auto flex justify-between items-center">
      <!-- Logo -->
      <div class="flex items-center gap-5">
        <div class="w-18 h-14 bg-earth-800 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-earth-700/50 shadow-md">
          <img :src="logo" alt="Flashly Box Logo" class="w-full h-full object-cover" />
        </div>
        <div>
          <h1 class="text-[28px] font-serif text-earth-900 tracking-tight leading-none">Flashly Box</h1>
          <p class="text-earth-500 text-[11px] font-sans font-semibold tracking-widest uppercase mt-1.5">Collections</p>
        </div>
      </div>

      <!-- Hamburger button -->
      <div class="relative">
        <motion.button
          :whileTap="{ scale: 0.92 }"
          @click="toggleMenu"
          class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-earth-100 transition-colors"
          aria-label="Menu"
        >
          <!-- Fixed-size icon canvas so bars rotate around true center -->
          <span class="relative w-5 h-4 flex items-center">
            <!-- Top bar -->
            <motion.span
              :animate="menuOpen ? { rotate: 45, top: '50%' } : { rotate: 0, top: '0%' }"
              :transition="{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }"
              class="absolute w-5 h-0.5 bg-earth-700 rounded-full -translate-y-1/2"
              style="transform-origin: center center"
            />
            <!-- Middle bar -->
            <motion.span
              :animate="menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }"
              :transition="{ duration: 0.18 }"
              class="absolute w-5 h-0.5 bg-earth-700 rounded-full"
              style="top: 50%; transform: translateY(-50%)"
            />
            <!-- Bottom bar -->
            <motion.span
              :animate="menuOpen ? { rotate: -45, top: '50%' } : { rotate: 0, top: '100%' }"
              :transition="{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }"
              class="absolute w-5 h-0.5 bg-earth-700 rounded-full -translate-y-1/2"
              style="transform-origin: center center"
            />
          </span>
        </motion.button>

        <!-- Dropdown -->
        <AnimatePresence>
          <motion.div
            v-if="menuOpen"
            :initial="{ opacity: 0, scale: 0.95, y: -8 }"
            :animate="{ opacity: 1, scale: 1, y: 0 }"
            :exit="{ opacity: 0, scale: 0.95, y: -8 }"
            :transition="{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }"
            class="absolute right-0 mt-2 w-56 bg-white border border-earth-300 rounded-2xl shadow-xl shadow-earth-900/10 overflow-hidden origin-top-right"
          >
            <!-- Confirm panel -->
            <div v-if="showConfirm" class="p-4">
              <p class="text-earth-900 font-bold text-sm mb-1">Logout?</p>
              <p class="text-earth-400 text-xs mb-4">You'll need to log in again to access your collections.</p>
              <div class="flex gap-2">
                <button
                  @click="cancelLogout"
                  class="flex-1 py-2 text-xs font-bold text-earth-500 bg-earth-50 border border-earth-200 rounded-xl hover:bg-earth-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  @click="confirmLogout"
                  class="flex-1 py-2 text-xs font-bold text-white bg-clay-500 rounded-xl hover:bg-clay-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>

            <!-- Menu items -->
            <div v-else class="py-2">
              <div class="px-4 py-3 border-b border-earth-50">
                <p class="text-[10px] font-bold uppercase tracking-widest text-earth-300">Account</p>
                <p class="text-earth-700 text-sm font-semibold truncate mt-0.5">{{ authStore.user?.email?.split('@')[0] }}</p>
              </div>
              <button
                @click="requestLogout"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-clay-500 hover:bg-clay-50 transition-colors text-left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <!-- Click-outside overlay -->
        <div
          v-if="menuOpen"
          class="fixed inset-0 z-[-1]"
          @click="closeMenu"
        />
      </div>
    </div>
  </motion.header>
</template>
