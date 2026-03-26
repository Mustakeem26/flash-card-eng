<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const props = defineProps<{
  isOpen: boolean
  collection: any
}>()

const emit = defineEmits(['close', 'updated'])

const themeName = ref('')
const words = ref<{word: string, meaning: string}[]>([])
const isSaving = ref(false)
const dragActive = ref(false)

const newWord = reactive({
  word: '',
  meaning: ''
})

const canAppend = computed(() =>
  newWord.word.trim() !== ''
)

// Initialize data from prop
watch(() => props.isOpen, (newVal) => {
  if (newVal && props.collection) {
    themeName.value = props.collection.theme_name || ''
    words.value = (props.collection.data || []).map((w: any) => 
      typeof w === 'string' ? { word: w, meaning: '' } : { ...w }
    )
  }
})

function addManualWord() {
  if (!canAppend.value) return
  const w = newWord.word.trim()
  const m = newWord.meaning.trim()
  if (!words.value.find(x => x.word === w)) words.value.push({ word: w, meaning: m })
  newWord.word = ''
  newWord.meaning = ''
}

function removeWord(index: number) {
  words.value.splice(index, 1)
}

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  parseFile(file)
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  dragActive.value = false
  const file = event.dataTransfer?.files[0]
  if (file) parseFile(file)
}

function parseFile(file: File) {
  const isCSV = file.name.toLowerCase().endsWith('.csv')
  const reader = new FileReader()

  reader.onload = (e) => {
    const arrayBuffer = e.target?.result as ArrayBuffer
    let workbook: XLSX.WorkBook

    if (isCSV) {
      // For CSV, decode as UTF-8 string to ensure multi-byte characters (Thai) are preserved
      const decoder = new TextDecoder('utf-8')
      const content = decoder.decode(arrayBuffer)
      workbook = XLSX.read(content, { type: 'string' })
    } else {
      const data = new Uint8Array(arrayBuffer)
      workbook = XLSX.read(data, { type: 'array' })
    }

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) return
    const json = XLSX.utils.sheet_to_json(worksheet)

    const importedWords = json
      .map((row: any) => ({
        word: String(row.word || row.Word || row.vocab || Object.keys(row)[0] || '').trim(),
        meaning: String(row.meaning || row.Meaning || row.translation || Object.values(row)[0] || '').trim()
      }))
      .filter(w => w.word)

    // Deduplicate
    const existing = new Set(words.value.map(w => w.word))
    importedWords.forEach(w => { if (!existing.has(w.word)) words.value.push(w) })
  }
  reader.readAsArrayBuffer(file)
}

async function updateTheme() {
  if (!themeName.value.trim() || words.value.length === 0 || !props.collection) return

  isSaving.value = true

  const { data, error } = await supabase
    .from('flashcards')
    .update({
      theme_name: themeName.value.trim(),
      data: words.value
    })
    .eq('id', props.collection.id)
    .select()

  if (!error && data) {
    emit('updated', data[0])
    emit('close')
  }
  isSaving.value = false
}

function close() {
  emit('close')
}
</script>

<template>
  <AnimatePresence>
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <!-- Backdrop -->
      <motion.div initial="{ opacity: 0 }" animate="{ opacity: 1 }" exit="{ opacity: 0 }" @click="close"
        class="absolute inset-0 bg-earth-900/40 backdrop-blur-sm"></motion.div>

      <!-- Modal Content -->
      <motion.div initial="{ opacity: 0, scale: 0.9, y: 20 }" animate="{ opacity: 1, scale: 1, y: 0 }"
        exit="{ opacity: 0, scale: 0.9, y: 20 }"
        class="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="px-8 py-6 border-b border-earth-100 flex justify-between items-center bg-earth-50/50">
          <div>
            <h2 class="text-2xl font-serif text-earth-900 font-bold">Edit Collection</h2>
            <p class="text-earth-500 text-xs font-sans font-bold uppercase tracking-widest mt-1">Archive Entry
              Modification</p>
          </div>
          <button @click="close" class="text-earth-300 hover:text-earth-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <!-- Theme Name Input -->
          <div class="space-y-3">
            <label class="font-serif text-earth-900 font-bold">Collection Title</label>
            <input v-model="themeName" type="text" placeholder="e.g., Medical Terminology"
              class="w-full bg-earth-50 border border-earth-300 rounded-2xl px-6 py-4 text-earth-900 text-xl font-serif placeholder:text-earth-300 focus:outline-none focus:ring-2 focus:ring-earth-200 transition-all" />
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <!-- Manual Entry -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="font-serif text-earth-900 font-bold">Single Entry</h3>
                <span class="text-[10px] font-bold uppercase tracking-widest text-earth-300">Manual Keying</span>
              </div>

              <div class="space-y-4 bg-earth-50/30 p-11 rounded-3xl border border-earth-300">
                <div class="space-y-3">
                  <input v-model="newWord.word" @keyup.enter="addManualWord" placeholder="Word (e.g., Ephemeral)"
                    class="w-full bg-white border border-earth-300 placeholder:text-earth-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-earth-200 transition-all" />
                  <input v-model="newWord.meaning" @keyup.enter="addManualWord" placeholder="Meaning (Optional)"
                    class="w-full bg-white border border-earth-300 placeholder:text-earth-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-earth-200 transition-all" />
                </div>

                <motion.button :whileHover="canAppend ? { scale: 1.02 } : {}"
                  :whileTap="canAppend ? { scale: 0.98 } : {}" @click="addManualWord" :disabled="!canAppend"
                  class="w-full bg-earth-800 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-earth-900/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  :class="canAppend ? 'hover:bg-earth-900' : ''">
                  Append to List
                </motion.button>
              </div>
            </div>

            <!-- Import Section -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="font-serif text-earth-900 font-bold">Batch Import</h3>
                <span class="text-[10px] font-bold uppercase tracking-widest text-earth-300">Excel / CSV Support</span>
              </div>

              <div @dragover.prevent="dragActive = true" @dragleave.prevent="dragActive = false" @drop="handleDrop"
                :class="dragActive ? 'border-sage-400 bg-sage-50/30' : 'border-earth-300 bg-earth-50/30'"
                class="relative border-2 border-dashed rounded-3xl p-5 flex flex-col items-center justify-center text-center transition-all min-h-[200px]">
                <div
                  class="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-earth-300 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                  </svg>
                </div>
                <p class="font-serif text-earth-900 font-bold mb-2">Drag & Drop Spreadsheet</p>

                <label
                  class="cursor-pointer bg-white border border-earth-300 text-earth-700 font-bold px-6 py-3 rounded-xl hover:shadow-md transition-all">
                  Browse Files
                  <input type="file" class="hidden" @change="handleFileUpload" accept=".xlsx, .xls, .csv" />
                </label>
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div v-if="words.length > 0" class="space-y-6 pt-6 border-t border-earth-100">
            <div class="flex items-baseline justify-between">
              <h3 class="font-serif text-earth-900 font-bold">Registry Preview</h3>
              <span class="text-earth-400 font-sans text-xs font-bold">{{ words.length }} Cards Staged</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                <motion.div v-for="(word, index) in words" :key="index" initial="{ opacity: 0, x: -10 }"
                  animate="{ opacity: 1, x: 0 }" exit="{ opacity: 0, scale: 0.95 }"
                  class="group flex items-start justify-between bg-earth-50/50 border border-earth-100 p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-serif font-bold text-earth-900">{{ word.word }}</span>
                    </div>
                    <p class="text-earth-500 text-xs italic">{{ word.meaning || 'Details will auto-generate' }}</p>
                  </div>
                  <button @click="removeWord(index)"
                    class="opacity-0 group-hover:opacity-100 p-2 text-clay-400 hover:text-clay-600 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-8 py-6 border-t border-earth-100 bg-white flex justify-end gap-4">
          <button @click="close"
            class="px-8 py-3 text-earth-500 font-bold text-sm tracking-wide hover:text-earth-800 transition-colors">
            Cancel
          </button>
          <motion.button :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.98 }" @click="updateTheme"
            :disabled="!themeName || words.length === 0 || isSaving"
            class="bg-earth-800 text-white font-bold px-10 py-3 rounded-2xl hover:bg-earth-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-earth-900/10">
            {{ isSaving ? 'Updating Collection...' : 'Save Changes' }}
          </motion.button>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
</template>

<style scoped>
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
