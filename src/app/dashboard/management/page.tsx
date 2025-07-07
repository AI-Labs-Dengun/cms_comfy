"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import { getUserPosts, togglePostPublication, deletePost, Post } from "@/services/posts";
import { useAuth } from "@/context/AuthContext";
import { DeleteConfirmationModal, PublishToggleModal, NotificationModal } from "@/components/modals";

// Tipos para os filtros
interface FilterState {
  title: string;
  category: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
  tags: string;
  emotionTags: string;
}

// Tipos para ordenação
type SortField = 'title' | 'category' | 'created_at' | 'is_published' | 'tags';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

// Tipos para agrupamento
interface GroupedPosts {
  [key: string]: Post[];
}

export default function Management() {
  const router = useRouter();
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados de ordenação e agrupamento
  const [sortState, setSortState] = useState<SortState>({
    field: 'created_at',
    direction: 'desc'
  });
  
  const [groupByTag, setGroupByTag] = useState<string>("");
  const [showGroupedView, setShowGroupedView] = useState(false);
  
  // Estados dos filtros
  const [filters, setFilters] = useState<FilterState>({
    title: "",
    category: "",
    status: "",
    dateRange: {
      start: "",
      end: ""
    },
    tags: "",
    emotionTags: ""
  });

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

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setFilters({
      title: "",
      category: "",
      status: "",
      dateRange: {
        start: "",
        end: ""
      },
      tags: "",
      emotionTags: ""
    });
    setSearch("");
  };

  // Função para verificar se há filtros ativos
  const hasActiveFilters = () => {
    return (
      filters.title !== "" ||
      filters.category !== "" ||
      filters.status !== "" ||
      filters.dateRange.start !== "" ||
      filters.dateRange.end !== "" ||
      filters.tags !== "" ||
      filters.emotionTags !== "" ||
      search !== ""
    );
  };

  // Função para obter categorias únicas
  const uniqueCategories = useMemo(() => {
    const categories = posts.map(post => post.category);
    return [...new Set(categories)].sort();
  }, [posts]);

  // Função para obter tags únicas
  const uniqueTags = useMemo(() => {
    const allTags = posts.flatMap(post => [...post.tags, ...post.emotion_tags]);
    return [...new Set(allTags)].sort();
  }, [posts]);

  // Função para ordenar posts
  const sortPosts = (postsToSort: Post[]) => {
    return [...postsToSort].sort((a, b) => {
      let aValue: string | Date | boolean;
      let bValue: string | Date | boolean;

      switch (sortState.field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'is_published':
          aValue = a.is_published;
          bValue = b.is_published;
          break;
        case 'tags':
          aValue = [...a.tags, ...a.emotion_tags].join(', ').toLowerCase();
          bValue = [...b.tags, ...b.emotion_tags].join(', ').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortState.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortState.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Função para agrupar posts por tag
  const groupPostsByTag = (postsToGroup: Post[]) => {
    if (!groupByTag) return { "Todos os Posts": postsToGroup };

    const grouped: GroupedPosts = {};
    
    postsToGroup.forEach(post => {
      const allTags = [...post.tags, ...post.emotion_tags];
      const matchingTags = allTags.filter(tag => 
        tag.toLowerCase().includes(groupByTag.toLowerCase())
      );
      
      if (matchingTags.length > 0) {
        matchingTags.forEach(tag => {
          if (!grouped[tag]) {
            grouped[tag] = [];
          }
          grouped[tag].push(post);
        });
      } else {
        if (!grouped["Sem Tag Correspondente"]) {
          grouped["Sem Tag Correspondente"] = [];
        }
        grouped["Sem Tag Correspondente"].push(post);
      }
    });

    return grouped;
  };

  // Função para filtrar posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Filtro de busca geral
      const searchLower = search.toLowerCase();
      const matchesSearch = search === "" || (
        post.title.toLowerCase().includes(searchLower) ||
        post.description.toLowerCase().includes(searchLower) ||
        post.category.toLowerCase().includes(searchLower) ||
        post.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
        post.emotion_tags.some((emo: string) => emo.toLowerCase().includes(searchLower))
      );

      // Filtro por título
      const matchesTitle = filters.title === "" || 
        post.title.toLowerCase().includes(filters.title.toLowerCase());

      // Filtro por categoria
      const matchesCategory = filters.category === "" || 
        post.category === filters.category;

      // Filtro por status
      const matchesStatus = filters.status === "" || 
        (filters.status === "published" && post.is_published) ||
        (filters.status === "draft" && !post.is_published);

      // Filtro por data
      const postDate = new Date(post.created_at);
      const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
      const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
      
      const matchesDate = (!startDate || postDate >= startDate) && 
                         (!endDate || postDate <= endDate);

      // Filtro por tags
      const matchesTags = filters.tags === "" || 
        post.tags.some(tag => tag.toLowerCase().includes(filters.tags.toLowerCase()));

      // Filtro por emotion tags
      const matchesEmotionTags = filters.emotionTags === "" || 
        post.emotion_tags.some(tag => tag.toLowerCase().includes(filters.emotionTags.toLowerCase()));

      return matchesSearch && matchesTitle && matchesCategory && matchesStatus && 
             matchesDate && matchesTags && matchesEmotionTags;
    });
  }, [posts, search, filters]);

  // Posts ordenados e agrupados
  const processedPosts = useMemo(() => {
    const sorted = sortPosts(filteredPosts);
    return showGroupedView ? groupPostsByTag(sorted) : { "Todos os Posts": sorted };
  }, [filteredPosts, sortState, groupByTag, showGroupedView]);

  // Função para alternar ordenação
  const toggleSort = (field: SortField) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Função para obter ícone de ordenação
  const getSortIcon = (field: SortField) => {
    if (sortState.field !== field) {
      return (
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="text-gray-400">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      );
    }
    
    return sortState.direction === 'asc' ? (
      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="text-blue-600">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/>
      </svg>
    ) : (
      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" className="text-blue-600">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
      </svg>
    );
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
          <div className="w-full max-w-6xl flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-1 text-gray-900" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
              Gerir Conteúdo
            </h1>
            <div className="text-sm text-gray-600 mb-6 font-medium">Monitore e edite o seu conteúdo</div>
            
            {/* Barra de busca e filtros */}
            <div className="w-full mb-6 space-y-4">
              {/* Barra de busca principal */}
              <div className="flex items-center w-full justify-center">
                <span className="pl-3 pr-2 text-gray-600">
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

              {/* Botões de controle */}
              <div className="flex justify-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.586a1 1 0 0 1-.293.707l-6.414 6.414a1 1 0 0 0-.293.707V17l-4 4v-6.586a1 1 0 0 0-.293-.707L3.293 7.293A1 1 0 0 1 3 6.586V4Z"/>
                  </svg>
                  {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                </button>
                
                <button
                  onClick={() => setShowGroupedView(!showGroupedView)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 ${
                    showGroupedView 
                      ? 'text-blue-600 bg-blue-50 border border-blue-300 hover:bg-blue-100 focus:ring-blue-500'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-black'
                  }`}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"/>
                  </svg>
                  {showGroupedView ? 'Vista Normal' : 'Agrupar por Tag'}
                </button>
                
                {hasActiveFilters() && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Limpar Filtros
                  </button>
                )}
              </div>

              {/* Painel de filtros */}
              {showFilters && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Filtro por título */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Título
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="Filtrar por título..."
                        value={filters.title}
                        onChange={e => setFilters(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>

                    {/* Filtro por categoria */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Categoria
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                        value={filters.category}
                        onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="">Todas as categorias</option>
                        {uniqueCategories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro por status */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Status
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                        value={filters.status}
                        onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="">Todos os status</option>
                        <option value="published">Publicado</option>
                        <option value="draft">Rascunho</option>
                      </select>
                    </div>

                    {/* Filtro por data de início */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Data de Início
                      </label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                        value={filters.dateRange.start}
                        onChange={e => setFilters(prev => ({ 
                          ...prev, 
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                      />
                    </div>

                    {/* Filtro por data de fim */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Data de Fim
                      </label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                        value={filters.dateRange.end}
                        onChange={e => setFilters(prev => ({ 
                          ...prev, 
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                      />
                    </div>

                    {/* Filtro por tags */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Tags
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="Filtrar por tags..."
                        value={filters.tags}
                        onChange={e => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                      />
                    </div>

                    {/* Filtro por emotion tags */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Tags de Emoção
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="Filtrar por emotion tags..."
                        value={filters.emotionTags}
                        onChange={e => setFilters(prev => ({ ...prev, emotionTags: e.target.value }))}
                      />
                    </div>

                    {/* Agrupamento por tag */}
                    {showGroupedView && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Agrupar por Tag
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                          value={groupByTag}
                          onChange={e => setGroupByTag(e.target.value)}
                        >
                          <option value="">Selecionar tag para agrupar</option>
                          {uniqueTags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Tags disponíveis */}
                  {uniqueTags.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Tags Disponíveis
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {uniqueTags.slice(0, 10).map(tag => (
                          <button
                            key={tag}
                            onClick={() => setFilters(prev => ({ ...prev, tags: tag }))}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                        {uniqueTags.length > 10 && (
                          <span className="text-xs text-gray-600 self-center font-medium">
                            +{uniqueTags.length - 10} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contador de resultados */}
            {!loading && !error && (
              <div className="w-full max-w-4xl mb-4">
                <div className="flex justify-between items-center text-sm text-gray-700">
                  <span className="font-medium">
                    {filteredPosts.length} de {posts.length} posts encontrados
                    {showGroupedView && groupByTag && ` • Agrupados por "${groupByTag}"`}
                  </span>
                  {hasActiveFilters() && (
                    <span className="text-blue-600 font-semibold">
                      Filtros ativos
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Estados de carregamento e erro */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
                <span className="text-gray-700 font-medium">Carregando posts...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 w-full max-w-4xl">
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
                    <p className="text-gray-600 mb-4">
                      {posts.length === 0 
                        ? 'Ainda não tem posts criados.'
                        : hasActiveFilters()
                        ? 'Nenhum post encontrado com os filtros aplicados.'
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
                    {hasActiveFilters() && posts.length > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-200 flex items-center gap-2"
                      >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full space-y-6">
                    {Object.entries(processedPosts).map(([groupName, groupPosts]) => (
                      <div key={groupName} className="bg-white rounded-lg shadow border overflow-hidden">
                        {/* Cabeçalho do grupo */}
                        {showGroupedView && (
                          <div className="bg-gray-50 px-6 py-3 border-b">
                            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A1.994 1.994 0 0 1 3 12V7a4 4 0 0 1 4-4Z"/>
                              </svg>
                              {groupName} ({groupPosts.length} posts)
                            </h3>
                          </div>
                        )}
                        
                        {/* Tabela */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left px-6 py-3 font-semibold text-gray-900">
                                  <button
                                    onClick={() => toggleSort('title')}
                                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                  >
                                    Título
                                    {getSortIcon('title')}
                                  </button>
                                </th>
                                <th className="text-left px-6 py-3 font-semibold text-gray-900">
                                  <button
                                    onClick={() => toggleSort('category')}
                                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                  >
                                    Categoria
                                    {getSortIcon('category')}
                                  </button>
                                </th>
                                <th className="text-left px-6 py-3 font-semibold text-gray-900">
                                  <button
                                    onClick={() => toggleSort('created_at')}
                                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                  >
                                    Data de Criação
                                    {getSortIcon('created_at')}
                                  </button>
                                </th>
                                <th className="text-left px-6 py-3 font-semibold text-gray-900">
                                  <button
                                    onClick={() => toggleSort('is_published')}
                                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                  >
                                    Status
                                    {getSortIcon('is_published')}
                                  </button>
                                </th>
                                <th className="text-left px-6 py-3 font-semibold text-gray-900">
                                  <button
                                    onClick={() => toggleSort('tags')}
                                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                  >
                                    Tags
                                    {getSortIcon('tags')}
                                  </button>
                                </th>
                                <th className="text-left px-6 py-3 font-semibold text-gray-900">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupPosts.map((post) => (
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
                                  <td className="px-6 py-4 text-gray-700 text-sm font-medium">
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
                                        <span className="text-gray-600 text-xs font-medium">
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
                      </div>
                    ))}
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