'use client';

import { useEffect, useState } from 'react';

interface EnvironmentCheckProps {
  children: React.ReactNode;
}

export default function EnvironmentCheck({ children }: EnvironmentCheckProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkEnvironment = () => {
      // No lado do cliente, verificar diretamente as variáveis do Next.js
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      console.log('🔍 EnvironmentCheck - Verificando variáveis:', {
        supabaseUrl: supabaseUrl ? 'Definida' : 'Não definida',
        supabaseAnonKey: supabaseAnonKey ? 'Definida' : 'Não definida',
        processEnv: process.env
      });

      const missingVars = [];
      
      if (!supabaseUrl || supabaseUrl === 'https://seu-projeto.supabase.co') {
        missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
      }
      
      if (!supabaseAnonKey || supabaseAnonKey === 'sua_anon_key_aqui') {
        missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }

      if (missingVars.length > 0) {
        console.error('❌ EnvironmentCheck - Variáveis em falta:', missingVars);
        setError(`Variáveis de ambiente em falta: ${missingVars.join(', ')}`);
        setIsValid(false);
        return;
      }

      console.log('✅ EnvironmentCheck - Todas as variáveis estão definidas');
      setIsValid(true);
    };

    checkEnvironment();
  }, []);

  // Otimização para visibilidade da página
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Quando a página se torna visível novamente, limpar qualquer timeout pendente
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
          visibilityTimeout = null;
        }
        
        // Log para debug (opcional)
        console.log('👁️ EnvironmentCheck - Página visível novamente');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, []);

  if (isValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando ambiente...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <div className="w-12 h-12 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Erro de Configuração</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-800 mb-2">Como resolver:</h3>
            <ol className="text-sm text-blue-700 space-y-2">
              <li>1. Verifique se o arquivo <code className="bg-blue-100 px-1 rounded">.env.local</code> existe na raiz do projeto</li>
              <li>2. Verifique se as variáveis estão definidas corretamente:</li>
              <pre className="bg-blue-100 p-2 rounded text-xs mt-2 overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui`}
              </pre>
              <li>3. Pare o servidor (Ctrl+C) e execute <code className="bg-blue-100 px-1 rounded">npm run dev</code> novamente</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}