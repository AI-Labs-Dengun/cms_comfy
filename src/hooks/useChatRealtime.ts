import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Chat, Message } from '@/services/chat';

interface UseChatRealtimeProps {
  onChatUpdate?: (updatedChat: Chat) => void;
  onNewMessage?: (message: Message) => void;
  onChatCreated?: (newChat: Chat) => void;
  onChatDeleted?: (chatId: string) => void;
}

export function useChatRealtime({
  onChatUpdate,
  onNewMessage,
  onChatCreated,
  onChatDeleted
}: UseChatRealtimeProps = {}) {
  const subscriptionsRef = useRef<any[]>([]);

  useEffect(() => {
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
          if (onChatUpdate) {
            onChatUpdate(payload.new as Chat);
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
          if (onChatCreated) {
            onChatCreated(payload.new as Chat);
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
          if (onChatDeleted) {
            onChatDeleted(payload.old.id);
          }
        }
      )
      .subscribe();

    // Configurar subscription para novas mensagens
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
          console.log('💬 Nova mensagem em tempo real:', payload);
          if (onNewMessage) {
            onNewMessage(payload.new as Message);
          }
        }
      )
      .subscribe();

    // Armazenar referências das subscriptions
    subscriptionsRef.current = [chatsSubscription, messagesSubscription];

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
  }, [onChatUpdate, onNewMessage, onChatCreated, onChatDeleted]);

  // Função para limpar manualmente as subscriptions
  const cleanup = () => {
    subscriptionsRef.current.forEach(subscription => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    });
    subscriptionsRef.current = [];
  };

  return { cleanup };
}
