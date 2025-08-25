import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types/auth'

export interface Psicologo {
  id: string
  name: string
  username: string
  avatar_path: string
  guardian_email: string
  user_role: 'psicologo'
  authorized: boolean
  is_online: boolean
  last_seen?: string
  created_at: string
  updated_at: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

// Função para verificar se o usuário atual é um psicólogo autorizado
export async function checkPsicologoAccess(): Promise<ApiResponse<{ hasAccess: boolean; profile?: UserProfile }>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'Perfil não encontrado'
      }
    }

    // Verificar se é psicólogo e está autorizado
    const hasAccess = profile.user_role === 'psicologo' && profile.authorized === true

    return {
      success: true,
      data: {
        hasAccess,
        profile: profile as UserProfile
      }
    }

  } catch (error) {
    console.error('Erro ao verificar acesso:', error)
    return {
      success: false,
      error: 'Erro ao verificar permissões'
    }
  }
}

// Função para buscar todos os psicólogos (online e offline)
export async function getAllPsicologos(): Promise<ApiResponse<Psicologo[]>> {
  try {
    // Primeiro verificar se o usuário tem acesso
    const accessCheck = await checkPsicologoAccess()
    if (!accessCheck.success || !accessCheck.data?.hasAccess) {
      return {
        success: false,
        error: 'Acesso negado. Apenas psicólogos autorizados podem visualizar esta lista.'
      }
    }

    // Buscar todos os psicólogos com informações de última atividade
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        last_seen:updated_at
      `)
      .eq('user_role', 'psicologo')
      .order('is_online', { ascending: false }) // Online primeiro
      .order('name', { ascending: true }) // Depois por nome

    if (error) {
      console.error('Erro ao buscar psicólogos:', error)
      return {
        success: false,
        error: 'Erro ao carregar lista de psicólogos: ' + error.message
      }
    }

    // Filtrar apenas psicólogos autorizados
    const psicologosAutorizados = data?.filter(p => p.authorized === true) || []

    return {
      success: true,
      data: psicologosAutorizados as Psicologo[]
    }

  } catch (error) {
    console.error('Erro inesperado ao buscar psicólogos:', error)
    return {
      success: false,
      error: 'Erro inesperado ao carregar psicólogos'
    }
  }
}

// Função para buscar apenas psicólogos online
export async function getOnlinePsicologos(): Promise<ApiResponse<Psicologo[]>> {
  try {
    // Primeiro verificar se o usuário tem acesso
    const accessCheck = await checkPsicologoAccess()
    if (!accessCheck.success || !accessCheck.data?.hasAccess) {
      return {
        success: false,
        error: 'Acesso negado. Apenas psicólogos autorizados podem visualizar esta lista.'
      }
    }

    // Buscar psicólogos online
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_role', 'psicologo')
      .eq('is_online', true)
      .eq('authorized', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar psicólogos online:', error)
      return {
        success: false,
        error: 'Erro ao carregar psicólogos online: ' + error.message
      }
    }

    return {
      success: true,
      data: data as Psicologo[]
    }

  } catch (error) {
    console.error('Erro inesperado ao buscar psicólogos online:', error)
    return {
      success: false,
      error: 'Erro inesperado ao carregar psicólogos online'
    }
  }
}

// Função para buscar apenas psicólogos offline
export async function getOfflinePsicologos(): Promise<ApiResponse<Psicologo[]>> {
  try {
    // Primeiro verificar se o usuário tem acesso
    const accessCheck = await checkPsicologoAccess()
    if (!accessCheck.success || !accessCheck.data?.hasAccess) {
      return {
        success: false,
        error: 'Acesso negado. Apenas psicólogos autorizados podem visualizar esta lista.'
      }
    }

    // Buscar psicólogos offline
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_role', 'psicologo')
      .eq('is_online', false)
      .eq('authorized', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erro ao buscar psicólogos offline:', error)
      return {
        success: false,
        error: 'Erro ao carregar psicólogos offline: ' + error.message
      }
    }

    return {
      success: true,
      data: data as Psicologo[]
    }

  } catch (error) {
    console.error('Erro inesperado ao buscar psicólogos offline:', error)
    return {
      success: false,
      error: 'Erro inesperado ao carregar psicólogos offline'
    }
  }
}
