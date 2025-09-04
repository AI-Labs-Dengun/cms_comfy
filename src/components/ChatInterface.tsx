'use client';

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import ChatStatusTag, { ChatStatus } from '@/components/ChatStatusTag';
import { getChatInfo, sendMessage, updateChatStatus, markMessagesAsRead, ChatInfo, Message, Chat } from '@/services/chat';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { useEncryptedChat } from '@/hooks/useEncryptedChat';
import { EncryptionService } from '@/services/encryption';
import { supabase } from '@/lib/supabase';
import SelfAssignButton from '@/components/SelfAssignButton';

interface ChatInterfaceProps {
  chatId: string;
  onBack?: () => void;
  onClose?: () => void;
  onChatUpdate?: (chatId: string) => void; // Callback para atualizar a lista de chats
  onNewMessageReceived?: (message: Message) => void; // Callback para quando uma nova mensagem é recebida
  showNewMessageIndicator?: boolean; // Prop para controlar o indicador de nova mensagem
  messages?: Message[]; // Prop para receber mensagens da página pai
  onLoadMoreMessages?: () => void; // Callback para carregar mais mensagens
  hasMoreMessages?: boolean; // Indica se há mais mensagens para carregar
  isLoadingMoreMessages?: boolean; // Indica se está carregando mais mensagens
  messagesContainerRef?: React.RefObject<HTMLDivElement | null>; // Ref para o container de mensagens
  isInitialLoad?: boolean; // Indica se é o carregamento inicial do chat
}

// Interface para mensagens agrupadas
interface GroupedMessages {
  date: string;
  dateLabel: string;
  messages: Message[];
}

export default function ChatInterface({ chatId, onBack, onClose, onChatUpdate, onNewMessageReceived, showNewMessageIndicator = true, messages: externalMessages, onLoadMoreMessages, hasMoreMessages = false, isLoadingMoreMessages = false, messagesContainerRef, isInitialLoad = false }: ChatInterfaceProps) {
  const { profile } = useAuth();
  const { isOnline } = useOnlineStatus();
  const { processIncomingMessage } = useEncryptedChat(chatId);
  const [localIsOnline, setLocalIsOnline] = useState(false);
  const [assignedPsicologo, setAssignedPsicologo] = useState<{
    id: string;
    name: string;
    username: string;
    is_online: boolean;
    assigned_at: string;
    is_primary_assignment: boolean;
  } | null>(null);
  const [loadingPsicologo, setLoadingPsicologo] = useState(false);
  
  // Atualizar estado local quando profile ou hook mudar
  useEffect(() => {
    // Verificar tanto o hook quanto o profile para garantir consistência
    const profileOnline = profile?.is_online === true;
    const hookOnline = isOnline === true;
    const actualOnline = profileOnline && hookOnline;
    
    setLocalIsOnline(actualOnline);
    
    console.log('🔍 ChatInterface - Status Debug:', {
      profileId: profile?.id,
      profileRole: profile?.user_role,
      profileIsOnline: profile?.is_online,
      hookIsOnline: isOnline,
      actualOnline,
      shouldBlock: !actualOnline,
      chatId
    });
  }, [profile?.is_online, isOnline, profile?.id, profile?.user_role, chatId]);

  // Verificar status online diretamente da base de dados periodicamente
  useEffect(() => {
    if (!profile?.id || profile?.user_role !== 'psicologo') return;

    const checkOnlineStatusFromDB = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_online')
          .eq('id', profile.id)
          .single();

        if (!error && data) {
          const dbIsOnline = data.is_online === true;
          const hookOnline = isOnline === true;
          const actualOnline = dbIsOnline && hookOnline;
          
          if (actualOnline !== localIsOnline) {
            console.log('🔄 ChatInterface - Status atualizado da DB:', {
              dbIsOnline,
              hookOnline, 
              actualOnline,
              previousLocal: localIsOnline
            });
            setLocalIsOnline(actualOnline);
          }
        }
      } catch (error) {
        console.error('❌ ChatInterface - Erro ao verificar status online:', error);
      }
    };

    // Verificar imediatamente
    checkOnlineStatusFromDB();

    // Verificar a cada 10 segundos
    const interval = setInterval(checkOnlineStatusFromDB, 10000);

    return () => clearInterval(interval);
  }, [profile?.id, profile?.user_role, isOnline, localIsOnline]);

  // Escutar mudanças na tabela profiles em tempo real
  useEffect(() => {
    if (!profile?.id || profile?.user_role !== 'psicologo') return;

    const channel = supabase
      .channel('profile-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`,
        },
        (payload) => {
          console.log('🔄 ChatInterface - Profile atualizado em tempo real:', payload);
          if (payload.new && typeof payload.new.is_online === 'boolean') {
            const dbIsOnline = payload.new.is_online === true;
            const hookOnline = isOnline === true;
            const actualOnline = dbIsOnline && hookOnline;
            
            console.log('🔄 ChatInterface - Atualizando status com dados em tempo real:', {
              dbIsOnline,
              hookOnline,
              actualOnline,
              previousLocal: localIsOnline
            });
            
            setLocalIsOnline(actualOnline);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.user_role, isOnline, localIsOnline]);

  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  // Remover estado local de mensagens - usar apenas mensagens externas
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const internalMessagesContainerRef = useRef<HTMLDivElement>(null);
  const [internalIsInitialLoad, setInternalIsInitialLoad] = useState(true);
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);
  const [isChatActive, setIsChatActive] = useState(true); // Controla se o chat está ativo/visível
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);
  
  // Usar a ref externa se fornecida, senão usar a interna
  const containerRef = messagesContainerRef || internalMessagesContainerRef;
  
  // Usar refs para armazenar as funções de callback e evitar recriações
  const handleNewMessageRef = useRef<(message: Message) => void>(() => {});
  const handleChatUpdateRef = useRef<(updatedChat: Chat) => void>(() => {});

  // Função helper para fechar o chat instantaneamente
  const handleCloseChat = useCallback(() => {
    if (!onClose) return;
    
    console.log('🔍 ChatInterface - Fechando chat instantaneamente');
    
    // Fechar imediatamente sem delay
    onClose();
  }, [onClose]);

  // Event listener para tecla ESC - fechar chat
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Verificar se não está digitando em um campo de entrada
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      
      if (event.key === 'Escape' && onClose && !isInputField) {
        console.log('🔍 ChatInterface - Tecla ESC pressionada, fechando chat');
        event.preventDefault();
        event.stopPropagation();
        handleCloseChat();
      }
    };

    // Adicionar listener sempre que o componente estiver montado e onClose existir
    if (onClose) {
      document.addEventListener('keydown', handleKeyDown, true); // Use capture para prioridade
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose, handleCloseChat]);

  // Auto-scroll para a última mensagem (apenas para novas mensagens)
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Posicionar o scroll na última mensagem sem animação
  const positionAtBottom = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      console.log('📜 Aplicando scroll para última mensagem:', {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight
      });
      
      // Forçar o scroll para o final
      container.scrollTop = container.scrollHeight;
      
      // Verificação adicional para garantir que o scroll foi aplicado
      setTimeout(() => {
        if (container.scrollTop < container.scrollHeight - container.clientHeight) {
          console.log('📜 Reaplicando scroll - primeira tentativa não foi suficiente');
          container.scrollTop = container.scrollHeight;
          
          // Segunda verificação
          setTimeout(() => {
            if (container.scrollTop < container.scrollHeight - container.clientHeight) {
              console.log('📜 Reaplicando scroll - segunda tentativa');
              container.scrollTop = container.scrollHeight;
            }
          }, 50);
        }
      }, 50);
    }
  }, [containerRef]);

  // Marcar mensagens como lidas quando o usuário realmente visualiza o chat
  const markMessagesAsReadWhenViewed = useCallback(async () => {
    if (!hasMarkedAsRead && externalMessages && externalMessages.length > 0 && isChatActive) {
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
  }, [hasMarkedAsRead, externalMessages, isChatActive, chatId, onChatUpdate]);

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
      if (isVisible && !hasMarkedAsRead && externalMessages && externalMessages.length > 0) {
        setTimeout(() => {
          markMessagesAsReadWhenViewed();
        }, 500);
      }
    };

    const handleFocus = () => {
      setIsChatActive(true);
      if (!hasMarkedAsRead && externalMessages && externalMessages.length > 0) {
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
  }, [hasMarkedAsRead, externalMessages, chatId, onChatUpdate, markMessagesAsReadWhenViewed]);

  // Scroll suave para novas mensagens (não para carregamento inicial)
  useEffect(() => {
    if (!internalIsInitialLoad && externalMessages && externalMessages.length > 0) {
      scrollToBottom();
    }
  }, [externalMessages, internalIsInitialLoad]);

  // Posicionar scroll no final após carregamento inicial
  useLayoutEffect(() => {
    if (isInitialLoad && externalMessages && externalMessages.length > 0) {
      console.log('📜 ChatInterface - Scroll automático no carregamento inicial');
      positionAtBottom();
      setInternalIsInitialLoad(false);
    }
  }, [externalMessages, isInitialLoad, positionAtBottom]);

  // Garantir scroll para última mensagem quando entrar no chat
  useEffect(() => {
    if (isInitialLoad && externalMessages && externalMessages.length > 0) {
      console.log('📜 ChatInterface - Garantindo scroll para última mensagem ao entrar no chat');
      
      // Usar setTimeout para garantir que o DOM foi renderizado
      setTimeout(() => {
        if (containerRef.current) {
          const container = containerRef.current;
          container.scrollTop = container.scrollHeight;
          console.log('✅ Scroll aplicado para última mensagem');
        }
      }, 100);
    }
  }, [isInitialLoad, externalMessages, containerRef]);

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

  // Detectar scroll para mostrar botão "Ver mais mensagens"
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current && hasMoreMessages) {
        const { scrollTop } = containerRef.current;
        
        // Mostrar botão apenas quando estiver no topo absoluto (scrollTop = 0)
        // ou muito próximo do topo (para dar uma pequena margem)
        const isAtTop = scrollTop <= 10;
        
        setShowLoadMoreButton(isAtTop);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Verificar estado inicial
      handleScroll();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [hasMoreMessages, externalMessages, containerRef]);

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

        // Carregar apenas informações do chat (não mensagens)
        const chatInfoResult = await getChatInfo(chatId);
        if (chatInfoResult.success && chatInfoResult.data) {
          setChatInfo(chatInfoResult.data);
        } else {
          setError(chatInfoResult.error || 'Erro ao carregar informações do chat');
          return;
        }

        // NÃO carregar mensagens aqui - elas serão fornecidas pela página pai
        // As mensagens serão carregadas pela página pai e passadas via props

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
    
    // Verificar se o psicólogo está online
    if (!localIsOnline) {
      alert('Você precisa estar online para enviar mensagens. Altere seu status para "Online" na barra de navegação.');
      return;
    }
    
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      // Guardar o conteúdo da mensagem antes de limpar o campo
      const messageContent = newMessage.trim();
      
      // Limpar o campo de entrada imediatamente
      setNewMessage('');
      
      // Marcar mensagens como lidas quando o usuário envia uma mensagem
      handleUserInteraction();
      
      console.log('📤 Enviando mensagem:', messageContent);
      
      const result = await sendMessage(chatId, messageContent);
      
      if (result.success && result.data) {
        console.log('✅ Mensagem enviada com sucesso:', result.data);
        
        // A mensagem será adicionada automaticamente via tempo real
        // Scroll suave para a nova mensagem enviada
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        
        // Notificar a página pai para atualizar a lista de chats
        if (onChatUpdate) {
          onChatUpdate(chatId);
        }
      } else {
        console.error('Erro ao enviar mensagem:', result.error);
        // Restaurar a mensagem no campo de entrada se houve erro
        setNewMessage(messageContent);
        alert('Erro ao enviar mensagem. Tente novamente.');
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Restaurar a mensagem no campo de entrada se houve erro
      setNewMessage(newMessage.trim());
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  // Função para formatar hora da mensagem
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
    
    // Só processar a mensagem se ela pertence ao chat atual
    if (message.chat_id === chatId) {
      // ✅ OBRIGATÓRIO: Forçar desencriptação de TODAS as mensagens do Realtime
      console.log('🔓 OBRIGANDO desencriptação de mensagem do Realtime:', {
        messageId: message.id,
        originalContent: message.content,
        contentLength: message.content?.length || 0
      });
      
      let processedMessage: Message;
      
      try {
        // 🔓 DESENCRIPTAR OBRIGATORIAMENTE usando o serviço de encriptação
        const decryptedContent = EncryptionService.processMessageForDisplay(message.content, chatId);
        
        processedMessage = {
          ...message,
          content: decryptedContent
        };
        
        console.log('✅ Mensagem OBRIGATORIAMENTE desencriptada:', {
          messageId: message.id,
          originalContent: message.content,
          decryptedContent: processedMessage.content,
          wasEncrypted: message.content !== decryptedContent
        });
        
      } catch (error) {
        console.error('❌ ERRO CRÍTICO: Falha na desencriptação obrigatória:', error);
        
        // Em caso de erro, tentar usar o hook como fallback
        try {
          processedMessage = processIncomingMessage(message);
          console.log('⚠️ Usando fallback de desencriptação:', processedMessage.content);
        } catch (fallbackError) {
          console.error('❌ ERRO CRÍTICO: Fallback também falhou:', fallbackError);
          
          // Último recurso: mostrar mensagem original com aviso
          processedMessage = {
            ...message,
            content: `[ERRO DE DESENCRIPTAÇÃO] ${message.content}`
          };
        }
      }
      
      // NÃO adicionar mensagem ao estado local - apenas notificar a página pai
      console.log('✅ Notificando página pai sobre nova mensagem desencriptada:', processedMessage.content);
      
      // Usar a prop para processar a mensagem na página pai
      if (onNewMessageReceived) {
        onNewMessageReceived(processedMessage);
      }
      
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
  }, [chatId, isChatActive, onChatUpdate, onNewMessageReceived, processIncomingMessage]);

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

  // Usar apenas mensagens externas fornecidas pela página pai
  const displayMessages = React.useMemo(() => {
    // Se mensagens externas são fornecidas, usar apenas elas
    if (externalMessages && externalMessages.length > 0) {
      console.log('🔍 ChatInterface - Usando mensagens externas:', externalMessages.length);
      return externalMessages;
    }
    
    // Se não há mensagens externas, retornar array vazio
    console.log('🔍 ChatInterface - Nenhuma mensagem externa fornecida');
    return [];
  }, [externalMessages]);
  
  // Debug: verificar mensagens
  console.log('🔍 ChatInterface - Mensagens finais:', {
    externalMessages: externalMessages?.length || 0,
    displayMessages: displayMessages.length,
    chatId
  });

  // Função para buscar psicólogo associado à conversa
  const loadAssignedPsicologo = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoadingPsicologo(true);
      }
      
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select(`
          assigned_psicologo_id,
          assigned_at,
          is_primary_assignment,
          profiles:assigned_psicologo_id (
            id,
            name,
            username,
            is_online
          )
        `)
        .eq('id', chatId)
        .single();

      if (chatError) {
        console.error('Erro ao buscar psicólogo associado:', chatError);
        return;
      }

      if (chatData?.assigned_psicologo_id && chatData.profiles) {
        const profile = Array.isArray(chatData.profiles) ? chatData.profiles[0] : chatData.profiles;
        setAssignedPsicologo({
          id: profile.id,
          name: profile.name,
          username: profile.username,
          is_online: profile.is_online,
          assigned_at: chatData.assigned_at,
          is_primary_assignment: chatData.is_primary_assignment
        });
      } else {
        setAssignedPsicologo(null);
      }
    } catch (err) {
      console.error('Erro ao carregar psicólogo associado:', err);
    } finally {
      if (showLoading) {
        setLoadingPsicologo(false);
      }
    }
  }, [chatId]);

  // Função para atualizar psicólogo associado após auto-associação
  const handleSelfAssignSuccess = () => {
    // Atualização imediata para melhor responsividade
    loadAssignedPsicologo(false); // Não mostrar loading após auto-associação
    
    // Atualização adicional com pequeno delay para garantir sincronização
    setTimeout(() => {
      loadAssignedPsicologo(false);
    }, 100);
    
    if (onChatUpdate) {
      onChatUpdate(chatId);
    }
  };

  // Carregar psicólogo associado quando o chat mudar
  useEffect(() => {
    if (chatId) {
      loadAssignedPsicologo(true); // Mostrar loading apenas no carregamento inicial
    }
  }, [chatId, loadAssignedPsicologo]);

  // Verificar periodicamente se há mudanças na associação (menos frequente para melhor performance)
  useEffect(() => {
    if (!chatId) return;

    const interval = setInterval(() => {
      loadAssignedPsicologo(false); // Não mostrar loading nas verificações periódicas
    }, 5000); // Verificar a cada 5 segundos (reduzido de 3s para 5s)

    return () => clearInterval(interval);
  }, [chatId, loadAssignedPsicologo]);

  // ✅ NOVO: Estado para controlar polling de fallback
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  


  // ✅ NOVA FUNÇÃO: Polling de fallback para mensagens
  const startFallbackPolling = useCallback(() => {
    if (isPollingRef.current) return;
    
    console.log('🔄 Iniciando polling de fallback para mensagens...');
    isPollingRef.current = true;
    
    const pollForNewMessages = async () => {
      try {
        // Buscar mensagens mais recentes que a última conhecida
        const { data: newMessages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .eq('is_deleted', false)
          .gt('created_at', lastMessageTimestamp || new Date(0).toISOString())
          .order('created_at', { ascending: true });
        
        if (!error && newMessages && newMessages.length > 0) {
          console.log('📡 Polling: Encontradas', newMessages.length, 'novas mensagens');
          
          // Processar cada nova mensagem
          for (const message of newMessages) {
            try {
              // Desencriptar mensagem
              const decryptedContent = EncryptionService.processMessageForDisplay(message.content, chatId);
              const processedMessage = {
                ...message,
                content: decryptedContent
              };
              
              // Notificar sobre a nova mensagem
              if (onNewMessageReceived) {
                onNewMessageReceived(processedMessage);
              }
              
              // Atualizar timestamp da última mensagem
              setLastMessageTimestamp(message.created_at);
            } catch (error) {
              console.error('❌ Erro ao processar mensagem do polling:', error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro no polling de fallback:', error);
      }
    };
    
    // Executar polling a cada 5 segundos
    pollingIntervalRef.current = setInterval(pollForNewMessages, 5000);
    
    // Executar imediatamente na primeira vez
    pollForNewMessages();
  }, [chatId, lastMessageTimestamp, onNewMessageReceived]);

  // ✅ NOVA FUNÇÃO: Parar polling de fallback
  const stopFallbackPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
    console.log('🛑 Polling de fallback parado');
  }, []);

  // ✅ NOVO: Iniciar polling quando o chat é carregado
  useEffect(() => {
    if (externalMessages && externalMessages.length > 0) {
      // Definir timestamp da última mensagem conhecida
      const lastMessage = externalMessages[externalMessages.length - 1];
      setLastMessageTimestamp(lastMessage.created_at);
      
      // Iniciar polling de fallback após 10 segundos se não houver mensagens do Realtime
      const timeoutId = setTimeout(() => {
        console.log('🔄 Iniciando polling de fallback após timeout...');
        startFallbackPolling();
      }, 10000);
      
      return () => {
        clearTimeout(timeoutId);
        stopFallbackPolling();
      };
    }
  }, [externalMessages, startFallbackPolling, stopFallbackPolling]);

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
  const groupedMessages = groupMessagesByDate(displayMessages);
  
  // Debug: verificar mensagens agrupadas
  console.log('🔍 ChatInterface - Mensagens agrupadas:', {
    totalGroups: groupedMessages.length,
    totalMessages: groupedMessages.reduce((sum, group) => sum + group.messages.length, 0),
    groups: groupedMessages.map(group => ({
      date: group.dateLabel,
      messageCount: group.messages.length
    }))
  });

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
                {/* Tag do psicólogo associado - mais visível */}
                {assignedPsicologo && (
                  <div className="mt-2">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          assignedPsicologo.is_online ? 'bg-green-300 animate-pulse' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-sm font-medium">
                          👨‍⚕️ {assignedPsicologo.name}
                        </span>
                        <span className="text-xs text-blue-100">
                          @{assignedPsicologo.username}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20">
                          {assignedPsicologo.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {loadingPsicologo && (
                  <div className="mt-2">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="text-sm">Carregando psicólogo...</span>
                    </div>
                  </div>
                )}
                {!assignedPsicologo && !loadingPsicologo && (
                  <div className="mt-2">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                      <span className="text-sm font-medium">⚠️ Nenhum psicólogo assinado</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Botão de auto-associação */}
            <SelfAssignButton 
              chatId={chatId} 
              variant="icon"
              onSuccess={handleSelfAssignSuccess}
              isCurrentlyAssigned={assignedPsicologo?.id === profile?.id}
            />

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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔍 ChatInterface - Botão X clicado, fechando chat');
                  handleCloseChat();
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Fechar conversa (ESC)"
                aria-label="Fechar conversa"
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
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white custom-scrollbar chat-messages-container relative" 
        style={{ 
          maxHeight: 'calc(100vh - 280px)',
          scrollBehavior: 'auto' // Sempre auto para controle total do scroll
        }}
      >
        {/* Indicador de nova mensagem */}
        {showNewMessageIndicator && (
          <div className="absolute top-4 right-4 z-10 bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce">
            💬 Nova mensagem!
          </div>
        )}

        {/* Botão "Ver mais mensagens" - Completamente Flutuante */}
        {hasMoreMessages && showLoadMoreButton && (
          <div className="floating-load-more-button">
            <button
              onClick={(e) => {
                // Prevenir TODOS os comportamentos padrão
                e.preventDefault();
                e.stopPropagation();
                // Prevenir outros event handlers
                if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                  e.nativeEvent.stopImmediatePropagation();
                }
                
                // Verificar se a função existe antes de chamar
                if (!onLoadMoreMessages) return;
                
                // Capturar posição atual antes de qualquer ação
                const container = containerRef.current;
                if (container) {
                  // Desabilitar completamente qualquer scroll automático
                  container.style.scrollBehavior = 'auto';
                  container.style.overflow = 'hidden'; // Bloquear scroll temporariamente
                  
                  // Chamar a função de carregar mais mensagens
                  onLoadMoreMessages();
                  
                  // Reabilitar scroll após carregamento
                  setTimeout(() => {
                    if (container) {
                      container.style.overflow = 'auto';
                      container.style.scrollBehavior = 'auto'; // Manter auto para evitar animações
                    }
                  }, 200);
                } else {
                  // Se não conseguir acessar o container, chamar normalmente
                  onLoadMoreMessages();
                }
              }}
              disabled={isLoadingMoreMessages}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 shadow-xl backdrop-blur-md border-2 pointer-events-auto ${
                isLoadingMoreMessages
                  ? 'bg-gray-100/95 text-gray-500 cursor-not-allowed border-gray-200/50'
                  : 'bg-blue-500/95 text-white hover:bg-blue-600/95 hover:shadow-2xl transform hover:scale-105 border-white/30 hover:border-white/50'
              }`}
            >
              {isLoadingMoreMessages ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Carregando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span>Ver mais mensagens</span>
                </>
              )}
            </button>
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
                key={message._uniqueKey || message.id}
                data-message-id={message.id}
                className={`flex ${message.sender_type === 'psicologo' ? 'justify-end' : 'justify-start'} message-enter`}
              >
                <div className={`relative max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl ${
                  message.sender_type === 'psicologo' ? 'order-2' : 'order-1'
                }`}>
                  <div
                    className={`px-4 py-3 pb-6 rounded-2xl shadow-sm ${
                      message.sender_type === 'psicologo'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {/* 
                      Melhorias implementadas para quebra de texto:
                      - whitespace-pre-wrap: preserva quebras de linha do texto original
                      - word-wrap: break-word: quebra palavras longas quando necessário
                      - word-break: break-word: quebra palavras em qualquer lugar se necessário
                      - overflow-wrap: break-word: quebra palavras para evitar overflow
                      - hyphens: auto: adiciona hífens quando apropriado
                      - line-height: 1.5: espaçamento adequado entre linhas
                      - max-width: 100%: garante que não ultrapasse o container
                    */}
                    <div className="message-content text-sm">
                      {message.content}
                    </div>
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
        {/* Aviso quando offline */}
        {!localIsOnline && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Status Offline
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Você precisa estar online para enviar mensagens. Altere seu status para &quot;Online&quot; na barra de navegação.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="space-y-4">
          <div className="relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                !localIsOnline 
                  ? "Você precisa estar online para enviar mensagens..." 
                  : sending 
                    ? "Enviando mensagem..." 
                    : "Digite sua mensagem..."
              }
              className={`w-full border border-gray-300 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 text-black message-content ${
                sending || !localIsOnline ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              rows={3}
              disabled={sending || !localIsOnline}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (localIsOnline) {
                    handleSendMessage(e);
                  }
                }
              }}
              style={{
                wordWrap: 'break-word',
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}
            />
            
            {/* Botão de envio flutuante */}
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || !localIsOnline}
              className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl ${
                !localIsOnline
                  ? 'bg-gray-400 cursor-not-allowed'
                  : !newMessage.trim() || sending
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              title={!localIsOnline ? "Você precisa estar online para enviar mensagens" : "Enviar mensagem"}
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : !localIsOnline ? (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {!localIsOnline 
                ? "Status offline - envio de mensagens bloqueado" 
                : "Pressione Enter para enviar, Shift+Enter para nova linha"
              }
            </span>
            <span className="flex items-center space-x-4">
              <span className="text-xs text-gray-400">
                Pressione ESC para sair
              </span>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
