"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { 
    loading: authLoading, 
    isAuthenticated, 
    canAccessCMS, 
    user, 
    profile,
    authInfo,
    refreshAuth
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

    // Se está carregando, aguardar
    if (authLoading) {
      console.log('⏳ LoginPage - Ainda carregando, aguardando...');
      return;
    }

    // Verificação simplificada - apenas verificar se está autenticado e tem acesso CMS
    const shouldRedirect = !authLoading && 
                          isAuthenticated && 
                          canAccessCMS && 
                          !hasTriedRedirect.current && 
                          !redirecting;

    console.log('🧐 LoginPage - Análise de redirecionamento:', {
      shouldRedirect,
      condições: {
        notLoading: !authLoading,
        isAuthenticated,
        canAccessCMS,
        notTriedYet: !hasTriedRedirect.current,
        notRedirecting: !redirecting
      }
    });

    // Se está autenticado e tem acesso CMS, redirecionar
    if (shouldRedirect) {
      console.log('✅ LoginPage - Condições atendidas, redirecionando...');
      
      hasTriedRedirect.current = true;
      setRedirecting(true);
      setSuccessMessage('Redirecionando...');
      
      // Limpar timer anterior se existir
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
      
      // Redirecionamento mais direto
      redirectTimer.current = setTimeout(() => {
        console.log('🔄 LoginPage - Executando redirecionamento...');
        router.replace('/');
        
        // Fallback de segurança após 2 segundos
        setTimeout(() => {
          if (window.location.pathname === '/login') {
            console.log('🔄 LoginPage - Fallback: usando window.location...');
            window.location.href = '/';
          }
        }, 2000);
      }, 500);
      
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
  }, [authLoading, isAuthenticated, canAccessCMS, redirecting, router]);

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
        
        // Forçar atualização do contexto de autenticação
        try {
          await refreshAuth();
          console.log('✅ LoginPage - Contexto atualizado com sucesso');
        } catch (error) {
          console.error('❌ LoginPage - Erro ao atualizar contexto:', error);
        }
        
        setSuccessMessage('Redirecionando...');
        
        // Redirecionamento com múltiplas tentativas
        const redirectToHome = () => {
          console.log('🔄 LoginPage - Tentando redirecionamento...');
          
          // Tentativa 1: router.replace
          router.replace('/');
          
          // Tentativa 2: window.location após 1 segundo
          setTimeout(() => {
            if (window.location.pathname === '/login') {
              console.log('🔄 LoginPage - Fallback 1: usando window.location...');
              window.location.href = '/';
            }
          }, 1000);
          
          // Tentativa 3: window.location.replace após 2 segundos
          setTimeout(() => {
            if (window.location.pathname === '/login') {
              console.log('🔄 LoginPage - Fallback 2: usando window.location.replace...');
              window.location.replace('/');
            }
          }, 2000);
        };
        
        // Executar redirecionamento após 500ms
        setTimeout(redirectToHome, 500);
        
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
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
          <p className="text-gray-600 text-center">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se está redirecionando
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600 text-center">Acesso autorizado! Redirecionando...</p>
          <p className="text-sm text-gray-400 mt-2 text-center">Bem-vindo, {profile?.name || user?.email}</p>
        </div>
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
    Inicie sessão para acessar o CMS
  </p>
</div>

{/* Success Message */}
{successMessage && (
  <div className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
    <p className="text-green-700 text-sm">{successMessage}</p>
    {successMessage.includes('Redirecionando') && (
      <button
        type="button"
        onClick={() => window.location.href = '/'}
        className="mt-2 w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 transition-colors"
      >
        Clique aqui se não foi redirecionado automaticamente
      </button>
    )}
  </div>
)}
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="w-full mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm sm:text-base">{error}</p>
            </div>
          )}
          
          {/* Success Message */}
          {successMessage && (
            <div className="w-full mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm sm:text-base">{successMessage}</p>
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
              Apenas utilizadores com role &quot;CMS&quot; podem acessar este sistema
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
