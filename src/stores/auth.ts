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
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
    
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
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
