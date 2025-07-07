"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { getPost, deletePost, togglePostPublication, updatePost, Post } from "@/services/posts";
import { getFileUrl, getSignedUrl } from "@/services/storage";
import { useAuth } from "@/context/AuthContext";
import { DeleteConfirmationModal, PublishToggleModal } from "@/components/modals";
import Image from 'next/image';

const emotionTags = [
  "Raiva",
  "Alegria", 
  "Inveja",
  "Medo",
  "Tristeza",
];

// Componente do Editor Markdown
const MarkdownEditor = ({ value, onChange, placeholder }: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
}) => {
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setSelectionStart(e.target.selectionStart);
    setSelectionEnd(e.target.selectionEnd);
  };

  const handleTextAreaSelect = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSelectionStart(e.target.selectionStart);
    setSelectionEnd(e.target.selectionEnd);
  };

  const insertText = (before: string, after: string = "") => {
    const textArea = document.getElementById('markdown-editor-details') as HTMLTextAreaElement;
    if (!textArea) return;

    const beforeText = value.substring(0, selectionStart);
    const selectedText = value.substring(selectionStart, selectionEnd);
    const afterText = value.substring(selectionEnd);

    // Remover espaços desnecessários do texto selecionado para garantir formatação correta
    const trimmedSelectedText = selectedText.trim();
    
    // Se não há texto selecionado, apenas inserir os marcadores
    if (trimmedSelectedText === "") {
      const newText = beforeText + before + after + afterText;
      onChange(newText);
      
      // Posicionar cursor entre os marcadores
      setTimeout(() => {
        textArea.focus();
        const newCursorPos = selectionStart + before.length;
        textArea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
      return;
    }

    // Aplicar formatação ao texto trimmed
    const newText = beforeText + before + trimmedSelectedText + after + afterText;
    onChange(newText);

    // Restaurar foco e seleção
    setTimeout(() => {
      textArea.focus();
      const newCursorPos = selectionStart + before.length;
      textArea.setSelectionRange(newCursorPos, newCursorPos + trimmedSelectedText.length);
    }, 0);
  };

  const insertLine = (prefix: string) => {
    const textArea = document.getElementById('markdown-editor-details') as HTMLTextAreaElement;
    if (!textArea) return;

    const beforeText = value.substring(0, selectionStart);
    const selectedText = value.substring(selectionStart, selectionEnd);
    const afterText = value.substring(selectionEnd);

    // Se há texto selecionado, aplicar o prefixo ao texto selecionado
    if (selectedText.trim()) {
      const trimmedSelectedText = selectedText.trim();
      const newText = beforeText + prefix + trimmedSelectedText + afterText;
      onChange(newText);
      
      setTimeout(() => {
        textArea.focus();
        const newCursorPos = selectionStart + prefix.length;
        textArea.setSelectionRange(newCursorPos, newCursorPos + trimmedSelectedText.length);
      }, 0);
      return;
    }

    // Se não há texto selecionado, trabalhar com a linha atual
    const lines = value.split('\n');
    const currentLineIndex = value.substring(0, selectionStart).split('\n').length - 1;
    const currentLine = lines[currentLineIndex] || '';
    
    // Se a linha já tem o prefixo, remover. Senão, adicionar.
    if (currentLine.startsWith(prefix)) {
      lines[currentLineIndex] = currentLine.substring(prefix.length);
    } else {
      lines[currentLineIndex] = prefix + currentLine;
    }

    const newText = lines.join('\n');
    onChange(newText);

    // Restaurar foco
    setTimeout(() => {
      textArea.focus();
      const newCursorPos = selectionStart + (currentLine.startsWith(prefix) ? -prefix.length : prefix.length);
      textArea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {/* Barra de ferramentas */}
      <div className="bg-gray-100 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        {/* Títulos */}
        <button
          type="button"
          onClick={() => insertLine('# ')}
          className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
          title="Título H1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => insertLine('## ')}
          className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
          title="Título H2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertLine('### ')}
          className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
          title="Título H3"
        >
          H3
        </button>
        
        <div className="w-px h-6 bg-gray-400 mx-1"></div>
        
        {/* Formatação de texto */}
        <button
          type="button"
          onClick={() => insertText('**', '**')}
          className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
          title="Negrito"
        >
          <strong className="text-gray-900">B</strong>
        </button>
        <button
          type="button"
          onClick={() => insertText('*', '*')}
          className="px-2 py-1 text-xs italic bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
          title="Itálico"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => insertText('~~', '~~')}
          className="px-2 py-1 text-xs line-through bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
          title="Riscado"
        >
          S
        </button>
        
        <div className="w-px h-6 bg-gray-400 mx-1"></div>
        
        {/* Listas */}
        <button
          type="button"
          onClick={() => insertLine('- ')}
          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm font-medium"
          title="Lista com marcadores"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => insertLine('1. ')}
          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm font-medium"
          title="Lista numerada"
        >
          1.
        </button>
        
        <div className="w-px h-6 bg-gray-400 mx-1"></div>
        
        {/* Citação */}
        <button
          type="button"
          onClick={() => insertLine('> ')}
          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm font-medium"
          title="Citação"
        >
          &quot;
        </button>
        
        {/* Código */}
        <button
          type="button"
          onClick={() => insertText('`', '`')}
          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm font-mono"
          title="Código inline"
        >
          &lt;/&gt;
        </button>
      </div>
      
      {/* Área de texto */}
      <textarea
        id="markdown-editor-details"
        value={value}
        onChange={handleTextAreaChange}
        onSelect={handleTextAreaSelect}
        placeholder={placeholder}
        className="w-full px-3 py-2 focus:outline-none text-gray-900 font-medium resize-none"
        rows={6}
      />
    </div>
  );
};

export default function DetalhesConteudo() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  
  // Estados para os campos editáveis
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContentUrl, setEditContentUrl] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editEmotionTags, setEditEmotionTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const postId = params.id as string;

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getPost(postId);
      
      if (response.success && response.data) {
        setPost(response.data);
        // Inicializar valores de edição
        initializeEditValues(response.data);
        // Carregar URL do arquivo se existir
        if (response.data.file_path) {
          loadFileUrl(response.data.file_path);
        }
      } else {
        setError(response.error || 'Post não encontrado');
      }
    } catch (err) {
      setError('Erro inesperado ao carregar post');
      console.error('Erro ao carregar post:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  // Carregar post ao montar componente
  useEffect(() => {
    if (!authLoading && canAccessCMS && postId) {
      loadPost();
    }
  }, [authLoading, canAccessCMS, postId, loadPost]);

  // Função para carregar URL assinada do arquivo
  const loadFileUrl = async (filePath: string) => {
    try {
      setLoadingFile(true);
      
      const response = await getSignedUrl(filePath, 3600); // 1 hora
      
      if (response.success && response.url) {
        setFileUrl(response.url);
      } else {
        // Fallback para URL pública
        const publicUrl = getFileUrl(filePath);
        setFileUrl(publicUrl);
      }
    } catch (err) {
      console.error('Erro ao carregar URL do arquivo:', err);
      // Fallback para URL pública
      const publicUrl = getFileUrl(filePath);
      setFileUrl(publicUrl);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;

    try {
      setDeleting(true);
      
      const response = await deletePost(post.id);
      
      if (response.success) {
        setShowDeleteModal(false);
        router.push('/dashboard/management');
      } else {
        alert(response.error || 'Erro ao eliminar post');
      }
    } catch (err) {
      console.error('Erro ao eliminar post:', err);
      alert('Erro inesperado ao eliminar post');
    } finally {
      setDeleting(false);
    }
  };

  // Função para alternar publicação
  const handleTogglePublication = async () => {
    if (!post) return;

    try {
      setPublishing(true);
      
      const response = await togglePostPublication(post.id, !post.is_published);
      
      if (response.success) {
        // Atualizar o estado local
        setPost((prev: Post | null) => prev ? { ...prev, is_published: !prev.is_published } : null);
        setShowPublishModal(false);
      } else {
        alert(response.error || 'Erro ao alterar status de publicação');
      }
    } catch (err) {
      console.error('Erro ao alterar publicação:', err);
      alert('Erro inesperado ao alterar status de publicação');
    } finally {
      setPublishing(false);
    }
  };

  // Função para inicializar valores de edição
  const initializeEditValues = (postData: Post) => {
    setEditTitle(postData.title);
    setEditDescription(postData.description);
    setEditContentUrl(postData.content_url || "");
    setEditTags(postData.tags);
    setEditEmotionTags(postData.emotion_tags);
  };

  // Função para entrar em modo de edição
  const handleEdit = () => {
    if (post) {
      initializeEditValues(post);
      setIsEditing(true);
    }
  };

  // Função para cancelar edição
  const handleCancelEdit = () => {
    if (post) {
      initializeEditValues(post);
    }
    setIsEditing(false);
    setTagInput("");
  };

  // Função para salvar alterações
  const handleSaveEdit = async () => {
    if (!post) return;

    try {
      setSaving(true);

      const updateData = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        content_url: editContentUrl.trim() || undefined,
        tags: editTags,
        emotion_tags: editEmotionTags
      };

      const response = await updatePost(post.id, updateData);

      if (response.success) {
        // Atualizar o estado local
        setPost((prev: Post | null) => prev ? {
          ...prev,
          title: updateData.title,
          description: updateData.description,
          content_url: updateData.content_url,
          tags: updateData.tags,
          emotion_tags: updateData.emotion_tags,
          updated_at: new Date().toISOString()
        } : null);
        
        setIsEditing(false);
        alert('Post atualizado com sucesso!');
      } else {
        alert(response.error || 'Erro ao atualizar post');
      }
    } catch (err) {
      console.error('Erro ao salvar edição:', err);
      alert('Erro inesperado ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  // Função para adicionar tag
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      if (!editTags.includes(tagInput.trim())) {
        setEditTags([...editTags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  // Função para remover tag
  const removeTag = (tagToRemove: string) => {
    setEditTags(editTags.filter((tag: string) => tag !== tagToRemove));
  };

  // Função para alternar emotion tag
  const handleEmotionToggle = (emotion: string) => {
    setEditEmotionTags((prev: string[]) =>
      prev.includes(emotion)
        ? prev.filter((e: string) => e !== emotion)
        : [...prev, emotion]
    );
  };

  // Formatação de data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Formatação de tamanho de arquivo
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Componente para renderizar conteúdo baseado no tipo
  const renderContent = () => {
    if (!post) return null;

    // Se tem arquivo local
    if (post.file_path && post.file_type) {
      const fileType = post.file_type.toLowerCase();
      
      // Se ainda está carregando a URL do arquivo
      if (loadingFile) {
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Carregando conteúdo...</div>
            <div className="border rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Preparando arquivo para visualização...</p>
            </div>
          </div>
        );
      }

      // Se não conseguiu carregar a URL do arquivo
      if (!fileUrl) {
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Arquivo não disponível para visualização</div>
            <div className="border rounded-lg p-8 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Arquivo carregado mas não visualizável</p>
              <p className="text-xs text-gray-400 mt-1">Arquivo: {post.file_name}</p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => loadFileUrl(post.file_path!)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 mr-2"
                >
                  Tentar carregar novamente
                </button>
                <button
                  onClick={() => {
                    const publicUrl = getFileUrl(post.file_path!);
                    window.open(publicUrl, '_blank');
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                >
                  Tentar URL pública
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Imagens
      if (fileType.startsWith('image/')) {
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Pré-visualização</div>
            <div className="border rounded-lg overflow-hidden">
              <Image 
                src={fileUrl} 
                alt={post.title}
                className="max-w-full h-auto max-h-96 object-contain mx-auto"
                width={600}
                height={400}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  // Mostrar informações de erro
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="p-8 text-center text-gray-500">
                        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <p class="text-sm font-medium mb-2">Erro ao carregar imagem</p>
                        <p class="text-xs text-gray-400 mb-4">A imagem pode estar temporariamente indisponível</p>
                        <div class="space-y-2">
                          <a href="${fileUrl}" target="_blank" class="text-blue-600 text-xs hover:underline block">Tentar abrir em nova aba</a>
                          <button onclick="window.location.reload()" class="text-blue-600 text-xs hover:underline block">Recarregar página</button>
                        </div>
                      </div>
                    `;
                  }
                }}
                onLoad={() => {
                  console.log('✅ Imagem carregada com sucesso:', fileUrl);
                }}
              />
            </div>
          </div>
        );
      }

      // Vídeos
      if (fileType.startsWith('video/')) {
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Reprodução de Vídeo</div>
            <div className="border rounded-lg overflow-hidden">
              <video 
                controls 
                className="max-w-full h-auto max-h-96 mx-auto"
                preload="metadata"
              >
                <source src={fileUrl} type={fileType} />
                Seu navegador não suporta reprodução de vídeo.
              </video>
            </div>
          </div>
        );
      }

      // Áudios
      if (fileType.startsWith('audio/')) {
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Reprodução de Áudio</div>
            <div className="border rounded-lg p-4">
              <audio 
                controls 
                className="w-full"
                preload="metadata"
              >
                <source src={fileUrl} type={fileType} />
                Seu navegador não suporta reprodução de áudio.
              </audio>
            </div>
          </div>
        );
      }

      // PDFs
      if (fileType === 'application/pdf') {
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Documento PDF</div>
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={fileUrl}
                className="w-full h-96"
                title={`PDF: ${post.title}`}
              />
            </div>
            <div className="mt-2">
              <a 
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Abrir PDF em nova aba
              </a>
            </div>
          </div>
        );
      }

      // Outros tipos de arquivo
      return (
        <div className="mb-6">
          <div className="text-xs text-gray-500 font-bold mb-2">Arquivo</div>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <div className="font-medium text-gray-900">{post.file_name}</div>
                <div className="text-sm text-gray-500">{post.file_type} • {formatFileSize(post.file_size)}</div>
              </div>
            </div>
            <div className="mt-3">
              <a 
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 inline-block"
              >
                Download / Ver arquivo
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Se tem URL externa
    if (post.content_url) {
      // Tentar detectar se é um link do YouTube, Vimeo, etc.
      const url = post.content_url;
      
      // YouTube
      const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      if (youtubeMatch) {
        const videoId = youtubeMatch[1];
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Vídeo do YouTube</div>
            <div className="border rounded-lg overflow-hidden aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                title={post.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        );
      }

      // Vimeo
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        const videoId = vimeoMatch[1];
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Vídeo do Vimeo</div>
            <div className="border rounded-lg overflow-hidden aspect-video">
              <iframe
                src={`https://player.vimeo.com/video/${videoId}`}
                className="w-full h-full"
                title={post.title}
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        );
      }

      // URLs de imagem (terminam com extensões de imagem)
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
      if (imageExtensions.test(url)) {
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Imagem Externa</div>
            <div className="border rounded-lg overflow-hidden">
              <Image 
                src={url} 
                alt={post.title}
                className="max-w-full h-auto max-h-96 object-contain mx-auto"
                width={600}
                height={400}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  // Mostrar informações de erro
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="p-8 text-center text-gray-500">
                        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <p class="text-sm font-medium mb-2">Erro ao carregar imagem externa</p>
                        <p class="text-xs text-gray-400 mb-4">A URL pode estar indisponível ou bloqueada</p>
                        <div class="space-y-2">
                          <a href="${url}" target="_blank" class="text-blue-600 text-xs hover:underline block">Tentar abrir em nova aba</a>
                          <button onclick="window.location.reload()" class="text-blue-600 text-xs hover:underline block">Recarregar página</button>
                        </div>
                      </div>
                    `;
                  }
                }}
                onLoad={() => {
                  console.log('✅ Imagem externa carregada com sucesso:', url);
                }}
              />
            </div>
          </div>
        );
      }

      // URL genérica
      return (
        <div className="mb-6">
          <div className="text-xs text-gray-500 font-bold mb-2">Link Externo</div>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <div>
                <div className="font-medium text-gray-900">Conteúdo Externo</div>
                <div className="text-sm text-gray-500 break-all">{url}</div>
              </div>
            </div>
            <div className="mt-3">
              <a 
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 inline-block"
              >
                Visitar link
              </a>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Verificações de segurança
  if (authLoading) {
    return (
      <CMSLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando autenticação...</p>
          </div>
        </div>
      </CMSLayout>
    );
  }

  if (!isAuthenticated || !canAccessCMS) {
    router.push('/login');
    return null;
  }

  return (
    <CMSLayout>
      <div className="flex flex-col items-center justify-center py-12 px-8">
        <div className="w-full max-w-4xl flex flex-col items-center relative">
          {/* Header com Back Button e Action Buttons */}
          <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
            {/* Back Button */}
            <button
              onClick={() => {
                if (isEditing) {
                  const hasChanges = 
                    editTitle !== post?.title ||
                    editDescription !== post?.description ||
                    editContentUrl !== (post?.content_url || "") ||
                    JSON.stringify(editTags) !== JSON.stringify(post?.tags) ||
                    JSON.stringify(editEmotionTags) !== JSON.stringify(post?.emotion_tags);
                  
                  if (hasChanges) {
                    const confirmLeave = window.confirm(
                      "Tem alterações não guardadas. Tem certeza que deseja sair sem guardar?"
                    );
                    if (!confirmLeave) return;
                  }
                }
                router.push('/dashboard/management');
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium shadow cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar
            </button>

            {/* Action Buttons */}
            {!loading && !error && post && (
              <div className="flex gap-2 flex-wrap sm:flex-nowrap justify-center sm:justify-end">
                {isEditing ? (
                  <>
                    {/* Botões de edição */}
                    <button 
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="bg-gray-500 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      title="Cancelar edição"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancelar
                    </button>
                    
                    <button 
                      onClick={handleSaveEdit}
                      disabled={saving || !editTitle.trim() || !editDescription.trim()}
                      className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Salvar alterações"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Salvar
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Botão Excluir */}
                    <button 
                      onClick={() => setShowDeleteModal(true)}
                      disabled={deleting || publishing}
                      className="bg-red-600 text-white px-4 py-2 rounded-md font-medium hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      title="Eliminar post"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar
                    </button>

                    {/* Botão Editar */}
                    <button 
                      onClick={handleEdit}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-2"
                      title="Editar post"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>

                    {/* Botão Publicar/Despublicar */}
                    <button 
                      onClick={() => setShowPublishModal(true)}
                      disabled={publishing}
                      className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                        post.is_published 
                          ? 'bg-orange-600 text-white hover:bg-orange-700' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      title={post.is_published ? 'Despublicar post' : 'Publicar post'}
                    >
                      {publishing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processando...
                        </>
                      ) : (
                        <>
                          {post.is_published ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                          {post.is_published ? 'Despublicar' : 'Publicar'}
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="mb-6 w-full text-center">
            <h1 className="text-2xl font-bold mb-1 text-gray-900 text-center flex items-center justify-center gap-2" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
              {isEditing ? (
                <>
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar Conteúdo
                </>
              ) : (
                "Detalhes do Conteúdo"
              )}
            </h1>
            <div className="text-sm text-gray-500 font-medium">
              {isEditing 
                ? "Modifique as informações do conteúdo e salve as alterações."
                : "Visualize e gerencie os detalhes do conteúdo selecionado."
              }
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
              <span className="text-gray-600">Carregando post...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 w-full max-w-3xl">
              <div className="flex">
                <div className="text-red-800">
                  <p className="font-medium">Erro ao carregar post</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={loadPost}
                  className="ml-auto bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {/* Post Content */}
          {!loading && !error && post && (
            <div className="mb-8 w-full">
              <div className="font-bold text-gray-900 mb-4 text-lg">Informações do Conteúdo</div>
              
              {/* Basic Info */}
              {isEditing ? (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 font-bold mb-1">Título</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      placeholder="Título do post"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 font-bold mb-1">Descrição</label>
                    <MarkdownEditor
                      value={editDescription}
                      onChange={setEditDescription}
                      placeholder="Descrição do post usando markdown..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use os botões acima para formatar o texto ou digite diretamente em markdown
                    </p>
                    
                    {/* Prévia do Markdown */}
                    {editDescription.trim() && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                        <div className="text-xs text-gray-500 font-bold mb-2">Prévia da formatação:</div>
                        <div className="bg-white p-3 rounded border">
                          <MarkdownRenderer content={editDescription} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 font-bold mb-1">URL do Conteúdo (opcional)</label>
                    <div className="relative">
                      <input
                        type="url"
                        value={editContentUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditContentUrl(e.target.value)}
                        className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium ${post?.file_path ? 'bg-gray-100 opacity-50' : ''}`}
                        placeholder={post?.file_path ? "Este post tem ficheiro anexado" : "https://exemplo.com/conteudo"}
                        disabled={!!post?.file_path}
                      />
                      {post?.file_path && (
                        <div className="mt-1 text-xs text-gray-500">
                          ⚠️ Este post tem um ficheiro anexado. Não é possível adicionar URL externa.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 font-bold">Título</div>
                    <div className="text-gray-900 font-bold whitespace-pre-line">{post.title}</div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 font-bold">Descrição</div>
                    <div className="text-gray-900">
                      <MarkdownRenderer content={post.description} />
                    </div>
                  </div>
                </>
              )}

              <div className="my-6 border-b border-gray-200" />

              {/* Renderizar conteúdo do post */}
              {renderContent()}

              <div className="my-6 border-b border-gray-200" />

              {/* Metadata */}
              <div className="flex flex-row gap-8 mb-4 flex-wrap">
                <div>
                  <div className="text-xs text-gray-500 font-bold">Categoria</div>
                  <div className="text-gray-900 font-medium">{post.category}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 font-bold">Data de Criação</div>
                  <div className="text-gray-900 font-medium">{formatDate(post.created_at)}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 font-bold">Status</div>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    post.is_published 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {post.is_published ? 'Publicado' : 'Rascunho'}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 font-bold">Visualizações</div>
                  <div className="text-gray-900 font-medium">{post.view_count}</div>
                </div>
              </div>

              {/* File Info - apenas informações técnicas */}
              {post.file_name && (
                <>
                  <div className="flex flex-row gap-8 mb-4 flex-wrap">
                    <div>
                      <div className="text-xs text-gray-500 font-bold">Nome do Arquivo</div>
                      <div className="text-gray-900 font-medium">{post.file_name}</div>
                    </div>
                    
                    {post.file_size && (
                      <div>
                        <div className="text-xs text-gray-500 font-bold">Tamanho do Arquivo</div>
                        <div className="text-gray-900 font-medium">{formatFileSize(post.file_size)}</div>
                      </div>
                    )}

                    {post.file_type && (
                      <div>
                        <div className="text-xs text-gray-500 font-bold">Tipo de Arquivo</div>
                        <div className="text-gray-900 font-medium">{post.file_type}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* URL externa - apenas para referência */}
              {post.content_url && !post.file_name && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 font-bold">URL do Conteúdo</div>
                  <div className="text-gray-600 text-sm break-all">{post.content_url}</div>
                </div>
              )}

              <div className="my-6 border-b border-gray-200" />

              {/* Tags */}
              {isEditing ? (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 font-bold mb-1">Tags</label>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      placeholder="Digite uma tag e pressione Enter"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {editTags.length === 0 ? (
                        <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-sm font-medium opacity-80">
                          Nenhuma tag adicionada
                        </span>
                      ) : (
                        editTags.map((tag: string, idx: number) => (
                          <span key={idx} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full flex items-center text-sm font-medium">
                            {tag}
                            <button 
                              type="button" 
                              className="ml-2 text-gray-500 hover:text-red-500"
                              onClick={() => removeTag(tag)}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 font-bold mb-1">Tags de Emoção</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {emotionTags.map((emotion) => (
                        <label key={emotion} className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                          <input
                            type="checkbox"
                            checked={editEmotionTags.includes(emotion)}
                            onChange={() => handleEmotionToggle(emotion)}
                            className="accent-blue-600 cursor-pointer"
                          />
                          {emotion}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {(post.tags.length > 0 || post.emotion_tags.length > 0) && (
                    <>
                      {post.tags.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 font-bold">Tags</div>
                          <div className="flex flex-row gap-2 mt-1 flex-wrap">
                            {post.tags.map((tag: string, idx: number) => (
                              <span key={idx} className="inline-block bg-gray-100 text-gray-900 rounded px-3 py-1 text-sm font-medium">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {post.emotion_tags.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 font-bold">Tags de Emoção</div>
                          <div className="flex flex-row gap-2 mt-1 flex-wrap">
                            {post.emotion_tags.map((emo: string, idx: number) => (
                              <span key={idx} className="inline-block bg-blue-100 text-blue-900 rounded px-3 py-1 text-sm font-medium">{emo}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Informação sobre Storage */}
              {post.file_path && !fileUrl && !loadingFile && (
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Informação sobre Storage</h4>
                  <p className="text-xs text-blue-700 mb-2">
                    Se os arquivos não estão a ser exibidos, pode ser necessário configurar o bucket do Supabase como público.
                  </p>
                  <p className="text-xs text-blue-600">
                    Consulte a documentação em <code>md/SUPABASE_STORAGE_GUIDE.md</code> para mais detalhes.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals de Confirmação */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Eliminar Conteúdo"
        message={`Tem certeza que deseja eliminar o conteúdo "${post?.title}"?`}
        isLoading={deleting}
      />

      <PublishToggleModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={handleTogglePublication}
        isPublished={post?.is_published || false}
        title={post?.title || ""}
        isLoading={publishing}
      />
    </CMSLayout>
  );
} 