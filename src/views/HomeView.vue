<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { motion } from 'motion-v'
import ThemeModal from '@/components/ThemeModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useHistoryStore } from '@/stores/historyStore'
import { computed } from 'vue'

const router = useRouter()
const authStore = useAuthStore()
const historyStore = useHistoryStore()
const themes = ref<any[]>([])
const isModalOpen = ref(false)
const loading = ref(true)

const DEFAULT_COLLECTION_ID = 864500091

async function getThemes() {
  loading.value = true
  const uid = authStore.user?.id

  if (uid) {
    const { data } = await supabase
      .from('flashcards')
      .select()
      .eq('creater_uid', uid)
      .order('inserted_at', { ascending: false })

    if (data && data.length > 0) {
      themes.value = data
    } else {
      // No collections for this user — load the default one
      const { data: defaultData } = await supabase
        .from('flashcards')
        .select()
        .eq('id', DEFAULT_COLLECTION_ID)
        .single()
      themes.value = defaultData ? [defaultData] : []
    }
  } else {
    // Not logged in — load default
    const { data: defaultData } = await supabase
      .from('flashcards')
      .select()
      .eq('id', DEFAULT_COLLECTION_ID)
      .single()
    themes.value = defaultData ? [defaultData] : []
  }

  loading.value = false
}

function onThemeSaved(newTheme: any) {
  themes.value = [newTheme, ...themes.value]
}

function goToTheme(id: number) {
  router.push(`/flashcard/${id}`)
}

function toggleFavorite(event: Event, id: number) {
  event.stopPropagation()
  historyStore.toggleFavorite(id)
}

function scrollToGroup(event: Event) {
  const target = event.target as HTMLSelectElement
  const groupName = target.value
  if (!groupName) return

  const safeId = 'group-' + String(groupName).replace(/\s+/g, '-').toLowerCase()
  const element = document.getElementById(safeId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  target.value = ''
}

function parseThemeName(name: string) {
  // Extract base name and trailing digits. 
  // e.g. "Medical 1" -> base: "Medical", num: 1
  // e.g. "Vocabulary-02" -> base: "Vocabulary-", num: 2
  const match = name.match(/^(.*?)(?:\s*)?(\d+)$/)
  if (match) {
    const baseStr = match[1] || ''
    const numStr = match[2] || '0'
    return {
      base: baseStr.trim() || name,
      num: parseInt(numStr, 10)
    }
  }
  return { base: name.trim(), num: 0 }
}

const favoritedThemes = computed(() => {
  if (!themes.value.length) return []
  // Keep order based on favorited order in store
  const results = []
  for (const id of historyStore.currentFavorites) {
    const theme = themes.value.find(t => t.id === id)
    if (theme) results.push(theme)
  }
  return results
})

const historyThemes = computed(() => {
  if (!themes.value.length) return []
  const results = []
  // Take up to 3 for recent history
  for (const id of historyStore.currentHistory.slice(0, 3)) {
    const theme = themes.value.find(t => t.id === id)
    if (theme) results.push(theme)
  }
  return results
})

const groupedThemes = computed(() => {
  const result: Record<string, any[]> = {}

  // Exclude favorites from the main grouped list if we want, or keep them.
  // The prompt says "collection ไหนกดใจไว้ก็จะแสดงบนสุด ตามลำดับ" (Favorites show on top)
  // Let's exclude them from the normal lists so they aren't duplicated, or keep them? 
  // Usually better to keep them in normal list, but "pinned" to top. Let's keep them in normal list too.

  themes.value.forEach(theme => {
    const themeName = theme.theme_name || ''
    const parsed = parseThemeName(themeName)
    theme._baseName = parsed.base
    theme._orderNum = parsed.num

    const baseName = parsed.base || 'Unnamed'
    if (!result[baseName]) {
      result[baseName] = []
    }
    // Use non-null assertion or cast to let TS know we just initialized it
    result[baseName]!.push(theme)
  })

  // Sort groups internally
  for (const key in result) {
    result[key]?.sort((a, b) => a._orderNum - b._orderNum)
  }

  return result
})

watch(() => authStore.user?.id, (newId, oldId) => {
  if (newId !== oldId) {
    getThemes()
  }
})

onMounted(() => {
  getThemes()
})
</script>

<template>
  <div class="min-h-screen bg-earth-100 selection:bg-earth-200 pb-20">
    <main class="max-w-5xl mx-auto px-6 pt-12">
      <!-- Call to Action Section -->
      <section class="mb-16">
        <div
          class="bg-white border border-earth-100 rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgba(140,111,74,0.05)] flex flex-col md:flex-row items-center justify-between gap-8">
          <div class="text-center md:text-left">
            <h2 class="text-3xl font-serif text-earth-900 font-bold mb-2">Build Your Knowledge</h2>
            <p class="text-earth-500 font-sans italic max-w-md">Initialize a new collection by manual entry or batch
              import from spreadsheet files.</p>
          </div>

          <motion.button :whileHover="{ scale: 1.02, y: -2 }" :whileTap="{ scale: 0.98 }" @click="isModalOpen = true"
            class="bg-earth-900 text-white font-bold px-10 py-4 rounded-2xl hover:bg-earth-950 transition-all shadow-xl shadow-earth-900/20 flex items-center gap-3 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span class="text-lg">New Collection</span>
          </motion.button>
        </div>
      </section>
      <!-- Archive Registry/Meta -->
      <div
        class="flex flex-col sm:flex-row sm:items-baseline justify-between mb-2 border-b-2 border-earth-100 pb-2 gap-2">
        <div class="flex items-center gap-4">
          <h2 class="text-earth-800 font-serif font-bold text-xl">Archive Registry</h2>
          <select @change="scrollToGroup" v-if="Object.keys(groupedThemes).length > 0"
            class="bg-white border border-earth-200 text-earth-700 text-sm rounded-lg focus:ring-earth-500 focus:border-earth-500 block p-1.5 px-3 cursor-pointer hover:bg-earth-50 transition-colors outline-none font-sans">
            <option value="" disabled selected>Quick Scroll</option>
            <option v-for="key in Object.keys(groupedThemes)" :key="key" :value="key">
              {{ key }}
            </option>
          </select>
        </div>
        <span class="text-earth-400 font-sans text-sm font-bold">{{ themes.length }} Collections</span>
      </div>
      <div class="h-px w-full bg-gradient-to-r from-earth-300 via-earth-300 to-earth-300 mb-8 opacity-50"></div>

      <!-- Skeleton Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i"
          class="bg-white border border-earth-100 rounded-2xl p-6 h-48 animate-pulse flex flex-col pt-8">
          <div class="w-12 h-1 bg-earth-100 rounded-full mb-4"></div>
          <div class="w-3/4 h-6 bg-earth-100 rounded-lg mb-2"></div>
          <div class="w-1/2 h-4 bg-earth-100 rounded-lg"></div>
          <div class="mt-auto flex justify-between">
            <div class="w-16 h-2 bg-earth-100 rounded-full"></div>
            <div class="w-16 h-2 bg-earth-100 rounded-full"></div>
          </div>
        </div>
      </div>

      <div v-else-if="themes.length > 0">
        <!-- Favorites Section -->
        <div v-if="favoritedThemes.length > 0" class="mb-12">
          <div class="flex items-baseline mb-4 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <h3 class="text-earth-900 font-serif text-xl font-bold">Favorites</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div v-for="(theme, index) in favoritedThemes" :key="'fav-' + theme.id"
              :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }" @click="goToTheme(theme.id)"
              class="group relative cursor-pointer bg-red-50/50 border border-red-100 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(140,111,74,0.08)] hover:-translate-y-1 transition-all duration-500">
              <button @click="(e) => toggleFavorite(e, theme.id)"
                class="absolute top-4 right-4 z-10 p-2 text-red-500 hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
              <div class="w-8 h-1 bg-red-300 rounded-full mb-4 group-hover:w-16 transition-all duration-500"></div>
              <h3 class="text-earth-900 font-serif text-lg font-bold mb-2 pr-8">{{ theme.theme_name }}</h3>
              <p class="text-earth-500 text-sm font-sans italic">{{ (theme.data ? theme.data.length : 0) }} Terms in
                Collection</p>
              <div
                class="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-earth-300">
                <span></span>
                <span class="group-hover:text-red-500 transition-colors uppercase">Open Card &rarr;</span>
              </div>
            </motion.div>
          </div>
        </div>

        <!-- Recent History Section -->
        <div v-if="historyThemes.length > 0" class="mb-12">
          <div class="flex items-baseline mb-4 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-earth-500" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-earth-900 font-serif text-xl font-bold">Recent Studies</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div v-for="(theme, index) in historyThemes" :key="'hist-' + theme.id"
              :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }" @click="goToTheme(theme.id)"
              class="group relative cursor-pointer bg-earth-50/50 border border-earth-100 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(140,111,74,0.08)] hover:-translate-y-1 transition-all duration-500">
              <button @click="(e) => toggleFavorite(e, theme.id)"
                class="absolute top-4 right-4 z-10 p-2 hover:scale-110 transition-transform"
                :class="historyStore.isFavorite(theme.id) ? 'text-red-500' : 'text-earth-300 hover:text-red-400'">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"
                  :fill="historyStore.isFavorite(theme.id) ? 'currentColor' : 'none'" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <div class="w-8 h-1 bg-sage-300 rounded-full mb-4 group-hover:w-16 transition-all duration-500"></div>
              <h3 class="text-earth-900 font-serif text-lg font-bold mb-2 pr-8">{{ theme.theme_name }}</h3>
              <p class="text-earth-500 text-sm font-sans italic">{{ (theme.data ? theme.data.length : 0) }} Terms in
                Collection</p>
              <div
                class="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-earth-300">
                <span></span>
                <span class="group-hover:text-sage-600 transition-colors uppercase">Open Card &rarr;</span>
              </div>
            </motion.div>
          </div>
        </div>

        <!-- Grouped Collections -->
        <div v-for="(group, groupName) in groupedThemes" :key="groupName" class="mb-12 scroll-mt-12"
          :id="'group-' + String(groupName).replace(/\s+/g, '-').toLowerCase()">
          <div class="flex items-baseline mb-4 gap-2">
            <div class="w-3 h-3 bg-earth-300 rounded-full"></div>
            <h3 class="text-earth-900 font-serif text-xl font-bold">{{ groupName }}</h3>
            <span class="text-earth-400 font-sans text-xs font-bold ml-2">{{ group.length }}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div v-for="(theme, index) in group" :key="theme.id" :initial="{ opacity: 0, y: 20 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }" @click="goToTheme(theme.id)"
              class="group relative cursor-pointer bg-white border border-earth-100 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(140,111,74,0.08)] hover:-translate-y-1 transition-all duration-500">
              <button @click="(e) => toggleFavorite(e, theme.id)"
                class="absolute top-4 right-4 z-10 p-2 hover:scale-110 transition-transform"
                :class="historyStore.isFavorite(theme.id) ? 'text-red-500' : 'text-earth-300 hover:text-red-400'">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6"
                  :fill="historyStore.isFavorite(theme.id) ? 'currentColor' : 'none'" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <div class="w-8 h-1 bg-sage-300 rounded-full mb-4 group-hover:w-16 transition-all duration-500"></div>
              <h3 class="text-earth-900 font-serif text-lg font-bold mb-2 pr-8">{{ theme.theme_name }}</h3>
              <p class="text-earth-500 text-sm font-sans italic">{{ (theme.data ? theme.data.length : 0) }} Terms in
                Collection</p>
              <div
                class="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-earth-300">
                <span></span>
                <span class="group-hover:text-sage-600 transition-colors uppercase">Open Card &rarr;</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <motion.div v-else initial="{ opacity: 0 }" animate="{ opacity: 1 }"
        class="bg-earth-100/50 border border-earth-200 border-dashed rounded-3xl p-20 text-center">
        <div class="mb-4 text-earth-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p class="text-earth-800 font-serif italic text-lg">The library is currently awaiting new entries.</p>
        <p class="text-earth-500 text-sm mt-1">Start your educational narrative by adding a collection.</p>
        <motion.button :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.98 }" @click="isModalOpen = true"
          class="mt-8 bg-earth-800 text-white font-bold px-10 py-3 rounded-2xl hover:bg-earth-900 transition-all font-sans shadow-lg shadow-earth-800/20">
          Initialize First Collection
        </motion.button>
      </motion.div>
    </main>

    <!-- Theme Creation Modal -->
    <ThemeModal :is-open="isModalOpen" @close="isModalOpen = false" @saved="onThemeSaved" />
  </div>
</template>
<style scoped>
[id^="group-"] {
  scroll-margin-top: 20vh;
}
</style>