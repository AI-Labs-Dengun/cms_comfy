'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function PsicologosNavbar() {
  const router = useRouter();
  const { signOut, profile, user } = useAuth();
  const { isOnline, isUpdating, updateStatus } = useOnlineStatus();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Função para atualizar status online/offline
  const updateOnlineStatus = async (newStatus: boolean) => {
    try {
      await updateStatus(newStatus);
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      alert('Erro ao atualizar status: ' + (error as Error).message);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 PsicologosNavbar - Iniciando logout...');
      
      const result = await signOut();
      
      if (result.success) {
        console.log('✅ PsicologosNavbar - Logout bem-sucedido');
        router.replace('/login');
      } else {
        console.error('❌ PsicologosNavbar - Erro no logout:', result.error);
        alert('Erro ao fazer logout: ' + result.error);
      }
    } catch (error) {
      console.error('❌ PsicologosNavbar - Erro inesperado no logout:', error);
      alert('Erro inesperado ao fazer logout');
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
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
            
            {/* Dropdown de Status */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={isUpdating}
                className="flex items-center space-x-2 px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={isOnline ? 'text-green-700' : 'text-gray-600'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        updateOnlineStatus(true);
                        setIsDropdownOpen(false);
                      }}
                      disabled={isOnline || isUpdating}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isOnline ? 'text-green-700 bg-green-50' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Online</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        updateOnlineStatus(false);
                        setIsDropdownOpen(false);
                      }}
                      disabled={!isOnline || isUpdating}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
                        !isOnline ? 'text-gray-700 bg-gray-50' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        <span>Offline</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
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
      
      {/* Overlay para fechar dropdown quando clicar fora */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </header>
  );
}
