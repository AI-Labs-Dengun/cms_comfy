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
  // Novas colunas para associação de psicólogos
  assigned_psicologo_id?: string;
  assigned_at?: string;
  is_primary_assignment?: boolean;
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
  // Novas colunas para associação de psicólogos
  assigned_psicologo_id?: string;
  assigned_at?: string;
  is_primary_assignment?: boolean;
}

// Interface para psicólogo associado a um chat
export interface AssignedPsicologo {
  id: string;
  name: string;
  username: string;
  is_online: boolean;
  last_seen?: string;
  assigned_at: string;
  is_primary_assignment: boolean;
}

// Interface para informações de psicólogos disponíveis
export interface AvailablePsicologo {
  id: string;
  name: string;
  username: string;
  is_online: boolean;
  last_seen?: string;
  assigned_chats_count: number;
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

// Função para buscar mensagens de um chat com paginação
export async function getChatMessages(chatId: string, limit: number = 20, offset: number = 0): Promise<ApiResponse<Message[]>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // ✅ IMPLEMENTAÇÃO REAL: Buscar mensagens do banco de dados com paginação
    const { data, error } = await supabase.rpc('get_chat_messages_paginated', {
      chat_id_param: chatId,
      user_id_param: user.id,
      limit_param: limit,
      offset_param: offset
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

// Função para buscar mensagens de um chat (versão sem paginação para compatibilidade)
export async function getChatMessagesAll(chatId: string): Promise<ApiResponse<Message[]>> {
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

// Função para buscar psicólogos associados a um chat
export async function getChatPsicologos(chatId: string): Promise<ApiResponse<AssignedPsicologo[]>> {
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
        error: 'Acesso negado. Apenas psicólogos autorizados podem ver associações.'
      };
    }

    // Buscar psicólogo associado ao chat usando a nova função SQL
    const { data, error } = await supabase.rpc('get_chat_assigned_psicologo', {
      chat_id_param: chatId
    });

    if (error) {
      console.error('Erro ao buscar psicólogo associado:', error);
      return {
        success: false,
        error: 'Erro ao carregar psicólogo associado: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao carregar psicólogo associado'
      };
    }

    // Se não há psicólogo associado, retornar array vazio
    if (!data.data) {
      return {
        success: true,
        data: []
      };
    }

    // Retornar o psicólogo associado como array
    const psicologo: AssignedPsicologo = {
      id: data.data.id,
      name: data.data.name,
      username: data.data.username,
      is_online: data.data.is_online,
      last_seen: data.data.last_seen,
      assigned_at: data.data.assigned_at,
      is_primary_assignment: data.data.is_primary_assignment
    };

    return {
      success: true,
      data: [psicologo]
    };

  } catch (error) {
    console.error('Erro inesperado ao buscar psicólogo associado:', error);
    return {
      success: false,
      error: 'Erro inesperado ao carregar psicólogo associado'
    };
  }
}

// Função para associar um psicólogo a um chat
export async function associatePsicologoToChat(chatId: string, psicologoId: string): Promise<ApiResponse<AssignedPsicologo>> {
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
        error: 'Acesso negado. Apenas psicólogos autorizados podem associar-se a chats.'
      };
    }

    // Associar psicólogo ao chat usando a nova função SQL
    const { data, error } = await supabase.rpc('assign_psicologo_to_chat', {
      chat_id_param: chatId,
      psicologo_id_param: psicologoId
    });

    if (error) {
      console.error('Erro ao associar psicólogo:', error);
      return {
        success: false,
        error: 'Erro ao associar psicólogo: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao associar psicólogo'
      };
    }

    // Buscar informações do psicólogo associado
    const psicologo: AssignedPsicologo = {
      id: data.data.psicologo_id,
      name: data.data.psicologo_name,
      username: data.data.psicologo_username,
      is_online: false, // Será atualizado na próxima consulta
      assigned_at: data.data.assigned_at,
      is_primary_assignment: true
    };

    return {
      success: true,
      data: psicologo
    };

  } catch (error) {
    console.error('Erro inesperado ao associar psicólogo:', error);
    return {
      success: false,
      error: 'Erro inesperado ao associar psicólogo'
    };
  }
}

// Função para o psicólogo se auto-associar a um chat
export async function selfAssignToChat(chatId: string): Promise<ApiResponse<AssignedPsicologo>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // Auto-associar psicólogo ao chat usando a nova função SQL
    const { data, error } = await supabase.rpc('self_assign_to_chat', {
      chat_id_param: chatId
    });

    if (error) {
      console.error('Erro ao se auto-associar:', error);
      return {
        success: false,
        error: 'Erro ao se associar à conversa: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao se associar à conversa'
      };
    }

    // Buscar informações do psicólogo associado
    const psicologo: AssignedPsicologo = {
      id: data.data.psicologo_id,
      name: data.data.psicologo_name,
      username: data.data.psicologo_username,
      is_online: false, // Será atualizado na próxima consulta
      assigned_at: data.data.assigned_at,
      is_primary_assignment: true
    };

    return {
      success: true,
      data: psicologo
    };

  } catch (error) {
    console.error('Erro inesperado ao se auto-associar:', error);
    return {
      success: false,
      error: 'Erro inesperado ao se associar à conversa'
    };
  }
}

// Função para desassociar um psicólogo de um chat
export async function disassociatePsicologoFromChat(chatId: string, psicologoId: string): Promise<ApiResponse<boolean>> {
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
        error: 'Acesso negado. Apenas psicólogos autorizados podem desassociar-se de chats.'
      };
    }

    // OTIMIZAÇÃO: Remover verificação desnecessária - a função SQL já verifica se está associado
    // Isso reduz o tempo de resposta em ~200-300ms

    // Desassociar psicólogo do chat usando a nova função SQL
    const { data, error } = await supabase.rpc('unassign_psicologo_from_chat', {
      chat_id_param: chatId
    });

    if (error) {
      console.error('Erro ao desassociar psicólogo:', error);
      return {
        success: false,
        error: 'Erro ao desassociar psicólogo: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao desassociar psicólogo'
      };
    }

    return {
      success: true,
      data: true
    };

  } catch (error) {
    console.error('Erro inesperado ao desassociar psicólogo:', error);
    return {
      success: false,
      error: 'Erro inesperado ao desassociar psicólogo'
    };
  }
}

// Função para buscar psicólogos disponíveis para associar a um chat
export async function getAvailablePsicologosForChat(): Promise<ApiResponse<AvailablePsicologo[]>> {
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
        error: 'Acesso negado. Apenas psicólogos autorizados podem ver psicólogos disponíveis.'
      };
    }

    // Buscar psicólogos disponíveis usando a nova função SQL
    const { data, error } = await supabase.rpc('get_available_psicologos');

    if (error) {
      console.error('Erro ao buscar psicólogos disponíveis:', error);
      return {
        success: false,
        error: 'Erro ao carregar psicólogos disponíveis: ' + error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao carregar psicólogos disponíveis'
      };
    }

    const psicologos: AvailablePsicologo[] = data.data || [];

    return {
      success: true,
      data: psicologos
    };

  } catch (error) {
    console.error('Erro inesperado ao buscar psicólogos disponíveis:', error);
    return {
      success: false,
      error: 'Erro inesperado ao carregar psicólogos disponíveis'
    };
  }
}
