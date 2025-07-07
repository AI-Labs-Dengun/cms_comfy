import { createClient } from '@supabase/supabase-js'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

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

// Configurações otimizadas para o cliente browser com foco em performance
const browserConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Reduzir intervalo de refresh para melhor UX
    refreshThreshold: 30, // segundos antes do token expirar
  },
  global: {
    headers: {
      'X-Client-Info': 'cms-comfy'
    }
  },
  // Desabilitar realtime se não usado para melhor performance
  realtime: {
    params: {
      eventsPerSecond: 2, // Reduzido para economizar recursos
    }
  },
  // Cache de queries para melhor performance
  db: {
    schema: 'public'
  }
}

// Cliente browser-side para autenticação (compatível com middleware)
export const supabase = createPagesBrowserClient({
  supabaseUrl,
  supabaseKey: supabaseAnonKey,
  options: browserConfig
})

// Cliente server-side com service role (para chamadas de funções administrativas)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey, // Fallback para anon key se service role não estiver definida
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'X-Client-Info': 'cms-comfy-admin'
      }
    },
    // Configurações otimizadas para server-side
    db: {
      schema: 'public'
    }
  }
)

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