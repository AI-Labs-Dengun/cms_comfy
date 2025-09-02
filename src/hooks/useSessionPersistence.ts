import { useEffect, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { AuthResponse } from '@/types/auth';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  user_role: 'app' | 'cms' | 'psicologo';
  authorized: boolean | null;
  is_online?: boolean;
}

interface SessionData {
  user: User | null;
  profile: UserProfile | null;
  authInfo: AuthResponse | null;
  timestamp: number;
}

interface SessionPersistenceOptions {
  onSessionRestore?: (data: SessionData) => void;
  onSessionExpire?: () => void;
  checkInterval?: number;
  maxSessionAge?: number; // em milissegundos
}

const SESSION_KEYS = {
  AUTH_DATA: 'cms_session_auth_data',
  LAST_ACTIVITY: 'cms_session_last_activity',
  SESSION_ID: 'cms_session_id'
};

export function useSessionPersistence(options: SessionPersistenceOptions = {}) {
  const {
    onSessionRestore,
    onSessionExpire,
    checkInterval = 60000, // 1 minuto
    maxSessionAge = 8 * 60 * 60 * 1000 // 8 horas
  } = options;

  const sessionIdRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Gerar ID único para a sessão
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Limpar dados da sessão
  const clearSessionData = useCallback(() => {
    try {
      Object.values(SESSION_KEYS).forEach(key => {
        sessionStorage.removeItem(key);
      });
      console.log('🗑️ useSessionPersistence - Dados da sessão limpos');
    } catch (error) {
      console.error('❌ useSessionPersistence - Erro ao limpar dados da sessão:', error);
    }
  }, []);

  // Salvar dados da sessão
  const saveSessionData = useCallback((data: SessionData) => {
    try {
      const sessionData = {
        data,
        timestamp: Date.now(),
        sessionId: sessionIdRef.current
      };
      
      sessionStorage.setItem(SESSION_KEYS.AUTH_DATA, JSON.stringify(sessionData));
      sessionStorage.setItem(SESSION_KEYS.LAST_ACTIVITY, Date.now().toString());
      sessionStorage.setItem(SESSION_KEYS.SESSION_ID, sessionIdRef.current);
      
      console.log('💾 useSessionPersistence - Dados da sessão salvos');
    } catch (error) {
      console.error('❌ useSessionPersistence - Erro ao salvar dados da sessão:', error);
    }
  }, []);

  // Carregar dados da sessão
  const loadSessionData = useCallback(() => {
    try {
      const sessionDataStr = sessionStorage.getItem(SESSION_KEYS.AUTH_DATA);
      const lastActivityStr = sessionStorage.getItem(SESSION_KEYS.LAST_ACTIVITY);
      const storedSessionId = sessionStorage.getItem(SESSION_KEYS.SESSION_ID);

      if (!sessionDataStr || !lastActivityStr || !storedSessionId) {
        console.log('📭 useSessionPersistence - Nenhum dado de sessão encontrado');
        return null;
      }

      const sessionData = JSON.parse(sessionDataStr);
      const lastActivity = parseInt(lastActivityStr);
      const now = Date.now();

      // Verificar se a sessão expirou
      if (now - lastActivity > maxSessionAge) {
        console.log('⏰ useSessionPersistence - Sessão expirada, limpando...');
        clearSessionData();
        onSessionExpire?.();
        return null;
      }

      // Verificar se é a mesma sessão
      if (storedSessionId !== sessionIdRef.current) {
        console.log('🔄 useSessionPersistence - Sessão diferente detectada');
        return null;
      }

      console.log('📦 useSessionPersistence - Dados da sessão carregados');
      return sessionData.data as SessionData;
    } catch (error) {
      console.error('❌ useSessionPersistence - Erro ao carregar dados da sessão:', error);
      return null;
    }
  }, [maxSessionAge, onSessionExpire, clearSessionData]);

  // Atualizar atividade da sessão
  const updateSessionActivity = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEYS.LAST_ACTIVITY, Date.now().toString());
    } catch (error) {
      console.error('❌ useSessionPersistence - Erro ao atualizar atividade da sessão:', error);
    }
  }, []);

  // Verificar se a sessão ainda é válida
  const isSessionValid = useCallback(() => {
    try {
      const lastActivityStr = sessionStorage.getItem(SESSION_KEYS.LAST_ACTIVITY);
      const storedSessionId = sessionStorage.getItem(SESSION_KEYS.SESSION_ID);

      if (!lastActivityStr || !storedSessionId) {
        return false;
      }

      const lastActivity = parseInt(lastActivityStr);
      const now = Date.now();

      return (now - lastActivity <= maxSessionAge) && (storedSessionId === sessionIdRef.current);
    } catch (error) {
      console.error('❌ useSessionPersistence - Erro ao verificar validade da sessão:', error);
      return false;
    }
  }, [maxSessionAge]);

  // Inicializar sessão - apenas uma vez
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Gerar ID da sessão se não existir
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
      console.log('🆔 useSessionPersistence - Nova sessão criada:', sessionIdRef.current);
    }

    // Tentar restaurar dados da sessão
    const restoredData = loadSessionData();
    if (restoredData && onSessionRestore) {
      console.log('🔄 useSessionPersistence - Restaurando dados da sessão...');
      onSessionRestore(restoredData);
    }

    // Configurar verificação periódica da sessão
    intervalRef.current = setInterval(() => {
      if (!isSessionValid()) {
        console.log('⏰ useSessionPersistence - Sessão expirada durante verificação periódica');
        clearSessionData();
        onSessionExpire?.();
      } else {
        updateSessionActivity();
      }
    }, checkInterval);

    // Atualizar atividade inicial
    updateSessionActivity();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Sem dependências para executar apenas uma vez

  // Atualizar atividade quando a página fica visível
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateSessionActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateSessionActivity]);

  return {
    saveSessionData,
    loadSessionData,
    clearSessionData,
    updateSessionActivity,
    isSessionValid,
    sessionId: sessionIdRef.current
  };
}
