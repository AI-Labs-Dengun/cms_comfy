"use client";

import React, { useState } from "react";
import { CloudUpload } from "lucide-react";
import CMSLayout from "@/components/CMSLayout";

const emotionTags = [
  "Raiva",
  "Alegria",
  "Inveja",
  "Medo",
  "Tristeza",
];

export default function CreateContent() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Vídeo");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleEmotionChange = (emotion: string) => {
    setEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    // TODO: Implement upload logic
    setTimeout(() => {
      setIsUploading(false);
      alert("Conteúdo enviado!");
    }, 1000);
  };

  // Função para adicionar tag
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <CMSLayout currentPage="create">
      <div className="flex flex-col items-center py-12 px-8">
        <div className="w-full max-w-xl">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 text-center" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
            Adicionar Novo Conteúdo
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Categoria - agora em primeiro lugar */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Categoria</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Vídeo">Vídeo</option>
                <option value="Podcast">Podcast</option>
                <option value="Artigo">Artigo</option>
                <option value="Livro">Livro</option>
                <option value="Áudio">Áudio</option>
                <option value="Shorts">Shorts</option>
              </select>
            </div>
            {/* Conteúdo dividido em URL ou Ficheiro */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Conteúdo</label>
              <p className="text-xs text-gray-500 mb-2">Insira uma URL ou faça upload de um ficheiro para o seu post</p>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1 text-gray-900">URL do Conteúdo: (nenhum url inserido)</label>
                <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
                  <span className="text-gray-400 mr-2">🌐</span>
                  <input
                    type="url"
                    className="flex-1 bg-transparent outline-none text-gray-900"
                    placeholder="www.exemplo.com/conteudo"
                    // value={url} // Adicione o estado se desejar controlar
                    // onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center my-2">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="mx-4 text-gray-400 text-xs font-medium">Ou</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-900">Ficheiro: (nenhum ficheiro selecionado)</label>
                <div className="border-2 border-gray-300 border-dashed rounded-lg flex flex-col items-center justify-center py-6 cursor-pointer hover:border-gray-400 transition-colors relative bg-black">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  <CloudUpload className="w-8 h-8 text-white mb-2" />
                  <span className="text-white">Escolher um ficheiro</span>
                  {file && (
                    <span className="mt-2 text-xs text-gray-200">{file.name}</span>
                  )}
                </div>
              </div>
            </div>
            {/* Título */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Título</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                placeholder="Escreva aqui um título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Descrição</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                placeholder="Escreva aqui uma descrição"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />
            </div>
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Tags</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                placeholder="Adicione tags e pressione Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              {/* Exibir tags abaixo do input */}
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.length === 0 ? (
                  <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full flex items-center text-sm font-medium opacity-80 select-none pointer-events-none">
                    Exemplo
                  </span>
                ) : (
                  tags.map((tag) => (
                    <span key={tag} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full flex items-center text-sm font-medium">
                      {tag}
                      <button type="button" className="ml-2 text-gray-500 hover:text-red-500" onClick={() => removeTag(tag)}>
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
            {/* Emotion Tags */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Tags de Emoção</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {emotionTags.map((emotion) => (
                  <label key={emotion} className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                    <input
                      type="checkbox"
                      checked={emotions.includes(emotion)}
                      onChange={() => handleEmotionChange(emotion)}
                      className="accent-black cursor-pointer"
                    />
                    {emotion}
                  </label>
                ))}
              </div>
            </div>
            {/* Upload Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-black text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 cursor-pointer"
                disabled={isUploading}
              >
                {isUploading ? "A enviar..." : "Enviar Conteúdo"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </CMSLayout>
  );
} 