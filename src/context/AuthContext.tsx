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
  USER_PROFILE: 'cms_user_profile',
  ROLE_CACHE: 'cms_role_cache'
};

// Cache duration - mais agressivo para development
const CACHE_DURATION = process.env.NODE_ENV === 'development' ? 10 * 60 * 1000 : 5 * 60 * 1000; // 10min dev, 5min prod
const ROLE_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes para cache de roles

interface CachedAuthData {
  user: User | null;
  profile: UserProfile | null;
  authInfo: AuthResponse | null;
  timestamp: number;
}

interface RoleCache {
  [email: string]: {
    [role: string]: {
      result: boolean;
      timestamp: number;
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authInfo, setAuthInfo] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Usar useRef para roleCache para evitar re-renders desnecessários
  const roleCacheRef = useRef<RoleCache>({});
  const initializingRef = useRef(false);

  // Função para verificar se o cache é válido
  const isCacheValid = useCallback((duration: number = CACHE_DURATION): boolean => {
    const lastCheck = localStorage.getItem(CACHE_KEYS.LAST_CHECK);
    if (!lastCheck) return false;
    
    const timeDiff = Date.now() - parseInt(lastCheck);
    return timeDiff < duration;
  }, []);

  // Função para carregar dados do cache
  const loadFromCache = useCallback((): CachedAuthData | null => {
    try {
      if (!isCacheValid()) return null;
      
      const cachedData = localStorage.getItem(CACHE_KEYS.AUTH_DATA);
      if (!cachedData) return null;
      
      return JSON.parse(cachedData);
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
      return null;
    }
  }, [isCacheValid]);

  // Função para salvar no cache
  const saveToCache = useCallback((data: CachedAuthData) => {
    try {
      localStorage.setItem(CACHE_KEYS.AUTH_DATA, JSON.stringify(data));
      localStorage.setItem(CACHE_KEYS.LAST_CHECK, Date.now().toString());
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }, []);

  // Função para limpar cache
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEYS.AUTH_DATA);
    localStorage.removeItem(CACHE_KEYS.LAST_CHECK);
    localStorage.removeItem(CACHE_KEYS.USER_PROFILE);
    localStorage.removeItem(CACHE_KEYS.ROLE_CACHE);
    roleCacheRef.current = {};
  }, []);

  // Função otimizada para carregar perfil do usuário
  const loadUserProfile = useCallback(async (currentUser: User): Promise<UserProfile | null> => {
    try {
      // Tentar cache primeiro
      const cachedProfile = localStorage.getItem(CACHE_KEYS.USER_PROFILE);
      if (cachedProfile && isCacheValid()) {
        try {
          const profile = JSON.parse(cachedProfile);
          if (profile.id === currentUser.id) {
            return profile;
          }
        } catch {}
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, username, user_role, authorized')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return null;
      }

      // Salvar no cache
      localStorage.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(profile));
      
      return profile as UserProfile;
    } catch (error) {
      console.error('Erro inesperado ao carregar perfil:', error);
      return null;
    }
  }, [isCacheValid]);

  // Função otimizada para verificar acesso por role - SEM dependência de roleCache
  const checkRoleAccess = useCallback(async (requiredRole: 'cms' | 'app'): Promise<boolean> => {
    if (!user?.email) return false;
    
    const email = user.email;
    
    // Verificar cache em memória primeiro
    if (roleCacheRef.current[email]?.[requiredRole]) {
      const cached = roleCacheRef.current[email][requiredRole];
      const isValid = Date.now() - cached.timestamp < ROLE_CACHE_DURATION;
      if (isValid) {
        return cached.result;
      }
    }
    
    // Verificar cache do localStorage
    try {
      const localCache = localStorage.getItem(CACHE_KEYS.ROLE_CACHE);
      if (localCache) {
        const parsedCache: RoleCache = JSON.parse(localCache);
        if (parsedCache[email]?.[requiredRole]) {
          const cached = parsedCache[email][requiredRole];
          const isValid = Date.now() - cached.timestamp < ROLE_CACHE_DURATION;
          if (isValid) {
            // Atualizar cache em memória
            if (!roleCacheRef.current[email]) {
              roleCacheRef.current[email] = {};
            }
            roleCacheRef.current[email][requiredRole] = cached;
            return cached.result;
          }
        }
      }
    } catch {}
    
    try {
      const authCheck = await AuthService.canUserLoginWithRole(email, requiredRole);
      const result = authCheck.success;
      
      // Salvar nos caches
      const timestamp = Date.now();
      const cacheEntry = { result, timestamp };
      
      // Cache em memória (usando ref)
      if (!roleCacheRef.current[email]) {
        roleCacheRef.current[email] = {};
      }
      roleCacheRef.current[email][requiredRole] = cacheEntry;
      
      // Cache no localStorage
      try {
        const localCache = localStorage.getItem(CACHE_KEYS.ROLE_CACHE);
        const parsedCache: RoleCache = localCache ? JSON.parse(localCache) : {};
        parsedCache[email] = parsedCache[email] || {};
        parsedCache[email][requiredRole] = cacheEntry;
        localStorage.setItem(CACHE_KEYS.ROLE_CACHE, JSON.stringify(parsedCache));
      } catch {}
      
      return result;
    } catch (error) {
      console.error('Erro ao verificar role:', error);
      return false;
    }
  }, [user?.email]); // Apenas user.email como dependência

  // Função para fazer logout
  const signOut = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
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
  }, [clearCache]);

  // Função otimizada para atualizar autenticação - SEM dependências que mudam
  const refreshAuth = useCallback(async (): Promise<void> => {
    if (initializingRef.current) return; // Prevenir múltiplas execuções
    
    setLoading(true);
    setError(null);
    initializingRef.current = true;
    
    try {
      // Tentar cache primeiro
      const cachedData = loadFromCache();
      if (cachedData) {
        setUser(cachedData.user);
        setProfile(cachedData.profile);
        setAuthInfo(cachedData.authInfo);
        setLoading(false);
        initializingRef.current = false;
        return;
      }

      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        clearCache();
        setUser(null);
        setProfile(null);
        setAuthInfo(null);
        setLoading(false);
        initializingRef.current = false;
        return;
      }

      // Carregar perfil
      const userProfile = await loadUserProfile(currentUser);
      
      // Verificar acesso CMS apenas se necessário (lazy loading)
      let cmsAuthInfo: AuthResponse | null = null;
      if (currentUser.email && userProfile?.user_role === 'cms') {
        try {
          // Temporariamente definir o user para checkRoleAccess funcionar
          setUser(currentUser);
          const hasAccess = await checkRoleAccess('cms');
          cmsAuthInfo = {
            success: hasAccess,
            user_id: userProfile.id,
            username: userProfile.username,
            user_role: userProfile.user_role,
            name: userProfile.name
          };
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
      setError('Erro de conexão. Tentando novamente...');
      
      // Retry em caso de erro de rede (apenas uma vez)
      setTimeout(() => {
        if (!initializingRef.current) {
          refreshAuth();
        }
      }, 2000);
    } finally {
      setLoading(false);
      initializingRef.current = false;
    }
  }, []); // NENHUMA dependência para evitar loops

  // Inicialização - COM dependências fixas
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (!mounted) return;
      
      // Tentar carregar do cache primeiro para UX mais rápida
      const cachedData = loadFromCache();
      if (cachedData && mounted) {
        setUser(cachedData.user);
        setProfile(cachedData.profile);
        setAuthInfo(cachedData.authInfo);
        setLoading(false);
        
        // Verificar em background se os dados ainda são válidos
        setTimeout(() => {
          if (mounted && !initializingRef.current) {
            refreshAuth();
          }
        }, 100);
        return;
      }
      
      // Se não há cache, fazer verificação completa
      if (mounted) {
        await refreshAuth();
      }
    };

    initAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT' || !session) {
        clearCache();
        setUser(null);
        setProfile(null);
        setAuthInfo(null);
        setLoading(false);
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !initializingRef.current) {
        await refreshAuth();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Dependências vazias - executa apenas uma vez

  // Computed values otimizados com useMemo
  const computedValues = useMemo(() => {
    const isAuthenticated = !!user;
    const isAuthorized = profile?.authorized === true;
    const isCMSUser = profile?.user_role === 'cms';
    const canAccessCMS = isAuthenticated && isCMSUser && isAuthorized && (authInfo?.success === true);

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