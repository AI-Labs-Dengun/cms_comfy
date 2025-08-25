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
                className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                  isOnline 
                    ? 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100 focus:ring-green-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className={`font-medium ${isOnline ? 'text-green-800' : 'text-gray-700'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <svg className={`w-4 h-4 ${isOnline ? 'text-green-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border-2 border-gray-200 z-50 overflow-hidden">
                  <div className="py-2">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Status Atual
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        updateOnlineStatus(true);
                        setIsDropdownOpen(false);
                      }}
                      disabled={isOnline || isUpdating}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isOnline 
                          ? 'bg-green-50 text-green-800 border-l-4 border-green-500' 
                          : 'text-gray-700 hover:bg-green-50 hover:text-green-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div>
                          <div className="font-medium">Online</div>
                          <div className="text-xs text-gray-500">Disponível para atendimento</div>
                        </div>
                        {isOnline && (
                          <svg className="w-4 h-4 text-green-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        updateOnlineStatus(false);
                        setIsDropdownOpen(false);
                      }}
                      disabled={!isOnline || isUpdating}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        !isOnline 
                          ? 'bg-gray-50 text-gray-800 border-l-4 border-gray-500' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <div>
                          <div className="font-medium">Offline</div>
                          <div className="text-xs text-gray-500">Indisponível para atendimento</div>
                        </div>
                        {!isOnline && (
                          <svg className="w-4 h-4 text-gray-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Botão de logout */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sair</span>
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
