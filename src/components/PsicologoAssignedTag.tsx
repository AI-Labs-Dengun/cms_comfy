'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, UserMinus, User, Check, X } from 'lucide-react';
import { selfAssignToChat, disassociatePsicologoFromChat } from '@/services/chat';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface PsicologoAssignedTagProps {
  chatId: string;
  onUpdate?: () => void;
  className?: string;
  variant?: 'compact' | 'full';
}

interface AssignedPsicologo {
  id: string;
  name: string;
  username: string;
  is_online: boolean;
  assigned_at: string;
  is_primary_assignment: boolean;
}

export default function PsicologoAssignedTag({ 
  chatId, 
  onUpdate, 
  className = '', 
  variant = 'compact' 
}: PsicologoAssignedTagProps) {
  const { profile } = useAuth();
  const [assignedPsicologo, setAssignedPsicologo] = useState<AssignedPsicologo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Verificar se o psicólogo atual está associado
  const isCurrentlyAssigned = assignedPsicologo?.id === profile?.id;

  // Função para buscar psicólogo associado
  const loadAssignedPsicologo = useCallback(async () => {
    try {
      setIsLoadingData(true);
      
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
        setAssignedPsicologo(null);
        return;
      }

      console.log('🔍 Dados do chat carregados:', {
        chatId,
        assigned_psicologo_id: chatData?.assigned_psicologo_id,
        profiles: chatData?.profiles,
        currentUserId: profile?.id
      });

      if (chatData?.assigned_psicologo_id && chatData.profiles) {
        const psicologoProfile = Array.isArray(chatData.profiles) ? chatData.profiles[0] : chatData.profiles;
        setAssignedPsicologo({
          id: psicologoProfile.id,
          name: psicologoProfile.name,
          username: psicologoProfile.username,
          is_online: psicologoProfile.is_online,
          assigned_at: chatData.assigned_at,
          is_primary_assignment: chatData.is_primary_assignment
        });
        
        console.log('✅ Psicólogo associado encontrado:', {
          id: psicologoProfile.id,
          name: psicologoProfile.name,
          isCurrentlyAssigned: psicologoProfile.id === profile?.id
        });
      } else {
        setAssignedPsicologo(null);
        console.log('ℹ️ Nenhum psicólogo associado ao chat');
      }
    } catch (err) {
      console.error('Erro ao carregar psicólogo associado:', err);
      setAssignedPsicologo(null);
    } finally {
      setIsLoadingData(false);
    }
  }, [chatId, profile?.id]);

  // Função para associar/desassociar
  const handleToggleAssignment = async (e: React.MouseEvent) => {
    // Prevenir que o clique propague para o container pai (evita abrir o chat)
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      setSuccess(false);

      let result;
      
      if (isCurrentlyAssigned) {
        // Se já está associado, desassociar
        console.log('🔄 Desassociando psicólogo do chat:', chatId);
        result = await disassociatePsicologoFromChat(chatId);
      } else {
        // Se não está associado, associar
        console.log('🔄 Associando psicólogo ao chat:', chatId);
        result = await selfAssignToChat(chatId);
      }
      
      if (result.success) {
        setSuccess(true);
        
        // Recarregar dados do psicólogo associado
        await loadAssignedPsicologo();
        
        // Notificar atualização
        if (onUpdate) {
          onUpdate();
        }
        
        // Resetar estado de sucesso após 1.5 segundos
        setTimeout(() => {
          setSuccess(false);
        }, 1500);
      } else {
        console.error(`❌ Erro na ${isCurrentlyAssigned ? 'desassociação' : 'auto-associação'}:`, result.error);
        setError(result.error || `Erro ao ${isCurrentlyAssigned ? 'se desassociar' : 'se associar'} à conversa`);
      }
    } catch (err) {
      console.error(`❌ Erro ao ${isCurrentlyAssigned ? 'se desassociar' : 'se auto-associar'}:`, err);
      setError('Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar psicólogo associado quando o chat mudar
  useEffect(() => {
    if (chatId) {
      loadAssignedPsicologo();
    }
  }, [chatId, loadAssignedPsicologo]);

  // Verificar periodicamente se há mudanças na associação (sem piscar)
  useEffect(() => {
    if (!chatId) return;

    const interval = setInterval(async () => {
      try {
        // Buscar dados sem mostrar loading
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
          console.error('Erro ao buscar psicólogo associado (background):', chatError);
          return;
        }

        // Atualizar estado apenas se houve mudança real
        if (chatData?.assigned_psicologo_id && chatData.profiles) {
          const psicologoProfile = Array.isArray(chatData.profiles) ? chatData.profiles[0] : chatData.profiles;
          const newAssignedPsicologo = {
            id: psicologoProfile.id,
            name: psicologoProfile.name,
            username: psicologoProfile.username,
            is_online: psicologoProfile.is_online,
            assigned_at: chatData.assigned_at,
            is_primary_assignment: chatData.is_primary_assignment
          };
          
          // Só atualizar se os dados realmente mudaram
          setAssignedPsicologo(prev => {
            if (!prev || 
                prev.id !== newAssignedPsicologo.id ||
                prev.name !== newAssignedPsicologo.name ||
                prev.is_online !== newAssignedPsicologo.is_online ||
                prev.assigned_at !== newAssignedPsicologo.assigned_at ||
                prev.is_primary_assignment !== newAssignedPsicologo.is_primary_assignment) {
              console.log('🔄 PsicologoAssignedTag - Dados atualizados em background:', newAssignedPsicologo);
              return newAssignedPsicologo;
            }
            return prev;
          });
        } else {
          // Se não há psicólogo associado, verificar se precisa atualizar
          setAssignedPsicologo(prev => {
            if (prev !== null) {
              console.log('🔄 PsicologoAssignedTag - Psicólogo removido em background');
              return null;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Erro ao verificar psicólogo associado em background:', err);
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(interval);
  }, [chatId]);

  // Escutar mudanças na tabela chats em tempo real
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-assignment-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
          filter: `id=eq.${chatId}`,
        },
        (payload) => {
          console.log('🔄 Associação de chat atualizada em tempo real:', payload);
          if (payload.new) {
            // Recarregar dados do psicólogo associado
            loadAssignedPsicologo();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, loadAssignedPsicologo]);

  // Só mostrar para psicólogos autorizados
  const isPsicologo = profile?.user_role === 'psicologo' && profile?.authorized;
  if (!isPsicologo) {
    return null;
  }

  if (isLoadingData) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${className}`}>
        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-1"></div>
        <span>Carregando...</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={handleToggleAssignment}
          disabled={loading}
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            success
              ? 'bg-green-100 text-green-700 focus:ring-green-500'
              : loading
              ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
              : assignedPsicologo
              ? isCurrentlyAssigned
                ? 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200 focus:ring-purple-500'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200 focus:ring-orange-500'
          } ${className}`}
          title={
            success
              ? isCurrentlyAssigned ? 'Desassociado com sucesso!' : 'Associado com sucesso!'
              : loading
              ? isCurrentlyAssigned ? 'Desassociando...' : 'Associando...'
              : assignedPsicologo
              ? isCurrentlyAssigned
                ? 'Me desassociar desta conversa'
                : `Associado a ${assignedPsicologo.name}`
              : 'Chat disponível - me associar'
          }
        >
          {loading ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></div>
          ) : success ? (
            <Check className="w-3 h-3 mr-1" />
          ) : assignedPsicologo ? (
            isCurrentlyAssigned ? (
              <UserMinus className="w-3 h-3 mr-1" />
            ) : (
              <User className="w-3 h-3 mr-1" />
            )
          ) : (
            <UserPlus className="w-3 h-3 mr-1" />
          )}
          
          {assignedPsicologo 
            ? isCurrentlyAssigned 
              ? 'Você' 
              : assignedPsicologo.name.split(' ')[0]
            : 'Disponível'
          }
          
          {assignedPsicologo && !isCurrentlyAssigned && (
            <div className={`ml-1 w-2 h-2 rounded-full ${
              assignedPsicologo.is_online ? 'bg-green-400' : 'bg-gray-400'
            }`}></div>
          )}
        </button>
        
        {error && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-red-100 text-red-700 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap">
            {error}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setError('');
              }}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Variante completa
  return (
    <div className="relative">
      <button
        onClick={handleToggleAssignment}
        disabled={loading}
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          success
            ? 'bg-green-100 text-green-700 focus:ring-green-500'
            : loading
            ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
            : assignedPsicologo
            ? isCurrentlyAssigned
              ? 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500'
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200 focus:ring-purple-500'
            : 'bg-orange-100 text-orange-700 hover:bg-orange-200 focus:ring-orange-500'
        } ${className}`}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
            <span>{isCurrentlyAssigned ? 'Desassociando...' : 'Associando...'}</span>
          </>
        ) : success ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            <span>{isCurrentlyAssigned ? 'Desassociado!' : 'Você!'}</span>
          </>
        ) : assignedPsicologo ? (
          <>
            {isCurrentlyAssigned ? <UserMinus className="w-4 h-4 mr-2" /> : <User className="w-4 h-4 mr-2" />}
            <span>
              {isCurrentlyAssigned ? 'Você' : `👨‍⚕️ ${assignedPsicologo.name}`}
            </span>
            {!isCurrentlyAssigned && (
              <div className={`ml-2 w-2 h-2 rounded-full ${
                assignedPsicologo.is_online ? 'bg-green-400' : 'bg-gray-400'
              }`}></div>
            )}
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            <span>Disponível</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-red-100 text-red-700 text-xs rounded-lg shadow-lg z-10 whitespace-nowrap">
          {error}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setError('');
            }}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
