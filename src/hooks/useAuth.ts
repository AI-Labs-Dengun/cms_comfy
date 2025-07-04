import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  name: string
  username: string
  user_role: 'app' | 'cms'
  authorized: boolean | null
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    // Verificar sessão atual
    checkUser()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: null
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        setAuthState(prev => ({ ...prev, error: error.message, loading: false }))
        return
      }

      if (user) {
        await loadUserProfile(user)
      } else {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          error: null
        })
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error)
      setAuthState(prev => ({ 
        ...prev, 
        error: 'Erro ao verificar autenticação', 
        loading: false 
      }))
    }
  }

  const loadUserProfile = async (user: User) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, username, user_role, authorized')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Erro ao carregar perfil:', error)
        setAuthState({
          user,
          profile: null,
          loading: false,
          error: 'Erro ao carregar perfil do usuário'
        })
        return
      }

      setAuthState({
        user,
        profile: profile as UserProfile,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Erro inesperado ao carregar perfil:', error)
      setAuthState({
        user,
        profile: null,
        loading: false,
        error: 'Erro inesperado ao carregar perfil'
      })
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Erro ao fazer logout:', error)
        return { success: false, error: error.message }
      }
      return { success: true }
    } catch (error) {
      console.error('Erro inesperado ao fazer logout:', error)
      return { success: false, error: 'Erro inesperado ao fazer logout' }
    }
  }

  // Verificações de permissão
  const isAuthenticated = authState.user !== null
  const isAuthorized = authState.profile?.authorized === true
  const isCMSUser = authState.profile?.user_role === 'cms'
  const canAccessCMS = isAuthenticated && isAuthorized && isCMSUser

  return {
    ...authState,
    isAuthenticated,
    isAuthorized,
    isCMSUser,
    canAccessCMS,
    signOut,
    refetch: checkUser
  }
} 