"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Pencil, Eye, Save, X, Key, Trash2 } from "lucide-react";
import { supabase } from '@/lib/supabase';

interface Psicologo {
  id: string;
  name: string;
  username: string;
  guardian_email: string;
  created_at: string;
  avatar_path?: string;
  authorized?: boolean;
  authorized_at?: string;
  authorized_by?: string;
  birth_date?: string;
  gender?: string;
  postal_code?: string;
  user_role: string;
  updated_at?: string;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getDate().toString().padStart(2, "0")} ${date.toLocaleString("pt-PT", { month: "long" })} ${date.getFullYear()} - ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}h`;
}

export default function PsicologoDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [psicologo, setPsicologo] = useState<Psicologo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Campos editáveis
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Função para calcular força da senha
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let score = 0;
    const checks = {
      length: password.length >= 6,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      longEnough: password.length >= 8,
      notSimple: !['123456', 'password', 'qwerty', '123456789', '12345678'].includes(password.toLowerCase())
    };

    // Pontuação básica
    score += checks.length ? 1 : 0; // Mínimo 6 caracteres
    score += checks.longEnough ? 1 : 0; // 8+ caracteres
    score += checks.notSimple ? 1 : 0; // Não é senha comum
    
    // Bonus por diversidade de caracteres
    score += checks.hasLetter ? 1 : 0;
    score += checks.hasNumber ? 1 : 0;
    score += checks.hasSpecial ? 1 : 0;

    if (score <= 2) return { strength: score, label: 'Muito Fraca', color: 'bg-red-500' };
    if (score <= 3) return { strength: score, label: 'Fraca', color: 'bg-orange-500' };
    if (score <= 4) return { strength: score, label: 'Média', color: 'bg-yellow-500' };
    if (score <= 5) return { strength: score, label: 'Forte', color: 'bg-green-500' };
    return { strength: score, label: 'Muito Forte', color: 'bg-green-600' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  useEffect(() => {
    if (id) {
      fetchPsicologo();
    }
  }, [id]);

  const fetchPsicologo = async () => {
    try {
      setLoading(true);
      console.log('🔍 Buscando psicólogo com ID:', id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .in('user_role', ['psicologo', 'psicologos'])
        .single();

      if (error) {
        console.error('❌ Erro ao buscar psicólogo:', error);
        console.error('❌ Detalhes do erro:', error.message, error.details, error.hint);
        setError('Erro ao carregar dados do psicólogo: ' + error.message);
        return;
      }

      if (!data) {
        console.error('❌ Psicólogo não encontrado com ID:', id);
        setError('Psicólogo não encontrado');
        return;
      }

      console.log('✅ Psicólogo encontrado:', data);
      setPsicologo(data);
      setName(data.name || "");
      setUsername(data.username || "");
      setGuardianEmail(data.guardian_email || "");
    } catch (err) {
      console.error('Erro ao buscar psicólogo:', err);
      setError('Erro ao carregar dados do psicólogo');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!psicologo) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          username,
          guardian_email: guardianEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar psicólogo:', error);
        setError('Erro ao salvar alterações');
        return;
      }

      setPsicologo(prev => prev ? { ...prev, name, username, guardian_email: guardianEmail } : null);
      setEditing(false);
      setError("");
    } catch (err) {
      console.error('Erro ao atualizar psicólogo:', err);
      setError('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!psicologo || !confirm('Tem certeza que deseja eliminar este psicólogo? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setSaving(true);
      
      // Obter usuário atual para validação
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuário não autenticado');
        return;
      }

      // Chamar função SQL de deleção segura
      const { data, error } = await supabase.rpc('delete_psicologo', {
        psicologo_id_param: id,
        deleted_by_id: user.id
      });

      if (error) {
        console.error('Erro RPC ao eliminar psicólogo:', error);
        setError(`Erro ao eliminar psicólogo: ${error.message}`);
        return;
      }

      if (!data.success) {
        console.error('Erro na função de deleção:', data.error);
        setError(data.error);
        return;
      }

      console.log('Psicólogo eliminado:', data);
      router.push('/dashboard/psicologos');
    } catch (err) {
      console.error('Erro ao eliminar psicólogo:', err);
      setError('Erro inesperado ao eliminar psicólogo');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!psicologo) return;

    // Validações de senha mais rigorosas
    if (!newPassword || !confirmPassword) {
      setError('❌ Preencha todos os campos de senha');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('❌ As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('❌ A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword.length > 72) {
      setError('❌ A senha deve ter no máximo 72 caracteres');
      return;
    }

    // Senha pode ser só números se o usuário quiser

    // Verificar se não é muito simples
    const simplePasswords = ['123456', 'password', 'qwerty', '123456789', '12345678', '12345', '1234567', 'admin', 'test'];
    if (simplePasswords.includes(newPassword.toLowerCase())) {
      setError('❌ Esta senha é muito simples. Escolha uma senha mais segura');
      return;
    }

    try {
      setSaving(true);
      
      // Obter usuário atual para validação
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuário não autenticado');
        return;
      }

      // Primeiro validar através da função SQL
      const { data: validationData, error: validationError } = await supabase.rpc('validate_psicologo_password_change', {
        psicologo_id_param: id,
        new_password: newPassword,
        changed_by_id: user.id
      });

      if (validationError) {
        console.error('Erro na validação de senha:', validationError);
        setError(`Erro na validação: ${validationError.message}`);
        return;
      }

      if (!validationData.success) {
        console.error('Erro na validação:', validationData.error);
        setError(validationData.error);
        return;
      }

      // Obter token do usuário atual para autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Erro de autenticação. Faça login novamente.');
        return;
      }

      // Usar função SQL para alterar senha
      const response = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_id: id,
          new_password: newPassword
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Erro ao alterar senha via API:', result.error);
        setError(result.error || 'Erro ao alterar senha');
        return;
      }

      console.log('Senha alterada com sucesso:', result);
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      
      // Mostrar mensagem diferente se o usuário foi corrigido automaticamente
      if (result.corrected) {
        alert(`✅ Senha alterada com sucesso para ${psicologo.name}!\n\n🔧 Nota: Os dados do psicólogo foram corrigidos automaticamente durante o processo.`);
      } else {
        alert(`✅ Senha alterada com sucesso para ${psicologo.name}!`);
      }

    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      setError('Erro inesperado ao alterar senha');
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  if (error && !psicologo) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="text-red-600 bg-red-50 p-4 rounded">{error}</div>
        <button 
          onClick={() => router.push('/dashboard/psicologos')}
          className="mt-4 bg-black text-white px-4 py-2 rounded"
        >
          Voltar à Lista
        </button>
      </div>
    );
  }

  if (!psicologo) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="text-center">Psicólogo não encontrado</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="mb-4 text-sm text-gray-500">
        <span
          className="cursor-pointer hover:underline"
          onClick={() => router.push('/dashboard/psicologos')}
        >
          Gerir Psicólogos
        </span>
        <span className="mx-1">/</span>
        <span className="text-gray-700 font-medium">{psicologo.name}</span>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{psicologo.name}</h1>
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setName(psicologo.name || "");
                setUsername(psicologo.username || "");
                setGuardianEmail(psicologo.guardian_email || "");
                setNewPassword("");
                setConfirmPassword("");
                setError("");
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded font-semibold hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>

          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">
          {error}
        </div>
      )}

      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <div className="font-semibold text-gray-800">Data de Registo</div>
            <div className="text-gray-500 text-sm">{formatDate(psicologo.created_at)}</div>
          </div>
          
          <div>
            <div className="font-semibold text-gray-800">Status</div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              psicologo.authorized === true 
                ? 'bg-green-100 text-green-800' 
                : psicologo.authorized === false 
                ? 'bg-red-100 text-red-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {psicologo.authorized === true ? '✅ Autorizado' : psicologo.authorized === false ? '❌ Rejeitado' : '⏳ Pendente'}
            </span>
          </div>
          
          <div>
            <div className="font-semibold text-gray-800">Tipo de Conta</div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              👨‍⚕️ {psicologo.user_role === 'psicologo' ? 'Psicólogo' : 'Psicólogos'}
            </span>
          </div>
          
          {psicologo.authorized_at && (
            <div>
              <div className="font-semibold text-gray-800">Autorizado em</div>
              <div className="text-gray-500 text-sm">{formatDate(psicologo.authorized_at)}</div>
              {psicologo.authorized_by && (
                <div className="text-gray-400 text-xs">por {psicologo.authorized_by}</div>
              )}
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block font-semibold mb-1 text-gray-800">Nome</label>
          <span className="block text-xs text-gray-500 mb-1">Nome completo do(a) psicólogo(a)</span>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Dr(a). Nome completo"
            disabled={!editing}
          />
        </div>
        
        <div className="mb-4">
          <label className="block font-semibold mb-1 text-gray-800">Username</label>
          <span className="block text-xs text-gray-500 mb-1">Nome de utilizador único</span>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="username"
            disabled={!editing}
          />
        </div>
        
        <div className="mb-4">
          <label className="block font-semibold mb-1 text-gray-800">Email</label>
          <span className="block text-xs text-gray-500 mb-1">Email de contacto</span>
          <input
            type="email"
            className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            value={guardianEmail}
            onChange={e => setGuardianEmail(e.target.value)}
            placeholder="exemplo@mail.com"
            disabled={!editing}
          />
        </div>

        {/* Seção de Alteração de Senha - Apenas no Modo de Edição */}
        {editing && (
          <div className="border-t pt-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🔑 Alterar Senha de Login
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                💡 <strong>Importante:</strong> Esta é a senha que o psicólogo usará para fazer login na aplicação.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-800">Nova Senha</label>
                                          <span className="block text-xs text-gray-500 mb-1">Mínimo 6 caracteres</span>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Nova senha"
                />
                
                {/* Indicador de Força da Senha */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.strength <= 2 ? 'text-red-600' : 
                        passwordStrength.strength <= 3 ? 'text-orange-600' :
                        passwordStrength.strength <= 4 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      💡 Para uma senha forte: use letras, números e símbolos especiais
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block font-semibold mb-1 text-gray-800">Confirmar Senha</label>
                <span className="block text-xs text-gray-500 mb-1">Repita a nova senha</span>
                <input
                  type="password"
                  className={`w-full border rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-blue-500 ${
                    confirmPassword && newPassword && confirmPassword !== newPassword 
                      ? 'border-red-300 focus:ring-red-500' 
                      : confirmPassword && newPassword && confirmPassword === newPassword
                      ? 'border-green-300 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar senha"
                />
                
                {/* Indicador de Confirmação */}
                {confirmPassword && (
                  <div className="mt-2 text-xs">
                    {newPassword === confirmPassword ? (
                      <span className="text-green-600 flex items-center gap-1">
                        ✅ Senhas coincidem
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        ❌ Senhas não coincidem
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={handlePasswordChange}
                disabled={saving || !newPassword || !confirmPassword}
                className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                {saving ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </div>
          </div>
        )}
        

        
        {/* Seção de Ações Perigosas */}
        <div className="border-t pt-6 mt-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            ⚠️ Zona de Perigo
          </h2>
          <div className="bg-red-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-red-700">
              <strong>Atenção:</strong> Esta ação não pode ser desfeita. O psicólogo será removido permanentemente do sistema.
            </p>
          </div>
          
          <div className="flex gap-4">
            {!editing && (
              <button 
                onClick={handleDelete}
                disabled={saving}
                className="bg-red-600 text-white px-6 py-2 rounded font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {saving ? 'Eliminando...' : 'Eliminar Psicólogo'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 