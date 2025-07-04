"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";

export default function DetalhesConteudo() {
  const router = useRouter();
  // Mock data for demonstration
  const data = {
    titulo: "Vídeo de Receita de Bolo de Chocolate",
    descricao: "Um vídeo detalhado mostrando como fazer um delicioso bolo de chocolate do zero.",
    ficheiro: "bolo_chocolate.mp4",
    visualizacoes: 301,
    dataUpload: "15 de Julho, 2024",
    categoria: "Vídeos",
    tags: ["Culinária", "Bolo"],
    emocao: ["Alegria"],
    imagem: "/public/cake.jpg", // Replace with your image path
  };

  const handleDelete = () => {
    // In a real app, you would delete from the backend or state
    // For now, just redirect to dashboard
    router.push('/dashboard');
  };

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
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium bg-black text-white cursor-pointer`}
              onClick={() => router.push('/dashboard/management')}
            >
              <ArrowRight className="w-4 h-4 mr-1" />
              Gerir Conteúdo
            </button>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center py-12 px-8 overflow-y-auto">
          <div className="w-full max-w-4xl flex flex-col items-center relative">
            {/* Back Button */}
            <button
              onClick={() => router.push('/dashboard/management')}
              className="absolute top-0 left-0 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-medium shadow cursor-pointer"
            >
              Back
            </button>
            {/* Title */}
            <div className="mb-2 w-full text-center">
              <h1 className="text-2xl font-bold mb-1 text-gray-900 text-center" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>Detalhes do Conteúdo</h1>
              <div className="text-sm text-gray-500 mb-6 font-medium">Visualize e gerencie os detalhes do conteúdo selecionado.</div>
            </div>
            {/* Info Section */}
            <div className="mb-8">
              <div className="font-bold text-gray-900 mb-4 text-lg">Informações do Conteúdo</div>
              <div className="mb-2">
                <div className="text-xs text-gray-500 font-bold">Título</div>
                <div className="text-gray-900 font-bold whitespace-pre-line">{data.titulo}</div>
              </div>
              <div className="mb-2">
                <div className="text-xs text-gray-500 font-bold">Descrição</div>
                <div className="text-gray-900 font-medium">{data.descricao}</div>
              </div>
              <div className="my-6 border-b border-gray-200" />
              <div className="flex flex-row gap-8 mb-4">
                <div>
                  <div className="text-xs text-gray-500 font-bold">Ficheiro</div>
                  <div className="text-gray-900 font-medium">{data.ficheiro}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-bold">Data de Upload</div>
                  <div className="text-gray-900 font-medium">{data.dataUpload}</div>
                </div>
              </div>
              <div className="my-6 border-b border-gray-200" />
              <div className="mb-4">
                <div className="text-xs text-gray-500 font-bold">Categoria</div>
                <div className="inline-block bg-gray-100 text-gray-900 rounded px-3 py-1 text-sm font-medium mt-1">{data.categoria}</div>
              </div>
              <div className="mb-4">
                <div className="text-xs text-gray-500 font-bold">Tags</div>
                <div className="flex flex-row gap-2 mt-1">
                  {data.tags.map((tag, idx) => (
                    <span key={idx} className="inline-block bg-gray-100 text-gray-900 rounded px-3 py-1 text-sm font-medium">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <div className="text-xs text-gray-500 font-bold">Tags de Emoção</div>
                <div className="flex flex-row gap-2 mt-1">
                  {data.emocao.map((emo, idx) => (
                    <span key={idx} className="inline-block bg-gray-100 text-gray-900 rounded px-3 py-1 text-sm font-medium">{emo}</span>
                  ))}
                </div>
              </div>
              <button onClick={handleDelete} className="mt-8 bg-black text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-800 transition-colors cursor-pointer mx-auto block">Eliminar Conteúdo</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 