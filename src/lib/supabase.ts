import { createBrowserClient, createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validação das variáveis de ambiente
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não está definida. Verifique seu arquivo .env.local')
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida. Verifique seu arquivo .env.local')
}

// Cliente browser-side usando @supabase/ssr (novo padrão)
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Cliente singleton para uso direto (compatibilidade com código existente)
export const supabase = createClient()

// Cliente server-side com service role (para chamadas administrativas)
export function createServerClientWithServiceRole() {
  return createServerClient(
    supabaseUrl,
    supabaseServiceRoleKey || supabaseAnonKey,
    {
      cookies: {
        get() {
          return undefined
        },
        set() {
          // Server-side admin client não precisa gerenciar cookies
        },
        remove() {
          // Server-side admin client não precisa gerenciar cookies
        },
      },
    }
  )
}

// Cliente admin para uso direto (compatibilidade com código existente)
export const supabaseAdmin = createServerClientWithServiceRole()

// Cache simples em memória para queries frequentes (apenas no cliente)
const queryCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export const getCachedQuery = (key: string) => {
  if (typeof window === 'undefined') return null
  
  const cached = queryCache.get(key)
  if (!cached) return null
  
  const isExpired = Date.now() - cached.timestamp > CACHE_TTL
  if (isExpired) {
    queryCache.delete(key)
    return null
  }
  
  return cached.data
}

export const setCachedQuery = (key: string, data: unknown) => {
  if (typeof window === 'undefined') return
  
  queryCache.set(key, {
    data,
    timestamp: Date.now()
  })
}

export const clearQueryCache = () => {
  if (typeof window === 'undefined') return
  queryCache.clear()
} 