"use client"

import { useState, useCallback, useMemo } from "react"
import { Post } from "@/services/posts"
import { FilterState, BulkActionType } from "./types"

interface UsePostsDataTableProps {
  posts: Post[]
  onPublishPost: (postId: string, title: string, isPublished: boolean) => Promise<void>
  onDeletePost: (postId: string, title: string) => Promise<void>
  onViewPost: (postId: string) => void
}

export function usePostsDataTable({
  posts,
  onPublishPost,
  onDeletePost,
  onViewPost,
}: UsePostsDataTableProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: undefined,
    status: undefined,
    tags: [],
  })
  const [isProcessing, setIsProcessing] = useState(false)

  // Filter posts based on current filter state
  const filteredPosts = useMemo(() => {
    let filtered = [...posts]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.category.toLowerCase().includes(searchLower) ||
        post.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
        post.emotion_tags?.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Category filter
    if (filters.category && filters.category !== "all") {
      filtered = filtered.filter(post => post.category === filters.category)
    }

    // Status filter
    if (filters.status) {
      const isPublished = filters.status === "published"
      filtered = filtered.filter(post => post.is_published === isPublished)
    }

    return filtered
  }, [posts, filters])

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: BulkActionType, selectedPosts: Post[]) => {
    if (selectedPosts.length === 0) return

    setIsProcessing(true)
    try {
      switch (action) {
        case 'publish':
          for (const post of selectedPosts) {
            if (!post.is_published) {
              await onPublishPost(post.id, post.title, false)
            }
          }
          break
        case 'unpublish':
          for (const post of selectedPosts) {
            if (post.is_published) {
              await onPublishPost(post.id, post.title, true)
            }
          }
          break
        case 'delete':
          for (const post of selectedPosts) {
            if (!post.is_published) {
              await onDeletePost(post.id, post.title)
            }
          }
          break
      }
    } catch (error) {
      console.error('Erro ao executar ação em lote:', error)
      // Aqui poderia ser adicionado um toast de erro
    } finally {
      setIsProcessing(false)
    }
  }, [onPublishPost, onDeletePost])

  // Handle individual publish toggle
  const handlePublishToggle = useCallback(async (postId: string, title: string, isPublished: boolean) => {
    setIsProcessing(true)
    try {
      await onPublishPost(postId, title, isPublished)
    } catch (error) {
      console.error('Erro ao alterar status do post:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [onPublishPost])

  // Handle individual delete
  const handleDeletePost = useCallback(async (postId: string, title: string) => {
    setIsProcessing(true)
    try {
      await onDeletePost(postId, title)
    } catch (error) {
      console.error('Erro ao eliminar post:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [onDeletePost])

  return {
    filteredPosts,
    filters,
    setFilters,
    isProcessing,
    handleBulkAction,
    handlePublishToggle,
    handleDeletePost,
    handleViewPost: onViewPost,
  }
}