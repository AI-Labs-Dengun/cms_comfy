'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'cms' | 'app' | 'psicologo';
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  requiredRole = 'cms',
  redirectTo = '/login' 
}: AuthGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  
  // Constantes de configuração
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  
  const { 
    authInfo, 
    loading, 
    error, 
    isAuthenticated, 
    canAccessCMS,
    checkRoleAccess,
    user,
    profile,
    isLoggingOut
  } = useAuth();

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let retryTimeoutId: NodeJS.Timeout;

    const handleAuthCheck = async () => {
      console.log('🛡️ AuthGuard - Iniciando verificação de acesso...', {
        attempt: verificationAttempts + 1,
        maxRetries: MAX_RETRIES,
        isAuthenticated,
        canAccessCMS,
        loading,
        hasUser: !!user,
        hasProfile: !!profile,
        isLoggingOut
      });
      
      // PRIORIDADE MÁXIMA: Se está fazendo logout, não interferir
      if (isLoggingOut) {
        console.log('🚪 AuthGuard - Logout em andamento, não verificando acesso...');
        return; // Permitir que o logout aconteça sem interferência
      }
      
      // OTIMIZAÇÃO: Se já está autenticado e autorizado, PASSAR DIRETO
      if (isAuthenticated && canAccessCMS && user && profile) {
        console.log('✅ AuthGuard - Usuário já autenticado e autorizado - PASSANDO DIRETO');
        setIsChecking(false);
        setAccessDenied(false);
        setErrorMessage('');
        return;
      }
      
      // Se ainda está carregando, aguardar
      if (loading) {
        console.log('⏳ AuthGuard - Aguardando carregamento do contexto...');
        setIsChecking(true);
        return;
      }

      // Marcar que o carregamento inicial foi concluído
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }

      // Timeout de segurança aumentado para dar tempo após login
      timeoutId = setTimeout(() => {
        if (mounted && isChecking) {
          console.warn('⚠️ AuthGuard - Timeout na verificação após 8 segundos...');
          
          // Em produção, ser mais permissivo com timeouts
          if (process.env.NODE_ENV === 'production' && isAuthenticated) {
            console.log('🔓 AuthGuard - Modo produção: permitindo acesso para usuário autenticado');
            setIsChecking(false);
            clearTimeout(timeoutId);
            return;
          }
          
          setAccessDenied(true);
          setErrorMessage('Verificação de acesso demorou muito. Redirecionando...');
          setTimeout(() => router.push(redirectTo), 1000);
        }
      }, 8000); // Aumentado de 1.5s para 8s

      try {
        // Verificar autenticação básica
        if (!isAuthenticated) {
          console.log('❌ AuthGuard - Usuário não autenticado');
          
          // Se não está autenticado mas ainda não tentamos o suficiente, aguardar
          if (verificationAttempts < MAX_RETRIES) {
            console.log(`⏳ AuthGuard - Aguardando autenticação... (tentativa ${verificationAttempts + 1}/${MAX_RETRIES + 1})`);
            
            retryTimeoutId = setTimeout(() => {
              if (mounted) {
                setVerificationAttempts(prev => prev + 1);
                handleAuthCheck();
              }
            }, RETRY_DELAY);
            return;
          }
          
          // Só mostrar acesso negado após todas as tentativas
          if (mounted) {
            setAccessDenied(true);
            setErrorMessage('Você precisa fazer login para acessar esta área.');
            setTimeout(() => router.push(redirectTo), 500);
          }
          return;
        }

        // Se o usuário está autenticado, verificar acesso específico
        if (requiredRole === 'cms') {
          console.log('🔍 AuthGuard - Verificando acesso CMS...');
          
          // Se ainda não temos informações completas mas o usuário está autenticado,
          // ser mais permissivo e aguardar mais tempo
          if (!canAccessCMS && isAuthenticated && verificationAttempts < MAX_RETRIES) {
            console.log(`⏳ AuthGuard - Usuário autenticado mas aguardando dados CMS completos... (tentativa ${verificationAttempts + 1}/${MAX_RETRIES + 1})`);
            
            // Aguardar mais tempo para dados completos
            retryTimeoutId = setTimeout(() => {
              if (mounted) {
                setVerificationAttempts(prev => prev + 1);
                handleAuthCheck();
              }
            }, RETRY_DELAY);
            return;
          }
          
          // OTIMIZAÇÃO: Se usuário está autenticado mas não temos canAccessCMS após todas tentativas,
          // ainda assim permitir acesso se temos dados básicos válidos (user + profile)
          if (!canAccessCMS && isAuthenticated && user && profile && profile.authorized === true && profile.user_role === 'cms') {
            console.log('✅ AuthGuard - Permitindo acesso baseado em dados básicos válidos (fallback)');
            setIsChecking(false);
            clearTimeout(timeoutId);
            return;
          }
          
          if (!canAccessCMS) {
            console.log('❌ AuthGuard - Acesso CMS negado após todas as tentativas:', {
              canAccessCMS,
              authInfo,
              isAuthenticated,
              verificationAttempts
            });
            
            if (mounted) {
              setAccessDenied(true);
              
              // Mensagem específica baseada no problema
              let message = 'Acesso negado.';
              if (authInfo?.error) {
                message = authInfo.error;
              } else if (authInfo?.code === 'INSUFFICIENT_PERMISSIONS') {
                message = 'Este sistema é apenas para administradores com role CMS.';
              } else if (authInfo?.code === 'ACCOUNT_NOT_AUTHORIZED') {
                message = 'Sua conta ainda não foi autorizada pelo responsável.';
              } else {
                message = 'Você não tem permissão para acessar esta área.';
              }
              
              setErrorMessage(message);
              setTimeout(() => router.push(redirectTo), 1500);
            }
            return;
          }
          
          console.log('✅ AuthGuard - Acesso CMS autorizado');
          if (mounted) {
            setIsChecking(false);
            clearTimeout(timeoutId);
          }
          return;
        }

        // Para outros roles, verificar dinamicamente
        try {
          const hasAccess = await checkRoleAccess(requiredRole);
          console.log(`🔍 AuthGuard - Verificação role ${requiredRole}:`, hasAccess);
          
          if (!hasAccess) {
            if (mounted) {
              setAccessDenied(true);
              setErrorMessage(`Você não tem permissão para acessar esta área (role ${requiredRole} requerido).`);
              setTimeout(() => router.push(redirectTo), 1500);
            }
            return;
          }
          
          if (mounted) {
            setIsChecking(false);
            clearTimeout(timeoutId);
          }
        } catch (error) {
          console.error('❌ AuthGuard - Erro ao verificar role:', error);
          if (mounted) {
            setAccessDenied(true);
            setErrorMessage('Erro ao verificar permissões. Tente novamente.');
            setTimeout(() => router.push(redirectTo), 1500);
          }
        }
        
      } catch (error) {
        console.error('❌ AuthGuard - Erro inesperado:', error);
        if (mounted) {
          setAccessDenied(true);
          setErrorMessage('Erro inesperado na verificação de acesso.');
          setTimeout(() => router.push(redirectTo), 1500);
        }
      }
    };

    // Executar verificação
    handleAuthCheck();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
    };
  }, [loading, isAuthenticated, canAccessCMS, requiredRole, authInfo, checkRoleAccess, router, redirectTo, verificationAttempts, initialLoadComplete, user, profile, isChecking, isLoggingOut]);

  // Estado de carregamento - melhorado para evitar flash de "acesso negado"
  if (loading || (isChecking && !accessDenied)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner 
          size="lg" 
          text={verificationAttempts > 0 ? `Verificando acesso... (${verificationAttempts}/${MAX_RETRIES + 1})` : "Verificando acesso..."}
          color="black"
        />
      </div>
    );
  }

  // Erro de conexão
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <div className="w-12 h-12 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Erro de Conexão</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800 transition-colors"
            >
              Tentar Novamente
            </button>
            <button
              onClick={() => router.push(redirectTo)}
              className="w-full bg-gray-200 text-gray-700 px-6 py-2 rounded font-medium hover:bg-gray-300 transition-colors"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Acesso negado - só mostrar se o carregamento inicial foi concluído E todas as tentativas foram esgotadas
  if (accessDenied && initialLoadComplete && verificationAttempts >= 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <div className="w-12 h-12 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <div className="mb-6">
            <LoadingSpinner size="sm" text="Redirecionando..." />
          </div>
          <button
            onClick={() => router.push(redirectTo)}
            className="bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800 transition-colors"
          >
            {!isAuthenticated ? 'Fazer Login' : 'Voltar ao Login'}
          </button>
        </div>
      </div>
    );
  }

  // Acesso autorizado - renderizar conteúdo
  return <>{children}</>;
} 