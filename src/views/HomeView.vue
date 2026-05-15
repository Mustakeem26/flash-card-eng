<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { motion } from 'motion-v'
import ThemeModal from '@/components/ThemeModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useHistoryStore } from '@/stores/historyStore'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const historyStore = useHistoryStore()
const themes = ref<any[]>([])
const isModalOpen = ref(false)
const loading = ref(true)
const activeTab = ref(route.query.tab === 'pop' ? 'pop' : 'flash')

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

function goToPopCard(id: number) {
  router.push(`/popcard/${id}`)
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

// Split groups into sub-groups of 10 cards each for accordion
interface AccordionSection {
  groupName: string
  pageIndex: number
  cards: any[]
  startNum: number
  endNum: number
}

const groupedThemesWithPages = computed(() => {
  const result: Record<string, AccordionSection[]> = {}

  for (const key in groupedThemes.value) {
    const group = groupedThemes.value[key]
    if (!group) continue

    const pages: AccordionSection[] = []
    const pageSize = 10
    const totalPages = Math.ceil(group.length / pageSize)

    for (let i = 0; i < totalPages; i++) {
      const start = i * pageSize
      const end = Math.min(start + pageSize, group.length)
      const cards = group.slice(start, end)

      pages.push({
        groupName: key,
        pageIndex: i,
        cards,
        startNum: start + 1,
        endNum: end
      })
    }

    result[key] = pages
  }

  return result
})

// Accordion state - key is "groupName-pageIndex"
const expandedGroups = ref<Record<string, boolean>>({})

// Initialize expanded state for all accordions
watch(groupedThemesWithPages, (newGroups) => {
  for (const key of Object.keys(newGroups)) {
    for (const page of newGroups[key]!) {
      const accordionKey = `${key}-${page.pageIndex}`
      if (expandedGroups.value[accordionKey] === undefined) {
        expandedGroups.value[accordionKey] = false // Default collapsed
      }
    }
  }
}, { immediate: true })

function toggleGroup(accordionKey: string) {
  expandedGroups.value[accordionKey] = !expandedGroups.value[accordionKey]
}

watch(() => authStore.user?.id, (newId, oldId) => {
  if (newId !== oldId) {
    getThemes()
  }
})

onMounted(() => {
  getThemes()
})

watch(() => route.query.tab, (newTab) => {
  if (newTab === 'pop') {
    activeTab.value = 'pop'
  } else if (newTab === 'flash') {
    activeTab.value = 'flash'
  }
})
</script>

<template>
  <div class="min-h-screen bg-sky-50 selection:bg-sky-100 pb-20">
    <main class="max-w-5xl mx-auto px-6 pt-12">
      <!-- Call to Action Section -->
      <section class="mb-4">
        <div
          class="bg-white border border-coral-300 rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgba(255,165,173,0.1)] flex flex-col md:flex-row items-center justify-between gap-8">
          <div class="text-center md:text-left">
            <h2 class="text-3xl font-serif text-sunny-900 font-bold mb-2">Build Your Knowledge</h2>
            <p class="text-coral-300 font-sans italic max-w-md">Initialize a new collection by manual entry or batch
              import from spreadsheet files.</p>
          </div>

          <motion.button :whileHover="{ scale: 1.02, y: -2 }" :whileTap="{ scale: 0.98 }" @click="isModalOpen = true"
            class="bg-coral-300 text-white font-bold px-10 py-4 rounded-2xl hover:bg-coral-400 transition-all shadow-xl shadow-coral-300/20 flex items-center gap-3 whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span class="text-lg">New Collection</span>
          </motion.button>
        </div>
      </section>

      <!-- Switch Tab Section -->
      <div class="flex mb-4">
        <div
          class="w-full bg-coral-200 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner border border-coral-200/50">
          <button @click="activeTab = 'flash'" :class="[
            'flex-1 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2',
            activeTab === 'flash'
              ? 'bg-white text-coral-600 shadow-md scale-100'
              : 'text-coral-400 hover:text-coral-600 hover:bg-coral-200/30 scale-95'
          ]">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Flash Card
          </button>
          <button @click="activeTab = 'pop'" :class="[
            'flex-1 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2',
            activeTab === 'pop'
              ? 'bg-white text-coral-600 shadow-md scale-100'
              : 'text-coral-400 hover:text-coral-600 hover:bg-coral-200/30 scale-95'
          ]">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1-1-1v-6z" />
            </svg>
            Pop Card
          </button>
        </div>
      </div>

      <motion.div v-if="activeTab === 'flash'" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, ease: 'easeOut' }">
        <!-- Archive Registry/Meta -->
        <div
          class="flex flex-col sm:flex-row sm:items-baseline justify-between mb-2 border-b-2 border-coral-200 pb-2 gap-2">
          <div class="flex items-center gap-4">
            <h2 class="text-sunny-800 font-serif font-bold text-xl">Archive Registry</h2>
            <Teleport to="#navbar-quick-scroll">
              <select @change="scrollToGroup" v-if="Object.keys(groupedThemes).length > 0"
                class="bg-white border border-coral-200 text-coral-600 text-sm rounded-lg focus:ring-coral-500 focus:border-coral-500 block p-1.5 px-3 cursor-pointer hover:bg-coral-50 transition-colors outline-none font-sans w-32 sm:w-auto truncate shadow-sm">
                <option value="" disabled selected>Quick Scroll</option>
                <option v-for="key in Object.keys(groupedThemes)" :key="key" :value="key">
                  {{ key }}
                </option>
              </select>
            </Teleport>
          </div>
          <span class="text-sunny-800 font-sans text-sm font-bold">{{ themes.length }} Collections</span>
        </div>
        <div class="h-px w-full mb-8 opacity-50"></div>

        <!-- Skeleton Loading State (Flash Card) -->
        <div v-if="loading" class="flex overflow-x-auto gap-6 pb-12 hide-scrollbar">
          <div v-for="i in 3" :key="'flash-skeleton-' + i" class="flex-none w-80">
            <div class="flex items-center mb-6 gap-3 border-b-2 border-coral-100 pb-3">
              <div class="w-8 h-8 bg-coral-50 rounded-lg animate-pulse"></div>
              <div class="h-5 w-24 bg-coral-100 rounded-md animate-pulse"></div>
            </div>
            <div class="flex flex-col gap-4">
              <div v-for="j in 2" :key="'flash-card-skel-' + j"
                class="bg-white border border-coral-100 rounded-3xl p-6 h-48 animate-pulse flex flex-col pt-8">
                <div class="w-12 h-1 bg-coral-100 rounded-full mb-4"></div>
                <div class="h-6 w-3/4 bg-coral-50 rounded-lg mb-3"></div>
                <div class="h-4 w-1/2 bg-coral-50 rounded-md mb-6"></div>
                <div class="mt-auto h-10 w-full bg-coral-50 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="themes.length > 0"
          class="flex overflow-x-auto gap-6 pb-12 snap-x hide-scrollbar custom-scrollbar">

          <!-- Recent Column -->
          <div v-if="historyThemes.length > 0" class="flex-none w-75 snap-start">
            <div class="flex items-center mb-6 gap-3 border-b-2 border-coral-200 pb-3">
              <div class="p-2 bg-coral-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-coral-400" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-sunny-900 font-serif text-xl font-bold">Recent Studies</h3>
            </div>
            <div class="flex flex-col gap-6">
              <motion.div v-for="(theme, index) in historyThemes" :key="'hist-' + theme.id"
                :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
                @click="goToTheme(theme.id)"
                class="group relative cursor-pointer bg-white border border-coral-200 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(255,165,173,0.12)] hover:-translate-y-1 transition-all duration-500 flex flex-col h-full">
                <div class="w-8 h-1 bg-coral-300 rounded-full mb-3 group-hover:w-16 transition-all duration-500"></div>
                <h3 class="text-sunny-900 font-serif text-lg font-bold mb-1 pr-8">{{ theme.theme_name }}</h3>
                <p class="text-sunny-900 text-sm font-sans italic">{{ (theme.data ? theme.data.length : 0) }} Terms in
                  Collection</p>
                <div
                  class="mt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-coral-300">
                  <span>
                    <p v-if="theme.sub_name" class="text-coral-400 tracking-wider">{{
                      theme.sub_name }}</p>
                  </span>
                  <span class="group-hover:text-coral-600 transition-colors uppercase">Open Card &rarr;</span>
                </div>
              </motion.div>
            </div>
          </div>

          <!-- Group Columns -->
          <div v-for="(group, groupName) in groupedThemes" :key="'group-' + groupName"
            :id="'group-' + String(groupName).replace(/\s+/g, '-').toLowerCase()" class="flex-none w-75 snap-start">
            <div class="flex items-center mb-6 gap-3 border-b-2 border-coral-200 pb-3">
              <div class="p-2 bg-coral-50 rounded-lg">
                <div class="w-5 h-5 bg-coral-200 rounded-full"></div>
              </div>
              <h3 class="text-sunny-900 font-serif text-xl font-bold truncate">{{ groupName }}</h3>
              <span class="text-coral-400 font-sans text-xs font-bold ml-auto">{{ group.length }}</span>
            </div>

            <!-- Multiple Accordions for groups with > 10 cards -->
            <template v-if="groupedThemesWithPages[groupName] && group.length > 10">
              <template v-for="page in groupedThemesWithPages[groupName]" :key="`${groupName}-${page.pageIndex}`">
                <!-- Accordion Header -->
                <div @click="toggleGroup(`${groupName}-${page.pageIndex}`)"
                  class="accordion-header mb-2 cursor-pointer bg-white border border-coral-200 rounded-xl px-4 py-5 flex items-center justify-between hover:bg-coral-50 transition-colors">
                  <span class="text-sunny-800 font-bold text-sm pt-1">
                    {{ groupName }}
                    <template v-if="page.cards.length > 1">({{ page.startNum }}-{{ page.endNum }})</template>
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="text-coral-400 text-xs font-bold">{{ page.cards.length }} cards</span>
                    <svg xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4 text-coral-400 transition-transform duration-300"
                      :class="{ 'rotate-180': expandedGroups[`${groupName}-${page.pageIndex}`] }" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <!-- Accordion Content with Border when open -->
                <div v-show="expandedGroups[`${groupName}-${page.pageIndex}`] !== false"
                  :class="['accordion-content-wrapper mb-4 p-3 rounded-xl transition-all duration-300', expandedGroups[`${groupName}-${page.pageIndex}`] ? 'bg-coral-50/30 border border-coral-200' : '']">
                  <div class="flex flex-col gap-6">
                    <motion.div v-for="(theme, index) in page.cards" :key="theme.id" :initial="{ opacity: 0, y: 20 }"
                      :animate="{ opacity: 1, y: 0 }"
                      :transition="{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
                      @click="goToTheme(theme.id)"
                      class="group relative cursor-pointer bg-white border border-coral-200 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(253,214,137,0.08)] hover:-translate-y-1 transition-all duration-500 flex flex-col h-full">
                      <div class="w-8 h-1 bg-coral-300 rounded-full mb-3 group-hover:w-16 transition-all duration-500">
                      </div>
                      <h3 class="text-sunny-900 font-serif text-lg font-bold mb-1 pr-8">{{ theme.theme_name }}</h3>
                      <p class="text-sunny-900 text-sm font-sans italic">{{ (theme.data ? theme.data.length : 0) }}
                        Terms in
                        Collection</p>
                      <div
                        class="mt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-coral-300">
                        <span>
                          <p v-if="theme.sub_name" class="text-coral-400 tracking-wider">{{
                            theme.sub_name }}</p>
                        </span>
                        <span class="group-hover:text-coral-600 transition-colors uppercase">Open Card &rarr;</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </template>
            </template>
            <!-- For groups with < 10 cards, show all cards directly -->
            <div v-else class="flex flex-col gap-6">
              <motion.div v-for="(theme, index) in group" :key="theme.id" :initial="{ opacity: 0, y: 20 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
                @click="goToTheme(theme.id)"
                class="group relative cursor-pointer bg-white border border-coral-200 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(253,214,137,0.08)] hover:-translate-y-1 transition-all duration-500 flex flex-col h-full">
                <div class="w-8 h-1 bg-coral-300 rounded-full mb-3 group-hover:w-16 transition-all duration-500"></div>
                <h3 class="text-sunny-900 font-serif text-lg font-bold mb-1 pr-8">{{ theme.theme_name }}
                </h3>
                <p class="text-sunny-900 text-sm font-sans italic">{{ (theme.data ? theme.data.length : 0) }} Terms in
                  Collection</p>
                <div
                  class="mt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-coral-300">
                  <span>
                    <p v-if="theme.sub_name" class="text-coral-400 tracking-wider">{{
                      theme.sub_name }}</p>
                  </span>
                  <span class="group-hover:text-coral-600 transition-colors uppercase">Open Card &rarr;</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <motion.div v-else initial="{ opacity: 0 }" animate="{ opacity: 1 }"
          class="bg-sky-100/50 border border-coral-200 border-dashed rounded-3xl p-20 text-center">
          <div class="mb-4 text-coral-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p class="text-coral-800 font-serif italic text-lg">The library is currently awaiting new entries.</p>
          <p class="text-coral-500 text-sm mt-1">Start your educational narrative by adding a collection.</p>
          <motion.button :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.98 }" @click="isModalOpen = true"
            class="mt-8 bg-coral-800 text-white font-bold px-10 py-3 rounded-2xl hover:bg-coral-900 transition-all font-sans shadow-lg shadow-coral-800/20">
            Initialize First Collection
          </motion.button>
        </motion.div>
      </motion.div>
      <motion.div v-else-if="activeTab === 'pop'" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, ease: 'easeOut' }">
        <!-- Archive Registry/Meta -->
        <div
          class="flex flex-col sm:flex-row sm:items-baseline justify-between mb-2 border-b-2 border-coral-200 pb-2 gap-2">
          <div class="flex items-center gap-4">
            <h2 class="text-coral-800 font-serif font-bold text-xl">Archive Registry</h2>
            <Teleport to="#navbar-quick-scroll">
              <select @change="scrollToGroup" v-if="Object.keys(groupedThemes).length > 0"
                class="bg-white border border-coral-200 text-coral-600 text-sm rounded-lg focus:ring-coral-500 focus:border-coral-500 block p-1.5 px-3 cursor-pointer hover:bg-coral-50 transition-colors outline-none font-sans w-32 sm:w-auto truncate shadow-sm">
                <option value="" disabled selected>Quick Scroll</option>
                <option v-for="key in Object.keys(groupedThemes)" :key="key" :value="key">
                  {{ key }}
                </option>
              </select>
            </Teleport>
          </div>
          <span class="text-coral-800 font-sans text-sm font-bold">{{ themes.length }} Collections</span>
        </div>
        <div class="h-px w-full mb-8 opacity-50"></div>
        <!-- Skeleton Loading State (Pop Card) -->
        <div v-if="loading" class="flex overflow-x-auto gap-6 pb-12 hide-scrollbar">
          <div v-for="i in 3" :key="'pop-skeleton-' + i" class="flex-none w-60">
            <div class="flex items-center mb-6 gap-3 border-b-2 border-coral-100 pb-3">
              <div class="w-8 h-8 bg-coral-50 rounded-lg animate-pulse"></div>
              <div class="h-5 w-24 bg-coral-100 rounded-md animate-pulse"></div>
            </div>
            <div class="flex flex-col gap-3">
              <div v-for="j in 4" :key="'pop-card-skel-' + j"
                class="flex items-center justify-between bg-white border border-coral-100 rounded-2xl p-4 animate-pulse">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-coral-50 rounded-xl"></div>
                  <div>
                    <div class="h-4 w-24 bg-coral-100 rounded mb-2"></div>
                    <div class="h-2 w-12 bg-coral-50 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="themes.length > 0"
          class="flex overflow-x-auto gap-6 pb-12 snap-x hide-scrollbar custom-scrollbar">

          <!-- Recent History Column (Pop Card) -->
          <div v-if="historyThemes.length > 0" class="flex-none w-60 snap-start">
            <div class="flex items-center mb-6 gap-3 border-b-2 border-coral-200 pb-2">
              <div class="p-2 bg-coral-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-coral-500" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-sunny-900 font-serif text-xl font-bold">Recent</h3>
            </div>
            <div class="flex flex-col gap-3">
              <motion.div v-for="(theme, index) in historyThemes" :key="'pop-hist-' + theme.id"
                :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ delay: index * 0.05, duration: 0.4 }" @click="goToPopCard(theme.id)"
                class="group flex items-center justify-between bg-white border border-coral-200 rounded-2xl p-4 hover:shadow-md hover:border-coral-400 transition-all cursor-pointer">
                <div class="flex items-center gap-4">
                  <div
                    class="w-10 h-10 bg-coral-50 rounded-xl flex items-center justify-center text-coral-500 group-hover:bg-coral-200 group-hover:text-coral-600 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="max-w-[140px]">
                    <h4 class="text-coral-900 font-bold text-sm leading-tight truncate">{{ theme.theme_name }}</h4>
                    <p class="text-coral-300 text-[10px] font-bold uppercase tracking-wider mt-0.5">{{ (theme.data ?
                      theme.data.length : 0) }} Words</p>
                  </div>
                </div>
                <div class="text-coral-200 group-hover:text-coral-400 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.div>
            </div>
          </div>

          <!-- Group Columns (Pop Card) -->
          <div v-for="(group, groupName) in groupedThemes" :key="'pop-group-' + groupName"
            class="flex-none w-60 snap-start">
            <div class="flex items-center mb-6 gap-3 border-b-2 border-coral-200 pb-2">
              <div class="p-2 bg-coral-50 rounded-lg">
                <div class="w-5 h-5 bg-coral-200 rounded-full"></div>
              </div>
              <h3 class="text-coral-900 font-serif text-xl font-bold truncate">{{ groupName }}</h3>
              <span class="text-coral-400 font-sans text-xs font-bold ml-auto">{{ group.length }}</span>
            </div>

            <!-- Multiple Accordions for groups with > 10 cards -->
            <template v-if="groupedThemesWithPages[groupName] && group.length > 10">
              <template v-for="page in groupedThemesWithPages[groupName]" :key="`pop-${groupName}-${page.pageIndex}`">
                <!-- Accordion Header -->
                <div @click="toggleGroup(`${groupName}-${page.pageIndex}`)"
                  class="accordion-header mb-2 cursor-pointer bg-white border border-coral-200 rounded-xl px-4 py-2 flex items-center justify-between hover:bg-coral-50 transition-colors">
                  <span class="text-coral-800 font-bold text-sm">
                    {{ groupName }}
                    <template v-if="page.cards.length > 1">({{ page.startNum }}-{{ page.endNum }})</template>
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="text-coral-400 text-xs font-bold">{{ page.cards.length }} cards</span>
                    <svg xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4 text-coral-400 transition-transform duration-300"
                      :class="{ 'rotate-180': expandedGroups[`${groupName}-${page.pageIndex}`] }" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <!-- Accordion Content with Border when open -->
                <div v-show="expandedGroups[`${groupName}-${page.pageIndex}`] !== false"
                  :class="['accordion-content-wrapper mb-4 p-3 rounded-xl transition-all duration-300', expandedGroups[`${groupName}-${page.pageIndex}`] ? 'bg-coral-50/30 border border-coral-200' : '']">
                  <div class="flex flex-col gap-3">
                    <motion.div v-for="(theme, index) in page.cards" :key="'pop-card-' + theme.id"
                      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                      :transition="{ delay: index * 0.05, duration: 0.4 }" @click="goToPopCard(theme.id)"
                      class="group flex items-center justify-between bg-white border border-coral-200 rounded-2xl p-4 hover:shadow-md hover:border-coral-400 transition-all cursor-pointer">
                      <div class="flex items-center gap-2">
                        <div
                          class="w-10 h-10 bg-coral-50 rounded-xl flex items-center justify-center text-coral-500 group-hover:bg-coral-200 group-hover:text-coral-600 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                              d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                          </svg>
                        </div>
                        <div class="max-w-[140px]">
                          <h4 class="text-coral-900 font-bold text-sm leading-tight truncate">{{ theme.theme_name }}
                          </h4>
                          <p class="text-coral-300 text-[10px] font-bold uppercase tracking-wider mt-0.5">{{ (theme.data
                            ?
                            theme.data.length : 0) }} Words</p>
                        </div>
                      </div>
                      <div class="text-coral-200 group-hover:text-coral-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </template>
            </template>
            <!-- For groups with < 10 cards, show all cards directly -->
            <div v-else class="flex flex-col gap-3">
              <motion.div v-for="(theme, index) in group" :key="'pop-card-' + theme.id" :initial="{ opacity: 0, y: 10 }"
                :animate="{ opacity: 1, y: 0 }" :transition="{ delay: index * 0.05, duration: 0.4 }"
                @click="goToPopCard(theme.id)"
                class="group flex items-center justify-between bg-white border border-coral-200 rounded-2xl p-4 hover:shadow-md hover:border-coral-400 transition-all cursor-pointer">
                <div class="flex items-center gap-2">
                  <div
                    class="w-10 h-10 bg-coral-50 rounded-xl flex items-center justify-center text-coral-500 group-hover:bg-coral-200 group-hover:text-coral-600 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                  </div>
                  <div class="max-w-[140px]">
                    <h4 class="text-coral-900 font-bold text-sm leading-tight truncate">{{ theme.theme_name }}</h4>
                    <p v-if="theme.sub_name" class="text-coral-300 text-[10px] font-bold tracking-wider mt-0.5">{{
                      theme.sub_name + ' / ' }}{{ (theme.data ?
                        theme.data.length : 0) }} W</p>
                    <p v-else class="text-coral-300 text-[10px] font-bold uppercase tracking-wider mt-0.5">{{
                      (theme.data ?
                        theme.data.length : 0) }} Words</p>
                  </div>
                </div>
                <div class="text-coral-200 group-hover:text-coral-400 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <motion.div v-else initial="{ opacity: 0 }" animate="{ opacity: 1 }"
          class="bg-sky-100/50 border border-sunny-200 border-dashed rounded-3xl p-20 text-center">
          <div class="mb-4 text-sunny-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p class="text-sunny-800 font-serif italic text-lg">The library is currently awaiting new entries.</p>
          <p class="text-sunny-500 text-sm mt-1">Start your educational narrative by adding a collection for Pop Card
            challenges.</p>
        </motion.div>
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

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #a7f3d0;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6ee7b7;
}
</style>