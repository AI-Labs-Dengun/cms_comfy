// Utilitários para gerenciamento de sessão

const SESSION_KEYS = {
  AUTH_DATA: 'cms_auth_data',
  LAST_CHECK: 'cms_last_auth_check',
  SESSION_PERSISTENCE: 'cms_session_persistent',
  SESSION_AUTH_DATA: 'cms_session_auth_data',
  SESSION_LAST_ACTIVITY: 'cms_session_last_activity',
  SESSION_ID: 'cms_session_id'
};

export interface SessionData {
  user: unknown;
  profile: unknown;
  authInfo: unknown;
  timestamp: number;
}

export interface SessionDebugInfo {
  authData: SessionData | null;
  lastCheck: string | null;
  sessionPersistence: string | null;
  sessionAuthData: {
    data: SessionData;
    timestamp: number;
    sessionId: string;
  } | null;
  lastActivity: string | null;
  sessionId: string | null;
  hasValidSession: boolean;
  timestamp: string;
}

/**
 * Limpa todos os dados de sessão antigos
 */
export function clearAllSessionData(): void {
  try {
    Object.values(SESSION_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
    });
    console.log('🗑️ sessionUtils - Todos os dados de sessão foram limpos');
  } catch (error) {
    console.error('❌ sessionUtils - Erro ao limpar dados de sessão:', error);
  }
}

/**
 * Verifica se há dados de sessão válidos
 */
export function hasValidSessionData(): boolean {
  try {
    const authData = sessionStorage.getItem(SESSION_KEYS.AUTH_DATA);
    const sessionId = sessionStorage.getItem(SESSION_KEYS.SESSION_ID);
    const lastActivity = sessionStorage.getItem(SESSION_KEYS.SESSION_LAST_ACTIVITY);

    if (!authData || !sessionId || !lastActivity) {
      return false;
    }

    // Verificar se a sessão não expirou (8 horas)
    const lastActivityTime = parseInt(lastActivity);
    const now = Date.now();
    const maxAge = 8 * 60 * 60 * 1000; // 8 horas

    return (now - lastActivityTime) <= maxAge;
  } catch (error) {
    console.error('❌ sessionUtils - Erro ao verificar dados de sessão:', error);
    return false;
  }
}

/**
 * Obtém dados da sessão atual
 */
export function getSessionData(): SessionData | null {
  try {
    const authDataStr = sessionStorage.getItem(SESSION_KEYS.AUTH_DATA);
    if (!authDataStr) {
      return null;
    }

    const authData = JSON.parse(authDataStr);
    return authData;
  } catch (error) {
    console.error('❌ sessionUtils - Erro ao obter dados de sessão:', error);
    return null;
  }
}

/**
 * Salva dados na sessão
 */
export function saveSessionData(data: SessionData): void {
  try {
    sessionStorage.setItem(SESSION_KEYS.AUTH_DATA, JSON.stringify(data));
    sessionStorage.setItem(SESSION_KEYS.LAST_CHECK, Date.now().toString());
    sessionStorage.setItem(SESSION_KEYS.SESSION_PERSISTENCE, 'true');
    console.log('💾 sessionUtils - Dados de sessão salvos');
  } catch (error) {
    console.error('❌ sessionUtils - Erro ao salvar dados de sessão:', error);
  }
}

/**
 * Atualiza a atividade da sessão
 */
export function updateSessionActivity(): void {
  try {
    sessionStorage.setItem(SESSION_KEYS.SESSION_LAST_ACTIVITY, Date.now().toString());
  } catch (error) {
    console.error('❌ sessionUtils - Erro ao atualizar atividade da sessão:', error);
  }
}

/**
 * Obtém informações de debug da sessão
 */
export function getSessionDebugInfo(): SessionDebugInfo {
  try {
    const authData = sessionStorage.getItem(SESSION_KEYS.AUTH_DATA);
    const lastCheck = sessionStorage.getItem(SESSION_KEYS.LAST_CHECK);
    const sessionPersistence = sessionStorage.getItem(SESSION_KEYS.SESSION_PERSISTENCE);
    const sessionAuthData = sessionStorage.getItem(SESSION_KEYS.SESSION_AUTH_DATA);
    const lastActivity = sessionStorage.getItem(SESSION_KEYS.SESSION_LAST_ACTIVITY);
    const sessionId = sessionStorage.getItem(SESSION_KEYS.SESSION_ID);

    return {
      authData: authData ? JSON.parse(authData) : null,
      lastCheck,
      sessionPersistence,
      sessionAuthData: sessionAuthData ? JSON.parse(sessionAuthData) : null,
      lastActivity,
      sessionId,
      hasValidSession: hasValidSessionData(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ sessionUtils - Erro ao obter informações de debug:', error);
    return {
      authData: null,
      lastCheck: null,
      sessionPersistence: null,
      sessionAuthData: null,
      lastActivity: null,
      sessionId: null,
      hasValidSession: false,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Limpa dados de sessão duplicados ou corrompidos
 */
export function cleanupSessionData(): void {
  try {
    const debugInfo = getSessionDebugInfo();
    
    if (!debugInfo.hasValidSession) {
      console.log('🧹 sessionUtils - Limpando dados de sessão inválidos...');
      clearAllSessionData();
      return;
    }

    // Verificar se há dados duplicados
    const authData = debugInfo.authData;
    const sessionAuthData = debugInfo.sessionAuthData;

    if (authData && sessionAuthData) {
      // Se ambos existem, manter apenas o mais recente
      const authTimestamp = authData.timestamp || 0;
      const sessionTimestamp = sessionAuthData.timestamp || 0;

      if (authTimestamp > sessionTimestamp) {
        sessionStorage.removeItem(SESSION_KEYS.SESSION_AUTH_DATA);
        console.log('🧹 sessionUtils - Removidos dados de sessão duplicados (mantido auth_data)');
      } else {
        sessionStorage.removeItem(SESSION_KEYS.AUTH_DATA);
        console.log('🧹 sessionUtils - Removidos dados de sessão duplicados (mantido session_auth_data)');
      }
    }
  } catch (error) {
    console.error('❌ sessionUtils - Erro ao limpar dados de sessão:', error);
  }
}

/**
 * Força a renovação da sessão
 */
export function forceSessionRenewal(): void {
  try {
    console.log('🔄 sessionUtils - Forçando renovação da sessão...');
    
    // Limpar dados antigos
    clearAllSessionData();
    
    // Gerar novo ID de sessão
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_KEYS.SESSION_ID, newSessionId);
    
    console.log('✅ sessionUtils - Sessão renovada com sucesso');
  } catch (error) {
    console.error('❌ sessionUtils - Erro ao renovar sessão:', error);
  }
}
