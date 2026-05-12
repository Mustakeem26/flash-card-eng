<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { motion, AnimatePresence } from 'motion-v'

const authStore = useAuthStore()
const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const showPassword = ref(false)

function handleSubmit() {
  if (isSignUp.value) {
    authStore.signUp(email.value, password.value)
  } else {
    authStore.signIn(email.value, password.value)
  }
}

function resetAndClose() {
  email.value = ''
  password.value = ''
  isSignUp.value = false
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-sky-50 selection:bg-sky-100">
    <!-- Decorative elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
      <div class="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-coral-300 blur-3xl"></div>
      <div class="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-mint-200 blur-3xl"></div>
    </div>

    <motion.div :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }"
      class="relative w-full max-w-md bg-white border border-coral-200 rounded-3xl p-8 md:p-12 shadow-[0_20px_50px_rgba(253,214,137,0.1)]">
      <div class="text-center mb-10">
        <h1 class="text-4xl font-serif text-sunny-900 mb-3 tracking-tight">
          {{ isSignUp ? 'Signup' : 'Flashy Box' }}
        </h1>
        <p class="text-coral-600 font-sans font-medium opacity-80 decoration-coral-300 underline underline-offset-4">
          {{ isSignUp ? 'Create your account' : 'Login to your account' }}
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-1.5 focus-within:text-sunny-700 transition-colors">
          <label for="email" class="block text-sm font-semibold text-sunny-900 ml-1">Username or Email</label>
          <input id="email" v-model="email" type="text" :disabled="authStore.loading" placeholder="your@email.com"
            class="w-full bg-coral-50 border-coral-200 border rounded-2xl px-5 py-4 text-sunny-900 placeholder:text-coral-300 focus:outline-none focus:ring-4 focus:ring-coral-100 focus:border-coral-200 transition-all duration-300 disabled:opacity-50">
        </div>

        <div class="space-y-1.5 focus-within:text-sunny-700 transition-colors">
          <label for="password" class="block text-sm font-semibold text-sunny-900 ml-1">Password</label>
          <div class="relative">
            <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'"
              :disabled="authStore.loading" placeholder="your password"
              class="w-full bg-coral-50 border-coral-200 border rounded-2xl px-5 py-4 text-sunny-900 placeholder:text-coral-300 focus:outline-none focus:ring-4 focus:ring-coral-100 focus:border-coral-200 transition-all duration-300 disabled:opacity-50 pr-12">
            <button type="button" @click="showPassword = !showPassword"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-coral-400 hover:text-coral-600 transition-colors">
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="authStore.error"
          class="bg-coral-50 border border-coral-400 text-coral-800 px-4 py-3 rounded-2xl text-sm font-medium animate-shake">
          {{ authStore.error }}
        </div>

        <button type="submit" :disabled="authStore.loading"
          class="w-full bg-coral-400 text-white rounded-2xl py-4 font-bold text-lg shadow-lg shadow-sunny-900/10 hover:shadow-xl hover:shadow-sunny-900/20 active:shadow-inner transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed">
          <span>{{ isSignUp ? 'Create Account' : 'Login' }}</span>
          <svg v-if="authStore.loading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
        </button>
      </form>

      <div class="mt-12 text-center">
        <p class="text-coral-300 text-sm font-medium">
          {{ isSignUp ? 'Already a member?' : "New here?" }}
          <button type="button" @click="isSignUp = !isSignUp"
            class="text-coral-600 font-bold ml-1 hover:text-coral-800 underline decoration-coral-300 underline-offset-4 transition-colors">
            {{ isSignUp ? 'Login' : 'Create account' }}
          </button>
        </p>
      </div>
    </motion.div>

    <!-- Visual footer note -->
    <div class="fixed bottom-6 text-coral-300 text-xs font-serif italic uppercase tracking-widest">
      © Flashy Box 2026 v.1.0.3
    </div>
  </div>
</template>

<style scoped>
.animate-shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shake {

  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }

  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }

  30%,
  50%,
  70% {
    transform: translate3d(-4px, 0, 0);
  }

  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
}
</style>