'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, LogOut, User, Users, PlusCircle, Menu, X, Tags } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Image from 'next/image';

interface CMSLayoutProps {
  children: React.ReactNode;
  currentPage?: 'create' | 'management' | 'psicologos-create' | 'psicologos' | 'tags-leitura';
}

export default function CMSLayout({ children, currentPage }: CMSLayoutProps) {
  const router = useRouter();
  const { signOut, user, profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    closeMobileMenu();
  };

  return (
    <AuthGuard requiredRole="cms">
      <div className="h-screen bg-white flex flex-col lg:flex-row">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Image 
              src="/cms-logo.png" 
              alt="Comfy Content Hub Logo" 
              className="w-20 h-auto" 
              width={80} 
              height={34}
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeMobileMenu} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col py-8 px-6 shadow-2xl transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `} style={{ boxShadow: '12px 0 40px 0 rgba(0,0,0,0.18)' }}>
          
          {/* Mobile Close Button */}
          <div className="lg:hidden flex justify-end mb-4">
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Logo Section */}
          <div className="flex flex-col items-center justify-center mb-8">
            <Image 
              src="/cms-logo.png" 
              alt="Comfy Content Hub Logo" 
              className="mb-2 w-24 h-auto lg:w-28" 
              width={112} 
              height={48}
              style={{ width: 'auto', height: 'auto' }}
            />
            <div className="text-xs text-gray-500 font-medium text-center">
              Sistema de Administração
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex flex-col gap-2 flex-1">
            <button
              className={`flex items-center gap-2 px-3 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
                currentPage === 'create' 
                  ? 'bg-black text-white' 
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => handleNavigation('/dashboard/create')}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm lg:text-base">Novo Conteúdo</span>
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
                currentPage === 'management' 
                  ? 'bg-black text-white' 
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => handleNavigation('/dashboard/management')}
            >
              <ArrowRight className="w-4 h-4" />
              <span className="text-sm lg:text-base">Gerir Conteúdo</span>
            </button>
            {/* Gestão de Tags de Leitura */}
            <button
              className={`flex items-center gap-2 px-3 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
                currentPage === 'tags-leitura' 
                  ? 'bg-black text-white' 
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => handleNavigation('/dashboard/leitura/tags')}
            >
              <Tags className="w-4 h-4" />
              <span className="text-sm lg:text-base">Tags de Leitura</span>
            </button>
            {/* Novo Psicólogo */}
            <button
              className={`flex items-center gap-2 px-3 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
                currentPage === 'psicologos-create'
                  ? 'bg-black text-white'
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => handleNavigation('/dashboard/psicologos/create')}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="text-sm lg:text-base">Novo Psicólogo</span>
            </button>
            {/* Gerir Psicólogos */}
            <button
              className={`flex items-center gap-2 px-3 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
                currentPage === 'psicologos'
                  ? 'bg-black text-white'
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => handleNavigation('/dashboard/psicologos')}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm lg:text-base">Gerir Psicólogos</span>
            </button>
          </nav>

          {/* User section and logout */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 mb-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm lg:text-base">
                {profile?.name || user?.email || 'Administrador CMS'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 cursor-pointer w-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm lg:text-base">Terminar Sessão</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
} 