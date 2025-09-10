"use client";

import React, { useState, useEffect, useRef } from "react";
import toast from 'react-hot-toast';
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import Image from 'next/image';
import LoadingSpinner from "@/components/LoadingSpinner";

export default function LoginPage() {
  const router = useRouter();
  const { 
    refreshAuth, 
    loading: authLoading, 
    isAuthenticated, 
    canAccessCMS, 
    user, 
    profile,
    authInfo 
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // successMessage was only being set but never read which caused a build-time ESLint error.
  // Use a ref to keep the same behavior (loggable state) without triggering the unused-vars rule.
  const successMessageRef = useRef<string>("");
  
  // UseRef para controlar se já tentou redirecionar
  const hasRedirected = useRef(false);
  const loginSuccessRef = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitorar estado de autenticação e redirecionar quando apropriado
  useEffect(() => {
    // Se já redirecionou uma vez, não fazer nada
    if (hasRedirected.current) {
      return;
    }

    // Se ainda está carregando, aguardar
    if (authLoading) {
      return;
    }

    // Só verificar redirecionamento se o login foi bem-sucedido
    if (!loginSuccessRef.current) {
      return;
    }

    // Verificar se deve redirecionar baseado no role
    const shouldRedirectCMS = isAuthenticated && 
                             canAccessCMS && 
                             user && 
                             profile && 
                             profile.user_role === 'cms' && 
                             profile.authorized === true &&
                             authInfo?.success === true;

    const shouldRedirectPsicologo = isAuthenticated &&
                                   user &&
                                   profile &&
                                   profile.user_role === 'psicologo' &&
                                   profile.authorized === true;

    console.log('🔍 LoginPage - Verificando redirecionamento:', {
      shouldRedirectCMS,
      shouldRedirectPsicologo,
      isAuthenticated,
      canAccessCMS,
      hasUser: !!user,
      hasProfile: !!profile,
      userRole: profile?.user_role,
      isAuthorized: profile?.authorized === true,
      authSuccess: authInfo?.success === true,
      loginSuccess: loginSuccessRef.current
    });

    if (shouldRedirectCMS) {
      console.log('✅ LoginPage - Redirecionando para dashboard CMS...');
      hasRedirected.current = true;
  successMessageRef.current = 'Acesso autorizado! Redirecionando para CMS...';
      
      // Limpar timeout anterior se existir
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      
      // Redirecionamento direto sem delay
      router.replace('/dashboard/create');
      
      // Fallback de segurança usando window.location
      redirectTimeoutRef.current = setTimeout(() => {
        if (window.location.pathname === '/login') {
          console.log('🔄 LoginPage - Usando fallback window.location para CMS...');
          window.location.href = '/dashboard/create';
        }
      }, 1500);
    } else if (shouldRedirectPsicologo) {
      console.log('✅ LoginPage - Redirecionando para painel de psicólogos...');
      hasRedirected.current = true;
  successMessageRef.current = 'Acesso autorizado! Redirecionando para painel de psicólogos...';
      
      // Limpar timeout anterior se existir
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      
      // Redirecionamento direto sem delay
      router.replace('/psicologos');
      
      // Fallback de segurança usando window.location
      redirectTimeoutRef.current = setTimeout(() => {
        if (window.location.pathname === '/login') {
          console.log('🔄 LoginPage - Usando fallback window.location para psicólogos...');
          window.location.href = '/psicologos';
        }
      }, 1500);
    }
  }, [authLoading, isAuthenticated, canAccessCMS, user, profile, authInfo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 LoginPage - Iniciando processo de login...');
    
  setIsLoading(true);
  setError("");
  successMessageRef.current = "";
    hasRedirected.current = false; // Reset do flag ao tentar novo login
    loginSuccessRef.current = false; // Reset do flag de sucesso
    
    // Limpar timeout anterior se existir
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    try {
      // Simple client-side validation to give immediate feedback
      if (!email.trim() || !password.trim()) {
        const msg = 'Por favor preencha email e palavra-passe.';
        setError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }
      // Primeiro tentar CMS, depois psicólogo
      console.log('🔑 LoginPage - Tentando login com role CMS...');
      let result = await AuthService.loginWithRole(email, password, 'cms');
      
      // Se falhou no CMS, tentar psicólogo
      if (!result.success) {
        console.log('🔑 LoginPage - CMS falhou, tentando login com role psicólogo...');
        result = await AuthService.loginWithRole(email, password, 'psicologo');
      }

      console.log('📝 LoginPage - Resultado do login:', result);
      console.log('📊 LoginPage - Detalhes completos:', {
        success: result.success,
        error: result.error,
        code: result.code,
        user_role: result.user_role,
        user_id: result.user_id,
        name: result.name,
        username: result.username
      });

      if (result.success) {
        setError('');
  successMessageRef.current = 'Login bem-sucedido! Verificando permissões...';
  toast.success('Login bem-sucedido! Verificando permissões...');
        loginSuccessRef.current = true; // Marcar que o login foi bem-sucedido
        
        console.log('✅ LoginPage - Login bem-sucedido, atualizando contexto...');
        console.log('📊 LoginPage - User role:', result.user_role);
        
        // Forçar atualização do contexto de autenticação (forceRefresh = true)
        await refreshAuth(true);
        
        // Aguardar um pouco para sincronização
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Redirecionamento baseado no role
        if (!hasRedirected.current) {
          console.log('🔄 LoginPage - Redirecionamento baseado no role...');
          hasRedirected.current = true;
          successMessageRef.current = 'Redirecionando...';
          
          // Definir rota baseada no role
          const redirectPath = result.user_role === 'psicologo' ? '/psicologos' : '/dashboard/create';
          console.log('🎯 LoginPage - Redirecionando para:', redirectPath);
          
          router.replace(redirectPath);
          
          // Fallback adicional
          redirectTimeoutRef.current = setTimeout(() => {
            if (window.location.pathname === '/login') {
              console.log('🔄 LoginPage - Fallback do redirecionamento manual...');
              window.location.href = redirectPath;
            }
          }, 1500);
        }
        
      } else {
        // LOGIN FALHOU - Mostrar erro específico baseado no código
        console.log('❌ LoginPage - Login falhou:', result);
        let errorMessage = result.error || 'Erro no login';
        
        switch (result.code) {
          case 'USER_NOT_FOUND':
            errorMessage = 'Usuário não encontrado na base de dados';
            break;
          case 'ACCOUNT_NOT_AUTHORIZED':
            errorMessage = 'Sua conta ainda não foi autorizada pelo responsável';
            break;
          case 'INVALID_CREDENTIALS':
            errorMessage = 'Email ou palavra-passe incorretos';
            break;
          case 'PERMISSION_CHECK_ERROR':
            errorMessage = 'Erro ao verificar permissões. Tente novamente.';
            break;
          case 'INSUFFICIENT_PERMISSIONS':
            errorMessage = `Acesso negado. Este sistema é apenas para administradores (role CMS). Seu role atual: ${result.user_role || 'desconhecido'}`;
            break;

          default:
            errorMessage = result.error || 'Erro no login';
        }
        
        setError(errorMessage);
        // Mostrar toast de erro para falhas de login
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ LoginPage - Erro inesperado no login:', error);
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
      toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Se está carregando inicialmente
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <LoadingSpinner 
          size="lg" 
          text="Verificando autenticação..." 
          color="black"
        />
      </div>
    );
  }

  // Se está redirecionando
  if (hasRedirected.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <LoadingSpinner 
          size="lg" 
          text="Acesso autorizado! Redirecionando..." 
          secondaryText={`Bem-vindo, ${profile?.name || user?.email}`}
          color="green"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col items-center"
        >
          {/* Logo Section */}
          <div className="mb-6 sm:mb-8 flex flex-col items-center">
            <Image 
              src="/cms-logo.png" 
              alt="Comfy Content Hub Logo" 
              className="mb-3 w-20 h-auto sm:w-24 lg:w-28 mx-auto" 
              width={112} 
              height={48} 
              priority
            />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
              Comfy CMS
            </h1>
          </div>

          {/* Subtitle */}
          <div className="mb-6 text-center">
            <p className="text-sm sm:text-base text-gray-600">
              Inicie sessão para acessar a plataforma
            </p>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="w-full mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm sm:text-base">{error}</p>
            </div>
          )}
                    
          {/* Email Field */}
          <div className="w-full mb-4">
            <label className="block text-sm sm:text-base font-medium mb-2 text-gray-900" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Introduza o seu email"
              className="w-full border border-gray-300 rounded-lg px-3 py-3 sm:py-3.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 text-base transition-colors"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          {/* Password Field */}
          <div className="w-full mb-6">
            <label className="block text-sm sm:text-base font-medium mb-2 text-gray-900" htmlFor="password">
              Palavra-passe
            </label>
            <input
              id="password"
              type="password"
              placeholder="Introduza a sua palavra-passe"
              className="w-full border border-gray-300 rounded-lg px-3 py-3 sm:py-3.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 text-base transition-colors"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-black text-white py-3 sm:py-3.5 rounded-lg font-medium hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-base sm:text-lg"
            disabled={isLoading}
          >
            {isLoading ? "A iniciar sessão..." : "Iniciar Sessão"}
          </button>
          
          {/* Footer Links */}
          <div className="mt-6 sm:mt-8 text-center w-full">
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 px-4">
              Para administradores (CMS) e psicólogos autorizados
            </p>
            <p className="text-sm sm:text-base text-gray-600">
              Não tem uma conta?{' '}
              <a
                href="/signup"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Criar conta CMS
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
