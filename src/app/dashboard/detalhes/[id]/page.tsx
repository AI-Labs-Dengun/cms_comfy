"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
        <aside className="w-64 bg-white border-r flex flex-col py-8 px-6 min-h-full">
          <div className="mb-12 flex flex-col items-center justify-center">
            <img src="/cms-logo.png" alt="Comfy Content Hub Logo" className="mb-2 w-28 h-auto" />
          </div>
          <nav className="flex flex-col gap-2">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-gray-900 hover:bg-gray-100"
              onClick={() => router.push('/dashboard')}
            >
              <span className="h-2 w-2 rounded-full bg-white mr-2" /> Novo Conteúdo
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium bg-black text-white"
              onClick={() => router.push('/dashboard')}
            >
              <span className="h-2 w-2 rounded-full border border-gray-400 mr-2" /> Gerir Conteúdo
            </button>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center py-12 px-8 overflow-y-auto">
          <div className="w-full max-w-4xl">
            {/* Breadcrumb */}
            <div className="text-xs text-gray-400 mb-2 font-medium">
              <span className="cursor-pointer text-gray-400 hover:text-gray-900" onClick={() => router.push('/dashboard')}>Conteúdo</span>
              <span> / </span>
              <span className="text-gray-500">Detalhes do Conteúdo</span>
            </div>
            {/* Title and Image */}
            <div className="flex flex-row justify-between items-start mb-2">
              <div>
                <h1 className="text-2xl font-bold mb-1 text-gray-900" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>Detalhes do Conteúdo</h1>
                <div className="text-sm text-gray-500 mb-6 font-medium">Visualize e gerencie os detalhes do conteúdo selecionado.</div>
              </div>
              <img src="/cake.jpg" alt="Bolo de Chocolate" className="rounded-lg object-cover w-60 h-36 ml-8" />
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
                  <div className="text-xs text-gray-500 font-bold">Visualizações</div>
                  <div className="text-gray-900 font-medium">{data.visualizacoes}</div>
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
              <button onClick={handleDelete} className="mt-8 bg-black text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-800 transition-colors">Eliminar Conteúdo</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 