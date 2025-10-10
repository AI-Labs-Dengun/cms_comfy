"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import CMSLayout from "@/components/CMSLayout";
import { getUserPosts, togglePostPublication, deletePost, Post, getTagsForPost } from "@/services/posts";
import { useAuth } from "@/context/AuthContext";
import { DeleteConfirmationModal, PublishToggleModal } from "@/components/modals";
import { toast } from 'react-hot-toast';
import { EMOTIONS } from '@/lib/emotions';
import { ManagementDataTable, DataTableFeatureFlag } from "@/components/data-table";

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

// Tipos para ações em lote
interface BulkActionState {
  selectedPosts: Set<string>;
  isPerformingAction: boolean;
}

interface BulkActionModal {
  isOpen: boolean;
  action: 'delete' | 'publish' | 'unpublish' | null;
  posts: Post[];
  isLoading: boolean;
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

  // notifications handled via global HotToaster (react-hot-toast)

  // Estados para seleção múltipla
  const [bulkAction, setBulkAction] = useState<BulkActionState>({
    selectedPosts: new Set(),
    isPerformingAction: false
  });

  // Log das mudanças no estado de seleção
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Estado bulkAction mudou:`, {
        selectedCount: bulkAction.selectedPosts.size,
        selectedIds: Array.from(bulkAction.selectedPosts),
        isPerformingAction: bulkAction.isPerformingAction
      });
    }
  }, [bulkAction]);

  const [bulkActionModal, setBulkActionModal] = useState<BulkActionModal>({
    isOpen: false,
    action: null,
    posts: [],
    isLoading: false
  });

  const [readingTagsMap, setReadingTagsMap] = useState<{[postId: string]: {id: string, name: string, color?: string}[]}>({});

  // Feature flag para alternar entre tabela atual e DataTable
  const [useNewDataTable, setUseNewDataTable] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cms-use-new-datatable')
      return saved === 'true'
    }
    return false
  });

  // Persist feature flag state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cms-use-new-datatable', String(useNewDataTable))
    }
  }, [useNewDataTable]);

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

  // Funções para seleção múltipla
  const togglePostSelection = (postId: string) => {
    setBulkAction(prev => {
      const newSelected = new Set(prev.selectedPosts);
      if (newSelected.has(postId)) {
        newSelected.delete(postId);
        if (process.env.NODE_ENV === 'development') {
          console.log(`➖ Post desmarcado: ${postId}. Total selecionados: ${newSelected.size}`);
        }
      } else {
        newSelected.add(postId);
        if (process.env.NODE_ENV === 'development') {
          console.log(`➕ Post marcado: ${postId}. Total selecionados: ${newSelected.size}`);
        }
      }
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Posts selecionados:`, Array.from(newSelected));
      }
      return {
        ...prev,
        selectedPosts: newSelected
      };
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectAllPosts = () => {
    setBulkAction(prev => ({
      ...prev,
      selectedPosts: new Set(filteredPosts.map(post => post.id))
    }));
  };

  const selectAllPostsInGroup = (groupPosts: Post[]) => {
    setBulkAction(prev => {
      const newSelected = new Set(prev.selectedPosts);
      groupPosts.forEach(post => newSelected.add(post.id));
      return {
        ...prev,
        selectedPosts: newSelected
      };
    });
  };

  const clearSelection = () => {
    setBulkAction(prev => ({
      ...prev,
      selectedPosts: new Set()
    }));
  };

  const getSelectedPosts = () => {
    const selectedIds = Array.from(bulkAction.selectedPosts);
    const selected = posts.filter(post => bulkAction.selectedPosts.has(post.id));
    
    // Debug: Remover em produção
    if (process.env.NODE_ENV === 'development') {
      console.log(`📋 getSelectedPosts debug:`, {
        selectedPostIds: selectedIds,
        totalPosts: posts.length,
        postsEncontrados: selected.length,
        selectedPosts: selected.map(p => ({ id: p.id, title: p.title, published: p.is_published }))
      });
      
      // Verificar se há IDs selecionados que não foram encontrados
      const notFoundIds = selectedIds.filter(id => !posts.find(p => p.id === id));
      if (notFoundIds.length > 0) {
        console.warn(`⚠️ Posts selecionados não encontrados:`, notFoundIds);
      }
    }
    
    return selected;
  };

  // Função alternativa para obter posts selecionados dos filtrados (para ações de seleção)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getSelectedPostsFromFiltered = () => {
    return filteredPosts.filter(post => bulkAction.selectedPosts.has(post.id));
  };

  // Função para determinar ações disponíveis para posts selecionados
  const getAvailableBulkActions = () => {
    const selectedPosts = getSelectedPosts();
    if (selectedPosts.length === 0) return [];

    const publishedCount = selectedPosts.filter(post => post.is_published).length;
    const unpublishedCount = selectedPosts.filter(post => !post.is_published).length;

    const actions = [];

    // Ação de deletar - só é possível se todos os posts estão despublicados
    if (unpublishedCount === selectedPosts.length) {
      actions.push('delete');
    }

    // Ações de publicar/despublicar
    if (publishedCount === selectedPosts.length) {
      // Todos publicados - mostrar opção de despublicar
      actions.push('unpublish');
    } else if (unpublishedCount === selectedPosts.length) {
      // Todos despublicados - mostrar opção de publicar
      actions.push('publish');
    }
    // Se há posts com status diferentes, não mostra ações de publicar/despublicar

    return actions;
  };

  const openBulkActionModal = (action: 'delete' | 'publish' | 'unpublish') => {
    const selectedPosts = getSelectedPosts();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔓 Abrindo modal para ação "${action}" com ${selectedPosts.length} posts:`, selectedPosts.map(p => p.title));
      console.log(`📋 Posts selecionados (IDs):`, Array.from(bulkAction.selectedPosts));
      console.log(`📊 Estado da seleção:`, { 
        selectedCount: bulkAction.selectedPosts.size,
        postsEncontrados: selectedPosts.length,
        todosOsPosts: posts.length 
      });
      console.log(`🔍 Verificação de consistência:`, {
        bulkActionSize: bulkAction.selectedPosts.size,
        getSelectedPostsLength: selectedPosts.length,
        saoIguais: bulkAction.selectedPosts.size === selectedPosts.length
      });
    }
    
    if (selectedPosts.length === 0) {
  toast.error("Nenhum post selecionado");
      return;
    }
    
    setBulkActionModal({
      isOpen: true,
      action,
      posts: selectedPosts,
      isLoading: false
    });
  };

  const closeBulkActionModal = () => {
    setBulkActionModal(prev => ({ ...prev, isOpen: false }));
  };

  // Handler para conectar DataTable bulk actions com nosso sistema
  const handleDataTableBulkAction = (action: 'delete' | 'publish' | 'unpublish', selectedPosts: Post[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔗 DataTable bulk action interceptada: ${action} para ${selectedPosts.length} posts`);
    }
    
    // Usar nosso sistema de modal de confirmação bulk
    setBulkActionModal({
      isOpen: true,
      action,
      posts: selectedPosts,
      isLoading: false
    });
  };

  // Função para validar a consistência dos dados antes de executar ações em lote
  const validateBulkAction = (action: 'delete' | 'publish' | 'unpublish', selectedPosts: Post[]) => {
    if (selectedPosts.length === 0) {
      return { valid: false, error: 'Nenhum post selecionado' };
    }

    const publishedCount = selectedPosts.filter(post => post.is_published).length;
    const unpublishedCount = selectedPosts.filter(post => !post.is_published).length;

    switch (action) {
      case 'delete':
        if (publishedCount > 0) {
          return { 
            valid: false, 
            error: `Não é possível deletar posts publicados. ${publishedCount} post${publishedCount !== 1 ? 's' : ''} publicado${publishedCount !== 1 ? 's' : ''} encontrado${publishedCount !== 1 ? 's' : ''}` 
          };
        }
        break;
      case 'publish':
        if (publishedCount > 0) {
          return { 
            valid: false, 
            error: `Não é possível publicar posts já publicados. ${publishedCount} post${publishedCount !== 1 ? 's' : ''} já publicado${publishedCount !== 1 ? 's' : ''} encontrado${publishedCount !== 1 ? 's' : ''}` 
          };
        }
        break;
      case 'unpublish':
        if (unpublishedCount > 0) {
          return { 
            valid: false, 
            error: `Não é possível despublicar posts já despublicados. ${unpublishedCount} post${unpublishedCount !== 1 ? 's' : ''} já despublicado${unpublishedCount !== 1 ? 's' : ''} encontrado${unpublishedCount !== 1 ? 's' : ''}` 
          };
        }
        break;
    }

    return { valid: true };
  };

  // Função para executar ações em lote
  const handleBulkAction = async (action: 'delete' | 'publish' | 'unpublish') => {
    setBulkActionModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 INÍCIO handleBulkAction:`, {
          action,
          modalPosts: bulkActionModal.posts.length,
          bulkActionSelectedPosts: bulkAction.selectedPosts.size,
          modalPostTitles: bulkActionModal.posts.map(p => p.title),
          selectedPostIds: Array.from(bulkAction.selectedPosts),
          modalState: {
            isOpen: bulkActionModal.isOpen,
            action: bulkActionModal.action,
            isLoading: bulkActionModal.isLoading
          }
        });
      }
      
      // Usar os posts que estão no modal em vez de chamar getSelectedPosts() novamente
      const selectedPosts = bulkActionModal.posts;
      
      if (selectedPosts.length === 0) {
  toast.error("Nenhum post selecionado para processar");
        setBulkActionModal(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      // Validar antes de executar
      const validation = validateBulkAction(action, selectedPosts);
      if (!validation.valid) {
  toast.error(validation.error!);
        setBulkActionModal(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Iniciando ação em lote "${action}" para ${selectedPosts.length} posts:`, selectedPosts.map(p => p.title));
      }
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const successfulPostIds: string[] = [];

      // Processar todos os posts em paralelo para melhor performance
      const promises = selectedPosts.map(async (post) => {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log(`📝 Processando post: ${post.title} (ID: ${post.id})`);
          }
          let response;
          
          switch (action) {
            case 'delete':
              response = await deletePost(post.id);
              break;
            case 'publish':
              response = await togglePostPublication(post.id, true);
              break;
            case 'unpublish':
              response = await togglePostPublication(post.id, false);
              break;
          }

          if (response?.success) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Sucesso para post: ${post.title}`);
            }
            return { success: true, postId: post.id, title: post.title };
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log(`❌ Erro para post: ${post.title} - ${response?.error}`);
            }
            return { success: false, postId: post.id, title: post.title, error: response?.error || 'Erro desconhecido' };
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`💥 Exceção para post: ${post.title} - ${error}`);
          }
          return { success: false, postId: post.id, title: post.title, error: 'Erro inesperado' };
        }
      });

      // Aguardar todos os resultados
      const results = await Promise.all(promises);

      // Processar resultados
      results.forEach(result => {
        if (result.success) {
          successCount++;
          successfulPostIds.push(result.postId);
        } else {
          errorCount++;
          errors.push(`${result.title}: ${result.error}`);
        }
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Resultados: ${successCount} sucessos, ${errorCount} erros`);
        console.log(`📋 Posts processados com sucesso:`, successfulPostIds);
      }

      // Atualizar estado local baseado na ação
      if (successCount > 0) {
        if (action === 'delete') {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🗑️ Removendo ${successfulPostIds.length} posts do estado local`);
          }
          // Remover posts deletados com sucesso
          setPosts(prev => {
            const filtered = prev.filter(post => !successfulPostIds.includes(post.id));
            if (process.env.NODE_ENV === 'development') {
              console.log(`📦 Estado atualizado: ${prev.length} -> ${filtered.length} posts`);
            }
            return filtered;
          });
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`📝 Atualizando status de publicação para ${successfulPostIds.length} posts`);
          }
          // Atualizar status de publicação dos posts que foram atualizados com sucesso
          const newPublishState = action === 'publish';
          setPosts(prev => {
            const updated = prev.map(post => 
              successfulPostIds.includes(post.id) 
                ? { ...post, is_published: newPublishState }
                : post
            );
            if (process.env.NODE_ENV === 'development') {
              const updatedCount = updated.filter(p => successfulPostIds.includes(p.id)).length;
              console.log(`📦 Status atualizado para ${updatedCount} posts (is_published: ${newPublishState})`);
            }
            return updated;
          });
        }
      }

      // Limpar seleção
      clearSelection();
      closeBulkActionModal();

      // Recarregar dados para garantir consistência (opcional, para casos críticos)
      if (successCount > 0 && process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          loadPosts();
        }, 1000);
      }

      // Mostrar notificação
      if (errorCount === 0) {
        const actionText = action === 'delete' ? 'eliminados' : 
                          action === 'publish' ? 'publicados' : 'despublicados';
        toast.success(`${successCount} post${successCount !== 1 ? 's' : ''} ${actionText} com sucesso!`);
      } else if (successCount === 0) {
        toast.error(`Erro ao processar todos os posts: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? ` e mais ${errors.length - 3}...` : ''}`);
      } else {
        const actionText = action === 'delete' ? 'eliminados' : 
                          action === 'publish' ? 'publicados' : 'despublicados';
        toast(`${successCount} post${successCount !== 1 ? 's' : ''} ${actionText}. ${errorCount} falharam: ${errors.slice(0, 2).join(', ')}${errors.length > 2 ? '...' : ''}`);
      }

    } catch (error) {
      console.error('💥 Erro geral na ação em lote:', error);
      toast.error('Erro inesperado ao processar ação em lote');
    } finally {
      setBulkActionModal(prev => ({ ...prev, isLoading: false }));
    }
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
  // Notifications handled via HotToaster (react-hot-toast)

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
        toast.success(`Post ${!publishModal.isPublished ? 'publicado' : 'despublicado'} com sucesso!`);
      } else {
    toast.error(response.error || 'Erro ao alterar status de publicação');
      }
    } catch (err) {
      console.error('Erro ao alterar publicação:', err);
  toast.error('Erro inesperado ao alterar status de publicação');
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
      toast.error("Este post está publicado. Despublique-o primeiro antes de eliminá-lo.");
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
        toast.success("Post eliminado com sucesso!");
      } else {
        toast.error(response.error || 'Erro ao eliminar post');
      }
    } catch (err) {
  console.error('Erro ao eliminar post:', err);
  toast.error('Erro inesperado ao eliminar post');
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

  // Componente da barra de ações em lote
  const BulkActionBar = () => {
    const selectedCount = bulkAction.selectedPosts.size;
    const availableActions = getAvailableBulkActions();
    const selectedPosts = getSelectedPosts();
    const publishedCount = selectedPosts.filter(post => post.is_published).length;
    const unpublishedCount = selectedPosts.filter(post => !post.is_published).length;

    if (selectedCount === 0) return null;

    // Verificar se cada ação está disponível
    const canDelete = availableActions.includes('delete');
    const canPublish = availableActions.includes('publish');
    const canUnpublish = availableActions.includes('unpublish');
    const hasMixedStatus = publishedCount > 0 && unpublishedCount > 0;

    // Debug log em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎯 BulkActionBar debug:`, {
        selectedCount,
        selectedPosts: selectedPosts.map(p => p.title),
        availableActions,
        publishedCount,
        unpublishedCount,
        hasMixedStatus
      });
    }

    return (
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg px-6 py-4 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {selectedCount} post{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={clearSelection}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Limpar seleção
            </button>
          </div>

          <div className="h-4 border-l border-gray-300"></div>

          <div className="flex items-center gap-3">
            {/* Mensagem para status mistos */}
            {hasMixedStatus && (
              <div className="text-sm text-yellow-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
                Posts com status diferentes
              </div>
            )}

            {/* Botão Deletar */}
            <button
              onClick={canDelete ? () => openBulkActionModal('delete') : undefined}
              disabled={!canDelete}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                canDelete 
                  ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              }`}
              title={!canDelete ? 'Só é possível deletar posts que estão todos despublicados' : ''}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
              </svg>
              Eliminar {selectedCount} post{selectedCount !== 1 ? 's' : ''}
            </button>

            {/* Botão Publicar */}
            <button
              onClick={canPublish ? () => openBulkActionModal('publish') : undefined}
              disabled={!canPublish}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                canPublish 
                  ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              }`}
              title={!canPublish ? 'Só é possível publicar posts que estão todos despublicados' : ''}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Publicar {selectedCount} post{selectedCount !== 1 ? 's' : ''}
            </button>

            {/* Botão Despublicar */}
            <button
              onClick={canUnpublish ? () => openBulkActionModal('unpublish') : undefined}
              disabled={!canUnpublish}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                canUnpublish 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700 cursor-pointer' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              }`}
              title={!canUnpublish ? 'Só é possível despublicar posts que estão todos publicados' : ''}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
              </svg>
              Despublicar {selectedCount} post{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Componente do modal de ações em lote
  const BulkActionModal = () => {
    if (!bulkActionModal.isOpen || !bulkActionModal.action) return null;

    // Debug log do modal
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 BulkActionModal debug:`, {
        isOpen: bulkActionModal.isOpen,
        action: bulkActionModal.action,
        postsCount: bulkActionModal.posts.length,
        posts: bulkActionModal.posts.map(p => ({ id: p.id, title: p.title }))
      });
    }

    const getModalConfig = () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const count = bulkActionModal.posts.length;
      switch (bulkActionModal.action) {
        case 'delete':
          return {
            title: 'Eliminar Conteúdo',
            actionText: 'Eliminar',
            actionDescription: 'O conteúdo será eliminado permanentemente.',
            statusText: 'Este conteúdo está atualmente publicado e será eliminado.',
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            buttonBg: 'bg-red-600 hover:bg-red-700',
            actionBoxBg: 'bg-red-50',
            actionBoxBorder: 'border-red-200',
            actionBoxIcon: 'text-red-600',
            statusBoxBg: 'bg-blue-50',
            statusBoxBorder: 'border-blue-200',
            statusBoxIcon: 'text-blue-600',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            )
          };
        case 'publish':
          return {
            title: 'Publicar Conteúdo',
            actionText: 'Tornar público',
            actionDescription: 'O conteúdo ficará visível para todos os usuários da plataforma.',
            statusText: 'Este conteúdo está atualmente privado e não é visível publicamente.',
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            buttonBg: 'bg-green-600 hover:bg-green-700',
            actionBoxBg: 'bg-green-50',
            actionBoxBorder: 'border-green-200',
            actionBoxIcon: 'text-green-600',
            statusBoxBg: 'bg-blue-50',
            statusBoxBorder: 'border-blue-200',
            statusBoxIcon: 'text-blue-600',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            )
          };
        case 'unpublish':
          return {
            title: 'Despublicar Conteúdo',
            actionText: 'Tornar privado',
            actionDescription: 'O conteúdo deixará de estar visível publicamente.',
            statusText: 'Este conteúdo está atualmente público e visível para todos.',
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            buttonBg: 'bg-amber-600 hover:bg-amber-700',
            actionBoxBg: 'bg-amber-50',
            actionBoxBorder: 'border-amber-200',
            actionBoxIcon: 'text-amber-600',
            statusBoxBg: 'bg-blue-50',
            statusBoxBorder: 'border-blue-200',
            statusBoxIcon: 'text-blue-600',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88"/>
              </svg>
            )
          };
        default:
          return {
            title: 'Confirmar Ação',
            actionText: 'Confirmar',
            actionDescription: '',
            statusText: '',
            iconBg: 'bg-gray-100',
            iconColor: 'text-gray-600',
            buttonBg: 'bg-blue-600 hover:bg-blue-700',
            actionBoxBg: 'bg-gray-50',
            actionBoxBorder: 'border-gray-200',
            actionBoxIcon: 'text-gray-600',
            statusBoxBg: 'bg-blue-50',
            statusBoxBorder: 'border-blue-200',
            statusBoxIcon: 'text-blue-600',
            icon: null
          };
      }
    };

    const config = getModalConfig();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.iconBg}`}>
                  <div className={config.iconColor}>
                    {config.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {config.title}
                </h3>
              </div>
              <button
                onClick={closeBulkActionModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            {/* Posts List */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Conteúdo ({bulkActionModal.posts.length}):
              </label>
              <div className={`space-y-2 ${
                bulkActionModal.posts.length > 10 
                  ? 'max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100' 
                  : ''
              }`}>
                {bulkActionModal.posts.map((post) => (
                  <div 
                    key={post.id}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
                  >
                    {post.title}
                  </div>
                ))}
              </div>
              {bulkActionModal.posts.length > 10 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Role para ver todos os {bulkActionModal.posts.length} posts selecionados
                </p>
              )}
            </div>

            {/* Action Info Box */}
            <div className={`p-4 rounded-lg border ${config.actionBoxBg} ${config.actionBoxBorder}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${config.actionBoxIcon}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">
                    {config.actionText}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {config.actionDescription}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Info Box */}
            <div className={`p-4 rounded-lg border ${config.statusBoxBg} ${config.statusBoxBorder}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${config.statusBoxIcon}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">
                    Status atual
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {config.statusText}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={closeBulkActionModal}
              disabled={bulkActionModal.isLoading}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleBulkAction(bulkActionModal.action!)}
              disabled={bulkActionModal.isLoading}
              className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 ${config.buttonBg}`}
            >
              {bulkActionModal.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <div className={config.iconColor}>
                    {config.icon}
                  </div>
                  {config.actionText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
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
            
            {/* Filtros avançados para implementação original */}
            {!useNewDataTable && (
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
            )}

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
                    {/* Alternar entre implementação atual e nova DataTable */}
                    {useNewDataTable ? (
                      /* Nova implementação com DataTable */
                      <ManagementDataTable
                        posts={posts}
                        filteredPosts={filteredPosts}
                        loading={loading}
                        search={search}
                        filters={filters}
                        readingTagsMap={readingTagsMap}
                        onOpenPublishModal={openPublishModal}
                        onOpenDeleteModal={openDeleteModal}
                        onBulkAction={handleDataTableBulkAction}
                        onViewPost={(postId) => router.push(`/dashboard/details/${postId}`)}
                        showFilters={showFilters}
                        onToggleFilters={() => setShowFilters(!showFilters)}
                        showGroupedView={showGroupedView}
                        onToggleGroupedView={() => setShowGroupedView(!showGroupedView)}
                        hasActiveFilters={hasActiveFilters()}
                        onClearAllFilters={clearAllFilters}
                      />
                    ) : (
                      /* Implementação atual (original) */
                      <>
                    {Object.entries(processedPosts).map(([groupName, groupPosts]) => (
                      <div key={groupName} className="bg-white rounded-lg shadow border overflow-hidden">
                        {/* Cabeçalho do grupo */}
                        {showGroupedView && (
                          <div className="bg-gray-50 px-6 py-3 border-b">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A1.994 1.994 0 0 1 3 12V7a4 4 0 0 1 4-4Z"/>
                                </svg>
                                {groupName} ({groupPosts.length} posts)
                              </h3>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600">Selecionar grupo:</label>
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  checked={groupPosts.every(post => bulkAction.selectedPosts.has(post.id))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      selectAllPostsInGroup(groupPosts);
                                    } else {
                                      // Deselecionar todos os posts do grupo
                                      setBulkAction(prev => {
                                        const newSelected = new Set(prev.selectedPosts);
                                        groupPosts.forEach(post => newSelected.delete(post.id));
                                        return {
                                          ...prev,
                                          selectedPosts: newSelected
                                        };
                                      });
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Tabela Desktop Otimizada */}
                        <div className="hidden lg:block">
                          <div className="overflow-x-auto">
                            <table className="responsive-table divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="col-select px-4 py-3 text-left">
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={groupPosts.length > 0 && groupPosts.every(post => bulkAction.selectedPosts.has(post.id))}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          selectAllPostsInGroup(groupPosts);
                                        } else {
                                          // Deselecionar todos os posts do grupo
                                          setBulkAction(prev => {
                                            const newSelected = new Set(prev.selectedPosts);
                                            groupPosts.forEach(post => newSelected.delete(post.id));
                                            return {
                                              ...prev,
                                              selectedPosts: newSelected
                                            };
                                          });
                                        }
                                      }}
                                    />
                                  </th>
                                  <th className="col-title px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => toggleSort('title')}
                                      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
                                    >
                                      Título
                                      {getSortIcon('title')}
                                    </button>
                                  </th>
                                  <th className="col-category px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => toggleSort('category')}
                                      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
                                    >
                                      Categoria
                                      {getSortIcon('category')}
                                    </button>
                                  </th>
                                  <th className="col-date px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => toggleSort('created_at')}
                                      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
                                    >
                                      Data
                                      {getSortIcon('created_at')}
                                    </button>
                                  </th>
                                  <th className="col-status px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => toggleSort('is_published')}
                                      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
                                    >
                                      Status
                                      {getSortIcon('is_published')}
                                    </button>
                                  </th>
                                  <th className="col-tags px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <button
                                      onClick={() => toggleSort('tags')}
                                      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
                                    >
                                      Tags
                                      {getSortIcon('tags')}
                                    </button>
                                  </th>
                                  <th className="col-reading-categories px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Categorias de Leitura
                                  </th>
                                  <th className="col-actions px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {groupPosts.map((post) => (
                                  <tr
                                    key={post.id}
                                    className={`relative transition-colors cursor-pointer ${
                                      bulkAction.selectedPosts.has(post.id) 
                                        ? 'bg-blue-50 hover:bg-blue-100' 
                                        : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <td className="col-select px-4 py-3">
                                      <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={bulkAction.selectedPosts.has(post.id)}
                                        onChange={(e) => { e.stopPropagation(); togglePostSelection(post.id); }}
                                      />
                                    </td>
                                    <td className="col-title px-4 py-3">
                                      <div className="flex flex-col">
                                        <Link
                                          href={`/dashboard/details/${post.id}`}
                                          className="text-left text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors table-cell-content"
                                          title={post.title}
                                        >
                                          {post.title}
                                        </Link>
                                        <p className="text-xs text-gray-500 mt-1 table-cell-content" title={post.description}>
                                          {post.description}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="col-category px-4 py-3">
                                      <Link href={`/dashboard/details/${post.id}`} className="block" aria-label={`Categoria: ${post.category}`}>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                                          {post.category}
                                        </span>
                                      </Link>
                                    </td>
                                    <td className="col-date px-4 py-3 text-sm text-gray-500">
                                      <Link href={`/dashboard/details/${post.id}`} className="block text-sm text-gray-500 whitespace-nowrap" aria-label={`Data: ${formatDate(post.created_at)}`}>
                                        {formatDate(post.created_at).replace(/de /g, '')}
                                      </Link>
                                    </td>
                                    <td className="col-status px-4 py-3">
                                      <Link href={`/dashboard/details/${post.id}`} className="block" aria-label={`Status: ${post.is_published ? 'Publicado' : 'Rascunho'}`}>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                                          post.is_published 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {post.is_published ? 'Publicado' : 'Rascunho'}
                                        </span>
                                      </Link>
                                    </td>
                                    <td className="col-tags px-4 py-3">
                                      <Link href={`/dashboard/details/${post.id}`} className="block" aria-label={`Tags: ${post.tags.join(', ')} ${post.emotion_tags.join(', ')}`}>
                                        <div className="flex flex-wrap gap-1">
                                          {post.tags.slice(0, 2).map((tag, index) => (
                                            <span
                                              key={index}
                                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap"
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                          {post.tags.length > 2 && (
                                            <span className="text-xs text-gray-500 self-center whitespace-nowrap">
                                              +{post.tags.length - 2}
                                            </span>
                                          )}
                                          {post.emotion_tags.slice(0, 1).map((tag, index) => (
                                            <span
                                              key={`emotion-${index}`}
                                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 whitespace-nowrap"
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                          {post.emotion_tags.length > 1 && (
                                            <span className="text-xs text-gray-500 self-center whitespace-nowrap">
                                              +{post.emotion_tags.length - 1} emoções
                                            </span>
                                          )}
                                        </div>
                                      </Link>
                                    </td>
                                    <td className="col-reading-categories px-4 py-3">
                                      {post.category === 'Leitura' ? (
                                        readingTagsMap[post.id] && readingTagsMap[post.id].length > 0 ? (
                                          <Link href={`/dashboard/details/${post.id}`} className="block" aria-label={`Categorias de leitura: ${readingTagsMap[post.id].map(t => t.name).join(', ')}`}>
                                            <div className="flex flex-wrap gap-1">
                                              {readingTagsMap[post.id].slice(0, 2).map((tag) => (
                                                <span
                                                  key={tag.id}
                                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                                                  style={{
                                                    backgroundColor: tag.color ? `${tag.color}20` : '#EBF8FF',
                                                    color: tag.color || '#2B6CB0'
                                                  }}
                                                >
                                                  {tag.name}
                                                </span>
                                              ))}
                                              {readingTagsMap[post.id].length > 2 && (
                                                <span className="text-xs text-gray-500 self-center whitespace-nowrap">
                                                  +{readingTagsMap[post.id].length - 2}
                                                </span>
                                              )}
                                            </div>
                                          </Link>
                                        ) : (
                                          <Link href={`/dashboard/details/${post.id}`} className="block text-gray-400 text-xs italic" aria-label="Sem categorias">
                                            Sem categorias
                                          </Link>
                                        )
                                      ) : (
                                        <Link href={`/dashboard/details/${post.id}`} className="block text-gray-400 text-xs" aria-label="Sem categorias">
                                          -
                                        </Link>
                                      )}
                                    </td>
                                    <td className="col-actions px-4 py-3 text-sm font-medium">
                                      <div className="flex items-center space-x-2">
                                        <Link
                                          href={`/dashboard/details/${post.id}`}
                                          className="text-blue-600 hover:text-blue-900 transition-colors"
                                          title="Ver detalhes"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                        </Link>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); openPublishModal(post.id, post.title, post.is_published); }}
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
                                          onClick={(e) => { e.stopPropagation(); if (!post.is_published) openDeleteModal(post.id, post.title); }}
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
                            <div
                              key={post.id}
                              className={`border border-gray-200 rounded-lg p-4 transition-colors ${
                                bulkAction.selectedPosts.has(post.id) 
                                  ? 'bg-blue-50 border-blue-300' 
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              {/* Header com checkbox, título e status */}
                              <div className="flex items-start gap-3 mb-3">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                                  checked={bulkAction.selectedPosts.has(post.id)}
                                  onChange={() => { togglePostSelection(post.id); }}
                                />
                                <div className="flex-1 min-w-0">
                                  <Link
                                    href={`/dashboard/details/${post.id}`}
                                    className="text-lg font-semibold text-gray-900 hover:text-blue-600 mb-2 block"
                                  >
                                    {post.title}
                                  </Link>
                                </div>
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
                                <Link
                                  href={`/dashboard/details/${post.id}`}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                  title="Ver detalhes"
                                >
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"/>
                                  </svg>
                                  Ver
                                </Link>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openPublishModal(post.id, post.title, post.is_published); }}
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
                                  onClick={(e) => { e.stopPropagation(); if (!post.is_published) openDeleteModal(post.id, post.title); }}
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
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CMSLayout>

      {/* Barra de ações em lote */}
      <BulkActionBar />

      {/* Feature flag toggle - apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <DataTableFeatureFlag
          enabled={useNewDataTable}
          onToggle={setUseNewDataTable}
        />
      )}

      {/* Modais - Renderizados fora do CMSLayout para garantir z-index correto */}
      <BulkActionModal />
      
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
      
      {/* Notifications handled globally via HotToaster */}

      {/* Feature flag para desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <DataTableFeatureFlag
          enabled={useNewDataTable}
          onToggle={setUseNewDataTable}
        />
      )}
    </>
  );
} 