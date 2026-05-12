<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-6 text-center">
    <div>
      <p class="text-[120px] leading-none font-serif font-bold text-coral-200 select-none tracking-tight">
        404
      </p>
      <h1 class="text-coral-900 font-serif text-2xl font-bold mb-3">Page Not Found</h1>
      <p class="text-coral-400 text-sm leading-relaxed mb-8">
        Looks like this page wandered off. The path you're looking for doesn't exist or may have been moved.
      </p>
      <div class="flex gap-3 justify-center">
        <button @click="router.push('/home')"
          class="px-6 py-3 bg-coral-400 text-white font-bold text-sm rounded-xl hover:bg-coral-900 transition-colors">
          Go Home
        </button>
        <button @click="router.go(-1)"
          class="px-6 py-3 bg-white border border-coral-200 text-coral-600 font-bold text-sm rounded-xl hover:bg-coral-50 transition-colors">
          Go Back
        </button>
      </div>
    </div>
    <div class="mt-12">
      <div class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-coral-200 rounded-full shadow-sm">
        <div class="w-1.5 h-1.5 rounded-full bg-coral-300"></div>
        <span class="text-coral-400 text-[11px] font-bold uppercase tracking-widest">Flashy Box</span>
        <div class="w-1.5 h-1.5 rounded-full bg-coral-300"></div>
      </div>
    </div>
  </div>
</template>