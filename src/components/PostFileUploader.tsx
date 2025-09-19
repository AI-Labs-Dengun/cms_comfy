"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Video, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { validatePostFiles, uploadPostFiles, type FileValidation } from '@/services/posts';

interface PostFileUploaderProps {
  category: string;
  onFilesChange: (files: File[]) => void;
  onValidationChange: (validation: FileValidation | null) => void;
  onUploadComplete?: (uploadData: {
    file_paths: string[];
    file_names: string[];
    file_types: string[];
    file_sizes: number[];
    durations?: number[];
  }) => void;
  disabled?: boolean;
  value?: File[]; // Para controle externo
}

export default function PostFileUploader({ 
  category, 
  onFilesChange,
  onValidationChange,
  onUploadComplete,
  disabled = false,
  value = []
}: PostFileUploaderProps) {
  const [files, setFiles] = useState<File[]>(value);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para validar e atualizar arquivos
  const handleFilesUpdate = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    
    if (newFiles.length > 0) {
      const validationResult = validatePostFiles(newFiles, category);
      setValidation(validationResult);
      onValidationChange(validationResult);
    } else {
      setValidation(null);
      onValidationChange(null);
    }
    
    onFilesChange(newFiles);
  }, [category, onFilesChange, onValidationChange]);

  // Handler para seleção de arquivos
  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || disabled) return;

    const fileArray = Array.from(selectedFiles);
    
    // Para outras categorias que não Shorts, limitar a 1 arquivo
    if (category !== 'Shorts' && fileArray.length > 1) {
      alert(`Categoria "${category}" permite apenas 1 arquivo por vez`);
      return;
    }

    // Para Shorts, limitar a 5 arquivos
    if (category === 'Shorts' && fileArray.length > 5) {
      alert('Máximo 5 arquivos permitidos para Shorts');
      return;
    }

    handleFilesUpdate(fileArray);
  };

  // Handler para input de arquivo
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  // Handler para drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Remover arquivo específico
  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    handleFilesUpdate(newFiles);
  };

  // Limpar todos os arquivos
  const clearFiles = () => {
    handleFilesUpdate([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fazer upload dos arquivos
  const handleUpload = async () => {
    if (files.length === 0 || !validation?.valid) return;

    setUploading(true);
    setUploadProgress(0);

    // Simular progresso
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const uploadResult = await uploadPostFiles(files);
      
      if (uploadResult.success && uploadResult.data) {
        setUploadProgress(100);
        onUploadComplete?.(uploadResult.data);
      } else {
        throw new Error(uploadResult.error || 'Erro no upload');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert(`Erro no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Ícone baseado no tipo de arquivo
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" aria-hidden="true" />;
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" aria-hidden="true" />;
    return <FileText className="w-4 h-4" aria-hidden="true" />;
  };

  // Texto de instruções baseado na categoria
  const getInstructionText = () => {
    if (category === 'Shorts') {
      return 'Arraste até 5 imagens para criar um carousel OU 1 vídeo único';
    }
    return 'Arraste 1 arquivo ou clique para selecionar';
  };

  // Tipos de arquivo aceitos baseado na categoria
  const getAcceptedTypes = () => {
    if (category === 'Shorts') {
      return 'image/*,video/*';
    } else if (category === 'Vídeo' || category === 'Podcast') {
      return 'video/*,audio/*';
    } else if (category === 'Artigo') {
      return 'image/*,application/pdf,text/*';
    }
    return '*/*';
  };

  return (
    <div className="space-y-4">
      {/* Área de Upload */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          ${validation?.valid === false ? 'border-red-500 bg-red-50' : ''}
          ${validation?.valid === true ? 'border-green-500 bg-green-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={category === 'Shorts'}
          accept={getAcceptedTypes()}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center space-y-3">
          <Upload className={`w-12 h-12 ${
            validation?.valid === false ? 'text-red-500' : 
            validation?.valid === true ? 'text-green-500' : 'text-gray-400'
          }`} />
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              {getInstructionText()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Categoria: <span className="font-medium">{category}</span>
              {category === 'Shorts' && (
                <span className="block mt-1 text-xs">
                  Múltiplos arquivos devem ser todas imagens • Vídeo deve ser único
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Mensagem de Validação */}
      {validation && (
        <div className={`p-3 rounded-md flex items-start space-x-3 ${
          validation.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {validation.valid ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            {validation.valid ? (
              <div>
                <p className="text-green-800 font-medium">Arquivos válidos!</p>
                <p className="text-green-700 text-sm">
                  Tipo: {validation.type} • {validation.file_count} arquivo(s)
                  {validation.is_carousel && ' • Será exibido como carousel'}
                  {validation.is_single_video && ' • Vídeo único'}
                  {validation.is_single_image && ' • Imagem única'}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-red-800 font-medium">Erro na validação</p>
                <p className="text-red-700 text-sm">{validation.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de Arquivos Selecionados */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700">
              Arquivos Selecionados ({files.length})
            </h4>
            <button
              onClick={clearFiles}
              disabled={disabled || uploading}
              className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
            >
              Limpar Todos
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={disabled || uploading}
                  className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
                  title="Remover arquivo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão de Upload */}
      {files.length > 0 && validation?.valid && (
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleUpload}
            disabled={disabled || uploading || !validation.valid}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? `Enviando... ${uploadProgress}%` : 'Fazer Upload'}
          </button>
        </div>
      )}

      {/* Barra de Progresso */}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}