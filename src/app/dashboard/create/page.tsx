"use client";

import React, { useState, useEffect } from "react";
import { CloudUpload, X, Plus, Image } from "lucide-react";
import CMSLayout from "@/components/CMSLayout";
import FlexibleRenderer from '@/components/FlexibleRenderer';
import TipTapEditor from "@/components/TipTapEditor";
import { createPost, CreatePostData, uploadFileForPost, getAllReadingTags, associateTagWithPost, createReadingTag } from "@/services/posts";
import { getMediaDuration } from "@/services/storage";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from 'react-hot-toast';

import { EMOTIONS } from '@/lib/emotions';

// Modal para criar nova categoria de leitura
const CreateReadingTagModal = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome da categoria é obrigatório");
      setError("O nome da categoria é obrigatório");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createReadingTag({
        name: name.trim(),
        description: description.trim() || undefined,
        color: color
      });

      // Limpar formulário
      setName("");
      setDescription("");
      setColor("#3B82F6");
      
      // Mostrar mensagem de sucesso via toast e depois fechar modal
      toast.success("Categoria criada com sucesso!");
      // Aguardar um pouco e depois fechar modal e atualizar lista
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      setError(error instanceof Error ? error.message : "Erro ao criar categoria");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName("");
      setDescription("");
      setColor("#3B82F6");
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Nova Categoria de Leitura</h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">
              Nome da Categoria *
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
              placeholder="Ex: Ansiedade, Meditação, Autoestima..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">
              Descrição (opcional)
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
              placeholder="Breve descrição da categoria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">
              Cor da Categoria
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isCreating}
              />
              <span className="text-sm text-gray-600">Escolha uma cor para identificar a categoria</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1 bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Criando..." : "Criar Categoria"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CreateContent() {
  const router = useRouter();
  const { canAccessCMS, loading: authLoading, error: authError } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"Vídeo" | "Podcast" | "Artigo" | "Livro" | "Áudio" | "Shorts" | "Leitura">("Vídeo");
  // Removido readingCategory pois não é mais necessário
  const [contentUrl, setContentUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [readingTags, setReadingTags] = useState<{id: string, name: string, color?: string}[]>([]);
  const [selectedReadingTags, setSelectedReadingTags] = useState<string[]>([]);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [minAge, setMinAge] = useState<12 | 16>(12); // ✅ ADICIONANDO ESTADO PARA IDADE MÍNIMA

  // Função para recarregar as categorias de leitura
  const reloadReadingTags = async () => {
    if (category === 'Leitura') {
      try {
        const tags = await getAllReadingTags();
        setReadingTags(tags);
      } catch (error) {
        console.error('Erro ao recarregar categorias:', error);
        setReadingTags([]);
      }
    }
  };

  useEffect(() => {
    if (category === 'Leitura') {
      getAllReadingTags().then(setReadingTags).catch(() => setReadingTags([]));
    }
  }, [category]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validar se é uma imagem
      if (!selectedFile.type.startsWith('image/')) {
        setError("Por favor, selecione apenas arquivos de imagem para a thumbnail");
        return;
      }
      
      // Validar tamanho (máximo 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("A thumbnail deve ter no máximo 5MB");
        return;
      }
      
      setThumbnailFile(selectedFile);
      setError(null);
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

    try {
      // Validar dados obrigatórios
      if (!title.trim()) {
        setError("Título é obrigatório");
        toast.error("Título é obrigatório");
        return;
      }

      if (!description.trim()) {
          setError("Descrição é obrigatória");
          toast.error("Descrição é obrigatória");
        return;
      }

      // Validar descrição textual (exceto para Shorts)
      if (category !== "Shorts" && !description.trim()) {
        setError("Conteúdo textual é obrigatório");
        toast.error("Conteúdo textual é obrigatório");
        return;
      }

      // Validar tags
      if (tags.length === 0) {
        setError("É obrigatório adicionar pelo menos uma tag");
        toast.error("É obrigatório adicionar pelo menos uma tag");
        return;
      }

      // Validar tags de emoção
      if (emotions.length === 0) {
        setError("É obrigatório selecionar pelo menos uma tag de emoção");
        toast.error("É obrigatório selecionar pelo menos uma tag de emoção");
        return;
      }

      // Validar conteúdo (URL ou arquivo) - obrigatório para todas as categorias
      if (!contentUrl.trim() && !file) {
        setError("Conteúdo é obrigatório. Forneça uma URL ou faça upload de um arquivo");
        toast.error("Conteúdo é obrigatório. Forneça uma URL ou faça upload de um arquivo");
        return;
      }

      if (contentUrl.trim() && file) {
        setError("Escolha apenas uma opção: URL ou arquivo, não ambos");
        toast.error("Escolha apenas uma opção: URL ou arquivo, não ambos");
        return;
      }

      // Validar URL para Shorts (deve ser de plataformas suportadas)
      if (category === "Shorts" && contentUrl.trim()) {
        const contentType = detectContentType(contentUrl);
          if (!contentType || contentType === 'external') {
          setError("Para Shorts, use URLs do YouTube, Instagram Reels ou TikTok");
          toast.error("Para Shorts, use URLs do YouTube, Instagram Reels ou TikTok");
          return;
        }
      }

      // Validar que Shorts não pode ter conteúdo textual
      if (category === "Shorts" && description.trim()) {
        setError("Posts da categoria Shorts não podem ter conteúdo textual");
        toast.error("Posts da categoria Shorts não podem ter conteúdo textual");
        return;
      }

      // Validar que posts de Leitura devem ter pelo menos uma categoria selecionada
      if (category === "Leitura" && selectedReadingTags.length === 0) {
        setError("É obrigatório selecionar pelo menos uma categoria de leitura");
        toast.error("É obrigatório selecionar pelo menos uma categoria de leitura");
        return;
      }

      // Validar idade mínima
      if (minAge !== 12 && minAge !== 16) {
        setError("Idade mínima deve ser 12 ou 16");
        toast.error("Idade mínima deve ser 12 ou 16");
        return;
      }

      // Preparar dados do post
      const postData: CreatePostData = {
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tags, // ✅ TODAS AS CATEGORIAS AGORA TÊM TAGS
        emotion_tags: emotions,
        min_age: minAge, // ✅ ADICIONANDO IDADE MÍNIMA
        // categoria_leitura será preenchida automaticamente pelo trigger quando as tags forem associadas
      };

      // A descrição já contém o conteúdo textual principal (HTML)
      if (description.trim()) {
        postData.content = undefined; // manter vazio; a descrição será usada como texto
      }

      // Removido código de reading_category pois não é mais necessário

      // Adicionar URL se fornecida
      if (contentUrl.trim()) {
        postData.content_url = contentUrl.trim();
        
        // Obter duração para posts de vídeo e áudio com URL
        if ((category === 'Vídeo' || category === 'Podcast' || category === 'Áudio')) {
          try {
            const durationResult = await getMediaDuration(contentUrl.trim());
            if (durationResult.success && durationResult.duration) {
              postData.duration = durationResult.duration;
            }
          } catch (error) {
            console.warn('Erro ao obter duração da URL:', error);
            // Não falhar se não conseguir obter a duração
          }
        }
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
            
            // Adicionar duração se obtida
            if (uploadResult.data.duration) {
              postData.duration = uploadResult.data.duration;
            }
            
            setUploadProgress(100);
            } else {
            setError(uploadResult.error || "Erro no upload do arquivo");
            toast.error(uploadResult.error || "Erro no upload do arquivo");
            return;
          }
          } catch (uploadError) {
          console.error("Erro no upload:", uploadError);
          setError("Erro inesperado no upload do arquivo");
          toast.error("Erro inesperado no upload do arquivo");
          return;
        } finally {
          clearInterval(progressInterval);
        }
      }

      // Upload de thumbnail se fornecida (apenas para Podcast)
      if (category === "Podcast" && thumbnailFile) {
        try {
          const thumbnailUploadResult = await uploadFileForPost(thumbnailFile);
          
          if (thumbnailUploadResult.success && thumbnailUploadResult.data) {
            postData.thumbnail_url = thumbnailUploadResult.data.url;
          } else {
            setError(thumbnailUploadResult.error || "Erro no upload da thumbnail");
            toast.error(thumbnailUploadResult.error || "Erro no upload da thumbnail");
            return;
          }
        } catch (thumbnailError) {
          console.error("Erro no upload da thumbnail:", thumbnailError);
          setError("Erro inesperado no upload da thumbnail");
          toast.error("Erro inesperado no upload da thumbnail");
          return;
        }
      }

      // Criar o post
      const result = await createPost(postData);

      if (result.success && result.data?.id && category === 'Leitura' && selectedReadingTags.length > 0) {
        // Associar tags de leitura ao post
        if (category === 'Leitura' && selectedReadingTags.length > 0) {
          for (const tagId of selectedReadingTags) {
            try {
              await associateTagWithPost(result.data.id, tagId);
            } catch (error) {
              console.error('Erro ao associar tag:', error);
            }
          }
        }
        
        // Garantir que a coluna categoria_leitura seja preenchida corretamente
        try {
          await supabase.rpc('sync_categoria_leitura', { post_id_param: result.data.id });
        } catch {
          console.log('Função sync_categoria_leitura não disponível, continuando...');
        }
      }

      if (result.success) {
        toast.success(result.message || "Post criado com sucesso!");
        
        // Limpar formulário
        setTitle("");
  setDescription("");
        // Removido setReadingCategory pois não é mais necessário
        setContentUrl("");
        setCategory("Vídeo");
        setTags([]);
        setEmotions([]);
        setFile(null);
        setThumbnailFile(null);
        setTagInput("");
        setSelectedReadingTags([]); // Limpar tags de leitura selecionadas
        setMinAge(12); // ✅ LIMPAR IDADE MÍNIMA

        // Redirecionar para página de detalhes do post criado após 2 segundos
        if (result.data?.id) {
          const postId = result.data.id;
          setTimeout(() => {
            router.push(`/dashboard/details/${postId}`);
          }, 2000);
        } else {
          // Fallback para página de gestão se não conseguir obter o ID
          setTimeout(() => {
            router.push("/dashboard/management");
          }, 2000);
        }
      } else {
        setError(result.error || "Erro desconhecido ao criar post");
        toast.error(result.error || "Erro desconhecido ao criar post");
      }
    } catch (error) {
      console.error("Erro inesperado:", error);
      setError("Erro inesperado ao criar post");
      toast.error("Erro inesperado ao criar post");
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

  // Função para detectar tipo de conteúdo baseado na URL
  const detectContentType = (url: string) => {
    if (!url.trim()) return null;
    
    // YouTube Shorts
    if (url.includes('youtube.com/shorts/') || url.includes('youtu.be/')) {
      return 'youtube-shorts';
    }
    
    // Instagram Reels
    if (url.includes('instagram.com/reel/') || url.includes('instagram.com/tv/')) {
      return 'instagram-reel';
    }
    
    // TikTok
    if (url.includes('tiktok.com/')) {
      return 'tiktok';
    }
    
    // YouTube normal
    if (url.includes('youtube.com/watch')) {
      return 'youtube';
    }
    
    return 'external';
  };

  // Função para renderizar prévia do conteúdo
  const renderContentPreview = () => {
    if (!contentUrl.trim() || category !== 'Shorts') return null;
    
    const contentType = detectContentType(contentUrl);
    
    if (!contentType) return null;
    
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-md border">
        <div className="text-xs text-gray-500 font-bold mb-2">Prévia do conteúdo:</div>
        <div className="bg-white p-3 rounded border">
          <div className="flex items-center gap-2 mb-2">
            {contentType === 'youtube-shorts' && (
              <>
                <span className="text-red-500">▶️</span>
                <span className="text-sm font-medium">YouTube Shorts</span>
              </>
            )}
            {contentType === 'instagram-reel' && (
              <>
                <span className="text-pink-500">📱</span>
                <span className="text-sm font-medium">Instagram Reel</span>
              </>
            )}
            {contentType === 'tiktok' && (
              <>
                <span className="text-black">🎵</span>
                <span className="text-sm font-medium">TikTok</span>
              </>
            )}
            {contentType === 'youtube' && (
              <>
                <span className="text-red-500">▶️</span>
                <span className="text-sm font-medium">YouTube</span>
              </>
            )}
            {contentType === 'external' && (
              <>
                <span className="text-blue-500">🔗</span>
                <span className="text-sm font-medium">Link Externo</span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-600 break-all">{contentUrl}</div>
          <div className="mt-2 text-xs text-gray-500">
            {contentType === 'youtube-shorts' && "Este conteúdo será exibido como um YouTube Shorts."}
            {contentType === 'instagram-reel' && "Este conteúdo será exibido como um Instagram Reel."}
            {contentType === 'tiktok' && "Este conteúdo será exibido como um TikTok."}
            {contentType === 'youtube' && "Este conteúdo será exibido como um vídeo do YouTube."}
            {contentType === 'external' && "Este link será exibido como conteúdo externo."}
          </div>
        </div>
      </div>
    );
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
          
          {/* success handled via global toasts (HotToaster) */}

          {/* Aviso para categoria de leitura sem categorias selecionadas */}
          {category === 'Leitura' && selectedReadingTags.length === 0 && readingTags.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-4">
              <p className="text-sm font-medium">
                ⚠️ Selecione pelo menos uma categoria de leitura para continuar
              </p>
            </div>
          )}


          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Categoria - agora em primeiro lugar */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Categoria</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value as "Vídeo" | "Podcast" | "Artigo" | "Livro" | "Áudio" | "Shorts" | "Leitura")}
              >
                <option value="Vídeo">Vídeo</option>
                <option value="Podcast">Podcast</option>
                <option value="Artigo">Artigo</option>
                <option value="Livro">Livro</option>
                <option value="Áudio">Áudio</option>
                <option value="Shorts">Shorts</option>
                <option value="Leitura">Leitura</option>
              </select>
            </div>

            {/* Removido campo de categoria de leitura pois não é mais necessário */}
            {/* Conteúdo dividido em URL ou Ficheiro */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Conteúdo
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Insira uma URL ou faça upload de um ficheiro para o seu post. 
                {category === 'Shorts' && (
                  <span className="text-blue-600 font-medium"> Para Shorts, use URLs do YouTube Shorts, Instagram Reels ou TikTok.</span>
                )}
                <span className="text-red-500 font-medium"> * Obrigatório</span>
              </p>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1 text-gray-900">
                  URL do Conteúdo: {contentUrl.trim() ? contentUrl : "(nenhum url inserido)"}
                </label>
                <div className={`flex items-center border border-gray-300 rounded-md px-3 py-2 ${file ? 'bg-gray-100' : 'bg-gray-50'} ${file ? 'opacity-50' : ''}`}>
                  <span className="text-gray-400 mr-2">🌐</span>
                  <input
                    type="url"
                    className="flex-1 bg-transparent outline-none text-gray-900 disabled:cursor-not-allowed"
                    placeholder={
                      file 
                        ? "Remova o ficheiro para inserir URL" 
                        : category === 'Shorts'
                          ? "https://youtube.com/shorts/... ou https://instagram.com/reel/... ou https://tiktok.com/..."
                          : "www.exemplo.com/conteudo"
                    }
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    disabled={!!file}
                  />
                  {file && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="ml-2 text-red-500 hover:text-red-700 text-xs font-medium"
                      title="Remover ficheiro para permitir URL"
                    >
                      Remover ficheiro
                    </button>
                  )}
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
                <div className={`border-2 border-gray-300 border-dashed rounded-lg flex flex-col items-center justify-center py-6 transition-colors relative ${contentUrl.trim() ? 'bg-gray-400 opacity-50 cursor-not-allowed' : 'bg-black cursor-pointer hover:border-gray-400'}`}>
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    disabled={isUploading || !!contentUrl.trim()}
                  />
                  <CloudUpload className={`w-8 h-8 mb-2 ${contentUrl.trim() ? 'text-gray-600' : 'text-white'}`} />
                  <span className={contentUrl.trim() ? 'text-gray-600' : 'text-white'}>
                    {contentUrl.trim() ? "Remova a URL para fazer upload" : 
                     isUploading ? "A fazer upload..." : "Escolher um ficheiro"}
                  </span>
                  {contentUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => setContentUrl("")}
                      className="mt-2 text-red-400 hover:text-red-300 text-xs font-medium"
                      title="Remover URL para permitir upload"
                    >
                      Remover URL
                    </button>
                  )}
                  {file && !contentUrl.trim() && (
                    <div className="mt-2 text-center">
                      <span className="text-xs text-gray-200 block">{file.name}</span>
                      <span className="text-xs text-gray-400 block">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                  
                  {/* Barra de progresso */}
                  {isUploading && uploadProgress > 0 && !contentUrl.trim() && (
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
              
              {/* Prévia do conteúdo para Shorts */}
              {renderContentPreview()}
            </div>

            {/* Upload de Thumbnail (apenas para Podcast) */}
            {category === "Podcast" && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Thumbnail do Podcast
                  <span className="text-xs text-gray-500 ml-2">(opcional)</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Faça upload de uma imagem para servir como thumbnail do podcast. 
                  Formatos aceitos: JPG, PNG, GIF. Máximo: 5MB.
                </p>
                <div className="border-2 border-gray-300 border-dashed rounded-lg flex flex-col items-center justify-center py-6 transition-colors relative bg-black cursor-pointer hover:border-gray-400">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleThumbnailChange}
                    accept="image/*"
                    disabled={isUploading}
                  />
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image className="w-8 h-8 mb-2 text-white" />
                  <span className="text-white">
                    {isUploading ? "A fazer upload..." : 
                     thumbnailFile ? thumbnailFile.name : "Escolher uma imagem para thumbnail"}
                  </span>
                  {thumbnailFile && (
                    <div className="mt-2 text-center">
                      <span className="text-xs text-gray-200 block">{thumbnailFile.name}</span>
                      <span className="text-xs text-gray-400 block">
                        {(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => setThumbnailFile(null)}
                        className="mt-1 text-red-400 hover:text-red-300 text-xs font-medium"
                      >
                        Remover thumbnail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Título */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Título
                <span className="text-red-500 ml-1">*</span>
              </label>
                              <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                  placeholder="Escreva aqui um título"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
            </div>
            {/* Descrição com Editor TipTap */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Descrição
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Digite a descrição do seu post
              </p>

              <TipTapEditor
                initialHtml={description}
                onChangeHtml={setDescription}
                placeholder="Escreva aqui uma descrição..."
              />
            </div>

            {/* Live preview da Descrição (substitui o antigo 'Conteúdo Textual') */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Pré-visualização da Descrição
              </label>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                A pré-visualização atualiza automaticamente enquanto você digita na descrição.
              </p>

              <div className="mt-2">
                <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                  <div className="text-xs text-gray-500 font-bold mb-2">Prévia da descrição:</div>
                  <div className="bg-white p-3 rounded border">
                    <FlexibleRenderer content={description} />
                  </div>
                </div>
              </div>
            </div>
            {/* Categorias de Leitura (apenas para categoria Leitura) */}
            {category === 'Leitura' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Categorias de Leitura
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {readingTags.length === 0 ? (
                    <div className="w-full text-center py-4 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 mb-2">Nenhuma categoria cadastrada</p>
                      <p className="text-xs text-gray-400 mb-3">Crie uma nova categoria para organizar seus posts de leitura</p>
                      <button
                        type="button"
                        onClick={() => setShowCreateTagModal(true)}
                        className="flex items-center gap-2 mx-auto text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Criar Primeira Categoria
                      </button>
                    </div>
                  ) : (
                    readingTags.map(tag => (
                      <label key={tag.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-200 transition-all duration-200" style={{ 
                        background: selectedReadingTags.includes(tag.id) ? (tag.color || '#3B82F6') : '#f3f4f6', 
                        color: selectedReadingTags.includes(tag.id) ? '#fff' : '#222', 
                        borderRadius: '9999px', 
                        padding: '0.25rem 0.75rem' 
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedReadingTags.includes(tag.id)}
                          onChange={() => setSelectedReadingTags(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                          className="accent-black cursor-pointer"
                        />
                        {tag.name}
                      </label>
                    ))
                  )}
                </div>
                {readingTags.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500 mt-1">
                      Selecione pelo menos uma categoria que melhor represente o post de leitura.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateTagModal(true)}
                      className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Nova Categoria
                    </button>
                  </>
                )}
              </div>
            )}
            {/* Campo de tags para todas as categorias */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Tags
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                {category === 'Leitura' 
                  ? 'Tags gerais para o post (além das categorias de leitura específicas)' 
                  : 'Adicione tags que descrevam o conteúdo'
                }
              </p>

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
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Tags de Emoção
                <span className="text-red-500 ml-1">*</span>

                <p className="text-xs text-gray-500 mt-2 mb-4">
                Selecione as emoções que o conteúdo desperta
              </p>

              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {EMOTIONS.map((emotion) => (
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

            {/* Idade Mínima */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Idade Mínima
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Selecione a idade mínima recomendada para visualizar este conteúdo
              </p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="minAge"
                    value="12"
                    checked={minAge === 12}
                    onChange={() => setMinAge(12)}
                    className="accent-black cursor-pointer"
                  />
                  <div>
                    <div className="font-medium text-gray-900">12+</div>
                    <div className="text-xs text-gray-500">Conteúdo adequado para 12 anos ou mais</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="minAge"
                    value="16"
                    checked={minAge === 16}
                    onChange={() => setMinAge(16)}
                    className="accent-black cursor-pointer"
                  />
                  <div>
                    <div className="font-medium text-gray-900">16+</div>
                    <div className="text-xs text-gray-500">Conteúdo adequado para 16 anos ou mais</div>
                  </div>
                </label>
              </div>
            </div>
            {/* Upload Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-black text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={
                  isUploading || 
                  !title.trim() ||
                  !description.trim() ||
                  (!contentUrl.trim() && !file) ||
                  (category !== "Shorts" && !description.trim()) ||
                  tags.length === 0 ||
                  emotions.length === 0 ||
                  (category === "Leitura" && selectedReadingTags.length === 0) ||
                  (minAge !== 12 && minAge !== 16)
                }
                              >
                  {isUploading 
                    ? uploadProgress > 0 
                      ? `A fazer upload... ${uploadProgress}%` 
                      : "A enviar..." 
                    : !title.trim()
                        ? "Adicione um título"
                        : !description.trim()
                          ? "Adicione uma descrição"
                          : (!contentUrl.trim() && !file)
                            ? "Adicione URL ou arquivo"
                            : category !== "Shorts" && !description.trim()
                              ? "Adicione conteúdo textual"
                              : tags.length === 0
                                ? "Adicione pelo menos uma tag"
                                : emotions.length === 0
                                  ? "Selecione uma tag de emoção"
                                                                  : category === "Leitura" && selectedReadingTags.length === 0
                                  ? "Selecione uma categoria de leitura"
                                  : (minAge !== 12 && minAge !== 16)
                                    ? "Selecione uma idade mínima"
                                    : "Enviar Conteúdo"
                  }
                </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal para criar nova categoria de leitura */}
      <CreateReadingTagModal
        isOpen={showCreateTagModal}
        onClose={() => setShowCreateTagModal(false)}
        onSuccess={reloadReadingTags}
      />
    </CMSLayout>
  );
} 