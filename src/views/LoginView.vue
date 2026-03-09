<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { motion } from 'motion-v'

const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const authStore = useAuthStore()
const router = useRouter()

const handleSubmit = async () => {
  if (isSignUp.value) {
    await authStore.signUp(email.value, password.value)
  } else {
    await authStore.signIn(email.value, password.value)
  }
  
  if (!authStore.error) {
    router.push('/home')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-earth-100 selection:bg-earth-200">
    <!-- Decorative elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
      <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-clay-200 blur-3xl"></div>
      <div class="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-sage-200 blur-3xl"></div>
    </div>

    <motion.div
      :initial="{ opacity: 0, y: 30, scale: 0.98 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }"
      class="relative w-full max-w-md bg-white border border-earth-200 rounded-3xl p-8 md:p-12 shadow-[0_20px_50px_rgba(140,111,74,0.1)]"
    >
      <div class="text-center mb-10">
        <h1 class="text-4xl font-serif text-earth-900 mb-3 tracking-tight">
          {{ isSignUp ? 'Signup' : 'Flashly Box' }}
        </h1>
        <p class="text-earth-600 font-sans font-medium opacity-80 decoration-earth-300 underline underline-offset-4">
          {{ isSignUp ? 'Create your account' : 'Login to your account' }}
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-1.5 focus-within:text-earth-700 transition-colors">
          <label for="email" class="block text-sm font-semibold text-earth-800 ml-1">Username or Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            placeholder="flashlybox@example.com" 
            required
            :disabled="authStore.loading"
            class="w-full bg-earth-50 border-earth-200 border rounded-2xl px-5 py-4 text-earth-900 placeholder:text-earth-400 focus:outline-none focus:ring-4 focus:ring-earth-100 focus:border-earth-400 transition-all duration-300 disabled:opacity-50"
          >
        </div>

        <div class="space-y-1.5 focus-within:text-earth-700 transition-colors">
          <label for="password" class="block text-sm font-semibold text-earth-800 ml-1">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="••••••••" 
            required
            :disabled="authStore.loading"
            class="w-full bg-earth-50 border-earth-200 border rounded-2xl px-5 py-4 text-earth-900 placeholder:text-earth-400 focus:outline-none focus:ring-4 focus:ring-earth-100 focus:border-earth-400 transition-all duration-300 disabled:opacity-50"
          >
        </div>

        <div v-if="authStore.error" class="bg-clay-50 border border-clay-200 text-clay-700 px-4 py-3 rounded-2xl text-sm font-medium animate-shake">
          {{ authStore.error }}
        </div>

        <motion.button
          :whileHover="{ scale: 1.01, backgroundColor: '#8c6f4a' }"
          :whileTap="{ scale: 0.98 }"
          type="submit" 
          :disabled="authStore.loading"
          class="w-full bg-earth-800 text-white rounded-2xl py-4 font-bold text-lg shadow-lg shadow-earth-900/10 hover:shadow-xl hover:shadow-earth-900/20 active:shadow-inner transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span v-if="authStore.loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span>{{ isSignUp ? 'Register' : 'Login' }}</span>
        </motion.button>
      </form>

      <div class="mt-12 text-center">
        <p class="text-earth-600 text-sm font-medium">
          {{ isSignUp ? 'Already a member?' : "New here?" }}
          <button 
            @click="isSignUp = !isSignUp" 
            class="text-earth-800 font-bold ml-1 hover:text-clay-600 underline decoration-earth-300 underline-offset-4 transition-colors"
          >
            {{ isSignUp ? 'Sign In' : 'Sign Up Free' }}
          </button>
        </p>
      </div>
    </motion.div>

    <!-- Visual footer note -->
    <div class="fixed bottom-6 text-earth-400 text-xs font-serif italic uppercase tracking-widest">
      © Flashly Box 2026 v.1.0.3
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
.animate-shake {
  animation: shake 0.4s ease-in-out;
}
</style>
