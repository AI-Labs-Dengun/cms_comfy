'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const CreatePsicologoPage = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const router = useRouter();

  // Função para gerar password aleatória de até 5 dígitos
  const generateRandomPassword = () => {
    // Caracteres disponíveis: números e letras (maiúsculas e minúsculas)
    const numbers = '0123456789';
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Combinar números e letras
    const allChars = numbers + letters;
    
    let password = '';
    
    // Gerar 5 caracteres aleatórios
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * allChars.length);
      password += allChars[randomIndex];
    }
    
    return password;
  };

  // Gerar password inicial quando o componente carrega
  useEffect(() => {
    setPassword(generateRandomPassword());
  }, []);

  // Reset do estado de passwordCopied quando a password muda
  useEffect(() => {
    setPasswordCopied(false);
  }, [password]);

  const handleGenerateNewPassword = () => {
    setPassword(generateRandomPassword());
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setPasswordCopied(true);
      
      // Reset do estado após 3 segundos
      setTimeout(() => {
        setPasswordCopied(false);
      }, 3000);
    } catch (err) {
      console.error('Erro ao copiar password:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!nome || !email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 5) {
      setError('A palavra-passe deve ter pelo menos 5 caracteres.');
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um email válido.');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Obter o usuário logado atual (que deve ter role CMS)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError('Usuário não autenticado. Faça login novamente.');
        setLoading(false);
        return;
      }

      console.log('👤 Criando psicólogo com usuário CMS:', user.email);

      // 2. Criar psicólogo usando apenas a função SQL (sem afetar sessão atual)
      console.log('🚀 Chamando função create_psicologo...');
      
      const { data: profileResult, error: profileError } = await supabase
        .rpc('create_psicologo', {
          created_by_id: user.id,
          psicologo_name: nome,
          psicologo_username: email.split('@')[0],
          psicologo_guardian_email: email,
          psicologo_avatar_path: '/default-avatar.png'
        });

      console.log('📊 Resultado BRUTO da função:', { profileResult, profileError });
      console.log('🔍 Tipo do resultado:', typeof profileResult);
      console.log('🔍 Resultado é null?', profileResult === null);
      console.log('🔍 Resultado é undefined?', profileResult === undefined);
      console.log('🔍 Resultado stringificado:', JSON.stringify(profileResult));

      if (profileError) {
        console.error('❌ Erro na função RPC:', profileError);
        setError('Erro ao criar psicólogo: ' + profileError.message);
        setLoading(false);
        return;
      }

      // Verificar se resultado é válido
      if (!profileResult) {
        console.error('❌ Função retornou resultado nulo ou undefined');
        console.log('🔄 Tentando função alternativa...');
        
        // FALLBACK: Tentar função alternativa
        try {
          const { data: fallbackResult, error: fallbackError } = await supabase
            .rpc('create_psicologo_alt', {
              created_by_id: user.id,
              psicologo_name: nome,
              psicologo_username: email.split('@')[0],
              psicologo_guardian_email: email,
              psicologo_avatar_path: '/default-avatar.png'
            });

          console.log('🔄 Resultado da função alternativa:', fallbackResult);

          if (fallbackError) {
            console.error('❌ Função alternativa também falhou:', fallbackError);
            setError('Erro: Ambas as funções falharam. Verifique as permissões no database.sql');
            setLoading(false);
            return;
          }

          if (fallbackResult?.success) {
            console.log('✅ Função alternativa funcionou!');
            
            setSuccess(`Psicólogo "${nome}" criado com sucesso! Email: ${email} (senha: ${password}). Redirecionando em 2 segundos...`);
            setLoading(false);
            
            // Reset do formulário
            setNome('');
            setEmail('');
            setPassword(generateRandomPassword());
            
            // Redirecionar para a página de gerenciamento após 2 segundos
            console.log('🔄 Redirecionando para página de gerenciamento (fallback)...');
            setTimeout(() => {
              console.log('🚀 Executando redirecionamento (fallback)...');
              router.push('/dashboard/psicologos');
            }, 2000);
            return;
          } else {
            console.error('❌ Função alternativa retornou erro:', fallbackResult);
            setError('Erro na função alternativa: ' + (fallbackResult?.error || 'Erro desconhecido'));
            setLoading(false);
            return;
          }
        } catch (fallbackException) {
          console.error('❌ Exceção na função alternativa:', fallbackException);
          setError('Erro: Execute o debug_user.sql no Supabase para diagnosticar o problema');
          setLoading(false);
          return;
        }
      }

      // Validações da função principal (se chegou até aqui, profileResult não é null)
      if (typeof profileResult !== 'object') {
        console.error('❌ Função principal retornou tipo inválido:', typeof profileResult);
        setError('Erro: Função retornou tipo inválido: ' + typeof profileResult);
        setLoading(false);
        return;
      }

      if (!profileResult.hasOwnProperty('success')) {
        console.error('❌ Função principal retornou objeto sem propriedade success:', profileResult);
        setError('Erro: Resposta da função inválida - sem propriedade success');
        setLoading(false);
        return;
      }

      if (!profileResult?.success) {
        console.error('❌ Função principal retornou erro:', profileResult);
        const errorMsg = profileResult?.error || 'Erro desconhecido';
        setError('Erro ao criar psicólogo: ' + errorMsg);
        setLoading(false);
        return;
      }

      console.log('✅ Psicólogo criado com sucesso!', profileResult);
       
      setSuccess(`Psicólogo "${nome}" criado com sucesso! Email: ${email} (senha: ${password}). Redirecionando em 2 segundos...`);
      
      // Reset do formulário
      setNome('');
      setEmail('');
      setPassword(generateRandomPassword());
      setLoading(false);

      // 3. Redirecionar para a página de gerenciamento após 2 segundos
      console.log('🔄 Redirecionando para página de gerenciamento...');
      setTimeout(() => {
        console.log('🚀 Executando redirecionamento...');
        router.push('/dashboard/psicologos');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erro inesperado ao criar psicólogo:', error);
      setError('Erro interno do servidor: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-xl p-8 bg-white rounded shadow-md mt-10">
        <h2 className="text-sm text-gray-500 mb-2">Novo Psicólogo</h2>
        <h1 className="text-2xl font-bold mb-8 text-gray-900">Adicionar um Novo Perfil de Psicólogo</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-semibold mb-1 text-gray-800">Nome Completo *</label>
            <span className="block text-xs text-gray-500 mb-1">Insira o nome completo do(a) psicólogo(a)</span>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              placeholder="Dr(a). Nome completo"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-gray-800">Email *</label>
            <span className="block text-xs text-gray-500 mb-1">Email do psicólogo (será usado para login na aplicação)</span>
            <input
              type="email"
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              placeholder="psicologo@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-gray-800">Password Gerada *</label>
            <span className="block text-xs text-gray-500 mb-1">Password aleatória de 5 caracteres (números e letras) gerada automaticamente</span>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black font-mono text-lg"
                value={password}
                readOnly
                required
              />
              <button
                type="button"
                onClick={handleCopyPassword}
                className={`px-4 py-2 rounded transition-colors text-sm ${
                  passwordCopied 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
                disabled={loading}
              >
                {passwordCopied ? '✅ Copiado' : '📋 Copiar'}
              </button>
              <button
                type="button"
                onClick={handleGenerateNewPassword}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors text-sm"
                disabled={loading}
              >
                🔄 Nova
              </button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="text-sm font-semibold text-blue-800 mb-1">📝 Informação Importante</h3>
            <p className="text-xs text-blue-700">
              O psicólogo terá credenciais de login reais e poderá acessar outras aplicações do sistema.
              A password é gerada automaticamente com 5 caracteres (números e letras) e é de utilização única.
              Após o psicólogo entrar na sua conta pela primeira vez, ele poderá alterar a password.
              Guarde as credenciais com segurança.
            </p>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded border border-red-200">
              <strong>Erro:</strong> {error}
            </div>
          )}
          
          {success && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded border border-green-200">
              <strong>Sucesso:</strong> {success}
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-black text-white px-8 py-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar Psicólogo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePsicologoPage; 