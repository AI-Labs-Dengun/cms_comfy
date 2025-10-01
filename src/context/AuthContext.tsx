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
  updateProfile?: (patch: Partial<UserProfile>) => void;
  authInfo: AuthResponse | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  isCMSUser: boolean;
  canAccessCMS: boolean;
  isLoggingOut: boolean;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  refreshAuth: (forceRefresh?: boolean) => Promise<void>;
  checkRoleAccess: (requiredRole: 'cms' | 'app' | 'psicologo') => Promise<boolean>;
  updatePsicologoStatus?: (isOnline: boolean) => void;
  syncPsicologoStatus?: () => Promise<boolean | null>;
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Usar useRef para evitar re-renders desnecessários
  const initializedRef = useRef(false);
  const lastAuthCheckRef = useRef<number>(0);
  const authStateChangeRef = useRef<boolean>(false);
  const sessionPersistentRef = useRef<boolean>(false);
  const refreshAuthMutex = useRef<boolean>(false); // Mutex para refreshAuth
  const profileCacheRef = useRef<{[key: string]: {profile: UserProfile, timestamp: number}}>({});
  const cmsAccessCacheRef = useRef<{[key: string]: {authInfo: AuthResponse, timestamp: number}}>({});
  const lastStatusUpdateRef = useRef<{[key: string]: {status: boolean, timestamp: number}}>({});
  
  // Function for automatic cleanup of expired cache
  const cleanupExpiredCache = useCallback(() => {
    const now = Date.now();
    const PROFILE_TTL = 5 * 60 * 1000; // 5 minutos
    const CMS_TTL = 10 * 60 * 1000; // 10 minutos
    
    // Limpar cache de perfis expirados
    Object.keys(profileCacheRef.current).forEach(key => {
      if (now - profileCacheRef.current[key].timestamp > PROFILE_TTL) {
        delete profileCacheRef.current[key];
      }
    });
    
    // Limpar cache CMS expirado
    Object.keys(cmsAccessCacheRef.current).forEach(key => {
      if (now - cmsAccessCacheRef.current[key].timestamp > CMS_TTL) {
        delete cmsAccessCacheRef.current[key];
      }
    });
  }, []);

  // Utility function to update psychologist status with database-first approach
  const updatePsicologoStatus = useCallback((psicologoId: string, isOnline: boolean) => {
    const now = Date.now();
    const lastUpdate = lastStatusUpdateRef.current[psicologoId];
    
    // Avoid duplicate calls if status hasn't changed or was updated very recently
    if (lastUpdate && lastUpdate.status === isOnline && (now - lastUpdate.timestamp) < 1000) {
      console.log(`⏭️ AuthContext - Status já atualizado recentemente para ${isOnline ? 'online' : 'offline'}`);
      return;
    }
    
    // Update cache immediately
    lastStatusUpdateRef.current[psicologoId] = { status: isOnline, timestamp: now };
    
    // Show loading state immediately for better UX
    setProfile(prev => prev ? { ...prev, is_online: isOnline } : prev);
    
    // Update database FIRST, then sync local state based on result
    queueMicrotask(async () => {
      try {
        // Method 1: Use RPC function for primary update (ensures all business logic)
        const rpcFunction = isOnline ? 'handle_psicologo_login' : 'handle_psicologo_logout';
        const { error: rpcError } = await supabase.rpc(rpcFunction, { psicologo_id: psicologoId });
        
        if (rpcError) {
          console.warn(`⚠️ AuthContext - Erro na função RPC:`, rpcError);
          // Revert UI state if RPC failed
          setProfile(prev => prev ? { ...prev, is_online: !isOnline } : prev);
          delete lastStatusUpdateRef.current[psicologoId];
          return;
        }
        
        console.log(`✅ AuthContext - Status ${isOnline ? 'online' : 'offline'} atualizado com sucesso via RPC`);
        
        // Method 2: Verify the actual status from database to ensure sync
        const { data: currentProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('is_online')
          .eq('id', psicologoId)
          .single();
        
        if (!fetchError && currentProfile) {
          // Sync local state with actual database state
          const actualStatus = currentProfile.is_online;
          setProfile(prev => prev ? { ...prev, is_online: actualStatus } : prev);
          
          // Update cache with actual status
          lastStatusUpdateRef.current[psicologoId] = { status: actualStatus, timestamp: now };
          
          console.log(`🔄 AuthContext - Estado local sincronizado com database: ${actualStatus ? 'online' : 'offline'}`);
          
          if (actualStatus !== isOnline) {
            console.warn(`⚠️ AuthContext - Discrepância detectada! Esperado: ${isOnline}, Atual: ${actualStatus}`);
          }
        } else {
          console.warn('⚠️ AuthContext - Erro ao verificar status atual:', fetchError);
        }
        
      } catch (error) {
        console.warn(`⚠️ AuthContext - Erro ao definir psicólogo como ${isOnline ? 'online' : 'offline'}:`, error);
        // Revert UI state if request failed
        setProfile(prev => prev ? { ...prev, is_online: !isOnline } : prev);
        // Remove from cache on failure
        delete lastStatusUpdateRef.current[psicologoId];
      }
    });
  }, []);

  // Session persistence hook
  const {
    saveSessionData: savePersistentData,
    clearSessionData,
    updateSessionActivity: updatePersistentActivity
  } = useSessionPersistence({
    onSessionRestore: (data: CachedAuthData) => {
      console.log('🔄 AuthContext - Restaurando dados da sessão...');
      if (data.user && data.profile) {
        setUser(data.user);
        setProfile(data.profile);
        setAuthInfo(data.authInfo);
        // Only mark as persistent if the restored profile is NOT a psychologist
        sessionPersistentRef.current = data.profile.user_role !== 'psicologo';
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
    maxSessionAge: 8 * 60 * 60 * 1000 // 8 hours
  });

  // Page visibility hook - ONLY update session activity
  usePageVisibility({
    onVisible: () => {
      console.log('👁️ AuthContext - Página visível, atualizando apenas atividade da sessão');
      // Just update session activity
      updateSessionActivity();
      updatePersistentActivity();
    },
    onHidden: () => {
      console.log('👁️ AuthContext - Página oculta');
    },
    disableAutoRefresh: true,
    minHiddenTime: 30000
  });



  // Function to save to sessionStorage
  const saveToCache = useCallback((data: CachedAuthData) => {
    try {
      // If the user is a psychologist, DO NOT persist the session across tabs/windows
      // Psychologists should not have persistent sessions by design
      const role = data?.profile?.user_role;
      if (role === 'psicologo') {
        console.log('⚠️ AuthContext - Psicólogo detectado; não persistindo sessão (limpando qualquer dado existente)');
        // Clear any previously saved persistent data to avoid leaking sessions
        try {
          clearAllSessionData();
        } catch {
          // ignore
        }
        // Also clear the persistence hook storage if available
        try {
          clearSessionData();
        } catch {
          // ignore
        }
        sessionPersistentRef.current = false;
        return;
      }

      // Non-psychologist users: persist the session (CMS/app users)
      // Use session utilities
      saveSessionData(data);

      // Also save using the persistence hook
      savePersistentData(data);

      // Mark session as persistent
      sessionPersistentRef.current = true;

      console.log('📦 AuthContext - Dados salvos no sessionStorage');
    } catch (error) {
      console.error('❌ AuthContext - Erro ao salvar cache:', error);
    }
  }, [savePersistentData, clearSessionData]);

  // Function to update only profile fields in the context
  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch } as UserProfile;

      try {
        // Update session cache with the updated profile
        if (user && (authInfo !== undefined)) {
          const cacheData: CachedAuthData = {
            user,
            profile: updated,
            authInfo: authInfo ?? null,
            timestamp: Date.now()
          };
          saveToCache(cacheData);
        }
      } catch (error) {
        console.warn('⚠️ AuthContext - Falha ao salvar profile atualizado no cache:', error);
      }

      return updated;
    });
  }, [saveToCache, user, authInfo]);

  // Function to clear cache
  const clearCache = useCallback(() => {
    clearAllSessionData();
    clearSessionData();
    profileCacheRef.current = {}; // Clear profile cache
    cmsAccessCacheRef.current = {}; // Clear CMS access cache
    cleanupExpiredCache(); // Run additional cleanup
    console.log('🗑️ AuthContext - Cache completo limpo');
  }, [clearSessionData, cleanupExpiredCache]);

  // Force logout for psychologists when tab/window is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // If current user is a psychologist, clear data before closing
      if (profile?.user_role === 'psicologo' && profile?.id) {
        console.log('🚪 AuthContext - Psicólogo fechando aba, limpando dados...');
        try {
          // Clear all session data immediately
          clearAllSessionData();
          
          // Clear any remaining Supabase storage synchronously
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.includes('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
          sessionStorage.clear();
          
          // Use sendBeacon for async operation that can survive page unload
          // This is more reliable than regular async calls in beforeunload
          if (navigator.sendBeacon) {
            try {
              // Use sendBeacon to send logout request
              const logoutData = new FormData();
              logoutData.append('psicologo_id', profile.id);
              
              // Create a simple endpoint call (you'll need to handle this on your server)
              navigator.sendBeacon('/api/psicologo-logout', logoutData);
              console.log('📡 AuthContext - Enviado beacon para logout do psicólogo');
            } catch (error) {
              console.warn('⚠️ AuthContext - Erro ao enviar beacon:', error);
            }
          }
        } catch (error) {
          console.warn('⚠️ AuthContext - Erro ao limpar dados na saída:', error);
        }
      }
    };

    // Also handle page visibility change for more reliable offline status
    const handleVisibilityChange = () => {
      if (document.hidden && profile?.user_role === 'psicologo' && profile?.id) {
        // Page is being hidden, set psychologist as offline
        updatePsicologoStatus(profile.id, false);
        console.log('👁️ AuthContext - Página oculta, definindo psicólogo como offline');
      } else if (!document.hidden && profile?.user_role === 'psicologo' && profile?.id && !profile.is_online) {
        // Page is becoming visible and psychologist was offline, set as online
        updatePsicologoStatus(profile.id, true);
        console.log('👁️ AuthContext - Página visível, definindo psicólogo como online');
      }
    };

    // Add both listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile?.user_role, profile?.id, profile?.is_online, clearCache, updatePsicologoStatus]);



  // Function to load the user profile - WITH SMART CACHE
  const loadUserProfile = useCallback(async (currentUser: User, forceRefresh: boolean = false): Promise<UserProfile | null> => {
    try {
      console.log('👤 AuthContext - Carregando perfil do usuário:', currentUser.id);

      // Check cache (valid for 5 minutes)
      const cached = profileCacheRef.current[currentUser.id];
      const now = Date.now();
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

      if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
        console.log('📦 AuthContext - Usando perfil do cache (válido por mais', Math.round((CACHE_TTL - (now - cached.timestamp)) / 1000), 'segundos)');
        return cached.profile;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, username, user_role, authorized, is_online')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('❌ AuthContext - Erro ao carregar perfil:', error);
        return null;
      }

      // If psychologist, set as online automatically
      if (profile.user_role === 'psicologo' && profile.authorized === true) {
        console.log('🔄 AuthContext - Definindo psicólogo como online...');
        
        // Update database first, then sync local state
        supabase
          .rpc('handle_psicologo_login', { psicologo_id: profile.id })
          .then(({ error: statusError }) => {
            if (statusError) {
              console.warn('⚠️ AuthContext - Erro ao definir status online:', statusError);
              // Keep profile offline if database update failed
              profile.is_online = false;
            } else {
              console.log('✅ AuthContext - Status online definido com sucesso no database');
              // Sync local state with database success
              profile.is_online = true;
              // Also update the React state to trigger re-renders
              setProfile(prev => prev ? { ...prev, is_online: true } : prev);
            }
          });
      }

      console.log('✅ AuthContext - Perfil carregado:', { 
        id: profile.id, 
        user_role: profile.user_role, 
        authorized: profile.authorized,
        is_online: profile.is_online
      });
      
      const userProfile = profile as UserProfile;

      // Save to cache
      profileCacheRef.current[currentUser.id] = {
        profile: userProfile,
        timestamp: Date.now()
      };
      console.log('💾 AuthContext - Perfil salvo no cache');
      
      return userProfile;
    } catch (error) {
      console.error('❌ AuthContext - Erro inesperado ao carregar perfil:', error);
      return null;
    }
  }, []);

  // Simplified function to check access by role - NO cache for login
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

  // Function to perform logout
  const signOut = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🚪 AuthContext - Fazendo logout...');
      
      // Set logging out flag to avoid "Access Denied" flashes
      setIsLoggingOut(true);

      // If psychologist, set as offline before logout
      if (profile?.user_role === 'psicologo' && profile?.id) {
        // Use optimized status update function (fire and forget)
        updatePsicologoStatus(profile.id, false);
        console.log('🔄 AuthContext - Definindo psicólogo como offline...');
      }

      // First, sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ AuthContext - Erro ao fazer logout no Supabase:', error);
        return { success: false, error: error.message };
      }

      // Clear cache and local state
      clearCache();
      setUser(null);
      setProfile(null);
      setAuthInfo(null);
      setError(null);
      sessionPersistentRef.current = false;

      // Clear Supabase query cache if available
      try {
        const { clearQueryCache } = await import('@/lib/supabase');
        clearQueryCache();
      } catch {
        // Ignore error if function is not available
      }
      
      console.log('✅ AuthContext - Logout realizado com sucesso');
      // Redirect to login after cleanup to avoid leaving stale session data
      setTimeout(() => {
        try {
          window.location.href = '/login';
        } catch {
          // ignore
        }
      }, 100);

      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext - Erro inesperado ao fazer logout:', error);
      setIsLoggingOut(false);
      return { success: false, error: 'Erro de conexão ao fazer logout' };
    }
  }, [clearCache, profile]);

  // Main function to refresh authentication - OPTIMIZED WITH MUTEX
  const refreshAuth = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    // MUTEX: Only allow one execution of refreshAuth at a time
    if (refreshAuthMutex.current) {
      console.log('🔒 AuthContext - refreshAuth já está executando (mutex), ignorando nova chamada...');
      return;
    }

    // MAIN OPTIMIZATION: If user is fully authenticated, NEVER perform checks
    if (!forceRefresh && user && profile && authInfo?.success) {
      console.log('✅ AuthContext - Usuário COMPLETAMENTE autenticado, ZERO verificações necessárias');
      return;
    }

    // If not a forced refresh AND we have valid basic data, skip as well
    if (!forceRefresh && user && profile && profile.authorized === true) {
      console.log('✅ AuthContext - Dados básicos válidos e autorizados, pulando verificação');
      return;
    }

  // Check if we already did a very recent check (just to avoid spam)
    const now = Date.now();
    const timeSinceLastCheck = now - lastAuthCheckRef.current;
    
    if (!forceRefresh && timeSinceLastCheck < 3000) { // 3 segundos apenas para não-forçado
      console.log('⏭️ AuthContext - Verificação muito recente, pulando... (há', Math.round(timeSinceLastCheck / 1000), 'segundos)');
      return;
    }
    
    console.log('🔄 AuthContext - Iniciando refreshAuth...', { forceRefresh, timeSinceLastCheck });
    
  // Activate mutex
    refreshAuthMutex.current = true;
    
    // OPTIMIZED TIMEOUT TO AVOID HANGING
    const forceTimeout = setTimeout(() => {
      if (refreshAuthMutex.current) {
        console.warn('⏰ AuthContext - TIMEOUT! Parando verificação após 6 segundos...');
        refreshAuthMutex.current = false;
        setLoading(false);

        // If there are valid session data, use them as fallback
        const sessionData = getSessionData();
        if (sessionData && sessionData.user && sessionData.profile) {
          console.log('🔄 AuthContext - Usando dados de sessão válidos como fallback');
          setUser(sessionData.user as User);
          setProfile(sessionData.profile as UserProfile);
          setAuthInfo(sessionData.authInfo as AuthResponse);
        }
      }
    }, 6000); 
    
    // Only set loading if it is a forced check (login) or if we don't have data yet
    if (forceRefresh || !user || !profile) {
      setLoading(true);
    }
    
    setError(null);
    lastAuthCheckRef.current = now;
    
    try {
      // Check current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.log('❌ AuthContext - Nenhum usuário autenticado');
        clearCache();
        setUser(null);
        setProfile(null);
        setAuthInfo(null);
        setLoading(false);
        refreshAuthMutex.current = false;
        return;
      }

      console.log('👤 AuthContext - Usuário autenticado encontrado:', currentUser.email);

      // Load user profile (use cache if not forced)
      const userProfile = await loadUserProfile(currentUser, forceRefresh);
      
      if (!userProfile) {
        console.log('❌ AuthContext - Perfil não encontrado');
        clearCache();
        setUser(currentUser);
        setProfile(null);
        setAuthInfo(null);
        setLoading(false);
        refreshAuthMutex.current = false; // Clear mutex
        return;
      }

      // Check CMS access if user is CMS - WITH CACHE
      let cmsAuthInfo: AuthResponse | null = null;
      if (userProfile.user_role === 'cms') {
        console.log('🔍 AuthContext - Verificando acesso CMS para usuário...');

        // Check CMS cache (valid for 10 minutes)
        const cmsCache = cmsAccessCacheRef.current[currentUser.email!];
        const now = Date.now();
        const CMS_CACHE_TTL = 10 * 60 * 1000; // 10 minutos
        
        if (!forceRefresh && cmsCache && (now - cmsCache.timestamp) < CMS_CACHE_TTL) {
          console.log('📦 AuthContext - Usando verificação CMS do cache');
          cmsAuthInfo = cmsCache.authInfo;
        } else {
          try {
            const hasAccess = await AuthService.canUserLoginWithRole(currentUser.email!, 'cms');
            cmsAuthInfo = hasAccess;

            // Save to cache only if successful
            if (hasAccess.success) {
              cmsAccessCacheRef.current[currentUser.email!] = {
                authInfo: hasAccess,
                timestamp: now
              };
              console.log('💾 AuthContext - Verificação CMS salva no cache');
            }
            
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
      }

      // Update state
      setUser(currentUser);
      setProfile(userProfile);
      setAuthInfo(cmsAuthInfo);

      // Save to sessionStorage only if everything went well
      const cacheData: CachedAuthData = {
        user: currentUser,
        profile: userProfile,
        authInfo: cmsAuthInfo,
        timestamp: Date.now()
      };
      saveToCache(cacheData);

      // Mark session as persistent
      sessionPersistentRef.current = true;
      
      console.log('✅ AuthContext - refreshAuth concluído com sucesso');
      
    } catch (error) {
      console.error('❌ AuthContext - Erro ao atualizar autenticação:', error);
      setError('Erro de conexão ao verificar autenticação');
      
      // Clear state in case of error
      setUser(null);
      setProfile(null);
      setAuthInfo(null);
      clearCache();
    } finally {
      setLoading(false);
      refreshAuthMutex.current = false; // Limpar mutex sempre
      clearTimeout(forceTimeout);
    }
  }, [loadUserProfile, saveToCache, clearCache, user, profile, authInfo]);

  // Optimized initialization
  useEffect(() => {
    if (initializedRef.current) return;
    
    let mounted = true;
    initializedRef.current = true;

    const initAuth = async () => {
      if (!mounted) return;
      
      console.log('🚀 AuthContext - Inicializando autenticação...');
      
      // Clear corrupted session data
      cleanupSessionData();

      // CRITICAL: Check if there's an active Supabase session and if it belongs to a psychologist
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Check if this user is a psychologist by querying the profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_role, id')
            .eq('id', session.user.id)
            .single();
          
          if (profileData?.user_role === 'psicologo') {
            console.log('⚠️ AuthContext - Sessão ativa de psicólogo detectada na inicialização - FAZENDO LOGOUT COMPLETO');
            
            // Clear state immediately for instant UI feedback
            setUser(null);
            setProfile(null);
            setAuthInfo(null);
            setLoading(false);
            sessionPersistentRef.current = false;
            
            // Clear all session data
            clearAllSessionData();
            
            // Clear any remaining Supabase local storage
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') && key.includes('-auth-token')) {
                localStorage.removeItem(key);
              }
            });
            
            // Do cleanup operations in parallel (non-blocking)
            Promise.all([
              // Set psychologist as offline
              profileData.id ? supabase.rpc('handle_psicologo_logout', { psicologo_id: profileData.id }) : Promise.resolve(),
              // Force sign out from Supabase
              supabase.auth.signOut()
            ]).then(([logoutResult, signOutResult]) => {
              if (logoutResult?.error) {
                console.warn('⚠️ AuthContext - Erro ao definir psicólogo como offline:', logoutResult.error);
              } else {
                console.log('✅ AuthContext - Status do psicólogo definido como offline');
              }
              
              if (signOutResult?.error) {
                console.warn('⚠️ AuthContext - Erro ao fazer signOut:', signOutResult.error);
              } else {
                console.log('✅ AuthContext - SignOut concluído');
              }
            }).catch((error) => {
              console.warn('⚠️ AuthContext - Erro nas operações de limpeza:', error);
            });
            
            console.log('✅ AuthContext - Psicólogo deslogado (limpeza em paralelo), estado limpo');
            return; // Don't continue with normal auth flow
          }
        }
      } catch (error) {
        console.warn('⚠️ AuthContext - Erro ao verificar sessão de psicólogo:', error);
      }

      // Check if there are valid persistent data
      if (hasValidSessionData()) {
        console.log('📦 AuthContext - Dados persistentes válidos encontrados');
        sessionPersistentRef.current = true;
        
        // Try to restore session data FIRST 
        const sessionData = getSessionData();
        if (sessionData && sessionData.user && sessionData.profile) {
          // Don't restore persistence for psychologists
          if ((sessionData.profile as UserProfile).user_role === 'psicologo') {
            console.log('⚠️ AuthContext - Dados de sessão pertencem a psicólogo; ignorando restauração');
            // Clear any leftover persistent session data to be safe
            clearAllSessionData();
          } else {
            console.log('🔄 AuthContext - Restaurando dados da sessão - PARANDO todas as verificações');
            setUser(sessionData.user as User);
            setProfile(sessionData.profile as UserProfile);
            setAuthInfo(sessionData.authInfo as AuthResponse);
            sessionPersistentRef.current = true;
            setLoading(false);
            console.log('✅ AuthContext - Inicialização concluída com dados de sessão - SEM verificações adicionais');
            return;
          }
        }
      }
      
      // Direct verification without relying heavily on cache
      await refreshAuth(true);
    };    initAuth();

  // Listener for authentication changes - OPTIMIZED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔔 AuthContext - Auth state change:', event, !!session);
      
  // Mark that there was a state change
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
        
        // Redirect to login if not already there
        const currentPath = window.location.pathname;
        const authPaths = ['/login', '/signup', '/'];
        
        if (!authPaths.includes(currentPath)) {
          console.log('🔄 AuthContext - Redirecionando para login após logout...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !refreshAuthMutex.current) {
        console.log('🔑 AuthContext - Usuário logado/token atualizado, atualizando auth...');
        // Force refresh on sign in or token refresh
        await refreshAuth(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearCache, refreshAuth]); // Include necessary dependencies

  // Computed values with more specific debug logs
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

  // Function to sync current status with database
  const syncPsicologoStatus = useCallback(async () => {
    if (profile?.user_role === 'psicologo' && profile?.id) {
      try {
        console.log('🔄 AuthContext - Sincronizando status do psicólogo com database...');
        
        const { data: currentProfile, error } = await supabase
          .from('profiles')
          .select('is_online')
          .eq('id', profile.id)
          .single();
        
        if (!error && currentProfile) {
          const databaseStatus = currentProfile.is_online;
          const localStatus = profile.is_online;
          
          if (databaseStatus !== localStatus) {
            console.log(`🔄 AuthContext - Sincronizando status: Database=${databaseStatus}, Local=${localStatus}`);
            setProfile(prev => prev ? { ...prev, is_online: databaseStatus } : prev);
          } else {
            console.log('✅ AuthContext - Status já está sincronizado');
          }
          
          return databaseStatus;
        } else {
          console.warn('⚠️ AuthContext - Erro ao buscar status atual:', error);
          return null;
        }
      } catch (error) {
        console.warn('⚠️ AuthContext - Erro ao sincronizar status:', error);
        return null;
      }
    }
    return null;
  }, [profile?.id, profile?.user_role, profile?.is_online]);

  // Expose status update function for current user
  const updateCurrentUserStatus = useCallback((isOnline: boolean) => {
    if (profile?.user_role === 'psicologo' && profile?.id) {
      updatePsicologoStatus(profile.id, isOnline);
    }
  }, [profile?.id, profile?.user_role, updatePsicologoStatus]);

  // Auto-sync psychologist status when profile loads
  useEffect(() => {
    if (profile?.user_role === 'psicologo' && profile?.id && profile.authorized) {
      // Small delay to ensure profile is fully loaded
      const syncTimer = setTimeout(() => {
        syncPsicologoStatus();
      }, 500);
      
      return () => clearTimeout(syncTimer);
    }
  }, [profile?.id, profile?.user_role, profile?.authorized, syncPsicologoStatus]);

  const contextValue: AuthContextType = {
    user,
    profile,
    updateProfile,
    authInfo,
    loading,
    error,
    isLoggingOut,
    ...computedValues,
    signOut,
    refreshAuth,
    checkRoleAccess,
    updatePsicologoStatus: updateCurrentUserStatus,
    syncPsicologoStatus,
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