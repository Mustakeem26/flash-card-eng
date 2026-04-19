import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { supabase } from '@/lib/supabaseClient'

export const useHistoryStore = defineStore('history', () => {
  const authStore = useAuthStore()

  // Structure: { [userId: string]: { history: number[], favorites: number[] } }
  const localData = ref<Record<string, { history: number[], favorites: number[] }>>({})

  const currentHistory = ref<number[]>([])
  const currentFavorites = ref<number[]>([])

  // Load from localStorage
  function loadData() {
    const saved = localStorage.getItem('flashcard_user_data')
    if (saved) {
      try {
        localData.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse local history data')
      }
    }
  }

  function saveData() {
    localStorage.setItem('flashcard_user_data', JSON.stringify(localData.value))
    
    // Persist to Supabase if logged in
    const uid = authStore.user?.id
    if (uid && localData.value[uid]) {
      supabase.auth.updateUser({
        data: {
          history: localData.value[uid].history,
          favorites: localData.value[uid].favorites
        }
      }).catch(err => {
        console.error('Failed to sync history/favorites to Supabase:', err)
      })
    }
  }

  // Sync state when user changes
  watch(() => authStore.user?.id, (newUid) => {
    if (newUid) {
      if (!localData.value[newUid]) {
        localData.value[newUid] = { history: [], favorites: [] }
      }
      
      // Load from user_metadata if it exists (this syncs from DB down to client on login/reload)
      const meta = authStore.user?.user_metadata
      if (meta && (meta.history || meta.favorites)) {
        localData.value[newUid].history = meta.history || localData.value[newUid].history
        localData.value[newUid].favorites = meta.favorites || localData.value[newUid].favorites
      }

      currentHistory.value = localData.value[newUid].history
      currentFavorites.value = localData.value[newUid].favorites
    } else {
      currentHistory.value = []
      currentFavorites.value = []
    }
  }, { immediate: true })

  loadData()

  function addToHistory(collectionId: number) {
    const uid = authStore.user?.id
    if (!uid) return // Do not track if not logged in

    if (!localData.value[uid]) {
      localData.value[uid] = { history: [], favorites: [] }
    }

    const history = localData.value[uid].history
    const index = history.indexOf(collectionId)
    if (index > -1) {
      history.splice(index, 1)
    }
    history.unshift(collectionId)

    if (history.length > 20) {
      history.pop()
    }

    localData.value[uid].history = history
    currentHistory.value = history
    saveData()
  }

  function toggleFavorite(collectionId: number): boolean {
    const uid = authStore.user?.id
    if (!uid) return false

    if (!localData.value[uid]) {
      localData.value[uid] = { history: [], favorites: [] }
    }

    const favorites = localData.value[uid].favorites
    const index = favorites.indexOf(collectionId)
    
    if (index > -1) {
      favorites.splice(index, 1)
    } else {
      if (favorites.length >= 3) {
        // Can only favorite max 3. User requested: "กดเป็น favorite ไว้ ได้มากที่สุด 3 collection และ collection ไหนกดใจไว้ก็จะแสดงบนสุด ตามลำดับ"
        // Let's remove the oldest one if they try to add a 4th
        favorites.pop()
      }
      favorites.unshift(collectionId)
    }

    localData.value[uid].favorites = favorites
    currentFavorites.value = favorites
    saveData()
    return true
  }

  function isFavorite(collectionId: number) {
    return currentFavorites.value.includes(collectionId)
  }

  return {
    addToHistory,
    toggleFavorite,
    isFavorite,
    currentHistory,
    currentFavorites
  }
})
