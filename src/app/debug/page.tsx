"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/services/auth';

export default function DebugPage() {
  const { user, profile, authInfo, loading, isAuthenticated, canAccessCMS, isCMSUser, isAuthorized } = useAuth();
  const [manualCheck, setManualCheck] = useState<unknown>(null);
  const [profileFromDB, setProfileFromDB] = useState<unknown>(null);

  useEffect(() => {
    const runManualChecks = async () => {
      if (!user?.email) return;

      // 1. Verificar perfil diretamente do banco
      try {
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfileFromDB(dbProfile);
        console.log('🔍 Perfil direto do DB:', dbProfile);
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
      }

      // 2. Verificar function RPC manualmente
      try {
        const result = await AuthService.canUserLoginWithRole(user.email, 'cms');
        setManualCheck(result);
        console.log('🔍 Verificação manual RPC:', result);
      } catch (err) {
        console.error('Erro na verificação manual:', err);
      }
    };

    if (user) {
      runManualChecks();
    }
  }, [user]);

  if (loading) {
    return <div className="p-4">Carregando dados de debug...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug - Sistema de Autenticação</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Estado do AuthContext */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Estado do AuthContext</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Loading:</strong> {loading ? 'Sim' : 'Não'}</div>
              <div><strong>Authenticated:</strong> {isAuthenticated ? 'Sim' : 'Não'}</div>
              <div><strong>CMS User:</strong> {isCMSUser ? 'Sim' : 'Não'}</div>
              <div><strong>Authorized:</strong> {isAuthorized ? 'Sim' : 'Não'}</div>
              <div><strong>Can Access CMS:</strong> {canAccessCMS ? 'Sim' : 'Não'}</div>
            </div>
          </div>

          {/* Dados do User */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Dados do Usuário</h2>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          {/* Dados do Profile */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Profile do Context</h2>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>

          {/* Profile direto do DB */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Profile direto do DB</h2>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(profileFromDB, null, 2)}
            </pre>
          </div>

          {/* AuthInfo */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">AuthInfo</h2>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(authInfo, null, 2)}
            </pre>
          </div>

          {/* Verificação manual */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Verificação Manual RPC</h2>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(manualCheck, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    </div>
  );
} 