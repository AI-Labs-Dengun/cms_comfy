import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Criar o cliente middleware com configuração adequada
  const supabase = createMiddlewareClient({ req, res })

  // Verificar se a rota está sendo acessada
  const { pathname } = req.nextUrl

  // Proteger rotas do dashboard
  if (pathname.startsWith('/dashboard')) {
    // Verificação rápida de cookies de autenticação primeiro
    const cookies = req.cookies.toString();
    const hasAuthCookie = cookies.includes('sb-') || cookies.includes('supabase');
    
    if (!hasAuthCookie) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }
    
    // Verificação simples de sessão (sem verificação de role)
    // O AuthGuard fará a verificação completa de permissões usando cache
    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession()

      // Se não há sessão válida, redirecionar para login
      if (sessionError || !session) {
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        return NextResponse.redirect(redirectUrl)
      }

      // Não fazer verificação de role aqui - deixar para o AuthGuard
      // que usa cache e é mais eficiente
      
    } catch {
      // Em caso de erro de rede, permitir acesso e deixar o AuthGuard lidar
      // Isso evita loops de redirecionamento em problemas de conectividade
    }
  }

  // Redirecionar usuários logados que tentam acessar a página de login ou signup
  if (pathname === '/login' || pathname === '/signup') {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/dashboard/create'
        return NextResponse.redirect(redirectUrl)
      }
    } catch {
      // Em caso de erro, permitir acesso às páginas de login/signup
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup']
} 