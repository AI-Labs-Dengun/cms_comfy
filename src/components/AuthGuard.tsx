'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'cms' | 'app';
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  requiredRole = 'cms',
  redirectTo = '/login' 
}: AuthGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const checkingRef = useRef(false);
  
  const { 
    authInfo, 
    loading, 
    error, 
    isAuthenticated, 
    canAccessCMS,
    checkRoleAccess 
  } = useAuth();

  useEffect(() => {
    let mounted = true;

    const handleAuthCheck = async () => {
      // Evitar múltiplas execuções simultâneas
      if (checkingRef.current || !mounted) return;
      
      if (loading) {
        setIsChecking(true);
        return;
      }

      checkingRef.current = true;

      try {
        if (!isAuthenticated) {
          console.log('Usuário não autenticado, redirecionando...');
          if (mounted) {
            router.push(redirectTo);
          }
          return;
        }

        // Para CMS, usar o valor já calculado do contexto
        if (requiredRole === 'cms') {
          if (!canAccessCMS) {
            console.log('Usuário sem permissão CMS, redirecionando...');
            if (mounted) {
              router.push(redirectTo);
            }
            return;
          }
          if (mounted) {
            setHasAccess(true);
            setIsChecking(false);
          }
          return;
        }

        // Para outros roles, verificar dinamicamente (com cache)
        try {
          const access = await checkRoleAccess(requiredRole);
          if (!access) {
            console.log(`Usuário sem permissão ${requiredRole}, redirecionando...`);
            if (mounted) {
              router.push(redirectTo);
            }
            return;
          }
          if (mounted) {
            setHasAccess(true);
          }
        } catch (error) {
          console.error('Erro ao verificar acesso:', error);
          if (mounted) {
            router.push(redirectTo);
          }
          return;
        }
        
        if (mounted) {
          setIsChecking(false);
        }
      } finally {
        checkingRef.current = false;
      }
    };

    handleAuthCheck();

    return () => {
      mounted = false;
    };
  }, [loading, isAuthenticated, canAccessCMS]); // Dependências mínimas

  // Estados de loading otimizados
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner 
          size="lg" 
          text={loading ? "Verificando acesso..." : "Carregando..."} 
          className="text-center"
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
            <LoadingSpinner size="md" text="" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Erro de Conexão</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800 transition-colors mr-4"
          >
            Tentar Novamente
          </button>
          <button
            onClick={() => router.push(redirectTo)}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded font-medium hover:bg-gray-300 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  // Verificação final de acesso
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">
            {!isAuthenticated 
              ? 'Você precisa fazer login para acessar esta área.'
              : authInfo?.error || 'Você não tem permissão para acessar esta área.'
            }
          </p>
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

  return <>{children}</>;
} 