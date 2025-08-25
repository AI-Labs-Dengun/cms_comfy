import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface UseOnlineStatusReturn {
  isOnline: boolean;
  isUpdating: boolean;
  wasAutoOffline: boolean;
  clearAutoOfflineFlag: () => void;
  updateStatus: (newStatus: boolean) => Promise<void>;
  refreshStatus: () => Promise<void>;
  inactivityTimeout: number;
  setInactivityTimeout: (timeout: number) => void;
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const { profile } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [wasAutoOffline, setWasAutoOffline] = useState(false);
  const [inactivityTimeout, setInactivityTimeout] = useState(5 * 60 * 1000); // 5 minutos padrão

  // Debug logs
  console.log('🔍 useOnlineStatus - Render:', {
    profileId: profile?.id,
    profileRole: profile?.user_role,
    isOnline,
    wasAutoOffline,
    inactivityTimeout: inactivityTimeout / 1000 / 60
  });

  // Carregar status inicial
  useEffect(() => {
    if (profile?.id) {
      console.log('🔍 useOnlineStatus - Carregando status inicial:', profile.is_online);
      setIsOnline(profile.is_online || false);
    }
  }, [profile]);

  // Função para atualizar status
  const updateStatus = useCallback(async (newStatus: boolean) => {
    if (!profile?.id || profile.user_role !== 'psicologo') {
      console.log('🔍 useOnlineStatus - updateStatus ignorado:', { profileId: profile?.id, role: profile?.user_role });
      return;
    }

    console.log('🔍 useOnlineStatus - Atualizando status para:', newStatus);
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .rpc('update_psicologo_status', {
          psicologo_id: profile.id,
          new_status: newStatus
        });

      if (error) {
        console.error('❌ Erro ao atualizar status:', error);
        throw new Error(error.message);
      }

      setIsOnline(newStatus);
      console.log('✅ Status atualizado:', newStatus ? 'Online' : 'Offline');
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar status:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [profile]);

  // Função para limpar flag de auto-offline
  const clearAutoOfflineFlag = useCallback(() => {
    console.log('🔍 useOnlineStatus - Limpando flag de auto-offline');
    setWasAutoOffline(false);
  }, []);

  // Função para atualizar status
  const refreshStatus = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_online')
        .eq('id', profile.id)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar status:', error);
        return;
      }

      setIsOnline(data.is_online || false);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar status:', error);
    }
  }, [profile]);

  // Timer para auto-offline - VERSÃO SIMPLIFICADA PARA TESTE
  useEffect(() => {
    console.log('🔍 useOnlineStatus - useEffect timer (versão simplificada)');

    if (!profile?.id || profile.user_role !== 'psicologo' || !isOnline) {
      console.log('🔍 useOnlineStatus - Timer não iniciado (condições não atendidas)');
      return;
    }

    console.log('🔍 useOnlineStatus - Iniciando timer simplificado');
    let timeoutId: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      console.log('🔍 useOnlineStatus - Visibility change:', { hidden: document.hidden });

      if (document.hidden) {
        console.log(`⏰ useOnlineStatus - Iniciando timer de ${inactivityTimeout / 1000 / 60} minutos`);
        timeoutId = setTimeout(async () => {
          console.log('⏰ useOnlineStatus - Timer executado, alterando para offline');
          try {
            await updateStatus(false);
            setWasAutoOffline(true);
            console.log('✅ useOnlineStatus - Status alterado para offline automaticamente');
          } catch (error) {
            console.error('❌ useOnlineStatus - Erro ao alterar status automaticamente:', error);
          }
        }, inactivityTimeout);
      } else {
        if (timeoutId) {
          console.log('⏰ useOnlineStatus - Cancelando timer');
          clearTimeout(timeoutId);
        }
      }
    };

    // Verificar estado inicial
    handleVisibilityChange();

    // Adicionar listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('🔍 useOnlineStatus - Cleanup timer');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [profile?.id, profile?.user_role, isOnline, updateStatus, inactivityTimeout]);

  return {
    isOnline,
    isUpdating,
    wasAutoOffline,
    clearAutoOfflineFlag,
    updateStatus,
    refreshStatus,
    inactivityTimeout,
    setInactivityTimeout
  };
}
