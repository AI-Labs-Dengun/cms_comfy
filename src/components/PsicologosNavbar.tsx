'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getAllPsicologos, Psicologo } from '@/services/psicologos';

export default function PsicologosNavbar() {
  const router = useRouter();
  const { signOut, profile, user } = useAuth();
  const { 
    isOnline, 
    isUpdating, 
    wasAutoOffline, 
    clearAutoOfflineFlag, 
    updateStatus, 
    inactivityTimeout, 
    setInactivityTimeout,
    isInactivityTimerActive,
    getRemainingTime
  } = useOnlineStatus();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTimeoutDropdownOpen, setIsTimeoutDropdownOpen] = useState(false);
  const [showAutoOfflineModal, setShowAutoOfflineModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isPsicologosDropdownOpen, setIsPsicologosDropdownOpen] = useState(false);
  const [psicologos, setPsicologos] = useState<Psicologo[]>([]);
  const [loadingPsicologos, setLoadingPsicologos] = useState(false);

  // Opções de tempo de inatividade (em minutos)
  const timeoutOptions = [
    { value: 1 * 60 * 1000, label: '1 minuto' },
    { value: 3 * 60 * 1000, label: '3 minutos' },
    { value: 5 * 60 * 1000, label: '5 minutos' },
    { value: 7 * 60 * 1000, label: '7 minutos' },
    { value: 10 * 60 * 1000, label: '10 minutos' }
  ];

  // Encontrar a opção atual
  const currentTimeoutOption = timeoutOptions.find(option => option.value === inactivityTimeout) || timeoutOptions[2]; // 5 minutos padrão

  // Atualizar tempo restante a cada segundo quando o timer estiver ativo
  useEffect(() => {
    if (!isInactivityTimerActive) {
      setRemainingTime(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setRemainingTime(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [isInactivityTimerActive, getRemainingTime]);

  // Mostrar modal quando status foi alterado automaticamente
  useEffect(() => {
    if (wasAutoOffline) {
      setShowAutoOfflineModal(true);
    }
  }, [wasAutoOffline]);

  // Função para formatar tempo restante
  const formatRemainingTime = (ms: number) => {
    if (ms <= 0) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Função para formatar última atividade
  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Nunca visto';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  // Função para fechar modal e limpar flag
  const handleCloseAutoOfflineModal = () => {
    setShowAutoOfflineModal(false);
    clearAutoOfflineFlag();
  };

  // Função para alterar para online e fechar modal
  const handleSetOnlineAndClose = async () => {
    try {
      await updateOnlineStatus(true);
      setShowAutoOfflineModal(false);
      clearAutoOfflineFlag();
    } catch (error) {
      console.error('❌ Erro ao alterar para online:', error);
      alert('Erro ao alterar status para online: ' + (error as Error).message);
    }
  };

  // Função para atualizar status online/offline
  const updateOnlineStatus = async (newStatus: boolean) => {
    try {
      await updateStatus(newStatus);
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      alert('Erro ao atualizar status: ' + (error as Error).message);
    }
  };

  // Função para buscar todos os psicólogos
  const fetchPsicologos = async () => {
    try {
      setLoadingPsicologos(true);
      const result = await getAllPsicologos();
      if (result.success) {
        // Ordenar psicólogos: online primeiro, depois offline por tempo de última atividade
        const sortedPsicologos = (result.data || []).sort((a, b) => {
          // Primeiro: online antes de offline
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;
          
          // Se ambos são offline, ordenar por tempo de última atividade (mais recente primeiro)
          if (!a.is_online && !b.is_online) {
            const aTime = new Date(a.last_seen || a.updated_at).getTime();
            const bTime = new Date(b.last_seen || b.updated_at).getTime();
            return bTime - aTime; // Mais recente primeiro
          }
          
          // Se ambos são online, ordenar por nome
          return a.name.localeCompare(b.name);
        });
        
        setPsicologos(sortedPsicologos);
      }
    } catch (error) {
      console.error('Erro ao buscar psicólogos:', error);
    } finally {
      setLoadingPsicologos(false);
    }
  };

  // Função para abrir dropdown de psicólogos
  const handlePsicologosDropdownToggle = () => {
    if (!isPsicologosDropdownOpen) {
      fetchPsicologos();
    }
    setIsPsicologosDropdownOpen(!isPsicologosDropdownOpen);
  };

  // Função para alterar tempo de inatividade
  const handleTimeoutChange = (timeout: number) => {
    setInactivityTimeout(timeout);
    setIsTimeoutDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      
      const result = await signOut();
      
      if (result.success) {
        router.replace('/login');
      } else {
        alert('Erro ao fazer logout: ' + result.error);
      }
    } catch (error) {
      console.error('❌ PsicologosNavbar - Erro inesperado no logout:', error);
      alert('Erro inesperado ao fazer logout');
    }
  };

  // Atualizar lista de psicólogos quando o dropdown estiver aberto
  useEffect(() => {
    if (isPsicologosDropdownOpen) {
      const interval = setInterval(fetchPsicologos, 10000); // Atualizar a cada 10 segundos
      return () => clearInterval(interval);
    }
  }, [isPsicologosDropdownOpen]);

  // Verificação de segurança para evitar renderização com dados inválidos
  if (!profile && !user) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Painel Psicólogos - Comfy
              </h1>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500">Carregando...</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo e título */}
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-semibold text-gray-900">
                Painel Psicólogos - Comfy
              </h1>
              
              {/* Dropdown de Psicólogos Online */}
              <div className="relative">
                <button
                  onClick={handlePsicologosDropdownToggle}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Psicólogos</span>
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu de Psicólogos */}
                {isPsicologosDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border-2 border-gray-200 z-50 overflow-hidden">
                    <div className="py-2">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Psicólogos ({psicologos.length})
                        </span>
                      </div>
                      
                      {loadingPsicologos ? (
                        <div className="px-4 py-6 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Carregando...</p>
                        </div>
                      ) : psicologos.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <div className="text-gray-400 mb-2">
                            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500">Nenhum psicólogo encontrado</p>
                        </div>
                      ) : (
                        <div className="max-h-96 overflow-y-auto">
                          {(() => {
                            const onlinePsicologos = psicologos.filter(p => p.is_online);
                            const offlinePsicologos = psicologos.filter(p => !p.is_online);
                            
                            return (
                              <>
                                {/* Psicólogos Online */}
                                {onlinePsicologos.length > 0 && (
                                  <>
                                    <div className="px-3 py-2 bg-green-50 border-b border-green-200">
                                      <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
                                        Online ({onlinePsicologos.length})
                                      </span>
                                    </div>
                                    {onlinePsicologos.slice(0, 3).map((psicologo: Psicologo) => (
                                      <div
                                        key={psicologo.id}
                                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                      >
                                        {/* Avatar */}
                                        <div className="flex-shrink-0">
                                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                            {psicologo.avatar_path && psicologo.avatar_path !== '/default-avatar.png' ? (
                                              <Image
                                                src={psicologo.avatar_path}
                                                alt={psicologo.name}
                                                width={32}
                                                height={32}
                                                className="w-8 h-8 rounded-full object-cover"
                                              />
                                            ) : (
                                              <span className="text-blue-600 font-semibold text-sm">
                                                {psicologo.name.charAt(0).toUpperCase()}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Informações */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center space-x-2">
                                            <h4 className="text-sm font-medium text-gray-900 truncate">
                                              {psicologo.name}
                                            </h4>
                                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                          </div>
                                          <p className="text-xs text-gray-500 truncate">
                                            @{psicologo.username}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                    {onlinePsicologos.length > 3 && (
                                      <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
                                        +{onlinePsicologos.length - 3} mais online
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Linha Divisória */}
                                {onlinePsicologos.length > 0 && offlinePsicologos.length > 0 && (
                                  <div className="px-3 py-2 bg-gray-100 border-t border-b border-gray-200">
                                    <div className="h-px bg-gray-300"></div>
                                  </div>
                                )}

                                {/* Psicólogos Offline */}
                                {offlinePsicologos.length > 0 && (
                                  <>
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                        Offline ({offlinePsicologos.length})
                                      </span>
                                    </div>
                                    {offlinePsicologos.slice(0, 3).map((psicologo: Psicologo) => (
                                      <div
                                        key={psicologo.id}
                                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                      >
                                        {/* Avatar */}
                                        <div className="flex-shrink-0">
                                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            {psicologo.avatar_path && psicologo.avatar_path !== '/default-avatar.png' ? (
                                              <Image
                                                src={psicologo.avatar_path}
                                                alt={psicologo.name}
                                                width={32}
                                                height={32}
                                                className="w-8 h-8 rounded-full object-cover opacity-60"
                                              />
                                            ) : (
                                              <span className="text-gray-500 font-semibold text-sm">
                                                {psicologo.name.charAt(0).toUpperCase()}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Informações */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center space-x-2">
                                            <h4 className="text-sm font-medium text-gray-700 truncate">
                                              {psicologo.name}
                                            </h4>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                                          </div>
                                          <p className="text-xs text-gray-500 truncate">
                                            @{psicologo.username}
                                          </p>
                                          <p className="text-xs text-gray-400">
                                            Última atividade: {formatLastSeen(psicologo.last_seen)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                    {offlinePsicologos.length > 3 && (
                                      <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
                                        +{offlinePsicologos.length - 3} mais offline
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      
                      {/* Botão Ver Mais */}
                      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setIsPsicologosDropdownOpen(false);
                            router.push('/psicologos/lista');
                          }}
                          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>Ver Lista Completa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Menu de usuário */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Bem-vindo(a), {profile?.name || user?.email || 'Usuário'}
              </span>
              
              {/* Indicador de Timer de Inatividade */}
              {isInactivityTimerActive && isOnline && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-yellow-700">
                    Auto-offline em: {formatRemainingTime(remainingTime)}
                  </span>
                </div>
              )}
              
              {/* Dropdown de Configuração de Tempo */}
              <div className="relative">
                <button
                  onClick={() => setIsTimeoutDropdownOpen(!isTimeoutDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Auto-offline: {currentTimeoutOption.label}</span>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu de Tempo */}
                {isTimeoutDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border-2 border-gray-200 z-50 overflow-hidden">
                    <div className="py-2">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Tempo de Inatividade
                        </span>
                      </div>
                      {timeoutOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleTimeoutChange(option.value)}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 ${
                            option.value === inactivityTimeout 
                              ? 'bg-blue-50 text-blue-800 border-l-4 border-blue-500' 
                              : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{option.label}</span>
                            {option.value === inactivityTimeout && (
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
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

                {/* Notificação de Auto-Offline - Pequena caixinha abaixo do dropdown */}
                {showAutoOfflineModal && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border-2 border-yellow-300 z-50 overflow-hidden animate-pulse">
                    <div className="p-5">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-gray-900 mb-2">
                            Status Alterado por Inatividade
                          </h4>
                          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                            Seu status foi alterado de <span className="font-semibold text-green-600">Online</span> para <span className="font-semibold text-gray-600">Offline</span> automaticamente após {currentTimeoutOption.label} de ausência.
                          </p>
                          <div className="flex space-x-3">
                            <button
                              onClick={handleSetOnlineAndClose}
                              className="flex-1 bg-green-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-green-700 transition-all duration-200 hover:shadow-md"
                            >
                              Alterar para Online
                            </button>
                            <button
                              onClick={handleCloseAutoOfflineModal}
                              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-300 transition-all duration-200 hover:shadow-md"
                            >
                              Ok
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={handleCloseAutoOfflineModal}
                          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
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
        
        {/* Overlay para fechar dropdowns quando clicar fora */}
        {(isDropdownOpen || isTimeoutDropdownOpen || isPsicologosDropdownOpen) && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setIsDropdownOpen(false);
              setIsTimeoutDropdownOpen(false);
              setIsPsicologosDropdownOpen(false);
            }}
          />
        )}
      </header>

    </>
  );
}
