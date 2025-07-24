import { useState, useEffect, useCallback, useRef } from 'react'
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

  const lastCheckRef = useRef<number>(0)
  const isCheckingRef = useRef<boolean>(false)

  const checkUser = useCallback(async (forceRefresh: boolean = false) => {
    // Evitar verificações muito frequentes
    const now = Date.now()
    const timeSinceLastCheck = now - lastCheckRef.current
    
    if (!forceRefresh && timeSinceLastCheck < 15000) { // 15 segundos
      console.log('⏭️ useAuth - Verificação recente, pulando...')
      return
    }

    if (isCheckingRef.current) {
      console.log('⏳ useAuth - Verificação já em andamento...')
      return
    }

    isCheckingRef.current = true
    lastCheckRef.current = now

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
    } finally {
      isCheckingRef.current = false
    }
  }, [])

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

  useEffect(() => {
    // Verificar sessão atual
    checkUser(true)

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

    // Listener para visibilidade da página - otimizado
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Só verificar se a página ficou oculta por mais de 30 segundos
        const timeHidden = Date.now() - lastCheckRef.current
        if (timeHidden > 30000) {
          console.log('👁️ useAuth - Página visível novamente após', Math.round(timeHidden / 1000), 'segundos')
          checkUser(false) // Não forçar refresh
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkUser])

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
    refetch: () => checkUser(true)
  }
} 