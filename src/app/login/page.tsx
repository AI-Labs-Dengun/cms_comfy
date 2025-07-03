"use client";

import React, { useState } from "react";
import { AuthService } from "@/services/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Tentar fazer login com role CMS
      const result = await AuthService.loginWithRole(email, password, 'cms');

      if (result.success) {
        // Limpar erro e mostrar feedback positivo
        setError('');
        setSuccessMessage('Login bem-sucedido! Redirecionando...');
        
        // Redirecionar após login bem-sucedido
        setTimeout(() => {
          window.location.href = '/dashboard/create';
        }, 1000);
        
      } else {
        // Mostrar erro específico baseado no código
        let errorMessage = result.error || 'Erro no login';
        
        switch (result.code) {
          case 'USER_NOT_FOUND':
            errorMessage = 'Usuário não encontrado';
            break;
          case 'ACCOUNT_NOT_AUTHORIZED':
            errorMessage = 'Sua conta ainda não foi autorizada pelo responsável';
            break;
          case 'INSUFFICIENT_PERMISSIONS':
            errorMessage = `Acesso negado. Este sistema é apenas para administradores (role CMS). Seu role atual: ${result.user_role || 'desconhecido'}`;
            break;
          case 'INVALID_CREDENTIALS':
            errorMessage = 'Email ou palavra-passe incorretos';
            break;
          default:
            errorMessage = result.error || 'Erro no login';
        }
        
        setError(errorMessage);
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md flex flex-col items-center"
      >
        <div className="mb-8 flex flex-col items-center">
          <img src="/cms-logo.png" alt="Comfy Content Hub Logo" className="mb-2 w-28 h-auto mx-auto" />
        </div>
        <div className="mb-6 text-center text-sm text-gray-900">
          Inicie sessão para acessar o CMS
        </div>
        
        {error && (
          <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}
        
        <div className="w-full mb-4">
          <label className="block text-sm mb-1 text-gray-900" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Introduza o seu email"
            className="w-full border border-gray-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className="w-full mb-6">
          <label className="block text-sm mb-1 text-gray-900" htmlFor="password">
            Palavra-passe
          </label>
          <input
            id="password"
            type="password"
            placeholder="Introduza a sua palavra-passe"
            className="w-full border border-gray-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded font-medium hover:bg-gray-900 transition-colors disabled:opacity-60 cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? "A iniciar sessão..." : "Iniciar Sessão"}
        </button>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 mb-4">
            Apenas usuários com role &quot;CMS&quot; podem acessar este sistema
          </p>
          <p className="text-sm text-gray-600">
            Não tem uma conta?{' '}
            <a
              href="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Criar conta CMS
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
