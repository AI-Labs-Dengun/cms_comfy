"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";

const mockContent: any[] = [
  {
    title: "Explorar a Amazónia",
    date: "2024-01-15",
    tags: ["Aventura", "Natureza"],
    emotions: ["Entusiasmo", "Admiração"],
  },
  {
    title: "Fotografia Urbana em Tóquio",
    date: "2024-02-20",
    tags: ["Fotografia", "Viagem"],
    emotions: ["Curiosidade", "Espanto"],
  },
  {
    title: "Culinária Italiana",
    date: "2024-03-10",
    tags: ["Comida", "Cultura"],
    emotions: ["Alegria", "Satisfação"],
  },
  {
    title: "A Arte da Caligrafia",
    date: "2024-04-05",
    tags: ["Arte", "Habilidade"],
    emotions: ["Foco", "Calma"],
  },
  {
    title: "Práticas de Vida Sustentável",
    date: "2024-05-12",
    tags: ["Ambiente", "Estilo de Vida"],
    emotions: ["Esperança", "Responsabilidade"],
  },
];

export default function Management() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Filter content by search
  const filteredContent = mockContent.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchLower) ||
      item.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
      item.emotions.some((emo: string) => emo.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex flex-1 bg-white overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r flex flex-col py-8 px-6 min-h-full shadow-2xl z-10" style={{ boxShadow: '12px 0 40px 0 rgba(0,0,0,0.18)' }}>
          <div className="mb-12 flex flex-col items-center justify-center">
            <img src="/cms-logo.png" alt="Comfy Content Hub Logo" className="mb-2 w-28 h-auto" />
          </div>
          <nav className="flex flex-col gap-2">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-gray-900 hover:bg-gray-100 cursor-pointer"
              onClick={() => router.push('/dashboard/create')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo Conteúdo
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium bg-black text-white cursor-pointer"
              onClick={() => router.push('/dashboard/management')}
            >
              <ArrowRight className="w-4 h-4 mr-1" />
              Gerir Conteúdo
            </button>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center py-12 px-8 overflow-y-auto">
          <div className="w-full max-w-4xl flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-1 text-gray-900" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>Gerir Conteúdo</h1>
            <div className="text-sm text-gray-500 mb-6 font-medium">Monitore e edite o seu conteúdo</div>
            <div className="flex items-center w-full mb-6 justify-center">
              <span className="pl-3 pr-2 text-gray-500">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.6 10.6Z"/></svg>
              </span>
              <input
                type="text"
                className="max-w-3xl w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                placeholder="Pesquise por tag, categoria ou título"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ fontFamily: 'Inter, Quicksand, sans-serif' }}
              />
            </div>
            <div className="bg-white rounded-lg shadow border overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">Título</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">Data de Upload</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">Tags</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">Tags de Emoção</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContent.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/details/${idx + 1}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{item.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{item.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                        {item.tags.join(", ")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                        {item.emotions.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 