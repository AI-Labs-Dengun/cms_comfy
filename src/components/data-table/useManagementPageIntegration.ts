"use client"

import { useState, useCallback, useMemo } from "react"
import { Post } from "@/services/posts"
import { BulkActionType } from "./types"

// Filtros da página atual (mantendo compatibilidade)
interface OriginalFilterState {
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

// Props que vamos receber da página atual
interface ManagementPageIntegrationProps {
  posts: Post[]
  filteredPosts: Post[]
  loading: boolean
  search: string
  filters: OriginalFilterState
  readingTagsMap: {[postId: string]: {id: string, name: string, color?: string}[]}
  onOpenPublishModal: (postId: string, postTitle: string, isPublished: boolean) => void
  onOpenDeleteModal: (postId: string, postTitle: string) => void
}

export function useManagementPageIntegration({
  posts: _posts,
  filteredPosts,
  loading,
  search,
  filters,
  readingTagsMap,
  onOpenPublishModal,
  onOpenDeleteModal,
}: ManagementPageIntegrationProps) {
  // Marca _posts como intencionalmente não usado para satisfazer o linter
  void _posts
  const [isProcessingBulk, setIsProcessingBulk] = useState(false)

  // Converter filtros originais para o formato do DataTable
  const dataTableFilters = useMemo(() => {
    return {
      search: search,
      category: filters.category || undefined,
      status: (filters.status === "published" ? "published" : 
               filters.status === "draft" ? "draft" : undefined) as "published" | "draft" | undefined,
      tags: filters.tags ? [filters.tags] : [], // Converter string para array
    }
  }, [search, filters])

  // Handler para ações em lote
  const handleBulkAction = useCallback(async (action: BulkActionType, selectedPosts: Post[]) => {
    if (selectedPosts.length === 0) return

    setIsProcessingBulk(true)
    try {
      // Mostrar notificação sobre a ação em lote
      console.log(`Executando ação em lote: ${action} para ${selectedPosts.length} posts`)
      
      // Para ações em lote, vamos processar um post de cada vez
      // mas abrir apenas um modal por vez (para o primeiro post válido)
      const validPosts = selectedPosts.filter(post => {
        switch (action) {
          case 'publish':
            return !post.is_published
          case 'unpublish':
            return post.is_published
          case 'delete':
            return !post.is_published
          default:
            return false
        }
      })

      if (validPosts.length > 0) {
        const firstPost = validPosts[0]
        switch (action) {
          case 'publish':
          case 'unpublish':
            onOpenPublishModal(firstPost.id, firstPost.title, firstPost.is_published)
            break
          case 'delete':
            onOpenDeleteModal(firstPost.id, firstPost.title)
            break
        }
      }
    } catch (error) {
      console.error('Erro ao executar ação em lote:', error)
    } finally {
      setIsProcessingBulk(false)
    }
  }, [onOpenPublishModal, onOpenDeleteModal])

  // Handler para publicar/despublicar individual
  const handlePublishToggle = useCallback((postId: string, title: string, isPublished: boolean) => {
    onOpenPublishModal(postId, title, isPublished)
  }, [onOpenPublishModal])

  // Handler para eliminar individual
  const handleDeletePost = useCallback((postId: string, title: string) => {
    onOpenDeleteModal(postId, title)
  }, [onOpenDeleteModal])


  return {
    // Dados para o DataTable
    posts: filteredPosts, // Usar os posts já filtrados pela página atual
    isLoading: loading || isProcessingBulk,
    filters: dataTableFilters,
    readingTagsMap,
    
    // Handlers para o DataTable
  handleBulkAction,
  handlePublishToggle,
  handleDeletePost,
    
    // Estado
    isProcessingBulk,
  }
}