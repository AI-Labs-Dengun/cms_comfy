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
  isInactivityTimerActive: boolean;
  getRemainingTime: () => number;
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const { profile } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [wasAutoOffline, setWasAutoOffline] = useState(false);
  const [inactivityTimeout, setInactivityTimeout] = useState(5 * 60 * 1000); // 5 minutos padrão
  const [isInactivityTimerActive, setIsInactivityTimerActive] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // Debug logs
  console.log('🔍 useOnlineStatus - Render:', {
    profileId: profile?.id,
    profileRole: profile?.user_role,
    isOnline,
    wasAutoOffline,
    inactivityTimeout: inactivityTimeout / 1000 / 60,
    isInactivityTimerActive
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

  // Função para obter tempo restante
  const getRemainingTime = useCallback(() => {
    if (!isInactivityTimerActive) return 0;
    const now = Date.now();
    const elapsed = now - lastActivityTime;
    const remaining = inactivityTimeout - elapsed;
    return Math.max(0, remaining);
  }, [isInactivityTimerActive, lastActivityTime, inactivityTimeout]);

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

  // Timer para auto-offline - VERSÃO COMPLETA COM DETECÇÃO DE INATIVIDADE
  useEffect(() => {
    console.log('🔍 useOnlineStatus - useEffect timer (versão completa)');

    if (!profile?.id || profile.user_role !== 'psicologo' || !isOnline) {
      console.log('🔍 useOnlineStatus - Timer não iniciado (condições não atendidas)');
      setIsInactivityTimerActive(false);
      return;
    }

    console.log('🔍 useOnlineStatus - Iniciando timer completo com detecção de inatividade');
    let timeoutId: NodeJS.Timeout;
    let currentLastActivityTime = Date.now();
    setLastActivityTime(currentLastActivityTime);
    setIsInactivityTimerActive(true);

    // Função para resetar o timer
    const resetTimer = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - currentLastActivityTime;
      
      // Só resetar se passou pelo menos 1 segundo desde a última atividade
      // Isso evita resetar o timer constantemente
      if (timeSinceLastActivity > 1000) {
        console.log('🔍 useOnlineStatus - Atividade detectada, resetando timer');
        currentLastActivityTime = now;
        setLastActivityTime(now);
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Iniciar novo timer
        timeoutId = setTimeout(async () => {
          console.log('⏰ useOnlineStatus - Timer executado, alterando para offline');
          try {
            await updateStatus(false);
            setWasAutoOffline(true);
            setIsInactivityTimerActive(false);
            console.log('✅ useOnlineStatus - Status alterado para offline automaticamente');
          } catch (error) {
            console.error('❌ useOnlineStatus - Erro ao alterar status automaticamente:', error);
          }
        }, inactivityTimeout);
      }
    };

    // Função para lidar com mudança de visibilidade
    const handleVisibilityChange = () => {
      console.log('🔍 useOnlineStatus - Visibility change:', { hidden: document.hidden });

      if (document.hidden) {
        // Página oculta - iniciar timer imediatamente
        console.log(`⏰ useOnlineStatus - Página oculta, iniciando timer de ${inactivityTimeout / 1000 / 60} minutos`);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(async () => {
          console.log('⏰ useOnlineStatus - Timer executado, alterando para offline');
          try {
            await updateStatus(false);
            setWasAutoOffline(true);
            setIsInactivityTimerActive(false);
            console.log('✅ useOnlineStatus - Status alterado para offline automaticamente');
          } catch (error) {
            console.error('❌ useOnlineStatus - Erro ao alterar status automaticamente:', error);
          }
        }, inactivityTimeout);
      } else {
        // Página visível - resetar timer com base na última atividade
        console.log('🔍 useOnlineStatus - Página visível, resetando timer');
        resetTimer();
      }
    };

    // Eventos para detectar atividade do usuário
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click',
      'focus', 'input', 'change', 'submit', 'wheel'
    ];

    // Adicionar listeners para eventos de atividade
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Adicionar listener para mudança de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Iniciar timer inicial
    resetTimer();

    return () => {
      console.log('🔍 useOnlineStatus - Cleanup timer');
      
      // Remover listeners de atividade
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      
      // Remover listener de visibilidade
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Limpar timer
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      setIsInactivityTimerActive(false);
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
    setInactivityTimeout,
    isInactivityTimerActive,
    getRemainingTime
  };
}
