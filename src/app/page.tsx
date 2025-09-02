"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "./login/page";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { loading, isAuthenticated, canAccessCMS, user, profile, authInfo } = useAuth();
  const hasRedirected = useRef(false);

  // Prevenir hydration mismatch
  useEffect(() => {
    setMounted(true);
    console.log('🏠 HomePage - Componente montado');
  }, []);

  // Lógica de redirecionamento simplificada
  useEffect(() => {
    console.log('🏠 HomePage useEffect - Verificando condições:', {
      mounted,
      loading,
      isAuthenticated,
      canAccessCMS,
      userEmail: user?.email,
      userRole: profile?.user_role,
      authorized: profile?.authorized,
      authInfoSuccess: authInfo?.success,
      hasRedirected: hasRedirected.current,
      timestamp: new Date().toISOString()
    });

    if (!mounted || loading) {
      console.log('🏠 HomePage - Aguardando inicialização...', { mounted, loading });
      return;
    }
    
    // Verificações rigorosas antes de redirecionar
    const shouldRedirect = mounted && 
                          !loading && 
                          isAuthenticated && 
                          canAccessCMS && 
                          user && 
                          profile && 
                          profile.user_role === 'cms' && 
                          profile.authorized === true &&
                          authInfo?.success === true &&
                          !hasRedirected.current;

    console.log('🏠 HomePage - Análise de redirecionamento:', {
      shouldRedirect,
      condições: {
        mounted,
        notLoading: !loading,
        isAuthenticated,
        canAccessCMS,
        hasUser: !!user,
        hasProfile: !!profile,
        isCMSUser: profile?.user_role === 'cms',
        isAuthorized: profile?.authorized === true,
        authSuccess: authInfo?.success === true,
        notRedirectedYet: !hasRedirected.current
      }
    });
    
    // Se está autenticado com acesso CMS e ainda não redirecionou
    if (shouldRedirect) {
      console.log('✅ HomePage - TODAS as condições atendidas, redirecionando usuário autenticado para dashboard...');
      hasRedirected.current = true;
      
      // Redirecionamento simples
      router.replace('/dashboard/management');
      
      // Fallback de segurança
      setTimeout(() => {
        if (window.location.pathname === '/') {
          console.log('🔄 HomePage - Fallback: usando window.location...');
          window.location.href = '/dashboard/management';
        }
      }, 1500);
    } else {
      console.log('❌ HomePage - Condições não atendidas, não redirecionando');
    }
  }, [mounted, loading, isAuthenticated, canAccessCMS, user, profile, authInfo, router]);

  // Reset do flag quando o usuário sair
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🏠 HomePage - Usuário não autenticado, resetando flag de redirecionamento');
      hasRedirected.current = false;
    }
  }, [isAuthenticated]);

  // Estado de carregamento inicial
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner 
          size="lg" 
          text="Inicializando..." 
          color="black"
        />
      </div>
    );
  }

  // Estado de carregamento da autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner 
          size="lg" 
          text="Verificando acesso..." 
          color="black"
        />
      </div>
    );
  }

  // Estado de redirecionamento
  if (isAuthenticated && canAccessCMS && hasRedirected.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner 
          size="lg" 
          text="Redirecionando para o dashboard..." 
          color="green"
        />
      </div>
    );
  }

  // Se chegou aqui, mostrar página de login
  console.log('🏠 HomePage - Exibindo página de login');
  return <LoginPage />;
} 