import { Post } from "@/services/posts"
import { ColumnDef } from "@tanstack/react-table"

// Tipos específicos para o Data Table
export interface DataTablePost extends Post {
  // Estendemos Post para adicionar campos específicos do data table se necessário
}

// Estados para filtros (simplificados para esta implementação)
export interface FilterState {
  search: string
  category?: string
  status?: 'published' | 'draft'
  tags: string[]
}

// Tipos para ações em lote
export type BulkActionType = 'publish' | 'unpublish' | 'delete'

// Tipos para ordenação (reusando da página atual)
export type SortField = 'title' | 'category' | 'created_at' | 'is_published' | 'tags' | 'emotion_tags'
export type SortDirection = 'asc' | 'desc'

export interface SortState {
  field: SortField
  direction: SortDirection
}

// Tipos para agrupamento (reusando da página atual)
export interface GroupedPosts {
  [key: string]: Post[]
}

// Tipos para seleção múltipla
export interface BulkActionState {
  selectedIds: string[]
  isAllSelected: boolean
  canPublish: boolean
  canUnpublish: boolean
  canDelete: boolean
}

// Props para o DataTable principal
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  onBulkAction?: (action: BulkActionType, selectedData: TData[]) => void
  filters?: FilterState
  onFiltersChange?: (filters: FilterState) => void
  searchPlaceholder?: string
  // Controles extras para integração com página de management
  extraControls?: ExtraControlsProps
}

// Props para controles extras
export interface ExtraControlsProps {
  showFilters?: boolean
  onToggleFilters?: () => void
  showGroupedView?: boolean
  onToggleGroupedView?: () => void
  hasActiveFilters?: boolean
  onClearAllFilters?: () => void
  filteredCount?: number
  totalCount?: number
}

// Props para o toolbar de filtros
export interface DataTableToolbarProps {
  filters: FilterState
  setFilters: (filters: FilterState) => void
  search: string
  setSearch: (search: string) => void
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  hasActiveFilters: boolean
  clearAllFilters: () => void
  uniqueCategories: string[]
  uniqueTags: string[]
  uniqueEmotionTags: string[]
  showGroupedView: boolean
  setShowGroupedView: (show: boolean) => void
  groupByTag: string
  setGroupByTag: (tag: string) => void
  filteredCount: number
  totalCount: number
}

// Props para ações em lote
export interface BulkActionsProps {
  selectedPosts: Post[]
  onPublishSelected: () => void
  onUnpublishSelected: () => void
  onDeleteSelected: () => void
  isLoading: boolean
}

// Props para ações de linha individual
export interface RowActionsProps {
  post: Post
  onView: (postId: string) => void
  onPublish: (postId: string, title: string, isPublished: boolean) => void
  onDelete: (postId: string, title: string) => void
}

// Props para paginação
export interface DataTablePaginationProps {
  pageIndex: number
  pageSize: number
  totalRows: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  canPreviousPage: boolean
  canNextPage: boolean
}