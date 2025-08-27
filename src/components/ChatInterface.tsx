'use client';

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import ChatStatusTag, { ChatStatus } from '@/components/ChatStatusTag';
import { getChatInfo, getChatMessages, sendMessage, updateChatStatus, markMessagesAsRead, ChatInfo, Message, Chat } from '@/services/chat';
import { useChatRealtime } from '@/hooks/useChatRealtime';

interface ChatInterfaceProps {
  chatId: string;
  onBack?: () => void;
  onClose?: () => void;
  onChatUpdate?: (chatId: string) => void; // Callback para atualizar a lista de chats
}

// Interface para mensagens agrupadas
interface GroupedMessages {
  date: string;
  dateLabel: string;
  messages: Message[];
}

export default function ChatInterface({ chatId, onBack, onClose, onChatUpdate }: ChatInterfaceProps) {
  const { profile } = useAuth();
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [newMessageReceived, setNewMessageReceived] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);
  const [isChatActive, setIsChatActive] = useState(true); // Controla se o chat está ativo/visível
  
  // Usar refs para armazenar as funções de callback e evitar recriações
  const handleNewMessageRef = useRef<(message: Message) => void>(() => {});
  const handleChatUpdateRef = useRef<(updatedChat: Chat) => void>(() => {});

  // Auto-scroll para a última mensagem (apenas para novas mensagens)
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Posicionar o scroll na última mensagem sem animação
  const positionAtBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // Forçar o scroll para o final
      container.scrollTop = container.scrollHeight;
      
      // Verificação adicional para garantir que o scroll foi aplicado
      if (container.scrollTop < container.scrollHeight - container.clientHeight) {
        // Se ainda não está no final, tentar novamente
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 0);
      }
    }
  };

  // Marcar mensagens como lidas quando o usuário realmente visualiza o chat
  const markMessagesAsReadWhenViewed = useCallback(async () => {
    if (!hasMarkedAsRead && messages.length > 0 && isChatActive) {
      try {
        console.log('📖 Marcando mensagens como lidas para o chat:', chatId);
        await markMessagesAsRead(chatId);
        setHasMarkedAsRead(true);
        console.log('✅ Mensagens marcadas como lidas após visualização');
        
        // Notificar a lista de chats para atualizar o contador
        if (onChatUpdate) {
          onChatUpdate(chatId);
        }
      } catch (error) {
        console.error('❌ Erro ao marcar mensagens como lidas:', error);
      }
    }
  }, [hasMarkedAsRead, messages.length, isChatActive, chatId, onChatUpdate]);

  // Handler para interação do usuário com o chat
  const handleUserInteraction = useCallback(() => {
    if (!hasMarkedAsRead && isChatActive) {
      markMessagesAsReadWhenViewed();
    }
  }, [hasMarkedAsRead, isChatActive, markMessagesAsReadWhenViewed]);

  // Detectar quando o chat se torna ativo/inativo
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsChatActive(isVisible);
      
      // Se o chat se tornou visível e há mensagens não lidas, marcá-las como lidas
      if (isVisible && !hasMarkedAsRead && messages.length > 0) {
        setTimeout(() => {
          markMessagesAsReadWhenViewed();
        }, 500);
      }
    };

    const handleFocus = () => {
      setIsChatActive(true);
      if (!hasMarkedAsRead && messages.length > 0) {
        setTimeout(() => {
          markMessagesAsReadWhenViewed();
        }, 500);
      }
    };

    const handleBlur = () => {
      setIsChatActive(false);
    };

    // Adicionar event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [hasMarkedAsRead, messages.length, chatId, onChatUpdate, markMessagesAsReadWhenViewed]);

  // Scroll suave para novas mensagens (não para carregamento inicial)
  useEffect(() => {
    if (!isInitialLoad && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, isInitialLoad]);

  // Posicionar scroll no final após carregamento inicial
  useLayoutEffect(() => {
    if (isInitialLoad && messages.length > 0) {
      positionAtBottom();
      setIsInitialLoad(false);
    }
  }, [messages.length, isInitialLoad]);

  // Marcar mensagens como lidas quando o usuário interage com o chat
  useEffect(() => {
    const handleInteraction = () => {
      handleUserInteraction();
    };

    // Adicionar listeners para interação do usuário
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('scroll', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('scroll', handleInteraction);
    };
  }, [handleUserInteraction]);

  // Marcar mensagens como lidas quando o usuário está ativo
  useEffect(() => {
    const handleActivity = () => {
      handleUserInteraction();
    };

    // Adicionar listeners para atividade do usuário
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, [handleUserInteraction]);

  // Função para agrupar mensagens por data
  const groupMessagesByDate = (messages: Message[]): GroupedMessages[] => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return Object.entries(groups).map(([date, messages]) => {
      const messageDate = new Date(date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateLabel = '';
      if (messageDate.toDateString() === today.toDateString()) {
        dateLabel = 'Hoje';
      } else if (messageDate.toDateString() === yesterday.toDateString()) {
        dateLabel = 'Ontem';
      } else {
        dateLabel = messageDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }

      return {
        date,
        dateLabel,
        messages: messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Carregar dados do chat e mensagens
  useEffect(() => {
    const loadChatData = async () => {
      try {
        setLoading(true);
        setError(null);
        setHasMarkedAsRead(false); // Reset flag quando carrega novo chat

        // TODO: Implementar chamadas à API
        // Por enquanto, dados simulados
        await new Promise(resolve => setTimeout(resolve, 500));

        // Carregar informações do chat
        const chatInfoResult = await getChatInfo(chatId);
        if (chatInfoResult.success && chatInfoResult.data) {
          setChatInfo(chatInfoResult.data);
        } else {
          setError(chatInfoResult.error || 'Erro ao carregar informações do chat');
          return;
        }

        // Carregar mensagens do chat
        const messagesResult = await getChatMessages(chatId);
        if (messagesResult.success && messagesResult.data) {
          // Adicionar chaves únicas para todas as mensagens carregadas
          const messagesWithUniqueKeys = messagesResult.data.map(message => ({
            ...message,
            _uniqueKey: `${message.id}-${Date.now()}-${Math.random()}`
          }));
          setMessages(messagesWithUniqueKeys);
        } else {
          setError(messagesResult.error || 'Erro ao carregar mensagens');
          return;
        }

        // NÃO marcar mensagens como lidas automaticamente aqui
        // Será marcado apenas quando o usuário realmente visualizar

      } catch (error) {
        console.error('Erro ao carregar chat:', error);
        setError('Erro ao carregar conversa. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    if (chatId) {
      loadChatData();
    }
  }, [chatId, profile?.id]);

  // Função para atualizar status do chat
  const handleStatusChange = async (newStatus: ChatStatus) => {
    try {
      const result = await updateChatStatus(chatId, newStatus);
      if (result.success) {
        // Atualizar o chat info local
        setChatInfo(prev => prev ? { ...prev, status: newStatus } : null);
        // Marcar mensagens como lidas quando o usuário interage com o chat
        handleUserInteraction();
      } else {
        console.error('Erro ao atualizar status:', result.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar status do chat:', error);
    }
  };

  // Enviar nova mensagem
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      const result = await sendMessage(chatId, newMessage.trim());
      
      if (result.success && result.data) {
        // Criar uma nova mensagem com timestamp único para evitar conflitos de key
        const newMessage = {
          ...result.data,
          _uniqueKey: `${result.data.id}-${Date.now()}-${Math.random()}`
        };
        
        setMessages(prev => [...prev, newMessage]);
        setNewMessage('');
        // Marcar mensagens como lidas quando o usuário envia uma mensagem
        handleUserInteraction();
        // Scroll suave para a nova mensagem enviada
        setTimeout(() => {
          scrollToBottom();
        }, 50);
      } else {
        console.error('Erro ao enviar mensagem:', result.error);
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  // Formatar hora da mensagem
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Função para lidar com nova mensagem em tempo real
  const handleNewMessage = useCallback((message: Message) => {
    console.log('💬 Nova mensagem recebida no ChatInterface:', message);
    console.log('🔍 ChatId atual no ChatInterface:', chatId);
    console.log('🔍 Mensagem chat_id:', message.chat_id);
    console.log('🔍 Chat ativo:', isChatActive);
    
    // Só adicionar a mensagem se ela pertence ao chat atual
    if (message.chat_id === chatId) {
      setMessages(prevMessages => {
        // Verificar se a mensagem já existe para evitar duplicatas
        const messageExists = prevMessages.some(m => m.id === message.id);
        if (!messageExists) {
          console.log('✅ Adicionando nova mensagem ao chat:', message.content);
          
          // Criar uma nova mensagem com timestamp único para evitar conflitos de key
          const newMessage = {
            ...message,
            _uniqueKey: `${message.id}-${Date.now()}-${Math.random()}`
          };
          
          // Ordenar mensagens por data de criação
          const updatedMessages = [...prevMessages, newMessage].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Mostrar indicador de nova mensagem se não for do psicólogo atual
          if (message.sender_type === 'app_user') {
            setNewMessageReceived(true);
            // Esconder o indicador após 3 segundos
            setTimeout(() => setNewMessageReceived(false), 3000);
          }
          
          return updatedMessages;
        }
        console.log('⚠️ Mensagem já existe, ignorando duplicata:', message.id);
        return prevMessages;
      });
      
      // Se a mensagem é do usuário e o chat está ativo, marcar como lida automaticamente
      if (message.sender_type === 'app_user' && isChatActive) {
        console.log('📖 Marcando nova mensagem como lida automaticamente (chat ativo)');
        setTimeout(async () => {
          try {
            await markMessagesAsRead(chatId);
            setHasMarkedAsRead(true);
            console.log('✅ Nova mensagem marcada como lida automaticamente');
            
            // Notificar a lista de chats para atualizar o contador
            if (onChatUpdate) {
              onChatUpdate(chatId);
            }
          } catch (error) {
            console.error('❌ Erro ao marcar nova mensagem como lida:', error);
          }
        }, 1000); // Pequeno delay para garantir que a mensagem foi processada
      }
    }
  }, [chatId, isChatActive, onChatUpdate]);

  // Atualizar as refs quando as funções mudam
  useEffect(() => {
    handleNewMessageRef.current = handleNewMessage;
  }, [handleNewMessage]);

  // Função para lidar com atualização de chat em tempo real
  const handleChatUpdate = useCallback((updatedChat: Chat) => {
    console.log('🔄 Chat atualizado no ChatInterface:', updatedChat);
    
    // Atualizar informações do chat se for o chat atual
    if (updatedChat.id === chatId) {
      setChatInfo(prev => prev ? { ...prev, ...updatedChat } : null);
    }
  }, [chatId]);

  // Atualizar as refs quando as funções mudam
  useEffect(() => {
    handleChatUpdateRef.current = handleChatUpdate;
  }, [handleChatUpdate]);

  // Configurar tempo real para este chat específico
  useChatRealtime({
    onNewMessage: (message: Message) => handleNewMessageRef.current?.(message),
    onChatUpdate: (updatedChat: Chat) => handleChatUpdateRef.current?.(updatedChat),
    onChatCreated: () => {}, // Adicionar handlers vazios para evitar warnings
    onChatDeleted: () => {},
    chatId: chatId
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Carregando conversa...</p>
        </div>
      </div>
    );
  }

  if (error || !chatInfo) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
        <p className="text-gray-600 mb-4">{error || 'Conversa não encontrada'}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // Agrupar mensagens por data
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="h-full flex flex-col bg-white chat-interface">
      {/* Cabeçalho da conversa */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <div className="flex items-center space-x-3">
              {/* Avatar do usuário */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                {chatInfo.masked_user_name.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {chatInfo.masked_user_name}
                </h1>
                <p className="text-sm text-gray-600">
                  Conversa iniciada em {new Date(chatInfo.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Tags de Status - Integradas na barra principal */}
            {chatInfo && (
              <ChatStatusTag
                status={chatInfo.status}
                onStatusChange={handleStatusChange}
                isEditable={true}
                variant="horizontal"
                className="mr-4"
              />
            )}

            {/* Botão X para fechar o chat */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                title="Fechar conversa (ESC)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Área de mensagens - com altura fixa e scroll independente */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white custom-scrollbar chat-messages-container relative" 
        style={{ 
          maxHeight: 'calc(100vh - 280px)',
          scrollBehavior: isInitialLoad ? 'auto' : 'smooth'
        }}
      >
        {/* Indicador de nova mensagem */}
        {newMessageReceived && (
          <div className="absolute top-4 right-4 z-10 bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce">
            💬 Nova mensagem!
          </div>
        )}
        {groupedMessages.map((group) => (
          <div key={group.date} className="space-y-4">
            {/* Separador de data */}
            <div className="flex justify-center">
              <div className="date-separator text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
                {group.dateLabel}
              </div>
            </div>
            
            {/* Mensagens do grupo */}
            {group.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'psicologo' ? 'justify-end' : 'justify-start'} message-enter`}
              >
                <div className={`relative max-w-xs lg:max-w-md xl:max-w-lg ${
                  message.sender_type === 'psicologo' ? 'order-2' : 'order-1'
                }`}>
                  <div
                    className={`px-4 py-3 pb-6 rounded-2xl shadow-sm ${
                      message.sender_type === 'psicologo'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.sender_type === 'psicologo' ? 'text-blue-100' : 'text-gray-400'
                      }`}
                    >
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                  
                  {/* Avatar do remetente posicionado no canto inferior */}
                  <div className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm border-2 border-white ${
                    message.sender_type === 'psicologo' 
                      ? 'bottom-2 right-2 transform translate-x-1/2 translate-y-1/2 gradient-green' 
                      : 'bottom-2 left-2 transform -translate-x-1/2 translate-y-1/2 gradient-blue'
                  }`}>
                    {message.sender_type === 'psicologo' 
                      ? 'P' 
                      : chatInfo.masked_user_name.charAt(0).toUpperCase()
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de envio de mensagem */}
      <div className="p-6 border-t border-gray-200 bg-white flex-shrink-0">
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div className="relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 text-black"
              rows={3}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            
            {/* Botão de envio flutuante */}
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="absolute bottom-3 right-3 p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-full transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Pressione Enter para enviar, Shift+Enter para nova linha
            </span>
            <span className="flex items-center space-x-4">
              <span className="hidden sm:inline">
                Pressione ESC para sair
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Online</span>
              </span>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
