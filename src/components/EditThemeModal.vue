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
const words = ref<{ word: string, meaning: string, pos: string }[]>([])
const isSaving = ref(false)
const isDeleting = ref(false)
const showConfirmDelete = ref(false)
const dragActive = ref(false)

const newWord = reactive({
  word: '',
  meaning: '',
  pos: ''
})

const canAppend = computed(() =>
  newWord.word.trim() !== ''
)

// Initialize data from prop
watch(() => props.isOpen, (newVal) => {
  if (newVal && props.collection) {
    themeName.value = props.collection.theme_name || ''
    words.value = (props.collection.data || []).map((w: any) =>
      typeof w === 'string' ? { word: w, meaning: '', pos: '' } : { ...w }
    )
  }
})

function addManualWord() {
  if (!canAppend.value) return
  const w = newWord.word.trim()
  const m = newWord.meaning.trim()
  const p = newWord.pos.trim()
  if (!words.value.find(x => x.word === w)) words.value.push({ word: w, meaning: m, pos: p })
  newWord.word = ''
  newWord.meaning = ''
  newWord.pos = ''
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
        word: String(row.word || row.Word || row.vocab || row.Vocabulary || Object.keys(row)[0] || '').trim(),
        meaning: String(row.meaning || row.Meaning || row.translation || row.Translation || '').trim(),
        pos: String(row.pos || row.POS || row['part of speech'] || row.Type || row.Category || '').trim()
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
  showConfirmDelete.value = false
  emit('close')
}

async function deleteTheme() {
  if (!props.collection) return
  isDeleting.value = true

  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', props.collection.id)

  if (!error) {
    emit('updated', null)
    emit('close')
  }
  isDeleting.value = false
  showConfirmDelete.value = false
}
</script>

<template>
  <AnimatePresence>
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <!-- Backdrop -->
      <motion.div initial="{ opacity: 0 }" animate="{ opacity: 1 }" exit="{ opacity: 0 }" @click="close"
        class="absolute inset-0 bg-sunny-900/40 backdrop-blur-sm"></motion.div>

      <!-- Modal Content -->
      <motion.div initial="{ opacity: 0, scale: 0.9, y: 20 }" animate="{ opacity: 1, scale: 1, y: 0 }"
        exit="{ opacity: 0, scale: 0.9, y: 20 }"
        class="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="px-8 py-6 border-b border-sunny-100 flex justify-between items-center bg-sunny-50/50">
          <div>
            <h2 class="text-2xl font-serif text-sunny-900 font-bold">Edit Collection</h2>
            <p class="text-sunny-500 text-xs font-sans font-bold uppercase tracking-widest mt-1">Archive Entry
              Modification</p>
          </div>
          <button @click="close" class="text-sunny-300 hover:text-sunny-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <!-- Theme Name Input -->
          <div class="space-y-3">
            <label class="font-serif text-sunny-900 font-bold">Collection Title</label>
            <input v-model="themeName" type="text" placeholder="e.g., Medical Terminology"
              class="w-full bg-sunny-50 border border-sunny-300 rounded-2xl px-6 py-4 text-sunny-900 text-xl font-serif placeholder:text-sunny-300 focus:outline-none focus:ring-2 focus:ring-sunny-200 transition-all" />
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <!-- Manual Entry -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="font-serif text-sunny-900 font-bold">Single Entry</h3>
                <span class="text-[10px] font-bold uppercase tracking-widest text-sunny-300">Manual Keying</span>
              </div>

              <div class="space-y-4 bg-sunny-50/30 p-11 rounded-3xl border border-sunny-300">
                <div class="space-y-3">
                  <input v-model="newWord.word" @keyup.enter="addManualWord" placeholder="Word (e.g., Ephemeral)"
                    class="w-full bg-white border border-sunny-300 placeholder:text-sunny-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-sunny-200 transition-all" />
                  <div class="grid grid-cols-2 gap-3">
                    <input v-model="newWord.meaning" @keyup.enter="addManualWord" placeholder="Meaning (Optional)"
                      class="w-full bg-white border border-sunny-300 placeholder:text-sunny-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-sunny-200 transition-all" />
                    <input v-model="newWord.pos" @keyup.enter="addManualWord" placeholder="POS (e.g., Adj)"
                      class="w-full bg-white border border-sunny-300 placeholder:text-sunny-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-sunny-200 transition-all" />
                  </div>
                </div>

                <motion.button :whileHover="canAppend ? { scale: 1.02 } : {}"
                  :whileTap="canAppend ? { scale: 0.98 } : {}" @click="addManualWord" :disabled="!canAppend"
                  class="w-full bg-sunny-800 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-sunny-900/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  :class="canAppend ? 'hover:bg-sunny-900' : ''">
                  Append to List
                </motion.button>
              </div>
            </div>

            <!-- Import Section -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="font-serif text-sunny-900 font-bold">Batch Import</h3>
                <span class="text-[10px] font-bold uppercase tracking-widest text-sunny-300">Excel / CSV Support</span>
              </div>

              <div @dragover.prevent="dragActive = true" @dragleave.prevent="dragActive = false" @drop="handleDrop"
                :class="dragActive ? 'border-mint-400 bg-mint-50/30' : 'border-sunny-300 bg-sunny-50/30'"
                class="relative border-2 border-dashed rounded-3xl p-5 flex flex-col items-center justify-center text-center transition-all min-h-[200px]">
                <div
                  class="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-sunny-300 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                  </svg>
                </div>
                <p class="font-serif text-sunny-900 font-bold mb-2">Drag & Drop Spreadsheet</p>

                <label
                  class="cursor-pointer bg-white border border-sunny-300 text-sunny-700 font-bold px-6 py-3 rounded-xl hover:shadow-md transition-all">
                  Browse Files
                  <input type="file" class="hidden" @change="handleFileUpload" accept=".xlsx, .xls, .csv" />
                </label>
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div v-if="words.length > 0" class="space-y-6 pt-6 border-t border-sunny-100">
            <div class="flex items-baseline justify-between">
              <h3 class="font-serif text-sunny-900 font-bold">Registry Preview</h3>
              <span class="text-sunny-400 font-sans text-xs font-bold">{{ words.length }} Cards Staged</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                <motion.div v-for="(word, index) in words" :key="index" initial="{ opacity: 0, x: -10 }"
                  animate="{ opacity: 1, x: 0 }" exit="{ opacity: 0, scale: 0.95 }"
                  class="group flex items-start justify-between bg-sunny-50/50 border border-sunny-100 p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-serif font-bold text-sunny-900">{{ word.word }}</span>
                      <span v-if="word.pos"
                        class="px-2 py-0.5 bg-sunny-800 text-white text-[8px] font-bold rounded-full uppercase tracking-widest">
                        {{ word.pos }}
                      </span>
                    </div>
                    <p class="text-sunny-500 text-xs italic">{{ word.meaning || 'Details will auto-generate' }}</p>
                  </div>
                  <button @click="removeWord(index)"
                    class="opacity-0 group-hover:opacity-100 p-2 text-coral-400 hover:text-coral-600 transition-all">
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
        <div class="px-8 py-6 border-t border-sunny-100 bg-white flex justify-between items-center">
          <button @click="showConfirmDelete = true"
            class="flex items-center gap-2 text-coral-400 font-bold text-sm tracking-wide hover:text-coral-600 transition-colors px-2 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
            </svg>
            Delete Collection
          </button>

          <div class="flex gap-4">
            <button @click="close"
              class="px-8 py-3 text-sunny-500 font-bold text-sm tracking-wide hover:text-sunny-800 transition-colors">
              Cancel
            </button>
            <motion.button :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.98 }" @click="updateTheme"
              :disabled="!themeName || words.length === 0 || isSaving"
              class="bg-sunny-800 text-white font-bold px-10 py-3 rounded-2xl hover:bg-sunny-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-sunny-900/10">
              {{ isSaving ? 'Updating Collection...' : 'Save Changes' }}
            </motion.button>
          </div>
        </div>

        <!-- Confirm Delete Overlay -->
        <AnimatePresence>
          <div v-if="showConfirmDelete" class="absolute inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial="{ opacity: 0 }" animate="{ opacity: 1 }" exit="{ opacity: 0 }"
              @click="showConfirmDelete = false" class="absolute inset-0 bg-sunny-900/60 backdrop-blur-md"></motion.div>
            <motion.div initial="{ opacity: 0, scale: 0.9, y: 20 }" animate="{ opacity: 1, scale: 1, y: 0 }"
              exit="{ opacity: 0, scale: 0.9, y: 20 }"
              class="relative bg-white p-10 rounded-[40px] shadow-2xl max-w-sm w-full text-center border border-sunny-100">
              <div
                class="w-16 h-16 bg-coral-50 rounded-full flex items-center justify-center mx-auto mb-6 text-coral-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 class="text-2xl font-serif text-sunny-900 font-bold mb-3">Delete Collection?</h3>
              <p class="text-sunny-500 text-sm mb-10 leading-relaxed">This action cannot be undone. All flashcards in
                this collection will be permanently removed.</p>
              <div class="flex flex-col gap-3">
                <button @click="deleteTheme" :disabled="isDeleting"
                  class="w-full bg-coral-500 text-white font-bold py-4 rounded-2xl hover:bg-coral-600 transition-all shadow-lg shadow-coral-500/20 disabled:opacity-50">
                  {{ isDeleting ? 'Deleting...' : 'Yes, Delete Collection' }}
                </button>
                <button @click="showConfirmDelete = false" :disabled="isDeleting"
                  class="w-full bg-sunny-50 text-sunny-600 font-bold py-4 rounded-2xl hover:bg-sunny-100 transition-all">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
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
  background: #a7f3d0;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6ee7b7;
}
</style>