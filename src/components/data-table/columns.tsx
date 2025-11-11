"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Post } from "@/services/posts"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ArrowUpDown, Eye, FileText, Trash2 } from "lucide-react"

interface ColumnsProps {
  onViewPost: (postId: string) => void
  onPublishToggle: (postId: string, title: string, isPublished: boolean) => void
  onDeletePost: (postId: string, title: string) => void
  readingTagsMap: {[postId: string]: {id: string, name: string, color?: string}[]}
}

export const createColumns = ({ 
  onViewPost, 
  onPublishToggle, 
  onDeletePost,
  readingTagsMap 
}: ColumnsProps): ColumnDef<Post>[] => [
  // Coluna de seleção
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() ? false : false)
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Selecionar todos"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Selecionar linha"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // Coluna do título
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-gray-100 text-gray-700 font-semibold"
        >
          Título
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const post = row.original
      return (
        <div 
          className="cursor-pointer hover:text-blue-600 font-medium truncate"
          onClick={() => onViewPost(post.id)}
          title={post.title}
        >
          {post.title}
        </div>
      )
    },
  },

  // Coluna da categoria
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-gray-100 text-gray-700 font-semibold"
        >
          Categoria
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
        {row.getValue("category")}
      </span>
    ),
  },

  // Coluna da data
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-gray-100 text-gray-700 font-semibold"
        >
          Data
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const dateString = row.getValue("created_at") as string
      const date = new Date(dateString)
      return (
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {date.toLocaleDateString('pt-PT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      )
    },
  },

  // Coluna do status
  {
    accessorKey: "is_published",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 hover:bg-gray-100 text-gray-700 font-semibold"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const isPublished = row.getValue("is_published") as boolean
      return (
        <span 
          className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
            isPublished 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {isPublished ? 'Publicado' : 'Rascunho'}
        </span>
      )
    },
  },

  // Coluna das tags
  {
    accessorKey: "tags",
    header: () => <span className="text-gray-700 font-semibold">Tags</span>,
    cell: ({ row }) => {
      const tags = row.getValue("tags") as string[]
      if (!tags || tags.length === 0) return <span className="text-gray-400">—</span>
      
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag, index) => (
            <span 
              key={index}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs whitespace-nowrap"
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="text-xs text-gray-500 self-center whitespace-nowrap">
              +{tags.length - 2}
            </span>
          )}
        </div>
      )
    },
  },

  // Coluna das categorias de leitura (apenas para posts de leitura)
  {
    id: "reading_categories",
    header: () => <span className="text-gray-700 font-semibold">Categorias de Leitura</span>,
    cell: ({ row }) => {
      const post = row.original
      
      if (post.category !== 'Leitura') {
        return <span className="text-gray-400">—</span>
      }

      const readingTags = readingTagsMap[post.id] || []
      
      if (readingTags.length === 0) {
        return <span className="text-gray-400">Nenhuma</span>
      }

      return (
        <div className="flex flex-wrap gap-1">
          {readingTags.slice(0, 2).map((tag) => (
            <span 
              key={tag.id}
              className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
              style={{ 
                backgroundColor: tag.color ? `${tag.color}20` : '#EEF2FF',
                color: tag.color || '#3B82F6'
              }}
            >
              {tag.name}
            </span>
          ))}
          {readingTags.length > 2 && (
            <span className="text-xs text-gray-500 self-center whitespace-nowrap">
              +{readingTags.length - 2}
            </span>
          )}
        </div>
      )
    },
  },

  // Coluna de ações
  {
    id: "actions",
    header: () => (
      <div className="text-center w-full">
        <span className="text-gray-700 font-semibold">Ações</span>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
    cell: ({ row }) => {
      const post = row.original

      return (
        <div className="flex justify-center items-center w-full">
          <DropdownMenu>
            <DropdownMenuTrigger 
              className="h-8 w-8 p-0 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full inline-flex items-center justify-center"
              aria-label={`Ações para ${post.title}`}
            >
              <span className="sr-only">Abrir menu de ações</span>
              <MoreHorizontal className="h-4 w-4 text-gray-600" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white border border-gray-200 shadow-lg rounded-lg">
              <DropdownMenuLabel className="text-gray-900 font-semibold px-3 py-2 border-b border-gray-100">
                Ações disponíveis
              </DropdownMenuLabel>
              
              <div className="py-1">
                <DropdownMenuItem
                  onClick={() => onViewPost(post.id)}
                  className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 text-gray-700 px-3 py-2 flex items-center transition-colors"
                >
                  <Eye className="mr-3 h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm">Ver detalhes</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => onPublishToggle(post.id, post.title, post.is_published)}
                  className="cursor-pointer hover:bg-green-50 focus:bg-green-50 text-gray-700 px-3 py-2 flex items-center transition-colors"
                >
                  <FileText className="mr-3 h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">{post.is_published ? 'Despublicar' : 'Publicar'}</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-gray-200 my-1" />
                
                <DropdownMenuItem
                  onClick={() => !post.is_published && onDeletePost(post.id, post.title)}
                  className={`px-3 py-2 flex items-center transition-colors text-sm ${
                    post.is_published 
                      ? 'opacity-50 cursor-not-allowed text-gray-400 hover:bg-gray-50' 
                      : 'cursor-pointer text-gray-700 hover:bg-red-50 focus:bg-red-50'
                  }`}
                >
                  <Trash2 className={`mr-3 h-4 w-4 flex-shrink-0 ${post.is_published ? 'text-gray-400' : 'text-red-600'}`} />
                  <span>Eliminar {post.is_published && '(Indisponível)'}</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]