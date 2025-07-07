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