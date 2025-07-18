'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { AuthResponse } from '@/types/auth';
import { AuthService } from '@/services/auth';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  user_role: 'app' | 'cms' | 'psicologo';
  authorized: boolean | null;
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
  refreshAuth: () => Promise<void>;
  checkRoleAccess: (requiredRole: 'cms' | 'app' | 'psicologo') => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache keys - apenas essencial
const CACHE_KEYS = {
  AUTH_DATA: 'cms_auth_data',
  LAST_CHECK: 'cms_last_auth_check'
};

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

  // Função para salvar no cache
  const saveToCache = useCallback((data: CachedAuthData) => {
    try {
      localStorage.setItem(CACHE_KEYS.AUTH_DATA, JSON.stringify(data));
      localStorage.setItem(CACHE_KEYS.LAST_CHECK, Date.now().toString());
      console.log('📦 AuthContext - Dados salvos no cache');
    } catch (error) {
      console.error('❌ AuthContext - Erro ao salvar cache:', error);
    }
  }, []);

  // Função para limpar cache
  const clearCache = useCallback(() => {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🗑️ AuthContext - Cache limpo');
  }, []);

  // Função para carregar perfil do usuário - SEM cache
  const loadUserProfile = useCallback(async (currentUser: User): Promise<UserProfile | null> => {
    try {
      console.log('👤 AuthContext - Carregando perfil do usuário:', currentUser.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, username, user_role, authorized')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('❌ AuthContext - Erro ao carregar perfil:', error);
        return null;
      }

      console.log('✅ AuthContext - Perfil carregado:', { 
        id: profile.id, 
        user_role: profile.user_role, 
        authorized: profile.authorized 
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
      
      console.log('✅ AuthContext - Resultado da verificação de role:', { 
        email: user.email, 
        requiredRole, 
        result,
        authInfo: authCheck 
      });
      
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
  }, [clearCache]);

  // Função principal para atualizar autenticação - SIMPLIFICADA
  const refreshAuth = useCallback(async (): Promise<void> => {
    if (initializingRef.current) {
      console.log('⏳ AuthContext - refreshAuth já está executando, ignorando...');
      return;
    }
    
    console.log('🔄 AuthContext - Iniciando refreshAuth...');
    setLoading(true);
    setError(null);
    initializingRef.current = true;
    
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
      
      // Salvar no cache apenas se tudo deu certo
      const cacheData: CachedAuthData = {
        user: currentUser,
        profile: userProfile,
        authInfo: cmsAuthInfo,
        timestamp: Date.now()
      };
      saveToCache(cacheData);
      
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
    }
  }, [loadUserProfile, saveToCache, clearCache]);

  // Inicialização simplificada
  useEffect(() => {
    if (initializedRef.current) return;
    
    let mounted = true;
    initializedRef.current = true;

    const initAuth = async () => {
      if (!mounted) return;
      
      console.log('🚀 AuthContext - Inicializando autenticação...');
      
      // Verificação direta sem depender muito de cache
      await refreshAuth();
    };

    initAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔔 AuthContext - Auth state change:', event, !!session);
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('🚪 AuthContext - Usuário deslogado, limpando estado...');
        clearCache();
        setUser(null);
        setProfile(null);
        setAuthInfo(null);
        setError(null);
        setLoading(false);
        
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
        await refreshAuth();
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
  }, [user, profile, authInfo]);

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