'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

// Tipos para as mensagens
interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'psicologo' | 'app_user';
  content: string;
  created_at: string;
  is_read: boolean;
  is_deleted: boolean;
}

interface ChatInfo {
  id: string;
  app_user_id: string;
  app_user_name: string;
  is_active: boolean;
  created_at: string;
  tags?: string[];
}

interface ChatInterfaceProps {
  chatId: string;
  onBack?: () => void;
  onClose?: () => void;
}

// Interface para mensagens agrupadas
interface GroupedMessages {
  date: string;
  dateLabel: string;
  messages: Message[];
}

export default function ChatInterface({ chatId, onBack, onClose }: ChatInterfaceProps) {
  const { profile } = useAuth();
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detectar tecla ESC para fechar o chat
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Função para agrupar mensagens por data
  const groupMessagesByDate = (messages: Message[]): GroupedMessages[] => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at);
      const dateKey = date.toDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return Object.keys(groups).map(dateKey => {
      const date = new Date(dateKey);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateLabel = '';
      if (date.toDateString() === today.toDateString()) {
        dateLabel = 'Hoje';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateLabel = 'Ontem';
      } else {
        // Para outras datas, mostrar dia da semana + data completa
        // Exemplo: "Sexta-feira, 22/08/2025"
        const weekday = date.toLocaleDateString('pt-BR', {
          weekday: 'long'
        });
        const fullDate = date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        dateLabel = `${weekday}, ${fullDate}`;
      }

      return {
        date: dateKey,
        dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
        messages: groups[dateKey].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Carregar dados do chat e mensagens
  useEffect(() => {
    const loadChatData = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Implementar chamadas à API
        // Por enquanto, dados simulados
        await new Promise(resolve => setTimeout(resolve, 500));

        // Chat info simulado
        const mockChatInfo: ChatInfo = {
          id: chatId,
          app_user_id: 'user1',
          app_user_name: 'João Silva',
          is_active: true,
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          tags: ['ansiedade', 'urgente']
        };

        // Mensagens simuladas com diferentes datas
        const mockMessages: Message[] = [
          {
            id: '1',
            chat_id: chatId,
            sender_id: 'user1',
            sender_type: 'app_user',
            content: 'Olá, preciso de ajuda com ansiedade.',
            created_at: new Date(Date.now() - 86400000 * 7 - 3600000).toISOString(), // 1 semana atrás
            is_read: true,
            is_deleted: false
          },
          {
            id: '2',
            chat_id: chatId,
            sender_id: profile?.id || 'psicologo1',
            sender_type: 'psicologo',
            content: 'Olá! Como posso ajudá-lo hoje? Pode me contar um pouco mais sobre o que está sentindo?',
            created_at: new Date(Date.now() - 86400000 * 7 - 3300000).toISOString(), // 1 semana atrás
            is_read: true,
            is_deleted: false
          },
          {
            id: '3',
            chat_id: chatId,
            sender_id: 'user1',
            sender_type: 'app_user',
            content: 'Tenho sentido muito nervoso ultimamente, principalmente antes de apresentações no trabalho. Meu coração acelera e fico com dificuldade para respirar.',
            created_at: new Date(Date.now() - 86400000 * 5 - 3000000).toISOString(), // 5 dias atrás
            is_read: true,
            is_deleted: false
          },
          {
            id: '4',
            chat_id: chatId,
            sender_id: profile?.id || 'psicologo1',
            sender_type: 'psicologo',
            content: 'Entendo. Esses sintomas são muito comuns em casos de ansiedade de performance. Há quanto tempo isso vem acontecendo?',
            created_at: new Date(Date.now() - 86400000 * 5 - 2700000).toISOString(), // 5 dias atrás
            is_read: true,
            is_deleted: false
          },
          {
            id: '5',
            chat_id: chatId,
            sender_id: 'user1',
            sender_type: 'app_user',
            content: 'Cerca de 3 meses. Começou depois que mudei de cargo.',
            created_at: new Date(Date.now() - 86400000 - 3000000).toISOString(), // ontem
            is_read: true,
            is_deleted: false
          },
          {
            id: '6',
            chat_id: chatId,
            sender_id: profile?.id || 'psicologo1',
            sender_type: 'psicologo',
            content: 'Entendo. Vamos trabalhar juntos para gerenciar essa ansiedade. Que tal começarmos com algumas técnicas de respiração?',
            created_at: new Date(Date.now() - 86400000 - 2700000).toISOString(), // ontem
            is_read: true,
            is_deleted: false
          },
          {
            id: '7',
            chat_id: chatId,
            sender_id: 'user1',
            sender_type: 'app_user',
            content: 'Sim, gostaria muito de aprender essas técnicas.',
            created_at: new Date(Date.now() - 30000).toISOString(), // hoje
            is_read: false,
            is_deleted: false
          },
          {
            id: '8',
            chat_id: chatId,
            sender_id: profile?.id || 'psicologo1',
            sender_type: 'psicologo',
            content: 'Perfeito! Vamos começar com a técnica da respiração 4-7-8. Inspire pelo nariz contando até 4, segure por 7 segundos e expire pela boca contando até 8.',
            created_at: new Date(Date.now() - 10000).toISOString(), // hoje
            is_read: false,
            is_deleted: false
          }
        ];

        setChatInfo(mockChatInfo);
        setMessages(mockMessages);

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

  // Enviar nova mensagem
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      // TODO: Implementar chamada à API
      await new Promise(resolve => setTimeout(resolve, 300));

      const message: Message = {
        id: Date.now().toString(),
        chat_id: chatId,
        sender_id: profile?.id || 'psicologo1',
        sender_type: 'psicologo',
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        is_read: false,
        is_deleted: false
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

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
                {chatInfo.app_user_name.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {chatInfo.app_user_name}
                </h1>
                <p className="text-sm text-gray-600">
                  Conversa iniciada em {new Date(chatInfo.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Tags */}
            {chatInfo.tags && chatInfo.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chatInfo.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
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
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white custom-scrollbar chat-messages-container" style={{ maxHeight: 'calc(100vh - 280px)' }}>
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
                      : chatInfo.app_user_name.charAt(0).toUpperCase()
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
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
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
