"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import FlexibleRenderer from "@/components/FlexibleRenderer";
import { getPost, deletePost, togglePostPublication, updatePost, Post, getTagsForPost, getAllReadingTags, associateTagWithPost, removeTagFromPost, uploadFileForPost, uploadPostFiles, CreatePostData } from "@/services/posts";
import { getFileUrl, getSignedUrl } from "@/services/storage";
import { useAuth } from "@/context/AuthContext";
import { DeleteConfirmationModal, PublishToggleModal } from "@/components/modals";
import { toast } from 'react-hot-toast';
import { supabase } from "@/lib/supabase";
import Image from 'next/image';

import { EMOTIONS } from '@/lib/emotions';
import TipTapEditor from '@/components/TipTapEditor';
// import MarkdownEditor from '@/components/MarkdownEditor';

// Valida se uma string é uma URL válida (absoluta ou relativa do Supabase)
const isValidUrl = (src?: string | null) => {
  if (!src) return false;
  
  // Se começa com http ou https, tenta validar como URL absoluta
  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      new URL(src);
      return true;
    } catch {
      return false;
    }
  }
  
  // Para URLs do Supabase que podem começar com / ou serem relativas
  // Considera válida se não for uma string vazia e parecer um caminho
  return src.trim().length > 0 && !src.includes(' ');
};

// Simple TikTok embed helper - keeps component lightweight and predictable
const TikTokEmbed = ({ videoId }: { videoId: string }) => {
  // Use a simple iframe for embeds; some TikTok embeds require scripts but iframe works for many cases
  return (
    <div className="w-full flex justify-center">
      <iframe
        src={`https://www.tiktok.com/embed/${videoId}`}
        className="w-full h-full min-h-[600px]"
        title={`TikTok ${videoId}`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

// removed inline MarkdownEditor (now using src/components/MarkdownEditor)

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
  // success notification is handled by global HotToaster (react-hot-toast)
  
  // Estados para os campos editáveis
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState(""); // ✅ ADICIONANDO ESTADO PARA CONTENT
  const [editContentUrl, setEditContentUrl] = useState("");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState(""); // ✅ ADICIONANDO ESTADO PARA THUMBNAIL
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [uploadThumbnailError, setUploadThumbnailError] = useState<string | null>(null);
  const [requestRemoveThumbnail, setRequestRemoveThumbnail] = useState(false);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editEmotionTags, setEditEmotionTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [readingTags, setReadingTags] = useState<{id: string, name: string, color?: string}[]>([]);
  // ====== STATES TO MANAGE EXISTING / NEW FILES WHEN EDITING (SHORTS) ======
  const [editExistingFiles, setEditExistingFiles] = useState<Array<{ path: string; name?: string; type?: string; size?: number }>>([]);
  const [newSelectedFiles, setNewSelectedFiles] = useState<File[]>([]);
  const [newSelectedPreviews, setNewSelectedPreviews] = useState<string[]>([]);
  const [fileEditError, setFileEditError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  // States for image reordering
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [draggedImageType, setDraggedImageType] = useState<'existing' | 'new' | null>(null);
  const [draggedImageAbsIndex, setDraggedImageAbsIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  
  // ✅ NOVOS ESTADOS PARA GERENCIAR TAGS DE LEITURA
  const [allReadingTags, setAllReadingTags] = useState<{id: string, name: string, color?: string}[]>([]);
  const [selectedReadingTagIds, setSelectedReadingTagIds] = useState<string[]>([]);
  const [loadingReadingTags, setLoadingReadingTags] = useState(false);
  
  // ✅ ESTADO PARA IDADE MÍNIMA
  const [editMinAge, setEditMinAge] = useState<number>(12);
  
  // ✅ NOVOS ESTADOS PARA EDIÇÃO DE CONTEÚDO DE IMAGEM
  const [isUploadingContentImage, setIsUploadingContentImage] = useState(false);
  const [uploadContentImageError, setUploadContentImageError] = useState<string | null>(null);
  const [requestRemoveContentImage, setRequestRemoveContentImage] = useState(false);

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
        // Carregar URL do arquivo se existir (usar file_paths[0] se disponível)
        const firstPath = response.data.file_paths && response.data.file_paths.length > 0 ? response.data.file_paths[0] : null;
        if (firstPath) {
          loadFileUrl(firstPath);
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

  // Carregar categorias de leitura se for post de leitura
  useEffect(() => {
    if (post && post.category === 'Leitura') {
      console.log('🔍 Carregando categorias de leitura para post:', post.id);
      console.log('📋 Categoria de leitura do post:', post.categoria_leitura);
      
      // Tentar carregar tags associadas
      getTagsForPost(post.id)
        .then((tags) => {
          console.log('🏷️ Tags carregadas:', tags);
          setReadingTags(tags);
          // ✅ INICIALIZAR TAG SELECIONADA (apenas a primeira)
          setSelectedReadingTagIds(tags.length > 0 ? [tags[0].id] : []);
        })
        .catch((error) => {
          console.error('❌ Erro ao carregar tags:', error);
          console.log('📝 Usando categoria_leitura do post como fallback');
          setReadingTags([]);
          setSelectedReadingTagIds([]);
        });
    } else {
      setReadingTags([]);
      setSelectedReadingTagIds([]);
    }
  }, [post]);

  // ✅ CARREGAR TODAS AS CATEGORIAS DE LEITURA DISPONÍVEIS
  useEffect(() => {
    if (post && post.category === 'Leitura' && isEditing) {
      setLoadingReadingTags(true);
      getAllReadingTags()
        .then((tags) => {
          console.log('📚 Todas as categorias de leitura carregadas:', tags);
          setAllReadingTags(tags);
        })
        .catch((error) => {
          console.error('❌ Erro ao carregar todas as categorias:', error);
          setAllReadingTags([]);
        })
        .finally(() => {
          setLoadingReadingTags(false);
        });
    }
  }, [post, isEditing]);

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

    // Verificar se o post está publicado
    if (post.is_published) {
      toast.error('Este post está publicado. Despublique-o primeiro antes de eliminá-lo.');
      setShowDeleteModal(false);
      return;
    }

    try {
      setDeleting(true);
      
      const response = await deletePost(post.id);
      
      if (response.success) {
        setShowDeleteModal(false);
        toast.success('Conteúdo eliminado com sucesso');
        router.push('/dashboard/management');
      } else {
        toast.error(response.error || 'Erro ao eliminar post');
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
        toast.success(response.message || 'Status de publicação alterado com sucesso');
      } else {
        toast.error(response.error || 'Erro ao alterar status de publicação');
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
    setEditContent(postData.content || ""); 
    setEditContentUrl(postData.content_url || "");
    setEditThumbnailUrl(postData.thumbnail_url || ""); 
    setEditTags(postData.tags);
    setEditEmotionTags(postData.emotion_tags);
    setEditMinAge(postData.min_age || 12); 
    
    // Reset thumbnail states
    setRequestRemoveThumbnail(false);
    setUploadThumbnailError(null);
    setIsUploadingThumbnail(false);
    
    // Reset content image states
    setRequestRemoveContentImage(false);
    setUploadContentImageError(null);
    setIsUploadingContentImage(false);
    
    // ✅ INICIALIZAR TAG DE LEITURA SELECIONADA (apenas a primeira)
    if (postData.category === 'Leitura') {
      getTagsForPost(postData.id)
        .then((tags) => {
          setSelectedReadingTagIds(tags.length > 0 ? [tags[0].id] : []);
        })
        .catch(() => {
          setSelectedReadingTagIds([]);
        });
    }
      // Initialize existing files state so the editor can remove/add files
      if (postData.file_paths && postData.file_paths.length > 0) {
        const files = postData.file_paths.map((p, i) => ({
          path: p,
          name: postData.file_names?.[i],
          type: postData.file_types?.[i],
          size: postData.file_sizes?.[i]
        }));
        setEditExistingFiles(files);
      } else {
        setEditExistingFiles([]);
      }
      // reset new selected files
      setNewSelectedFiles([]);
      setNewSelectedPreviews([]);
      setFileEditError(null);
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
    if (post && post.category === 'Leitura') {
      getTagsForPost(post.id)
        .then((tags) => {
          setSelectedReadingTagIds(tags.length > 0 ? [tags[0].id] : []);
        })
        .catch(() => {
          setSelectedReadingTagIds([]);
        });
    }
      // revoke previews when canceling
    newSelectedPreviews.forEach(url => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } });
      setNewSelectedPreviews([]);
      setNewSelectedFiles([]);
  };

    // cleanup object URLs on unmount
    useEffect(() => {
      return () => {
        newSelectedPreviews.forEach(url => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  const handleReadingTagSelect = (tagId: string) => {
    setSelectedReadingTagIds([tagId]); // Apenas uma tag selecionada
  };

  // Função para salvar alterações
  const handleSaveEdit = async () => {
    if (!post) return;

    try {
      setSaving(true);

      // Validar que Shorts não pode ter conteúdo textual
      if (post.category === "Shorts" && editContent.trim()) {
        alert("Posts da categoria Shorts não podem ter conteúdo textual");
        setSaving(false);
        return;
      }

      // Validar idade mínima
      if (editMinAge !== 12 && editMinAge !== 16) {
        alert("Idade mínima deve ser 12 ou 16");
        setSaving(false);
        return;
      }

    // For Shorts we want to explicitly clear title/description when the user
    // erased them. Sending null signals the backend to remove the value. For
    // other categories we keep previous behavior (send trimmed strings or
    // undefined to not change).
    type UpdateData = Omit<Partial<CreatePostData>, 'title' | 'description' | 'thumbnail_url'> & {
      title?: string | null;
      description?: string | null;
      thumbnail_url?: string | null;
    };

    const updateData: UpdateData = {
        title:
          post.category === 'Shorts'
            ? (editTitle.trim() === '' ? null : editTitle.trim())
            : (editTitle.trim() || undefined),
        description:
          post.category === 'Shorts'
            ? (editDescription.trim() === '' ? null : editDescription.trim())
            : (editDescription.trim() || undefined),
        // Shorts must not have textual content; sending undefined means no change
        content: post.category === 'Shorts' ? undefined : (editContent.trim() || undefined),
        content_url: editContentUrl.trim() || undefined,
        thumbnail_url: requestRemoveThumbnail ? null : (editThumbnailUrl.trim() || undefined),
        tags: editTags,
        emotion_tags: editEmotionTags,
        min_age: editMinAge,
        category: post.category as 'Vídeo' | 'Podcast' | 'Artigo' | 'Livro' | 'Áudio' | 'Shorts' | 'Leitura' | 'Ferramentas' | 'Quizzes',
      };
  // Convert to the service's expected type: CreatePostData.title/description
  // do not pass null (service expects string | undefined). Map null -> '' to signal removal.
  const payload: Partial<CreatePostData> = {
    ...updateData as Partial<CreatePostData>,
    title: updateData.title === null ? '' : (updateData.title ?? undefined),
    description: updateData.description === null ? '' : (updateData.description ?? undefined),
  };

    // If editing Shorts, we may need to upload new files and compose file arrays
    if (post.category === 'Shorts') {
      // Validate counts and types before sending
      const remainingExisting = editExistingFiles || [];
      const totalCount = remainingExisting.length + newSelectedFiles.length;

      // If there's any video among existing or new, require exactly 1 file and it must be a video
      const existingHasVideo = remainingExisting.some(f => f.type && f.type.startsWith('video/'));
      const newHasVideo = newSelectedFiles.some(f => f.type.startsWith('video/'));
      if (existingHasVideo || newHasVideo) {
        if (totalCount !== 1) {
          setSaving(false);
          alert('Se o post for um vídeo Shorts deve conter exatamente 1 ficheiro de vídeo.');
          return;
        }
      } else {
        // image carousel: must have between 1 and 5 images
        if (totalCount < 1 || totalCount > 5) {
          setSaving(false);
          alert('Shorts (imagens) devem conter entre 1 e 5 imagens.');
          return;
        }
      }

      // Upload newSelectedFiles if any
      let uploadedData: { file_paths: string[]; file_names: string[]; file_types: string[]; file_sizes: number[] } | null = null;
      if (newSelectedFiles.length > 0) {
        try {
          const uploadResult = await uploadPostFiles(newSelectedFiles, post.category);
          if (!uploadResult.success || !uploadResult.data) {
            setSaving(false);
            alert(uploadResult.error || 'Erro ao upload dos novos ficheiros');
            return;
          }
          uploadedData = uploadResult.data;
        } catch (err) {
          console.error('Erro ao fazer upload dos novos ficheiros:', err);
          setSaving(false);
          alert('Erro inesperado ao fazer upload dos novos ficheiros');
          return;
        }
      }

        // Build final arrays: start with remaining existing files, then append uploaded ones
      const finalFilePaths: string[] = [];
      const finalFileNames: string[] = [];
      const finalFileTypes: string[] = [];
      const finalFileSizes: number[] = [];

      // Existing files keep their metadata (paths are server-side)
      for (const f of remainingExisting) {
        finalFilePaths.push(f.path);
        if (f.name) finalFileNames.push(f.name);
        if (f.type) finalFileTypes.push(f.type);
        if (typeof f.size === 'number') finalFileSizes.push(f.size);
      }

      if (uploadedData) {
        finalFilePaths.push(...uploadedData.file_paths);
        finalFileNames.push(...uploadedData.file_names);
        finalFileTypes.push(...uploadedData.file_types);
        finalFileSizes.push(...uploadedData.file_sizes);
      }

      // Attach file arrays to payload (updatePost expects arrays for file fields)
      // payload is typed below to optionally include these arrays
      payload.file_paths = finalFilePaths;
      payload.file_names = finalFileNames;
      payload.file_types = finalFileTypes;
      payload.file_sizes = finalFileSizes;
    } else if ((post.category === 'Ferramentas' || post.category === 'Quizzes' || post.category === 'Artigo' || post.category === 'Leitura') && requestRemoveContentImage) {
      // ✅ LÓGICA PARA REMOVER IMAGEM DE CONTEÚDO PARA FERRAMENTAS, QUIZZES, ARTIGOS E LEITURA
      payload.file_paths = [];
      payload.file_names = [];
      payload.file_types = [];
      payload.file_sizes = [];
    } else if ((post.category === 'Ferramentas' || post.category === 'Quizzes' || post.category === 'Artigo' || post.category === 'Leitura') && editExistingFiles.length > 0) {
      // ✅ LÓGICA PARA ATUALIZAR IMAGEM DE CONTEÚDO PARA FERRAMENTAS, QUIZZES, ARTIGOS E LEITURA
      payload.file_paths = editExistingFiles.map(f => f.path);
      payload.file_names = editExistingFiles.map(f => f.name || '');
      payload.file_types = editExistingFiles.map(f => f.type || '');
      payload.file_sizes = editExistingFiles.map(f => f.size || 0);
    }

    const response = await updatePost(post.id, payload);

    if (response.success) {
        // If server returned the updated post, prefer it (ensures ordering and other server-side changes are reflected)
        if (response.data && typeof response.data === 'object') {
          try {
            setPost(response.data as Post);
          } catch {
            // fallback to safe merge
            setPost((prev: Post | null) => prev ? ({ ...prev, ...(response.data as Partial<Post>) }) : (response.data as Post));
          }
        } else {
          // No full post returned: apply local updates so UI reflects new values (including updated file arrays attached to payload)
          setPost((prev: Post | null) => prev ? {
            ...prev,
            title: updateData.title === null ? '' : (updateData.title ?? prev.title),
            description: updateData.description === null ? '' : (updateData.description ?? prev.description),
            content: updateData.content === undefined ? prev.content : (updateData.content ?? ''),
            content_url: updateData.content_url ?? prev.content_url,
            thumbnail_url: updateData.thumbnail_url === null ? undefined : (updateData.thumbnail_url ?? prev.thumbnail_url),
            tags: updateData.tags ?? prev.tags,
            emotion_tags: updateData.emotion_tags ?? prev.emotion_tags,
            min_age: updateData.min_age ?? prev.min_age,
            category: updateData.category ?? prev.category,
            // Ensure file arrays are updated if payload carried them (Shorts flow)
            file_paths: payload.file_paths ?? prev.file_paths,
            file_names: payload.file_names ?? prev.file_names,
            file_types: payload.file_types ?? prev.file_types,
            file_sizes: payload.file_sizes ?? prev.file_sizes,
            updated_at: new Date().toISOString()
          } : null);
        }

        // If we updated files locally, clear temporary selections so the editor reflects the saved state
        setNewSelectedFiles([]);
  // revoke previews to avoid leaks
  newSelectedPreviews.forEach(url => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } });
        setNewSelectedPreviews([]);

        if (post && post.category === 'Leitura') {
          try {
            // Re-sync tags server-side
            const currentTags = await getTagsForPost(post.id);
            const currentTagIds = currentTags.map((tag: {id: string, name: string, color?: string}) => tag.id);
            for (const tagId of currentTagIds) {
              await removeTagFromPost(post.id, tagId);
            }
            if (selectedReadingTagIds.length > 0) {
              await associateTagWithPost(post.id, selectedReadingTagIds[0]);
            }
            try {
              await supabase.rpc('sync_categoria_leitura', { post_id_param: post.id });
            } catch {
              console.log('Função sync_categoria_leitura não disponível, continuando...');
            }
            const updatedTags = await getTagsForPost(post.id);
            setReadingTags(updatedTags);
          } catch (error) {
            console.error('Erro ao atualizar tag de leitura:', error);
          }
        }

        setIsEditing(false);
        toast.success('As alterações foram salvas e o post foi atualizado com sucesso.');
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

  // ====== FILE EDIT HANDLERS for SHORTS ======
  const handleNewFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    addNewFiles(files);
    // reset input value to allow re-selecting same files
    if (e.target) e.target.value = '';
  };

  // Shared logic to add new files (from input or drop)
  const addNewFiles = (files: File[]) => {
    // Validate types and sizes and limit
    const combinedCount = editExistingFiles.length + newSelectedFiles.length + files.length;
    if (combinedCount > 5) {
      setFileEditError('Máximo 5 imagens para Shorts (carousel). Remova algumas antes de adicionar mais.');
      return;
    }

    const invalid = files.find(f => !f.type.startsWith('image/'));
    if (invalid) {
      setFileEditError('Apenas imagens são permitidas para Shorts');
      return;
    }

    const tooLarge = files.find(f => f.size > 5 * 1024 * 1024);
    if (tooLarge) {
      setFileEditError('Cada imagem deve ter no máximo 5MB');
      return;
    }

    setFileEditError(null);

    // revoke previous previews to avoid leaks when replacing
    newSelectedPreviews.forEach(url => {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    });

    const nextFiles = [...newSelectedFiles, ...files];
    const previews = nextFiles.map(f => URL.createObjectURL(f));
    setNewSelectedFiles(nextFiles);
    setNewSelectedPreviews(previews);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    const files = Array.from(dt.files || []);
    if (files.length === 0) return;
    const currentCount = editExistingFiles.length + newSelectedFiles.length;
    if (currentCount >= 5) {
      setFileEditError('Máximo 5 imagens para Shorts. Remova algumas imagens antes de adicionar novas.');
      return;
    }
    addNewFiles(files);
  };

  const removeNewSelectedFile = (index: number) => {
    setNewSelectedFiles(prev => {
      const removedPreview = newSelectedPreviews[index];
      // revoke object URL for removed preview
  try { if (removedPreview) URL.revokeObjectURL(removedPreview); } catch { /* ignore */ }
      const next = prev.filter((_, i) => i !== index);
      const previews = next.map(f => URL.createObjectURL(f));
      // revoke old previews to avoid leaks
  newSelectedPreviews.forEach((p, i) => { if (i !== index) try { URL.revokeObjectURL(p); } catch{/*ignore*/} });
      setNewSelectedPreviews(previews);
      return next;
    });
  };

  const removeExistingFile = (path: string) => {
    setEditExistingFiles(prev => prev.filter(f => f.path !== path));
  };

  // Image reordering functions
  const handleImageDragStart = (e: React.DragEvent, index: number, type: 'existing' | 'new') => {
    // compute absolute index
    const totalExisting = editExistingFiles.length;
    const abs = type === 'existing' ? index : totalExisting + index;
    setDraggedImageIndex(index);
    setDraggedImageType(type);
    setDraggedImageAbsIndex(abs);
    try {
      e.dataTransfer.setData('text/plain', String(abs));
    } catch {
      // some browsers may restrict setData in certain contexts
    }
    e.dataTransfer.effectAllowed = 'move';
    // optional: set drag image for better UX (use element itself)
    try {
      const el = e.currentTarget as HTMLElement;
      // guard for typed DataTransfer.setDragImage (some lib.dom versions may not include it)
      const dt = e.dataTransfer as DataTransfer & { setDragImage?: (image: Element, x: number, y: number) => void };
      if (el && dt.setDragImage) {
        dt.setDragImage(el, 20, 20);
      }
    } catch { /* ignore */ }
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(index);
  };

  const handleImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetIndex(null);
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number, dropType: 'existing' | 'new' | 'absolute') => {
    e.preventDefault();

    // Determine the source absolute index (prefer the explicitly stored absolute index)
    const totalExisting = editExistingFiles.length;
    let sourceAbsIndex: number | null = null;
    if (draggedImageAbsIndex !== null) {
      sourceAbsIndex = draggedImageAbsIndex;
    } else if (draggedImageIndex !== null && draggedImageType !== null) {
      sourceAbsIndex = draggedImageType === 'existing' ? draggedImageIndex : totalExisting + draggedImageIndex;
    } else {
      // Fallback: try to read the absolute index from the dataTransfer payload
      try {
        const dtVal = e.dataTransfer?.getData && e.dataTransfer.getData('text/plain');
        const parsed = dtVal ? parseInt(dtVal, 10) : NaN;
        if (!Number.isNaN(parsed)) {
          sourceAbsIndex = parsed;
        }
      } catch {
        // ignore
      }
    }
    if (sourceAbsIndex === null) return;

    // Calculate target absolute index based on drop type
    let targetAbsIndex: number;
    if (dropType === 'absolute') {
      targetAbsIndex = dropIndex;
    } else {
      targetAbsIndex = dropType === 'existing' ? dropIndex : totalExisting + dropIndex;
    }
    
    // Don't do anything if dropping on same position
    if (sourceAbsIndex === targetAbsIndex) {
      setDraggedImageIndex(null);
      setDraggedImageType(null);
      setDropTargetIndex(null);
      return;
    }
    
    // Create combined array of all images
    const allImages = [
      ...editExistingFiles.map((f, i) => ({ type: 'existing' as const, data: f, index: i })),
      ...newSelectedFiles.map((f, i) => ({ type: 'new' as const, data: f, index: i, preview: newSelectedPreviews[i] }))
    ];
    
    // Reorder the combined array
    const [movedItem] = allImages.splice(sourceAbsIndex, 1);
    allImages.splice(targetAbsIndex, 0, movedItem);
    
    // Split back into existing and new arrays
    const newExistingFiles: typeof editExistingFiles = [];
    const newSelectedFilesReordered: File[] = [];
    const newPreviewsReordered: string[] = [];
    
    allImages.forEach(item => {
      if (item.type === 'existing') {
        newExistingFiles.push(item.data as typeof editExistingFiles[0]);
      } else {
        newSelectedFilesReordered.push(item.data as File);
        newPreviewsReordered.push(item.preview as string);
      }
    });
    
    // Update states
    setEditExistingFiles(newExistingFiles);
    setNewSelectedFiles(newSelectedFilesReordered);
    setNewSelectedPreviews(newPreviewsReordered);
    
    // Clear drag states
    setDraggedImageIndex(null);
    setDraggedImageType(null);
    setDraggedImageAbsIndex(null);
    setDropTargetIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedImageIndex(null);
    setDraggedImageType(null);
    setDropTargetIndex(null);
  };

  // Drag handlers para área de upload de arquivos
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragActive to false if leaving the drag area completely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragActive(false);
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

  // ✅ HANDLERS PARA UPLOAD/REMOVER THUMBNAIL
  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar se é uma imagem
    if (!file.type.startsWith('image/')) {
      setUploadThumbnailError('Por favor, selecione apenas arquivos de imagem para a thumbnail');
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }
    
    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadThumbnailError('A thumbnail deve ter no máximo 5MB');
      toast.error('A thumbnail deve ter no máximo 5MB');
      return;
    }

    setUploadThumbnailError(null);
    setIsUploadingThumbnail(true);

    try {
      const res = await uploadFileForPost(file);
      if (!res.success || !res.data) {
        setUploadThumbnailError(res.error || 'Erro no upload da thumbnail');
        toast.error(res.error || 'Erro no upload da thumbnail');
        return;
      }

      // Atualizar URL no campo de edição
      setEditThumbnailUrl(res.data.url);
      setRequestRemoveThumbnail(false); // cancelar remoção se estiver marcada
      toast.success('Thumbnail carregada com sucesso!');
    } catch (err) {
      console.error('Erro ao fazer upload da thumbnail:', err);
      const errorMsg = 'Erro inesperado ao fazer upload da thumbnail';
      setUploadThumbnailError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploadingThumbnail(false);
      // reset input value to allow re-upload same file
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveThumbnail = () => {
    // Mark for removal and clear preview URL
    setRequestRemoveThumbnail(true);
    setEditThumbnailUrl('');
    setUploadThumbnailError(null); // Limpar erros anteriores
    toast.success('Thumbnail será removida ao salvar as alterações');
  };



  // ✅ FUNÇÕES PARA LIDAR COM IMAGEM DE CONTEÚDO
  const handleContentImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar se é uma imagem
    if (!file.type.startsWith('image/')) {
      setUploadContentImageError('Por favor, selecione apenas arquivos de imagem');
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }
    
    // Validar tamanho (máximo 10MB para conteúdo)
    if (file.size > 10 * 1024 * 1024) {
      setUploadContentImageError('A imagem deve ter no máximo 10MB');
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    setUploadContentImageError(null);
    setIsUploadingContentImage(true);

    try {
      const res = await uploadFileForPost(file, post?.category);
      if (!res.success || !res.data) {
        setUploadContentImageError(res.error || 'Erro no upload da imagem');
        toast.error(res.error || 'Erro no upload da imagem');
        return;
      }

      // Limpar arquivos existentes e definir novo arquivo
      setEditExistingFiles([{
        path: res.data.path,
        name: res.data.file_name,
        type: res.data.file_type,
        size: res.data.file_size
      }]);
      
      setRequestRemoveContentImage(false);
      toast.success('Imagem carregada com sucesso!');
    } catch (err) {
      console.error('Erro ao fazer upload da imagem:', err);
      const errorMsg = 'Erro inesperado ao fazer upload da imagem';
      setUploadContentImageError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploadingContentImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveContentImage = () => {
    // Mark for removal and clear existing files
    setRequestRemoveContentImage(true);
    setEditExistingFiles([]);
    setUploadContentImageError(null);
    toast.success('Imagem de conteúdo será removida ao salvar as alterações');
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

    // ✅ VERIFICAR FORMATO NOVO (arrays) E ANTIGO (campos únicos)
  const hasNewFormat = post.file_paths && post.file_paths.length > 0;
    
    // Se tem arquivos no formato novo (array)
    if (hasNewFormat) {
      const filePaths = post.file_paths!;
      const fileTypes = post.file_types || [];
      const fileNames = post.file_names || [];
      
      // Se é carousel (múltiplas imagens)
      if (filePaths.length > 1 && fileTypes.every(type => type?.startsWith('image/'))) {
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">
              Carousel ({filePaths.length} imagens)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filePaths.map((filePath, index) => {
                const fileName = fileNames[index] || `Imagem ${index + 1}`;
                const fileType = fileTypes[index] || 'image/jpeg';
                const publicUrl = getFileUrl(filePath);
                
                return (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="aspect-square relative">
                      {isValidUrl(publicUrl) ? (
                        <Image 
                          src={publicUrl} 
                          alt={`${post.title} - ${fileName}`}
                          className="w-full h-full object-cover"
                          width={300}
                          height={300}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                  <div class="text-center text-gray-500">
                                    <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    <p class="text-xs">Erro ao carregar</p>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <div className="text-center text-gray-500">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-xs">URL inválida</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-gray-600 truncate" title={fileName}>
                        {fileName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {fileType}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      
      // Se é arquivo único no formato novo
      const singleFilePath = filePaths[0];
      const singleFileType = fileTypes[0] || '';
      const singleFileName = fileNames[0] || 'Arquivo';
      const publicUrl = getFileUrl(singleFilePath);
      
      // Debug logs
      console.log('🎥 Debug Video URL:', {
        singleFilePath,
        singleFileType,
        singleFileName,
        publicUrl,
        isValidUrl: isValidUrl(publicUrl)
      });
      
      // Imagem única
      if (singleFileType.startsWith('image/')) {
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Pré-visualização</div>
            <div className="border rounded-lg overflow-hidden">
              {isValidUrl(publicUrl) ? (
                <Image 
                  src={publicUrl} 
                  alt={post.title}
                  className="max-w-full h-auto max-h-96 object-contain mx-auto"
                  width={600}
                  height={400}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="p-8 text-center text-gray-500">
                          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <p class="text-sm font-medium mb-2">Erro ao carregar imagem</p>
                          <p class="text-xs text-gray-400">A imagem pode estar temporariamente indisponível</p>
                        </div>
                      `;
                    }
                  }}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium mb-2">URL da imagem inválida</p>
                  <p className="text-xs text-gray-400">Não foi possível carregar a imagem</p>
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // Vídeo único
      if (singleFileType.startsWith('video/')) {
        console.log('🎬 Renderizando vídeo:', {
          publicUrl,
          isValid: isValidUrl(publicUrl),
          fileType: singleFileType
        });
        
  // Verificar se é um formato suportado pelo navegador
  const isSupportedFormat = ['video/mp4', 'video/webm', 'video/ogg'].includes(singleFileType);
  const isQuickTime = singleFileType === 'video/quicktime';
        
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">Vídeo</div>
            <div className="border rounded-lg overflow-hidden">
              {isValidUrl(publicUrl) ? (
                <div>
                  {isQuickTime && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            <strong>Formato QuickTime (.mov):</strong> Este formato pode não ser reproduzido em todos os navegadores. 
                            Recomendamos usar MP4 para melhor compatibilidade.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <video 
                    controls 
                    className="w-full max-h-96"
                    preload="metadata"
                    onError={(e) => {
                      console.error('❌ Erro ao carregar vídeo:', e);
                      console.error('URL problemática:', publicUrl);
                      console.error('Tipo do arquivo:', singleFileType);
                    }}
                    onLoadStart={() => {
                      console.log('✅ Iniciando carregamento do vídeo:', publicUrl);
                    }}
                    onCanPlay={() => {
                      console.log('✅ Vídeo pode ser reproduzido:', publicUrl);
                    }}
                  >
                    <source src={publicUrl} type={singleFileType} />
                    {/* Fallback para QuickTime */}
                    {isQuickTime && (
                      <source src={publicUrl} type="video/mp4" />
                    )}
                    Seu navegador não suporta reprodução de vídeo.
                  </video>
                                  
                  {/* Mostrar suporte/formato usando isSupportedFormat para evitar variável não usada */}
                  <div className="text-xs text-gray-500 mt-2">
                    Formato suportado pelo navegador: {isSupportedFormat ? 'Sim' : 'Provavelmente não'}
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium mb-2">Vídeo não disponível</p>
                  <p className="text-xs text-gray-400">URL do vídeo inválida: {publicUrl}</p>
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // Outros tipos de arquivo (PDF, áudio, etc.)
      return (
        <div className="mb-6">
          <div className="text-xs text-gray-500 font-bold mb-2">Arquivo</div>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <div className="font-medium text-gray-900">{singleFileName}</div>
                <div className="text-sm text-gray-500">{singleFileType}</div>
              </div>
            </div>
            <div className="mt-3">
              <a 
                href={publicUrl}
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

  // Legacy single-file format removed. All posts now use arrays (file_paths, file_names, file_types, file_sizes).

    // Se tem URL externa
    if (post.content_url) {
      // Tentar detectar se é um link do YouTube, Vimeo, etc.
      const url = post.content_url;
      
      // YouTube (incluindo Shorts)
      const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
      if (youtubeMatch) {
        const videoId = youtubeMatch[1];
        const isShorts = url.includes('/shorts/') || post.category === 'Shorts';
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">
              {isShorts ? 'YouTube Shorts' : 'Vídeo do YouTube'}
            </div>
            <div className={`border rounded-lg overflow-hidden ${isShorts ? 'aspect-[9/16] max-w-md mx-auto' : 'aspect-video'}`}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                title={post.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {isShorts && (
              <div className="text-center mt-2">
                <a 
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  Ver no YouTube
                </a>
              </div>
            )}
          </div>
        );
      }

      // Instagram (Reels e Posts)
      const instagramMatch = url.match(/instagram\.com\/(?:p|reel|tv)\/([^\/\n?#]+)/);
      if (instagramMatch) {
        const postId = instagramMatch[1];
        const isReel = url.includes('/reel/') || url.includes('/tv/');
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">
              {isReel ? 'Instagram Reel' : 'Post do Instagram'}
            </div>
            <div className="border rounded-lg overflow-hidden aspect-[9/16] max-w-md mx-auto">
              <iframe
                src={`https://www.instagram.com/p/${postId}/embed/`}
                className="w-full h-full min-h-[500px]"
                title={post.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="text-center mt-2">
              <a 
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Ver no Instagram
              </a>
            </div>
          </div>
        );
      }

      // TikTok - Detecção unificada
      const tiktokMatch = url.match(/tiktok\.com\/(?:@[^\/]+\/)?video\/(\d+)/);
      if (tiktokMatch) {
        const videoId = tiktokMatch[1];
        console.log('🎵 TikTok detectado:', { url, videoId });
        return (
          <div className="mb-6">
            <div className="text-xs text-gray-500 font-bold mb-2">TikTok</div>
            <div className="border rounded-lg overflow-hidden aspect-[9/16] max-w-md mx-auto">
              <TikTokEmbed videoId={videoId} />
            </div>
            <div className="text-center mt-2">
              <a 
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Ver no TikTok
              </a>
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
              {isValidUrl(url) ? (
                <Image 
                  src={url as string} 
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
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <div className="font-medium">Imagem inválida</div>
                  <div className="text-xs mt-1">A URL externa não é válida para exibição.</div>
                </div>
              )}
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
              <div className="text-sm text-gray-500 break-all">
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
                    editContent !== post?.content || 
                    editContentUrl !== (post?.content_url || "") ||
                    editThumbnailUrl !== (post?.thumbnail_url || "") || 
                    editMinAge !== (post?.min_age || 12) || 
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
                      // For Shorts we allow empty title/description; only enforce min age.
                      disabled={
                        saving ||
                        (post.category !== 'Shorts' && (!editTitle.trim() || !editDescription.trim())) ||
                        (editMinAge !== 12 && editMinAge !== 16)
                      }
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
                      onClick={() => post.is_published ? null : setShowDeleteModal(true)}
                      disabled={deleting || publishing || post.is_published}
                      className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                        post.is_published
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                          : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer disabled:opacity-50'
                      }`}
                      title={
                        post.is_published 
                          ? "Para eliminar este post, despublique-o primeiro" 
                          : "Eliminar post"
                      }
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {post.is_published ? 'Eliminar Bloqueado' : 'Eliminar'}
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
                    <textarea
                      value={editDescription}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                      placeholder="Descrição do post..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium resize-none"
                      rows={4}
                    />
                  </div>

                  {post.category !== "Shorts" && (
                    <div className="mb-4">
                      <label className="block text-xs text-gray-500 font-bold mb-1">
                        Conteúdo
                        <span className="text-xs text-gray-500 ml-2">(não disponível para Shorts)</span>
                      </label>
                      <TipTapEditor
                        initialHtml={editContent}
                        onChangeHtml={setEditContent}
                        placeholder="Conteúdo do post..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use os botões acima para formatar o texto ou digite diretamente em markdown
                      </p>
                      
                      {/* Prévia do Markdown */}
                      {editContent.trim() && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                          <div className="text-xs text-gray-500 font-bold mb-2">Prévia da formatação:</div>
                            <div className="bg-white p-3 rounded border">
                              <FlexibleRenderer content={editContent} />
                            </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gestão de Imagens para Posts Shorts - Única seção que combina upload e reordenamento */}
                  {post.category === 'Shorts' && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <label className="block text-xs text-gray-500 font-bold mb-1">
                            🖼️ Gestão de Imagens
                          </label>
                          <p className="text-xs text-gray-500">
                            Adicione imagens arrastando arquivos ou clicando no botão. Reorganize arrastando as imagens.
                          </p>
                        </div>
                        <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {(editExistingFiles?.length || 0) + (newSelectedFiles?.length || 0)}/5
                        </div>
                      </div>

                      {/* Error display */}
                      {fileEditError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-800">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium">{fileEditError}</span>
                          </div>
                        </div>
                      )}

                      {/* Unified Upload and Management Area */}
                      <div className="space-y-4">
                        {/* Images Grid - shows existing and new images together for dragging/reordering */}
                        {(editExistingFiles?.length > 0 || newSelectedFiles?.length > 0) && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Imagens do Carousel - Arraste para reordenar
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                              {/* Existing files */}
                              {editExistingFiles.map((f, idx) => {
                                const publicUrl = getFileUrl(f.path);
                                const absoluteIndex = idx;
                                const isBeingDragged = draggedImageAbsIndex === absoluteIndex;
                                const isDropTarget = dropTargetIndex !== null && dropTargetIndex <= absoluteIndex && absoluteIndex <= dropTargetIndex;
                                
                                return (
                                  <div 
                                    key={f.path} 
                                    className={`group relative cursor-move ${isBeingDragged ? 'opacity-50' : ''} ${isDropTarget ? 'ring-2 ring-blue-400' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleImageDragStart(e, idx, 'existing')}
                                    onDragOver={(e) => handleImageDragOver(e, absoluteIndex)}
                                    onDragLeave={handleImageDragLeave}
                                    onDrop={(e) => handleImageDrop(e, absoluteIndex, 'absolute')}
                                    onDragEnd={handleImageDragEnd}
                                  >
                                    {/* Drag handle indicator */}
                                    <div className="absolute top-2 left-2 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                      </svg>
                                    </div>
                                    
                                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                                      {isValidUrl(publicUrl) ? (
                                        <Image 
                                          src={publicUrl} 
                                          alt={f.name || `Imagem ${idx+1}`} 
                                          width={200} 
                                          height={200} 
                                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200 pointer-events-none" 
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                          <div className="text-center">
                                            <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <div className="text-xs text-gray-500">URL inválida</div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeExistingFile(f.path);
                                      }}
                                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 z-10"
                                      title="Remover imagem existente"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <div className="text-xs text-white font-medium truncate">
                                        {f.name || `Imagem ${idx+1}`} • #{idx + 1}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* New selected files */}
                              {newSelectedFiles.map((file, idx) => {
                                const previewUrl = newSelectedPreviews[idx];
                                const totalExisting = editExistingFiles.length;
                                const absoluteIndex = totalExisting + idx;
                                const isBeingDragged = draggedImageAbsIndex === absoluteIndex;
                                const isDropTarget = dropTargetIndex !== null && dropTargetIndex <= absoluteIndex && absoluteIndex <= dropTargetIndex;
                                
                                return (
                                  <div 
                                    key={previewUrl || `${file.name}-${absoluteIndex}`} 
                                    className={`group relative cursor-move ${isBeingDragged ? 'opacity-50' : ''} ${isDropTarget ? 'ring-2 ring-blue-400' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleImageDragStart(e, idx, 'new')}
                                    onDragOver={(e) => handleImageDragOver(e, absoluteIndex)}
                                    onDragLeave={handleImageDragLeave}
                                    onDrop={(e) => handleImageDrop(e, absoluteIndex, 'absolute')}
                                    onDragEnd={handleImageDragEnd}
                                  >
                                    {/* Drag handle indicator */}
                                    <div className="absolute top-2 left-2 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                      </svg>
                                    </div>
                                    
                                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-blue-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                                      {previewUrl ? (
                                        <Image 
                                          src={previewUrl} 
                                          alt={file.name} 
                                          width={200} 
                                          height={200} 
                                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200 pointer-events-none" 
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-blue-50">
                                          <div className="text-center">
                                            <svg className="w-8 h-8 text-blue-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <div className="text-xs text-blue-600">Nova imagem</div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeNewSelectedFile(idx);
                                      }}
                                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 z-10"
                                      title="Remover nova imagem"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                    <div className="absolute top-8 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                      NOVA
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <div className="text-xs text-white font-medium truncate">
                                        {file.name} • #{absoluteIndex + 1}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Upload Area - always visible, integrated with the management area */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-700">Adicionar mais imagens</div>
                          {((editExistingFiles?.length || 0) + (newSelectedFiles?.length || 0)) < 5 ? (
                            <div
                              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                dragActive 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                              onDragOver={handleFileDragOver}
                              onDragLeave={handleFileDragLeave}
                              onDrop={handleDrop}
                            >
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleNewFilesSelected}
                                className="hidden"
                                id="image-upload"
                              />
                              <label htmlFor="image-upload" className="cursor-pointer">
                                <div className="flex flex-col items-center">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                                    dragActive ? 'bg-blue-100' : 'bg-gray-100'
                                  }`}>
                                    <svg className={`w-6 h-6 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                  </div>
                                  <span className={`text-sm font-medium ${dragActive ? 'text-blue-600' : 'text-gray-600'}`}>
                                    {dragActive ? 'Solte as imagens aqui' : 'Clique para selecionar ou arraste imagens'}
                                  </span>
                                  <span className="text-xs text-gray-500 mt-1">
                                    PNG, JPG, GIF • Máx 5MB por imagem
                                  </span>
                                  <span className="text-xs text-blue-600 mt-2">
                                    {5 - ((editExistingFiles?.length || 0) + (newSelectedFiles?.length || 0))} slot(s) disponível(is)
                                  </span>
                                </div>
                              </label>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-gray-50">
                              <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-500">
                                  Limite de 5 imagens atingido
                                </span>
                                <span className="text-xs text-gray-400 mt-1">
                                  Remova uma imagem para adicionar novas
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 font-bold mb-1">URL do Conteúdo (opcional)</label>
                    <div className="relative">
                      <input
                        type="url"
                        value={editContentUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditContentUrl(e.target.value)}
                        className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium ${post?.file_paths && post.file_paths.length > 0 ? 'bg-gray-100 opacity-50' : ''}`}
                        placeholder={post?.file_paths && post.file_paths.length > 0 ? "Este post tem ficheiro anexado" : "https://exemplo.com/conteudo"}
                        disabled={!!(post?.file_paths && post.file_paths.length > 0)}
                      />
                      {(post?.file_paths && post.file_paths.length > 0) && (
                        <div className="mt-1 text-xs text-gray-500">
                          ⚠️ Este post tem um ficheiro anexado. Não é possível adicionar URL externa.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ✅ CAMPO PARA EDITAR THUMBNAIL URL (Podcasts, Artigos, Ferramentas e Quizzes) */}
                  {((post.category === "Podcast" && post.content_url && !(post.file_paths && post.file_paths.length > 0)) || (post.category === "Artigo" && !(post.file_paths && post.file_paths.length > 0)) || (post.category === "Ferramentas" && !(post.file_paths && post.file_paths.length > 0)) || (post.category === "Quizzes" && !(post.file_paths && post.file_paths.length > 0))) && (
                    <div className="mb-6">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <label className="text-sm font-semibold text-gray-900">
                            {post.category === 'Podcast' ? 'Thumbnail do Podcast' : 
                             post.category === 'Ferramentas' ? 'Thumbnail das Ferramentas' :
                             post.category === 'Quizzes' ? 'Thumbnail dos Quizzes' :
                             'Thumbnail do Artigo'}
                          </label>
                        </div>
                        
                        {/* Preview atual da thumbnail */}
                        {(editThumbnailUrl.trim() || (!requestRemoveThumbnail && post.thumbnail_url)) && (
                          <div className="mb-4">
                            <div className="text-xs text-gray-600 font-medium mb-2">📷 Thumbnail atual:</div>
                            <div className="relative max-w-md">
                              {isValidUrl(editThumbnailUrl || post.thumbnail_url || '') ? (
                                <Image 
                                  src={editThumbnailUrl || post.thumbnail_url || ''} 
                                  alt="Thumbnail atual"
                                  width={448}
                                  height={320}
                                  className="w-full max-h-80 object-contain rounded-lg border-2 border-green-300 shadow-sm bg-gray-50"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `
                                        <div class="p-4 text-center text-gray-500 bg-gray-100 rounded-lg">
                                          <div class="text-xs">❌ Erro ao carregar</div>
                                        </div>
                                      `;
                                    }
                                  }}
                                />
                              ) : (
                                <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-lg">
                                  <div className="text-xs">⚠️ URL inválida</div>
                                </div>
                              )}
                              {/* Botão X no canto superior direito */}
                              <button
                                type="button"
                                onClick={handleRemoveThumbnail}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                                title="Remover thumbnail"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Aviso de remoção */}
                        {requestRemoveThumbnail && (
                          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-sm font-medium text-red-800">Thumbnail será removida ao salvar</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setRequestRemoveThumbnail(false);
                                setEditThumbnailUrl(post.thumbnail_url || '');
                                toast('Remoção cancelada');
                              }}
                              className="mt-2 text-xs text-red-700 hover:text-red-900 underline"
                            >
                              Cancelar remoção
                            </button>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          {/* Opção 1: URL */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              🔗 Opção 1: Inserir URL da imagem
                            </label>
                            <input
                              type="url"
                              value={editThumbnailUrl}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setEditThumbnailUrl(e.target.value);
                                setRequestRemoveThumbnail(false);
                              }}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                              placeholder="https://exemplo.com/thumbnail.jpg"
                            />
                            <div className="mt-1 text-xs text-gray-500">
                              Cole aqui o link direto para uma imagem
                            </div>
                          </div>

                          <div className="flex items-center">
                            <div className="flex-1 border-t border-gray-300"></div>
                            <span className="px-3 text-xs text-gray-500 bg-gray-50">OU</span>
                            <div className="flex-1 border-t border-gray-300"></div>
                          </div>

                          {/* Opção 2: Upload - Estilo da página de criação */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              📤 Opção 2: Fazer upload de imagem
                            </label>
                            <div className={`relative border-2 border-dashed rounded-xl transition-all ${
                              (editThumbnailUrl.trim() || (!requestRemoveThumbnail && post.thumbnail_url))
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                            }`}>
                              <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleThumbnailFileChange}
                                accept="image/*"
                                disabled={isUploadingThumbnail}
                                id="thumbnail-upload"
                              />
                              <div className="flex flex-col items-center justify-center py-6 px-6">
                                {isUploadingThumbnail ? (
                                  <>
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                    <p className="text-blue-700 text-center">
                                      <span className="font-medium">Carregando thumbnail...</span>
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-10 h-10 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-gray-700 text-center">
                                      <span className="font-medium">Clique para adicionar thumbnail</span>
                                      <br />
                                      <span className="text-sm text-gray-500">JPG, PNG, GIF até 5MB</span>
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                            {uploadThumbnailError && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <span className="text-sm font-medium text-red-800">{uploadThumbnailError}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ✅ SEÇÃO PARA EDITAR IMAGEM DE CONTEÚDO (Ferramentas, Quizzes, Artigos, Leitura) */}
                  {(post.category === "Ferramentas" || post.category === "Quizzes" || post.category === "Artigo" || post.category === "Leitura") && (
                    <div className="mb-6">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <label className="text-sm font-semibold text-gray-900">
                            Imagem de Conteúdo {post.category === 'Ferramentas' ? 'da Ferramenta' : post.category === 'Quizzes' ? 'do Quiz' : post.category === 'Artigo' ? 'do Artigo' : 'de Leitura (Capa)'}
                          </label>
                        </div>
                        
                        {/* Preview atual da imagem de conteúdo */}
                        {editExistingFiles.length > 0 && !requestRemoveContentImage && (
                          <div className="mb-4">
                            <div className="text-xs text-gray-600 font-medium mb-2">🖼️ Imagem atual:</div>
                            <div className="relative inline-block max-w-md">
                              {isValidUrl(getFileUrl(editExistingFiles[0].path)) ? (
                                <Image 
                                  src={getFileUrl(editExistingFiles[0].path)} 
                                  alt="Imagem de conteúdo atual"
                                  width={448}
                                  height={320}
                                  className="w-full max-h-80 object-contain rounded-lg border-2 border-green-300 shadow-sm bg-gray-50"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `
                                        <div class="p-4 text-center text-gray-500 bg-gray-100 rounded-lg">
                                          <div class="font-medium text-sm">Erro ao carregar imagem</div>
                                          <div class="text-xs mt-1">A imagem pode estar indisponível</div>
                                        </div>
                                      `;
                                    }
                                  }}
                                  onLoad={() => {
                                    console.log('✅ Imagem de conteúdo carregada com sucesso');
                                  }}
                                />
                              ) : (
                                <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-lg">
                                  <div className="font-medium text-sm">Imagem inválida</div>
                                  <div className="text-xs mt-1">URL da imagem não é válida</div>
                                </div>
                              )}
                              {/* Botão X no canto superior direito */}
                              <button
                                type="button"
                                onClick={handleRemoveContentImage}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                                title="Remover imagem"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Campo para upload de nova imagem - Estilo da página de criação */}
                        <div className={`relative border-2 border-dashed rounded-xl transition-all ${
                          requestRemoveContentImage || editExistingFiles.length === 0
                            ? 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                            : 'border-green-300 bg-green-50'
                        }`}>
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleContentImageFileChange}
                            accept="image/*"
                            disabled={isUploadingContentImage}
                            id="content-image-upload"
                          />
                          <div className="flex flex-col items-center justify-center py-6 px-6">
                            {isUploadingContentImage ? (
                              <>
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                <p className="text-blue-700 text-center">
                                  <span className="font-medium">Fazendo upload da imagem...</span>
                                </p>
                              </>
                            ) : (
                              <>
                                <svg className="w-10 h-10 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-700 text-center">
                                  <span className="font-medium">
                                    {editExistingFiles.length > 0 && !requestRemoveContentImage 
                                      ? 'Clique para substituir imagem' 
                                      : 'Clique para adicionar imagem'
                                    }
                                  </span>
                                  <br />
                                  <span className="text-sm text-gray-500">JPG, PNG, GIF, WebP até 10MB</span>
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Estados de erro e aviso */}
                        {uploadContentImageError && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-sm font-medium text-red-800">{uploadContentImageError}</span>
                            </div>
                          </div>
                        )}

                        {requestRemoveContentImage && (
                          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-sm font-medium text-orange-800">A imagem será removida ao salvar</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setRequestRemoveContentImage(false);
                                toast('Remoção cancelada');
                              }}
                              className="mt-2 text-xs text-orange-700 hover:text-orange-900 underline"
                            >
                              Cancelar remoção
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Idade Mínima */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 font-bold mb-1">
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
                          name="editMinAge"
                          value="12"
                          checked={editMinAge === 12}
                          onChange={() => setEditMinAge(12)}
                          className="accent-blue-600 cursor-pointer"
                        />
                        <div>
                          <div className="font-medium text-gray-900">12+</div>
                          <div className="text-xs text-gray-500">Conteúdo adequado para 12 anos ou mais</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="editMinAge"
                          value="16"
                          checked={editMinAge === 16}
                          onChange={() => setEditMinAge(16)}
                          className="accent-blue-600 cursor-pointer"
                        />
                        <div>
                          <div className="font-medium text-gray-900">16+</div>
                          <div className="text-xs text-gray-500">Conteúdo adequado para 16 anos ou mais</div>
                        </div>
                      </label>
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
                      <FlexibleRenderer content={post.description} />
                    </div>
                  </div>

                                     {post.content && (
                     <div className="mb-2">
                       <div className="text-xs text-gray-500 font-bold">Conteúdo</div>
                                            <div className="text-gray-900">
                                              <FlexibleRenderer content={post.content || ""} />
                                            </div>
                     </div>
                   )}
                </>
              )}

              <div className="my-6 border-b border-gray-200" />

              {/* Thumbnail - exibir para Podcasts, Artigos, Ferramentas e Quizzes quando houver thumbnail */}
              {((post.category === "Podcast" && post.thumbnail_url && post.content_url && !(post.file_paths && post.file_paths.length > 0)) || (post.category === "Artigo" && post.thumbnail_url && !(post.file_paths && post.file_paths.length > 0)) || (post.category === "Ferramentas" && post.thumbnail_url && !(post.file_paths && post.file_paths.length > 0)) || (post.category === "Quizzes" && post.thumbnail_url && !(post.file_paths && post.file_paths.length > 0))) && (
                <div className="mb-6">
                  <div className="text-xs text-gray-500 font-bold mb-2">Thumbnail do Podcast</div>
                  <div className="border rounded-lg overflow-hidden max-w-md">
                    {isValidUrl(post.thumbnail_url) ? (
                      <Image 
                        src={post.thumbnail_url as string} 
                        alt={`Thumbnail do podcast: ${post.title}`}
                        className="w-full h-auto object-cover"
                        width={400}
                        height={300}
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
                                <p class="text-sm font-medium mb-2">Erro ao carregar thumbnail</p>
                                <p class="text-xs text-gray-400 mb-4">A thumbnail pode estar temporariamente indisponível</p>
                                <div class="space-y-2">
                                  <a href="${post.thumbnail_url}" target="_blank" class="text-blue-600 text-xs hover:underline block">Tentar abrir em nova aba</a>
                                  <button onclick="window.location.reload()" class="text-blue-600 text-xs hover:underline block">Recarregar página</button>
                                </div>
                              </div>
                            `;
                          }
                        }}
                        onLoad={() => {
                          console.log('✅ Thumbnail do podcast carregada com sucesso:', post.thumbnail_url);
                        }}
                      />
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <div className="font-medium">Thumbnail inválida</div>
                        <div className="text-xs mt-1">A URL da thumbnail não é válida para exibição.</div>
                        <div className="mt-2">
                          <a href={post.thumbnail_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">Abrir URL</a>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Imagem representativa do podcast
                  </div>
                                {/* Thumbnail Info - apenas para podcasts, artigos, ferramentas e quizzes criados via link (não mostrar a URL bruta) */}
              {((post.category === "Podcast" && post.thumbnail_url && post.content_url && !(post.file_paths && post.file_paths.length > 0)) || (post.category === "Artigo" && post.thumbnail_url && !(post.file_paths && post.file_paths.length > 0)) || (post.category === "Ferramentas" && post.thumbnail_url && !(post.file_paths && post.file_paths.length > 0)) || (post.category === "Quizzes" && post.thumbnail_url && !(post.file_paths && post.file_paths.length > 0))) && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 font-bold">
                    {post.category === 'Podcast' ? 'Thumbnail do Podcast' : 
                     post.category === 'Ferramentas' ? 'Thumbnail das Ferramentas' :
                     post.category === 'Quizzes' ? 'Thumbnail dos Quizzes' :
                     'Thumbnail do Artigo'}
                  </div>
                  <div className="mt-1">
                    {isValidUrl(post.thumbnail_url) ? (
                      <a
                        href={post.thumbnail_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-xs"
                      >
                        Ver thumbnail em nova aba
                      </a>
                    ) : (
                      <div className="text-xs text-gray-500 italic">Thumbnail fornecida (não pública)</div>
                    )}
                  </div>
                </div>
              )}

                </div>
              )}

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
                  <div className="text-xs text-gray-500 font-bold">Idade Mínima</div>
                  <div className="text-gray-900 font-medium">
                    {post.min_age ? `${post.min_age}+` : '12+'}
                  </div>
                </div>
                
                {/* Categoria de Leitura (apenas para posts de leitura) */}
                {post.category === 'Leitura' && (
                  <div>
                    <div className="text-xs text-gray-500 font-bold">Categoria de Leitura</div>
                    <div className="text-gray-900 font-medium">
                      {readingTags.length > 0 ? (
                        <span style={{ color: readingTags[0].color || '#3B82F6' }}>{readingTags[0].name}</span>
                      ) : post.categoria_leitura && post.categoria_leitura.length > 0 ? (
                        <span>{post.categoria_leitura[0]}</span>
                      ) : (
                        <span className="text-gray-400 italic">Nenhuma categoria definida</span>
                      )}
                    </div>
                  </div>
                )}
                
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

              {/* Aviso sobre eliminação para posts publicados */}
              {post.is_published && !isEditing && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 mb-1">
                        📝 Post Publicado - Eliminação Restrita
                      </h4>
                      <p className="text-sm text-amber-700 mb-2">
                        Este post está atualmente publicado e não pode ser eliminado diretamente.
                      </p>
                      <p className="text-xs text-amber-600">
                        <strong>Para eliminar:</strong> Primeiro despublique o post usando o botão &quot;Despublicar&quot; acima, depois poderá eliminá-lo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* File Info - apenas informações técnicas (usar arrays de arquivos) */}
              {(post.file_names && post.file_names.length > 0) && (
                <>
                  <div className="flex flex-row gap-8 mb-4 flex-wrap">
                    <div>
                      <div className="text-xs text-gray-500 font-bold">Nome do Arquivo</div>
                      <div className="text-gray-900 font-medium">{post.file_names[0]}</div>
                    </div>
                    
                    {(post.file_sizes && post.file_sizes.length > 0) && (
                      <div>
                        <div className="text-xs text-gray-500 font-bold">Tamanho do Arquivo</div>
                        <div className="text-gray-900 font-medium">{formatFileSize(post.file_sizes[0])}</div>
                      </div>
                    )}

                    {(post.file_types && post.file_types.length > 0) && (
                      <div>
                        <div className="text-xs text-gray-500 font-bold">Tipo de Arquivo</div>
                        <div className="text-gray-900 font-medium">{post.file_types[0]}</div>
                      </div>
                    )}
                  </div>
                </>
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
                      {EMOTIONS.map((emotion) => (
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

                  {/* ✅ SEÇÃO PARA EDITAR CATEGORIAS DE LEITURA */}
                  {post.category === 'Leitura' && (
                    <div className="mb-4">
                      <label className="block text-xs text-gray-500 font-bold mb-1">Categoria de Leitura</label>
                      {loadingReadingTags ? (
                        <div className="text-gray-500 text-sm">Carregando categorias disponíveis...</div>
                      ) : allReadingTags.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {allReadingTags.map((tag) => (
                            <label key={tag.id} className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                              <input
                                type="radio"
                                name="reading-category"
                                checked={selectedReadingTagIds.includes(tag.id)}
                                onChange={() => handleReadingTagSelect(tag.id)}
                                className="accent-blue-600 cursor-pointer"
                              />
                              <span style={{ color: tag.color || '#3B82F6' }}>{tag.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">Nenhuma categoria de leitura disponível</div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Selecione a categoria que melhor representa este post de leitura.
                      </p>
                    </div>
                  )}
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

              {/* Categoria de Leitura (apenas para posts de leitura) */}
              {post.category === 'Leitura' && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 font-bold">Categoria de Leitura</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {readingTags.length > 0 ? (
                      <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: readingTags[0].color || '#3B82F6', color: '#fff' }}>{readingTags[0].name}</span>
                    ) : post.categoria_leitura && post.categoria_leitura.length > 0 ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">{post.categoria_leitura[0]}</span>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Nenhuma categoria definida</span>
                    )}
                  </div>
                </div>
              )}

              {/* Informação sobre Storage */}
              {(post.file_paths && post.file_paths.length > 0) && !fileUrl && !loadingFile && (
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
        message={
          post?.is_published 
            ? `Atenção: O post &quot;${post?.title}&quot; está publicado e não pode ser eliminado. Despublique-o primeiro.`
            : `Tem certeza que deseja eliminar o conteúdo &quot;${post?.title}&quot;? Esta ação não pode ser desfeita.`
        }
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

      {/* Notifications are shown via global HotToaster; no centered modal here */}
    </CMSLayout>
  );
} 