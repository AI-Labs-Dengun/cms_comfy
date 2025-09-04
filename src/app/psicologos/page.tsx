'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ChatInterface from '@/components/ChatInterface';
import ChatStatusTag, { ChatStatus } from '@/components/ChatStatusTag';
import PsicologoAssignedTag from '@/components/PsicologoAssignedTag';
import { getChats, updateChatStatus, Chat as ChatType, Message, getChatMessages } from '@/services/chat';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { EncryptionService } from '@/services/encryption';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// Estilos CSS personalizados
const customStyles = `
  .chat-card-hover {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
  }
  
  .chat-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    z-index: 5;
  }
  
  .filter-button-active {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .notification-slide-in {
    animation: slideInRight 0.3s ease-out;
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .avatar-pulse {
    animation: avatarPulse 2s infinite;
  }
  
  @keyframes avatarPulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    50% {
      box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
    }
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.8);
  }
  
  /* Garantir que cards de chat nunca sobreponham dropdowns */
  .chat-card-container {
    z-index: 1 !important;
  }
  
  .chat-card-container:hover {
    z-index: 5 !important;
  }
  
  /* Dropdowns sempre no topo */
  .dropdown-overlay {
    z-index: 9998 !important;
  }
  
  .dropdown-menu {
    z-index: 9999 !important;
  }
`;

// Tipos para os chats
interface Chat extends ChatType {
  tags?: string[];
}

// Tipos para os filtros de associação
type AssignmentFilter = 'all' | 'available' | 'assigned_to_me';

export default function PsicologosPage() {
  const { profile, user, isAuthenticated } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  
  // Cache persistente para chats
  const CHATS_CACHE_KEY = 'psicologos_chats_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const [activeFilters, setActiveFilters] = useState<ChatStatus[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [recentlyUpdatedChats, setRecentlyUpdatedChats] = useState<Set<string>>(new Set());
  const [pageIsVisible] = useState(!document.hidden);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedChatMessages, setSelectedChatMessages] = useState<Message[]>([]);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [messagesLimit] = useState(20);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isInitialChatLoad, setIsInitialChatLoad] = useState(false);
  const [isRefreshingChats, setIsRefreshingChats] = useState(false);

  // Log para debug quando o chat selecionado muda
  useEffect(() => {
    if (selectedChat?.id) {
      console.log('🔄 Chat selecionado mudou:', selectedChat.id);
      
      // ✅ TESTE DE ENCRIPTAÇÃO para debug
      try {
        const testMessage = "Teste de encriptação";
        const encrypted = EncryptionService.encryptMessage(testMessage, selectedChat.id);
        const decrypted = EncryptionService.decryptMessage(encrypted, selectedChat.id);
        
        console.log('🧪 TESTE DE ENCRIPTAÇÃO:', {
          original: testMessage,
          encrypted: encrypted,
          decrypted: decrypted,
          success: testMessage === decrypted,
          isEncrypted: EncryptionService.isDefinitelyEncrypted(encrypted)
        });
      } catch (error) {
        console.error('❌ ERRO NO TESTE DE ENCRIPTAÇÃO:', error);
      }
    }
  }, [selectedChat?.id]);

  // Função para processar novas mensagens no chat selecionado - OTIMIZADA
  const handleNewMessageInSelectedChat = useCallback((message: Message) => {
    console.log('💬 Nova mensagem no chat selecionado:', message);
    console.log('🔍 handleNewMessageInSelectedChat chamada - detalhes:', {
      messageId: message.id,
      chatId: message.chat_id,
      content: message.content,
      senderType: message.sender_type,
      timestamp: message.created_at
    });
    
    // ✅ OTIMIZAÇÃO: A mensagem já foi processada no handleNewMessage
    // Apenas verificar se ainda precisa de desencriptação (caso raro)
    let processedMessage = message;
    if (selectedChat?.id && message.chat_id === selectedChat.id) {
      try {
        // Verificar se a mensagem ainda parece estar encriptada (caso raro)
        const isStillEncrypted = EncryptionService.isDefinitelyEncrypted(message.content);
        
        if (isStillEncrypted) {
          console.log('⚠️ Mensagem ainda parece encriptada, forçando desencriptação adicional:', message.content);
          
          // Forçar desencriptação adicional
          const decryptedContent = EncryptionService.processMessageForDisplay(message.content, selectedChat.id);
          processedMessage = {
            ...message,
            content: decryptedContent
          };
          
          console.log('✅ Desencriptação adicional realizada:', {
            originalContent: message.content,
            processedContent: processedMessage.content
          });
        } else {
          console.log('✅ Mensagem já está desencriptada corretamente (otimização funcionando)');
        }
      } catch (error) {
        console.error('❌ Erro ao verificar/processar mensagem:', error);
        processedMessage = message; // Manter mensagem original em caso de erro
      }
    } else {
      console.log('⚠️ Mensagem não processada - chat não selecionado ou diferente');
    }
    
    setSelectedChatMessages(prevMessages => {
      // Verificar se a mensagem já existe para evitar duplicatas
      const messageExists = prevMessages.some(m => 
        m.id === processedMessage.id && 
        m.created_at === processedMessage.created_at &&
        m.content === processedMessage.content
      );
      
      if (!messageExists) {
        console.log('✅ Adicionando nova mensagem ao chat selecionado:', processedMessage.content);
        
        // Criar uma nova mensagem com chave única
        const newMessage = {
          ...processedMessage,
          _uniqueKey: `${processedMessage.id}-${processedMessage.created_at}-${processedMessage.content?.substring(0, 10)}-${prevMessages.length}`
        };
        
        // Ordenar mensagens por data de criação
        const updatedMessages = [...prevMessages, newMessage].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Mostrar indicador de nova mensagem APENAS se:
        // 1. A mensagem não é do psicólogo atual
        // 2. E a página não está visível (está em background/minimizada)
        if (processedMessage.sender_type === 'app_user' && (!pageIsVisible || document.hidden)) {
          console.log('🔔 Mostrando indicador de nova mensagem no chat (página não visível)');
          setShowNewMessageIndicator(true);
          // Esconder o indicador após 3 segundos
          setTimeout(() => setShowNewMessageIndicator(false), 3000);
        } else if (processedMessage.sender_type === 'app_user') {
          console.log('⚠️ Não mostrando indicador - chat está visível e ativo');
        }
        
        return updatedMessages;
      }
      console.log('⚠️ Mensagem já existe no chat selecionado, ignorando duplicata:', processedMessage.id);
      return prevMessages;
          });
  }, [pageIsVisible, selectedChat?.id]);

  // ✅ Função utilitária para desencriptar mensagens
  const decryptMessageContent = useCallback((content: string, chatId: string): string => {
    if (!content || content.length === 0) {
      return content;
    }
    
    try {
      console.log('🔓 Desencriptando conteúdo:', {
        chatId: chatId,
        originalContent: content
      });
      
      const decryptedContent = EncryptionService.processMessageForDisplay(content, chatId);
      
      console.log('✅ Conteúdo desencriptado:', {
        chatId: chatId,
        originalContent: content,
        decryptedContent: decryptedContent,
        wasEncrypted: content !== decryptedContent
      });
      
      return decryptedContent;
    } catch (error) {
      console.error('❌ Erro ao desencriptar conteúdo:', error);
      return content; // Retornar original em caso de erro
    }
  }, []);

  // Função para atualizar um chat específico na lista
  // ⚠️ NOTA: Esta função agora é usada principalmente para:
  // - Atualizações de status de chat
  // - Sincronização manual (botão refresh)
  // - Correções de dados inconsistentes
  // - Atualizações de outros campos do chat
  // 
  // Para mensagens novas, use a otimização no handleNewMessage
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

      // ✅ DESENCRIPTAR a última mensagem se existir
      const decryptedLastMessageContent = lastMessage ? decryptMessageContent(lastMessage.content, chatId) : '';

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
          
          // Sanitizar os dados do chat com o contador correto de mensagens não lidas
          const sanitizedChat = {
            ...fullChat,
            unread_count_psicologo: unreadCount, // Usar contador real da base de dados
            masked_user_name: fullChat.masked_user_name || 'Utilizador',
            last_message_at: lastMessage ? lastMessage.created_at : (fullChat.last_message_at || new Date().toISOString()),
            last_message_content: lastMessage ? decryptedLastMessageContent : (fullChat.last_message_content || ''), // ✅ Usar conteúdo desencriptado
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
            let updatedChats;
            if (existingIndex >= 0) {
              // Atualizar chat existente
              updatedChats = [...prevChats];
              updatedChats[existingIndex] = sanitizedChat;
            } else {
              // Adicionar novo chat
              console.log('➕ Novo chat adicionado à lista:', chatId);
              updatedChats = [...prevChats, sanitizedChat];
            }
            
            // Atualizar cache
            try {
              sessionStorage.setItem(CHATS_CACHE_KEY, JSON.stringify({
                data: updatedChats,
                timestamp: Date.now()
              }));
            } catch (error) {
              console.error('❌ Erro ao atualizar cache após modificação:', error);
            }
            
            return updatedChats;
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

  // Função para lidar com nova mensagem - OTIMIZADA
  // 
  // 🚀 OTIMIZAÇÕES IMPLEMENTADAS:
  // 
  // 1. ✅ PROCESSAMENTO ÚNICO: A mensagem é desencriptada apenas uma vez
  //    - Antes: Desencriptação dupla (handleNewMessage + handleNewMessageInSelectedChat)
  //    - Agora: Desencriptação única no início do handleNewMessage
  // 
  // 2. ✅ ATUALIZAÇÃO IMEDIATA: Lista de chats mostra conteúdo desencriptado instantaneamente
  //    - Antes: Mensagem encriptada aparecia na lista até updateChatInList executar
  //    - Agora: Conteúdo desencriptado aparece imediatamente
  // 
  // 3. ✅ ELIMINAÇÃO DE REQUISIÇÕES: Não busca última mensagem da base de dados para mensagens novas
  //    - Antes: Sempre chamava updateChatInList (busca + desencriptação)
  //    - Agora: Apenas atualiza contadores de mensagens não lidas quando necessário
  // 
  // 4. ✅ NOTIFICAÇÕES OTIMIZADAS: Usa conteúdo já processado
  //    - Antes: Notificações mostravam conteúdo encriptado
  //    - Agora: Notificações mostram conteúdo desencriptado
  // 
  // 5. ✅ MELHOR PERFORMANCE: Reduz tempo de processamento e requisições à base de dados
  //    - Reduz latência na interface
  //    - Diminui carga no servidor
  //    - Melhora experiência do usuário
  const handleNewMessage = useCallback(async (message: Message) => {
    const startTime = performance.now();
    console.log('💬 Nova mensagem recebida:', message);
    console.log('⏱️ Timestamp de processamento:', new Date().toISOString());
    
    // Atualizar o chat correspondente à mensagem
    if (message.chat_id) {
      console.log('🔄 Atualizando chat', message.chat_id, 'com nova mensagem:', message.content);
      
      // Verificar se o chat está selecionado (aberto)
      const isChatSelected = selectedChat?.id === message.chat_id;
      
      // ✅ NOVA ABORDAGEM: Processar a mensagem uma única vez
      let processedMessage = message;
      let processedContent = message.content;
      
      // ✅ SEMPRE tentar desencriptar a mensagem (abordagem mais robusta)
      console.log('🔍 PROCESSANDO MENSAGEM:', {
        messageContent: message.content,
        contentLength: message.content?.length || 0,
        chatId: message.chat_id
      });
      
      if (message.content && message.content.length > 0) {
        processedContent = decryptMessageContent(message.content, message.chat_id);
        processedMessage = {
          ...message,
          content: processedContent
        };
        
        const wasEncrypted = message.content !== processedContent;
        console.log('✅ Mensagem processada:', {
          originalContent: message.content,
          processedContent: processedContent,
          wasEncrypted: wasEncrypted,
          contentChanged: wasEncrypted
        });
      } else {
        console.log('⚠️ Mensagem vazia ou sem conteúdo');
        processedContent = message.content;
        processedMessage = message;
      }
      
      // ✅ ATUALIZAÇÃO IMEDIATA da lista com conteúdo já processado
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
          
          // ✅ ATUALIZAR com conteúdo já desencriptado
          updatedChats[chatIndex] = {
            ...chat,
            last_message_at: message.created_at,
            last_message_content: processedContent, // ✅ Conteúdo já desencriptado
            last_message_sender_type: message.sender_type,
            last_message_sender_name: message.sender_type === 'psicologo' ? 'Você' : chat.masked_user_name,
            unread_count_psicologo: newUnreadCount
          };
          
          console.log('✅ Chat atualizado com mensagem desencriptada:', {
            id: updatedChats[chatIndex].id,
            last_message_content: updatedChats[chatIndex].last_message_content,
            last_message_at: updatedChats[chatIndex].last_message_at,
            sender: updatedChats[chatIndex].last_message_sender_name,
            sender_type: updatedChats[chatIndex].last_message_sender_type,
            unread_count: updatedChats[chatIndex].unread_count_psicologo,
            isSelected: isChatSelected,
            message_sender_type: message.sender_type,
            processed_content: processedContent,
            original_content: message.content,
            content_changed: message.content !== processedContent
          });
          
          // GARANTIR reordenação imediata por data da última mensagem
          return updatedChats.sort((a, b) => {
            const dateA = new Date(a.last_message_at || a.created_at).getTime();
            const dateB = new Date(b.last_message_at || b.created_at).getTime();
            return dateB - dateA;
          });
        }
        return prevChats;
      });
      
      // ✅ Processar a mensagem no chat selecionado (se estiver aberto)
      if (isChatSelected) {
        // Passar a mensagem já processada para evitar dupla desencriptação
        handleNewMessageInSelectedChat(processedMessage);
        console.log('📝 Chat selecionado: processando mensagem já desencriptada no chat');
      }
      
      // ✅ ELIMINAR chamada desnecessária ao updateChatInList para mensagens novas
      // Apenas atualizar contadores de mensagens não lidas em background (sem buscar última mensagem)
      if (message.sender_type === 'app_user' && !isChatSelected) {
        // Atualizar apenas o contador de mensagens não lidas
        setTimeout(async () => {
          try {
            const { data: unreadMessages, error: unreadError } = await supabase
              .from('messages')
              .select('id')
              .eq('chat_id', message.chat_id)
              .eq('sender_type', 'app_user')
              .eq('is_read', false)
              .eq('is_deleted', false);

            if (!unreadError && unreadMessages) {
              const unreadCount = unreadMessages.length;
              
              // Atualizar apenas o contador se mudou
              setChats(prevChats => 
                prevChats.map(c => 
                  c.id === message.chat_id && c.unread_count_psicologo !== unreadCount
                    ? { ...c, unread_count_psicologo: unreadCount }
                    : c
                )
              );
            }
          } catch (error) {
            console.error('❌ Erro ao atualizar contador de mensagens não lidas:', error);
          }
        }, 100);
      }
      
      // Mostrar notificação sutil se a mensagem não for do psicólogo atual e o chat não estiver aberto
      // OU se a página não estiver visível (background)
      const shouldShowNotification = message.sender_type === 'app_user' && 
        (!isChatSelected || !pageIsVisible || document.hidden);
      
              if (shouldShowNotification) {
          // ✅ Usar conteúdo já processado para notificações
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
                const messageContent = processedContent || 'Nova mensagem'; // ✅ Usar conteúdo processado
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
                    const messageContent = processedContent || 'Nova mensagem'; // ✅ Usar conteúdo processado
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
    
    // Log do tempo total de processamento
    const endTime = performance.now();
    console.log(`⏱️ Tempo total de processamento da mensagem: ${(endTime - startTime).toFixed(2)}ms`);
  }, [updateChatInList, selectedChat, handleNewMessageInSelectedChat, pageIsVisible, decryptMessageContent]);

  // Função para lidar com atualização de chat
  const handleChatUpdate = useCallback(async (updatedChat: Chat) => {
    console.log('🔄 Chat atualizado:', updatedChat);
    
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
        return updatedChats;
      }
      return prevChats;
    });

    // Se o chat selecionado foi atualizado, atualizar também
    if (selectedChat?.id === sanitizedChat.id) {
      setSelectedChat(sanitizedChat);
    }
    
    // Remover da lista de chats recentemente atualizados após 2 segundos (reduzido para minimizar piscar)
    setTimeout(() => {
      setRecentlyUpdatedChats(prev => {
        const newSet = new Set(prev);
        newSet.delete(sanitizedChat.id);
        return newSet;
      });
    }, 2000);
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

  // Hook de visibilidade da página
  usePageVisibility({
    onVisible: () => {
      console.log('👁️ PsicologosPage - Página visível');
    },
    onHidden: () => {
      console.log('👁️ PsicologosPage - Página oculta');
    },
    minHiddenTime: 30000, // 30 segundos
    disableAutoRefresh: false // Habilitar verificações para esta página específica
  });

  // Carregar chats disponíveis - OTIMIZADO para não recarregar desnecessariamente
  useEffect(() => {
    // NÃO carregar se não tem usuário autenticado
    if (!user || !profile || !isAuthenticated) {
      console.log('⏭️ PsicologosPage - Usuário não autenticado, aguardando...');
      return;
    }

    // Tentar carregar do cache primeiro
    const cachedData = sessionStorage.getItem(CHATS_CACHE_KEY);
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        
        // Se cache ainda é válido (5 minutos)
        if (now - timestamp < CACHE_DURATION) {
          console.log('📦 PsicologosPage - Carregando chats do cache');
          setChats(data || []);
          setHasLoadedOnce(true);
          setLoading(false);
          return;
        } else {
          console.log('⏰ PsicologosPage - Cache expirado, removendo...');
          sessionStorage.removeItem(CHATS_CACHE_KEY);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar cache:', error);
        sessionStorage.removeItem(CHATS_CACHE_KEY);
      }
    }

    // Se já carregou uma vez e temos dados, NÃO recarregar
    if (hasLoadedOnce && chats.length > 0) {
      console.log('✅ PsicologosPage - Chats já carregados, pulando recarga desnecessária');
      setLoading(false);
      return;
    }

    const loadChats = async () => {
      try {
        console.log('🔄 PsicologosPage - Carregando chats pela primeira vez...');
        setLoading(true);
        setError(null);

        const result = await getChats();
        
        if (result.success) {
          
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
          const chatsData = result.data || [];
          setChats(chatsData);
          setHasLoadedOnce(true); // Marcar como carregado
          
          // Salvar no cache
          try {
            sessionStorage.setItem(CHATS_CACHE_KEY, JSON.stringify({
              data: chatsData,
              timestamp: Date.now()
            }));
            console.log('💾 PsicologosPage - Chats salvos no cache');
          } catch (error) {
            console.error('❌ Erro ao salvar cache:', error);
          }
          
          console.log('✅ PsicologosPage - Chats carregados com sucesso');
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
  }, [user, profile, isAuthenticated, hasLoadedOnce, chats.length, CACHE_DURATION]);

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

  // Atualizar contadores de mensagens não lidas periodicamente (sem piscar)
  useEffect(() => {
    const updateUnreadCounts = async () => {
      if (chats.length > 0) {
        console.log('🔄 Atualizando contadores de mensagens não lidas (background)...');
        for (const chat of chats) {
          // Não atualizar o chat selecionado aqui, pois ele será atualizado pelo ChatInterface
          if (chat.id !== selectedChat?.id) {
            try {
              // Buscar contador de mensagens não lidas diretamente sem atualizar toda a lista
              const { data: unreadMessages, error: unreadError } = await supabase
                .from('messages')
                .select('id')
                .eq('chat_id', chat.id)
                .eq('sender_type', 'app_user')
                .eq('is_read', false)
                .eq('is_deleted', false);

              if (!unreadError && unreadMessages) {
                const unreadCount = unreadMessages.length;
                
                // Atualizar apenas o contador se mudou
                setChats(prevChats => 
                  prevChats.map(c => 
                    c.id === chat.id && c.unread_count_psicologo !== unreadCount
                      ? { ...c, unread_count_psicologo: unreadCount }
                      : c
                  )
                );
              }
            } catch (error) {
              console.error('❌ Erro ao atualizar contador de mensagens não lidas:', error);
            }
          }
        }
      }
    };

    // OTIMIZAÇÃO: Atualizar a cada 15 segundos para melhor sincronização
    const interval = setInterval(updateUnreadCounts, 15000);

    return () => clearInterval(interval);
  }, [chats, selectedChat]);

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
    setIsInitialChatLoad(true); // Marcar como carregamento inicial
    
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
        // OTIMIZAÇÃO: Reduzir delay e executar em background
        setTimeout(() => {
          updateChatInList(chat.id).catch(error => {
            console.error('❌ Erro ao atualizar chat após marcar como lido:', error);
          });
        }, 100); // Reduzido de 500ms para 100ms
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
          
          // Scroll automático para última mensagem após carregamento inicial
          setTimeout(() => {
            const messagesContainer = messagesContainerRef.current || document.querySelector('.chat-messages-container') as HTMLElement;
            if (messagesContainer) {
              console.log('📜 PsicologosPage - Scroll automático para última mensagem após carregamento');
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          }, 150);
          
          // Resetar flag de carregamento inicial após um pequeno delay
          setTimeout(() => {
            setIsInitialChatLoad(false);
          }, 300);
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

  // Função para atualizar apenas os chats (refresh)
  const handleRefreshChats = async () => {
    try {
      setIsRefreshingChats(true);
      console.log('🔄 Atualizando lista de chats...');
      
      const result = await getChats();
      
      if (result.success) {
        // Verificar se os chats têm last_message_content
        if (result.data) {
          result.data.forEach((chat, index) => {
            console.log(`Chat ${index + 1} (refresh):`, {
              id: chat.id,
              name: chat.masked_user_name,
              last_message_content: chat.last_message_content,
              last_message_at: chat.last_message_at,
              last_message_sender_type: chat.last_message_sender_type,
              last_message_sender_name: chat.last_message_sender_name
            });
          });
        }
        
        // ✅ Atualizar a lista de chats (já desencriptados pela função getChats)
        setChats(result.data || []);
        console.log('✅ Lista de chats atualizada com sucesso');
        

        
      } else {
        console.error('❌ Erro ao atualizar chats:', result.error);
        // Não mostrar erro na interface, apenas no console
      }
      
    } catch (error) {
      console.error('❌ Erro ao atualizar chats:', error);
      // Não mostrar erro na interface, apenas no console
    } finally {
      setIsRefreshingChats(false);
    }
  };

  // Função para voltar à lista de chats (mobile)
  const handleBackToList = () => {
    setShowChatList(true);
  };

  // Função para sair do chat (limpar seleção)
  const handleCloseChat = () => {
    console.log('🔍 PsicologosPage - Fechando chat instantaneamente');
    
    // Fechar o chat imediatamente
    setSelectedChat(null);
    setSelectedChatMessages([]); // Limpar mensagens do chat
    setShowChatList(true);
    setIsInitialChatLoad(false); // Resetar estado de carregamento inicial
    
    // Se havia um chat selecionado, atualizar em background (sem bloquear a UI)
    if (selectedChat) {
      console.log('📖 Atualizando chat em background:', selectedChat.id);
      updateChatInList(selectedChat.id).catch(error => {
        console.error('❌ Erro ao atualizar chat ao fechar:', error);
      });
    }
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
    setAssignmentFilter('all');
  };

  // Função para alternar filtro de associação
  const toggleAssignmentFilter = (filter: AssignmentFilter) => {
    setAssignmentFilter(filter);
  };

  // Filtrar chats baseado nos filtros ativos e filtro de associação
  const filteredChats = chats
    .filter(chat => {
      // Aplicar filtros de status
      if (activeFilters.length > 0 && !activeFilters.includes(chat.status)) {
        return false;
      }
      
      // Aplicar filtro de associação
      switch (assignmentFilter) {
        case 'available':
          // Chats disponíveis (sem psicólogo assinado)
          return !chat.assigned_psicologo_id || chat.assigned_psicologo_id === null;
        case 'assigned_to_me':
          // Chats onde o psicólogo atual está assinado
          return chat.assigned_psicologo_id && profile?.id && chat.assigned_psicologo_id === profile.id;
        case 'all':
        default:
          // Todos os chats
          return true;
      }
    })
    .sort((a, b) => {
      // Ordenar por data da última mensagem (mais recente primeiro)
      const dateA = new Date(a.last_message_at || a.created_at).getTime();
      const dateB = new Date(b.last_message_at || b.created_at).getTime();
      return dateB - dateA;
    });

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
    <>
      <style jsx>{customStyles}</style>
      <div className="flex-1 flex bg-gray-50 min-h-0 h-screen relative">
      {/* Notificação visual para novas mensagens */}
      {showNotification && (
        <div className="fixed top-6 right-6 z-50 bg-white border border-gray-200 px-6 py-4 rounded-2xl shadow-2xl max-w-sm notification-slide-in backdrop-blur-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 mb-1">Nova mensagem</p>
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{notificationMessage}</p>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
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
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          {/* Header principal */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h1 className="text-lg font-bold text-gray-900">
                  Conversas
                </h1>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {filteredChats.length}/{chats.length}
                </span>
                
                {/* Botão de refresh */}
                <button
                  onClick={handleRefreshChats}
                  disabled={isRefreshingChats}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                    isRefreshingChats
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 hover:scale-105'
                  }`}
                  title="Atualizar conversas"
                >
                  <svg 
                    className={`w-4 h-4 ${isRefreshingChats ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                </button>
              </div>
              
              {/* Botão limpar filtros */}
              {(activeFilters.length > 0 || assignmentFilter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors px-2 py-1 rounded-md hover:bg-gray-50"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="px-6 py-4 space-y-4">
            {/* Filtros de Status */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-700">Status</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {(['novo_chat', 'a_decorrer', 'follow_up', 'encerrado'] as ChatStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleFilter(status)}
                    className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border ${
                      activeFilters.includes(status)
                        ? 'text-white shadow-md scale-105'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-gray-200'
                    } ${
                      status === 'novo_chat' ? activeFilters.includes(status) ? 'bg-green-500 border-green-500' : 'bg-green-50 border-green-200' :
                      status === 'a_decorrer' ? activeFilters.includes(status) ? 'bg-blue-500 border-blue-500' : 'bg-blue-50 border-blue-200' :
                      status === 'follow_up' ? activeFilters.includes(status) ? 'bg-purple-500 border-purple-500' : 'bg-purple-50 border-purple-200' :
                      activeFilters.includes(status) ? 'bg-red-500 border-red-500' : 'bg-red-50 border-red-200'
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

            {/* Filtros de Associação */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-700">Associação</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'Todos', color: 'gray' },
                  { key: 'available', label: 'Disponíveis', color: 'orange' },
                  { key: 'assigned_to_me', label: 'Meus chats', color: 'blue' }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => toggleAssignmentFilter(filter.key as AssignmentFilter)}
                    className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border ${
                      assignmentFilter === filter.key
                        ? 'text-white shadow-md scale-105'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-gray-200'
                    } ${
                      filter.color === 'gray' ? assignmentFilter === filter.key ? 'bg-gray-500 border-gray-500' : 'bg-gray-50 border-gray-200' :
                      filter.color === 'orange' ? assignmentFilter === filter.key ? 'bg-orange-500 border-orange-500' : 'bg-orange-50 border-orange-200' :
                      assignmentFilter === filter.key ? 'bg-blue-500 border-blue-500' : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de conversas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-gray-50">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-gray-300 mb-6">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {(activeFilters.length > 0 || assignmentFilter !== 'all')
                  ? 'Nenhuma conversa encontrada' 
                  : chats.length === 0 
                    ? 'Nenhuma conversa disponível'
                    : 'Nenhuma conversa disponível'}
              </h3>
              <p className="text-gray-500 text-sm max-w-sm">
                {(activeFilters.length > 0 || assignmentFilter !== 'all')
                  ? 'Tente ajustar os filtros para ver mais conversas.' 
                  : chats.length === 0 
                    ? 'Os chats aparecerão aqui quando os utilizadores iniciarem conversas.'
                    : 'Nenhuma conversa corresponde aos critérios atuais.'}
              </p>
              {(activeFilters.length > 0 || assignmentFilter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredChats.filter(chat => chat && chat.id).map((chat) => (
                <div
                  key={chat.id}
                  className={`bg-white rounded-xl p-5 hover:shadow-md cursor-pointer transition-all duration-200 border chat-card-hover chat-card-container ${
                    selectedChat?.id === chat.id 
                      ? 'ring-2 ring-blue-500 shadow-lg border-blue-200' 
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    recentlyUpdatedChats.has(chat.id) ? 'ring-2 ring-green-500 border-green-200' : ''
                  }`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Avatar do usuário */}
                    <div className="flex-shrink-0 relative">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                        (chat.unread_count_psicologo || 0) > 0
                          ? 'bg-gradient-to-br from-red-400 to-red-600'
                          : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                      }`}>
                        {(chat.masked_user_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      {(chat.unread_count_psicologo || 0) > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white animate-pulse flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {Math.min(chat.unread_count_psicologo || 0, 99)}
                          </span>
                        </div>
                      )}
                      {recentlyUpdatedChats.has(chat.id) && (chat.unread_count_psicologo || 0) === 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-ping"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col">
                      {/* Header com nome e timestamp */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-base font-bold truncate ${
                          (chat.unread_count_psicologo || 0) > 0 
                            ? 'text-gray-900' 
                            : 'text-gray-800'
                        }`}>
                          {chat.masked_user_name || 'Utilizador'}
                        </h3>
                        <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-full">
                          {chat.last_message_at ? formatDate(chat.last_message_at) : '--'}
                        </span>
                      </div>
                      
                      {/* Última mensagem */}
                      {(chat.last_message_content && chat.last_message_content.trim() !== '') ? (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 line-clamp-2 message-content break-words leading-relaxed">
                            <span className={`font-semibold ${
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
                      ) : (
                        <div className="mb-4">
                          <p className="text-sm text-gray-400 italic">
                            Nenhuma mensagem ainda
                          </p>
                        </div>
                      )}
                      
                      {/* Tags e status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {/* Tags de status */}
                          <ChatStatusTag
                            status={chat.status}
                            onStatusChange={(newStatus) => handleStatusChange(chat.id, newStatus)}
                            isEditable={true}
                            className="mr-2"
                          />
                          
                          {/* Tag de psicólogo associado */}
                          <PsicologoAssignedTag
                            chatId={chat.id}
                            onUpdate={() => updateChatInList(chat.id)}
                            variant="compact"
                            className="mr-2"
                          />
                        </div>
                        
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
            isInitialLoad={isInitialChatLoad}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="text-center max-w-lg px-6">
              <div className="relative mb-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Selecione uma conversa
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Escolha uma conversa da lista para começar a responder e ajudar seus pacientes
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Novos chats</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Em andamento</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Follow up</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
