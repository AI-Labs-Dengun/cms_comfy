'use client';

import { useEffect, useState } from 'react';

interface EnvironmentStatus {
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  isConfigured: boolean;
}

export default function EnvironmentCheck({ children }: { children: React.ReactNode }) {
  const [envStatus, setEnvStatus] = useState<EnvironmentStatus | null>(null);

  useEffect(() => {
    // Verificar variáveis de ambiente do lado do cliente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const status: EnvironmentStatus = {
      supabaseUrl: !!supabaseUrl && supabaseUrl !== 'sua_supabase_url_aqui',
      supabaseAnonKey: !!supabaseAnonKey && supabaseAnonKey !== 'sua_anon_key_aqui',
      isConfigured: false
    };

    status.isConfigured = status.supabaseUrl && status.supabaseAnonKey;
    setEnvStatus(status);
  }, []);

  if (!envStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!envStatus.isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <img src="/cms-logo.png" alt="Comfy CMS" className="w-20 h-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuração Necessária</h1>
            <p className="text-gray-600">As variáveis de ambiente do Supabase não estão configuradas</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-red-800 mb-3">Variáveis em falta:</h2>
            <ul className="text-left text-sm text-red-700 space-y-1">
              {!envStatus.supabaseUrl && (
                <li>❌ NEXT_PUBLIC_SUPABASE_URL</li>
              )}
              {!envStatus.supabaseAnonKey && (
                <li>❌ NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              )}
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-blue-800 mb-2">Como resolver:</h3>
            <ol className="text-sm text-blue-700 space-y-2">
              <li>1. Crie um arquivo <code className="bg-blue-100 px-1 rounded">.env.local</code> na raiz do projeto</li>
              <li>2. Adicione suas credenciais do Supabase:</li>
              <pre className="bg-blue-100 p-2 rounded text-xs mt-2 overflow-x-auto">
                {`NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
                NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
                SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui`}
              </pre>
              <li>3. Reinicie o servidor de desenvolvimento</li>
              <li>4. Atualize esta página</li>
            </ol>
          </div>

          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800 transition-colors"
          >
            Verificar Novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}