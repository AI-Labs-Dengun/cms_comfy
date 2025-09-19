"use client"

import { useState, useEffect } from "react"
import { PostsDataTable } from "./PostsDataTable"
import { DataTableFeatureFlag } from "./DataTableFeatureFlag"
import { usePostsDataTable } from "./usePostsDataTable"
import { Post } from "@/services/posts"

interface PostsTableWithFeatureFlagProps {
  posts: Post[]
  isLoading?: boolean
  onPublishPost: (postId: string, title: string, isPublished: boolean) => Promise<void>
  onDeletePost: (postId: string, title: string) => Promise<void>
  onViewPost: (postId: string) => void
  readingTagsMap: {[postId: string]: {id: string, name: string, color?: string}[]}
  currentTableComponent: React.ReactNode // The current table implementation
}

export function PostsTableWithFeatureFlag({
  posts,
  isLoading = false,
  onPublishPost,
  onDeletePost,
  onViewPost,
  readingTagsMap,
  currentTableComponent,
}: PostsTableWithFeatureFlagProps) {
  // Feature flag state - persisted in localStorage
  const [useNewDataTable, setUseNewDataTable] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cms-use-new-datatable')
      return saved === 'true'
    }
    return false
  })

  // Persist feature flag state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cms-use-new-datatable', String(useNewDataTable))
    }
  }, [useNewDataTable])

  // Data table integration hook
  const {
    filteredPosts,
    filters,
    setFilters,
    isProcessing,
    handleBulkAction,
    handlePublishToggle,
    handleDeletePost,
    handleViewPost,
  } = usePostsDataTable({
    posts,
    onPublishPost,
    onDeletePost,
    onViewPost,
  })

  return (
    <div className="relative">
      {/* Render either the new or old table based on feature flag */}
      {useNewDataTable ? (
        <PostsDataTable
          posts={filteredPosts}
          isLoading={isLoading || isProcessing}
          onViewPost={handleViewPost}
          onPublishToggle={handlePublishToggle}
          onDeletePost={handleDeletePost}
          onBulkAction={handleBulkAction}
          readingTagsMap={readingTagsMap}
          filters={filters}
          onFiltersChange={setFilters}
        />
      ) : (
        currentTableComponent
      )}

      {/* Feature flag toggle - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <DataTableFeatureFlag
          enabled={useNewDataTable}
          onToggle={setUseNewDataTable}
        />
      )}
    </div>
  )
}