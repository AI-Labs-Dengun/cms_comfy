"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import { getPost, deletePost, togglePostPublication, updatePost, Post } from "@/services/posts";
import { getFileUrl, getSignedUrl } from "@/services/storage";
import { useAuth } from "@/hooks/useAuth";

const emotionTags = [
  "Raiva",
  "Alegria", 
  "Inveja",
  "Medo",
  "Tristeza",
];

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
  
  // Estados para os campos editáveis
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContentUrl, setEditContentUrl] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editEmotionTags, setEditEmotionTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const postId = params.id as string;

  // Carregar post ao montar componente
  useEffect(() => {
    if (!authLoading && canAccessCMS && postId) {
      loadPost();
    }
  }, [authLoading, canAccessCMS, postId]);

  const loadPost = async () => {
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
  };

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
        alert('Post eliminado com sucesso!');
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

  // Modal de confirmação de exclusão
  const DeleteConfirmationModal = () => {
    if (!showDeleteModal || !post) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Tem certeza que deseja eliminar o post:
              </p>
              <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded border-l-4 border-red-400">
                "{post.title}"
              </p>
              <p className="text-red-600 text-sm mt-2 font-medium">
                ⚠️ Esta ação não pode ser desfeita.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar Definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Função para alternar publicação
  const handleTogglePublication = async () => {
    if (!post) return;

    const action = post.is_published ? 'despublicar' : 'publicar';
    const confirmAction = window.confirm(
      `Tem certeza que deseja ${action} o post "${post.title}"?`
    );

    if (!confirmAction) return;

    try {
      setPublishing(true);
      
      const response = await togglePostPublication(post.id, !post.is_published);
      
      if (response.success) {
        // Atualizar o estado local
        setPost(prev => prev ? { ...prev, is_published: !prev.is_published } : null);
        alert(response.message || `Post ${action}do com sucesso!`);
      } else {
        alert(response.error || `Erro ao ${action} post`);
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
        setPost(prev => prev ? {
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
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  // Função para alternar emotion tag
  const handleEmotionToggle = (emotion: string) => {
    setEditEmotionTags(prev =>
      prev.includes(emotion)
        ? prev.filter(e => e !== emotion)
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
              <img 
                src={fileUrl} 
                alt={post.title}
                className="max-w-full h-auto max-h-96 object-contain mx-auto"
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
                        <p class="text-sm">Erro ao carregar imagem</p>
                        <p class="text-xs text-gray-400 mt-1">${fileUrl}</p>
                        <a href="${fileUrl}" target="_blank" class="text-blue-600 text-xs hover:underline mt-2 inline-block">Tentar abrir em nova aba</a>
                      </div>
                    `;
                  }
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
              <img 
                src={url} 
                alt={post.title}
                className="max-w-full h-auto max-h-96 object-contain mx-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
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

      {/* Modal de Confirmação de Exclusão */}
      <DeleteConfirmationModal />
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
                      onClick={handleTogglePublication}
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
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      placeholder="Título do post"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 font-bold mb-1">Descrição</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      placeholder="Descrição do post"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 font-bold mb-1">URL do Conteúdo (opcional)</label>
                    <input
                      type="url"
                      value={editContentUrl}
                      onChange={(e) => setEditContentUrl(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      placeholder="https://exemplo.com/conteudo"
                    />
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
                    <div className="text-gray-900 font-medium">{post.description}</div>
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
                      onChange={(e) => setTagInput(e.target.value)}
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
                        editTags.map((tag, idx) => (
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
                            {post.tags.map((tag, idx) => (
                              <span key={idx} className="inline-block bg-gray-100 text-gray-900 rounded px-3 py-1 text-sm font-medium">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {post.emotion_tags.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 font-bold">Tags de Emoção</div>
                          <div className="flex flex-row gap-2 mt-1 flex-wrap">
                            {post.emotion_tags.map((emo, idx) => (
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
    </CMSLayout>
  );
} 