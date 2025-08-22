'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

// Tipos para os chats
interface Chat {
  id: string;
  app_user_id: string;
  app_user_name: string;
  last_message_at: string;
  last_message_content?: string;
  unread_count_psicologo: number;
  is_active: boolean;
  tags?: string[];
}

export default function PsicologosPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carregar chats disponíveis
  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Implementar chamada à API para buscar chats
        // Por enquanto, dados simulados
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simular loading
        
        const mockChats: Chat[] = [
          {
            id: '1',
            app_user_id: 'user1',
            app_user_name: 'João Silva',
            last_message_at: new Date(Date.now() - 30000).toISOString(),
            last_message_content: 'Olá, preciso de ajuda...',
            unread_count_psicologo: 2,
            is_active: true,
            tags: ['ansiedade', 'urgente']
          },
          {
            id: '2',
            app_user_id: 'user2',
            app_user_name: 'Maria Santos',
            last_message_at: new Date(Date.now() - 300000).toISOString(),
            last_message_content: 'Obrigada pela sessão de hoje.',
            unread_count_psicologo: 0,
            is_active: true,
            tags: ['depressão']
          },
          {
            id: '3',
            app_user_id: 'user3',
            app_user_name: 'Pedro Costa',
            last_message_at: new Date(Date.now() - 86400000).toISOString(),
            last_message_content: 'Consegui aplicar as técnicas que discutimos.',
            unread_count_psicologo: 1,
            is_active: true,
            tags: ['progresso']
          }
        ];

        setChats(mockChats);
        
      } catch (error) {
        console.error('Erro ao carregar chats:', error);
        setError('Erro ao carregar conversas. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  // Função para formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return `${Math.floor(diffInMinutes / 1440)}d atrás`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" text="Carregando conversas..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Conversas Ativas
            </h1>
            <p className="text-gray-600 mt-1">
              Bem-vindo(a), {profile?.name || user?.email}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">Total de conversas</div>
            <div className="text-3xl font-bold text-blue-600">{chats.length}</div>
          </div>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Não lidas</div>
              <div className="text-2xl font-bold text-gray-900">
                {chats.reduce((sum, chat) => sum + chat.unread_count_psicologo, 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Ativas hoje</div>
              <div className="text-2xl font-bold text-gray-900">
                {chats.filter(chat => {
                  const lastMessage = new Date(chat.last_message_at);
                  const today = new Date();
                  return lastMessage.toDateString() === today.toDateString();
                }).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total ativas</div>
              <div className="text-2xl font-bold text-gray-900">
                {chats.filter(chat => chat.is_active).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de conversas */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Conversas Recentes
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {chats.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500">Nenhuma conversa disponível no momento.</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedChat?.id === chat.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                }`}
                onClick={() => {
                  setSelectedChat(chat);
                  router.push(`/psicologos/chat/${chat.id}`);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {chat.app_user_name}
                      </h3>
                      <div className="ml-2 flex items-center space-x-2">
                        {chat.unread_count_psicologo > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {chat.unread_count_psicologo}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(chat.last_message_at)}
                        </span>
                      </div>
                    </div>
                    
                    {chat.last_message_content && (
                      <p className="mt-1 text-sm text-gray-600 truncate">
                        {chat.last_message_content}
                      </p>
                    )}
                    
                    {chat.tags && chat.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {chat.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex-shrink-0">
                    <button
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/psicologos/chat/${chat.id}`);
                      }}
                    >
                      Ver conversa →
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
