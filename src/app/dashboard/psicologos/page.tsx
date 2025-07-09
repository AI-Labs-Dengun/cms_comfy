"use client";
import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useRouter } from 'next/navigation';

const STORAGE_KEY = "psicologos";

interface Psicologo {
  id: string;
  nome: string;
  email: string;
  dataRegisto: string;
  password: string;
}

function getPsicologos(): Psicologo[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export default function GerirPsicologosPage() {
  const [search, setSearch] = useState("");
  const [psicologos, setPsicologos] = useState<Psicologo[]>([]);
  const router = useRouter();

  useEffect(() => {
    setPsicologos(getPsicologos());
  }, []);

  const filtered = psicologos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h2 className="text-sm text-gray-500 mb-2">Gerir Psicólogos</h2>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Gestor de Perfis dos Psicólogos</h1>
      <p className="text-gray-400 text-sm mb-6">
        Monitorize e edite detalhes relativos aos perfis dos psicólogos registados
      </p>
      <div className="mb-6 flex items-center gap-2">
        <div className="relative w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-4 py-2 pl-10 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            placeholder="Pesquise por nome de psicólogo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="bg-white rounded border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 font-semibold text-gray-700">Nome</th>
              <th className="px-6 py-3 font-semibold text-gray-700">Data de Registo</th>
              <th className="px-6 py-3 font-semibold text-gray-700">Email</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-center text-gray-400">
                  Nenhum psicólogo encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => (
                <tr
                  key={p.id || idx}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/psicologos/details/${p.id}`)}
                >
                  <td className="px-6 py-4 text-gray-900">{p.nome}</td>
                  <td className="px-6 py-4 text-gray-700">{p.dataRegisto}</td>
                  <td className="px-6 py-4 text-gray-700">{p.email}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 