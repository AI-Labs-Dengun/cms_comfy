"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "./login/page";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { loading, isAuthenticated, canAccessCMS } = useAuth();

  // Prevenir hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect logic simplificada
  useEffect(() => {
    if (!mounted || loading) return;
    
    if (isAuthenticated && canAccessCMS) {
      router.push('/dashboard/create');
    }
  }, [mounted, loading, isAuthenticated, canAccessCMS, router]);

  // Loading state durante verificação inicial
  if (!mounted || loading || (isAuthenticated && canAccessCMS)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
          <p className="text-gray-600">
            {!mounted ? 'Carregando...' : 
             loading ? 'Verificando acesso...' : 
             'Redirecionando...'}
          </p>
        </div>
      </div>
    );
  }

  // Se não está autenticado ou não tem acesso CMS, mostrar login
  return <LoginPage />;
} 