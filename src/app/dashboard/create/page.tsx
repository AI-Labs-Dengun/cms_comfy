"use client";

import React, { useState } from "react";
import { CloudUpload } from "lucide-react";
import CMSLayout from "@/components/CMSLayout";
import { createPost, CreatePostData, uploadFileForPost } from "@/services/posts";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const emotionTags = [
  "Raiva",
  "Alegria",
  "Inveja",
  "Medo",
  "Tristeza",
];

export default function CreateContent() {
  const router = useRouter();
  const { canAccessCMS, loading: authLoading, error: authError } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"Vídeo" | "Podcast" | "Artigo" | "Livro" | "Áudio" | "Shorts">("Vídeo");
  const [contentUrl, setContentUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validar dados obrigatórios
      if (!title.trim()) {
        setError("Título é obrigatório");
        return;
      }

      if (!description.trim()) {
        setError("Descrição é obrigatória");
        return;
      }

      if (!contentUrl.trim() && !file) {
        setError("É necessário fornecer uma URL ou fazer upload de um arquivo");
        return;
      }

      // Preparar dados do post
      const postData: CreatePostData = {
        title: title.trim(),
        description: description.trim(),
        category,
        tags,
        emotion_tags: emotions
      };

      // Adicionar URL se fornecida
      if (contentUrl.trim()) {
        postData.content_url = contentUrl.trim();
      }

      // Upload de arquivo se fornecido
      if (file && !contentUrl.trim()) {
        setUploadProgress(0);
        setError(null);
        
        // Simular progresso de upload
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        try {
          const uploadResult = await uploadFileForPost(file);
          
          if (uploadResult.success && uploadResult.data) {
            postData.file_path = uploadResult.data.path;
            postData.file_name = uploadResult.data.file_name;
            postData.file_type = uploadResult.data.file_type;
            postData.file_size = uploadResult.data.file_size;
            setUploadProgress(100);
          } else {
            setError(uploadResult.error || "Erro no upload do arquivo");
            return;
          }
        } catch (uploadError) {
          console.error("Erro no upload:", uploadError);
          setError("Erro inesperado no upload do arquivo");
          return;
        } finally {
          clearInterval(progressInterval);
        }
      }

      // Criar o post
      const result = await createPost(postData);

      if (result.success) {
        setSuccess(result.message || "Post criado com sucesso!");
        
        // Limpar formulário
        setTitle("");
        setDescription("");
        setContentUrl("");
        setCategory("Vídeo");
        setTags([]);
        setEmotions([]);
        setFile(null);
        setTagInput("");

        // Redirecionar para página de gestão após 2 segundos
        setTimeout(() => {
          router.push("/dashboard/management");
        }, 2000);
      } else {
        setError(result.error || "Erro desconhecido ao criar post");
      }
    } catch (error) {
      console.error("Erro inesperado:", error);
      setError("Erro inesperado ao criar post");
    } finally {
      setIsUploading(false);
    }
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

  // Verificar carregamento de autenticação
  if (authLoading) {
    return (
      <CMSLayout currentPage="create">
        <div className="flex flex-col items-center justify-center py-12 px-8 min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando permissões...</p>
          </div>
        </div>
      </CMSLayout>
    );
  }

  // Verificar se o usuário tem permissão para acessar o CMS
  if (!canAccessCMS) {
    return (
      <CMSLayout currentPage="create">
        <div className="flex flex-col items-center justify-center py-12 px-8 min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600 mb-4">
              Você não tem permissão para acessar esta página. <br />
              É necessário ter uma conta CMS autorizada.
            </p>
            {authError && (
              <p className="text-red-600 text-sm">{authError}</p>
            )}
            <button
              onClick={() => router.push('/login')}
              className="bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors"
            >
              Fazer Login
            </button>
          </div>
        </div>
      </CMSLayout>
    );
  }

  return (
    <CMSLayout currentPage="create">
      <div className="flex flex-col items-center py-12 px-8">
        <div className="w-full max-w-xl">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 text-center" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
            Adicionar Novo Conteúdo
          </h1>
          
          {/* Mensagens de feedback */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
              <p className="text-sm font-medium">{success}</p>
              <p className="text-xs mt-1">Redirecionando para gestão de posts...</p>
            </div>
          )}
          
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
                <label className="block text-xs font-medium mb-1 text-gray-900">
                  URL do Conteúdo: {contentUrl.trim() ? contentUrl : "(nenhum url inserido)"}
                </label>
                <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
                  <span className="text-gray-400 mr-2">🌐</span>
                  <input
                    type="url"
                    className="flex-1 bg-transparent outline-none text-gray-900"
                    placeholder="www.exemplo.com/conteudo"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center my-2">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="mx-4 text-gray-400 text-xs font-medium">Ou</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-900">
                  Ficheiro: {file ? file.name : "(nenhum ficheiro selecionado)"}
                </label>
                <div className="border-2 border-gray-300 border-dashed rounded-lg flex flex-col items-center justify-center py-6 cursor-pointer hover:border-gray-400 transition-colors relative bg-black">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  <CloudUpload className="w-8 h-8 text-white mb-2" />
                  <span className="text-white">
                    {isUploading ? "A fazer upload..." : "Escolher um ficheiro"}
                  </span>
                  {file && (
                    <div className="mt-2 text-center">
                      <span className="text-xs text-gray-200 block">{file.name}</span>
                      <span className="text-xs text-gray-400 block">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                  
                  {/* Barra de progresso */}
                  {isUploading && uploadProgress > 0 && (
                    <div className="w-full max-w-xs mt-3">
                      <div className="bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-300 mt-1 block">
                        {uploadProgress}% completo
                      </span>
                    </div>
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
                className="bg-black text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isUploading || success !== null}
              >
                {isUploading 
                  ? uploadProgress > 0 
                    ? `A fazer upload... ${uploadProgress}%` 
                    : "A enviar..." 
                  : success 
                    ? "Enviado!" 
                    : "Enviar Conteúdo"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </CMSLayout>
  );
} 