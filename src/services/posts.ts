import { supabase } from '@/lib/supabase'
import { uploadFile, getMediaDuration } from './storage'

// Types for file validation
export interface FileValidation {
  valid: boolean;
  is_carousel: boolean;
  is_single_video: boolean;
  is_single_image: boolean;
  error?: string;
  file_count: number;
  category: string;
  type: 'carousel' | 'single_image' | 'single_video' | 'unknown';
}

// Types for posts (UPDATED to support arrays)
export interface CreatePostData {
  title: string
  description: string
  category: 'Vídeo' | 'Podcast' | 'Artigo' | 'Livro' | 'Áudio' | 'Shorts' | 'Leitura'
  content?: string 
  content_url?: string
  // ✅ UNIFIED FIELDS: support one or multiple files
  file_paths?: string[]
  file_names?: string[]
  file_types?: string[]
  file_sizes?: number[]
  // (old fields removed - use arrays above)
  duration?: number 
  thumbnail_url?: string | null 
  min_age?: number 
  tags?: string[]
  emotion_tags?: string[]
  categoria_leitura?: string[] 
}

export interface Post {
  id: string
  title: string
  description: string
  category: string
  content?: string
  content_url?: string
  // ✅ UNIFIED FIELDS: support one or multiple files
  file_paths?: string[]
  file_names?: string[]
  file_sizes?: number[]
  file_types?: string[]
  // (old fields removed - use arrays above)
  duration?: number
  thumbnail_url?: string | null
  min_age?: number
  tags: string[]
  emotion_tags: string[]
  categoria_leitura?: string[] 
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

// ✅ CLIENT-SIDE VALIDATION FUNCTIONS (mirror backend)

// Client-side validation that mirrors validate_post_files() from the backend
export function validatePostFiles(files: File[], category: string): FileValidation {
  const filesCount = files.length;
  
  if (filesCount === 0) {
    return {
      valid: false,
      is_carousel: false,
      is_single_video: false,
      is_single_image: false,
      error: 'Nenhum arquivo selecionado',
      file_count: 0,
      category,
      type: 'unknown'
    };
  }
  
  // Analyze file types
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  const videoFiles = files.filter(f => f.type.startsWith('video/'));
  const audioFiles = files.filter(f => f.type.startsWith('audio/'));
  
  const allImages = imageFiles.length === filesCount;
  const allVideos = videoFiles.length === filesCount;
  const allAudios = audioFiles.length === filesCount;
  const mixedTypes = (imageFiles.length > 0 ? 1 : 0) + 
                     (videoFiles.length > 0 ? 1 : 0) + 
                     (audioFiles.length > 0 ? 1 : 0) > 1;

  // GLOBAL RULE: Never mix file types
  if (mixedTypes) {
    return {
      valid: false,
      is_carousel: false,
      is_single_video: false,
      is_single_image: false,
      error: 'Não é possível misturar imagens, vídeos e áudios no mesmo post',
      file_count: filesCount,
      category,
      type: 'unknown'
    };
  }

  // RULE SPECIFIC TO SHORTS
  if (category === 'Shorts') {
  // Single video for Shorts
    if (allVideos && filesCount > 1) {
      return {
        valid: false,
        is_carousel: false,
        is_single_video: false,
        is_single_image: false,
        error: 'Apenas 1 vídeo permitido para Shorts',
        file_count: filesCount,
        category,
        type: 'unknown'
      };
    }
    
  // Multiple images for Shorts (max 5)
    if (allImages && filesCount > 5) {
      return {
        valid: false,
        is_carousel: false,
        is_single_video: false,
        is_single_image: false,
        error: 'Máximo 5 imagens permitidas para Shorts',
        file_count: filesCount,
        category,
        type: 'unknown'
      };
    }
    
  // Multiple files must all be images
    if (filesCount > 1 && !allImages) {
      return {
        valid: false,
        is_carousel: false,
        is_single_video: false,
        is_single_image: false,
        error: 'Para múltiplos arquivos em Shorts, todos devem ser imagens',
        file_count: filesCount,
        category,
        type: 'unknown'
      };
    }

  // Audio is not supported for Shorts
    if (allAudios) {
      return {
        valid: false,
        is_carousel: false,
        is_single_video: false,
        is_single_image: false,
        error: 'Arquivos de áudio não são suportados para Shorts',
        file_count: filesCount,
        category,
        type: 'unknown'
      };
    }
  } else {
  // RULE FOR OTHER CATEGORIES: single file only
    if (filesCount > 1) {
      return {
        valid: false,
        is_carousel: false,
        is_single_video: false,
        is_single_image: false,
        error: `Categoria "${category}" permite apenas 1 arquivo`,
        file_count: filesCount,
        category,
        type: 'unknown'
      };
    }
  }

  // GENERAL VALIDATION: file must be image, video or audio
  if (!allImages && !allVideos && !allAudios) {
    return {
      valid: false,
      is_carousel: false,
      is_single_video: false,
      is_single_image: false,
      error: 'Tipo de arquivo não suportado',
      file_count: filesCount,
      category,
      type: 'unknown'
    };
  }

  // If we reached here, it's valid
  const isCarousel = filesCount > 1 && allImages && category === 'Shorts';
  const isSingleVideo = filesCount === 1 && allVideos;
  const isSingleImage = filesCount === 1 && allImages;

  return {
    valid: true,
    is_carousel: isCarousel,
    is_single_video: isSingleVideo,
    is_single_image: isSingleImage,
    file_count: filesCount,
    category,
    type: isCarousel ? 'carousel' : (isSingleVideo ? 'single_video' : 'single_image')
  };
}

// Unified upload: supports one or multiple files
export async function uploadPostFiles(files: File[], category?: string): Promise<{
  success: boolean;
  data?: {
    file_paths: string[];
    file_names: string[];
    file_types: string[];
    file_sizes: number[];
    durations?: number[];
  };
  error?: string;
}> {
  try {
    if (files.length === 0) {
      return {
        success: false,
        error: 'Nenhum arquivo fornecido para upload'
      };
    }

    const file_paths: string[] = [];
    const file_names: string[] = [];
    const file_types: string[] = [];
    const file_sizes: number[] = [];
    const durations: number[] = [];

  // Upload each file
    for (const file of files) {
      const uploadResult = await uploadFile(file, category);
      
      if (!uploadResult.success || !uploadResult.path) {
        return {
          success: false,
          error: `Erro no upload do arquivo ${file.name}: ${uploadResult.error}`
        };
      }

      file_paths.push(uploadResult.path);
      file_names.push(uploadResult.file_name || file.name);
      file_types.push(uploadResult.file_type || file.type);
      file_sizes.push(uploadResult.file_size || file.size);

  // For videos/audios, try to get duration
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        try {
          // Use temporary URL to get duration
          if (uploadResult.url) {
            const durationResult = await getMediaDuration(uploadResult.url);
            if (durationResult.success && durationResult.duration) {
              durations.push(durationResult.duration);
            }
          }
        } catch (error) {
          console.warn(`Não foi possível obter duração para ${file.name}:`, error);
        }
      }
    }

    return {
      success: true,
      data: {
        file_paths,
        file_names,
        file_types,
        file_sizes,
        durations: durations.length > 0 ? durations : undefined
      }
    };

  } catch (error) {
    console.error('Erro inesperado no upload dos arquivos:', error);
    return {
      success: false,
      error: 'Erro inesperado no upload dos arquivos'
    };
  }
}

// Function to create a post
export async function createPost(postData: CreatePostData): Promise<ApiResponse<Post>> {
  try {
  // Check if the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

  // ✅ CHECK USER_ROLE CMS - This is the main fix!
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_role, authorized')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.user_role !== 'cms' || !profile.authorized) {
      console.error('❌ Acesso negado para criar post:', { profile, profileError });
      return {
        success: false,
        error: 'Acesso negado. Apenas usuários CMS autorizados podem criar posts.'
      }
    }

    console.log('✅ Usuário CMS autorizado para criar post:', { userId: user.id, userRole: profile.user_role });

  // Validate required data
    if (!postData.title || !postData.description || !postData.category) {
      return {
        success: false,
        error: 'Título, descrição e categoria são obrigatórios'
      }
    }

  // Validate content (URL or files)
    const hasContentUrl = postData.content_url && postData.content_url.trim();
    const hasFiles = postData.file_paths && postData.file_paths.length > 0;
    
    if (!hasContentUrl && !hasFiles) {
      return {
        success: false,
        error: 'É necessário fornecer uma URL ou fazer upload de arquivo(s)'
      }
    }

  // Get duration for video and audio posts
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
  // Do not fail if unable to get duration
      }
    }

  // Call the database function with unified fields
    const { data, error } = await supabase.rpc('create_post', {
      author_id_param: user.id,
      title_param: postData.title,
      description_param: postData.description,
      category_param: postData.category,
      content_param: postData.content || null, 
      content_url_param: postData.content_url || null,
      tags_param: postData.tags || [],
      emotion_tags_param: postData.emotion_tags || [],
  // ✅ UNIFIED FIELDS: support one or multiple files
      file_paths_param: postData.file_paths || null,
      file_names_param: postData.file_names || null,
      file_sizes_param: postData.file_sizes || null,
      file_types_param: postData.file_types || null,
      duration_param: duration || null, 
      thumbnail_url_param: postData.thumbnail_url || null, 
      min_age_param: postData.min_age || 12 
    })

    if (error) {
      console.error('Erro ao criar post:', error)
      return {
        success: false,
        error: 'Erro ao criar post: ' + error.message
      }
    }

  // Check the function response
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

// Function to fetch all posts (CMS)
export async function getAllPosts(): Promise<ApiResponse<Post[]>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

  // Fetch all posts (without filtering by author)
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

  // Log to verify if the categoria_leitura field is present
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

// Function to fetch user posts (CMS) - kept for compatibility
export async function getUserPosts(): Promise<ApiResponse<Post[]>> {
  return getAllPosts();
}

// Function to update a post
export async function updatePost(postId: string, postData: Partial<CreatePostData>): Promise<ApiResponse<Post>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

  // ✅ CHECK USER_ROLE CMS
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_role, authorized')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.user_role !== 'cms' || !profile.authorized) {
      console.error('❌ Acesso negado para atualizar post:', { profile, profileError });
      return {
        success: false,
        error: 'Acesso negado. Apenas usuários CMS autorizados podem atualizar posts.'
      }
    }

  // Logic to respect the posts_content_check constraint
    let contentUrl: string | null = null
    let filePaths: string[] | null = null
    let fileNames: string[] | null = null
    let fileTypes: string[] | null = null
    let fileSizes: number[] | null = null
    let thumbnailUrl = postData.thumbnail_url || null 
    let category = postData.category
    let duration = postData.duration

    if (postData.content_url && postData.content_url.trim() !== '') {
  // If there's a URL, clear file fields
      contentUrl = postData.content_url
      filePaths = null
      fileNames = null
      fileTypes = null
      fileSizes = null

  // Get duration for video/audio posts with URL
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
    } else if (postData.file_paths && postData.file_paths.length > 0) {
  // If we have new arrays of files provided
      contentUrl = null
      filePaths = postData.file_paths
      fileNames = postData.file_names || null
      fileTypes = postData.file_types || null
      fileSizes = postData.file_sizes || null
    } else {
  // Fetch current post data preserving arrays
      const { data: currentPost } = await supabase
        .from('posts')
        .select('content_url, file_paths, file_names, file_types, file_sizes, thumbnail_url, category, duration') 
        .eq('id', postId)
        .single()
      
      if (currentPost) {
        contentUrl = currentPost.content_url
        filePaths = currentPost.file_paths || null
        fileNames = currentPost.file_names || null
        fileTypes = currentPost.file_types || null
        fileSizes = currentPost.file_sizes || null
        if (!thumbnailUrl) {
          thumbnailUrl = currentPost.thumbnail_url
        }
  // If the category wasn't provided, preserve the existing one
        if (!category) {
          category = currentPost.category
        }
        if (!duration) {
          duration = currentPost.duration
        }
      }
    }

  // If we still don't have a category, use 'Vídeo' as the default in this case only
    if (!category) {
      category = 'Vídeo'
    }

  // Call the database function (use unified fields)
    const { data, error } = await supabase.rpc('update_post', {
      post_id_param: postId,
      author_id_param: user.id,
      title_param: postData.title || '',
      description_param: postData.description || '',
      category_param: category,
      content_param: postData.content || null, 
      content_url_param: contentUrl,
      thumbnail_url_param: thumbnailUrl, 
      tags_param: postData.tags || [],
      emotion_tags_param: postData.emotion_tags || [],
      file_paths_param: filePaths,
      file_names_param: fileNames,
      file_types_param: fileTypes,
      file_sizes_param: fileSizes,
      duration_param: duration || null, 
      min_age_param: postData.min_age || 12 
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

// Function to publish/unpublish a post
export async function togglePostPublication(postId: string, publish: boolean): Promise<ApiResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

  // ✅ CHECK USER_ROLE CMS
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_role, authorized')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.user_role !== 'cms' || !profile.authorized) {
      console.error('❌ Acesso negado para publicar/despublicar post:', { profile, profileError });
      return {
        success: false,
        error: 'Acesso negado. Apenas usuários CMS autorizados podem publicar/despublicar posts.'
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

// Function to upload a file using Supabase Storage
export async function uploadFileForPost(file: File, category?: string): Promise<ApiResponse<{ path: string; url: string; file_name: string; file_size: number; file_type: string; duration?: number }>> {
  try {
  // Attempt to infer category from file type? Keep optional for now.
    const result = await uploadFile(file, category)
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }

  // Get duration for media files
    let duration: number | undefined;
    if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      try {
        const durationResult = await getMediaDuration(file);
        if (durationResult.success && durationResult.duration) {
          duration = durationResult.duration;
        }
      } catch (error) {
        console.warn('Erro ao obter duração do arquivo:', error);
  // Do not fail if unable to get duration
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

// Function to delete a post
export async function deletePost(postId: string): Promise<ApiResponse> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

  // ✅ CHECK USER_ROLE CMS
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_role, authorized')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.user_role !== 'cms' || !profile.authorized) {
      console.error('❌ Acesso negado para deletar post:', { profile, profileError });
      return {
        success: false,
        error: 'Acesso negado. Apenas usuários CMS autorizados podem deletar posts.'
      }
    }

  // Call the database function
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

// Function to fetch a specific post
export async function getPost(postId: string): Promise<ApiResponse<Post>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

  // Fetch specific post (without filtering by author)
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

// Functions for reading tags
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
    
  // Check if data exists and has expected structure
    if (!data) {
      console.log('⚠️ Nenhum dado retornado da função get_tags_for_post');
      return [];
    }
    
  // Check if data.tags exists, otherwise use data directly
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