import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  // Para rotas do dashboard, fazer apenas verificação básica de cookie
  if (pathname.startsWith('/dashboard')) {
    // Verificação rápida de cookies de autenticação
    const cookieStore = req.cookies
    const hasAuthCookie = cookieStore.get('sb-access-token') || 
                         cookieStore.get('supabase-auth-token') ||
                         cookieStore.toString().includes('sb-')
    
    if (!hasAuthCookie) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }
    
    // Não fazer verificações de sessão aqui - deixar para o AuthGuard
    // Isso reduz drasticamente o tempo de response do middleware
  }

  // Para login/signup, verificar se já está logado (verificação leve)
  if (pathname === '/login' || pathname === '/signup') {
    const cookieStore = req.cookies
    const hasAuthCookie = cookieStore.get('sb-access-token') || 
                         cookieStore.get('supabase-auth-token') ||
                         cookieStore.toString().includes('sb-')
    
    if (hasAuthCookie) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/dashboard/create'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup']
} 