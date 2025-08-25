import { supabase } from '@/lib/supabase';

// Tipos para o sistema de chat
export interface Chat {
  id: string;
  app_user_id: string;
  app_user_name: string;
  last_message_at: string;
  last_message_content?: string;
  unread_count_psicologo: number;
  is_active: boolean;
  status: 'novo_chat' | 'a_decorrer' | 'follow_up' | 'encerrado';
  psicologo_id?: string;
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
}

export interface ChatInfo {
  id: string;
  app_user_id: string;
  app_user_name: string;
  is_active: boolean;
  status: 'novo_chat' | 'a_decorrer' | 'follow_up' | 'encerrado';
  psicologo_id?: string;
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
        error: 'Acesso negado. Apenas psicólogos autorizados podem acessar os chats.'
      };
    }

    // Buscar chats (por enquanto dados simulados)
    // TODO: Implementar busca real no banco de dados
    const mockChats: Chat[] = [
      {
        id: '1',
        app_user_id: 'user1',
        app_user_name: 'João Silva',
        last_message_at: new Date(Date.now() - 30000).toISOString(),
        last_message_content: 'Olá, preciso de ajuda...',
        unread_count_psicologo: 2,
        is_active: true,
        status: 'novo_chat',
        psicologo_id: profile.id,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 30000).toISOString()
      },
      {
        id: '2',
        app_user_id: 'user2',
        app_user_name: 'Maria Santos',
        last_message_at: new Date(Date.now() - 300000).toISOString(),
        last_message_content: 'Obrigada pela sessão de hoje.',
        unread_count_psicologo: 0,
        is_active: true,
        status: 'a_decorrer',
        psicologo_id: profile.id,
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: '3',
        app_user_id: 'user3',
        app_user_name: 'Pedro Costa',
        last_message_at: new Date(Date.now() - 86400000).toISOString(),
        last_message_content: 'Consegui aplicar as técnicas que discutimos.',
        unread_count_psicologo: 1,
        is_active: true,
        status: 'follow_up',
        psicologo_id: profile.id,
        created_at: new Date(Date.now() - 259200000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '4',
        app_user_id: 'user4',
        app_user_name: 'Ana Oliveira',
        last_message_at: new Date(Date.now() - 172800000).toISOString(),
        last_message_content: 'Vou marcar uma nova consulta.',
        unread_count_psicologo: 0,
        is_active: true,
        status: 'encerrado',
        psicologo_id: profile.id,
        created_at: new Date(Date.now() - 345600000).toISOString(),
        updated_at: new Date(Date.now() - 172800000).toISOString()
      }
    ];

    return {
      success: true,
      data: mockChats
    };

  } catch (error) {
    console.error('Erro ao buscar chats:', error);
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

    // TODO: Implementar busca real no banco de dados
    const mockChatInfo: ChatInfo = {
      id: chatId,
      app_user_id: 'user1',
      app_user_name: 'João Silva',
      is_active: true,
      status: 'novo_chat',
      psicologo_id: user.id,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString()
    };

    return {
      success: true,
      data: mockChatInfo
    };

  } catch (error) {
    console.error('Erro ao buscar informações do chat:', error);
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

    // TODO: Implementar busca real no banco de dados
    const mockMessages: Message[] = [
      {
        id: '1',
        chat_id: chatId,
        sender_id: 'user1',
        sender_type: 'app_user',
        content: 'Olá, preciso de ajuda com ansiedade.',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        is_read: true,
        is_deleted: false
      },
      {
        id: '2',
        chat_id: chatId,
        sender_id: user.id,
        sender_type: 'psicologo',
        content: 'Olá! Como posso ajudá-lo hoje? Pode me contar um pouco mais sobre o que está sentindo?',
        created_at: new Date(Date.now() - 82800000).toISOString(),
        is_read: true,
        is_deleted: false
      },
      {
        id: '3',
        chat_id: chatId,
        sender_id: 'user1',
        sender_type: 'app_user',
        content: 'Tenho sentido muito estresse no trabalho e isso está afetando meu sono.',
        created_at: new Date(Date.now() - 79200000).toISOString(),
        is_read: false,
        is_deleted: false
      }
    ];

    return {
      success: true,
      data: mockMessages
    };

  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return {
      success: false,
      error: 'Erro inesperado ao carregar mensagens'
    };
  }
}

// Função para enviar uma mensagem
export async function sendMessage(chatId: string, content: string): Promise<ApiResponse<Message>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // TODO: Implementar envio real no banco de dados
    const newMessage: Message = {
      id: Date.now().toString(),
      chat_id: chatId,
      sender_id: user.id,
      sender_type: 'psicologo',
      content,
      created_at: new Date().toISOString(),
      is_read: false,
      is_deleted: false
    };

    // Atualizar status do chat para "a_decorrer" quando o psicólogo responde
    await updateChatStatus(chatId, 'a_decorrer');

    return {
      success: true,
      data: newMessage
    };

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
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

    // TODO: Implementar atualização real no banco de dados
    console.log(`Atualizando status do chat ${chatId} para: ${status}`);

    return {
      success: true,
      data: true
    };

  } catch (error) {
    console.error('Erro ao atualizar status do chat:', error);
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

    // TODO: Implementar marcação real no banco de dados
    console.log(`Marcando mensagens do chat ${chatId} como lidas`);

    return {
      success: true,
      data: true
    };

  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
    return {
      success: false,
      error: 'Erro inesperado ao marcar mensagens como lidas'
    };
  }
}

// Função para simular recebimento de nova mensagem (para testes)
export async function simulateNewMessage(chatId: string, content: string): Promise<ApiResponse<Message>> {
  try {
    // TODO: Implementar recebimento real no banco de dados
    const newMessage: Message = {
      id: Date.now().toString(),
      chat_id: chatId,
      sender_id: 'user1',
      sender_type: 'app_user',
      content,
      created_at: new Date().toISOString(),
      is_read: false,
      is_deleted: false
    };

    // Se for uma nova mensagem de um chat que não tem psicólogo atribuído,
    // o status deve ser "novo_chat"
    await updateChatStatus(chatId, 'novo_chat');

    return {
      success: true,
      data: newMessage
    };

  } catch (error) {
    console.error('Erro ao simular nova mensagem:', error);
    return {
      success: false,
      error: 'Erro inesperado ao simular nova mensagem'
    };
  }
}
