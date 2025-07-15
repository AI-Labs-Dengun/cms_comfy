import { supabase } from '@/lib/supabase'
import { uploadFile } from './storage'

// Tipos para os posts
export interface CreatePostData {
  title: string
  description: string
  category: 'Vídeo' | 'Podcast' | 'Artigo' | 'Livro' | 'Áudio' | 'Shorts' | 'Leitura'
  content?: string // ✅ ADICIONANDO CAMPO CONTENT
  content_url?: string
  file_path?: string
  file_name?: string
  file_type?: string
  file_size?: number
  tags?: string[]
  emotion_tags?: string[]
}

export interface Post {
  id: string
  title: string
  description: string
  category: string
  content?: string // ✅ ADICIONANDO CAMPO CONTENT
  content_url?: string
  file_path?: string
  file_name?: string
  file_size?: number
  file_type?: string
  tags: string[]
  emotion_tags: string[]
  is_published: boolean
  is_featured: boolean
  view_count: number
  author_id?: string
  author_name?: string
  created_at: string
  updated_at: string
  published_at?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

// Função para criar um post
export async function createPost(postData: CreatePostData): Promise<ApiResponse<Post>> {
  try {
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // Validar dados obrigatórios
    if (!postData.title || !postData.description || !postData.category) {
      return {
        success: false,
        error: 'Título, descrição e categoria são obrigatórios'
      }
    }

    // Validar conteúdo (URL ou arquivo)
    if (!postData.content_url && !postData.file_path) {
      return {
        success: false,
        error: 'É necessário fornecer uma URL ou fazer upload de um arquivo'
      }
    }

    // Chamar a função do banco de dados
    const { data, error } = await supabase.rpc('create_post', {
      author_id_param: user.id,
      title_param: postData.title,
      description_param: postData.description,
      category_param: postData.category,
      content_param: postData.content || null, // Adicionado content_param
      content_url_param: postData.content_url || null,
      tags_param: postData.tags || [],
      emotion_tags_param: postData.emotion_tags || [],
      file_path_param: postData.file_path || null,
      file_name_param: postData.file_name || null,
      file_type_param: postData.file_type || null
    })

    if (error) {
      console.error('Erro ao criar post:', error)
      return {
        success: false,
        error: 'Erro ao criar post: ' + error.message
      }
    }

    // Verificar resposta da função
    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao criar post'
      }
    }

    return {
      success: true,
      message: 'Post criado com sucesso!',
      data: {
        id: data.post_id,
        ...postData
      } as Post
    }

  } catch (error) {
    console.error('Erro inesperado ao criar post:', error)
    return {
      success: false,
      error: 'Erro inesperado ao criar post'
    }
  }
}

// Função para buscar posts do usuário (CMS)
export async function getUserPosts(): Promise<ApiResponse<Post[]>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // Buscar posts do usuário
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar posts:', error)
      return {
        success: false,
        error: 'Erro ao buscar posts: ' + error.message
      }
    }

    return {
      success: true,
      data: data || []
    }

  } catch (error) {
    console.error('Erro inesperado ao buscar posts:', error)
    return {
      success: false,
      error: 'Erro inesperado ao buscar posts'
    }
  }
}

// Função para atualizar um post
export async function updatePost(postId: string, postData: Partial<CreatePostData>): Promise<ApiResponse<Post>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // Lógica para respeitar o constraint posts_content_check
    // Apenas um dos campos (content_url ou file_path) pode estar preenchido
    let contentUrl = null
    let filePath = null
    let fileName = null
    let fileType = null
    let category = postData.category

    if (postData.content_url && postData.content_url.trim() !== '') {
      // Se tem URL, limpar campos de arquivo
      contentUrl = postData.content_url
      filePath = null
      fileName = null
      fileType = null
    } else if (postData.file_path && postData.file_path.trim() !== '') {
      // Se tem arquivo, limpar campo de URL
      contentUrl = null
      filePath = postData.file_path
      fileName = postData.file_name || null
      fileType = postData.file_type || null
    } else {
      // Se nenhum dos dois foi fornecido, buscar o post atual para manter o valor existente
      const { data: currentPost } = await supabase
        .from('posts')
        .select('content_url, file_path, file_name, file_type, category')
        .eq('id', postId)
        .single()
      
      if (currentPost) {
        contentUrl = currentPost.content_url
        filePath = currentPost.file_path
        fileName = currentPost.file_name
        fileType = currentPost.file_type
        // Se a categoria não foi fornecida, preservar a existente
        if (!category) {
          category = currentPost.category
        }
      }
    }

    // Se ainda não temos categoria definida, usar 'Vídeo' como padrão apenas neste caso
    if (!category) {
      category = 'Vídeo'
    }

    // Chamar a função do banco de dados
    const { data, error } = await supabase.rpc('update_post', {
      post_id_param: postId,
      author_id_param: user.id,
      title_param: postData.title || '',
      description_param: postData.description || '',
      category_param: category,
      content_param: postData.content || null, // Adicionado content_param
      content_url_param: contentUrl,
      tags_param: postData.tags || [],
      emotion_tags_param: postData.emotion_tags || [],
      file_path_param: filePath,
      file_name_param: fileName,
      file_type_param: fileType
    })

    if (error) {
      console.error('Erro ao atualizar post:', error)
      return {
        success: false,
        error: 'Erro ao atualizar post: ' + error.message
      }
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao atualizar post'
      }
    }

    return {
      success: true,
      message: 'Post atualizado com sucesso!'
    }

  } catch (error) {
    console.error('Erro inesperado ao atualizar post:', error)
    return {
      success: false,
      error: 'Erro inesperado ao atualizar post'
    }
  }
}

// Função para publicar/despublicar um post
export async function togglePostPublication(postId: string, publish: boolean): Promise<ApiResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    const { data, error } = await supabase.rpc('toggle_post_publication', {
      post_id_param: postId,
      author_id_param: user.id,
      publish_param: publish
    })

    if (error) {
      console.error('Erro ao alterar status do post:', error)
      return {
        success: false,
        error: 'Erro ao alterar status do post: ' + error.message
      }
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao alterar status'
      }
    }

    return {
      success: true,
      message: publish ? 'Post publicado com sucesso!' : 'Post despublicado com sucesso!'
    }

  } catch (error) {
    console.error('Erro inesperado ao alterar status:', error)
    return {
      success: false,
      error: 'Erro inesperado ao alterar status'
    }
  }
}

// Função para upload de arquivo usando Supabase Storage
export async function uploadFileForPost(file: File): Promise<ApiResponse<{ path: string; url: string; file_name: string; file_size: number; file_type: string }>> {
  try {
    const result = await uploadFile(file)
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }

    return {
      success: true,
      data: {
        path: result.path!,
        url: result.url!,
        file_name: result.file_name!,
        file_size: result.file_size!,
        file_type: result.file_type!
      }
    }
  } catch (error) {
    console.error('Erro inesperado no upload:', error)
    return {
      success: false,
      error: 'Erro inesperado no upload do arquivo'
    }
  }
}

// Função para deletar um post
export async function deletePost(postId: string): Promise<ApiResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // Chamar a função do banco de dados
    const { data, error } = await supabase.rpc('delete_post', {
      post_id_param: postId,
      author_id_param: user.id
    })

    if (error) {
      console.error('Erro ao deletar post:', error)
      return {
        success: false,
        error: 'Erro ao deletar post: ' + error.message
      }
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido ao deletar post'
      }
    }

    return {
      success: true,
      message: 'Post deletado com sucesso!'
    }

  } catch (error) {
    console.error('Erro inesperado ao deletar post:', error)
    return {
      success: false,
      error: 'Erro inesperado ao deletar post'
    }
  }
}

// Função para buscar um post específico
export async function getPost(postId: string): Promise<ApiResponse<Post>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // Buscar post específico
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .eq('author_id', user.id)
      .single()

    if (error) {
      console.error('Erro ao buscar post:', error)
      return {
        success: false,
        error: 'Post não encontrado ou acesso negado'
      }
    }

    return {
      success: true,
      data: data as Post
    }

  } catch (error) {
    console.error('Erro inesperado ao buscar post:', error)
    return {
      success: false,
      error: 'Erro inesperado ao buscar post'
    }
  }
} 

// Funções para tags de leitura
export async function getAllReadingTags() {
  const { data, error } = await supabase.rpc('get_all_reading_tags');
  if (error) throw new Error(error.message);
  return data.tags || [];
}

export async function createReadingTag({ name, description, color }: { name: string, description?: string, color?: string }) {
  const { error } = await supabase.rpc('create_reading_tag', {
    tag_name: name,
    tag_description: description,
    tag_color: color || '#3B82F6',
  });
  if (error) throw new Error(error.message);
}

export async function updateReadingTag({ id, name, description, color }: { id: string, name: string, description?: string, color?: string }) {
  const { error } = await supabase.rpc('update_reading_tag', {
    tag_id_param: id,
    tag_name: name,
    tag_description: description,
    tag_color: color || '#3B82F6',
  });
  if (error) throw new Error(error.message);
}

export async function deleteReadingTag(id: string) {
  const { error } = await supabase.rpc('delete_reading_tag', {
    tag_id_param: id,
  });
  if (error) throw new Error(error.message);
}

export async function getTagsForPost(postId: string) {
  const { data, error } = await supabase.rpc('get_tags_for_post', { post_id_param: postId });
  if (error) throw new Error(error.message);
  return data.tags || [];
}

export async function associateTagWithPost(postId: string, tagId: string) {
  const { error } = await supabase.rpc('associate_tag_with_post', {
    post_id_param: postId,
    tag_id_param: tagId,
  });
  if (error) throw new Error(error.message);
}

export async function removeTagFromPost(postId: string, tagId: string) {
  const { error } = await supabase.rpc('remove_tag_from_post', {
    post_id_param: postId,
    tag_id_param: tagId,
  });
  if (error) throw new Error(error.message);
} 