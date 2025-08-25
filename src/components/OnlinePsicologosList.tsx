'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Psicologo {
  id: string;
  name: string;
  username: string;
  avatar_path: string;
  guardian_email: string;
  is_online: boolean;
  last_seen: string;
}

interface OnlinePsicologosListProps {
  refreshInterval?: number; // em milissegundos
}

export default function OnlinePsicologosList({ refreshInterval = 30000 }: OnlinePsicologosListProps) {
  const [psicologos, setPsicologos] = useState<Psicologo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOnlinePsicologos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .rpc('get_online_psicologos');

      if (error) {
        console.error('❌ Erro ao buscar psicólogos online:', error);
        setError('Erro ao carregar psicólogos online');
        return;
      }

      if (data.success) {
        setPsicologos(data.psicologos || []);
      } else {
        setError(data.error || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('❌ Erro inesperado:', err);
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    fetchOnlinePsicologos();
  }, []);

  // Atualizar periodicamente
  useEffect(() => {
    const interval = setInterval(fetchOnlinePsicologos, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatLastSeen = (lastSeen: string) => {
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Psicólogos Online
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Psicólogos Online
        </h3>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">⚠️ {error}</div>
          <button
            onClick={fetchOnlinePsicologos}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Psicólogos Online
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">
            {psicologos.length} {psicologos.length === 1 ? 'online' : 'online'}
          </span>
        </div>
      </div>

      {psicologos.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">Nenhum psicólogo online no momento</div>
          <div className="text-sm text-gray-400">
            Os psicólogos aparecerão aqui quando estiverem disponíveis
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {psicologos.map((psicologo) => (
            <div
              key={psicologo.id}
              className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  {psicologo.avatar_path && psicologo.avatar_path !== '/default-avatar.png' ? (
                    <img
                      src={psicologo.avatar_path}
                      alt={psicologo.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-blue-600 font-semibold text-lg">
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
                <p className="text-xs text-gray-400">
                  Ativo {formatLastSeen(psicologo.last_seen)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão de atualizar */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={fetchOnlinePsicologos}
          disabled={loading}
          className="w-full text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Atualizando...' : 'Atualizar lista'}
        </button>
      </div>
    </div>
  );
}
