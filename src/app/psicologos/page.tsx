'use client';

import React, { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ChatInterface from '@/components/ChatInterface';
import ChatStatusTag, { ChatStatus } from '@/components/ChatStatusTag';
import { getChats, updateChatStatus, Chat as ChatType } from '@/services/chat';

// Tipos para os chats
interface Chat extends ChatType {
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

        const result = await getChats();
        
        if (result.success && result.data) {
          setChats(result.data);
        } else {
          setError(result.error || 'Erro ao carregar conversas. Tente novamente.');
        }
        
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

  // Função para sair do chat (limpar seleção)
  const handleCloseChat = () => {
    setSelectedChat(null);
    setShowChatList(true);
  };

  // Função para atualizar o status de um chat
  const handleStatusChange = async (chatId: string, newStatus: ChatStatus) => {
    try {
      const result = await updateChatStatus(chatId, newStatus);
      
      if (result.success) {
        // Atualizar o chat na lista local
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === chatId 
              ? { ...chat, status: newStatus }
              : chat
          )
        );
        
        // Se o chat selecionado foi atualizado, atualizar também
        if (selectedChat?.id === chatId) {
          setSelectedChat(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        console.error('Erro ao atualizar status:', result.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar status do chat:', error);
    }
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
                      
                      <div className="flex items-center justify-between">
                        {/* Tags de status */}
                        <ChatStatusTag
                          status={chat.status}
                          onStatusChange={(newStatus) => handleStatusChange(chat.id, newStatus)}
                          isEditable={true}
                          className="mr-2"
                        />
                        
                        {/* Tags adicionais */}
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
            onClose={handleCloseChat}
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
