<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { motion } from 'motion-v'
import ThemeModal from '@/components/ThemeModal.vue'

const router = useRouter()
const themes = ref<any[]>([])
const isModalOpen = ref(false)
const loading = ref(true)

async function getThemes() {
  loading.value = true
  const { data } = await supabase.from('flashcards').select().order('inserted_at', { ascending: false })
  if (data) {
    themes.value = data
  }
  loading.value = false
}

function onThemeSaved(newTheme: any) {
  themes.value = [newTheme, ...themes.value]
}

function goToTheme(id: number) {
  router.push(`/flashcard/${id}`)
}

onMounted(() => {
  getThemes()
})
</script>

<template>
  <div class="min-h-screen bg-earth-100 selection:bg-earth-200 pb-20">
    <main class="max-w-5xl mx-auto px-6 pt-12">
      <!-- Call to Action Section -->
      <section class="mb-16">
        <div class="bg-white border border-earth-100 rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgba(140,111,74,0.05)] flex flex-col md:flex-row items-center justify-between gap-8">
          <div class="text-center md:text-left">
            <h2 class="text-3xl font-serif text-earth-900 font-bold mb-2">Build Your Knowledge</h2>
            <p class="text-earth-500 font-sans italic max-w-md">Initialize a new collection by manual entry or batch import from spreadsheet files.</p>
          </div>
          
          <motion.button
            :whileHover="{ scale: 1.02, y: -2 }"
            :whileTap="{ scale: 0.98 }"
            @click="isModalOpen = true"
            class="bg-earth-900 text-white font-bold px-10 py-4 rounded-2xl hover:bg-earth-950 transition-all shadow-xl shadow-earth-900/20 flex items-center gap-3 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
            <span class="text-lg">New Collection</span>
          </motion.button>
        </div>
      </section>
      <!-- Archive Registry/Meta -->
      <div class="flex items-baseline justify-between mb-2 border-b-2 border-earth-100 pb-2">
        <h2 class="text-earth-800 font-serif font-bold text-xl">Archive Registry</h2>
        <span class="text-earth-400 font-sans text-sm font-bold">{{ themes.length }} Collections Identified</span>
      </div>
      <div class="h-px w-full bg-gradient-to-r from-earth-300 via-earth-300 to-earth-300 mb-8 opacity-50"></div>

      <!-- Skeleton Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="bg-white border border-earth-100 rounded-2xl p-6 h-48 animate-pulse flex flex-col pt-8">
          <div class="w-12 h-1 bg-earth-100 rounded-full mb-4"></div>
          <div class="w-3/4 h-6 bg-earth-100 rounded-lg mb-2"></div>
          <div class="w-1/2 h-4 bg-earth-100 rounded-lg"></div>
          <div class="mt-auto flex justify-between">
            <div class="w-16 h-2 bg-earth-100 rounded-full"></div>
            <div class="w-16 h-2 bg-earth-100 rounded-full"></div>
          </div>
        </div>
      </div>

      <div v-else-if="themes.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div
          v-for="(theme, index) in themes" 
          :key="theme.id"
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
          @click="goToTheme(theme.id)"
          class="group cursor-pointer bg-white border border-earth-100 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(140,111,74,0.08)] hover:-translate-y-1 transition-all duration-500"
        >
          <div class="w-8 h-1 bg-sage-300 rounded-full mb-4 group-hover:w-16 transition-all duration-500"></div>
          <h3 class="text-earth-900 font-serif text-lg font-bold mb-2">{{ theme.theme_name }}</h3>
          <p class="text-earth-500 text-sm font-sans italic">
            {{ (theme.data?.words?.length || 0) }} Terms in Collection
          </p>
          <div class="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-earth-300">
            <span></span>
            <span class="group-hover:text-sage-600 transition-colors uppercase">Open Card &rarr;</span>
          </div>
        </motion.div>
      </div>

      <motion.div 
        v-else 
        initial="{ opacity: 0 }"
        animate="{ opacity: 1 }"
        class="bg-earth-100/50 border border-earth-200 border-dashed rounded-3xl p-20 text-center"
      >
        <div class="mb-4 text-earth-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
        <p class="text-earth-800 font-serif italic text-lg">The library is currently awaiting new entries.</p>
        <p class="text-earth-500 text-sm mt-1">Start your educational narrative by adding a collection.</p>
        <motion.button
          :whileHover="{ scale: 1.02 }"
          :whileTap="{ scale: 0.98 }"
          @click="isModalOpen = true"
          class="mt-8 bg-earth-800 text-white font-bold px-10 py-3 rounded-2xl hover:bg-earth-900 transition-all font-sans shadow-lg shadow-earth-800/20"
        >
          Initialize First Collection
        </motion.button>
      </motion.div>
    </main>

    <!-- Theme Creation Modal -->
    <ThemeModal 
      :is-open="isModalOpen" 
      @close="isModalOpen = false" 
      @saved="onThemeSaved" 
    />
  </div>
</template>
