import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  console.log('🛡️ Middleware executando para:', pathname);

  // Para login/signup/home, SEMPRE permitir acesso (mesmo sem sessão)
  if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
    console.log('🔍 Rota de autenticação/home - acesso sempre permitido');
    return NextResponse.next();
  }

  // Para rotas do dashboard (CMS), fazer verificação mais robusta
  if (pathname.startsWith('/dashboard')) {
    console.log('🔍 Verificando acesso ao dashboard...');
    
    let response = NextResponse.next({
      request: {
        headers: req.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            req.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            req.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      console.log('🔍 Resultado da verificação Supabase:', {
        hasUser: !!user,
        userEmail: user?.email,
        error: error?.message,
        pathname
      });

      // Se não há sessão alguma, redirecionar para login
      if (error && error.message === 'Auth session missing!') {
        console.log('❌ Nenhuma sessão de auth encontrada, redirecionando para login');
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        return NextResponse.redirect(redirectUrl)
      }

      // Se há usuário autenticado, permitir acesso e deixar AuthGuard fazer verificação detalhada
      if (user) {
        console.log('✅ Usuário autenticado encontrado, permitindo acesso - AuthGuard fará verificação detalhada');
        return response
      }

      // Se não há usuário mas também não há erro de sessão, pode ser um estado intermediário
      // Permitir acesso e deixar AuthGuard lidar
      console.log('⚠️ Estado intermediário detectado, permitindo acesso - AuthGuard verificará');
      return response

    } catch (error) {
      console.error('❌ Erro inesperado no middleware:', error);
      // Em caso de erro inesperado, permitir acesso e deixar AuthGuard lidar
      console.log('⚠️ Permitindo acesso devido a erro inesperado - AuthGuard verificará');
      return response
    }
  }

  // Para rotas do painel de psicólogos, fazer verificação específica
  if (pathname.startsWith('/psicologos')) {
    console.log('🔍 Verificando acesso ao painel de psicólogos...');
    
    let response = NextResponse.next({
      request: {
        headers: req.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            req.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            req.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      console.log('🔍 Resultado da verificação Supabase (psicólogos):', {
        hasUser: !!user,
        userEmail: user?.email,
        error: error?.message,
        pathname
      });

      // Se não há sessão alguma, redirecionar para login
      if (error && error.message === 'Auth session missing!') {
        console.log('❌ Nenhuma sessão de auth encontrada, redirecionando para login');
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/login'
        return NextResponse.redirect(redirectUrl)
      }

      // Se há usuário autenticado, permitir acesso e deixar AuthGuard fazer verificação detalhada
      if (user) {
        console.log('✅ Usuário autenticado encontrado, permitindo acesso - AuthGuard fará verificação detalhada');
        return response
      }

      // Se não há usuário mas também não há erro de sessão, pode ser um estado intermediário
      // Permitir acesso e deixar AuthGuard lidar
      console.log('⚠️ Estado intermediário detectado, permitindo acesso - AuthGuard verificará');
      return response

    } catch (error) {
      console.error('❌ Erro inesperado no middleware (psicólogos):', error);
      // Em caso de erro inesperado, permitir acesso e deixar AuthGuard lidar
      console.log('⚠️ Permitindo acesso devido a erro inesperado - AuthGuard verificará');
      return response
    }
  }

  console.log('✅ Middleware concluído, permitindo requisição');
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
} 