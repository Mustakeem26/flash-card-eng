<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { motion } from 'motion-v'

import { playPopSound, playMatchSound, playErrorSound, playSuccessSound } from '@/lib/audio'

const route = useRoute()
const router = useRouter()
const theme = ref<any>(null)
const loading = ref(true)

const gameCards = ref<any[]>([])
const selectedIndices = ref<number[]>([])
const matchedIds = ref<string[]>([])
const mismatchedIndices = ref<number[]>([])
const usedWordIds = ref<string[]>([])
const isGameFinished = ref(false)

const pastelColors = [
    '#FFC2D1', // Pink
    '#FFE8D6', // Cream/Peach
    '#B7E4C7', // Mint
    '#A8DADC', // Sky Blue
    '#E2BCFE', // Lavender
    '#FFD7BA'  // Apricot
]
const activeColor = ref(pastelColors[0])
const clickCount = ref(0)

function pickRandomColor() {
    const others = pastelColors.filter(c => c !== activeColor.value)
    activeColor.value = others[Math.floor(Math.random() * others.length)]
}

function initGame() {
    if (!theme.value || !theme.value.data) return

    const all = theme.value.data.map((w: any) => typeof w === 'string' ? { word: w, meaning: '', pos: '' } : w)
    const remaining = all.filter((w: any) => !usedWordIds.value.includes(w.word))

    if (remaining.length === 0) {
        isGameFinished.value = true
        playSuccessSound()
        return
    }

    // Reset round state
    selectedIndices.value = []
    matchedIds.value = []
    clickCount.value = 0

    const picked = [...remaining].sort(() => Math.random() - 0.5).slice(0, 6)
    const cards: any[] = []
    picked.forEach((w) => {
        cards.push({ type: 'word', content: w.word, id: w.word, pos: w.pos })
        cards.push({ type: 'meaning', content: w.meaning, pos: w.pos, id: w.word })
    })

    gameCards.value = cards.sort(() => Math.random() - 0.5)
}

function resetGame() {
    usedWordIds.value = []
    isGameFinished.value = false
    initGame()
}

function handleCardClick(idx: number) {
    const card = gameCards.value[idx]
    if (matchedIds.value.includes(card.id)) return

    playPopSound()

    // Pick new color every 2 clicks (start of a pair)
    if (clickCount.value % 2 === 0) {
        pickRandomColor()
    }
    clickCount.value++

    // If already selected, unselect it
    if (selectedIndices.value.includes(idx)) {
        selectedIndices.value = selectedIndices.value.filter(i => i !== idx)
        return
    }

    if (selectedIndices.value.length >= 2) return

    selectedIndices.value.push(idx)

    if (selectedIndices.value.length === 2) {
        const i1 = selectedIndices.value[0]!
        const i2 = selectedIndices.value[1]!
        const c1 = gameCards.value[i1]
        const c2 = gameCards.value[i2]

        if (c1.id === c2.id && c1.type !== c2.type) {
            // Match!
            playMatchSound()
            setTimeout(() => {
                matchedIds.value.push(c1.id)
                selectedIndices.value = []

                // Check if round finished
                if (matchedIds.value.length === gameCards.value.length / 2) {
                    setTimeout(() => {
                        const matchedInRound = [...new Set(gameCards.value.map(c => c.id))]
                        usedWordIds.value.push(...matchedInRound)
                        initGame()
                    }, 600)
                }
            }, 200)
        } else {
            // No match - show error color then reset
            playErrorSound()
            mismatchedIndices.value = [...selectedIndices.value]
            setTimeout(() => {
                mismatchedIndices.value = []
                selectedIndices.value = []
            }, 100)
        }
    }
}

async function getCollection() {
    const { data, error } = await supabase
        .from('flashcards')
        .select()
        .eq('id', route.params.id)
        .single()

    if (data) {
        theme.value = data
        initGame()
    }
    loading.value = false
}


onMounted(() => {
    getCollection()
})
</script>

<template>
    <div class="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-6 pb-24 overflow-hidden">
        <!-- Navigation Header -->
        <div class="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-20 pointer-events-none">
            <motion.button :initial="{ opacity: 0, x: -20 }" :animate="{ opacity: 1, x: 0 }"
                @click="router.push('/home?tab=pop')"
                class="flex items-center gap-2 text-coral-400 font-bold text-sm tracking-wide hover:text-sunny-800 transition-colors pointer-events-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Back</span>
            </motion.button>

            <div v-if="theme" class="flex items-center gap-6 pointer-events-auto">
                <div class="text-right">
                    <h1 class="text-sunny-900 font-serif text-lg font-bold leading-none">{{ theme.theme_name }}</h1>
                </div>
            </div>
        </div>

        <div v-if="!loading && theme && !isGameFinished"
            class="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-16 lg:px-48 py-12">
            <div class="grid grid-cols-3 md:grid-cols-4 gap-1">
                <motion.div v-for="(item, idx) in gameCards" :key="idx"
                    class="aspect-square rounded-md shadow-[0_10px_30px_rgba(253,214,137,0.05)] transition-all flex flex-col items-center justify-center p-4 text-center group cursor-pointer border-2"
                    :class="[
                        matchedIds.includes(item.id) ? 'opacity-0 pointer-events-none' : 'opacity-100',
                        mismatchedIndices.includes(idx)
                            ? 'bg-coral-500 border-coral-500 shadow-coral-500/20'
                            : selectedIndices.includes(idx)
                                ? ''
                                : 'bg-white border-coral-200 hover:shadow-[0_20px_40px_rgba(253,214,137,0.1)]'
                    ]" :style="selectedIndices.includes(idx) ? {
                        backgroundColor: activeColor,
                        borderColor: activeColor,
                        boxShadow: `0 10px 30px ${activeColor}66`
                    } : {}" @click="handleCardClick(idx)" :initial="{ opacity: 0, scale: 0.8, y: 20 }" :animate="{
                        opacity: matchedIds.includes(item.id) ? 0 : 1,
                        scale: matchedIds.includes(item.id) ? 0.8 : 1,
                        y: 0,
                        x: mismatchedIndices.includes(idx) ? [0, -10, 10, -10, 10, 0] : 0
                    }" :transition="{
                        opacity: { duration: 0.5 },
                        scale: { duration: 0.5 },
                        x: { duration: 0.4 },
                        default: { type: 'spring', damping: 20, delay: matchedIds.includes(item.id) ? 0 : idx * 0.05 }
                    }">
                    <div v-if="item.type === 'word'" class="flex flex-col items-center gap-1">
                        <p class="font-serif font-bold text-sm md:text-base transition-transform"
                            :class="mismatchedIndices.includes(idx) ? 'text-white scale-110' : selectedIndices.includes(idx) ? 'text-sunny-900 scale-110' : 'text-sunny-800 group-hover:scale-110'">
                            {{ item.content }}
                        </p>
                        <p v-if="item.pos" class="text-[9px] md:text-[10px] font-bold uppercase tracking-widest"
                            :class="mismatchedIndices.includes(idx) ? 'text-coral-300' : selectedIndices.includes(idx) ? 'text-coral-600' : 'text-coral-400'">
                            ({{ item.pos }})
                        </p>
                    </div>
                    <div v-else class="flex flex-col items-center gap-1">
                        <p class="font-serif italic text-xs md:text-sm leading-tight"
                            :class="mismatchedIndices.includes(idx) ? 'text-sunny-100' : selectedIndices.includes(idx) ? 'text-sunny-800' : 'text-sunny-700'">
                            {{ item.content || '...' }}
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>

        <!-- Success Message -->
        <motion.div v-if="isGameFinished" initial="{ opacity: 0, scale: 0.9 }" animate="{ opacity: 1, scale: 1 }"
            class="text-center p-12 bg-white rounded-[40px] shadow-2xl border border-coral-200 max-w-lg mx-auto z-30">
            <div class="w-20 h-20 bg-mint-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-mint-600" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 class="text-4xl font-serif text-sunny-900 font-bold mb-4 italic">Success!</h2>
            <p class="text-coral-400 mb-10 leading-relaxed">Wonderful! You've mastered all the words in this collection.
                Keep up the great work!</p>
            <div class="flex flex-col gap-4">
                <button @click="resetGame"
                    class="w-full bg-coral-300 text-white font-bold py-4 rounded-2xl hover:bg-coral-600 transition-all shadow-xl shadow-coral-800/20">
                    Play Again
                </button>
                <button @click="router.push('/home?tab=pop')"
                    class="w-full bg-coral-300 text-coral-600 font-bold py-4 rounded-2xl hover:bg-coral-100 transition-all">
                    Back to Home
                </button>
            </div>
        </motion.div>
    </div>
</template>

<style scoped></style>