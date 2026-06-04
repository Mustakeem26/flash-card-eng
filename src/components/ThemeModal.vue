<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close', 'saved'])

const themeName = ref('')
const words = ref<{ word: string, meaning: string, pos: string }[]>([])
const isSaving = ref(false)
const dragActive = ref(false)
const categories = ref<{ id: bigint; category_name: string }[]>([])
const selectedCategoryId = ref<bigint | null>(null)
const showAddCategoryModal = ref(false)
const newCategoryName = ref('')
const isDeletingCategory = ref(false)
const isLoadingCategories = ref(false)
const showDeleteConfirmModal = ref(false)
const categoryToDelete = ref<{ id: bigint; name: string } | null>(null)

const newWord = reactive({
  word: '',
  meaning: '',
  pos: ''
})

const canAppend = computed(() =>
  newWord.word.trim() !== ''
)

const canSave = computed(() =>
  themeName.value.trim() !== '' &&
  words.value.length > 0 &&
  selectedCategoryId.value !== null
)

// Fetch categories for current user
async function fetchCategories() {
  isLoadingCategories.value = true
  const userUid = authStore.user?.id
  if (!userUid) {
    isLoadingCategories.value = false
    return
  }

  const { data, error } = await supabase
    .from('card_category')
    .select('id, category_name')
    .eq('user_uid', userUid)
    .order('created_at', { ascending: true })

  if (!error && data) {
    categories.value = data
    // Don't auto-select any category - let user choose
    selectedCategoryId.value = null
  }
  isLoadingCategories.value = false
}

// Ensure "other" category exists
async function ensureOtherCategory(): Promise<bigint | null> {
  const userUid = authStore.user?.id
  if (!userUid) return null

  // Check if "other" already exists
  const { data: existing } = await supabase
    .from('card_category')
    .select('id')
    .eq('user_uid', userUid)
    .eq('category_name', 'Other')
    .single()

  if (existing) {
    return existing.id
  }

  // Create "other" category
  const { data: created, error } = await supabase
    .from('card_category')
    .insert([{
      user_uid: userUid,
      category_name: 'Other'
    }])
    .select('id')
    .single()

  if (error || !created) {
    console.error('Failed to create "other" category:', error)
    return null
  }

  return created.id
}

// Add new category with duplicate check
async function addCategory() {
  if (!newCategoryName.value.trim()) return

  const userUid = authStore.user?.id
  if (!userUid) return

  const trimmedName = newCategoryName.value.trim()

  // Check for duplicate category name (case-insensitive)
  const existingCategory = categories.value.find(
    c => c.category_name.toLowerCase() === trimmedName.toLowerCase()
  )
  if (existingCategory) {
    alert(`Category "${trimmedName}" already exists. Please use a different name.`)
    return
  }

  const { data, error } = await supabase
    .from('card_category')
    .insert([{
      user_uid: userUid,
      category_name: trimmedName
    }])
    .select('id, category_name')
    .single()

  if (!error && data) {
    categories.value.push(data)
    selectedCategoryId.value = data.id
    newCategoryName.value = ''
    showAddCategoryModal.value = false
  }
}

// Delete category and reassign cards to "other"
async function deleteCategory(categoryId: bigint) {
  isDeletingCategory.value = true
  const userUid = authStore.user?.id
  if (!userUid) {
    isDeletingCategory.value = false
    return
  }

  // Find or create "other" category
  let otherCategoryId = await ensureOtherCategory()
  if (!otherCategoryId) {
    alert('Failed to create "other" category. Cannot delete.')
    isDeletingCategory.value = false
    return
  }

  // Update all flashcards in this category to "other"
  const { error: updateError } = await supabase
    .from('flashcards')
    .update({ category_id: otherCategoryId })
    .eq('category_id', categoryId)

  if (updateError) {
    console.error('Failed to reassign cards:', updateError)
    alert('Failed to reassign cards. Cannot delete category.')
    isDeletingCategory.value = false
    return
  }

  // Delete the category
  const { error: deleteError } = await supabase
    .from('card_category')
    .delete()
    .eq('id', categoryId)

  if (!deleteError) {
    categories.value = categories.value.filter(c => c.id !== categoryId)
    if (selectedCategoryId.value === categoryId) {
      selectedCategoryId.value = otherCategoryId
    }
  }

  isDeletingCategory.value = false
}

// Open delete confirmation modal
function openDeleteConfirmModal(categoryId: bigint) {
  const category = categories.value.find(c => c.id === categoryId)
  if (category) {
    categoryToDelete.value = { id: categoryId, name: category.category_name }
    showDeleteConfirmModal.value = true
  }
}

// Open add category modal
function openAddCategoryModal() {
  newCategoryName.value = ''
  showAddCategoryModal.value = true
}

// Watch for modal open to fetch categories
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    await fetchCategories()
    await ensureOtherCategory()
  }
}, { immediate: true })

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

async function saveTheme() {
  if (!canSave.value) return

  isSaving.value = true

  // Generate a random 9-digit ID for the primary key
  const generatedId = Math.floor(100000000 + Math.random() * 900000000)

  const { data, error } = await supabase
    .from('flashcards')
    .insert([{
      id: generatedId,
      theme_name: themeName.value.trim(),
      data: words.value,
      creater_uid: authStore.user?.id ?? null,
      category_id: selectedCategoryId.value
    }])
    .select()

  if (!error && data) {
    emit('saved', data[0])
    resetAndClose()
  }
  isSaving.value = false
}

function resetAndClose() {
  themeName.value = ''
  words.value = []
  emit('close')
}
</script>

<template>
  <AnimatePresence>
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <!-- Backdrop -->
      <motion.div initial="{ opacity: 0 }" animate="{ opacity: 1 }" exit="{ opacity: 0 }" @click="resetAndClose"
        class="absolute inset-0 bg-sky-900/10 backdrop-blur-sm"></motion.div>

      <!-- Modal Content -->
      <motion.div initial="{ opacity: 0, scale: 0.9, y: 20 }" animate="{ opacity: 1, scale: 1, y: 0 }"
        exit="{ opacity: 0, scale: 0.9, y: 20 }"
        class="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="px-8 py-6 border-b border-coral-100 flex justify-between items-center bg-coral-50/50">
          <div>
            <h2 class="text-2xl font-serif text-coral-900 font-bold">New Collection</h2>
            <p class="text-coral-500 text-xs font-sans font-bold uppercase tracking-widest mt-1">Archive Entry Form</p>
          </div>
          <button @click="resetAndClose" class="text-coral-300 hover:text-coral-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">

          <!-- Category Selection -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="font-serif text-coral-900 font-bold">Category <span class="text-red-500">*</span></label>
            </div>
            <div class="flex gap-2">
              <select v-model="selectedCategoryId" required
                class="flex-1 bg-coral-50 border border-coral-300 rounded-2xl px-6 py-4 text-coral-900 text-lg font-serif focus:outline-none focus:ring-2 focus:ring-coral-200 transition-all appearance-none cursor-pointer"
                :class="{ 'border-red-400': !selectedCategoryId && themeName && words.length > 0 }">
                <option value="" disabled>Select a category...</option>
                <option v-for="cat in categories" :key="cat.id.toString()" :value="cat.id">{{ cat.category_name }}
                </option>
              </select>
              <motion.button :whileHover="{ scale: 1.05 }" :whileTap="{ scale: 0.95 }" @click="openAddCategoryModal"
                class="bg-mint-300 text-white p-4 rounded-2xl hover:bg-mint-400 transition-colors"
                title="Add new category">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </motion.button>
              <motion.button :whileHover="{ scale: 1.05 }" :whileTap="{ scale: 0.95 }"
                @click="selectedCategoryId && openDeleteConfirmModal(selectedCategoryId)"
                :disabled="!selectedCategoryId"
                class="bg-red-300 text-white p-4 rounded-2xl hover:bg-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Delete category">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                </svg>
              </motion.button>
            </div>
            <p v-if="!selectedCategoryId && themeName && words.length > 0" class="text-red-500 text-xs font-bold mt-1">
              Please select a category to continue
            </p>
          </div>

          <!-- Collection Title Input -->
          <div class="space-y-3">
            <label class="font-serif text-coral-900 font-bold">Collection Title<span
                class="text-red-500">*</span></label>
            <input v-model="themeName" type="text" placeholder="e.g., Medical Terminology"
              class="w-full bg-coral-50 border border-coral-300 rounded-2xl px-6 py-4 text-coral-900 text-xl font-serif placeholder:text-coral-300 focus:outline-none focus:ring-2 focus:ring-coral-200 transition-all" />
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <!-- Manual Entry -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="font-serif text-coral-900 font-bold">Single Entry</h3>
                <span class="text-[10px] font-bold uppercase tracking-widest text-coral-300">Manual Keying</span>
              </div>

              <div class="space-y-4 bg-coral-50/30 p-11 rounded-3xl border border-coral-300">
                <div class="space-y-3">
                  <input v-model="newWord.word" @keyup.enter="addManualWord" placeholder="Word (e.g., Ephemeral)"
                    class="w-full bg-white border border-coral-300 placeholder:text-coral-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-coral-200 transition-all" />
                  <div class="grid grid-cols-2 gap-3">
                    <input v-model="newWord.meaning" @keyup.enter="addManualWord" placeholder="Meaning (Optional)"
                      class="w-full bg-white border border-coral-300 placeholder:text-coral-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-coral-200 transition-all" />
                    <input v-model="newWord.pos" @keyup.enter="addManualWord" placeholder="POS (e.g., Adj)"
                      class="w-full bg-white border border-coral-300 placeholder:text-coral-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-coral-200 transition-all" />
                  </div>
                </div>

                <motion.button :whileHover="canAppend ? { scale: 1.02 } : {}"
                  :whileTap="canAppend ? { scale: 0.98 } : {}" @click="addManualWord" :disabled="!canAppend"
                  class="w-full bg-coral-300 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-coral-700/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  :class="canAppend ? 'hover:bg-coral-500' : ''">
                  Append to List
                </motion.button>
              </div>
            </div>

            <!-- Import Section -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="font-serif text-coral-900 font-bold">Batch Import</h3>
                <span class="text-[10px] font-bold uppercase tracking-widest text-coral-300">Excel / CSV Support</span>
              </div>

              <div @dragover.prevent="dragActive = true" @dragleave.prevent="dragActive = false" @drop="handleDrop"
                :class="dragActive ? 'border-mint-400 bg-mint-50/30' : 'border-coral-300 bg-coral-50/30'"
                class="relative border-2 border-dashed rounded-3xl p-5 flex flex-col items-center justify-center text-center transition-all min-h-[260px]">
                <div
                  class="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-coral-300 mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                  </svg>
                </div>
                <p class="font-serif text-coral-900 font-bold mb-2">Drag & Drop Spreadsheet</p>

                <label
                  class="cursor-pointer bg-white border border-coral-300 text-coral-700 font-bold px-6 py-3 rounded-xl hover:shadow-md transition-all">
                  Browse Files
                  <input type="file" class="hidden" @change="handleFileUpload" accept=".xlsx, .xls, .csv" />
                </label>
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div v-if="words.length > 0" class="space-y-6 pt-6 border-t border-coral-100">
            <div class="flex items-baseline justify-between">
              <h3 class="font-serif text-coral-900 font-bold">Registry Preview</h3>
              <span class="text-coral-400 font-sans text-xs font-bold">{{ words.length }} Cards Staged</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                <motion.div v-for="(word, index) in words" :key="index" initial="{ opacity: 0, x: -10 }"
                  animate="{ opacity: 1, x: 0 }" exit="{ opacity: 0, scale: 0.95 }"
                  class="group flex items-start justify-between bg-coral-50/50 border border-coral-100 p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-serif font-bold text-coral-900">{{ word.word }}</span>
                      <span v-if="word.pos"
                        class="px-2 py-0.5 bg-coral-800 text-white text-[8px] font-bold rounded-full uppercase tracking-widest">
                        {{ word.pos }}
                      </span>
                    </div>
                    <p class="text-coral-500 text-xs italic">{{ word.meaning || 'Details will auto-generate' }}</p>
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
        <div class="px-8 py-6 border-t border-coral-100 bg-white flex justify-end gap-4">
          <button @click="resetAndClose"
            class="px-8 py-3 text-coral-500 font-bold text-sm tracking-wide hover:text-coral-800 transition-colors">
            Cancel
          </button>
          <motion.button :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.98 }" @click="saveTheme"
            :disabled="!canSave || isSaving"
            class="bg-coral-300 text-white font-bold px-10 py-3 rounded-2xl hover:bg-coral-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-coral-900/10">
            {{ isSaving ? 'Archiving Collection...' : 'Create Collection' }}
          </motion.button>
        </div>
      </motion.div>

      <!-- Add Category Modal -->
      <AnimatePresence>
        <motion.div v-if="showAddCategoryModal" initial="{ opacity: 0 }" animate="{ opacity: 1 }" exit="{ opacity: 0 }"
          class="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showAddCategoryModal = false"></div>
          <motion.div initial="{ opacity: 0, scale: 0.9, y: 20 }" animate="{ opacity: 1, scale: 1, y: 0 }"
            exit="{ opacity: 0, scale: 0.9, y: 20 }"
            class="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-xl font-serif text-coral-900 font-bold">Add New Category</h3>
              <button @click="showAddCategoryModal = false"
                class="text-coral-300 hover:text-coral-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-bold text-coral-700 mb-2">Category Name</label>
                <input v-model="newCategoryName" type="text" placeholder="e.g., Science, History..."
                  @keyup.enter="addCategory"
                  class="w-full bg-coral-50 border border-coral-300 rounded-xl px-4 py-3 text-coral-900 focus:outline-none focus:ring-2 focus:ring-coral-200 transition-all" />
              </div>
              <div class="flex gap-3">
                <button @click="showAddCategoryModal = false"
                  class="flex-1 px-4 py-3 text-coral-500 font-bold hover:text-coral-800 transition-colors">
                  Cancel
                </button>
                <motion.button :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.98 }" @click="addCategory"
                  :disabled="!newCategoryName.trim()"
                  class="flex-1 bg-coral-300 text-white font-bold px-4 py-3 rounded-xl hover:bg-coral-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Add Category
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <!-- Delete Confirmation Modal -->
      <AnimatePresence>
        <motion.div v-if="showDeleteConfirmModal" initial="{ opacity: 0 }" animate="{ opacity: 1 }"
          exit="{ opacity: 0 }" class="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteConfirmModal = false"></div>
          <motion.div initial="{ opacity: 0, scale: 0.9, y: 20 }" animate="{ opacity: 1, scale: 1, y: 0 }"
            exit="{ opacity: 0, scale: 0.9, y: 20 }"
            class="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
            <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 class="text-2xl font-serif text-coral-900 font-bold mb-3">Delete Category?</h3>
            <p class="text-coral-500 text-sm mb-2 leading-relaxed">
              Are you sure you want to delete <span class="font-bold text-coral-700">"{{ categoryToDelete?.name
              }}"</span>?
            </p>
            <p class="text-coral-400 text-xs mb-8">
              All flashcards in this category will be moved to "Other".
            </p>
            <div class="flex gap-3">
              <button @click="showDeleteConfirmModal = false" :disabled="isDeletingCategory"
                class="flex-1 px-4 py-3 text-coral-500 font-bold rounded-xl hover:bg-coral-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <motion.button :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.98 }"
                @click="deleteCategory(categoryToDelete?.id ?? 0n); showDeleteConfirmModal = false"
                :disabled="isDeletingCategory"
                class="flex-1 bg-red-300 text-white font-bold px-4 py-3 rounded-xl hover:bg-red-400 transition-colors disabled:opacity-50">
                {{ isDeletingCategory ? 'Deleting...' : 'Delete' }}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
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
  background: #fda4af;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #f43f5e;
}
</style>