'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';

interface PsicologosLayoutProps {
  children: React.ReactNode;
}

export default function PsicologosLayout({ children }: PsicologosLayoutProps) {
  const router = useRouter();
  const { signOut, profile, user } = useAuth();

  const handleLogout = async () => {
    try {
      console.log('🚪 PsicologosLayout - Iniciando logout...');
      const result = await signOut();
      
      if (result.success) {
        console.log('✅ PsicologosLayout - Logout bem-sucedido');
        router.replace('/login');
      } else {
        console.error('❌ PsicologosLayout - Erro no logout:', result.error);
        alert('Erro ao fazer logout: ' + result.error);
      }
    } catch (error) {
      console.error('❌ PsicologosLayout - Erro inesperado no logout:', error);
      alert('Erro inesperado ao fazer logout');
    }
  };

  return (
    <AuthGuard requiredRole="psicologo" redirectTo="/login">
      <div className="min-h-screen bg-gray-50">
        {/* Header do painel de psicólogos */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo e título */}
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  Painel Psicólogos - Comfy
                </h1>
              </div>
              
              {/* Menu de usuário */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Bem-vindo(a), {profile?.name || user?.email}
                </span>
                
                {/* Botão de logout */}
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Conteúdo principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
