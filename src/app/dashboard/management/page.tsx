"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import { getUserPosts, togglePostPublication, deletePost, Post, getTagsForPost } from "@/services/posts";
import { useAuth } from "@/context/AuthContext";
import { DeleteConfirmationModal, PublishToggleModal, NotificationModal } from "@/components/modals";
import { EMOTIONS } from '@/lib/emotions';

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
type SortField = 'title' | 'category' | 'created_at' | 'is_published' | 'tags' | 'emotion_tags';
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

  const [readingTagsMap, setReadingTagsMap] = useState<{[postId: string]: {id: string, name: string, color?: string}[]}>({});

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

  // Buscar categorias de leitura para posts de leitura
  useEffect(() => {
    const fetchReadingTags = async () => {
      const readingPosts = posts.filter(post => post.category === 'Leitura');
      console.log('📚 Posts de leitura encontrados:', readingPosts.length);
      
      const tagsMap: {[postId: string]: {id: string, name: string, color?: string}[]} = {};
      
      for (const post of readingPosts) {
        try {
          console.log(`🔍 Buscando tags para post ${post.id}: ${post.title}`);
          const tags = await getTagsForPost(post.id);
          console.log(`✅ Tags encontradas para post ${post.id}:`, tags);
          tagsMap[post.id] = tags;
        } catch (error) {
          console.error(`❌ Erro ao buscar tags para post ${post.id}:`, error);
          // Fallback: usar categoria_leitura do post se disponível
          if (post.categoria_leitura && post.categoria_leitura.length > 0) {
            console.log(`📝 Usando categoria_leitura como fallback para post ${post.id}:`, post.categoria_leitura);
            tagsMap[post.id] = post.categoria_leitura.map((cat, index) => ({
              id: `fallback-${index}`,
              name: cat,
              color: '#3B82F6'
            }));
          } else {
            tagsMap[post.id] = [];
          }
        }
      }
      
      console.log('🗂️ Mapa final de tags:', tagsMap);
      setReadingTagsMap(tagsMap);
    };

    if (posts.length > 0) {
      fetchReadingTags();
    }
  }, [posts]);

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
    const allTags = posts.flatMap(post => post.tags);
    return [...new Set(allTags)].sort();
  }, [posts]);

  // Função para obter emotion tags únicas
  const uniqueEmotionTags = useMemo(() => {
    const allEmotionTags = posts.flatMap(post => post.emotion_tags);
    return [...new Set(allEmotionTags)].sort();
  }, [posts]);

  // Função para ordenar posts
  const sortPosts = useCallback((postsToSort: Post[]) => {
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
          aValue = a.tags.join(', ').toLowerCase();
          bValue = b.tags.join(', ').toLowerCase();
          break;
        case 'emotion_tags':
          aValue = a.emotion_tags.join(', ').toLowerCase();
          bValue = b.emotion_tags.join(', ').toLowerCase();
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
  }, [sortState]);

  // Função para agrupar posts por tag
  const groupPostsByTag = useCallback((postsToGroup: Post[]) => {
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
  }, [groupByTag]);

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
  }, [filteredPosts, showGroupedView, sortPosts, groupPostsByTag]);

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

    // Verificar se o post está publicado
    const postToDelete = posts.find(p => p.id === deleteModal.postId);
    if (postToDelete?.is_published) {
      showNotification(
        "error", 
        "Eliminação Bloqueada", 
        "Este post está publicado. Despublique-o primeiro antes de eliminá-lo."
      );
      closeDeleteModal();
      return;
    }

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
        <div className="min-h-screen bg-gray-50">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
                Gerir Conteúdo
              </h1>
              <p className="mt-1 text-gray-600">Monitore e edite o seu conteúdo de forma eficiente</p>
            </div>
            
            {/* Controles e filtros */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              {/* Barra de busca principal */}
              <div className="mb-4">
                <div className="relative max-w-2xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.6 10.6Z"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Pesquise por título, categoria, tag ou tag de emoção"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ fontFamily: 'Inter, Quicksand, sans-serif' }}
                  />
                </div>
              </div>

              {/* Linha de controles */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.586a1 1 0 0 1-.293.707l-6.414 6.414a1 1 0 0 0-.293.707V17l-4 4v-6.586a1 1 0 0 0-.293-.707L3.293 7.293A1 1 0 0 1 3 6.586V4Z"/>
                    </svg>
                    {showFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
                  </button>
                  
                  <button
                    onClick={() => setShowGroupedView(!showGroupedView)}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      showGroupedView 
                        ? 'text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 focus:ring-blue-500'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-blue-500'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"/>
                    </svg>
                    {showGroupedView ? 'Vista Normal' : 'Agrupar por Tag'}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {!loading && !error && (
                    <span className="text-sm text-gray-600 font-medium">
                      {filteredPosts.length} de {posts.length} posts
                    </span>
                  )}
                  
                  {hasActiveFilters() && (
                    <button
                      onClick={clearAllFilters}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Painel de filtros expandido */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                    {/* Filtro por título */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Título
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Filtrar por título..."
                        value={filters.title}
                        onChange={e => setFilters(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>

                    {/* Filtro por categoria */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoria
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.status}
                        onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="">Todos os status</option>
                        <option value="published">Publicado</option>
                        <option value="draft">Rascunho</option>
                      </select>
                    </div>

                    {/* Agrupamento por tag */}
                    {showGroupedView && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Agrupar por Tag
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={groupByTag}
                          onChange={e => setGroupByTag(e.target.value)}
                        >
                          <option value="">Selecionar tag para agrupar</option>
                          {uniqueTags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                          {EMOTIONS.map(tag => (
                            <option key={`emotion-${tag}`} value={tag}>{tag} (emoção)</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Filtro por data de início */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Início
                      </label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.dateRange.start}
                        onChange={e => setFilters(prev => ({ 
                          ...prev, 
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                      />
                    </div>

                    {/* Filtro por data de fim */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Fim
                      </label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.dateRange.end}
                        onChange={e => setFilters(prev => ({ 
                          ...prev, 
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                      />
                    </div>

                    {/* Filtro por tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tags
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Filtrar por tags..."
                        value={filters.tags}
                        onChange={e => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Tags disponíveis */}
                  {(uniqueTags.length > 0 || uniqueEmotionTags.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Tags normais */}
                      {uniqueTags.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Tags Disponíveis
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {uniqueTags.slice(0, 8).map(tag => (
                              <button
                                key={tag}
                                onClick={() => setFilters(prev => ({ ...prev, tags: tag }))}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                              >
                                {tag}
                              </button>
                            ))}
                            {uniqueTags.length > 8 && (
                              <span className="text-sm text-gray-500 self-center font-medium">
                                +{uniqueTags.length - 8} mais
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Emotion Tags */}
                      {uniqueEmotionTags.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Tags de Emoção
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {uniqueEmotionTags.slice(0, 8).map(tag => (
                              <button
                                key={tag}
                                onClick={() => setFilters(prev => ({ ...prev, emotionTags: tag }))}
                                className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                              >
                                {tag}
                              </button>
                            ))}
                            {uniqueEmotionTags.length > 8 && (
                              <span className="text-sm text-gray-500 self-center font-medium">
                                +{uniqueEmotionTags.length - 8} mais
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status e filtros ativos */}
            {!loading && !error && (
              <div className="mb-6 space-y-4">
                {/* Aviso sobre posts publicados */}
                {filteredPosts.some(post => post.is_published) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-blue-800">
                        <strong>ℹ️ Informação:</strong> Posts publicados não podem ser eliminados diretamente. 
                        Despublique primeiro para poder eliminá-los.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Filtros ativos */}
                {hasActiveFilters() && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Filtros Ativos</h4>
                      <span className="text-sm text-blue-600 font-medium">
                        {filteredPosts.length} resultado{filteredPosts.length !== 1 ? 's' : ''} encontrado{filteredPosts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {search && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          Busca: &ldquo;{search}&rdquo;
                          <button
                            onClick={() => setSearch("")}
                            className="ml-1 hover:text-blue-600"
                            title="Remover busca"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </span>
                      )}
                      
                      {filters.title && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          Título: &ldquo;{filters.title}&rdquo;
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, title: "" }))}
                            className="ml-1 hover:text-gray-600"
                            title="Remover filtro de título"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </span>
                      )}
                      
                      {filters.category && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          Categoria: {filters.category}
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, category: "" }))}
                            className="ml-1 hover:text-gray-600"
                            title="Remover filtro de categoria"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </span>
                      )}
                      
                      {filters.status && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          Status: {filters.status === "published" ? "Publicado" : "Rascunho"}
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, status: "" }))}
                            className="ml-1 hover:text-gray-600"
                            title="Remover filtro de status"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </span>
                      )}
                      
                      {filters.dateRange.start && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          Data início: {new Date(filters.dateRange.start).toLocaleDateString('pt-PT')}
                          <button
                            onClick={() => setFilters(prev => ({ 
                              ...prev, 
                              dateRange: { ...prev.dateRange, start: "" }
                            }))}
                            className="ml-1 hover:text-gray-600"
                            title="Remover filtro de data início"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </span>
                      )}
                      
                      {filters.dateRange.end && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          Data fim: {new Date(filters.dateRange.end).toLocaleDateString('pt-PT')}
                          <button
                            onClick={() => setFilters(prev => ({ 
                              ...prev, 
                              dateRange: { ...prev.dateRange, end: "" }
                            }))}
                            className="ml-1 hover:text-gray-600"
                            title="Remover filtro de data fim"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </span>
                      )}
                      
                      {filters.tags && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          Tag: &ldquo;{filters.tags}&rdquo;
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, tags: "" }))}
                            className="ml-1 hover:text-blue-600"
                            title="Remover filtro de tag"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </span>
                      )}
                      
                      {filters.emotionTags && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          Emoção: {filters.emotionTags}
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, emotionTags: "" }))}
                            className="ml-1 hover:text-purple-600"
                            title="Remover filtro de emoção"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                )}
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
                        
                        {/* Tabela Desktop Otimizada */}
                        <div className="hidden lg:block">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => toggleSort('title')}
                                      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
                                    >
                                      Título
                                      {getSortIcon('title')}
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => toggleSort('category')}
                                      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
                                    >
                                      Categoria
                                      {getSortIcon('category')}
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => toggleSort('created_at')}
                                      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
                                    >
                                      Data
                                      {getSortIcon('created_at')}
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => toggleSort('is_published')}
                                      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
                                    >
                                      Status
                                      {getSortIcon('is_published')}
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => toggleSort('tags')}
                                      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
                                    >
                                      Tags
                                      {getSortIcon('tags')}
                                    </button>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Categorias de Leitura
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {groupPosts.map((post) => (
                                  <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col">
                                        <button
                                          onClick={() => router.push(`/dashboard/details/${post.id}`)}
                                          className="text-left text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors truncate max-w-xs"
                                          title={post.title}
                                        >
                                          {post.title}
                                        </button>
                                        <p className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={post.description}>
                                          {post.description}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {post.category}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {formatDate(post.created_at)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        post.is_published 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {post.is_published ? 'Publicado' : 'Rascunho'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex flex-wrap gap-1">
                                        {post.tags.slice(0, 2).map((tag, index) => (
                                          <span
                                            key={index}
                                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                        {post.tags.length > 2 && (
                                          <span className="text-xs text-gray-500 self-center">
                                            +{post.tags.length - 2}
                                          </span>
                                        )}
                                        {post.emotion_tags.slice(0, 1).map((tag, index) => (
                                          <span
                                            key={`emotion-${index}`}
                                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                        {post.emotion_tags.length > 1 && (
                                          <span className="text-xs text-gray-500 self-center">
                                            +{post.emotion_tags.length - 1} emoções
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      {post.category === 'Leitura' ? (
                                        readingTagsMap[post.id] && readingTagsMap[post.id].length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {readingTagsMap[post.id].slice(0, 2).map((tag) => (
                                              <span
                                                key={tag.id}
                                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                                                style={{
                                                  backgroundColor: tag.color ? `${tag.color}20` : '#EBF8FF',
                                                  color: tag.color || '#2B6CB0'
                                                }}
                                              >
                                                {tag.name}
                                              </span>
                                            ))}
                                            {readingTagsMap[post.id].length > 2 && (
                                              <span className="text-xs text-gray-500 self-center">
                                                +{readingTagsMap[post.id].length - 2}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 text-xs italic">Sem categorias</span>
                                        )
                                      ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => router.push(`/dashboard/details/${post.id}`)}
                                          className="text-blue-600 hover:text-blue-900 transition-colors"
                                          title="Ver detalhes"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => openPublishModal(post.id, post.title, post.is_published)}
                                          className={`transition-colors ${
                                            post.is_published 
                                              ? 'text-yellow-600 hover:text-yellow-900' 
                                              : 'text-green-600 hover:text-green-900'
                                          }`}
                                          title={post.is_published ? 'Despublicar' : 'Publicar'}
                                        >
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
                                        </button>
                                        <button
                                          onClick={() => post.is_published ? null : openDeleteModal(post.id, post.title)}
                                          disabled={post.is_published}
                                          className={`transition-colors ${
                                            post.is_published 
                                              ? 'text-gray-400 cursor-not-allowed' 
                                              : 'text-red-600 hover:text-red-900'
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
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Layout Mobile - Cards */}
                        <div className="lg:hidden space-y-4">
                          {groupPosts.map((post) => (
                            <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                              {/* Título e Status */}
                              <div className="flex items-start justify-between mb-3">
                                <h3 
                                  className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 flex-1 mr-3"
                                  onClick={() => router.push(`/dashboard/details/${post.id}`)}
                                >
                                  {post.title}
                                </h3>
                                <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                                  post.is_published 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {post.is_published ? 'Publicado' : 'Rascunho'}
                                </span>
                              </div>

                              {/* Informações secundárias */}
                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Categoria:</span>
                                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                    {post.category}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Data:</span>
                                  <span>{formatDate(post.created_at)}</span>
                                </div>

                                {post.tags.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-medium mt-1">Tags:</span>
                                    <div className="flex flex-wrap gap-1 flex-1">
                                      {post.tags.slice(0, 4).map((tag, idx) => (
                                        <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                          {tag}
                                        </span>
                                      ))}
                                      {post.tags.length > 4 && (
                                        <span className="text-gray-600 text-xs font-medium self-center">
                                          +{post.tags.length - 4}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {post.emotion_tags.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-medium mt-1">Emoções:</span>
                                    <div className="flex flex-wrap gap-1 flex-1">
                                      {post.emotion_tags.slice(0, 4).map((tag, idx) => (
                                        <span key={idx} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                                          {tag}
                                        </span>
                                      ))}
                                      {post.emotion_tags.length > 4 && (
                                        <span className="text-gray-600 text-xs font-medium self-center">
                                          +{post.emotion_tags.length - 4}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {post.category === 'Leitura' && (
                                  <div className="flex items-start gap-2">
                                    <span className="font-medium mt-1">Categorias de Leitura:</span>
                                    <div className="flex flex-wrap gap-1 flex-1">
                                      {readingTagsMap[post.id] && readingTagsMap[post.id].length > 0 ? (
                                        <>
                                          {readingTagsMap[post.id].slice(0, 4).map((tag) => (
                                            <span 
                                              key={tag.id} 
                                              className="px-2 py-1 rounded text-xs font-medium"
                                              style={{ 
                                                background: tag.color || '#3B82F6', 
                                                color: '#fff',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                              }}
                                            >
                                              {tag.name}
                                            </span>
                                          ))}
                                          {readingTagsMap[post.id].length > 4 && (
                                            <span className="text-gray-600 text-xs font-medium self-center">
                                              +{readingTagsMap[post.id].length - 4}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-gray-400 text-xs italic">Sem categorias</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Ações */}
                              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
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
                                  onClick={() => post.is_published ? null : openDeleteModal(post.id, post.title)}
                                  disabled={post.is_published}
                                  className={`text-sm font-medium flex items-center gap-1 transition-colors ${
                                    post.is_published 
                                      ? 'text-gray-400 cursor-not-allowed opacity-50' 
                                      : 'text-red-600 hover:text-red-800 cursor-pointer'
                                  }`}
                                  title={
                                    post.is_published 
                                      ? "Para eliminar este post, despublique-o primeiro" 
                                      : "Eliminar post"
                                  }
                                >
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                                  </svg>
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          ))}
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
        message={
          posts.find(p => p.id === deleteModal.postId)?.is_published 
            ? `Atenção: O post &quot;${deleteModal.postTitle}&quot; está publicado e não pode ser eliminado. Despublique-o primeiro.`
            : `Tem certeza que deseja eliminar o post &quot;${deleteModal.postTitle}&quot;? Esta ação não pode ser desfeita.`
        }
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