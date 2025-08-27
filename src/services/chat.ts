import { supabase } from '@/lib/supabase';

// Tipos para o sistema de chat
export interface Chat {
  id: string;
  app_user_id: string;
  masked_user_name: string; // Alterado de app_user_name para masked_user_name
  last_message_at: string;
  last_message_content?: string;
  last_message_sender_type?: 'psicologo' | 'app_user';
  last_message_sender_name?: string;
  unread_count_psicologo: number;
  is_active: boolean;
  status: 'novo_chat' | 'a_decorrer' | 'follow_up' | 'encerrado';
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'psicologo' | 'app_user';
  content: string;
  created_at: string;
  is_read: boolean;
  is_deleted: boolean;
  _uniqueKey?: string; // Chave única opcional para evitar conflitos de renderização
}

export interface ChatInfo {
  id: string;
  app_user_id: string;
  masked_user_name: string; // Alterado de app_user_name para masked_user_name
  is_active: boolean;
  status: 'novo_chat' | 'a_decorrer' | 'follow_up' | 'encerrado';
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Função para buscar todos os chats do psicólogo
export async function getChats(): Promise<ApiResponse<Chat[]>> {
  try {
    console.log('🔍 Buscando chats do psicólogo...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    console.log('👤 Usuário autenticado:', user.id);

    // Verificar se o usuário é um psicólogo autorizado
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_role, authorized')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.user_role !== 'psicologo' || !profile.authorized) {
      console.error('❌ Acesso negado:', { profile, profileError });
      return {
        success: false,
        error: 'Acesso negado. Apenas psicólogos autorizados podem acessar os chats.'
      };
    }

    console.log('✅ Psicólogo autorizado:', profile);

    // ✅ IMPLEMENTAÇÃO REAL: Buscar chats do banco de dados
    const { data, error } = await supabase.rpc('get_psicologo_chats', {
      psicologo_id_param: user.id
    });

    if (error) {
      console.error('❌ Erro ao buscar chats:', error);
      return {
        success: false,
        error: 'Erro ao carregar chats: ' + error.message
      };
    }

    console.log('📊 Resposta do get_psicologo_chats:', data);

    // Verificar se data existe
    if (!data) {
      console.error('❌ Resposta vazia do servidor');
      return {
        success: false,
        error: 'Resposta vazia do servidor'
      };
    }

    if (!data.success) {
      console.error('❌ Erro na resposta:', data.error);
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao carregar chats'
      };
    }

    // Garantir que sempre retornamos um array
    const chats = Array.isArray(data.chats) ? data.chats : [];
    
    console.log('✅ Chats encontrados:', chats.length);
    console.log('📋 Dados dos chats:', chats);
    
    // Buscar a última mensagem de cada chat para garantir que temos a mais recente
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat: Chat) => {
        try {
          // Buscar a última mensagem do chat
          const { data: lastMessage, error: messageError } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (messageError && messageError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('❌ Erro ao buscar última mensagem do chat', chat.id, ':', messageError);
          }

          if (lastMessage) {
            console.log('📝 Última mensagem encontrada para chat', chat.id, ':', lastMessage);
            
            // Atualizar o chat com a última mensagem real
            return {
              ...chat,
              last_message_at: lastMessage.created_at,
              last_message_content: lastMessage.content,
              last_message_sender_type: lastMessage.sender_type,
              last_message_sender_name: lastMessage.sender_type === 'psicologo' ? 'Você' : chat.masked_user_name
            };
          } else {
            console.log('📝 Nenhuma mensagem encontrada para chat', chat.id);
            return chat;
          }
        } catch (error) {
          console.error('❌ Erro ao buscar última mensagem do chat', chat.id, ':', error);
          return chat;
        }
      })
    );
    
    console.log('✅ Chats com última mensagem atualizada:', chatsWithLastMessage);
    
    return {
      success: true,
      data: chatsWithLastMessage
    };

  } catch (error) {
    console.error('Erro inesperado ao buscar chats:', error);
    return {
      success: false,
      error: 'Erro inesperado ao carregar chats'
    };
  }
}

// Função para buscar informações de um chat específico
export async function getChatInfo(chatId: string): Promise<ApiResponse<ChatInfo>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // ✅ IMPLEMENTAÇÃO REAL: Buscar informações do chat
    const { data, error } = await supabase.rpc('get_chat_info', {
      chat_id_param: chatId,
      user_id_param: user.id
    });

    if (error) {
      console.error('Erro ao buscar informações do chat:', error);
      return {
        success: false,
        error: 'Erro ao carregar informações do chat: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao carregar informações do chat'
      };
    }

    return {
      success: true,
      data: data.chat
    };

  } catch (error) {
    console.error('Erro inesperado ao buscar informações do chat:', error);
    return {
      success: false,
      error: 'Erro inesperado ao carregar informações do chat'
    };
  }
}

// Função para buscar mensagens de um chat
export async function getChatMessages(chatId: string): Promise<ApiResponse<Message[]>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // ✅ IMPLEMENTAÇÃO REAL: Buscar mensagens do banco de dados
    const { data, error } = await supabase.rpc('get_chat_messages', {
      chat_id_param: chatId,
      user_id_param: user.id
    });

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      return {
        success: false,
        error: 'Erro ao carregar mensagens: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao carregar mensagens'
      };
    }

    return {
      success: true,
      data: data.messages || []
    };

  } catch (error) {
    console.error('Erro inesperado ao buscar mensagens:', error);
    return {
      success: false,
      error: 'Erro inesperado ao carregar mensagens'
    };
  }
}

// Função para enviar uma mensagem
export async function sendMessage(chatId: string, content: string): Promise<ApiResponse<Message>> {
  try {
    console.log('📤 Enviando mensagem:', { chatId, content });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // ✅ IMPLEMENTAÇÃO REAL: Enviar mensagem para o banco de dados
    const { data, error } = await supabase.rpc('send_message', {
      chat_id_param: chatId,
      content_param: content,
      sender_id_param: user.id
    });

    if (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return {
        success: false,
        error: 'Erro ao enviar mensagem: ' + error.message
      };
    }

    console.log('📊 Resposta do send_message:', data);

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao enviar mensagem'
      };
    }

    // Buscar a mensagem criada para retornar
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', data.message_id)
      .single();

    if (messageError || !messageData) {
      console.error('❌ Erro ao recuperar mensagem:', messageError);
      return {
        success: false,
        error: 'Erro ao recuperar mensagem enviada'
      };
    }

    console.log('✅ Mensagem enviada com sucesso:', messageData);

    return {
      success: true,
      data: messageData
    };

  } catch (error) {
    console.error('Erro inesperado ao enviar mensagem:', error);
    return {
      success: false,
      error: 'Erro inesperado ao enviar mensagem'
    };
  }
}

// Função para atualizar o status de um chat
export async function updateChatStatus(chatId: string, status: 'novo_chat' | 'a_decorrer' | 'follow_up' | 'encerrado'): Promise<ApiResponse<boolean>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // ✅ IMPLEMENTAÇÃO REAL: Atualizar status no banco de dados
    const { data, error } = await supabase.rpc('update_chat_status', {
      chat_id_param: chatId,
      status_param: status,
      user_id_param: user.id
    });

    if (error) {
      console.error('Erro ao atualizar status do chat:', error);
      return {
        success: false,
        error: 'Erro ao atualizar status: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao atualizar status'
      };
    }

    return {
      success: true,
      data: true
    };

  } catch (error) {
    console.error('Erro inesperado ao atualizar status do chat:', error);
    return {
      success: false,
      error: 'Erro inesperado ao atualizar status do chat'
    };
  }
}

// Função para marcar mensagens como lidas
export async function markMessagesAsRead(chatId: string): Promise<ApiResponse<boolean>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // ✅ IMPLEMENTAÇÃO REAL: Marcar mensagens como lidas no banco de dados
    const { data, error } = await supabase.rpc('mark_messages_as_read', {
      chat_id_param: chatId,
      user_id_param: user.id
    });

    if (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      return {
        success: false,
        error: 'Erro ao marcar mensagens como lidas: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao marcar mensagens como lidas'
      };
    }

    return {
      success: true,
      data: true
    };

  } catch (error) {
    console.error('Erro inesperado ao marcar mensagens como lidas:', error);
    return {
      success: false,
      error: 'Erro inesperado ao marcar mensagens como lidas'
    };
  }
}

// Função para configurar Realtime para chats
export function setupChatRealtime(
  onNewMessage?: (message: Message) => void,
  onChatUpdate?: (chat: Chat) => void
) {
  // Configurar subscription para novas mensagens
  const messagesSubscription = supabase
    .channel('chat-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        if (onNewMessage) {
          onNewMessage(payload.new as Message);
        }
      }
    )
    .subscribe();

  // Configurar subscription para atualizações de chat
  const chatsSubscription = supabase
    .channel('chat-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chats'
      },
      (payload) => {
        if (onChatUpdate) {
          onChatUpdate(payload.new as Chat);
        }
      }
    )
    .subscribe();

  // Retornar função para limpar subscriptions
  return () => {
    supabase.removeChannel(messagesSubscription);
    supabase.removeChannel(chatsSubscription);
  };
}

// Função para buscar estatísticas de chat
export async function getChatStats(): Promise<ApiResponse<{
  total_chats: number;
  active_chats: number;
  new_chats: number;
  in_progress_chats: number;
  follow_up_chats: number;
  closed_chats: number;
  total_messages: number;
  unread_messages: number;
}>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // Verificar se o usuário é um psicólogo autorizado
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_role, authorized')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.user_role !== 'psicologo' || !profile.authorized) {
      return {
        success: false,
        error: 'Acesso negado. Apenas psicólogos autorizados podem acessar estatísticas.'
      };
    }

    // ✅ IMPLEMENTAÇÃO REAL: Buscar estatísticas do banco de dados
    const { data: chatStats, error: chatError } = await supabase
      .from('chats')
      .select('status, is_active')
      .eq('is_active', true);

    if (chatError) {
      console.error('Erro ao buscar estatísticas de chats:', chatError);
      return {
        success: false,
        error: 'Erro ao carregar estatísticas: ' + chatError.message
      };
    }

    const { data: messageStats, error: messageError } = await supabase
      .from('messages')
      .select('is_read')
      .eq('is_deleted', false);

    if (messageError) {
      console.error('Erro ao buscar estatísticas de mensagens:', messageError);
      return {
        success: false,
        error: 'Erro ao carregar estatísticas: ' + messageError.message
      };
    }

    // Calcular estatísticas
    const stats = {
      total_chats: chatStats?.length || 0,
      active_chats: chatStats?.filter(c => c.is_active).length || 0,
      new_chats: chatStats?.filter(c => c.status === 'novo_chat').length || 0,
      in_progress_chats: chatStats?.filter(c => c.status === 'a_decorrer').length || 0,
      follow_up_chats: chatStats?.filter(c => c.status === 'follow_up').length || 0,
      closed_chats: chatStats?.filter(c => c.status === 'encerrado').length || 0,
      total_messages: messageStats?.length || 0,
      unread_messages: messageStats?.filter(m => !m.is_read).length || 0
    };

    return {
      success: true,
      data: stats
    };

  } catch (error) {
    console.error('Erro inesperado ao buscar estatísticas:', error);
    return {
      success: false,
      error: 'Erro inesperado ao carregar estatísticas'
    };
  }
}

// Função para encerrar um chat
export async function closeChat(chatId: string): Promise<ApiResponse<boolean>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // Verificar se o usuário é um psicólogo autorizado
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_role, authorized')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.user_role !== 'psicologo' || !profile.authorized) {
      return {
        success: false,
        error: 'Acesso negado. Apenas psicólogos autorizados podem encerrar chats.'
      };
    }

    // ✅ IMPLEMENTAÇÃO REAL: Encerrar chat no banco de dados
    const { data, error } = await supabase.rpc('update_chat_status', {
      chat_id_param: chatId,
      status_param: 'encerrado',
      user_id_param: user.id
    });

    if (error) {
      console.error('Erro ao encerrar chat:', error);
      return {
        success: false,
        error: 'Erro ao encerrar chat: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao encerrar chat'
      };
    }

    // Marcar chat como inativo
    const { error: updateError } = await supabase
      .from('chats')
      .update({ is_active: false })
      .eq('id', chatId);

    if (updateError) {
      console.error('Erro ao marcar chat como inativo:', updateError);
      return {
        success: false,
        error: 'Erro ao marcar chat como inativo: ' + updateError.message
      };
    }

    return {
      success: true,
      data: true
    };

  } catch (error) {
    console.error('Erro inesperado ao encerrar chat:', error);
    return {
      success: false,
      error: 'Erro inesperado ao encerrar chat'
    };
  }
}

// Função para buscar usuários disponíveis para criar chats
export async function getAvailableUsers(): Promise<ApiResponse<{ id: string; name: string; email: string }[]>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // Verificar se o usuário é um psicólogo autorizado
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_role, authorized')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.user_role !== 'psicologo' || !profile.authorized) {
      return {
        success: false,
        error: 'Acesso negado. Apenas psicólogos autorizados podem acessar usuários.'
      };
    }

    // ✅ IMPLEMENTAÇÃO REAL: Buscar usuários app autorizados sem chat ativo
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('user_role', 'app')
      .eq('authorized', true)
      .not('id', 'in', `(
        SELECT DISTINCT app_user_id 
        FROM chats 
        WHERE is_active = true
      )`);

    if (error) {
      console.error('Erro ao buscar usuários disponíveis:', error);
      return {
        success: false,
        error: 'Erro ao carregar usuários: ' + error.message
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('Erro inesperado ao buscar usuários disponíveis:', error);
    return {
      success: false,
      error: 'Erro inesperado ao carregar usuários'
    };
  }
}

// Função para criar um novo chat
export async function createChat(appUserId: string): Promise<ApiResponse<Chat>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // Verificar se o usuário é um psicólogo autorizado
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_role, authorized')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.user_role !== 'psicologo' || !profile.authorized) {
      return {
        success: false,
        error: 'Acesso negado. Apenas psicólogos autorizados podem criar chats.'
      };
    }

    // ✅ IMPLEMENTAÇÃO REAL: Criar chat no banco de dados
    const { data, error } = await supabase.rpc('create_chat', {
      app_user_id_param: appUserId
    });

    if (error) {
      console.error('Erro ao criar chat:', error);
      return {
        success: false,
        error: 'Erro ao criar chat: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao criar chat'
      };
    }

    // Buscar o chat criado para retornar
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', data.chat_id)
      .single();

    if (chatError || !chatData) {
      return {
        success: false,
        error: 'Erro ao recuperar chat criado'
      };
    }

    return {
      success: true,
      data: chatData
    };

  } catch (error) {
    console.error('Erro inesperado ao criar chat:', error);
    return {
      success: false,
      error: 'Erro inesperado ao criar chat'
    };
  }
}

// Função para simular recebimento de nova mensagem (para testes)
export async function simulateNewMessage(chatId: string, content: string): Promise<ApiResponse<Message>> {
  try {
    // ✅ IMPLEMENTAÇÃO REAL: Criar mensagem simulada no banco de dados
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // Buscar um usuário app para simular mensagem
    const { data: appUser, error: appUserError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_role', 'app')
      .eq('authorized', true)
      .limit(1)
      .single();

    if (appUserError || !appUser) {
      return {
        success: false,
        error: 'Não foi possível encontrar um usuário para simular a mensagem'
      };
    }

    // Enviar mensagem simulada
    const { data, error } = await supabase.rpc('send_message', {
      chat_id_param: chatId,
      content_param: content,
      sender_id_param: appUser.id
    });

    if (error) {
      console.error('Erro ao simular nova mensagem:', error);
      return {
        success: false,
        error: 'Erro ao simular mensagem: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao simular mensagem'
      };
    }

    // Buscar a mensagem criada
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', data.message_id)
      .single();

    if (messageError || !messageData) {
      return {
        success: false,
        error: 'Erro ao recuperar mensagem simulada'
      };
    }

    return {
      success: true,
      data: messageData
    };

  } catch (error) {
    console.error('Erro inesperado ao simular nova mensagem:', error);
    return {
      success: false,
      error: 'Erro inesperado ao simular nova mensagem'
    };
  }
}
