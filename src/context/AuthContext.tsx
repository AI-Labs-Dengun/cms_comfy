'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { AuthResponse } from '@/types/auth';
import { AuthService } from '@/services/auth';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { clearAllSessionData, hasValidSessionData, getSessionData, saveSessionData, updateSessionActivity, cleanupSessionData } from '@/lib/sessionUtils';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  user_role: 'app' | 'cms' | 'psicologo';
  authorized: boolean | null;
  is_online?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  authInfo: AuthResponse | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  isCMSUser: boolean;
  canAccessCMS: boolean;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  refreshAuth: (forceRefresh?: boolean) => Promise<void>;
  checkRoleAccess: (requiredRole: 'cms' | 'app' | 'psicologo') => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface CachedAuthData {
  user: User | null;
  profile: UserProfile | null;
  authInfo: AuthResponse | null;
  timestamp: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authInfo, setAuthInfo] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Usar useRef para evitar re-renders desnecessários
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);
  const lastAuthCheckRef = useRef<number>(0);
  const authStateChangeRef = useRef<boolean>(false);
  const sessionPersistentRef = useRef<boolean>(false);

  // Hook de persistência de sessão
  const {
    saveSessionData: savePersistentData,
    clearSessionData,
    updateSessionActivity: updatePersistentActivity,
    isSessionValid
  } = useSessionPersistence({
    onSessionRestore: (data: CachedAuthData) => {
      console.log('🔄 AuthContext - Restaurando dados da sessão...');
      if (data.user && data.profile) {
        setUser(data.user);
        setProfile(data.profile);
        setAuthInfo(data.authInfo);
        sessionPersistentRef.current = true;
        console.log('✅ AuthContext - Dados da sessão restaurados com sucesso');
      }
    },
    onSessionExpire: () => {
      console.log('⏰ AuthContext - Sessão expirada, limpando estado...');
      setUser(null);
      setProfile(null);
      setAuthInfo(null);
      sessionPersistentRef.current = false;
    },
    maxSessionAge: 8 * 60 * 60 * 1000 // 8 horas
  });

  // Hook de visibilidade da página - APENAS atualizar atividade
  usePageVisibility({
    onVisible: () => {
      console.log('👁️ AuthContext - Página visível, atualizando apenas atividade da sessão');
      // APENAS atualizar atividade da sessão - ZERO verificações
      updateSessionActivity();
      updatePersistentActivity();
    },
    onHidden: () => {
      console.log('👁️ AuthContext - Página oculta');
    },
    disableAutoRefresh: true, // SEMPRE desabilitado
    minHiddenTime: 30000
  });

  // Função para salvar no sessionStorage
  const saveToCache = useCallback((data: CachedAuthData) => {
    try {
      // Usar utilitários de sessão
      saveSessionData(data);
      
      // Salvar também usando o hook de persistência
      savePersistentData(data);
      
      console.log('📦 AuthContext - Dados salvos no sessionStorage');
    } catch (error) {
      console.error('❌ AuthContext - Erro ao salvar cache:', error);
    }
  }, [savePersistentData]);

  // Função para limpar cache
  const clearCache = useCallback(() => {
    clearAllSessionData();
    clearSessionData();
    console.log('🗑️ AuthContext - Cache limpo');
  }, [clearSessionData]);

  // Função para carregar perfil do usuário - SEM cache
  const loadUserProfile = useCallback(async (currentUser: User): Promise<UserProfile | null> => {
    try {
      console.log('👤 AuthContext - Carregando perfil do usuário:', currentUser.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, username, user_role, authorized, is_online')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('❌ AuthContext - Erro ao carregar perfil:', error);
        return null;
      }

      // Se for psicólogo, definir como online automaticamente
      if (profile.user_role === 'psicologo' && profile.authorized === true) {
        try {
          console.log('🔄 AuthContext - Definindo psicólogo como online...');
          const { error: statusError } = await supabase
            .rpc('handle_psicologo_login', { psicologo_id: profile.id });
          
          if (statusError) {
            console.warn('⚠️ AuthContext - Erro ao definir status online:', statusError);
          } else {
            console.log('✅ AuthContext - Status online definido com sucesso');
            // Atualizar o perfil com o status online
            profile.is_online = true;
          }
        } catch (statusError) {
          console.warn('⚠️ AuthContext - Erro ao definir status online:', statusError);
        }
      }

      console.log('✅ AuthContext - Perfil carregado:', { 
        id: profile.id, 
        user_role: profile.user_role, 
        authorized: profile.authorized,
        is_online: profile.is_online
      });
      
      return profile as UserProfile;
    } catch (error) {
      console.error('❌ AuthContext - Erro inesperado ao carregar perfil:', error);
      return null;
    }
  }, []);

  // Função simplificada para verificar acesso por role - SEM cache para login
  const checkRoleAccess = useCallback(async (requiredRole: 'cms' | 'app' | 'psicologo'): Promise<boolean> => {
    if (!user?.email) {
      console.log('❌ AuthContext - Sem email do usuário para verificar role');
      return false;
    }
    
    try {
      console.log('🔍 AuthContext - Verificando acesso de role:', { email: user.email, requiredRole });
      const authCheck = await AuthService.canUserLoginWithRole(user.email, requiredRole);
      const result = authCheck.success;
            
      return result;
    } catch (error) {
      console.error('❌ AuthContext - Erro ao verificar role:', error);
      return false;
    }
  }, [user?.email]);

  // Função para fazer logout
  const signOut = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🚪 AuthContext - Fazendo logout...');
      
      // Se for psicólogo, definir como offline antes do logout
      if (profile?.user_role === 'psicologo' && profile?.id) {
        try {
          console.log('🔄 AuthContext - Definindo psicólogo como offline...');
          const { error: statusError } = await supabase
            .rpc('handle_psicologo_logout', { psicologo_id: profile.id });
          
          if (statusError) {
            console.warn('⚠️ AuthContext - Erro ao definir status offline:', statusError);
          } else {
            console.log('✅ AuthContext - Status offline definido com sucesso');
          }
        } catch (statusError) {
          console.warn('⚠️ AuthContext - Erro ao definir status offline:', statusError);
        }
      }
      
      // Primeiro, encerrar sessão no Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ AuthContext - Erro ao fazer logout no Supabase:', error);
        return { success: false, error: error.message };
      }
      
      // Limpar cache e estado local
      clearCache();
      setUser(null);
      setProfile(null);
      setAuthInfo(null);
      setError(null);
      sessionPersistentRef.current = false;
      
      // Limpar cache de queries do Supabase se disponível
      try {
        const { clearQueryCache } = await import('@/lib/supabase');
        clearQueryCache();
      } catch {
        // Ignorar erro se função não estiver disponível
      }
      
      console.log('✅ AuthContext - Logout realizado com sucesso');
      
      // Redirecionar para login após logout bem-sucedido
      setTimeout(() => {
        console.log('🔄 AuthContext - Redirecionando para login após logout...');
        window.location.href = '/login'; // Usar window.location para garantir limpeza completa
      }, 100);
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext - Erro inesperado ao fazer logout:', error);
      return { success: false, error: 'Erro de conexão ao fazer logout' };
    }
  }, [clearCache, profile]);

  // Função principal para atualizar autenticação - OTIMIZADA
  const refreshAuth = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    if (initializingRef.current) {
      console.log('⏳ AuthContext - refreshAuth já está executando, ignorando...');
      return;
    }

    // OTIMIZAÇÃO PRINCIPAL: Se usuário já está autenticado, NUNCA fazer verificações
    if (!forceRefresh && user && profile && authInfo?.success) {
      console.log('✅ AuthContext - Usuário COMPLETAMENTE autenticado, ZERO verificações necessárias');
      return;
    }

    // Se não é refresh forçado E temos dados básicos, pular também
    if (!forceRefresh && user && profile) {
      console.log('✅ AuthContext - Dados básicos válidos, pulando verificação');
      return;
    }

    // Verificar se já fizemos uma verificação recente (apenas para refreshes forçados)
    const now = Date.now();
    const timeSinceLastCheck = now - lastAuthCheckRef.current;
    
    if (timeSinceLastCheck < 5000) { // 5 segundos para qualquer verificação
      console.log('⏭️ AuthContext - Verificação muito recente, pulando... (há', Math.round(timeSinceLastCheck / 1000), 'segundos)');
      return;
    }
    
    console.log('🔄 AuthContext - Iniciando refreshAuth...', { forceRefresh, timeSinceLastCheck });
    
    // TIMEOUT FORÇADO DE 5 SEGUNDOS PARA EVITAR TRAVAMENTO EM PRODUÇÃO
    const forceTimeout = setTimeout(() => {
      if (initializingRef.current) {
        console.warn('⏰ AuthContext - TIMEOUT FORÇADO! Parando verificação após 5 segundos...');
        initializingRef.current = false;
        setLoading(false);
        
        // Se tem dados de sessão válidos, usar eles como fallback
        const sessionData = getSessionData();
        if (sessionData && sessionData.user && sessionData.profile) {
          console.log('🔄 AuthContext - Usando dados de sessão válidos como fallback');
          setUser(sessionData.user as User);
          setProfile(sessionData.profile as UserProfile);
          setAuthInfo(sessionData.authInfo as AuthResponse);
        }
      }
    }, 5000); // 5 segundos
    
    // Só colocar em loading se for uma verificação forçada (login) ou se não temos dados ainda
    if (forceRefresh || !user || !profile) {
      setLoading(true);
    }
    
    setError(null);
    initializingRef.current = true;
    lastAuthCheckRef.current = now;
    
    try {
      // Verificar usuário atual
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.log('❌ AuthContext - Nenhum usuário autenticado');
        clearCache();
        setUser(null);
        setProfile(null);
        setAuthInfo(null);
        setLoading(false);
        initializingRef.current = false;
        return;
      }

      console.log('👤 AuthContext - Usuário autenticado encontrado:', currentUser.email);

      // Carregar perfil sempre atualizado
      const userProfile = await loadUserProfile(currentUser);
      
      if (!userProfile) {
        console.log('❌ AuthContext - Perfil não encontrado');
        clearCache();
        setUser(currentUser);
        setProfile(null);
        setAuthInfo(null);
        setLoading(false);
        initializingRef.current = false;
        return;
      }

      // Verificar acesso CMS se for usuário CMS - sempre atualizado
      let cmsAuthInfo: AuthResponse | null = null;
      if (userProfile.user_role === 'cms') {
        console.log('🔍 AuthContext - Verificando acesso CMS para usuário...');
        try {
          const hasAccess = await AuthService.canUserLoginWithRole(currentUser.email!, 'cms');
          cmsAuthInfo = hasAccess;
          console.log('✅ AuthContext - Verificação CMS concluída:', hasAccess);
        } catch (error) {
          console.error('❌ AuthContext - Erro ao verificar acesso CMS:', error);
          cmsAuthInfo = {
            success: false,
            error: 'Erro ao verificar permissões CMS',
            code: 'PERMISSION_CHECK_ERROR'
          };
        }
      }

      // Atualizar estado
      setUser(currentUser);
      setProfile(userProfile);
      setAuthInfo(cmsAuthInfo);
      
      // Salvar no sessionStorage apenas se tudo deu certo
      const cacheData: CachedAuthData = {
        user: currentUser,
        profile: userProfile,
        authInfo: cmsAuthInfo,
        timestamp: Date.now()
      };
      saveToCache(cacheData);
      
      // Marcar sessão como persistente
      sessionPersistentRef.current = true;
      
      console.log('✅ AuthContext - refreshAuth concluído com sucesso');
      
    } catch (error) {
      console.error('❌ AuthContext - Erro ao atualizar autenticação:', error);
      setError('Erro de conexão ao verificar autenticação');
      
      // Limpar estado em caso de erro
      setUser(null);
      setProfile(null);
      setAuthInfo(null);
      clearCache();
    } finally {
      setLoading(false);
      initializingRef.current = false;
      clearTimeout(forceTimeout);
    }
  }, [loadUserProfile, saveToCache, clearCache, user, profile, authInfo]);

  // Inicialização otimizada
  useEffect(() => {
    if (initializedRef.current) return;
    
    let mounted = true;
    initializedRef.current = true;

    const initAuth = async () => {
      if (!mounted) return;
      
      console.log('🚀 AuthContext - Inicializando autenticação...');
      
      // Limpar dados de sessão corrompidos
      cleanupSessionData();
      
      // Verificar se há dados persistentes válidos
      if (hasValidSessionData()) {
        console.log('📦 AuthContext - Dados persistentes válidos encontrados');
        sessionPersistentRef.current = true;
        
        // Tentar restaurar dados da sessão PRIMEIRO
        const sessionData = getSessionData();
        if (sessionData && sessionData.user && sessionData.profile) {
          console.log('🔄 AuthContext - Restaurando dados da sessão - PARANDO todas as verificações');
          setUser(sessionData.user as User);
          setProfile(sessionData.profile as UserProfile);
          setAuthInfo(sessionData.authInfo as AuthResponse);
          setLoading(false);
          // PARAR COMPLETAMENTE - não fazer refreshAuth
          console.log('✅ AuthContext - Inicialização concluída com dados de sessão - SEM verificações adicionais');
          return;
        }
      }
      
      // Verificação direta sem depender muito de cache
      await refreshAuth(true);
    };

    initAuth();

    // Listener para mudanças de autenticação - OTIMIZADO
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔔 AuthContext - Auth state change:', event, !!session);
      
      // Marcar que houve mudança de estado
      authStateChangeRef.current = true;
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('🚪 AuthContext - Usuário deslogado, limpando estado...');
        clearCache();
        setUser(null);
        setProfile(null);
        setAuthInfo(null);
        setError(null);
        setLoading(false);
        sessionPersistentRef.current = false;
        
        // Redirecionar para login se não estiver já na página de login/signup/home
        const currentPath = window.location.pathname;
        const authPaths = ['/login', '/signup', '/'];
        
        if (!authPaths.includes(currentPath)) {
          console.log('🔄 AuthContext - Redirecionando para login após logout...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !initializingRef.current) {
        console.log('🔑 AuthContext - Usuário logado/token atualizado, atualizando auth...');
        // Forçar refresh para mudanças de estado
        await refreshAuth(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearCache, refreshAuth]); // Incluir dependências necessárias

  // UseRef para controlar logs sem causar re-renders
  const lastLogKeyRef = useRef<string>('');

  // Computed values com logs de debug mais específicos
  const computedValues = useMemo(() => {
    const isAuthenticated = !!user;
    const isAuthorized = profile?.authorized === true;
    const isCMSUser = profile?.user_role === 'cms';
    const canAccessCMS = isAuthenticated && isCMSUser && isAuthorized && (authInfo?.success === true);

    // Debug logs detalhados - mas somente quando há mudanças significativas
    const logKey = `${isAuthenticated}-${isCMSUser}-${isAuthorized}-${authInfo?.success}`;
    
    if (logKey !== lastLogKeyRef.current) {
      console.log('🔍 AuthContext Estado Computado MUDOU:', {
        timestamp: new Date().toISOString(),
        logKey,
        lastLogKey: lastLogKeyRef.current,
        isAuthenticated,
        isCMSUser,
        isAuthorized,
        authInfoSuccess: authInfo?.success,
        canAccessCMS,
        sessionPersistent: sessionPersistentRef.current,
        sessionValid: isSessionValid(),
        hasValidSessionData: hasValidSessionData(),
        detalhes: {
          userExists: !!user,
          userEmail: user?.email,
          profileExists: !!profile,
          profileRole: profile?.user_role,
          profileAuthorized: profile?.authorized,
          authInfoExists: !!authInfo,
          authInfoData: authInfo
        }
      });
      lastLogKeyRef.current = logKey;
    }

    return {
      isAuthenticated,
      isAuthorized,
      isCMSUser,
      canAccessCMS
    };
  }, [user, profile, authInfo, isSessionValid]);

  const contextValue: AuthContextType = {
    user,
    profile,
    authInfo,
    loading,
    error,
    ...computedValues,
    signOut,
    refreshAuth,
    checkRoleAccess,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
} 