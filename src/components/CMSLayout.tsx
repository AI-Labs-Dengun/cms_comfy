'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Image from 'next/image';

interface CMSLayoutProps {
  children: React.ReactNode;
  currentPage?: 'create' | 'management';
}

export default function CMSLayout({ children, currentPage }: CMSLayoutProps) {
  const router = useRouter();
  const { signOut, user, profile } = useAuth();

  const handleLogout = async () => {
    try {
      console.log('🚪 CMSLayout - Iniciando logout...');
      const result = await signOut();
      
      if (!result.success) {
        console.error('❌ CMSLayout - Erro no logout:', result.error);
        // Mesmo com erro, tentar redirecionar
        router.push('/login');
      }
      // O redirecionamento é feito automaticamente pelo signOut do contexto
    } catch (error) {
      console.error('❌ CMSLayout - Erro inesperado no logout:', error);
      // Em caso de erro inesperado, forçar redirecionamento
      window.location.href = '/login';
    }
  };

  return (
    <AuthGuard requiredRole="cms">
      <div className="h-screen bg-white flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r flex flex-col py-8 px-6 shadow-2xl z-10" style={{ boxShadow: '12px 0 40px 0 rgba(0,0,0,0.18)' }}>
          <div className="flex flex-col items-center justify-center mb-8">
            <Image src="/cms-logo.png" alt="Comfy Content Hub Logo" className="mb-2 w-28 h-auto" width={112} height={48} />
            <div className="text-xs text-gray-500 font-medium">Sistema de Administração</div>
          </div>
          
          <nav className="flex flex-col gap-2 flex-1">
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium cursor-pointer ${
                currentPage === 'create' 
                  ? 'bg-black text-white' 
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => router.push('/dashboard/create')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo Conteúdo
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium cursor-pointer ${
                currentPage === 'management' 
                  ? 'bg-black text-white' 
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => router.push('/dashboard/management')}
            >
              <ArrowRight className="w-4 h-4 mr-1" />
              Gerir Conteúdo
            </button>
          </nav>

          {/* User section and logout */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 mb-2">
              <User className="w-4 h-4" />
              <span>{profile?.name || user?.email || 'Administrador CMS'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50 cursor-pointer w-full"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Terminar Sessão
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
} 