'use client';

import React, { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ChatInterface from '@/components/ChatInterface';

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
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChatList, setShowChatList] = useState(true);

  // Debug temporário - remover depois
  console.log('🔍 PsicologosPage Debug:', {
    loading,
    error,
    chatsCount: chats.length,
    selectedChat: !!selectedChat,
    showChatList
  });

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
            last_message_at: new Date(Date.now() - 30000).toISOString(), // Hoje - 30 segundos atrás
            last_message_content: 'Olá, preciso de ajuda...',
            unread_count_psicologo: 2,
            is_active: true,
            tags: ['ansiedade', 'urgente']
          },
          {
            id: '2',
            app_user_id: 'user2',
            app_user_name: 'Maria Santos',
            last_message_at: new Date(Date.now() - 300000).toISOString(), // Hoje - 5 minutos atrás
            last_message_content: 'Obrigada pela sessão de hoje.',
            unread_count_psicologo: 0,
            is_active: true,
            tags: ['depressão']
          },
          {
            id: '3',
            app_user_id: 'user3',
            app_user_name: 'Pedro Costa',
            last_message_at: new Date(Date.now() - 86400000).toISOString(), // Ontem
            last_message_content: 'Consegui aplicar as técnicas que discutimos.',
            unread_count_psicologo: 1,
            is_active: true,
            tags: ['progresso']
          },
          {
            id: '4',
            app_user_id: 'user4',
            app_user_name: 'Ana Oliveira',
            last_message_at: new Date(Date.now() - 172800000).toISOString(), // 2 dias atrás
            last_message_content: 'Vou marcar uma nova consulta.',
            unread_count_psicologo: 0,
            is_active: true,
            tags: ['acompanhamento']
          },
          {
            id: '5',
            app_user_id: 'user5',
            app_user_name: 'Carlos Ferreira',
            last_message_at: new Date(Date.now() - 604800000).toISOString(), // 1 semana atrás
            last_message_content: 'Muito obrigado pelo apoio.',
            unread_count_psicologo: 0,
            is_active: true,
            tags: ['finalização']
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
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Verificar se é hoje
    if (date.toDateString() === today.toDateString()) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffInMinutes < 1) return 'Agora';
      if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
      return `${Math.floor(diffInMinutes / 60)}h atrás`;
    }

    // Verificar se é ontem
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }

    // Para outras datas, mostrar DD/MM/YYYY
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Função para selecionar um chat
  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setShowChatList(false);
  };

  // Função para voltar à lista de chats (mobile)
  const handleBackToList = () => {
    setShowChatList(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center bg-gray-50">
        <LoadingSpinner size="lg" text="Carregando conversas..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex justify-center items-center bg-gray-50">
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
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-gray-50 min-h-0 h-screen">
      {/* Coluna da lista de chats - visível sempre no desktop, condicional no mobile */}
      <div className={`w-full lg:w-96 lg:flex-shrink-0 bg-white border-r border-gray-200 flex flex-col ${
        showChatList ? 'flex' : 'hidden lg:flex'
      }`}>
        {/* Cabeçalho da lista */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Conversas
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {chats.length} conversa{chats.length !== 1 ? 's' : ''} ativa{chats.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Estatísticas rápidas */}
            <div className="text-right">
              <div className="text-xs text-gray-500 font-medium">Não lidas</div>
              <div className="text-2xl font-bold text-red-600">
                {chats.reduce((sum, chat) => sum + chat.unread_count_psicologo, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de conversas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {chats.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Nenhuma conversa disponível.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-6 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                    selectedChat?.id === chat.id ? 'bg-blue-50 border-r-4 border-blue-500 shadow-sm' : ''
                  }`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Avatar do usuário */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {chat.app_user_name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {chat.app_user_name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {chat.unread_count_psicologo > 0 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {chat.unread_count_psicologo}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 font-medium">
                            {formatDate(chat.last_message_at)}
                          </span>
                        </div>
                      </div>
                      
                      {chat.last_message_content && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {chat.last_message_content}
                        </p>
                      )}
                      
                      {chat.tags && chat.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {chat.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Área do chat - visível sempre no desktop, condicional no mobile */}
      <div className={`flex-1 flex flex-col min-h-0 h-full ${
        !showChatList ? 'flex' : 'hidden lg:flex'
      }`}>
        {selectedChat ? (
          <ChatInterface 
            chatId={selectedChat.id} 
            onBack={handleBackToList}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center max-w-md">
              <div className="text-gray-400 mb-6">
                <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Selecione uma conversa
              </h2>
              <p className="text-gray-600 text-lg">
                Escolha uma conversa da lista para começar a responder e ajudar seus pacientes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
