"use client";

import React, { useState, useEffect } from "react";
import { CloudUpload, X } from "lucide-react";
import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import CMSLayout from "@/components/CMSLayout";
import TipTapEditor from "@/components/TipTapEditor";
import { createPost, CreatePostData, uploadFileForPost, getAllReadingTags, associateTagWithPost, createReadingTag, type FileValidation } from "@/services/posts";
import { getMediaDuration } from "@/services/storage";
import PostFileUploader from "@/components/PostFileUploader";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from 'react-hot-toast';

import { EMOTIONS } from '@/lib/emotions';

// Mapping from category to session/badge with consistent colors
const CATEGORY_SESSION_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  'Vídeo': { label: 'Biblioteca', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'Podcast': { label: 'Biblioteca', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'Artigo': { label: 'Biblioteca', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'Livro': { label: 'Biblioteca', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'Áudio': { label: 'Biblioteca', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'Shorts': { label: 'Media', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'Leitura': { label: 'Leitura', color: 'text-green-700', bgColor: 'bg-green-100' },
  'Ferramentas': { label: 'Biblioteca', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'Quizzes': { label: 'Biblioteca', color: 'text-blue-700', bgColor: 'bg-blue-100' }
};

// Small accessible dropdown component for category selection that shows a badge
type CategoryType = "Vídeo" | "Podcast" | "Artigo" | "Livro" | "Áudio" | "Shorts" | "Leitura" | "Ferramentas" | "Quizzes";

function CategoryDropdown({ value, onChange }: { value: CategoryType; onChange: (v: CategoryType) => void }) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  const toggle = () => setOpen((s) => !s);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const options = [
    { value: 'Vídeo', label: '📹 Vídeo' },
    { value: 'Podcast', label: '🎙️ Podcast' },
    { value: 'Artigo', label: '📰 Artigo' },
    { value: 'Livro', label: '📚 Livro' },
    { value: 'Áudio', label: '🎵 Áudio' },
    { value: 'Shorts', label: '⚡ Shorts' },
    { value: 'Leitura', label: '📖 Leitura' },
    { value: 'Ferramentas', label: '🔧 Ferramentas' },
    { value: 'Quizzes', label: '❓ Quizzes' }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggle}
        className="w-full text-left border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white shadow-sm flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{options.find(o => o.value === value)?.label || 'Selecione'}</span>
        <div className="flex items-center gap-2">
          {CATEGORY_SESSION_MAP[value] && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_SESSION_MAP[value].color} ${CATEGORY_SESSION_MAP[value].bgColor}`}>
              {CATEGORY_SESSION_MAP[value].label}
            </span>
          )}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <ul role="listbox" className="absolute z-40 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
            {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
                aria-selected={opt.value === value}
                onClick={() => { onChange(opt.value as CategoryType); setOpen(false); }}
              className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors ${opt.value === value ? 'bg-blue-100 border-l-2 border-blue-500' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{opt.label}</span>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_SESSION_MAP[opt.value].color} ${CATEGORY_SESSION_MAP[opt.value].bgColor}`}>
                {CATEGORY_SESSION_MAP[opt.value].label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Modal to create a new reading category
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
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(""); // New field for textual content
  const [category, setCategory] = useState<"Vídeo" | "Podcast" | "Artigo" | "Livro" | "Áudio" | "Shorts" | "Leitura" | "Ferramentas" | "Quizzes">("Vídeo");
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
  const [mediaMode, setMediaMode] = useState<'url' | 'file'>('url'); // Modo de mídia: URL ou Upload de ficheiro
  
  // ✅ NEW STATE FOR MULTIPLE FILES
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileValidation, setFileValidation] = useState<FileValidation | null>(null);
  const [uploadedFilesData, setUploadedFilesData] = useState<{
    file_paths: string[];
    file_names: string[];
    file_types: string[];
    file_sizes: number[];
    durations?: number[];
  } | null>(null);

  // Function to reload reading categories
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

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
  // Validate that it's an image
      if (!selectedFile.type.startsWith('image/')) {
        setError("Por favor, selecione apenas arquivos de imagem para a thumbnail");
        return;
      }
      
  // Validate size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("A thumbnail deve ter no máximo 5MB");
        return;
      }
      
      setThumbnailFile(selectedFile);
      
  // Create image preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setThumbnailPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);
      
      setError(null);
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const handleMediaModeChange = (mode: 'url' | 'file') => {
    setMediaMode(mode);
  // Clear the field that's not being used
    if (mode === 'url') {
  // Clear files (both old and new systems)
      setFile(null);
      setSelectedFiles([]);
      setFileValidation(null);
      setUploadedFilesData(null);
      setError(null); // Limpar erros de validação
    } else {
  // Clear URL
      setContentUrl('');
      setError(null); // Limpar erros de validação
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
      // Title validation (description is now optional for all categories)
      if (category !== "Shorts") {
        if (!title.trim()) {
          setError("Título é obrigatório");
          toast.error("Título é obrigatório");
          return;
        }
      }

      // Validar conteúdo textual (obrigatório para todas as categorias exceto Shorts)
      if (category !== "Shorts" && !content.trim()) {
        setError("Conteúdo textual é obrigatório");
        toast.error("Conteúdo textual é obrigatório");
        return;
      }

      // Validar tags (exceto para Shorts)
      // ✅ REGRA ESPECIAL: Posts da categoria Shorts não requerem tags
      if (category !== "Shorts" && tags.length === 0) {
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

      // ✅ VALIDAÇÃO ESPECÍFICA PARA CONTEÚDO: URL ou arquivos (um OU outro)
      const hasContentUrl = contentUrl.trim();
      const hasUploadedFiles = uploadedFilesData && uploadedFilesData.file_paths.length > 0;
      const hasOldFile = file; // Compatibilidade
      const hasSelectedFiles = selectedFiles.length > 0 && fileValidation?.valid;
      
      // Para todas as categorias, incluindo Shorts, é obrigatório ter OU URL OU arquivo
      if (!hasContentUrl && !hasUploadedFiles && !hasOldFile && !hasSelectedFiles) {
        const errorMsg = category === "Shorts" 
          ? "Para Shorts, forneça uma URL (YouTube, Instagram, TikTok) ou faça upload de arquivo"
          : "Conteúdo é obrigatório. Forneça uma URL ou faça upload de arquivo(s)";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Não permitir URL e arquivo ao mesmo tempo (para todas as categorias)
      if (hasContentUrl && (hasUploadedFiles || hasOldFile || hasSelectedFiles)) {
        const errorMsg = category === "Shorts"
          ? "Para Shorts, escolha apenas uma opção: URL ou upload de arquivo, não ambos"
          : "Escolha apenas uma opção: URL ou arquivo(s), não ambos";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // ✅ Validação específica para arquivos múltiplos
      if (hasUploadedFiles && fileValidation && !fileValidation.valid) {
        setError(`Erro nos arquivos: ${fileValidation.error}`);
        toast.error(`Erro nos arquivos: ${fileValidation.error}`);
        return;
      }

      // Validar URL para Shorts (deve ser de plataformas suportadas)
      if (category === "Shorts" && contentUrl.trim()) {
        const contentType = detectContentType(contentUrl);
          if (!contentType || contentType === 'external') {
          setError("Para Shorts, use URLs do YouTube");
          toast.error("Para Shorts, use URLs do YouTube");
          return;
        }
      }

      // Validar que Shorts não pode ter conteúdo textual
      if (category === "Shorts" && content.trim()) {
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
        tags: tags, 
        emotion_tags: emotions,
        min_age: minAge,
      };

      // Adicionar conteúdo textual se fornecido (exceto para Shorts)
      if (category !== "Shorts" && content.trim()) {
        postData.content = content.trim();
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

      // ✅ NOVA LÓGICA: Usar dados dos arquivos já uploadados OU fazer upload se necessário
      if (uploadedFilesData && !contentUrl.trim()) {
        // Usar dados dos arquivos já uploadados pelo PostFileUploader
        postData.file_paths = uploadedFilesData.file_paths;
        postData.file_names = uploadedFilesData.file_names;
        postData.file_types = uploadedFilesData.file_types;
        postData.file_sizes = uploadedFilesData.file_sizes;
        
        // Adicionar duração se disponível
        if (uploadedFilesData.durations && uploadedFilesData.durations.length > 0) {
          postData.duration = uploadedFilesData.durations[0]; // Usar primeira duração
        }
        
        console.log(`✅ Usando arquivos já uploadados para ${category}:`, {
          filesCount: uploadedFilesData.file_paths.length,
          paths: uploadedFilesData.file_paths,
          types: uploadedFilesData.file_types
        });
      } else if (selectedFiles.length > 0 && fileValidation?.valid && !contentUrl.trim()) {
        // ✅ NOVO: Upload dos arquivos selecionados durante a submissão
        console.log(`📤 Fazendo upload de arquivos selecionados para categoria ${category}:`, {
          filesCount: selectedFiles.length,
          fileNames: selectedFiles.map(f => f.name),
          fileSizes: selectedFiles.map(f => f.size),
          fileTypes: selectedFiles.map(f => f.type)
        });
        
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
          // Validação extra específica para Shorts (reafirmar regra 1-10 imagens OU 1 vídeo)
          if (category === 'Shorts' && fileValidation) {
            const count = fileValidation.file_count;
            // Accept: carousel (1-5 images), single image, or single video
            if (!fileValidation.is_carousel && !fileValidation.is_single_video && !fileValidation.is_single_image) {
              setError('Para Shorts envie de 1 a 10 imagens (carousel) ou 1 vídeo único');
              toast.error('Para Shorts envie de 1 a 10 imagens (carousel) ou 1 vídeo único');
              clearInterval(progressInterval);
              return;
            }

            // If it's a carousel, ensure between 1 and 10 images (allowing 1 as valid)
            if (fileValidation.is_carousel && (count < 1 || count > 10)) {
              setError('Para Shorts envie de 1 a 10 imagens (carousel)');
              toast.error('Para Shorts envie de 1 a 10 imagens (carousel)');
              clearInterval(progressInterval);
              return;
            }

            // If it's a single video, ensure exactly 1 file
            if (fileValidation.is_single_video && count !== 1) {
              setError('Apenas 1 vídeo permitido para Shorts');
              toast.error('Apenas 1 vídeo permitido para Shorts');
              clearInterval(progressInterval);
              return;
            }

            // If it's a single image, ensure exactly 1 file
            if (fileValidation.is_single_image && count !== 1) {
              setError('Apenas 1 imagem deve ser enviada como imagem única para Shorts');
              toast.error('Apenas 1 imagem deve ser enviada como imagem única para Shorts');
              clearInterval(progressInterval);
              return;
            }
          }

          const { uploadPostFiles } = await import('@/services/posts');
          const uploadResult = await uploadPostFiles(selectedFiles, category);
          
          if (uploadResult.success && uploadResult.data) {
            postData.file_paths = uploadResult.data.file_paths;
            postData.file_names = uploadResult.data.file_names;
            postData.file_types = uploadResult.data.file_types;
            postData.file_sizes = uploadResult.data.file_sizes;
            
            // Adicionar duração se disponível
            if (uploadResult.data.durations && uploadResult.data.durations.length > 0) {
              postData.duration = uploadResult.data.durations[0];
            }
            
            console.log(`✅ Arquivos selecionados uploadados com sucesso para ${category}:`, {
              filesCount: uploadResult.data.file_paths.length,
              paths: uploadResult.data.file_paths,
              types: uploadResult.data.file_types
            });
            
            setUploadProgress(100);
          } else {
            console.error(`❌ Erro no upload dos arquivos selecionados para ${category}:`, uploadResult.error);
            setError(uploadResult.error || "Erro no upload dos arquivos");
            toast.error(uploadResult.error || "Erro no upload dos arquivos");
            return;
          }
        } catch (uploadError) {
          console.error(`❌ Erro inesperado no upload dos arquivos para ${category}:`, uploadError);
          setError("Erro inesperado no upload dos arquivos");
          toast.error("Erro inesperado no upload dos arquivos");
          return;
        } finally {
          clearInterval(progressInterval);
        }
      } else if (file && !contentUrl.trim()) {
        // ⚠️ COMPATIBILIDADE: Upload único (será removido na Fase 5)
        console.log(`📁 Fazendo upload de arquivo único (modo compatibilidade) para categoria ${category}:`, {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });
        
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
            // Converter para formato array para manter compatibilidade
            postData.file_paths = [uploadResult.data.path];
            postData.file_names = [uploadResult.data.file_name];
            postData.file_types = [uploadResult.data.file_type];
            postData.file_sizes = [uploadResult.data.file_size];
            
            console.log(`✅ Arquivo único uploadado e convertido para array para ${category}:`, {
              path: uploadResult.data.path,
              fileName: uploadResult.data.file_name,
              fileType: uploadResult.data.file_type,
              fileSize: uploadResult.data.file_size
            });
            
            // Adicionar duração se obtida
            if (uploadResult.data.duration) {
              postData.duration = uploadResult.data.duration;
              console.log(`⏱️ Duração obtida para ${category}:`, uploadResult.data.duration);
            }
            
            setUploadProgress(100);
          } else {
            console.error(`❌ Erro no upload do arquivo único para ${category}:`, uploadResult.error);
            setError(uploadResult.error || "Erro no upload do arquivo");
            toast.error(uploadResult.error || "Erro no upload do arquivo");
            return;
          }
        } catch (uploadError) {
          console.error(`❌ Erro inesperado no upload do arquivo para ${category}:`, uploadError);
          setError("Erro inesperado no upload do arquivo");
          toast.error("Erro inesperado no upload do arquivo");
          return;
        } finally {
          clearInterval(progressInterval);
        }
      }

  // Upload de thumbnail se fornecida (para Podcast, Artigo, Leitura, Vídeo, Áudio, Ferramentas e Quizzes)
  if ((category === "Podcast" || category === "Artigo" || category === "Leitura" || category === "Vídeo" || category === "Áudio" || category === "Ferramentas" || category === "Quizzes") && thumbnailFile) {
        console.log(`🖼️ Fazendo upload de thumbnail para categoria ${category}:`, {
          fileName: thumbnailFile.name,
          fileSize: thumbnailFile.size,
          fileType: thumbnailFile.type
        });
        
        try {
          const thumbnailUploadResult = await uploadFileForPost(thumbnailFile);
          
          if (thumbnailUploadResult.success && thumbnailUploadResult.data) {
            postData.thumbnail_url = thumbnailUploadResult.data.url;
            console.log(`✅ Thumbnail uploadada com sucesso para ${category}:`, thumbnailUploadResult.data.url);
          } else {
            console.error(`❌ Erro no upload da thumbnail para ${category}:`, thumbnailUploadResult.error);
            setError(thumbnailUploadResult.error || "Erro no upload da thumbnail");
            toast.error(thumbnailUploadResult.error || "Erro no upload da thumbnail");
            return;
          }
        } catch (thumbnailError) {
          console.error(`❌ Erro inesperado no upload da thumbnail para ${category}:`, thumbnailError);
          setError("Erro inesperado no upload da thumbnail");
          toast.error("Erro inesperado no upload da thumbnail");
          return;
        }
      }

      // Criar o post
      console.log(`📝 Criando post da categoria ${category} com dados:`, {
        title: postData.title,
        category: postData.category,
        hasDescription: !!postData.description,
        hasContent: !!postData.content,
        hasContentUrl: !!postData.content_url,
        hasFiles: !!postData.file_paths && postData.file_paths.length > 0,
        hasThumbnailUrl: !!postData.thumbnail_url,
        file_paths: postData.file_paths,
        file_names: postData.file_names,
        file_types: postData.file_types,
        thumbnail_url: postData.thumbnail_url
      });
      
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
        setContent(""); // Limpar conteúdo textual
        // Removido setReadingCategory pois não é mais necessário
        setContentUrl("");
        setCategory("Vídeo");
        setTags([]);
        setEmotions([]);
        setFile(null);
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setTagInput("");
        setSelectedReadingTags([]); // Limpar tags de leitura selecionadas
        setMinAge(12); // ✅ LIMPAR IDADE MÍNIMA
        setMediaMode('url'); // Resetar para modo URL
        
        // ✅ LIMPAR NOVOS ESTADOS DE ARQUIVOS MÚLTIPLOS
        setSelectedFiles([]);
        setFileValidation(null);
        setUploadedFilesData(null);

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

  // Function to add a tag
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

  // Function to detect content type based on URL
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

  // Function to render content preview
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

  // Check authentication loading
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

  // Check if the user has permission to access the CMS
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
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="max-w-6xl mx-auto mb-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
                Criar Novo Conteúdo
              </h1>
              <p className="text-gray-600 text-lg">
                Adicione um novo post ao seu CMS de forma simples e intuitiva
              </p>
            </div>
          </div>
          
          {/* Feedback messages */}
          <div className="max-w-6xl mx-auto mb-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-md shadow-sm">
                <div className="flex">
                  <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}
            
            {/* Warning for reading category without selected categories */}
            {category === 'Leitura' && selectedReadingTags.length === 0 && readingTags.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 px-4 py-3 rounded-md shadow-sm">
                <div className="flex">
                  <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="font-medium">
                    ⚠️ Selecione pelo menos uma categoria de leitura para continuar
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Main Form */}
          <div className="max-w-8xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Section 1: Basic Settings */}
                <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      1
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Configurações Básicas</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Categoria */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                          Categoria
                        </span>
                      </label>
                      {/* Custom dropdown with badge indicating app session */}
                      <CategoryDropdown
                        value={category}
                        onChange={(v) => setCategory(v)}
                      />
                    </div>

                    {/* Idade Mínima */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          Idade Mínima
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="minAge"
                            value="12"
                            checked={minAge === 12}
                            onChange={() => setMinAge(12)}
                            className="accent-blue-600 cursor-pointer"
                          />
                          <div>
                            <div className="font-medium text-gray-900">12+</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="minAge"
                            value="16"
                            checked={minAge === 16}
                            onChange={() => setMinAge(16)}
                            className="accent-blue-600 cursor-pointer"
                          />
                          <div>
                            <div className="font-medium text-gray-900">16+</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Main Content */}
                <div className="px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center mb-6">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      2
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Conteúdo Principal</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Título */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                          Título
                          {category !== 'Shorts' && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium bg-white shadow-sm"
                        placeholder="Escreva um título atrativo para o seu conteúdo..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required={category !== "Shorts"}
                      />
                    </div>

                    {/* Descrição */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                          Descrição
                          <span className="text-gray-500 ml-2 text-xs">(opcional)</span>
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Digite uma breve descrição do seu post (opcional - resumo/introdução)
                      </p>
                      <textarea
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium resize-none bg-white shadow-sm"
                        placeholder="Escreva uma descrição breve e atrativa..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Conteúdo Textual com Editor TipTap */}
                    {category !== "Shorts" && (
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            Conteúdo Textual
                            <span className="text-red-500 ml-1">*</span>
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          Digite o conteúdo principal do seu post (texto completo do artigo/post)
                        </p>
                        <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                          <TipTapEditor
                            initialHtml={content}
                            onChangeHtml={setContent}
                            placeholder="Escreva aqui o conteúdo principal do post..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: File Uploads */}
                <div className="px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center mb-6">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      3
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Arquivos e Mídia</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Conteúdo Principal */}
                    <div>
                      <label className="block text-sm font-medium mb-3 text-gray-700">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Conteúdo
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                      </label>
                      <p className="text-sm text-gray-600 mb-4">
                        <strong>Escolha uma das opções abaixo para adicionar o conteúdo do seu post.</strong>
                          <span className="block text-gray-500 mt-1">
                            💡 Você pode usar uma URL externa ou fazer upload de arquivos.
                          </span>
                      </p>
                      
                      {/* Seletor de Modo */}
                      <div className="mb-6">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Selecione o modo de conteúdo:</p>
                        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleMediaModeChange('url')}
                            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all ${
                              mediaMode === 'url'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                            </svg>
                            URL {mediaMode === 'url' && '✓'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMediaModeChange('file')}
                            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all ${
                              mediaMode === 'file'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <CloudUpload className="w-4 h-4 mr-2" />
                            Upload de Ficheiro {mediaMode === 'file' && '✓'}
                          </button>
                        </div>
                        
                        {/* Visual status of what's active */}
                        <div className="mt-2 text-xs">
                          {mediaMode === 'url' && contentUrl.trim() && (
                            <div className="text-green-600 font-medium">
                              ✅ URL configurada: {contentUrl.substring(0, 50)}...
                            </div>
                          )}
                          {mediaMode === 'file' && uploadedFilesData && uploadedFilesData.file_paths.length > 0 && (
                            <div className="text-green-600 font-medium">
                              ✅ {uploadedFilesData.file_paths.length} arquivo(s) carregado(s)
                            </div>
                          )}
                          {mediaMode === 'file' && file && (
                            <div className="text-green-600 font-medium">
                              ✅ Arquivo selecionado: {file.name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* URL Field */}
                      {mediaMode === 'url' && (
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">
                            URL do Conteúdo
                          </label>
                          <div className="relative rounded-lg border border-gray-300 bg-white">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <input
                              type="url"
                              className="block w-full pl-10 pr-4 py-3 border-0 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                              placeholder={
                                category === 'Shorts'
                                  ? "https://youtube.com/shorts/... ou https://instagram.com/reel/..."
                                  : "https://exemplo.com/conteudo"
                              }
                              value={contentUrl}
                              onChange={(e) => setContentUrl(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {/* ✅ NEW UNIFIED UPLOAD COMPONENT */}
                      {mediaMode === 'file' && (
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">
                            {category === 'Shorts' ? 'Upload de Arquivos (Carousel)' : 'Upload de Arquivo'}
                          </label>
                          <PostFileUploader
                            category={category}
                            onFilesChange={setSelectedFiles}
                            onValidationChange={setFileValidation}
                            onUploadComplete={setUploadedFilesData}
                            disabled={isUploading}
                            value={selectedFiles}
                          />
                        </div>
                      )}
                      
                      {/* Content preview for Shorts */}
                      {renderContentPreview()}
                    </div>

                    {/* Thumbnail upload (for Podcast, Article, Audio, Video, Reading, Tools and Quizzes) */}
                    {(category === "Podcast" || category === "Artigo" || category === "Leitura" || category === "Vídeo" || category === "Áudio" || category === "Ferramentas" || category === "Quizzes") && (
                      <div>
                        <label className="block text-sm font-medium mb-3 text-gray-700">
                          <span className="flex items-center">
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Thumbnail do {category}
                            <span className="text-gray-500 ml-2 text-xs">(opcional)</span>
                          </span>
                        </label>
                        <p className="text-sm text-gray-600 mb-4">
                          Faça upload de uma imagem para servir como thumbnail. 
                          Formatos aceitos: JPG, PNG, GIF. Máximo: 5MB.
                        </p>
                        <div className={`relative border-2 border-dashed rounded-xl transition-all ${
                          thumbnailFile 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                        }`}>
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleThumbnailChange}
                            accept="image/*"
                            disabled={isUploading}
                          />
                          <div className="flex flex-col items-center justify-center py-6 px-6">
                            {thumbnailFile ? (
                              <>
                                <div className="relative mb-4 max-w-md w-full">
                                  {thumbnailPreview && (
                                    <Image 
                                      src={thumbnailPreview} 
                                      alt="Preview da thumbnail selecionada" 
                                      width={448}
                                      height={320}
                                      className="w-full max-h-80 object-contain rounded-lg border-2 border-green-300 shadow-sm bg-gray-50"
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={removeThumbnail}
                                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                                    title="Remover imagem"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-green-700 text-center">
                                  <span className="font-medium">{thumbnailFile.name}</span>
                                  <br />
                                  <span className="text-sm text-green-600">
                                    {(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB
                                  </span>
                                </p>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-10 h-10 text-blue-500 mb-3" />
                                <p className="text-gray-700 text-center">
                                  <span className="font-medium">Clique para adicionar thumbnail</span>
                                  <br />
                                  <span className="text-sm text-gray-500">JPG, PNG, GIF até 5MB</span>
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>


            {category === 'Leitura' && (
              <div className="px-8 py-6 border-b border-gray-200">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Categorias de Leitura
                    <span className="text-red-500 ml-1">*</span>
                  </span>
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Selecione as categorias que melhor se adequam ao seu conteúdo de leitura.
                </p>
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="flex flex-wrap gap-2">
                    {readingTags.length === 0 ? (
                      <div className="w-full text-center py-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <p className="text-gray-600 font-medium mb-2">Nenhuma categoria cadastrada</p>
                        <p className="text-sm text-gray-500 mb-4">Crie uma nova categoria para organizar seus posts de leitura</p>
                        <button
                          type="button"
                          onClick={() => setShowCreateTagModal(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Criar Primeira Categoria
                        </button>
                      </div>
                    ) : (
                      readingTags.map(tag => (
                        <label 
                          key={tag.id} 
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all duration-200 text-sm font-medium hover:shadow-md" 
                          style={{ 
                            background: selectedReadingTags.includes(tag.id) ? (tag.color || '#3B82F6') : '#ffffff', 
                            color: selectedReadingTags.includes(tag.id) ? '#ffffff' : '#374151',
                            border: selectedReadingTags.includes(tag.id) ? 'none' : '2px solid #e5e7eb'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedReadingTags.includes(tag.id)}
                            onChange={() => setSelectedReadingTags(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                            className="sr-only"
                          />
                          <svg 
                            className={`w-4 h-4 transition-opacity ${selectedReadingTags.includes(tag.id) ? 'opacity-100' : 'opacity-0'}`} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {tag.name}
                        </label>
                      ))
                    )}
                  </div>
                  {readingTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCreateTagModal(true)}
                      className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Criar Nova Categoria
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Seção 4: Tags e Categorização */}
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                  4
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Tags e Categorização</h2>
              </div>

              <div className="space-y-6">
                {/* Tags Gerais */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      Tags
                      {category !== 'Shorts' && <span className="text-red-500 ml-1">*</span>}
                      {category === 'Shorts' && <span className="text-gray-500 ml-2 text-xs">(opcional)</span>}
                    </span>
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    {category === 'Leitura' 
                      ? 'Tags gerais para o post (além das categorias de leitura específicas)' 
                      : category === 'Shorts'
                      ? 'Adicione tags para facilitar a busca (opcional para Shorts)'
                      : 'Adicione tags que descrevam o conteúdo'
                    }
                  </p>

                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 transition-all"
                    placeholder="Adicione tags e pressione Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                  
                  {/* Exibir tags abaixo do input */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.length === 0 ? (
                      <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full flex items-center text-sm font-medium opacity-70 select-none pointer-events-none">
                        Nenhuma tag adicionada
                      </span>
                    ) : (
                      tags.map((tag) => (
                        <span key={tag} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center text-sm font-medium">
                          {tag}
                          <button 
                            type="button" 
                            className="ml-2 text-blue-600 hover:text-red-500 transition-colors" 
                            onClick={() => removeTag(tag)}
                            title="Remover tag"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Tags de Emoção */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                      </svg>
                      Tags de Emoção
                      <span className="text-red-500 ml-1">*</span>
                    </span>
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Selecione as emoções que o conteúdo desperta ou transmite.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {EMOTIONS.map((emotion) => (
                      <label key={emotion} className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={emotions.includes(emotion)}
                          onChange={() => handleEmotionChange(emotion)}
                          className="accent-blue-600 cursor-pointer"
                        />
                        <span className="text-gray-900 font-medium">{emotion}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 5: Ações */}
            <div className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Finalizar Criação</h2>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={(() => {
                      // Debug dos estados de arquivo
                      const hasContentUrl = !!contentUrl.trim();
                      const hasOldFile = !!file;
                      const hasUploadedFiles = uploadedFilesData && uploadedFilesData.file_paths.length > 0;
                      const hasSelectedFiles = selectedFiles.length > 0 && fileValidation?.valid;
                      
                      console.log('🔍 Debug do botão - Estados atuais:', {
                        hasContentUrl,
                        contentUrl: contentUrl.trim(),
                        hasOldFile,
                        fileName: file?.name,
                        hasUploadedFiles,
                        uploadedFilesCount: uploadedFilesData?.file_paths.length || 0,
                        uploadedFilesPaths: uploadedFilesData?.file_paths || [],
                        hasSelectedFiles,
                        selectedFilesCount: selectedFiles.length,
                        fileValidationValid: fileValidation?.valid,
                        mediaMode,
                        category,
                        isUploading,
                        title: title.trim(),
                        description: description.trim(),
                        content: content.trim(),
                        tagsCount: tags.length,
                        emotionsCount: emotions.length,
                        minAge
                      });
                      
                      return (
                        isUploading || 
                        (category !== "Shorts" && !title.trim()) ||
                        (category !== "Shorts" && !content.trim()) ||
                        (!hasContentUrl && !hasOldFile && !hasUploadedFiles && !hasSelectedFiles) ||
                        (category !== "Shorts" && tags.length === 0) ||
                        emotions.length === 0 ||
                        (category === "Leitura" && selectedReadingTags.length === 0) ||
                        (minAge !== 12 && minAge !== 16)
                      );
                    })()}
                    className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center"
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {uploadProgress > 0 ? `A fazer upload... ${uploadProgress}%` : "A enviar..."}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {(() => {
                          const hasContentUrl = !!contentUrl.trim();
                          const hasOldFile = !!file;
                          const hasUploadedFiles = uploadedFilesData && uploadedFilesData.file_paths.length > 0;
                          const hasSelectedFiles = selectedFiles.length > 0 && fileValidation?.valid;
                          
                          if (category !== "Shorts" && !title.trim()) return "Adicione um título";
                          if (category !== "Shorts" && !content.trim()) return "Adicione conteúdo textual";
                          if (!hasContentUrl && !hasOldFile && !hasUploadedFiles && !hasSelectedFiles) return "Adicione URL ou arquivo";
                          if (category !== "Shorts" && tags.length === 0) return "Adicione pelo menos uma tag";
                          if (emotions.length === 0) return "Selecione uma tag de emoção";
                          if (category === "Leitura" && selectedReadingTags.length === 0) return "Selecione uma categoria de leitura";
                          if (minAge !== 12 && minAge !== 16) return "Selecione uma idade mínima";
                          return "Criar Post";
                        })()}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  
    {/* Modal para criar nova categoria de leitura */}
    {showCreateTagModal && (
      <CreateReadingTagModal
        isOpen={showCreateTagModal}
        onClose={() => setShowCreateTagModal(false)}
        onSuccess={reloadReadingTags}
      />
    )}
  </CMSLayout>
  );
} 