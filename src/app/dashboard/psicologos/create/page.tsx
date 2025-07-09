'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = "psicologos";

interface Psicologo {
  id: string;
  nome: string;
  email: string;
  dataRegisto: string;
  password: string;
}

function savePsicologo(psicologo: Psicologo) {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(STORAGE_KEY);
  const arr = data ? JSON.parse(data) : [];
  arr.push(psicologo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

const CreatePsicologoPage = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!nome || !email || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const novoPsicologo: Psicologo = {
        id: Date.now().toString(),
        nome,
        email,
        dataRegisto: new Date().toISOString().slice(0, 10),
        password,
      };
      savePsicologo(novoPsicologo);
      setSuccess('Perfil criado com sucesso!');
      setTimeout(() => {
        router.push('/dashboard/psicologos');
      }, 800);
    } catch {
      setError('Erro ao criar perfil.');
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
            <label className="block font-semibold mb-1 text-gray-800">Nome</label>
            <span className="block text-xs text-gray-500 mb-1">Insira o nome completo do(a) psicólogo(a)</span>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              placeholder="Dr(a). Nome completo"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-800">Email</label>
            <span className="block text-xs text-gray-500 mb-1">Insira o email do(a) psicólogo(a)</span>
            <input
              type="email"
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              placeholder="exemplo@mail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-800">Password</label>
            <span className="block text-xs text-gray-500 mb-1">Escolha uma palavra-passe para a conta do psicólogo</span>
            <input
              type="password"
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              placeholder="palavra-passe123"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-gray-800">Confirmar Password</label>
            <span className="block text-xs text-gray-500 mb-1">Digite a palavra-passe novamente</span>
            <input
              type="password"
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
              placeholder="palavra-passe123"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-black text-white px-8 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePsicologoPage; 