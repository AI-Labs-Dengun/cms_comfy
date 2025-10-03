import { supabase } from '@/lib/supabase'

// Types for storage
export interface UploadResult {
  success: boolean
  path?: string
  url?: string
  error?: string
  file_name?: string
  file_size?: number
  file_type?: string
  offline?: boolean
  offlineId?: string
}

export interface FileInfo {
  name: string
  size: number
  type: string
  last_accessed: string
  created_at: string
  updated_at: string
}

// Bucket configuration
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

// Mapping of categories to folders inside the bucket
const CATEGORY_FOLDERS: Record<string, string> = {
  'Shorts': 'shorts',
  'Vídeo': 'video',
  'Podcast': 'podcast',
  'Artigo': 'artigo',
  'Livro': 'livro',
  'Áudio': 'audio',
  'Leitura': 'leitura',
  'Ferramentas': 'ferramentas',
  'Quizzes': 'quizzes'
}

// Function to validate a file
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }
  }

  // Check type
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

// Function to generate a unique file name
async function generateUniqueFileName(originalName: string, userId: string, categoryFolder?: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const extension = originalName.includes('.') ? originalName.split('.').pop() : ''
  const baseName = originalName.includes('.') ? originalName.split('.').slice(0, -1).join('.') : originalName
  
  // Clean the file name (remove special characters)
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')
  
  let fileName = `${cleanBaseName}_${timestamp}_${userId}`
  if (extension) {
    fileName += `.${extension}`
  }

  // Check if the file already exists
  // List inside the user's folder + category when possible to avoid collisions
  const listPath = categoryFolder ? `${categoryFolder}/${userId}` : userId
  const { data: existingFiles } = await supabase.storage
    .from(BUCKET_NAME)
    .list(listPath, {
      search: fileName
    })

  if (existingFiles && existingFiles.length > 0) {
  // Add a unique number if necessary
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

// Main function for file upload
// Now optionally accepts a category to organize the file inside the bucket
export async function uploadFile(file: File, category?: string): Promise<UploadResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    console.debug("[storage] config check", { supabaseUrl, hasAnonKey, bucketName: BUCKET_NAME });

  // 🔑 Check if the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Usuário não autenticado" };
    }

  // 🔑 Validate role in CMS
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, user_role, authorized")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.user_role !== "cms" || !profile.authorized) {
      console.error("❌ Acesso negado para upload:", { profile, profileError });
      return { success: false, error: "Acesso negado. Apenas usuários CMS autorizados podem fazer upload." };
    }

    console.log("✅ Usuário CMS autorizado para upload:", { userId: user.id, userRole: profile.user_role });

  // 🔍 Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

  // 📂 Build final path
    const categoryFolder = category && CATEGORY_FOLDERS[category] ? CATEGORY_FOLDERS[category] : undefined;
    const fileName = await generateUniqueFileName(file.name, user.id, categoryFolder);
    const filePath = `${user.id}/${fileName}`;

  // 🔄 Upload with simple retry
    let uploadRes;
    try {
      console.debug("[storage] upload attempt", { filePath, fileName, bucketName: BUCKET_NAME });

      uploadRes = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadRes.error) {
        console.error("❌ Upload error:", uploadRes.error);
        return { success: false, error: `Erro no upload: ${uploadRes.error.message}` };
      }
    } catch (err) {
      console.error("❌ Upload exception:", err);
      return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido no upload" };
    }

  // 🌐 Generate public URL
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return {
      success: true,
      path: filePath,
      url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    };
  } catch (error) {
    console.error("❌ Erro inesperado no upload:", error);
    return { success: false, error: "Erro inesperado ao fazer upload" };
  }
}

// Function to delete a file
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

// Function to list user's files
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

// Function to get a public/download URL
export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)
  
  return data.publicUrl
}

// Type to represent an offline upload stored locally
export interface OfflineUpload {
  id?: string
  path?: string
  name?: string
  size?: number
  type?: string
  status?: 'pending' | 'uploaded' | 'failed'
  progress?: number
  category?: string
  timestamp?: number
  [key: string]: unknown
}

// Function to get offline uploads (stored locally)
// This function is safe to import in SSR — it checks if `window` exists
// and returns an empty array on the server. The expected format stored in
// localStorage is a JSON-stringified array of objects compatible with
// the OfflineUpload type.
export function getOfflineUploads(): OfflineUpload[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return []
    const raw = window.localStorage.getItem('offline_uploads')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
  // Map and ensure each item is a plain object
    return parsed.map((item) => (typeof item === 'object' && item !== null ? item as OfflineUpload : {}))
  } catch (error) {
    console.warn('Erro ao ler uploads offline do localStorage:', error)
    return []
  }
}


// Function to get a signed URL (for private files)
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

// Function to get duration of media files
export async function getMediaDuration(file: File | string): Promise<{ success: boolean; duration?: number; error?: string }> {
  try {
  // If it's a string (URL), treat as URL
    if (typeof file === 'string') {
      return await getMediaDurationFromUrl(file);
    }
    
  // If it's a File, treat as a local file
    return await getMediaDurationFromFile(file);
  } catch (error) {
    console.error('Erro ao obter duração da mídia:', error);
    return {
      success: false,
      error: 'Erro inesperado ao obter duração da mídia'
    };
  }
}

// Function to get duration from a local file
async function getMediaDurationFromFile(file: File): Promise<{ success: boolean; duration?: number; error?: string }> {
  return new Promise((resolve) => {
  // Check if it's a media file
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
    
  // Create object URL for the file
    const url = URL.createObjectURL(file);
    mediaElement.src = url;
    
  // Revoke URL after some time
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  });
}

// Function to get duration from a media URL
async function getMediaDurationFromUrl(url: string): Promise<{ success: boolean; duration?: number; error?: string }> {
  return new Promise((resolve) => {
  // Check if it's a valid media URL
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

  // For YouTube URLs, attempt to extract duration via API (if available)
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      resolve({
        success: false,
        error: 'Duração de vídeos do YouTube requer API key'
      });
      return;
    }

  // For other URLs, try loading as a media element
    const video = document.createElement('video');
    const audio = document.createElement('audio');
    
  // Try first as video
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
  // If it fails as video, try as audio
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

// Function to detect content type based on URL
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
  
  // Direct media files
  const mediaExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.mp3', '.wav', '.ogg', '.aac', '.flac'];
  if (mediaExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return 'direct-media';
  }
  
  return 'external';
}
