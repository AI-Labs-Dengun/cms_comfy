import { supabase } from '@/lib/supabase'

// Tipos para o storage
export interface UploadResult {
  success: boolean
  path?: string
  url?: string
  error?: string
  file_name?: string
  file_size?: number
  file_type?: string
}

export interface FileInfo {
  name: string
  size: number
  type: string
  last_accessed: string
  created_at: string
  updated_at: string
}

// Configurações do bucket
const BUCKET_NAME = 'posts'
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_TYPES = [
  'video/',
  'audio/',
  'application/pdf',
  'image/',
  'text/',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

// Função para validar arquivo
function validateFile(file: File): { valid: boolean; error?: string } {
  // Verificar tamanho
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }
  }

  // Verificar tipo
  const isAllowedType = ALLOWED_TYPES.some(type => 
    file.type.startsWith(type) || file.type === type
  )

  if (!isAllowedType) {
    return {
      valid: false,
      error: 'Tipo de arquivo não permitido. Tipos aceitos: vídeo, áudio, PDF, imagem, texto, documentos'
    }
  }

  return { valid: true }
}

// Função para gerar nome único do arquivo
async function generateUniqueFileName(originalName: string, userId: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const extension = originalName.includes('.') ? originalName.split('.').pop() : ''
  const baseName = originalName.includes('.') ? originalName.split('.').slice(0, -1).join('.') : originalName
  
  // Limpar nome do arquivo (remover caracteres especiais)
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')
  
  let fileName = `${cleanBaseName}_${timestamp}_${userId}`
  if (extension) {
    fileName += `.${extension}`
  }

  // Verificar se o arquivo já existe
  const { data: existingFiles } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', {
      search: fileName
    })

  if (existingFiles && existingFiles.length > 0) {
    // Adicionar número único se necessário
    let counter = 1
    let newFileName = fileName
    while (existingFiles.some(f => f.name === newFileName)) {
      const nameWithoutExt = fileName.includes('.') ? fileName.split('.').slice(0, -1).join('.') : fileName
      const ext = fileName.includes('.') ? fileName.split('.').pop() : ''
      newFileName = `${nameWithoutExt}_${counter}${ext ? '.' + ext : ''}`
      counter++
    }
    fileName = newFileName
  }

  return fileName
}

// Função principal para upload de arquivo
export async function uploadFile(file: File): Promise<UploadResult> {
  try {
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // Validar arquivo
    const validation = validateFile(file)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Gerar nome único
    const fileName = await generateUniqueFileName(file.name, user.id)
    const filePath = `${user.id}/${fileName}`

    // Fazer upload
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Erro no upload:', error)
      return {
        success: false,
        error: 'Erro ao fazer upload do arquivo: ' + error.message
      }
    }

    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return {
      success: true,
      path: filePath,
      url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type
    }

  } catch (error) {
    console.error('Erro inesperado no upload:', error)
    return {
      success: false,
      error: 'Erro inesperado ao fazer upload'
    }
  }
}

// Função para deletar arquivo
export async function deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error('Erro ao deletar arquivo:', error)
      return {
        success: false,
        error: 'Erro ao deletar arquivo: ' + error.message
      }
    }

    return { success: true }

  } catch (error) {
    console.error('Erro inesperado ao deletar arquivo:', error)
    return {
      success: false,
      error: 'Erro inesperado ao deletar arquivo'
    }
  }
}

// Função para listar arquivos do usuário
export async function listUserFiles(): Promise<{ success: boolean; files?: FileInfo[]; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(user.id, {
        limit: 100,
        offset: 0
      })

    if (error) {
      console.error('Erro ao listar arquivos:', error)
      return {
        success: false,
        error: 'Erro ao listar arquivos: ' + error.message
      }
    }

    const files: FileInfo[] = (data || []).map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      type: file.metadata?.mimetype || 'unknown',
      last_accessed: file.updated_at,
      created_at: file.created_at,
      updated_at: file.updated_at
    }))

    return {
      success: true,
      files
    }

  } catch (error) {
    console.error('Erro inesperado ao listar arquivos:', error)
    return {
      success: false,
      error: 'Erro inesperado ao listar arquivos'
    }
  }
}

// Função para obter URL de download
export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)
  
  return data.publicUrl
}

// Função para obter URL assinada (para arquivos privados)
export async function getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      return {
        success: false,
        error: 'Erro ao gerar URL assinada: ' + error.message
      }
    }

    return {
      success: true,
      url: data.signedUrl
    }

  } catch (error) {
    console.error('Erro inesperado ao gerar URL assinada:', error)
    return {
      success: false,
      error: 'Erro inesperado ao gerar URL assinada'
    }
  }
}

// Função para obter duração de arquivos de mídia
export async function getMediaDuration(file: File | string): Promise<{ success: boolean; duration?: number; error?: string }> {
  try {
    // Se for uma string (URL), tratar como URL
    if (typeof file === 'string') {
      return await getMediaDurationFromUrl(file);
    }
    
    // Se for um File, tratar como arquivo local
    return await getMediaDurationFromFile(file);
  } catch (error) {
    console.error('Erro ao obter duração da mídia:', error);
    return {
      success: false,
      error: 'Erro inesperado ao obter duração da mídia'
    };
  }
}

// Função para obter duração de arquivo local
async function getMediaDurationFromFile(file: File): Promise<{ success: boolean; duration?: number; error?: string }> {
  return new Promise((resolve) => {
    // Verificar se é um arquivo de mídia
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      resolve({
        success: false,
        error: 'Arquivo não é um arquivo de mídia válido'
      });
      return;
    }

    const video = document.createElement('video');
    const audio = document.createElement('audio');
    const mediaElement = file.type.startsWith('video/') ? video : audio;
    
    mediaElement.preload = 'metadata';
    
    mediaElement.onloadedmetadata = () => {
      const duration = Math.round(mediaElement.duration);
      resolve({
        success: true,
        duration: duration
      });
    };
    
    mediaElement.onerror = () => {
      resolve({
        success: false,
        error: 'Erro ao carregar metadados do arquivo'
      });
    };
    
    // Criar URL do arquivo
    const url = URL.createObjectURL(file);
    mediaElement.src = url;
    
    // Limpar URL após um tempo
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  });
}

// Função para obter duração de URL de mídia
async function getMediaDurationFromUrl(url: string): Promise<{ success: boolean; duration?: number; error?: string }> {
  return new Promise((resolve) => {
    // Verificar se é uma URL de mídia válida
    const mediaExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.mp3', '.wav', '.ogg', '.aac', '.flac'];
    const isMediaUrl = mediaExtensions.some(ext => url.toLowerCase().includes(ext)) || 
                      url.includes('youtube.com') || 
                      url.includes('youtu.be') ||
                      url.includes('vimeo.com') ||
                      url.includes('soundcloud.com');
    
    if (!isMediaUrl) {
      resolve({
        success: false,
        error: 'URL não parece ser um arquivo de mídia válido'
      });
      return;
    }

    // Para URLs do YouTube, tentar extrair duração via API (se disponível)
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      resolve({
        success: false,
        error: 'Duração de vídeos do YouTube requer API key'
      });
      return;
    }

    // Para outras URLs, tentar carregar como elemento de mídia
    const video = document.createElement('video');
    const audio = document.createElement('audio');
    
    // Tentar primeiro como vídeo
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    
    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration);
      resolve({
        success: true,
        duration: duration
      });
    };
    
    video.onerror = () => {
      // Se falhar como vídeo, tentar como áudio
      audio.preload = 'metadata';
      audio.crossOrigin = 'anonymous';
      
      audio.onloadedmetadata = () => {
        const duration = Math.round(audio.duration);
        resolve({
          success: true,
          duration: duration
        });
      };
      
      audio.onerror = () => {
        resolve({
          success: false,
          error: 'Não foi possível carregar a duração da mídia'
        });
      };
      
      audio.src = url;
    };
    
    video.src = url;
  });
}

// Função para detectar tipo de conteúdo baseado na URL
export function detectContentType(url: string): string | null {
  if (!url.trim()) return null;
  
  // YouTube Shorts
  if (url.includes('youtube.com/shorts/') || url.includes('youtu.be/')) {
    return 'youtube-shorts';
  }
  
  // Instagram Reels
  if (url.includes('instagram.com/reel/') || url.includes('instagram.com/tv/')) {
    return 'instagram-reel';
  }
  
  // TikTok
  if (url.includes('tiktok.com/')) {
    return 'tiktok';
  }
  
  // YouTube normal
  if (url.includes('youtube.com/watch')) {
    return 'youtube';
  }
  
  // Vimeo
  if (url.includes('vimeo.com/')) {
    return 'vimeo';
  }
  
  // SoundCloud
  if (url.includes('soundcloud.com/')) {
    return 'soundcloud';
  }
  
  // Arquivos de mídia diretos
  const mediaExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.mp3', '.wav', '.ogg', '.aac', '.flac'];
  if (mediaExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return 'direct-media';
  }
  
  return 'external';
} 