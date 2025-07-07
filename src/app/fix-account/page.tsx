"use client";

import { useState } from 'react';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { AuthService } from '@/services/auth';
import { AuthResponse } from '@/types/auth';

interface AccountInfo {
  user: {
    id: string;
    email: string;
    confirmed_at?: string;
    created_at: string;
  };
  profile: {
    id: string;
    user_role: 'app' | 'cms';
    authorized: boolean | null;
    name?: string;
    username?: string;
    [key: string]: unknown;
  } | null;
  rpcResult: AuthResponse;
}

export default function FixAccountPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

  const checkAccount = async () => {
    if (!email) {
      setStatus('❌ Por favor, insira um email');
      return;
    }

    setLoading(true);
    setStatus('🔍 Verificando conta...');

    try {
      // 1. Primeiro buscar o perfil pelo email (guardian_email)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('guardian_email', email)
        .single();

      if (profileError) {
        setStatus('❌ Perfil não encontrado na tabela profiles');
        setLoading(false);
        return;
      }

      // 2. Verificar RPC function
      const rpcResult = await AuthService.canUserLoginWithRole(email, 'cms');

      setAccountInfo({
        user: {
          id: profile.id,
          email: email,
          confirmed_at: undefined,
          created_at: profile.created_at
        },
        profile,
        rpcResult
      });

      // Análise do estado
      if (profile.user_role !== 'cms') {
        setStatus('⚠️ Conta encontrada mas role não é CMS');
      } else if (profile.authorized !== true) {
        setStatus('⚠️ Conta encontrada mas não está autorizada');
      } else if (!rpcResult.success) {
        setStatus('⚠️ Conta CMS autorizada mas RPC falha');
      } else {
        setStatus('✅ Conta está correta');
      }

    } catch (error) {
      console.error('Erro ao verificar:', error);
      setStatus('❌ Erro ao verificar conta');
    } finally {
      setLoading(false);
    }
  };

  const fixAccount = async () => {
    if (!email || !accountInfo) {
      setStatus('❌ Primeiro verifique a conta');
      return;
    }

    setLoading(true);
    setStatus('🔧 Corrigindo conta...');

    try {
      const userId = accountInfo.user.id;

      // Atualizar perfil para CMS autorizado
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          user_role: 'cms',
          authorized: true,
          authorized_at: new Date().toISOString(),
          authorized_by: 'fix-script'
        })
        .eq('id', userId);

      if (updateError) {
        setStatus('❌ Erro ao atualizar perfil: ' + updateError.message);
        setLoading(false);
        return;
      }

      // Verificar novamente
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
      await checkAccount();

      setStatus('✅ Conta corrigida com sucesso!');
    } catch (error) {
      console.error('Erro ao corrigir:', error);
      setStatus('❌ Erro ao corrigir conta');
    } finally {
      setLoading(false);
    }
  };

  const createCMSAccount = async () => {
    if (!email) {
      setStatus('❌ Por favor, insira um email');
      return;
    }

    setLoading(true);
    setStatus('👤 Criando conta CMS...');

    try {
      // Usar o método de signup do AuthService
      const password = prompt('Digite a senha para a nova conta:');
      if (!password) {
        setStatus('❌ Senha necessária');
        setLoading(false);
        return;
      }

      const name = prompt('Digite o nome para a conta:') || email.split('@')[0];

      const result = await AuthService.signupCMS(name, email, password);

      if (result.success) {
        setStatus('✅ Conta CMS criada com sucesso!');
        await checkAccount();
      } else {
        setStatus('❌ Erro ao criar conta: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      setStatus('❌ Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">🔧 Corrigir Conta CMS</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Email da conta:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="usuario@exemplo.com"
          />
        </div>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={checkAccount}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Verificar Conta'}
          </button>
          
          {accountInfo && (
            <button
              onClick={fixAccount}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Corrigindo...' : 'Corrigir Conta'}
            </button>
          )}
          
          <button
            onClick={createCMSAccount}
            disabled={loading}
            className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Conta CMS'}
          </button>
        </div>
        
        {status && (
          <div className="mb-4 p-3 bg-gray-100 rounded">
            <p className="font-medium">{status}</p>
          </div>
        )}
      </div>

      {accountInfo && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">📊 Informações da Conta</h2>
          
          <div className="grid gap-4">
            <div>
              <h3 className="font-medium mb-2">👤 Usuário (auth.users)</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(accountInfo.user, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">📝 Perfil (profiles)</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(accountInfo.profile, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">🔐 Verificação RPC</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(accountInfo.rpcResult, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded mr-4">
          Voltar ao Login
        </a>
        <a href="/debug" className="bg-gray-500 text-white px-4 py-2 rounded">
          Ver Debug
        </a>
      </div>
    </div>
  );
} 