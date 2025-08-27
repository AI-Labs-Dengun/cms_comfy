'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAllPsicologos, Psicologo } from '@/services/psicologos';
import LoadingSpinner from '@/components/LoadingSpinner';

type FilterType = 'all' | 'online' | 'offline';

export default function ListaPsicologosPage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [psicologos, setPsicologos] = useState<Psicologo[]>([]);
  const [filteredPsicologos, setFilteredPsicologos] = useState<Psicologo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);

  // Carregar dados quando o perfil estiver disponível
  useEffect(() => {
    if (profile && user) {
      fetchPsicologos();
    }
  }, [profile, user]);

  // Atualizar lista automaticamente a cada 30 segundos (modo silencioso)
  useEffect(() => {
    if (profile?.user_role === 'psicologo' && profile?.authorized === true) {
      const interval = setInterval(() => fetchPsicologos(true), 30000); // 30 segundos
      return () => clearInterval(interval);
    }
  }, [profile]);

  // Função para atualização manual (com loading)
  const handleManualRefresh = () => {
    fetchPsicologos(false);
  };

  // Atalho de teclado para voltar (Escape)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.push('/psicologos');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const fetchPsicologos = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const result = await getAllPsicologos();
      
      if (!result.success) {
        if (!silent) {
          setError(result.error || 'Erro ao carregar psicólogos');
        }
        return;
      }

      setPsicologos(result.data || []);
      setLastUpdate(new Date());
      
      // Mostrar indicador sutil para atualizações automáticas
      if (silent) {
        setShowUpdateIndicator(true);
        setTimeout(() => setShowUpdateIndicator(false), 2000); // Esconder após 2 segundos
      }
    } catch (err) {
      console.error('Erro ao buscar psicólogos:', err);
      if (!silent) {
        setError('Erro de conexão ao carregar psicólogos');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Filtrar psicólogos baseado no termo de busca e filtro ativo
  useEffect(() => {
    let filtered = psicologos;

    // Aplicar filtro de status
    if (activeFilter === 'online') {
      filtered = filtered.filter(p => p.is_online);
    } else if (activeFilter === 'offline') {
      filtered = filtered.filter(p => !p.is_online);
    }

    // Aplicar busca por nome ou username
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.username.toLowerCase().includes(term)
      );
    }

    setFilteredPsicologos(filtered);
  }, [psicologos, searchTerm, activeFilter]);

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

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? 'bg-green-500' : 'bg-gray-400';
  };

  const getStatusText = (isOnline: boolean) => {
    return isOnline ? 'Online' : 'Offline';
  };

  const getStatusBadgeColor = (isOnline: boolean) => {
    return isOnline 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-4">
            Erro de Acesso
          </div>
          <div className="text-gray-600 mb-6">
            {error}
          </div>
                      <button
              onClick={() => router.push('/psicologos')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Voltar para Conversas</span>
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Simplificado */}
        <div className="mb-6">
          {/* Breadcrumb Minimalista */}
          <nav className="mb-4">
            <button
              onClick={() => router.push('/psicologos')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar para Conversas
            </button>
          </nav>

          {/* Título e Ações */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Lista de Psicólogos
              </h1>
              <p className="text-sm text-gray-600">
                Visualize todos os psicólogos autorizados do sistema
              </p>
            </div>
            
            {/* Ações Secundárias */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-500">
                  Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')}
                </div>
                {showUpdateIndicator && (
                  <div className="flex items-center space-x-1 text-xs text-green-600 animate-pulse">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Atualizado</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleManualRefresh}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Atualizar lista"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Atualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0 lg:space-x-4">
            {/* Filtros de Status */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeFilter === 'all'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Todos ({psicologos.length})
              </button>
              <button
                onClick={() => setActiveFilter('online')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeFilter === 'online'
                    ? 'bg-green-100 text-green-800 border border-green-300 shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Online ({psicologos.filter(p => p.is_online).length})
              </button>
              <button
                onClick={() => setActiveFilter('offline')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeFilter === 'offline'
                    ? 'bg-gray-100 text-gray-800 border border-gray-400 shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Offline ({psicologos.filter(p => !p.is_online).length})
              </button>
            </div>

            {/* Campo de Busca */}
            <div className="relative flex-shrink-0">
              <input
                type="text"
                placeholder="Buscar psicólogos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full lg:w-64 pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-600"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Lista de Psicólogos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredPsicologos.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum psicólogo encontrado
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Tente ajustar os termos de busca ou filtros aplicados.'
                  : 'Não há psicólogos disponíveis no momento.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPsicologos.map((psicologo) => (
                <div
                  key={psicologo.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          {psicologo.avatar_path && psicologo.avatar_path !== '/default-avatar.png' ? (
                            <Image
                              src={psicologo.avatar_path}
                              alt={psicologo.name}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-blue-600 font-semibold text-xl">
                              {psicologo.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {/* Indicador de status */}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(psicologo.is_online)}`}></div>
                      </div>
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {psicologo.name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(psicologo.is_online)}`}>
                          {getStatusText(psicologo.is_online)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        @{psicologo.username}
                      </p>
                      <p className="text-sm text-gray-400">
                        {psicologo.is_online 
                          ? 'Disponível para atendimento'
                          : `Última atividade: ${formatLastSeen(psicologo.last_seen)}`
                        }
                      </p>
                    </div>

                    {/* Informações adicionais */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm text-gray-500">
                        Membro desde {new Date(psicologo.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      {psicologo.is_online && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          ● Ativo agora
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estatísticas Compactas */}
        <div className="mb-6 flex items-center justify-center space-x-8 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Total: <span className="font-semibold text-gray-900">{psicologos.length}</span></span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Online: <span className="font-semibold text-green-600">{psicologos.filter(p => p.is_online).length}</span></span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-gray-600">Offline: <span className="font-semibold text-gray-600">{psicologos.filter(p => !p.is_online).length}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
