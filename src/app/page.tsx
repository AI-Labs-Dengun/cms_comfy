"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth";
import LoginPage from "./login/page";

export default function Home() {
  const [isChecking, setIsChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await AuthService.getUser();
      
      if (user?.email) {
        // Se tem usuário logado, redirecionar para página de criação
        // O AuthGuard fará a verificação de role
        setIsLoggedIn(true);
        router.push('/dashboard/create');
        return;
      }
      
      // Se não está logado, mostrar página de login
      setIsChecking(false);
      
    } catch (error) {
      console.error('Erro ao verificar status de auth:', error);
      setIsChecking(false);
    }
  };

  if (isChecking || isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
          <p className="text-gray-600">
            {isLoggedIn ? 'Redirecionando para página de criação...' : 'Verificando acesso...'}
          </p>
        </div>
      </div>
    );
  }

  return <LoginPage />;
} 