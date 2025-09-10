import { supabase } from '@/lib/supabase'
import { uploadFile, getMediaDuration } from './storage'

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
  duration?: number // ✅ ADICIONANDO CAMPO DURATION
  thumbnail_url?: string // ✅ ADICIONANDO CAMPO THUMBNAIL_URL
  min_age?: number // ✅ ADICIONANDO CAMPO MIN_AGE
  tags?: string[]
  emotion_tags?: string[]
  categoria_leitura?: string[] // ✅ ADICIONANDO CAMPO CATEGORIA_LEITURA
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
  duration?: number // ✅ ADICIONANDO CAMPO DURATION
  thumbnail_url?: string // ✅ ADICIONANDO CAMPO THUMBNAIL_URL
  min_age?: number // ✅ ADICIONANDO CAMPO MIN_AGE
  tags: string[]
  emotion_tags: string[]
  categoria_leitura?: string[] // ✅ ADICIONANDO CAMPO CATEGORIA_LEITURA
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

    // Obter duração para posts de vídeo e áudio
    let duration = postData.duration;
    if ((postData.category === 'Vídeo' || postData.category === 'Podcast' || postData.category === 'Áudio') && !duration) {
      try {
        if (postData.content_url) {
          const durationResult = await getMediaDuration(postData.content_url);
          if (durationResult.success && durationResult.duration) {
            duration = durationResult.duration;
          }
        }
      } catch (error) {
        console.warn('Erro ao obter duração da URL:', error);
        // Não falhar se não conseguir obter a duração
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
      // categoria_leitura_param será preenchido automaticamente pelo trigger
      file_path_param: postData.file_path || null,
      file_name_param: postData.file_name || null,
      file_type_param: postData.file_type || null,
      duration_param: duration || null, // ✅ ADICIONANDO DURATION_PARAM
      thumbnail_url_param: postData.thumbnail_url || null, // ✅ ADICIONANDO THUMBNAIL_URL_PARAM
      min_age_param: postData.min_age || 12 // ✅ ADICIONANDO MIN_AGE_PARAM
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

// Função para buscar todos os posts (CMS)
// NOTA: Todos os usuários do CMS podem ver e gerenciar todos os posts, independentemente do autor
export async function getAllPosts(): Promise<ApiResponse<Post[]>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // Buscar todos os posts (sem filtrar por autor)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar posts:', error)
      return {
        success: false,
        error: 'Erro ao buscar posts: ' + error.message
      }
    }

    // Log para verificar se o campo categoria_leitura está presente
    if (data && data.length > 0) {
      console.log('📊 Posts carregados:', data.length);
      const readingPosts = data.filter(post => post.category === 'Leitura');
      console.log('📚 Posts de leitura encontrados:', readingPosts.length);
      
      readingPosts.forEach(post => {
        console.log(`📖 Post "${post.title}":`, {
          id: post.id,
          categoria_leitura: post.categoria_leitura,
          has_categoria_leitura: !!post.categoria_leitura,
          categoria_leitura_length: post.categoria_leitura?.length || 0
        });
      });
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

// Função para buscar posts do usuário (CMS) - mantida para compatibilidade
// NOTA: Agora retorna todos os posts, não apenas os do usuário atual
export async function getUserPosts(): Promise<ApiResponse<Post[]>> {
  return getAllPosts();
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
    let thumbnailUrl = postData.thumbnail_url || null // ✅ INICIALIZAR THUMBNAIL_URL
    let category = postData.category
    let duration = postData.duration

    if (postData.content_url && postData.content_url.trim() !== '') {
      // Se tem URL, limpar campos de arquivo
      contentUrl = postData.content_url
      filePath = null
      fileName = null
      fileType = null
      
      // Obter duração para posts de vídeo e áudio com URL
      if ((category === 'Vídeo' || category === 'Podcast' || category === 'Áudio') && !duration) {
        try {
          const durationResult = await getMediaDuration(postData.content_url);
          if (durationResult.success && durationResult.duration) {
            duration = durationResult.duration;
          }
        } catch (error) {
          console.warn('Erro ao obter duração da URL:', error);
        }
      }
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
        .select('content_url, file_path, file_name, file_type, thumbnail_url, category, duration') // ✅ ADICIONAR THUMBNAIL_URL
        .eq('id', postId)
        .single()
      
      if (currentPost) {
        contentUrl = currentPost.content_url
        filePath = currentPost.file_path
        fileName = currentPost.file_name
        fileType = currentPost.file_type
        // ✅ PRESERVAR THUMBNAIL_URL SE NÃO FOI FORNECIDO
        if (!thumbnailUrl) {
          thumbnailUrl = currentPost.thumbnail_url
        }
        // Se a categoria não foi fornecida, preservar a existente
        if (!category) {
          category = currentPost.category
        }
        // Se a duração não foi fornecida, preservar a existente
        if (!duration) {
          duration = currentPost.duration
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
      thumbnail_url_param: thumbnailUrl, // ✅ USAR A VARIÁVEL LOCAL
      tags_param: postData.tags || [],
      emotion_tags_param: postData.emotion_tags || [],
      // categoria_leitura_param será preenchido automaticamente pelo trigger
      file_path_param: filePath,
      file_name_param: fileName,
      file_type_param: fileType,
      duration_param: duration || null, // ✅ ADICIONANDO DURATION_PARAM
      min_age_param: postData.min_age || 12 // ✅ ADICIONANDO MIN_AGE_PARAM
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
export async function uploadFileForPost(file: File): Promise<ApiResponse<{ path: string; url: string; file_name: string; file_size: number; file_type: string; duration?: number }>> {
  try {
    const result = await uploadFile(file)
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }

    // Obter duração para arquivos de mídia
    let duration: number | undefined;
    if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      try {
        const durationResult = await getMediaDuration(file);
        if (durationResult.success && durationResult.duration) {
          duration = durationResult.duration;
        }
      } catch (error) {
        console.warn('Erro ao obter duração do arquivo:', error);
        // Não falhar se não conseguir obter a duração
      }
    }

    return {
      success: true,
      data: {
        path: result.path!,
        url: result.url!,
        file_name: result.file_name!,
        file_size: result.file_size!,
        file_type: result.file_type!,
        duration: duration
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
// NOTA: Qualquer usuário do CMS pode visualizar qualquer post, independentemente do autor
export async function getPost(postId: string): Promise<ApiResponse<Post>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // Buscar post específico (sem filtrar por autor)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (error) {
      console.error('Erro ao buscar post:', error)
      return {
        success: false,
        error: 'Post não encontrado ou acesso negado'
      }
    }

    console.log('📄 Post carregado:', data);
    console.log('📋 Categoria de leitura do post:', data.categoria_leitura);

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
  try {
    console.log(`🔍 Buscando tags para post: ${postId}`);
    
    const { data, error } = await supabase.rpc('get_tags_for_post', { post_id_param: postId });
    
    if (error) {
      console.error('❌ Erro na função get_tags_for_post:', error);
      throw new Error(error.message);
    }
    
    console.log('📊 Dados retornados da função get_tags_for_post:', data);
    
    // Verificar se data existe e tem a estrutura esperada
    if (!data) {
      console.log('⚠️ Nenhum dado retornado da função get_tags_for_post');
      return [];
    }
    
    // Verificar se data.tags existe, senão usar data diretamente
    const tags = data.tags || data || [];
    console.log('🏷️ Tags processadas:', tags);
    
    return tags;
  } catch (error) {
    console.error('❌ Erro ao buscar tags para post:', error);
    throw error;
  }
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