import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface UseOnlineStatusReturn {
  isOnline: boolean;
  isUpdating: boolean;
  updateStatus: (newStatus: boolean) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const { profile } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Carregar status inicial
  useEffect(() => {
    if (profile?.id) {
      setIsOnline(profile.is_online || false);
    }
  }, [profile]);

  // Função para atualizar status
  const updateStatus = useCallback(async (newStatus: boolean) => {
    if (!profile?.id || profile.user_role !== 'psicologo') return;

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

  return {
    isOnline,
    isUpdating,
    updateStatus,
    refreshStatus
  };
}
