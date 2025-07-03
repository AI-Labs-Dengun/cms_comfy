"use client";

import React, { useState } from "react";
import { CloudUpload, Plus, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const emotionTags = [
  "Raiva",
  "Alegria",
  "Inveja",
  "Medo",
  "Tristeza",
];

const mockContent = [
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

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Vídeo");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");

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

  // Filter content by search
  const filteredContent = mockContent.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchLower) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
      item.emotions.some((emo) => emo.toLowerCase().includes(searchLower))
    );
  });

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
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex flex-1 bg-white overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r flex flex-col py-8 px-6 min-h-full shadow-2xl z-10" style={{ boxShadow: '12px 0 40px 0 rgba(0,0,0,0.18)' }}>
          <div className="mb-12 flex flex-col items-center justify-center">
            <img src="/cms-logo.png" alt="Comfy Content Hub Logo" className="mb-2 w-28 h-auto" />
          </div>
          <nav className="flex flex-col gap-2">
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium ${activeTab === 'create' ? 'bg-black text-white' : 'text-gray-900 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('create')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo Conteúdo
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium ${activeTab === 'manage' ? 'bg-black text-white' : 'text-gray-900 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('manage')}
            >
              <ArrowRight className="w-4 h-4 mr-1" />
              Gerir Conteúdo
            </button>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center py-12 px-8 overflow-y-auto">
          {activeTab === 'create' ? (
            <div className="w-full max-w-xl">
              <div className="text-xs text-gray-500 mb-2 font-medium">Novo Conteúdo</div>
              <h1 className="text-2xl font-bold mb-6 text-gray-900" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>Adicionar Novo Conteúdo</h1>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Categoria - agora em primeiro lugar */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-900">Categoria</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
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
                          className="accent-black"
                        />
                        {emotion}
                      </label>
                    ))}
                  </div>
                </div>
                {/* Upload Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-black text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60"
                    disabled={isUploading}
                  >
                    {isUploading ? "A enviar..." : "Enviar Conteúdo"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="w-full max-w-4xl">
              <div className="text-xs text-gray-500 mb-2 font-medium">Gerir Conteúdo</div>
              <h1 className="text-2xl font-bold mb-1 text-gray-900" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>Gerir Conteúdo</h1>
              <div className="text-sm text-gray-500 mb-6 font-medium">Monitore e edite o seu conteúdo</div>
              <div className="flex items-center w-full mb-6">
                <span className="pl-3 pr-2 text-gray-500">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.6 10.6Z"/></svg>
                </span>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
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
                        onClick={() => router.push(`/dashboard/detalhes/${idx + 1}`)}
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
          )}
        </main>
      </div>
    </div>
  );
} 