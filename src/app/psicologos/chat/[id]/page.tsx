'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

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

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const chatId = params.id as string;

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

  // Carregar dados do chat e mensagens
  useEffect(() => {
    const loadChatData = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Implementar chamadas à API
        // Por enquanto, dados simulados
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Chat info simulado
        const mockChatInfo: ChatInfo = {
          id: chatId,
          app_user_id: 'user1',
          app_user_name: 'João Silva',
          is_active: true,
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          tags: ['ansiedade', 'urgente']
        };

        // Mensagens simuladas
        const mockMessages: Message[] = [
          {
            id: '1',
            chat_id: chatId,
            sender_id: 'user1',
            sender_type: 'app_user',
            content: 'Olá, preciso de ajuda com ansiedade.',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            is_read: true,
            is_deleted: false
          },
          {
            id: '2',
            chat_id: chatId,
            sender_id: profile?.id || 'psicologo1',
            sender_type: 'psicologo',
            content: 'Olá! Como posso ajudá-lo hoje? Pode me contar um pouco mais sobre o que está sentindo?',
            created_at: new Date(Date.now() - 3300000).toISOString(),
            is_read: true,
            is_deleted: false
          },
          {
            id: '3',
            chat_id: chatId,
            sender_id: 'user1',
            sender_type: 'app_user',
            content: 'Tenho sentido muito nervoso ultimamente, principalmente antes de apresentações no trabalho. Meu coração acelera e fico com dificuldade para respirar.',
            created_at: new Date(Date.now() - 3000000).toISOString(),
            is_read: true,
            is_deleted: false
          },
          {
            id: '4',
            chat_id: chatId,
            sender_id: profile?.id || 'psicologo1',
            sender_type: 'psicologo',
            content: 'Entendo. Esses sintomas são muito comuns em casos de ansiedade de performance. Há quanto tempo isso vem acontecendo?',
            created_at: new Date(Date.now() - 2700000).toISOString(),
            is_read: true,
            is_deleted: false
          },
          {
            id: '5',
            chat_id: chatId,
            sender_id: 'user1',
            sender_type: 'app_user',
            content: 'Cerca de 3 meses. Começou depois que mudei de cargo.',
            created_at: new Date(Date.now() - 30000).toISOString(),
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
      await new Promise(resolve => setTimeout(resolve, 500));

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

  // Formatar data/hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" text="Carregando conversa..." />
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
        <div className="space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => router.back()}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Cabeçalho da conversa */}
      <div className="bg-white rounded-t-lg shadow-sm p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {chatInfo.app_user_name}
              </h1>
              <p className="text-sm text-gray-500">
                Conversa iniciada em {new Date(chatInfo.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Tags */}
          {chatInfo.tags && chatInfo.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chatInfo.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 bg-white overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_type === 'psicologo' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender_type === 'psicologo'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.sender_type === 'psicologo' ? 'text-blue-200' : 'text-gray-500'
                }`}
              >
                {formatDateTime(message.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de envio de mensagem */}
      <form onSubmit={handleSendMessage} className="bg-white rounded-b-lg shadow-sm p-4 border-t border-gray-200">
        <div className="flex space-x-4">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          </div>
          <div className="flex-shrink-0">
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-full"
            >
              {sending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Enviando</span>
                </div>
              ) : (
                'Enviar'
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </form>
    </div>
  );
}
