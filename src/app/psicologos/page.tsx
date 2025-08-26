'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ChatInterface from '@/components/ChatInterface';
import ChatStatusTag, { ChatStatus } from '@/components/ChatStatusTag';
import { getChats, updateChatStatus, Chat as ChatType, getChatInfo } from '@/services/chat';
import { useChatRealtime } from '@/hooks/useChatRealtime';

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
  const [activeFilters, setActiveFilters] = useState<ChatStatus[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [recentlyUpdatedChats, setRecentlyUpdatedChats] = useState<Set<string>>(new Set());

  // Debug temporário - remover depois
  console.log('🔍 PsicologosPage Debug:', {
    loading,
    error,
    chatsCount: chats.length,
    selectedChat: !!selectedChat,
    showChatList
  });

  // Função para atualizar um chat específico na lista
  const updateChatInList = useCallback(async (chatId: string) => {
    try {
      const result = await getChatInfo(chatId);
      if (result.success && result.data) {
        // Como getChatInfo retorna ChatInfo, precisamos buscar o chat completo
        const fullChatResult = await getChats();
        if (fullChatResult.success && fullChatResult.data) {
          const fullChat = fullChatResult.data.find(chat => chat.id === chatId);
          if (fullChat) {
            // Sanitizar os dados do chat
            const sanitizedChat = {
              ...fullChat,
              unread_count_psicologo: Number(fullChat.unread_count_psicologo) || 0,
              masked_user_name: fullChat.masked_user_name || 'Utilizador',
              last_message_at: fullChat.last_message_at || new Date().toISOString(),
              last_message_content: fullChat.last_message_content || '',
              last_message_sender_type: fullChat.last_message_sender_type || 'app_user',
              status: fullChat.status || 'novo_chat',
              is_active: fullChat.is_active !== undefined ? fullChat.is_active : true
            };
            
            setChats(prevChats => {
              const existingIndex = prevChats.findIndex(chat => chat.id === chatId);
              if (existingIndex >= 0) {
                // Atualizar chat existente
                const updatedChats = [...prevChats];
                updatedChats[existingIndex] = sanitizedChat;
                return updatedChats;
              } else {
                // Adicionar novo chat
                return [...prevChats, sanitizedChat];
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar chat na lista:', error);
    }
  }, []);

  // Função para lidar com nova mensagem
  const handleNewMessage = useCallback(async (message: any) => {
    console.log('💬 Nova mensagem recebida:', message);
    setLastUpdate(new Date());
    setIsRealtimeActive(true);
    
    // Atualizar o chat correspondente à mensagem
    if (message.chat_id) {
      await updateChatInList(message.chat_id);
      
      // Mostrar notificação sutil se a mensagem não for do psicólogo atual
      if (message.sender_type === 'app_user') {
        // Encontrar o chat na lista para mostrar o nome do usuário
        const chat = chats.find(c => c.id === message.chat_id);
        if (chat) {
          // Criar notificação do navegador se permitido
          if ('Notification' in window && Notification.permission === 'granted') {
            const userName = chat.masked_user_name || 'Utilizador';
            const messageContent = message.content || 'Nova mensagem';
            const preview = messageContent.length > 50 
              ? messageContent.substring(0, 50) + '...' 
              : messageContent;
            
            new Notification('Nova mensagem', {
              body: `${userName}: ${preview}`,
              icon: '/cms-logo.png'
            });
          }
        }
      }
    }
    
    // Resetar o indicador após 3 segundos
    setTimeout(() => setIsRealtimeActive(false), 3000);
  }, [updateChatInList, chats]);

  // Função para lidar com atualização de chat
  const handleChatUpdate = useCallback(async (updatedChat: Chat) => {
    console.log('🔄 Chat atualizado:', updatedChat);
    setLastUpdate(new Date());
    setIsRealtimeActive(true);
    
    // Garantir que todos os campos obrigatórios estejam presentes
    const sanitizedChat = {
      ...updatedChat,
      unread_count_psicologo: Number(updatedChat.unread_count_psicologo) || 0,
      masked_user_name: updatedChat.masked_user_name || 'Utilizador',
      last_message_at: updatedChat.last_message_at || new Date().toISOString(),
      last_message_content: updatedChat.last_message_content || '',
      last_message_sender_type: updatedChat.last_message_sender_type || 'app_user',
      status: updatedChat.status || 'novo_chat',
      is_active: updatedChat.is_active !== undefined ? updatedChat.is_active : true
    };
    
    // Marcar chat como recentemente atualizado
    setRecentlyUpdatedChats(prev => new Set([...prev, sanitizedChat.id]));
    
    setChats(prevChats => {
      const existingIndex = prevChats.findIndex(chat => chat.id === sanitizedChat.id);
      if (existingIndex >= 0) {
        const updatedChats = [...prevChats];
        updatedChats[existingIndex] = sanitizedChat;
        return updatedChats;
      }
      return prevChats;
    });

    // Se o chat selecionado foi atualizado, atualizar também
    if (selectedChat?.id === sanitizedChat.id) {
      setSelectedChat(sanitizedChat);
    }
    
    // Resetar o indicador após 3 segundos
    setTimeout(() => setIsRealtimeActive(false), 3000);
    
    // Remover da lista de chats recentemente atualizados após 5 segundos
    setTimeout(() => {
      setRecentlyUpdatedChats(prev => {
        const newSet = new Set(prev);
        newSet.delete(sanitizedChat.id);
        return newSet;
      });
    }, 5000);
  }, [selectedChat]);

  // Função para lidar com novo chat criado
  const handleChatCreated = useCallback((newChat: Chat) => {
    console.log('🆕 Novo chat criado:', newChat);
    
    // Garantir que todos os campos obrigatórios estejam presentes
    const sanitizedChat = {
      ...newChat,
      unread_count_psicologo: Number(newChat.unread_count_psicologo) || 0,
      masked_user_name: newChat.masked_user_name || 'Utilizador',
      last_message_at: newChat.last_message_at || new Date().toISOString(),
      last_message_content: newChat.last_message_content || '',
      last_message_sender_type: newChat.last_message_sender_type || 'app_user',
      status: newChat.status || 'novo_chat',
      is_active: newChat.is_active !== undefined ? newChat.is_active : true
    };
    
    setChats(prevChats => {
      // Verificar se o chat já existe na lista
      const exists = prevChats.some(chat => chat.id === sanitizedChat.id);
      if (!exists) {
        return [sanitizedChat, ...prevChats];
      }
      return prevChats;
    });
  }, []);

  // Função para lidar com chat deletado
  const handleChatDeleted = useCallback((chatId: string) => {
    console.log('🗑️ Chat deletado:', chatId);
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    
    // Se o chat selecionado foi deletado, limpar seleção
    if (selectedChat?.id === chatId) {
      setSelectedChat(null);
      setShowChatList(true);
    }
  }, [selectedChat]);

  // Configurar tempo real
  useChatRealtime({
    onChatUpdate: handleChatUpdate,
    onNewMessage: handleNewMessage,
    onChatCreated: handleChatCreated,
    onChatDeleted: handleChatDeleted
  });

  // Carregar chats disponíveis
  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getChats();
        
        if (result.success) {
          // Garantir que sempre temos um array, mesmo que vazio
          setChats(result.data || []);
        } else {
          // Se o erro for sobre tabela não existir, mostrar mensagem específica
          if (result.error && result.error.includes('relation') && result.error.includes('does not exist')) {
            setError('Sistema de chat ainda não foi configurado. Entre em contacto com o administrador.');
          } else if (result.error && result.error.includes('GROUP BY')) {
            setError('Erro na configuração do banco de dados. Entre em contacto com o administrador.');
          } else {
            setError(result.error || 'Erro ao carregar conversas. Tente novamente.');
          }
        }
        
      } catch (error) {
        console.error('Erro ao carregar chats:', error);
        // Verificar se é um erro de tabela não existir
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
          setError('Sistema de chat ainda não foi configurado. Entre em contacto com o administrador.');
        } else if (errorMessage.includes('GROUP BY')) {
          setError('Erro na configuração do banco de dados. Entre em contacto com o administrador.');
        } else {
          setError('Erro ao carregar conversas. Tente novamente.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  // Solicitar permissão de notificação
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
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
      // Mostrar apenas o horário (HH:MM)
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
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

  // Função para formatar nome do remetente
  const formatSenderName = (chat: Chat) => {
    if (chat.last_message_sender_type === 'psicologo') {
      return 'Você';
    }
    
    // Para usuários, usar o nome mascarado
    return chat.masked_user_name || 'Utilizador';
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

  // Função para alternar filtros
  const toggleFilter = (status: ChatStatus) => {
    setActiveFilters(prev => 
      prev.includes(status) 
        ? prev.filter(f => f !== status)
        : [...prev, status]
    );
  };

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setActiveFilters([]);
  };

  // Filtrar chats baseado nos filtros ativos
  const filteredChats = activeFilters.length > 0 
    ? chats.filter(chat => activeFilters.includes(chat.status))
    : chats;

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
        <div className="p-4 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Conversas
              </h1>
              <div className="flex items-center space-x-2 mt-0.5">
                <p className="text-xs text-gray-500">
                  {filteredChats.length} de {chats.length} ativas
                </p>
                {/* Indicador de tempo real */}
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    isRealtimeActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-xs text-gray-400">
                    {isRealtimeActive ? 'Ativo' : 'Online'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Estatísticas rápidas */}
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-1">Não lidas</div>
              <div className="text-2xl font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200">
                {chats.reduce((sum, chat) => sum + (chat.unread_count_psicologo || 0), 0)}
              </div>
            </div>
          </div>

          {/* Filtros de Status - Minimalista */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Filtros</span>
              {activeFilters.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {(['novo_chat', 'a_decorrer', 'follow_up', 'encerrado'] as ChatStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => toggleFilter(status)}
                  className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                    activeFilters.includes(status)
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  } ${
                    status === 'novo_chat' ? activeFilters.includes(status) ? 'bg-green-500' : 'bg-green-50' :
                    status === 'a_decorrer' ? activeFilters.includes(status) ? 'bg-blue-500' : 'bg-blue-50' :
                    status === 'follow_up' ? activeFilters.includes(status) ? 'bg-purple-500' : 'bg-purple-50' :
                    activeFilters.includes(status) ? 'bg-red-500' : 'bg-red-50'
                  }`}
                >
                  {status === 'novo_chat' ? 'Novo chat' :
                   status === 'a_decorrer' ? 'A decorrer' :
                   status === 'follow_up' ? 'Follow up' :
                   'Encerrado'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de conversas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">
                {activeFilters.length > 0 
                  ? 'Nenhuma conversa encontrada com os filtros selecionados.' 
                  : chats.length === 0 
                    ? 'Ainda não existem conversas disponíveis. Os chats aparecerão aqui quando os utilizadores iniciarem conversas.'
                    : 'Nenhuma conversa disponível.'}
              </p>
              {activeFilters.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredChats.filter(chat => chat && chat.id).map((chat) => (
                <div
                  key={chat.id}
                  className={`p-6 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                    selectedChat?.id === chat.id ? 'bg-blue-50 border-r-4 border-blue-500 shadow-sm' : ''
                  } ${
                    recentlyUpdatedChats.has(chat.id) ? 'bg-green-50 border-l-4 border-green-500 animate-pulse' : ''
                  }`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Avatar do usuário */}
                    <div className="flex-shrink-0 relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {(chat.masked_user_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      {(chat.unread_count_psicologo || 0) > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                      )}
                      {recentlyUpdatedChats.has(chat.id) && (chat.unread_count_psicologo || 0) === 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-ping"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-sm font-semibold truncate ${
                            (chat.unread_count_psicologo || 0) > 0 
                              ? 'text-gray-900 font-bold' 
                              : 'text-gray-700'
                          }`}>
                            {chat.masked_user_name || 'Utilizador'}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {(chat.unread_count_psicologo || 0) > 0 && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm animate-pulse">
                                {chat.unread_count_psicologo || 0}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 font-medium">
                              {chat.last_message_at ? formatDate(chat.last_message_at) : '--'}
                            </span>
                          </div>
                        </div>
                      
                      {chat.last_message_content && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            <span className={`font-medium ${
                              chat.last_message_sender_type === 'psicologo' 
                                ? 'text-blue-600' 
                                : 'text-gray-700'
                            }`}>
                              {formatSenderName(chat)}:
                            </span>
                            <span className="text-gray-600 ml-1">
                              {chat.last_message_content}
                            </span>
                          </p>
                        </div>
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
