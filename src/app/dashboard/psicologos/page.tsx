"use client";
import React, { useState, useEffect } from "react";
import { Search, User, Mail, Calendar, Shield, ChevronRight } from "lucide-react";
import { useRouter } from 'next/navigation';
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
  user_role: string;
  updated_at?: string;
}

export default function GerirPsicologosPage() {
  const [search, setSearch] = useState("");
  const [psicologos, setPsicologos] = useState<Psicologo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchPsicologos();
  }, []);

  const fetchPsicologos = async () => {
    try {
      setLoading(true);
      console.log('🔍 Buscando psicólogos com roles "psicologo" e "psicologos"...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_role', ['psicologo', 'psicologos'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar psicólogos:', error);
        setError('Erro ao carregar psicólogos: ' + error.message);
        return;
      }

      console.log('✅ Psicólogos encontrados:', data?.length || 0);
      console.log('📊 Dados dos psicólogos:', data);
      setPsicologos(data || []);
    } catch (err) {
      console.error('Erro ao buscar psicólogos:', err);
      setError('Erro ao carregar psicólogos');
    } finally {
      setLoading(false);
    }
  };

  const filtered = psicologos.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.guardian_email.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const StatusBadge = ({ authorized }: { authorized?: boolean }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      authorized === true 
        ? 'bg-green-100 text-green-800' 
        : authorized === false 
        ? 'bg-red-100 text-red-800' 
        : 'bg-yellow-100 text-yellow-800'
    }`}>
      {authorized === true ? '✅ Autorizado' : authorized === false ? '❌ Rejeitado' : '⏳ Pendente'}
    </span>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h2 className="text-sm text-gray-500 mb-2">Gerir Psicólogos</h2>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">Gestor de Perfis dos Psicólogos</h1>
          <p className="text-gray-400 text-sm">
            Monitorize e edite detalhes relativos aos perfis dos psicólogos registados
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/psicologos/create')}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          + Novo Psicólogo
        </button>
      </div>
      
      <div className="mb-6 flex items-center gap-2">
        <div className="relative w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-4 py-2 pl-10 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            placeholder="Pesquise por nome ou email de psicólogo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">Carregando psicólogos...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400">
            {search ? 'Nenhum psicólogo encontrado com essa pesquisa.' : 'Nenhum psicólogo registado ainda.'}
          </div>
        </div>
      ) : (
        <>
          {/* Vista em cards para mobile */}
          <div className="block lg:hidden space-y-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/psicologos/details/${p.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      <p className="text-sm text-gray-500">@{p.username}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{p.guardian_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(p.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <StatusBadge authorized={p.authorized} />
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Shield className="w-3 h-3" />
                    <span>Psicólogo</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vista em tabela para desktop */}
          <div className="hidden lg:block bg-white rounded border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-3 font-semibold text-gray-700">Nome</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">Username</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 font-semibold text-gray-700">Data de Registo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/psicologos/details/${p.id}`)}
                  >
                    <td className="px-6 py-4 text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 text-gray-700">{p.guardian_email}</td>
                    <td className="px-6 py-4 text-gray-700">{p.username}</td>
                    <td className="px-6 py-4">
                      <StatusBadge authorized={p.authorized} />
                    </td>
                    <td className="px-6 py-4 text-gray-700">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
} 