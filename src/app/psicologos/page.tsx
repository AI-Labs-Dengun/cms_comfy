'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ChatInterface from '@/components/ChatInterface';
import ChatStatusTag, { ChatStatus } from '@/components/ChatStatusTag';
import { getChats, updateChatStatus, Chat as ChatType, Message, getChatMessages } from '@/services/chat';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { supabase } from '@/lib/supabase';

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
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [recentlyUpdatedChats, setRecentlyUpdatedChats] = useState<Set<string>>(new Set());
  const [pageIsVisible, setPageIsVisible] = useState(!document.hidden);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedChatMessages, setSelectedChatMessages] = useState<Message[]>([]);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [messagesLimit] = useState(20);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Debug temporário - remover depois
  console.log('🔍 PsicologosPage Debug:', {
    loading,
    error,
    chatsCount: chats.length,
    selectedChat: !!selectedChat,
    showChatList
  });

  // Função para processar novas mensagens no chat selecionado
  const handleNewMessageInSelectedChat = useCallback((message: Message) => {
    console.log('💬 Nova mensagem no chat selecionado:', message);
    
    setSelectedChatMessages(prevMessages => {
      // Verificar se a mensagem já existe para evitar duplicatas
      const messageExists = prevMessages.some(m => 
        m.id === message.id && 
        m.created_at === message.created_at &&
        m.content === message.content
      );
      
      if (!messageExists) {
        console.log('✅ Adicionando nova mensagem ao chat selecionado:', message.content);
        
        // Criar uma nova mensagem com chave única
        const newMessage = {
          ...message,
          _uniqueKey: `${message.id}-${message.created_at}-${message.content?.substring(0, 10)}-${prevMessages.length}`
        };
        
        // Ordenar mensagens por data de criação
        const updatedMessages = [...prevMessages, newMessage].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Mostrar indicador de nova mensagem se não for do psicólogo atual
        if (message.sender_type === 'app_user') {
          setShowNewMessageIndicator(true);
          // Esconder o indicador após 3 segundos
          setTimeout(() => setShowNewMessageIndicator(false), 3000);
        }
        
        return updatedMessages;
      }
      console.log('⚠️ Mensagem já existe no chat selecionado, ignorando duplicata:', message.id);
      return prevMessages;
    });
  }, []);

  // Função para atualizar um chat específico na lista
  const updateChatInList = useCallback(async (chatId: string) => {
    try {
      console.log('🔄 Atualizando chat na lista:', chatId);
      
      // Buscar a última mensagem diretamente da tabela de mensagens
      const { data: lastMessage, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (messageError && messageError.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar última mensagem:', messageError);
      }

      // Buscar mensagens não lidas do app_user para este chat
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId)
        .eq('sender_type', 'app_user')
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (unreadError) {
        console.error('❌ Erro ao buscar mensagens não lidas:', unreadError);
      }

      const unreadCount = unreadMessages ? unreadMessages.length : 0;
      console.log('📊 Mensagens não lidas encontradas:', unreadCount);

      // Buscar o chat completo
      const fullChatResult = await getChats();
      if (fullChatResult.success && fullChatResult.data) {
        const fullChat = fullChatResult.data.find(chat => chat.id === chatId);
        if (fullChat) {
          console.log('📊 Chat encontrado:', fullChat);
          console.log('📝 Última mensagem encontrada:', lastMessage);
          
          // Sanitizar os dados do chat com o contador correto de mensagens não lidas
          const sanitizedChat = {
            ...fullChat,
            unread_count_psicologo: unreadCount, // Usar contador real da base de dados
            masked_user_name: fullChat.masked_user_name || 'Utilizador',
            last_message_at: lastMessage ? lastMessage.created_at : (fullChat.last_message_at || new Date().toISOString()),
            last_message_content: lastMessage ? lastMessage.content : (fullChat.last_message_content || ''),
            last_message_sender_type: lastMessage ? lastMessage.sender_type : (fullChat.last_message_sender_type || 'app_user'),
            last_message_sender_name: lastMessage ? (lastMessage.sender_type === 'psicologo' ? 'Você' : fullChat.masked_user_name) : (fullChat.last_message_sender_name || (fullChat.last_message_sender_type === 'psicologo' ? 'Você' : fullChat.masked_user_name)),
            status: fullChat.status || 'novo_chat',
            is_active: fullChat.is_active !== undefined ? fullChat.is_active : true
          };
          
          console.log('📝 Chat sanitizado com última mensagem:', {
            id: sanitizedChat.id,
            last_message_content: sanitizedChat.last_message_content,
            last_message_at: sanitizedChat.last_message_at,
            sender: sanitizedChat.last_message_sender_name,
            unread_count: sanitizedChat.unread_count_psicologo
          });
          
          setChats(prevChats => {
            const existingIndex = prevChats.findIndex(chat => chat.id === chatId);
            if (existingIndex >= 0) {
              // Atualizar chat existente
              const updatedChats = [...prevChats];
              updatedChats[existingIndex] = sanitizedChat;
              console.log('✅ Chat atualizado na lista:', chatId, 'com última mensagem:', sanitizedChat.last_message_content, 'e', sanitizedChat.unread_count_psicologo, 'mensagens não lidas');
              return updatedChats;
            } else {
              // Adicionar novo chat
              console.log('➕ Novo chat adicionado à lista:', chatId);
              return [...prevChats, sanitizedChat];
            }
          });
        } else {
          console.log('❌ Chat não encontrado:', chatId);
        }
      } else {
        console.error('❌ Erro ao buscar chats:', fullChatResult.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar chat na lista:', error);
    }
  }, []);

  // Função para lidar com nova mensagem
  // Melhorias implementadas:
  // 1. Notificações do navegador quando a página está em background
  // 2. Notificações visuais na interface quando a página está visível mas chat não aberto
  // 3. Busca direta dos dados do chat na base de dados para garantir informações atualizadas
  // 4. Detecção de visibilidade da página para otimizar notificações
  const handleNewMessage = useCallback(async (message: Message) => {
    console.log('💬 Nova mensagem recebida:', message);
    setIsRealtimeActive(true);
    
    // Atualizar o chat correspondente à mensagem
    if (message.chat_id) {
      console.log('🔄 Atualizando chat', message.chat_id, 'com nova mensagem:', message.content);
      
      // Verificar se o chat está selecionado (aberto)
      const isChatSelected = selectedChat?.id === message.chat_id;
      
      // Atualizar imediatamente o chat na lista com a nova mensagem
      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(c => c.id === message.chat_id);
        if (chatIndex >= 0) {
          const updatedChats = [...prevChats];
          const chat = updatedChats[chatIndex];
          
          console.log('📝 Chat atual antes da atualização:', {
            id: chat.id,
            last_message_content: chat.last_message_content,
            last_message_at: chat.last_message_at,
            isSelected: isChatSelected
          });
          
          // Se o chat está selecionado (aberto), não incrementar o contador de não lidas
          const newUnreadCount = isChatSelected && message.sender_type === 'app_user' 
            ? (chat.unread_count_psicologo || 0) 
            : message.sender_type === 'app_user' 
              ? (chat.unread_count_psicologo || 0) + 1 
              : (chat.unread_count_psicologo || 0);
          
          // Atualizar o chat com a nova mensagem
          updatedChats[chatIndex] = {
            ...chat,
            last_message_at: message.created_at,
            last_message_content: message.content,
            last_message_sender_type: message.sender_type,
            last_message_sender_name: message.sender_type === 'psicologo' ? 'Você' : chat.masked_user_name,
            unread_count_psicologo: newUnreadCount
          };
          
          console.log('✅ Chat atualizado com nova mensagem:', {
            id: updatedChats[chatIndex].id,
            last_message_content: updatedChats[chatIndex].last_message_content,
            last_message_at: updatedChats[chatIndex].last_message_at,
            sender: updatedChats[chatIndex].last_message_sender_name,
            unread_count: updatedChats[chatIndex].unread_count_psicologo,
            isSelected: isChatSelected
          });
          
          return updatedChats;
        }
        return prevChats;
      });
      
      // Se o chat não está selecionado, atualizar via API para obter o contador correto
      if (!isChatSelected) {
        await updateChatInList(message.chat_id);
      } else {
        // Se o chat está selecionado, processar a mensagem no chat selecionado
        handleNewMessageInSelectedChat(message);
      }
      
      // Mostrar notificação sutil se a mensagem não for do psicólogo atual e o chat não estiver aberto
      // OU se a página não estiver visível (background)
      const shouldShowNotification = message.sender_type === 'app_user' && 
        (!isChatSelected || !pageIsVisible || document.hidden);
      
      if (shouldShowNotification) {
        // Buscar informações do chat diretamente da base de dados para garantir dados atualizados
        try {
          const { data: chatData, error: chatError } = await supabase
            .from('chats')
            .select('masked_user_name')
            .eq('id', message.chat_id)
            .single();

          if (!chatError && chatData) {
            // Criar notificação do navegador se permitido
            if ('Notification' in window && Notification.permission === 'granted') {
              const userName = chatData.masked_user_name || 'Utilizador';
              const messageContent = message.content || 'Nova mensagem';
              const preview = messageContent.length > 50 
                ? messageContent.substring(0, 50) + '...' 
                : messageContent;
              
                             console.log('🔔 Exibindo notificação para chat fechado:', {
                 userName,
                 preview,
                 chatId: message.chat_id,
                 pageVisible: pageIsVisible
               });
               
               // Notificação do navegador (sempre que possível)
               new Notification('Nova mensagem', {
                 body: `${userName}: ${preview}`,
                 icon: '/cms-logo.png',
                 tag: `chat-${message.chat_id}`, // Evitar notificações duplicadas
                 requireInteraction: false,
                 silent: false
               });

               // Notificação visual na interface (se a página estiver visível mas chat não aberto)
               if (pageIsVisible && !isChatSelected) {
                 setNotificationMessage(`${userName}: ${preview}`);
                 setShowNotification(true);
                 
                 // Esconder a notificação após 5 segundos
                 setTimeout(() => {
                   setShowNotification(false);
                 }, 5000);
               }
            } else if ('Notification' in window && Notification.permission === 'default') {
              // Se a permissão ainda não foi solicitada, solicitar
              console.log('🔔 Solicitando permissão para notificações...');
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  // Tentar novamente após obter permissão
                  const userName = chatData.masked_user_name || 'Utilizador';
                  const messageContent = message.content || 'Nova mensagem';
                  const preview = messageContent.length > 50 
                    ? messageContent.substring(0, 50) + '...' 
                    : messageContent;
                  
                  new Notification('Nova mensagem', {
                    body: `${userName}: ${preview}`,
                    icon: '/cms-logo.png',
                    tag: `chat-${message.chat_id}`,
                    requireInteraction: false,
                    silent: false
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error('❌ Erro ao buscar dados do chat para notificação:', error);
        }
      }
    }
    
    // Resetar o indicador após 3 segundos
    setTimeout(() => setIsRealtimeActive(false), 3000);
  }, [updateChatInList, chats, selectedChat, handleNewMessageInSelectedChat]);

  // Função para lidar com atualização de chat
  const handleChatUpdate = useCallback(async (updatedChat: Chat) => {
    console.log('🔄 Chat atualizado:', updatedChat);
    setIsRealtimeActive(true);
    
    // Buscar o contador real de mensagens não lidas da base de dados
    let realUnreadCount = 0;
    try {
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', updatedChat.id)
        .eq('sender_type', 'app_user')
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (unreadError) {
        console.error('❌ Erro ao buscar mensagens não lidas:', unreadError);
      } else {
        realUnreadCount = unreadMessages ? unreadMessages.length : 0;
        console.log('📊 Contador real de mensagens não lidas:', realUnreadCount);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar contador de mensagens não lidas:', error);
    }
    
    // Garantir que todos os campos obrigatórios estejam presentes
    const sanitizedChat = {
      ...updatedChat,
      unread_count_psicologo: realUnreadCount, // Usar contador real da base de dados
      masked_user_name: updatedChat.masked_user_name || 'Utilizador',
      last_message_at: updatedChat.last_message_at || new Date().toISOString(),
      last_message_content: updatedChat.last_message_content || '',
      last_message_sender_type: updatedChat.last_message_sender_type || 'app_user',
      last_message_sender_name: updatedChat.last_message_sender_name || (updatedChat.last_message_sender_type === 'psicologo' ? 'Você' : updatedChat.masked_user_name),
      status: updatedChat.status || 'novo_chat',
      is_active: updatedChat.is_active !== undefined ? updatedChat.is_active : true
    };
    
    console.log('📝 Chat sanitizado:', sanitizedChat);
    
    // Marcar chat como recentemente atualizado
    setRecentlyUpdatedChats(prev => new Set([...prev, sanitizedChat.id]));
    
    setChats(prevChats => {
      const existingIndex = prevChats.findIndex(chat => chat.id === sanitizedChat.id);
      if (existingIndex >= 0) {
        const updatedChats = [...prevChats];
        updatedChats[existingIndex] = sanitizedChat;
        console.log('✅ Chat atualizado na lista:', sanitizedChat.id, 'com última mensagem:', sanitizedChat.last_message_content, 'e', sanitizedChat.unread_count_psicologo, 'mensagens não lidas');
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
  const handleChatCreated = useCallback(async (newChat: Chat) => {
    console.log('🆕 Novo chat criado:', newChat);
    
    // Buscar o contador real de mensagens não lidas da base de dados
    let realUnreadCount = 0;
    try {
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', newChat.id)
        .eq('sender_type', 'app_user')
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (unreadError) {
        console.error('❌ Erro ao buscar mensagens não lidas:', unreadError);
      } else {
        realUnreadCount = unreadMessages ? unreadMessages.length : 0;
        console.log('📊 Contador real de mensagens não lidas para novo chat:', realUnreadCount);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar contador de mensagens não lidas:', error);
    }
    
    // Garantir que todos os campos obrigatórios estejam presentes
    const sanitizedChat = {
      ...newChat,
      unread_count_psicologo: realUnreadCount, // Usar contador real da base de dados
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

  // Configurar detecção de visibilidade da página
  usePageVisibility({
    onVisible: () => {
      console.log('👁️ Página ficou visível - atualizando chats...');
      setPageIsVisible(true);
      // Atualizar todos os chats quando a página ficar visível
      if (chats.length > 0) {
        chats.forEach(chat => {
          if (chat.id !== selectedChat?.id) {
            updateChatInList(chat.id);
          }
        });
      }
    },
    onHidden: () => {
      console.log('👁️ Página ficou oculta');
      setPageIsVisible(false);
    }
  });

  // Carregar chats disponíveis
  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Carregando chats...');
        const result = await getChats();
        
        if (result.success) {
          console.log('✅ Chats carregados com sucesso:', result.data?.length || 0);
          console.log('📊 Dados dos chats:', result.data);
          
          // Verificar se os chats têm last_message_content
          if (result.data) {
            result.data.forEach((chat, index) => {
              console.log(`Chat ${index + 1}:`, {
                id: chat.id,
                name: chat.masked_user_name,
                last_message_content: chat.last_message_content,
                last_message_at: chat.last_message_at,
                last_message_sender_type: chat.last_message_sender_type,
                last_message_sender_name: chat.last_message_sender_name
              });
            });
          }
          
          // Garantir que sempre temos um array, mesmo que vazio
          setChats(result.data || []);
        } else {
          console.error('❌ Erro ao carregar chats:', result.error);
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
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        console.log('🔔 Solicitando permissão para notificações...');
        Notification.requestPermission().then(permission => {
          console.log('🔔 Permissão de notificação:', permission);
        });
      } else if (Notification.permission === 'granted') {
        console.log('🔔 Notificações já permitidas');
      } else {
        console.log('🔔 Notificações bloqueadas pelo usuário');
      }
    }
  }, []);

  // Marcar mensagens como lidas quando um chat é selecionado
  useEffect(() => {
    if (selectedChat && selectedChat.unread_count_psicologo && selectedChat.unread_count_psicologo > 0) {
      console.log('📖 Chat selecionado tem mensagens não lidas, marcando como lidas...');
      // O ChatInterface irá marcar as mensagens como lidas automaticamente
    }
  }, [selectedChat]);

  // Atualizar contadores de mensagens não lidas periodicamente
  useEffect(() => {
    const updateUnreadCounts = async () => {
      if (chats.length > 0) {
        console.log('🔄 Atualizando contadores de mensagens não lidas...');
        for (const chat of chats) {
          // Não atualizar o chat selecionado aqui, pois ele será atualizado pelo ChatInterface
          if (chat.id !== selectedChat?.id) {
            await updateChatInList(chat.id);
          }
        }
      }
    };

    // Atualizar a cada 30 segundos para garantir sincronização
    const interval = setInterval(updateUnreadCounts, 30000);

    return () => clearInterval(interval);
  }, [chats, updateChatInList, selectedChat]);

  // Função para formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setShowChatList(false);
    
    // Resetar estado de paginação
    setMessagesOffset(0);
    setHasMoreMessages(true);
    setSelectedChatMessages([]);
    
    // Carregar primeiras mensagens do chat selecionado
    await loadMoreMessages(chat.id, 0, true);
    
    // Marcar mensagens como lidas imediatamente quando o chat é selecionado
    if (chat.unread_count_psicologo && chat.unread_count_psicologo > 0) {
      console.log('📖 Marcando mensagens como lidas ao selecionar chat:', chat.id);
      try {
        // Atualizar o chat na lista imediatamente para refletir que não há mais mensagens não lidas
        setChats(prevChats => 
          prevChats.map(c => 
            c.id === chat.id 
              ? { ...c, unread_count_psicologo: 0 }
              : c
          )
        );
        
        // Chamar a API para marcar como lidas no banco de dados
        setTimeout(async () => {
          await updateChatInList(chat.id);
        }, 500);
      } catch (error) {
        console.error('❌ Erro ao marcar mensagens como lidas ao selecionar chat:', error);
      }
    }
  };

  // Função para carregar mais mensagens
  const loadMoreMessages = async (chatId: string, offset: number, isInitialLoad: boolean = false) => {
    if (isLoadingMoreMessages) return;
    
    try {
      setIsLoadingMoreMessages(true);
      console.log(`📥 Carregando mensagens do chat ${chatId} (offset: ${offset}, limit: ${messagesLimit})`);
      
      // Capturar informações precisas do scroll ANTES de carregar novas mensagens
      let scrollInfo: {
        container: HTMLElement;
        scrollTop: number;
        scrollHeight: number;
        firstVisibleElement: Element | null;
        firstVisibleElementTop: number;
      } | null = null;
      
      if (!isInitialLoad) {
        const messagesContainer = messagesContainerRef.current || document.querySelector('.chat-messages-container') as HTMLElement;
        if (messagesContainer) {
          // Desabilitar scroll suave imediatamente
          messagesContainer.style.scrollBehavior = 'auto';
          
          // Capturar informações detalhadas do scroll
          scrollInfo = {
            container: messagesContainer,
            scrollTop: messagesContainer.scrollTop,
            scrollHeight: messagesContainer.scrollHeight,
            firstVisibleElement: null,
            firstVisibleElementTop: 0
          };
          
          // Encontrar o primeiro elemento visível para usar como referência
          const messages = messagesContainer.querySelectorAll('[data-message-id]');
          for (const message of messages) {
            const rect = message.getBoundingClientRect();
            const containerRect = messagesContainer.getBoundingClientRect();
            if (rect.top >= containerRect.top && rect.top <= containerRect.bottom) {
              scrollInfo.firstVisibleElement = message;
              scrollInfo.firstVisibleElementTop = rect.top - containerRect.top;
              break;
            }
          }
          
          console.log('📊 Capturado estado do scroll antes de carregar:', {
            scrollTop: scrollInfo.scrollTop,
            scrollHeight: scrollInfo.scrollHeight,
            firstVisibleElement: scrollInfo.firstVisibleElement ? scrollInfo.firstVisibleElement.getAttribute('data-message-id') : 'none'
          });
        }
      }
      
      const messagesResult = await getChatMessages(chatId, messagesLimit, offset);
      
      if (messagesResult.success && messagesResult.data) {
        const newMessages = messagesResult.data.map((message: Message, index: number) => ({
          ...message,
          _uniqueKey: `${message.id}-${message.created_at}-${offset + index}`
        }));
        
        if (isInitialLoad) {
          // Carregamento inicial - substituir todas as mensagens
          setSelectedChatMessages(newMessages);
          console.log('✅ Mensagens iniciais carregadas:', newMessages.length);
        } else {
          // Carregamento de mais mensagens - adicionar ao início
          setSelectedChatMessages(prevMessages => {
            // Combinar mensagens antigas com novas, evitando duplicatas
            const combinedMessages = [...newMessages, ...prevMessages];
            const uniqueMessages = combinedMessages.filter((message, index, self) => 
              index === self.findIndex(m => m.id === message.id)
            );
            return uniqueMessages;
          });
          console.log('✅ Mais mensagens carregadas:', newMessages.length);
          
          // Restaurar posição do scroll de forma precisa
          if (scrollInfo) {
            // Aguardar o React renderizar as novas mensagens
            setTimeout(() => {
              try {
                const container = scrollInfo!.container;
                
                if (scrollInfo!.firstVisibleElement) {
                  // Método 1: Usar o elemento visível como referência
                  const targetElement = container.querySelector(`[data-message-id="${scrollInfo!.firstVisibleElement.getAttribute('data-message-id')}"]`);
                  if (targetElement) {
                    const rect = targetElement.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const newScrollTop = container.scrollTop + (rect.top - containerRect.top) - scrollInfo!.firstVisibleElementTop;
                    
                    container.scrollTop = newScrollTop;
                    console.log('✅ Posição restaurada usando elemento de referência');
                    return;
                  }
                }
                
                // Método 2: Usar diferença de altura (fallback)
                const newScrollHeight = container.scrollHeight;
                const heightDifference = newScrollHeight - scrollInfo!.scrollHeight;
                
                if (heightDifference > 0) {
                  const newScrollTop = scrollInfo!.scrollTop + heightDifference;
                  container.scrollTop = newScrollTop;
                  console.log('✅ Posição restaurada usando diferença de altura:', {
                    oldPosition: scrollInfo!.scrollTop,
                    heightDifference,
                    newPosition: newScrollTop
                  });
                } else {
                  console.log('⚠️ Nenhum ajuste de scroll necessário');
                }
              } catch (error) {
                console.error('❌ Erro ao restaurar posição do scroll:', error);
              }
            }, 100); // Aguardar o React renderizar
          }
        }
        
        // Verificar se há mais mensagens para carregar
        setHasMoreMessages(newMessages.length === messagesLimit);
        setMessagesOffset(offset + newMessages.length);
        
      } else {
        console.error('❌ Erro ao carregar mensagens:', messagesResult.error);
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens do chat:', error);
      setHasMoreMessages(false);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  // Função para voltar à lista de chats (mobile)
  const handleBackToList = () => {
    setShowChatList(true);
  };

  // Função para sair do chat (limpar seleção)
  const handleCloseChat = async () => {
    // Se havia um chat selecionado, garantir que as mensagens foram marcadas como lidas
    if (selectedChat) {
      console.log('📖 Fechando chat, garantindo que mensagens foram marcadas como lidas:', selectedChat.id);
      try {
        await updateChatInList(selectedChat.id);
      } catch (error) {
        console.error('❌ Erro ao atualizar chat ao fechar:', error);
      }
    }
    setSelectedChat(null);
    setSelectedChatMessages([]); // Limpar mensagens do chat
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
    <div className="flex-1 flex bg-gray-50 min-h-0 h-screen relative">
      {/* Notificação visual para novas mensagens */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-right duration-300">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Nova mensagem</p>
              <p className="text-xs opacity-90 mt-1 line-clamp-2">{notificationMessage}</p>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="flex-shrink-0 text-white opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
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
                    {isRealtimeActive ? 'Atualizando...' : 'Online'}
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
                    
                    <div className="flex-1 min-w-0 flex flex-col">
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
                      
                      {(chat.last_message_content && chat.last_message_content.trim() !== '') ? (
                        <div className="mb-3 min-h-0">
                          <p className="text-sm text-gray-600 line-clamp-2 message-content break-words leading-relaxed">
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
                          {/* Debug temporário - remover depois */}
                          {process.env.NODE_ENV === 'development' && (
                            <div className="text-xs text-gray-400 mt-1">
                              Debug: {chat.last_message_sender_type} | {chat.last_message_content?.substring(0, 20)}...
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-3 min-h-0">
                          <p className="text-sm text-gray-400 italic">
                            Nenhuma mensagem ainda
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-auto">
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
            onChatUpdate={updateChatInList}
            onNewMessageReceived={handleNewMessageInSelectedChat}
            showNewMessageIndicator={showNewMessageIndicator}
            messages={selectedChatMessages}
            onLoadMoreMessages={() => loadMoreMessages(selectedChat.id, messagesOffset)}
            hasMoreMessages={hasMoreMessages}
            isLoadingMoreMessages={isLoadingMoreMessages}
            messagesContainerRef={messagesContainerRef}
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
