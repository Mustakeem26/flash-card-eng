<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'motion-v'

const route = useRoute()
const router = useRouter()
const theme = ref<any>(null)
const currentIndex = ref(0)
const isFlipped = ref(false)
const loading = ref(true)

const words = computed(() => theme.value?.data?.words || [])
const currentWord = computed(() => words.value[currentIndex.value] || null)

async function getCollection() {
  const { data, error } = await supabase
    .from('flashcards')
    .select()
    .eq('id', route.params.id)
    .single()
  
  if (data) {
    theme.value = data
  }
  loading.value = false
}

function nextWord() {
  if (currentIndex.value < words.value.length - 1) {
      setTimeout(() => {
          currentIndex.value++
          isFlipped.value = false
    }, 150)
  }
}

function prevWord() {
  if (currentIndex.value > 0) {
    setTimeout(() => {
      currentIndex.value--
      isFlipped.value = false
    }, 150)
  }
}

// --- Touch / Swipe ---
const SWIPE_THRESHOLD = 40 // px
const touchStartX = ref(0)
const touchStartY = ref(0)
const dragX = ref(0)
const isSwiping = ref(false)

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
  dragX.value = 0
  isSwiping.value = false
}

function onTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  const dx = touch.clientX - touchStartX.value
  const dy = touch.clientY - touchStartY.value
  // Only hijack scroll if clearly horizontal
  if (Math.abs(dx) > Math.abs(dy)) {
    e.preventDefault()
    dragX.value = dx
    isSwiping.value = true
  }
}

function onTouchEnd(e: TouchEvent) {
  const touch = e.changedTouches[0]
  if (!touch) return
  const dx = touch.clientX - touchStartX.value
  dragX.value = 0
  if (Math.abs(dx) >= SWIPE_THRESHOLD) {
    isSwiping.value = true
    if (dx < 0) nextWord()       // swipe left  → next
    else prevWord()               // swipe right → prev
  } else {
    isSwiping.value = false
  }
}

function handleCardClick() {
  if (!isSwiping.value) {
    isFlipped.value = !isFlipped.value
  }
}

onMounted(() => {
  getCollection()
})
</script>

<template>
  <div class="min-h-screen bg-earth-50 flex flex-col items-center justify-center p-6 pb-24 overflow-hidden">
    <!-- Navigation Header -->
    <div class="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-20 pointer-events-none">
      <motion.button
        :initial="{ opacity: 0, x: -20 }"
        :animate="{ opacity: 1, x: 0 }"
        @click="router.push('/home')"
        class="flex items-center gap-2 text-earth-500 font-bold text-sm tracking-wide hover:text-earth-800 transition-colors pointer-events-auto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        <span>Back to Collections</span>
      </motion.button>

      <div v-if="theme" class="text-right pointer-events-auto">
        <h1 class="text-earth-900 font-serif text-lg font-bold leading-none">{{ theme.theme_name }}</h1>
        <p class="text-earth-400 text-[10px] font-bold uppercase tracking-widest mt-1">Active Collection</p>
      </div>
    </div>

    <div v-if="loading" class="w-full max-w-md aspect-[3/4] bg-white border border-earth-100 rounded-3xl p-12 flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(140,111,74,0.05)] animate-pulse">
      <div class="w-12 h-1 bg-earth-100 rounded-full mb-12"></div>
      <div class="w-48 h-10 bg-earth-100 rounded-xl mb-8"></div>
      <div class="w-24 h-4 bg-earth-100 rounded-lg"></div>
    </div>

    <div v-else-if="currentWord" class="w-full max-w-md relative mt-16">
      <AnimatePresence mode="wait">
        <motion.div 
          :key="currentIndex"
          :initial="{ opacity: 0, scale: 0.95, x: 20 }"
          :animate="{ opacity: 1, scale: 1, x: dragX * 0.15 }"
          :exit="{ opacity: 0, scale: 0.95, x: dragX < 0 ? -60 : 60 }"
          :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
          class="perspective-1000 aspect-[3/4] w-full touch-pan-y select-none"
          @touchstart.passive="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <motion.div
            class="relative w-full h-full cursor-pointer preserve-3d"
            :animate="{ rotateY: isFlipped ? 180 : 0 }"
            :transition="{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }"
            @click="handleCardClick"
          >
            <!-- Front of Card -->
            <div class="absolute inset-0 backface-hidden bg-white border border-earth-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(140,111,74,0.1)]">
              <!-- Top Accent -->
              <div class="absolute top-12 left-1/2 -translate-x-1/2 w-12 h-1 bg-sage-300 rounded-full"></div>
              
              <div class="flex-1 flex flex-col justify-center w-full">
                <h2 class="text-4xl font-serif text-earth-900 font-bold leading-tight mb-8">{{ currentWord.word }}</h2>
                
                <div v-if="currentWord.pos">
                  <p class="text-earth-500 text-[9px] font-bold uppercase tracking-widest mb-2">Part of Speech</p>
                <div v-if="currentWord.pos" class="inline-block mx-auto px-4 py-1.5 bg-earth-800 border border-earth-700 rounded-full text-[10px] text-earth-300 font-bold uppercase tracking-widest">
                  {{ currentWord.pos }}
                </div>
                </div>
              </div>

              <!-- Footer Insight -->
              <p class="absolute bottom-12 left-1/2 -translate-x-1/2 w-full text-earth-300 text-[10px] font-bold uppercase tracking-[0.2em]">Click to reveal insights</p>
            </div>

            <!-- Back of Card -->
            <div class="absolute inset-0 backface-hidden bg-earth-900 border border-earth-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] [transform:rotateY(180deg)]">
              <!-- Top Accent -->
              <div class="absolute top-10 left-1/2 -translate-x-1/2 w-12 h-1 bg-clay-400 rounded-full"></div>
              
              <div class="flex-1 flex flex-col justify-center w-full space-y-8">
                <div>
                  <p class="text-earth-400 text-[10px] font-bold uppercase tracking-widest mb-2">Meaning</p>
                  <p class="text-earth-50 font-serif italic text-2xl leading-relaxed">
                    {{ currentWord.meaning || 'Pending Explanation...' }}
                  </p>
                </div>

                <div v-if="currentWord.example">
                  <p class="text-earth-500 text-[9px] font-bold uppercase tracking-widest mb-3">Example</p>
                  <p class="text-earth-200 font-sans text-sm italic leading-relaxed px-4">
                    "{{ currentWord.example }}"
                  </p>
                </div>
              </div>

              <!-- Footer Progress -->
              <p class="absolute bottom-10 left-1/2 -translate-x-1/2 w-full text-earth-600 text-[9px] font-bold uppercase tracking-[0.2em]">Card {{ currentIndex + 1 }} of {{ words.length }}</p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <!-- Bottom Navigation -->
      <div class="mt-12 flex items-center justify-between w-full">
        <motion.button
          :disabled="currentIndex === 0"
          :whileHover="{ x: -4 }"
          @click="prevWord"
          class="flex items-center gap-2 text-earth-400 font-bold text-xs uppercase tracking-widest disabled:opacity-0 transition-opacity"
        >
          &larr; Previous
        </motion.button>

        <div class="flex gap-1">
          <div 
            v-for="(_, i) in words.slice(0, 15)" 
            :key="i"
            class="w-1.5 h-1.5 rounded-full transition-all duration-300"
            :class="i === currentIndex ? 'bg-earth-800 w-4' : 'bg-earth-200'"
          ></div>
        </div>

        <motion.button
          :disabled="currentIndex === words.length - 1"
          :whileHover="{ x: 4 }"
          @click="nextWord"
          class="flex items-center gap-2 text-earth-400 font-bold text-xs uppercase tracking-widest disabled:opacity-0 transition-opacity"
        >
          Next &rarr;
        </motion.button>
      </div>
    </div>

    <div v-else-if="!loading && theme" class="text-center py-20 px-8 bg-white border border-earth-100 rounded-3xl shadow-sm max-w-md">
      <div class="text-earth-200 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
      </div>
      <h3 class="text-earth-800 font-serif italic text-xl mb-2">Empty Collection</h3>
      <p class="text-earth-500 text-sm">This collection doesn't have any cards registered yet.</p>
      <motion.button
        @click="router.push('/home')"
        class="mt-8 bg-earth-800 text-white font-bold px-8 py-3 rounded-xl hover:bg-earth-900 transition-colors"
      >
        Return to Library
      </motion.button>
    </div>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
.preserve-3d {
  transform-style: preserve-3d;
}
.backface-hidden {
  backface-visibility: hidden;
}
</style>
