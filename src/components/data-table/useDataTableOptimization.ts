"use client"

import { useMemo, useState, useEffect } from "react"
import { Post } from "@/services/posts"

interface DataTableOptimizationProps {
  posts: Post[]
  pageSize: number
}

export function useDataTableOptimization({ posts, pageSize }: DataTableOptimizationProps) {
  // Memoize expensive calculations
  const optimizedData = useMemo(() => {
    // Para datasets grandes, implementar lazy loading ou virtualização
    if (posts.length > 1000) {
      console.log(`⚡ DataTable: Dataset grande detectado (${posts.length} items), otimizando performance...`)
      
      // Implementar estratégias de otimização:
      // 1. Limitar renderização inicial
      // 2. Lazy loading de dados
      // 3. Memoização de cálculos pesados
      
      return {
        shouldUseVirtualization: true,
        initialLoadSize: Math.min(pageSize * 3, 100),
        chunkSize: pageSize,
        estimatedRowHeight: 73, // altura estimada de cada linha
      }
    }

    return {
      shouldUseVirtualization: false,
      initialLoadSize: posts.length,
      chunkSize: pageSize,
      estimatedRowHeight: 73,
    }
  }, [posts.length, pageSize])

  // Memoize dados filtrados para evitar re-cálculos desnecessários
  const memoizedPosts = useMemo(() => {
    return posts.map(post => ({
      ...post,
      // Pre-calcular campos que são usados frequentemente
      displayTitle: post.title || 'Sem título',
      displayCategory: post.category || 'Sem categoria',
      displayDate: new Date(post.created_at).toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      displayStatus: post.is_published ? 'Publicado' : 'Rascunho',
      tagsCount: (post.tags?.length || 0) + (post.emotion_tags?.length || 0),
    }))
  }, [posts])

  return {
    optimizedData,
    memoizedPosts,
    performanceMetrics: {
      totalPosts: posts.length,
      isLargeDataset: posts.length > 1000,
      shouldOptimize: posts.length > 100,
    }
  }
}

// Hook para debounce de busca
export function useSearchDebounce(value: string, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}