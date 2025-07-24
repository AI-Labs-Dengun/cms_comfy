'use client';

import { useEffect, useState } from 'react';

interface EnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string | undefined;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string | undefined;
  allEnvVars: string[];
  processEnv: NodeJS.ProcessEnv;
}

export default function TestEnvPage() {
  const [envVars, setEnvVars] = useState<EnvVars | null>(null);

  useEffect(() => {
    const vars: EnvVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')),
      processEnv: process.env
    };
    
    console.log('Variáveis de ambiente:', vars);
    setEnvVars(vars);
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Teste de Variáveis de Ambiente</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">NEXT_PUBLIC_SUPABASE_URL</h2>
            <p className="font-mono text-sm break-all">
              {envVars?.NEXT_PUBLIC_SUPABASE_URL || 'Não definida'}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Status: {envVars?.NEXT_PUBLIC_SUPABASE_URL ? '✅ Definida' : '❌ Não definida'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">NEXT_PUBLIC_SUPABASE_ANON_KEY</h2>
            <p className="font-mono text-sm break-all">
              {envVars?.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***OCULTA***' : 'Não definida'}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Status: {envVars?.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Definida' : '❌ Não definida'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Todas as Variáveis NEXT_PUBLIC_</h2>
          <ul className="space-y-2">
            {envVars?.allEnvVars?.map((key: string) => (
              <li key={key} className="font-mono text-sm">
                {key}: {process.env[key] ? '✅ Definida' : '❌ Não definida'}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Debug - process.env</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(envVars?.processEnv, null, 2)}
          </pre>
        </div>

        <div className="mt-6">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
} 