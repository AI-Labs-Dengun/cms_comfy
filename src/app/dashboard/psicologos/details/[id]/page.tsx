"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Eye } from "lucide-react";

// Mock de dados
const MOCK_PSICOLOGO = {
  id: "1",
  nome: "Dra. Maria Solstício Noventagraus",
  dataRegisto: "2025-06-19T14:35:00",
  email: "exemplo@mail.com",
  password: "password123",
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getDate().toString().padStart(2, "0")} ${date.toLocaleString("pt-PT", { month: "long" })} ${date.getFullYear()} - ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}h`;
}

export default function PsicologoDetailsPage() {
  const router = useRouter();
  // TODO: Implementar busca do psicólogo pelo id quando conectar com backend
  // const { id } = useParams();
  // const psicologo = await buscarPsicologoPorId(id);
  const [nome, setNome] = useState(MOCK_PSICOLOGO.nome);
  const [email, setEmail] = useState(MOCK_PSICOLOGO.email);
  const [passwordVisible, setPasswordVisible] = useState(false);

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
        <span className="text-gray-700 font-medium">{nome}</span>
      </div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">{nome}</h1>
      <div className="mb-8">
        <div className="mb-4">
          <div className="font-semibold text-gray-800">Data de Registo</div>
          <div className="text-gray-500 text-sm">{formatDate(MOCK_PSICOLOGO.dataRegisto)}</div>
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1 text-gray-800">Nome</label>
          <span className="block text-xs text-gray-500 mb-1">Visualize e atualize nome completo do(a) psicólogo(a)</span>
          <div className="relative">
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black pr-10"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Dr(a). Nome completo"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
              <Pencil className="w-4 h-4" />
            </span>
          </div>
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1 text-gray-800">Email</label>
          <span className="block text-xs text-gray-500 mb-1">Visualize e atualize o email do(a) psicólogo(a)</span>
          <div className="relative">
            <input
              type="email"
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black pr-10"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemplo@mail.com"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
              <Pencil className="w-4 h-4" />
            </span>
          </div>
        </div>
        <div className="mb-8">
          <label className="block font-semibold mb-1 text-gray-800">Palavra Passe</label>
          <span className="block text-xs text-gray-500 mb-1">Visualize e atualize a palavra passe do psicólogo(a)</span>
          <div className="relative">
            <input
              type={passwordVisible ? "text" : "password"}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-black pr-10"
              value={MOCK_PSICOLOGO.password}
              readOnly
              placeholder="**********************"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
              onClick={() => setPasswordVisible(v => !v)}
            >
              <Eye className="w-4 h-4" />
            </span>
          </div>
        </div>
        <div className="flex gap-4">
          <button className="bg-black text-white px-6 py-2 rounded font-semibold hover:bg-gray-800 transition-colors">
            Alterar Palavra-Passe
          </button>
          <button className="bg-red-600 text-white px-6 py-2 rounded font-semibold hover:bg-red-700 transition-colors">
            Eliminar Perfil
          </button>
        </div>
      </div>
    </div>
  );
} 