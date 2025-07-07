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

// Configurações otimizadas para o cliente browser
const browserConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'cms-comfy'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
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
    }
  }
) 