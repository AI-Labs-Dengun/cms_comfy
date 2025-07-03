"use client";

import React from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";

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
    // For now, just redirect to create page
    router.push('/dashboard/create');
  };

  return (
    <CMSLayout>
      <div className="flex flex-col items-center justify-center py-12 px-8">
        <div className="w-full max-w-4xl flex flex-col items-center relative">
          {/* Back Button */}
          <button
            onClick={() => router.push('/dashboard/create')}
            className="absolute top-0 left-0 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-medium shadow cursor-pointer"
          >
            ← Voltar
          </button>
          {/* Title */}
          <div className="mb-2 w-full text-center">
            <h1 className="text-2xl font-bold mb-1 text-gray-900 text-center" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
              Detalhes do Conteúdo
            </h1>
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
            <button 
              onClick={handleDelete} 
              className="mt-8 bg-red-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors cursor-pointer mx-auto block"
            >
              Eliminar Conteúdo
            </button>
          </div>
        </div>
      </div>
    </CMSLayout>
  );
} 