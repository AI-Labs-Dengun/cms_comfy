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
    // Verificar se há cookies de autenticação primeiro
    const cookies = req.cookies.toString();
    const hasAuthCookie = cookies.includes('sb-') || cookies.includes('supabase');
    
    if (!hasAuthCookie) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }
    
    let session;
    try {
      const {
        data: { session: sessionData },
        error: sessionError
      } = await supabase.auth.getSession()

      session = sessionData;
      
      if (sessionError) {
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        return NextResponse.redirect(redirectUrl)
      }

      // Se não há sessão, redirecionar para login
      if (!session) {
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        return NextResponse.redirect(redirectUrl)
      }
    } catch {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    // Verificação adicional de role usando a função do banco
    // Apenas se a sessão existe e tem email
    if (session?.user?.email) {
      try {
        const { data: roleCheck } = await supabase.rpc('can_user_login_with_role', {
          user_email: session.user.email,
          required_role: 'cms'
        })

        // Se o usuário não tem acesso CMS, fazer logout e redirecionar
        if (!roleCheck?.success) {
          await supabase.auth.signOut()
          const redirectUrl = req.nextUrl.clone()
          redirectUrl.pathname = '/login'
          return NextResponse.redirect(redirectUrl)
        }
              } catch {
          // Em caso de erro, permitir acesso e deixar o AuthGuard fazer a verificação
          // Isso evita loops de redirecionamento
        }
    }
  }

  // Redirecionar usuários logados que tentam acessar a página de login ou signup
  if (pathname === '/login' || pathname === '/signup') {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
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