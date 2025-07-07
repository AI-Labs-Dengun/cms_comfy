"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";

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
  const [successMessage, setSuccessMessage] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  // UseRef para controlar se já tentou redirecionar
  const hasTriedRedirect = useRef(false);
  const redirectTimer = useRef<NodeJS.Timeout | null>(null);

  // Monitorar estado de autenticação e redirecionar quando apropriado
  useEffect(() => {
    console.log('🔍 LoginPage useEffect - Verificando condições:', {
      authLoading,
      isAuthenticated,
      canAccessCMS,
      userEmail: user?.email,
      userRole: profile?.user_role,
      authorized: profile?.authorized,
      authInfoSuccess: authInfo?.success,
      hasTriedRedirect: hasTriedRedirect.current,
      redirecting,
      timestamp: new Date().toISOString()
    });

    // Se está carregando, resetar o flag de redirecionamento e não fazer nada
    if (authLoading) {
      console.log('⏳ LoginPage - Ainda carregando, resetando flag e aguardando...');
      hasTriedRedirect.current = false;
      return;
    }

    // Verificações rigorosas antes de redirecionar
    const shouldRedirect = !authLoading && 
                          isAuthenticated && 
                          canAccessCMS && 
                          user && 
                          profile && 
                          profile.user_role === 'cms' && 
                          profile.authorized === true &&
                          authInfo?.success === true &&
                          !hasTriedRedirect.current && 
                          !redirecting;

    console.log('🧐 LoginPage - Análise de redirecionamento:', {
      shouldRedirect,
      condições: {
        notLoading: !authLoading,
        isAuthenticated,
        canAccessCMS,
        hasUser: !!user,
        hasProfile: !!profile,
        isCMSUser: profile?.user_role === 'cms',
        isAuthorized: profile?.authorized === true,
        authSuccess: authInfo?.success === true,
        notTriedYet: !hasTriedRedirect.current,
        notRedirecting: !redirecting
      }
    });

    // Se já está autenticado e tem acesso CMS, e ainda não tentou redirecionar
    if (shouldRedirect) {
      console.log('✅ LoginPage - TODAS as condições atendidas, redirecionando...');
      
      hasTriedRedirect.current = true;
      setRedirecting(true);
      setSuccessMessage('Já autenticado! Aguardando sincronização...');
      
      // Limpar timer anterior se existir
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
      
      // Delay maior para permitir sincronização entre middleware e React Context
      redirectTimer.current = setTimeout(() => {
        console.log('🔄 LoginPage - Executando redirecionamento após sincronização...');
        setSuccessMessage('Redirecionando para dashboard...');
        
        setTimeout(() => {
          router.replace('/dashboard/create');
          
          // Fallback de segurança
          setTimeout(() => {
            if (window.location.pathname === '/login') {
              console.log('🔄 LoginPage - Fallback: usando window.location...');
              window.location.href = '/dashboard/create';
            }
          }, 1000);
        }, 500);
      }, 1500); // Aumentado de 200ms para 1500ms
      
    } else {
      console.log('❌ LoginPage - Condições não atendidas, não redirecionando');
    }

    // Cleanup function
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
        redirectTimer.current = null;
      }
    };
  }, [authLoading, isAuthenticated, canAccessCMS]); // Dependências mínimas

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 LoginPage - Iniciando processo de login...');
    
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    setRedirecting(false);
    hasTriedRedirect.current = false; // Reset do flag ao tentar novo login

    try {
      // Tentar fazer login com role CMS
      console.log('🔑 LoginPage - Tentando login com role CMS...');
      const result = await AuthService.loginWithRole(email, password, 'cms');

      console.log('📝 LoginPage - Resultado do login:', result);

      if (result.success) {
        // Limpar erro e mostrar feedback positivo
        setError('');
        setSuccessMessage('Login bem-sucedido! Atualizando sessão...');
        
        console.log('✅ LoginPage - Login bem-sucedido, atualizando contexto...');
        
        // Aguardar processamento do Supabase Auth
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Forçar atualização do contexto de autenticação
        console.log('🔄 LoginPage - Chamando refreshAuth...');
        await refreshAuth();
        
        setSuccessMessage('Sessão atualizada! Redirecionando...');
        console.log('🔄 LoginPage - Preparando redirecionamento...');
        
        // Aguardar um pouco mais para sincronização e deixar o useEffect detectar
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Se por algum motivo o useEffect não detectou, fazer redirecionamento manual
        setTimeout(() => {
          if (!hasTriedRedirect.current) {
            console.log('🔄 LoginPage - Fallback manual: forçando redirecionamento...');
            hasTriedRedirect.current = true;
            setRedirecting(true);
            router.replace('/dashboard/create');
          }
        }, 1000);
        
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
          case 'INSUFFICIENT_PERMISSIONS':
            errorMessage = `Acesso negado. Este sistema é apenas para administradores (role CMS). Seu role atual: ${result.user_role || 'desconhecido'}`;
            break;
          case 'INVALID_CREDENTIALS':
            errorMessage = 'Email ou palavra-passe incorretos';
            break;
          case 'PERMISSION_CHECK_ERROR':
            errorMessage = 'Erro ao verificar permissões. Tente novamente.';
            break;
          default:
            errorMessage = result.error || 'Erro no login';
        }
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('❌ LoginPage - Erro inesperado no login:', error);
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  // Se está carregando inicialmente
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se está redirecionando
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Acesso autorizado! Redirecionando...</p>
          <p className="text-sm text-gray-400 mt-2">Bem-vindo, {profile?.name || user?.email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md flex flex-col items-center"
      >
        <div className="mb-8 flex flex-col items-center">
          <img src="/cms-logo.png" alt="Comfy Content Hub Logo" className="mb-2 w-28 h-auto mx-auto" />
        </div>
        <div className="mb-6 text-center text-sm text-gray-900">
          Inicie sessão para acessar o CMS
        </div>
        
        {error && (
          <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}
        
        <div className="w-full mb-4">
          <label className="block text-sm mb-1 text-gray-900" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Introduza o seu email"
            className="w-full border border-gray-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className="w-full mb-6">
          <label className="block text-sm mb-1 text-gray-900" htmlFor="password">
            Palavra-passe
          </label>
          <input
            id="password"
            type="password"
            placeholder="Introduza a sua palavra-passe"
            className="w-full border border-gray-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded font-medium hover:bg-gray-900 transition-colors disabled:opacity-60 cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? "A iniciar sessão..." : "Iniciar Sessão"}
        </button>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 mb-4">
            Apenas utilizadores com role &quot;CMS&quot; podem acessar este sistema
          </p>
          <p className="text-sm text-gray-600">
            Não tem uma conta?{' '}
            <a
              href="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Criar conta CMS
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
