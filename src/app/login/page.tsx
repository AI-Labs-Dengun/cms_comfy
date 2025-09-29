"use client";

import React, { useState, useEffect, useRef } from "react";
import toast from 'react-hot-toast';
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import Image from 'next/image';
import LoadingSpinner from "@/components/LoadingSpinner";
import type { AuthResponse } from "@/types/auth";

export default function LoginPage() {
  const router = useRouter();
  const { 
    refreshAuth, 
    loading: authLoading, 
    user, 
    profile
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Mutex to prevent multiple submissions
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  // successMessage was only being set but never read which caused a build-time ESLint error.
  // Use a ref to keep the same behavior (loggable state) without triggering the unused-vars rule.
  const successMessageRef = useRef<string>("");
  
  // useRef to track whether we've already attempted to redirect
  const hasRedirected = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Retry configuration constants
  const MAX_RETRY_ATTEMPTS = 2;
  const RETRY_DELAYS = [1000, 2000]; // 1s, 2s

  // Function to determine whether an error is recoverable (network error)
  const isNetworkError = (error: unknown, code?: string): boolean => {
    const networkCodes = ['PERMISSION_CHECK_ERROR', 'SERVER_ERROR'];
    const networkMessages = ['erro de conexão', 'network', 'timeout', 'fetch'];
    
    if (code && networkCodes.includes(code)) return true;
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      const message = error.message.toLowerCase();
      return networkMessages.some(keyword => message.includes(keyword));
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 LoginPage - Iniciando processo de login...');
    
    // MUTEX: Prevent multiple submissions
    if (isSubmitting) {
      console.log('⚠️ LoginPage - Login já em andamento, ignorando nova submissão...');
      return;
    }
    
    setIsSubmitting(true);
    setIsLoading(true);
    setError("");
    setRetryCount(0); // Reset retry count
    setIsRetrying(false); // Reset retry state
    successMessageRef.current = "";
    hasRedirected.current = false; // Reset flag when attempting new login

    // Clear previous timeout if it exists
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
        setIsSubmitting(false); // Clear mutex in case of validation error
        setRetryCount(0); // Reset retry count in case of validation error
        setIsRetrying(false); // Reset retry state
        return;
      }

      // Function to attempt login with retries
      const attemptLogin = async (attempt: number = 0): Promise<AuthResponse | null> => {
        console.log(`🔑 LoginPage - Tentativa ${attempt + 1}/${MAX_RETRY_ATTEMPTS + 1} de login...`);
        
        if (attempt > 0) {
          setIsRetrying(true);
          setRetryCount(attempt);
          successMessageRef.current = `Tentativa ${attempt + 1}/${MAX_RETRY_ATTEMPTS + 1}...`;
          
              // Wait the configured delay before retrying
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1] || 2000));
        }
        
        try {
          // Firtst try CMS role
          console.log('🔑 LoginPage - Tentando login com role CMS...');
          let result = await AuthService.loginWithRole(email, password, 'cms');
          
          // If failed, try psychologist role
          if (!result.success) {
            console.log('🔑 LoginPage - CMS falhou, tentando login com role psicólogo...');
            result = await AuthService.loginWithRole(email, password, 'psicologo');
          }
          
          return result;
        } catch (error) {
          console.error(`❌ LoginPage - Erro na tentativa ${attempt + 1}:`, error);
          
          // Check if should retry
          if (attempt < MAX_RETRY_ATTEMPTS && isNetworkError(error)) {
            console.log(`🔄 LoginPage - Erro de rede detectado, tentando novamente em ${RETRY_DELAYS[attempt] / 1000}s...`);
            return attemptLogin(attempt + 1);
          }
          
          throw error;
        }
      };
      
  // Execute login with automatic retry
      const result = await attemptLogin();
      
  // Ensure a result was returned and handle it appropriately
      if (!result) {
        console.log('❌ LoginPage - Nenhum resultado retornado do attemptLogin');
        toast.error('Erro inesperado durante login');
        setError('Erro inesperado durante login');
        return;
      }
      
  // Check if the result indicates a network/AuthService error (retry at AuthService level)
      if (!result.success && (result.code === 'PERMISSION_CHECK_ERROR' || result.code === 'SERVER_ERROR') && retryCount < MAX_RETRY_ATTEMPTS) {
        console.log(`🔄 LoginPage - Erro de AuthService detectado (${result.code}), tentando retry...`);
        return attemptLogin(retryCount + 1);
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
        
        console.log('✅ LoginPage - Login bem-sucedido, atualizando contexto...');
        console.log('📊 LoginPage - User role:', result.user_role);
        
  // Force update of the authentication context (forceRefresh = true)
        await refreshAuth(true);
        
        // Redirect based on role with safety timeout
        if (!hasRedirected.current) {
          console.log('🔄 LoginPage - Redirecionamento imediato baseado no role...');
          hasRedirected.current = true;
          successMessageRef.current = 'Redirecionando...';
          
            // Set the route based on the user's role
          const redirectPath = result.user_role === 'psicologo' ? '/psicologos' : '/dashboard/create';
          console.log('🎯 LoginPage - Redirecionando para:', redirectPath);

          // Redirect using router
          router.replace(redirectPath);
          
          // Safety fallback
          redirectTimeoutRef.current = setTimeout(() => {
            if (window.location.pathname === '/login') {
              console.log('🔄 LoginPage - Usando fallback window.location...');
              window.location.href = redirectPath;
            }
          }, 1500);
        }
        
      } else {
          // LOGIN FAILED - show a specific error based on the returned code
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
        // Show error toast for login failures
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ LoginPage - Erro inesperado no login:', error);
      
      let errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      
      // Improving feedback based on retry attempts
      if (retryCount > 0) {
        errorMessage = `Falha após ${retryCount + 1} tentativas. Verifique sua conexão e tente novamente.`;
        console.log(`🔄 LoginPage - Falha após ${retryCount + 1} tentativas de retry`);
      }
      
      // Check if it was a network error to suggest a manual retry
      if (isNetworkError(error)) {
        errorMessage += ' (Erro de rede detectado)';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsSubmitting(false); // Clean up mutex always at the end
      setIsRetrying(false); // Clear retry state
      // Do not reset retryCount here to keep information for next manual attempt
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // If the app is initially loading
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

  // If redirecting
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
              disabled={isLoading || isSubmitting}
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
              disabled={isLoading || isSubmitting}
              autoComplete="current-password"
            />
          </div>

          {/* Retry Indicator */}
          {isRetrying && retryCount > 0 && (
            <div className="w-full mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <p className="text-blue-700 text-sm">
                  Problema de conexão detectado. Tentativa {retryCount + 1} de {MAX_RETRY_ATTEMPTS + 1}...
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-black text-white py-3 sm:py-3.5 rounded-lg font-medium hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-base sm:text-lg"
            disabled={isLoading || isSubmitting}
          >
            {(() => {
              if (isRetrying && retryCount > 0) {
                return `Tentativa ${retryCount + 1}/${MAX_RETRY_ATTEMPTS + 1}...`;
              }
              if (isLoading || isSubmitting) {
                return "A iniciar sessão...";
              }
              return "Iniciar Sessão";
            })()}
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
