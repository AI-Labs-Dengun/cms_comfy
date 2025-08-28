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

  useEffect(() => {
    console.log('🚀 useChatRealtime - Configurando subscriptions...');
    console.log('🔍 Verificando configuração do Supabase Realtime...');
    console.log('🔍 ChatId fornecido:', chatId);
    
    // Limpar subscriptions existentes antes de criar novas
    if (subscriptionsRef.current.length > 0) {
      console.log('🧹 Limpando subscriptions existentes antes de criar novas...');
      subscriptionsRef.current.forEach(subscription => {
        if (subscription) {
          supabase.removeChannel(subscription);
        }
      });
      subscriptionsRef.current = [];
    }
    
    // Verificar se o Supabase está configurado corretamente
    if (!supabase) {
      console.error('❌ Supabase não está configurado');
      return;
    }
    
    console.log('✅ Supabase configurado, criando subscriptions...');

    // Teste simples para verificar se o Realtime está funcionando
    const testChannel = supabase
      .channel('test-realtime')
      .on('presence', { event: 'sync' }, () => {
        console.log('✅ Realtime está funcionando corretamente');
      })
      .subscribe();
    // Configurar subscription para atualizações de chats
    const chatsSubscription = supabase
      .channel(`chats-realtime-${Date.now()}`)
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
            onChatUpdateRef.current(payload.new as Chat);
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
            onChatCreatedRef.current(payload.new as Chat);
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
            onChatDeletedRef.current(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscription de chats:', status);
      });

    // Configurar subscription para novas mensagens
    const messagesSubscription = supabase
      .channel(`messages-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {          
          if (onNewMessageRef.current) {
            const message = payload.new as Message;
            
            // Se chatId foi especificado, só processar mensagens desse chat
            if (!chatId || message.chat_id === chatId) {
              console.log('✅ Processando nova mensagem para o chat atual');
              onNewMessageRef.current(message);
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
      });

    // Armazenar referências das subscriptions
    subscriptionsRef.current = [testChannel, chatsSubscription, messagesSubscription];

    // Verificar se as subscriptions foram criadas com sucesso
    console.log('✅ Subscriptions criadas:', {
      testChannel: !!testChannel,
      chatsSubscription: !!chatsSubscription,
      messagesSubscription: !!messagesSubscription
    });

    // Teste adicional: verificar se o Realtime está habilitado para as tabelas
    console.log('🔍 Verificando configuração do Realtime para as tabelas...');
    console.log('📋 Tabelas monitoradas: messages, chats');

    // Cleanup function
    return () => {
      console.log('🧹 Limpando subscriptions de tempo real');
      subscriptionsRef.current.forEach(subscription => {
        if (subscription) {
          supabase.removeChannel(subscription);
        }
      });
      subscriptionsRef.current = [];
    };
  }, [chatId]); // Remover dependências das funções de callback para evitar recriação desnecessária

  // Função para limpar manualmente as subscriptions
  const cleanup = () => {
    console.log('🧹 Limpeza manual das subscriptions');
    subscriptionsRef.current.forEach(subscription => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    });
    subscriptionsRef.current = [];
  };

  return { cleanup };
}
