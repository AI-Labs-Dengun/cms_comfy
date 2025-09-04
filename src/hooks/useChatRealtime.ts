import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Chat, Message } from '@/services/chat';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseChatRealtimeProps {
  onChatUpdate?: (updatedChat: Chat) => void;
  onNewMessage?: (message: Message) => void;
  onChatCreated?: (newChat: Chat) => void;
  onChatDeleted?: (chatId: string) => void;
  chatId?: string; // Adicionar chatId opcional para filtrar mensagens específicas
}

export function useChatRealtime({
  onChatUpdate,
  onNewMessage,
  onChatCreated,
  onChatDeleted,
  chatId
}: UseChatRealtimeProps = {}) {
  const subscriptionsRef = useRef<RealtimeChannel[]>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptsRef = useRef(0);
  const maxRetryAttempts = 5;
  
  // Usar refs para armazenar as funções de callback e evitar recriações
  const onChatUpdateRef = useRef(onChatUpdate);
  const onNewMessageRef = useRef(onNewMessage);
  const onChatCreatedRef = useRef(onChatCreated);
  const onChatDeletedRef = useRef(onChatDeleted);

  // Atualizar as refs quando as funções mudam
  useEffect(() => {
    onChatUpdateRef.current = onChatUpdate;
  }, [onChatUpdate]);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    onChatCreatedRef.current = onChatCreated;
  }, [onChatCreated]);

  useEffect(() => {
    onChatDeletedRef.current = onChatDeleted;
  }, [onChatDeleted]);

  // ✅ NOVA FUNÇÃO: Limpar subscriptions de forma segura
  const cleanupSubscriptions = () => {
    console.log('🧹 Limpando subscriptions existentes...');
    subscriptionsRef.current.forEach(subscription => {
      if (subscription) {
        try {
          supabase.removeChannel(subscription);
        } catch (error) {
          console.error('❌ Erro ao remover subscription:', error);
        }
      }
    });
    subscriptionsRef.current = [];
  };

  // ✅ NOVA FUNÇÃO: Criar subscriptions com retry mechanism
  const createSubscriptions = () => {
    console.log('🚀 useChatRealtime - Configurando subscriptions...');
    console.log('🔍 Verificando configuração do Supabase Realtime...');
    console.log('🔍 ChatId fornecido:', chatId);
    
    // Limpar subscriptions existentes antes de criar novas
    cleanupSubscriptions();
    
    // Verificar se o Supabase está configurado corretamente
    if (!supabase) {
      console.error('❌ Supabase não está configurado');
      return false;
    }
    
    console.log('✅ Supabase configurado, criando subscriptions...');

    try {
      // Teste simples para verificar se o Realtime está funcionando
      const testChannel = supabase
        .channel('test-realtime')
        .on('presence', { event: 'sync' }, () => {
          console.log('✅ Realtime está funcionando corretamente');
          connectionAttemptsRef.current = 0; // Reset contador de tentativas
        })
        .subscribe((status) => {
          console.log('📡 Status do canal de teste:', status);
          if (status === 'SUBSCRIBED') {
            connectionAttemptsRef.current = 0; // Reset contador de tentativas
          }
        });

      // Configurar subscription para atualizações de chats
      const chatsSubscription = supabase
        .channel('chats-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chats'
          },
          (payload) => {
            console.log('🔄 Chat atualizado em tempo real:', payload);
            if (onChatUpdateRef.current) {
              try {
                onChatUpdateRef.current(payload.new as Chat);
              } catch (error) {
                console.error('❌ Erro ao processar atualização de chat:', error);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chats'
          },
          (payload) => {
            console.log('🆕 Novo chat criado em tempo real:', payload);
            if (onChatCreatedRef.current) {
              try {
                onChatCreatedRef.current(payload.new as Chat);
              } catch (error) {
                console.error('❌ Erro ao processar novo chat:', error);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'chats'
          },
          (payload) => {
            console.log('🗑️ Chat deletado em tempo real:', payload);
            if (onChatDeletedRef.current) {
              try {
                onChatDeletedRef.current(payload.old.id);
              } catch (error) {
                console.error('❌ Erro ao processar chat deletado:', error);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Status da subscription de chats:', status);
          if (status === 'SUBSCRIBED') {
            connectionAttemptsRef.current = 0; // Reset contador de tentativas
          }
        });

      // Configurar subscription para novas mensagens com melhor tratamento
      const messagesSubscription = supabase
        .channel('messages-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            const realtimeTimestamp = performance.now();
            console.log('📡 Realtime: Mensagem recebida do Supabase em:', new Date().toISOString());
            
            if (onNewMessageRef.current) {
              const message = payload.new as Message;
              
              // Se chatId foi especificado, só processar mensagens desse chat
              if (!chatId || message.chat_id === chatId) {
                console.log('✅ Processando nova mensagem para o chat atual');
                console.log(`⏱️ Realtime delay: ${(performance.now() - realtimeTimestamp).toFixed(2)}ms`);
                
                // ✅ MELHORADO: Processar imediatamente com retry mechanism
                const processMessage = (attempt = 1) => {
                  try {
                    if (onNewMessageRef.current) {
                      onNewMessageRef.current(message);
                      console.log('✅ Mensagem processada com sucesso na tentativa', attempt);
                    }
                  } catch (error) {
                    console.error('❌ Erro ao processar mensagem na tentativa', attempt, ':', error);
                    
                    // Retry até 3 vezes com delay mínimo
                    if (attempt < 3) {
                      const delay = attempt * 10; // 10ms, 20ms, 30ms (reduzido drasticamente)
                      console.log(`🔄 Tentando novamente em ${delay}ms...`);
                      setTimeout(() => processMessage(attempt + 1), delay);
                    } else {
                      console.error('❌ Falha definitiva ao processar mensagem após 3 tentativas');
                    }
                  }
                };
                
                // Processar imediatamente
                processMessage();
              } else {
                console.log('⚠️ Mensagem ignorada - não pertence ao chat atual');
              }
            } else {
              console.log('⚠️ onNewMessageRef.current não está definido');
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Status da subscription de mensagens:', status);
          if (status === 'SUBSCRIBED') {
            connectionAttemptsRef.current = 0; // Reset contador de tentativas
          }
        });

      // Armazenar referências das subscriptions
      subscriptionsRef.current = [testChannel, chatsSubscription, messagesSubscription];

      // Verificar se as subscriptions foram criadas com sucesso
      console.log('✅ Subscriptions criadas:', {
        testChannel: !!testChannel,
        chatsSubscription: !!chatsSubscription,
        messagesSubscription: !!messagesSubscription
      });

      return true;
    } catch (error) {
      console.error('❌ Erro ao criar subscriptions:', error);
      return false;
    }
  };

  // ✅ NOVA FUNÇÃO: Retry mechanism para reconexão
  const retryConnection = () => {
    if (connectionAttemptsRef.current >= maxRetryAttempts) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      return;
    }

    connectionAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, connectionAttemptsRef.current - 1), 10000); // Exponential backoff, max 10s
    
    console.log(`🔄 Tentativa de reconexão ${connectionAttemptsRef.current}/${maxRetryAttempts} em ${delay}ms`);
    
    retryTimeoutRef.current = setTimeout(() => {
      if (createSubscriptions()) {
        console.log('✅ Reconexão bem-sucedida');
      } else {
        console.log('❌ Reconexão falhou, tentando novamente...');
        retryConnection();
      }
    }, delay);
  };

  useEffect(() => {
    // Tentar criar subscriptions
    if (!createSubscriptions()) {
      // Se falhou, tentar reconectar
      retryConnection();
    }

    // Cleanup function
    return () => {
      console.log('🧹 Limpando subscriptions de tempo real');
      cleanupSubscriptions();
      
      // Limpar timeout de retry se existir
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [chatId]); // Remover dependências das funções de callback para evitar recriação desnecessária

  // ✅ NOVA FUNÇÃO: Limpar manualmente as subscriptions
  const cleanup = () => {
    console.log('🧹 Limpeza manual das subscriptions');
    cleanupSubscriptions();
    
    // Limpar timeout de retry se existir
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  // ✅ NOVA FUNÇÃO: Reconectar manualmente
  const reconnect = () => {
    console.log('🔄 Reconexão manual solicitada');
    connectionAttemptsRef.current = 0;
    cleanup();
    createSubscriptions();
  };

  return { cleanup, reconnect };
}
