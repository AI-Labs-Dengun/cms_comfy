"use client"

import * as React from "react"
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Settings2, Search, X } from "lucide-react"

import { DataTableProps, FilterState } from "./types"

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  onBulkAction,
  filters,
  onFiltersChange,
  searchPlaceholder = "Buscar...",
  extraControls,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedRowsCount = selectedRows.length

  // Handle bulk action execution
  const handleBulkAction = (action: 'publish' | 'unpublish' | 'delete') => {
    if (onBulkAction && selectedRows.length > 0) {
      const selectedData = selectedRows.map(row => row.original)
      onBulkAction(action, selectedData)
      // Clear selection after action
      setRowSelection({})
    }
  }

  // Clear filters
  const clearFilters = () => {
    setGlobalFilter("")
    setColumnFilters([])
    if (onFiltersChange) {
      onFiltersChange({
        search: "",
        category: undefined,
        status: undefined,
        tags: [],
      })
    }
  }

  // Update external filters when internal state changes
  React.useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        search: globalFilter,
        category: filters?.category,
        status: filters?.status,
        tags: filters?.tags || [],
      })
    }
  }, [globalFilter, onFiltersChange, filters?.category, filters?.status, filters?.tags])

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        {/* Search and Filters */}
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-4">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 transform -translate-y-1/2" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-10 md:w-80 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter("")}
                className="absolute right-3 top-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transform -translate-y-1/2"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          {filters && onFiltersChange && (
            <select 
              value={filters.category || ""} 
              onChange={(e) => onFiltersChange?.({
                ...filters,
                category: e.target.value || undefined
              })}
              className="flex h-10 w-40 items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas as categorias</option>
              <option value="Artigo">Artigo</option>
              <option value="Ferramentas">Ferramentas</option>
              <option value="Quizzes">Quizzes</option>
              <option value="Leitura">Leitura</option>
              <option value="Vídeo">Vídeo</option>
              <option value="Filme e Série">Filme e Série</option>
            </select>
          )}

          {/* Status Filter */}
          {filters && onFiltersChange && (
            <select 
              value={filters.status || ""} 
              onChange={(e) => onFiltersChange?.({
                ...filters,
                status: e.target.value as FilterState['status'] || undefined
              })}
              className="flex h-10 w-36 items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="published">Publicado</option>
              <option value="draft">Rascunho</option>
            </select>
          )}

          {/* Clear Filters */}
          {onFiltersChange && (globalFilter || filters?.category || filters?.status) && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="h-10 px-4 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <X className="mr-2 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>

        {/* Bulk Actions and Column Visibility */}
        <div className="flex items-center gap-3">
          {/* Controles extras (Filtros Avançados e Agrupar por Tag) */}
          {extraControls && (
            <div className="flex items-center gap-3">
              {extraControls.onToggleFilters && (
                <button
                  onClick={extraControls.onToggleFilters}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.586a1 1 0 0 1-.293.707l-6.414 6.414a1 1 0 0 0-.293.707V17l-4 4v-6.586a1 1 0 0 0-.293-.707L3.293 7.293A1 1 0 0 1 3 6.586V4Z"/>
                  </svg>
                  {extraControls.showFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
                </button>
              )}
              
              {extraControls.onToggleGroupedView && (
                <button
                  onClick={extraControls.onToggleGroupedView}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    extraControls.showGroupedView 
                      ? 'text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 focus:ring-blue-500'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-blue-500'
                  }`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"/>
                  </svg>
                  {extraControls.showGroupedView ? 'Vista Normal' : 'Agrupar por Tag'}
                </button>
              )}
              
              {/* Botão limpar filtros */}
              {extraControls.hasActiveFilters && extraControls.onClearAllFilters && (
                <button
                  onClick={extraControls.onClearAllFilters}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Limpar
                </button>
              )}
            </div>
          )}

          {/* Bulk Actions */}
          {selectedRowsCount > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-900">
                {selectedRowsCount} selecionado{selectedRowsCount > 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBulkAction('publish')}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700"
                >
                  Publicar
                </Button>
                <Button
                  onClick={() => handleBulkAction('unpublish')}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700 hover:border-yellow-700"
                >
                  Despublicar
                </Button>
                <Button
                  onClick={() => handleBulkAction('delete')}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700"
                >
                  Eliminar
                </Button>
                <Button
                  onClick={() => table.toggleAllRowsSelected(false)}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Desmarcar
                </Button>
              </div>
            </div>
          )}

          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 px-4 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Colunas 
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
              <DropdownMenuLabel className="text-gray-900 font-semibold px-3 py-2">
                Colunas Visíveis
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200" />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-gray-700 hover:bg-gray-50 px-3 py-2"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <Table className="responsive-table">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-50 border-b border-gray-200">
                {headerGroup.headers.map((header) => {
                  // Classes CSS customizadas para colunas específicas
                  const getColumnClass = (columnId: string) => {
                    switch (columnId) {
                      case 'select': return 'col-select'
                      case 'title': return 'col-title'
                      case 'category': return 'col-category'
                      case 'created_at': return 'col-date'
                      case 'is_published': return 'col-status'
                      case 'tags': return 'col-tags'
                      case 'reading_categories': return 'col-reading-categories'
                      case 'actions': return 'col-actions'
                      default: return ''
                    }
                  }
                  
                  return (
                    <TableHead 
                      key={header.id}
                      className={`px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50 ${getColumnClass(header.column.id)}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-700 font-medium">Carregando posts...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`hover:bg-gray-50 transition-colors ${
                    row.getIsSelected() ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => {
                    // Classes CSS customizadas para colunas específicas
                    const getColumnClass = (columnId: string) => {
                      switch (columnId) {
                        case 'select': return 'col-select'
                        case 'title': return 'col-title'
                        case 'category': return 'col-category'
                        case 'created_at': return 'col-date'
                        case 'is_published': return 'col-status'
                        case 'tags': return 'col-tags'
                        case 'reading_categories': return 'col-reading-categories'
                        case 'actions': return 'col-actions'
                        default: return ''
                      }
                    }
                    
                    return (
                      <TableCell 
                        key={cell.id}
                        className={`px-4 py-3 text-sm text-gray-900 ${getColumnClass(cell.column.id)}`}
                      >
                        <div className="table-cell-content">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="text-gray-500">
                    <div className="text-lg font-medium mb-2">Nenhum post encontrado</div>
                    <div className="text-sm">Tente ajustar os filtros ou criar um novo post</div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-6 py-4 bg-white border-t border-gray-200 rounded-b-lg">
        <div className="flex-1 text-sm text-gray-600">
          {selectedRowsCount > 0 ? (
            <span className="font-medium text-blue-700">
              {selectedRowsCount} de {table.getFilteredRowModel().rows.length} linha(s) selecionada(s)
            </span>
          ) : (
            <span>
              Mostrando {table.getRowModel().rows.length} de {table.getFilteredRowModel().rows.length} resultado(s)
            </span>
          )}
        </div>
        
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:space-x-8">
          {/* Page Size Selector */}
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-700">Linhas por página</p>
            <select
              value={`${table.getState().pagination.pageSize}`}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value))
              }}
              className="flex h-9 w-20 items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={`${pageSize}`} className="text-black">
                  {pageSize}
                </option>
              ))}
            </select>
          </div>

          {/* Page Info */}
          <div className="flex items-center justify-center text-sm font-medium text-gray-700 min-w-[120px]">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-9 w-9 p-0 lg:flex border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              title="Primeira página"
            >
              <span className="sr-only">Ir para primeira página</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </Button>
            <Button
              variant="outline"
              className="h-9 w-9 p-0 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              title="Página anterior"
            >
              <span className="sr-only">Ir para página anterior</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button
              variant="outline"
              className="h-9 w-9 p-0 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              title="Próxima página"
            >
              <span className="sr-only">Ir para próxima página</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
            <Button
              variant="outline"
              className="hidden h-9 w-9 p-0 lg:flex border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              title="Última página"
            >
              <span className="sr-only">Ir para última página</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}