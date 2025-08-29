"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
  const [chatsData, setChatsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        
        // Buscar todos os chats diretamente
        const { data, error } = await supabase
          .from('chats')
          .select(`
            id,
            app_user_id,
            status,
            is_active,
            last_message_at,
            last_message_content,
            last_message_sender_type,
            last_message_sender_name,
            unread_count_psicologo,
            created_at,
            updated_at,
            assigned_psicologo_id,
            assigned_at,
            is_primary_assignment,
            profiles!app_user_id (
              name
            )
          `)
          .eq('is_active', true)
          .order('last_message_at', { ascending: false });

        if (error) {
          console.error('Erro ao buscar chats:', error);
          setError(error.message);
          return;
        }

        console.log('🔍 Dados brutos dos chats:', data);
        setChatsData(data || []);
        
      } catch (err) {
        console.error('Erro inesperado:', err);
        setError('Erro inesperado');
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando dados de debug...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug - Dados dos Chats</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Total de chats: {chatsData.length}</h2>
          
          <div className="space-y-4">
            {chatsData.map((chat, index) => (
              <div key={chat.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">Chat {index + 1}: {chat.id}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Status:</span> {chat.status}
                  </div>
                  <div>
                    <span className="font-medium">Ativo:</span> {chat.is_active ? 'Sim' : 'Não'}
                  </div>
                  <div>
                    <span className="font-medium">Usuário:</span> {chat.profiles?.name || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Assigned Psicologo ID:</span> 
                    <span className={`ml-1 ${chat.assigned_psicologo_id ? 'text-green-600' : 'text-red-600'}`}>
                      {chat.assigned_psicologo_id || 'NULL'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Tipo assigned_psicologo_id:</span> {typeof chat.assigned_psicologo_id}
                  </div>
                  <div>
                    <span className="font-medium">Assigned At:</span> {chat.assigned_at || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Primary Assignment:</span> {chat.is_primary_assignment ? 'Sim' : 'Não'}
                  </div>
                  <div>
                    <span className="font-medium">Última mensagem:</span> {chat.last_message_at || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Não lidas:</span> {chat.unread_count_psicologo || 0}
                  </div>
                </div>
                
                {chat.last_message_content && (
                  <div className="mt-2">
                    <span className="font-medium">Última mensagem:</span>
                    <p className="text-gray-600 mt-1">{chat.last_message_content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 