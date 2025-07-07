'use client';

import { useEffect } from 'react';
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
  const { 
    authInfo, 
    loading, 
    error, 
    isAuthenticated, 
    canAccessCMS,
    checkRoleAccess 
  } = useAuth();

  useEffect(() => {
    const handleAuthCheck = async () => {
      if (loading) return; // Ainda carregando

      if (!isAuthenticated) {
        console.log('Usuário não autenticado, redirecionando...');
        router.push(redirectTo);
        return;
      }

      // Verificar role específico se necessário
      if (requiredRole === 'cms' && !canAccessCMS) {
        console.log('Usuário sem permissão CMS, redirecionando...');
        router.push(redirectTo);
        return;
      }

      // Para roles diferentes de CMS, verificar dinamicamente
      if (requiredRole !== 'cms') {
        const hasAccess = await checkRoleAccess(requiredRole);
        if (!hasAccess) {
          console.log(`Usuário sem permissão ${requiredRole}, redirecionando...`);
          router.push(redirectTo);
          return;
        }
      }
    };

    handleAuthCheck();
  }, [loading, isAuthenticated, canAccessCMS, requiredRole, router, redirectTo, checkRoleAccess]);

  // Ainda carregando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner 
          size="lg" 
          text="Verificando acesso..." 
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

  // Usuário não autenticado ou sem permissão
  if (!isAuthenticated || (requiredRole === 'cms' && !canAccessCMS)) {
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