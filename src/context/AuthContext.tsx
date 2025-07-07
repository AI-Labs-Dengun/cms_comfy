'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { AuthResponse } from '@/types/auth';
import { AuthService } from '@/services/auth';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  user_role: 'app' | 'cms';
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
  checkRoleAccess: (requiredRole: 'cms' | 'app') => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache keys
const CACHE_KEYS = {
  AUTH_DATA: 'cms_auth_data',
  LAST_CHECK: 'cms_last_auth_check',
  USER_PROFILE: 'cms_user_profile'
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

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

  // Função para verificar se o cache é válido
  const isCacheValid = (): boolean => {
    const lastCheck = localStorage.getItem(CACHE_KEYS.LAST_CHECK);
    if (!lastCheck) return false;
    
    const timeDiff = Date.now() - parseInt(lastCheck);
    return timeDiff < CACHE_DURATION;
  };

  // Função para carregar dados do cache
  const loadFromCache = (): CachedAuthData | null => {
    try {
      if (!isCacheValid()) return null;
      
      const cachedData = localStorage.getItem(CACHE_KEYS.AUTH_DATA);
      if (!cachedData) return null;
      
      return JSON.parse(cachedData);
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
      return null;
    }
  };

  // Função para salvar no cache
  const saveToCache = (data: CachedAuthData) => {
    try {
      localStorage.setItem(CACHE_KEYS.AUTH_DATA, JSON.stringify(data));
      localStorage.setItem(CACHE_KEYS.LAST_CHECK, Date.now().toString());
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  };

  // Função para limpar cache
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEYS.AUTH_DATA);
    localStorage.removeItem(CACHE_KEYS.LAST_CHECK);
    localStorage.removeItem(CACHE_KEYS.USER_PROFILE);
  };

  // Função para carregar perfil do usuário
  const loadUserProfile = async (currentUser: User): Promise<UserProfile | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, username, user_role, authorized')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return null;
      }

      return profile as UserProfile;
    } catch (error) {
      console.error('Erro inesperado ao carregar perfil:', error);
      return null;
    }
  };

  // Função para verificar acesso por role
  const checkRoleAccess = async (requiredRole: 'cms' | 'app'): Promise<boolean> => {
    if (!user?.email) return false;
    
    try {
      const authCheck = await AuthService.canUserLoginWithRole(user.email, requiredRole);
      return authCheck.success;
    } catch (error) {
      console.error('Erro ao verificar role:', error);
      return false;
    }
  };

  // Função para fazer logout
  const signOut = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Limpar cache e estado
      clearCache();
      setUser(null);
      setProfile(null);
      setAuthInfo(null);
      setError(null);
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return { success: false, error: 'Erro de conexão ao fazer logout' };
    }
  };

  // Função para atualizar autenticação
  const refreshAuth = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        clearCache();
        setUser(null);
        setProfile(null);
        setAuthInfo(null);
        setLoading(false);
        return;
      }

      // Carregar perfil
      const userProfile = await loadUserProfile(currentUser);
      
      // Verificar acesso CMS
      let cmsAuthInfo: AuthResponse | null = null;
      if (currentUser.email) {
        try {
          cmsAuthInfo = await AuthService.canUserLoginWithRole(currentUser.email, 'cms');
        } catch (error) {
          console.error('Erro ao verificar acesso CMS:', error);
        }
      }

      // Atualizar estado
      setUser(currentUser);
      setProfile(userProfile);
      setAuthInfo(cmsAuthInfo);
      
      // Salvar no cache
      const cacheData: CachedAuthData = {
        user: currentUser,
        profile: userProfile,
        authInfo: cmsAuthInfo,
        timestamp: Date.now()
      };
      saveToCache(cacheData);
      
    } catch (error) {
      console.error('Erro ao atualizar autenticação:', error);
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Inicialização
  useEffect(() => {
    const initAuth = async () => {
      // Tentar carregar do cache primeiro
      const cachedData = loadFromCache();
      
      if (cachedData) {
        setUser(cachedData.user);
        setProfile(cachedData.profile);
        setAuthInfo(cachedData.authInfo);
        setLoading(false);
        
        // Verificar se ainda há sessão válida em background
        supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
          if (!currentUser) {
            // Sessão expirou, limpar tudo
            clearCache();
            setUser(null);
            setProfile(null);
            setAuthInfo(null);
          }
        });
        
        return;
      }
      
      // Se não há cache válido, fazer verificação completa
      await refreshAuth();
    };

    initAuth();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          clearCache();
          setUser(null);
          setProfile(null);
          setAuthInfo(null);
          setError(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN' && session?.user) {
          await refreshAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Valores computados
  const isAuthenticated = user !== null;
  const isAuthorized = profile?.authorized === true;
  const isCMSUser = profile?.user_role === 'cms';
  const canAccessCMS = isAuthenticated && isAuthorized && isCMSUser && authInfo?.success === true;

  const value: AuthContextType = {
    user,
    profile,
    authInfo,
    loading,
    error,
    isAuthenticated,
    isAuthorized,
    isCMSUser,
    canAccessCMS,
    signOut,
    refreshAuth,
    checkRoleAccess
  };

  return (
    <AuthContext.Provider value={value}>
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