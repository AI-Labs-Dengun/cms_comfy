'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
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

interface SessionDebugProps {
  show?: boolean;
}

interface SessionDebugData {
  authData: {
    user: User | null;
    profile: UserProfile | null;
    authInfo: AuthResponse | null;
    timestamp: number;
  } | null;
  lastCheck: string | null;
  sessionPersistence: string | null;
  sessionAuthData: {
    data: {
      user: User | null;
      profile: UserProfile | null;
      authInfo: AuthResponse | null;
      timestamp: number;
    };
    timestamp: number;
    sessionId: string;
  } | null;
  lastActivity: string | null;
  sessionId: string | null;
  timestamp: string;
}

export default function SessionDebug({ show = false }: SessionDebugProps) {
  const [isVisible, setIsVisible] = useState(show);
  const [sessionData, setSessionData] = useState<SessionDebugData | null>(null);
  const { user, profile, authInfo, loading, isAuthenticated, canAccessCMS } = useAuth();

  // Função para atualizar dados da sessão - memoizada para evitar re-criações
  const updateSessionData = useCallback(() => {
    try {
      const authData = sessionStorage.getItem('cms_auth_data');
      const lastCheck = sessionStorage.getItem('cms_last_auth_check');
      const sessionPersistence = sessionStorage.getItem('cms_session_persistent');
      const sessionAuthData = sessionStorage.getItem('cms_session_auth_data');
      const lastActivity = sessionStorage.getItem('cms_session_last_activity');
      const sessionId = sessionStorage.getItem('cms_session_id');

      setSessionData({
        authData: authData ? JSON.parse(authData) : null,
        lastCheck,
        sessionPersistence,
        sessionAuthData: sessionAuthData ? JSON.parse(sessionAuthData) : null,
        lastActivity,
        sessionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao carregar dados de debug da sessão:', error);
    }
  }, []); // Sem dependências para evitar re-criações

  useEffect(() => {
    // Só mostrar em desenvolvimento
    if (process.env.NODE_ENV !== 'development') {
      setIsVisible(false);
      return;
    }

    // Atualizar dados da sessão inicialmente
    updateSessionData();
    
    // Configurar intervalo para atualização periódica
    const interval = setInterval(updateSessionData, 5000); // Atualizar a cada 5 segundos

    return () => clearInterval(interval);
  }, [updateSessionData]); // Apenas updateSessionData como dependência

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg max-w-md z-50 text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">🔍 Session Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <strong>Estado:</strong>
          <div className="ml-2">
            <div>Loading: {loading ? '✅' : '❌'}</div>
            <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
            <div>Can Access CMS: {canAccessCMS ? '✅' : '❌'}</div>
          </div>
        </div>

        <div>
          <strong>Usuário:</strong>
          <div className="ml-2">
            <div>Email: {user?.email || 'N/A'}</div>
            <div>Role: {profile?.user_role || 'N/A'}</div>
            <div>Authorized: {profile?.authorized ? '✅' : '❌'}</div>
          </div>
        </div>

        <div>
          <strong>Session Storage:</strong>
          <div className="ml-2">
            <div>Auth Data: {sessionData?.authData ? '✅' : '❌'}</div>
            <div>Session ID: {sessionData?.sessionId || 'N/A'}</div>
            <div>Last Activity: {sessionData?.lastActivity ? new Date(parseInt(sessionData.lastActivity)).toLocaleTimeString() : 'N/A'}</div>
          </div>
        </div>

        <div>
          <strong>Auth Info:</strong>
          <div className="ml-2">
            <div>Success: {authInfo?.success ? '✅' : '❌'}</div>
            <div>Error: {authInfo?.error || 'N/A'}</div>
            <div>Code: {authInfo?.code || 'N/A'}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-600">
          <button
            onClick={() => {
              console.log('Session Debug Data:', sessionData);
              console.log('Auth Context State:', { user, profile, authInfo, loading, isAuthenticated, canAccessCMS });
            }}
            className="bg-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-600"
          >
            Log to Console
          </button>
        </div>
      </div>
    </div>
  );
}
