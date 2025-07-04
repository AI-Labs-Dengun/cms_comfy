'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, LogOut, User } from 'lucide-react';
import { AuthService } from '@/services/auth';
import AuthGuard from '@/components/AuthGuard';

interface CMSLayoutProps {
  children: React.ReactNode;
  currentPage?: 'create' | 'management';
}

export default function CMSLayout({ children, currentPage }: CMSLayoutProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      router.push('/login');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  return (
    <AuthGuard requiredRole="cms">
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex flex-1 bg-white">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r flex flex-col py-8 px-6 min-h-full shadow-2xl z-10" style={{ boxShadow: '12px 0 40px 0 rgba(0,0,0,0.18)' }}>
            <div className="mb-12 flex flex-col items-center justify-center">
              <img src="/cms-logo.png" alt="Comfy Content Hub Logo" className="mb-2 w-28 h-auto" />
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
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 mb-2">
                <User className="w-4 h-4" />
                <span>Administrador CMS</span>
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
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
} 