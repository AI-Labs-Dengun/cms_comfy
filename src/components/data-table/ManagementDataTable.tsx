"use client"

import { PostsDataTable } from "./PostsDataTable"
import { useManagementPageIntegration } from "./useManagementPageIntegration"
import { Post } from "@/services/posts"
import { BulkActionType } from "./types"

// Filtros da página atual (mantendo compatibilidade total)
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

interface ManagementDataTableProps {
  posts: Post[]
  filteredPosts: Post[]
  loading: boolean
  search: string
  filters: OriginalFilterState
  readingTagsMap: {[postId: string]: {id: string, name: string, color?: string}[]}
  onOpenPublishModal: (postId: string, postTitle: string, isPublished: boolean) => void
  onOpenDeleteModal: (postId: string, postTitle: string) => void
  onBulkAction?: (action: BulkActionType, posts: Post[]) => void
  onViewPost: (postId: string) => void
  // Novos props para controles
  showFilters?: boolean
  onToggleFilters?: () => void
  showGroupedView?: boolean
  onToggleGroupedView?: () => void
  hasActiveFilters?: boolean
  onClearAllFilters?: () => void
}

export function ManagementDataTable({
  posts,
  filteredPosts,
  loading,
  search,
  filters,
  readingTagsMap,
  onOpenPublishModal,
  onOpenDeleteModal,
  onBulkAction,
  onViewPost,
  showFilters = false,
  onToggleFilters,
  showGroupedView = false,
  onToggleGroupedView,
  hasActiveFilters = false,
  onClearAllFilters,
}: ManagementDataTableProps) {
  const {
    posts: dataTablePosts,
    isLoading,
    filters: dataTableFilters,
    readingTagsMap: tagsMap,
    handleBulkAction,
    handlePublishToggle,
    handleDeletePost,
  } = useManagementPageIntegration({
    posts,
    filteredPosts,
    loading,
    search,
    filters,
    readingTagsMap,
    onOpenPublishModal,
    onOpenDeleteModal,
    onBulkAction,
  })

  return (
    <PostsDataTable
      posts={dataTablePosts}
      isLoading={isLoading}
      onViewPost={onViewPost}
      onPublishToggle={handlePublishToggle}
      onDeletePost={handleDeletePost}
      onBulkAction={handleBulkAction}
      readingTagsMap={tagsMap}
      filters={dataTableFilters}
      extraControls={{
        showFilters,
        onToggleFilters,
        showGroupedView,
        onToggleGroupedView,
        hasActiveFilters,
        onClearAllFilters,
        filteredCount: filteredPosts.length,
        totalCount: posts.length,
      }}
    />
  )
}