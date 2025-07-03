'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth';
import { AuthResponse } from '@/types/auth';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authInfo, setAuthInfo] = useState<AuthResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Verificar se há usuário logado
      const user = await AuthService.getUser();
      
      if (!user?.email) {
        console.log('Usuário não autenticado');
        router.push(redirectTo);
        return;
      }

      // Verificar se tem o role correto
      const authCheck = await AuthService.canUserLoginWithRole(user.email, requiredRole);
      setAuthInfo(authCheck);

      if (!authCheck.success) {
        console.log('Usuário sem permissão:', authCheck.error);
        
        // Fazer logout e redirecionar sem mostrar alertas
        // Os alertas serão mostrados na página de login
        await AuthService.logout();
        router.push(redirectTo);
        return;
      }

      console.log('Usuário autorizado:', authCheck);
      setIsAuthorized(true);

    } catch (error) {
      console.error('Erro na verificação de auth:', error);
      router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">
            {authInfo?.error || 'Você não tem permissão para acessar esta área.'}
          </p>
          <button
            onClick={() => router.push(redirectTo)}
            className="bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 