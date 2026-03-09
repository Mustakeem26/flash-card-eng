import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  async function signUp(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
      })
      if (err) throw err
      user.value = data.user
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function signIn(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (err) throw err
      user.value = data.user
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signOut()
      if (err) throw err
      user.value = null
      router.push('/')
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function initialize() {
    // getUser is more secure than getSession as it validates with the server
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    user.value = supabaseUser
    
    supabase.auth.onAuthStateChange((event, session) => {
      user.value = session?.user ?? null
      
      // Proactive redirect on sign out or session loss
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        router.push('/')
      }
    })
    
    initialized.value = true
  }

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    initialize,
    initialized,
  }
})
