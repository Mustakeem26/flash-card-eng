<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'motion-v'
import { toPng } from 'html-to-image'
import logo from '@/assets/Flashly-logo.webp'

const route = useRoute()
const router = useRouter()
const theme = ref<any>(null)
const currentIndex = ref(0)
const isFlipped = ref(false)
const loading = ref(true)
const direction = ref(1) // 1 for next, -1 for prev

const words = computed(() => theme.value?.data?.words || [])
const currentWord = computed(() => words.value[currentIndex.value] || null)

// Sliding window of 15 dots centered on currentIndex
const DOTS_VISIBLE = 15
const visibleDots = computed(() => {
  const total = words.value.length
  if (total === 0) return []
  const half = Math.floor(DOTS_VISIBLE / 2)
  let start = currentIndex.value - half
  let end = start + DOTS_VISIBLE
  // Clamp to bounds
  if (start < 0) { start = 0; end = Math.min(DOTS_VISIBLE, total) }
  if (end > total) { end = total; start = Math.max(0, end - DOTS_VISIBLE) }
  return Array.from({ length: end - start }, (_, i) => start + i)
})

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
    direction.value = 1
    setTimeout(() => {
      currentIndex.value++
      isFlipped.value = false
    }, 100)
  }
}

function prevWord() {
  if (currentIndex.value > 0) {
    direction.value = -1
    setTimeout(() => {
      currentIndex.value--
      isFlipped.value = false
    }, 100)
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
    if (dx < 0) {
      direction.value = 1
      nextWord()
    } else {
      direction.value = -1
      prevWord()
    }
  } else {
    isSwiping.value = false
  }
}

function handleCardClick() {
  if (!isSwiping.value) {
    isFlipped.value = !isFlipped.value
  }
}

// --- Text-to-Speech ---
const isSpeaking = ref(false)

function speak(text: string, lang: string, e?: MouseEvent) {
  e?.stopPropagation()
  if (!text || !window.speechSynthesis) return

  window.speechSynthesis.cancel()
  isSpeaking.value = false

  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = lang
  utter.rate = 0.9

  // Prefer a native voice for the language
  const voices = window.speechSynthesis.getVoices()
  const langPrefix = lang.substring(0, 2)
  const match = voices.find((v) => v.lang.startsWith(langPrefix) && v.localService)
    ?? voices.find((v) => v.lang.startsWith(langPrefix))
  if (match) utter.voice = match

  utter.onstart = () => { isSpeaking.value = true }
  utter.onend = () => { isSpeaking.value = false }
  utter.onerror = () => { isSpeaking.value = false }

  window.speechSynthesis.speak(utter)
}

const isDownloading = ref(false)
const isDrawerOpen = ref(false)
const previewDataUrl = ref('')
const storyTemplateRef = ref<HTMLElement | null>(null)

async function prepareShare() {
  if (!storyTemplateRef.value || isDownloading.value) return
  
  isDownloading.value = true
  try {
    const dataUrl = await toPng(storyTemplateRef.value, {
      quality: 0.95,
      pixelRatio: 2, // High quality for preview
    })
    
    previewDataUrl.value = dataUrl
    isDrawerOpen.value = true
  } catch (err) {
    console.error('Preview generation failed:', err)
  } finally {
    isDownloading.value = false
  }
}

function downloadImage() {
  if (!previewDataUrl.value) return
  const link = document.createElement('a')
  link.download = `flashly-${currentWord.value?.word || 'card'}.png`
  link.href = previewDataUrl.value
  link.click()
}

onMounted(() => {
  getCollection()
  // Pre-load voices (some browsers need this)
  window.speechSynthesis.getVoices()
})
</script>

<template>
  <div class="min-h-screen bg-earth-100 flex flex-col items-center justify-center p-6 pb-24 overflow-hidden">
    <!-- Navigation Header -->
    <div class="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-20 pointer-events-none">
      <motion.button
        :initial="{ opacity: 0, x: -20 }"
        :animate="{ opacity: 1, x: 0 }"
        @click="router.push('/home')"
        class="flex items-center gap-2 text-earth-500 font-bold text-sm tracking-wide hover:text-earth-800 transition-colors pointer-events-auto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        <span>Back</span>
      </motion.button>

      <div v-if="theme" class="flex items-center gap-6 pointer-events-auto">
        <div class="text-right">
          <h1 class="text-earth-900 font-serif text-lg font-bold leading-none">{{ theme.theme_name }}</h1>
          <p class="text-earth-400 text-[10px] font-bold uppercase tracking-widest mt-1">Active Collection</p>
        </div>
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
          :initial="{ opacity: 0, x: direction === 1 ? 50 : -50 }"
          :animate="{ opacity: 1, x: 0 }"
          :exit="{ opacity: 0, x: direction === 1 ? -50 : 50 }"
          :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }"
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

              <!-- Little Share Button -->
              <button
                @click.stop="prepareShare"
                class="absolute top-8 right-8 p-2 rounded-xl bg-earth-50 text-earth-400 hover:text-earth-800 hover:bg-earth-100 transition-all z-10"
                title="Export to Story"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </button>
              
              <div class="flex-1 flex flex-col justify-center w-full">
                <!-- English word + speaker -->
                <div class="flex items-center justify-center gap-3 mb-8">
                  <h2 class="text-4xl font-serif text-earth-900 font-bold leading-tight">{{ currentWord.word }}</h2>
                  <button
                    @click="speak(currentWord.word, 'en-US', $event)"
                    class="relative flex-shrink-0 w-9 h-9 rounded-full bg-earth-100 hover:bg-earth-200 flex items-center justify-center text-earth-500 hover:text-earth-800 transition-all"
                    title="Read in English"
                  >
                    <span v-if="isSpeaking" class="absolute inset-0 rounded-full bg-earth-300/40 animate-ping"></span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                  </button>
                </div>

                <div v-if="currentWord.pos">
                  <p class="text-earth-500 text-[9px] font-bold uppercase tracking-widest mb-2">Part of Speech</p>
                  <div class="inline-block mx-auto px-4 py-1.5 bg-earth-800 border border-earth-700 rounded-full text-[10px] text-earth-300 font-bold uppercase tracking-widest">
                    {{ currentWord.pos }}
                  </div>
                </div>
              </div>

              <!-- Footer Insight -->
              <p class="absolute bottom-14 left-1/2 -translate-x-1/2 w-full text-earth-300 text-[10px] font-bold uppercase tracking-[0.2em]">Tap to reveal · Swipe to navigate</p>
              <p class="absolute bottom-10 left-1/2 -translate-x-1/2 w-full text-earth-300 text-[9px] font-bold uppercase tracking-[0.2em]">Card {{ currentIndex + 1 }} of {{ words.length }}</p>
            </div>

            <!-- Back of Card -->
            <div class="absolute inset-0 backface-hidden bg-earth-900 border border-earth-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] [transform:rotateY(180deg)]">
              <!-- Top Accent -->
              <div class="absolute top-10 left-1/2 -translate-x-1/2 w-12 h-1 bg-clay-400 rounded-full"></div>

              <!-- Little Share Button -->
              <button
                @click.stop="prepareShare"
                class="absolute top-8 right-8 p-2 rounded-xl bg-earth-800 text-earth-500 hover:text-earth-200 hover:bg-earth-700 transition-all z-10"
                title="Export to Story"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </button>
              
              <div class="flex-1 flex flex-col justify-center w-full space-y-8">
                <div>
                  <p class="text-earth-400 text-[10px] font-bold uppercase tracking-widest mb-2">Meaning</p>
                  <!-- Thai meaning + speaker -->
                  <div class="flex items-center justify-center gap-3">
                    <p class="text-earth-50 font-serif italic text-2xl leading-relaxed">
                      {{ currentWord.meaning || 'Pending Explanation...' }}
                    </p>
                    <button
                      v-if="currentWord.meaning"
                      @click="speak(currentWord.meaning, 'th-TH', $event)"
                      class="relative flex-shrink-0 w-9 h-9 rounded-full bg-earth-700 hover:bg-earth-600 flex items-center justify-center text-earth-300 hover:text-earth-50 transition-all"
                      title="อ่านภาษาไทย"
                    >
                      <span v-if="isSpeaking" class="absolute inset-0 rounded-full bg-earth-400/30 animate-ping"></span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    </button>
                  </div>
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
            v-for="idx in visibleDots" 
            :key="idx"
            class="h-1.5 rounded-full transition-all duration-300"
            :class="idx === currentIndex ? 'bg-earth-800 w-4' : 'bg-earth-200 w-1.5'"
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

  <!-- Off-screen Story Template for Image Generation -->
  <div v-if="currentWord" class="fixed -left-[2000px] top-0 pointer-events-none">
    <div 
      ref="storyTemplateRef"
      class="w-[1080px] h-[1920px] bg-earth-100 flex flex-col items-center p-20 font-sans"
    >
      <!-- Background Decorative Elements -->
      <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-sage-200/20 rounded-full -translate-y-1/2 translate-x-1/3"></div>
      <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-clay-200/20 rounded-full translate-y-1/2 -translate-x-1/3"></div>

      <!-- Header -->
      <div class="w-full flex justify-between items-center mb-24 z-10">
        <div class="flex items-center gap-6">
          <div class="w-24 h-24 bg-earth-800 rounded-3xl flex items-center justify-center overflow-hidden border-4 border-earth-700/50 shadow-xl">
            <img :src="logo" alt="Flashly Box" class="w-full h-full object-cover" />
          </div>
          <div>
            <h1 class="text-6xl font-serif text-earth-900 font-bold tracking-tight">Flashly Box</h1>
            <p class="text-earth-500 text-xl font-bold uppercase tracking-[0.4em] mt-2">Daily Card</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-earth-400 text-lg font-bold uppercase tracking-widest">{{ theme?.theme_name }}</p>
        </div>
      </div>

      <!-- Cards Container -->
      <div class="w-full flex-1 flex flex-col justify-center gap-16 z-10">
        <!-- Front Side (Visual) -->
        <div class="w-full bg-white border-2 border-earth-200 rounded-[60px] p-24 flex flex-col items-center justify-center text-center shadow-[0_40px_100px_rgba(140,111,74,0.15)] overflow-hidden relative">
          <div class="absolute top-0 left-0 w-full h-4 bg-sage-400"></div>
          <p class="text-earth-400 text-xl font-bold uppercase tracking-[0.3em] mb-12">English Word</p>
          <h2 class="text-9xl font-serif text-earth-900 font-bold leading-tight mb-8">{{ currentWord.word }}</h2>
          <div v-if="currentWord.pos" class="px-8 py-3 bg-earth-800 rounded-full text-xl text-earth-300 font-bold uppercase tracking-widest">
            {{ currentWord.pos }}
          </div>
        </div>

        <!-- Back Side (Visual) -->
        <div class="w-full bg-earth-900 border-2 border-earth-800 rounded-[60px] p-24 flex flex-col items-center justify-center text-center shadow-[0_40px_100px_rgba(0,0,0,0.2)] overflow-hidden relative">
          <div class="absolute top-0 left-0 w-full h-4 bg-clay-500"></div>
          <p class="text-earth-500 text-xl font-bold uppercase tracking-[0.3em] mb-12">Translation</p>
          <p class="text-earth-50 font-serif italic text-7xl leading-relaxed mb-16">
            {{ currentWord.meaning }}
          </p>
          <div v-if="currentWord.example" class="w-full border-t border-earth-800 pt-16">
            <p class="text-earth-500 text-lg font-bold uppercase tracking-widest mb-6">In Context</p>
            <p class="text-earth-200 font-sans text-3xl italic leading-relaxed px-12">
              "{{ currentWord.example }}"
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="w-full mt-24 flex justify-center z-10">
        <p class="text-earth-300 text-xl font-bold uppercase tracking-[0.5em]">Practice · Learn · Grow</p>
      </div>
    </div>
  </div>

  <!-- Share Preview Drawer -->
  <AnimatePresence>
    <div v-if="isDrawerOpen" class="fixed inset-0 z-[100] flex flex-col justify-end">
      <!-- Backdrop -->
      <motion.div
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        @click="isDrawerOpen = false"
        class="absolute inset-0 backdrop-blur-xs"
      />

      <!-- Drawer Content -->
      <motion.div
        :initial="{ y: '100%', scale: 0.98 }"
        :animate="{ y: 0, scale: 1 }"
        :exit="{ y: '100%', scale: 0.98 }"
        :transition="{ type: 'spring', damping: 28, stiffness: 220, mass: 0.8 }"
        class="relative bg-white rounded-t-[40px] shadow-2xl p-8 max-h-[90vh] flex flex-col"
      >
        <!-- Drag Handle -->
        <motion.div 
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ delay: 0.2 }"
          class="w-12 h-1.5 bg-earth-200 rounded-full mx-auto mb-8 flex-shrink-0" 
        />

        <div class="flex justify-between items-center mb-6 px-2">
          <motion.div
            :initial="{ opacity: 0, x: -20 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{ delay: 0.25 }"
          >
            <h3 class="text-2xl font-serif text-earth-900 font-bold">Share Preview</h3>
            <p class="text-earth-500 text-xs font-bold uppercase tracking-widest mt-1">Ready for Social Media</p>
          </motion.div>
          <motion.button 
            :initial="{ opacity: 0, scale: 0.5 }"
            :animate="{ opacity: 1, scale: 1 }"
            :transition="{ delay: 0.3 }"
            @click="isDrawerOpen = false"
            class="p-2 rounded-full bg-earth-200/50 text-earth-500 hover:bg-earth-200 hover:text-earth-800 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </motion.button>
        </div>

        <motion.div 
          :initial="{ opacity: 0, scale: 0.95, y: 20 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ delay: 0.35, duration: 0.5 }"
          class="flex-1 flex items-center justify-center mb-8 rounded-2xl bg-earth-100 p-4 min-h-0"
        >
          <img 
            v-if="previewDataUrl" 
            :src="previewDataUrl" 
            alt="Flashcard Story Preview" 
            class="max-w-full max-h-full rounded-xl shadow-lg object-contain"
          />
          <div v-else class="h-64 flex items-center justify-center text-earth-400">
            <svg class="w-10 h-10 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
          </div>
        </motion.div>

        <motion.div 
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ delay: 0.45 }"
          class="flex gap-4"
        >
          <motion.button
            :whileHover="{ scale: 1.02 }"
            :whileTap="{ scale: 0.98 }"
            @click="downloadImage"
            class="flex-[2] py-5 rounded-2xl bg-earth-800 text-white font-bold hover:bg-earth-900 transition-all shadow-xl shadow-earth-800/20 flex items-center justify-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            Download Image
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  </AnimatePresence>
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

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
