"use client"

import { useMemo } from "react"
import { Post } from "@/services/posts"
import { DataTable, createColumns } from "./index"
import { FilterState, BulkActionType, ExtraControlsProps } from "./types"

interface PostsDataTableProps {
  posts: Post[]
  isLoading?: boolean
  onViewPost: (postId: string) => void
  onPublishToggle: (postId: string, title: string, isPublished: boolean) => void
  onDeletePost: (postId: string, title: string) => void
  onBulkAction: (action: BulkActionType, posts: Post[]) => void
  readingTagsMap: {[postId: string]: {id: string, name: string, color?: string}[]}
  filters?: FilterState
  onFiltersChange?: (filters: FilterState) => void
  extraControls?: ExtraControlsProps
}

export function PostsDataTable({
  posts,
  isLoading = false,
  onViewPost,
  onPublishToggle,
  onDeletePost,
  onBulkAction,
  readingTagsMap,
  filters,
  onFiltersChange,
  extraControls,
}: PostsDataTableProps) {
  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo(
    () => createColumns({
      onViewPost,
      onPublishToggle,
      onDeletePost,
      readingTagsMap,
    }),
    [onViewPost, onPublishToggle, onDeletePost, readingTagsMap]
  )

  return (
    <DataTable
      columns={columns}
      data={posts}
      isLoading={isLoading}
      onBulkAction={onBulkAction}
      filters={filters}
      onFiltersChange={onFiltersChange}
      searchPlaceholder="Buscar posts por título, categoria ou tags..."
      extraControls={extraControls}
    />
  )
}