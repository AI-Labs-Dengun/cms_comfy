"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import { getUserPosts, togglePostPublication, deletePost, Post } from "@/services/posts";
import { useAuth } from "@/hooks/useAuth";
import { DeleteConfirmationModal, PublishToggleModal, NotificationModal } from "@/components/modals";

export default function Management() {
  const router = useRouter();
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  // Estados dos modais
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    postId: string | null;
    postTitle: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    postId: null,
    postTitle: "",
    isLoading: false
  });
  
  const [publishModal, setPublishModal] = useState<{
    isOpen: boolean;
    postId: string | null;
    postTitle: string;
    isPublished: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    postId: null,
    postTitle: "",
    isPublished: false,
    isLoading: false
  });

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });

  // Buscar posts ao carregar o componente
  useEffect(() => {
    if (!authLoading && canAccessCMS) {
      loadPosts();
    }
  }, [authLoading, canAccessCMS]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getUserPosts();
      
      if (response.success && response.data) {
        setPosts(response.data);
      } else {
        setError(response.error || 'Erro ao carregar posts');
      }
    } catch (err) {
      setError('Erro inesperado ao carregar posts');
      console.error('Erro ao carregar posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Função para abrir modal de publicação
  const openPublishModal = (postId: string, postTitle: string, isPublished: boolean) => {
    setPublishModal({
      isOpen: true,
      postId,
      postTitle,
      isPublished,
      isLoading: false
    });
  };

  // Função para fechar modal de publicação
  const closePublishModal = () => {
    setPublishModal(prev => ({ ...prev, isOpen: false }));
  };

  // Função para mostrar notificação
  const showNotification = (type: "success" | "error" | "info", title: string, message: string) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    });
  };

  // Função para fechar notificação
  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  // Função para confirmar publicação/despublicação
  const handleConfirmPublish = async () => {
    if (!publishModal.postId) return;

    setPublishModal(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await togglePostPublication(publishModal.postId, !publishModal.isPublished);
      
      if (response.success) {
        // Atualizar o estado local
        setPosts(prev => prev.map(post => 
          post.id === publishModal.postId 
            ? { ...post, is_published: !publishModal.isPublished }
            : post
        ));
        closePublishModal();
        showNotification(
          "success", 
          "Sucesso!", 
          `Post ${!publishModal.isPublished ? 'publicado' : 'despublicado'} com sucesso!`
        );
      } else {
        showNotification("error", "Erro", response.error || 'Erro ao alterar status de publicação');
      }
    } catch (err) {
      console.error('Erro ao alterar publicação:', err);
      showNotification("error", "Erro", 'Erro inesperado ao alterar status de publicação');
    } finally {
      setPublishModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Função para abrir modal de exclusão
  const openDeleteModal = (postId: string, postTitle: string) => {
    setDeleteModal({
      isOpen: true,
      postId,
      postTitle,
      isLoading: false
    });
  };

  // Função para fechar modal de exclusão
  const closeDeleteModal = () => {
    setDeleteModal(prev => ({ ...prev, isOpen: false }));
  };

  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!deleteModal.postId) return;

    setDeleteModal(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await deletePost(deleteModal.postId);
      
      if (response.success) {
        // Remover do estado local
        setPosts(prev => prev.filter(post => post.id !== deleteModal.postId));
        closeDeleteModal();
        showNotification("success", "Sucesso!", "Post eliminado com sucesso!");
      } else {
        showNotification("error", "Erro", response.error || 'Erro ao eliminar post');
      }
    } catch (err) {
      console.error('Erro ao eliminar post:', err);
      showNotification("error", "Erro", 'Erro inesperado ao eliminar post');
    } finally {
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Filtrar posts pela busca
  const filteredPosts = posts.filter((post) => {
    const searchLower = search.toLowerCase();
    return (
      post.title.toLowerCase().includes(searchLower) ||
      post.description.toLowerCase().includes(searchLower) ||
      post.category.toLowerCase().includes(searchLower) ||
      post.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
      post.emotion_tags.some((emo: string) => emo.toLowerCase().includes(searchLower))
    );
  });

  // Formatação de data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Verificações de segurança
  if (authLoading) {
    return (
      <CMSLayout currentPage="management">
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
    <>
      <CMSLayout currentPage="management">
        <div className="flex flex-col items-center justify-center py-12 px-8">
          <div className="w-full max-w-4xl flex flex-col items-center">
                      <h1 className="text-2xl font-bold mb-1 text-gray-900" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
            Gerir Conteúdo
          </h1>
          <div className="text-sm text-gray-500 mb-6 font-medium">Monitore e edite o seu conteúdo</div>
            
            {/* Barra de busca */}
            <div className="flex items-center w-full mb-6 justify-center">
              <span className="pl-3 pr-2 text-gray-500">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.6 10.6Z"/>
                </svg>
              </span>
              <input
                type="text"
                className="max-w-3xl w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                placeholder="Pesquise por título, categoria, tag ou tag de emoção"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ fontFamily: 'Inter, Quicksand, sans-serif' }}
              />
            </div>

            {/* Estados de carregamento e erro */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
                <span className="text-gray-600">Carregando posts...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 w-full max-w-3xl">
                <div className="flex">
                  <div className="text-red-800">
                    <p className="font-medium">Erro ao carregar posts</p>
                    <p className="text-sm">{error}</p>
                  </div>
                  <button
                    onClick={loadPosts}
                    className="ml-auto bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/>
                    </svg>
                    Tentar novamente
                  </button>
                </div>
              </div>
            )}

            {/* Lista de posts */}
            {!loading && !error && (
              <>
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">
                      {posts.length === 0 
                        ? 'Ainda não tem posts criados.'
                        : 'Nenhum post encontrado com os critérios de busca.'
                      }
                    </p>
                    {posts.length === 0 && (
                      <button
                        onClick={() => router.push('/dashboard/create')}
                        className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 flex items-center gap-2"
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m7-7H5"/>
                        </svg>
                        Criar primeiro post
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow border overflow-x-auto w-full">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left px-6 py-3 font-semibold text-gray-900">Título</th>
                          <th className="text-left px-6 py-3 font-semibold text-gray-900">Categoria</th>
                          <th className="text-left px-6 py-3 font-semibold text-gray-900">Data de Criação</th>
                          <th className="text-left px-6 py-3 font-semibold text-gray-900">Status</th>
                          <th className="text-left px-6 py-3 font-semibold text-gray-900">Tags</th>
                          <th className="text-left px-6 py-3 font-semibold text-gray-900">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPosts.map((post) => (
                          <tr
                            key={post.id}
                            className="border-b last:border-0 hover:bg-gray-50"
                          >
                            <td 
                              className="px-6 py-4 text-gray-900 font-medium cursor-pointer hover:text-blue-600"
                              onClick={() => router.push(`/dashboard/details/${post.id}`)}
                            >
                              <div className="max-w-xs truncate" title={post.title}>
                                {post.title}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-900 font-medium">
                              <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                {post.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 text-sm">
                              {formatDate(post.created_at)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                post.is_published 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {post.is_published ? 'Publicado' : 'Rascunho'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {[...post.tags, ...post.emotion_tags].slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                    {tag}
                                  </span>
                                ))}
                                {[...post.tags, ...post.emotion_tags].length > 3 && (
                                  <span className="text-gray-500 text-xs">
                                    +{[...post.tags, ...post.emotion_tags].length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => router.push(`/dashboard/details/${post.id}`)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                  title="Ver detalhes"
                                >
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"/>
                                  </svg>
                                  Ver
                                </button>
                                <button
                                onClick={() => openPublishModal(post.id, post.title, post.is_published)}
                                className={`text-sm font-medium flex items-center gap-1 ${
                                  post.is_published 
                                    ? 'text-yellow-600 hover:text-yellow-800' 
                                    : 'text-green-600 hover:text-green-800'
                                }`}
                                title={post.is_published ? 'Despublicar' : 'Publicar'}
                              >
                                {post.is_published ? (
                                  <>
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                                    </svg>
                                    Despublicar
                                  </>
                                ) : (
                                  <>
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/>
                                    </svg>
                                    Publicar
                                  </>
                                )}
                              </button>
                                <button
                                  onClick={() => openDeleteModal(post.id, post.title)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                                  title="Eliminar post"
                                >
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                                  </svg>
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CMSLayout>

      {/* Modais - Renderizados fora do CMSLayout para garantir z-index correto */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja eliminar o post "${deleteModal.postTitle}"?`}
        isLoading={deleteModal.isLoading}
      />

      <PublishToggleModal
        isOpen={publishModal.isOpen}
        onClose={closePublishModal}
        onConfirm={handleConfirmPublish}
        isPublished={publishModal.isPublished}
        title={publishModal.postTitle}
        isLoading={publishModal.isLoading}
      />
      


      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </>
  );
} 