"use client";

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, Video, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { validatePostFiles, type FileValidation } from '@/services/posts';

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
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading] = useState(false);
  const [uploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para validar e atualizar arquivos
  const handleFilesUpdate = useCallback((newFiles: File[]) => {
    // Create previews for image files
    const newPreviews = newFiles.map(f => ({ file: f, url: URL.createObjectURL(f) }));

    // Revoke previous previews safely inside state updater to avoid referencing `previews` from closure
    setPreviews(prev => {
      prev.forEach(p => URL.revokeObjectURL(p.url));
      return newPreviews;
    });

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
    if (category === 'Shorts' && fileArray.length > 10) {
      alert('Máximo 10 arquivos permitidos para Shorts');
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
    // Revoke the preview URL for this file
    const preview = previews[index];
    if (preview) URL.revokeObjectURL(preview.url);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    handleFilesUpdate(newFiles);
  };

  // Limpar todos os arquivos
  const clearFiles = () => {
    // Revoke all previews
    previews.forEach(p => URL.revokeObjectURL(p.url));
    setPreviews([]);
    setSelectedPreview(null);
    handleFilesUpdate([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Inform parent that uploads/data were cleared
    onUploadComplete?.({ file_paths: [], file_names: [], file_types: [], file_sizes: [] });
  };

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      previews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  // Note: upload is handled by the parent component (if needed). The upload logic was removed
  // to avoid an unused variable / ESLint error during build. If automatic upload is desired,
  // reintroduce uploadPostFiles and call it from here or expose a trigger prop.

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
  if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" aria-hidden="true" />;
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" aria-hidden="true" />;
    return <FileText className="w-4 h-4" aria-hidden="true" />;
  };

  // Texto de instruções baseado na categoria
  const getInstructionText = () => {
    if (category === 'Shorts') {
  return 'Arraste até 10 imagens para criar um carousel OU 1 vídeo único';
    }
    return 'Arraste 1 arquivo ou clique para selecionar';
  };

  // Tipos de arquivo aceitos baseado na categoria
  const getAcceptedTypes = () => {
    if (category === 'Shorts') {
      return 'image/*,video/*';
    } else if (category === 'Vídeo' || category === 'Podcast') {
      return 'video/*,audio/*';
    } else if (category === 'Artigo' || category === 'Ferramentas' || category === 'Quizzes' || category === 'Filme e Série') {
      console.log(`📁 Categoria "${category}" aceita: image/*, PDF, text/*`);
      return 'image/*,application/pdf,text/*';
    }
    console.log(`📁 Categoria "${category}" aceita: todos os tipos`);
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-80 overflow-y-auto">
            {previews.map((p, index) => (
              <div key={index} className="relative bg-white rounded-md shadow-sm overflow-hidden">
                {p.file.type.startsWith('image/') ? (
                  <div className="w-full h-48 relative cursor-pointer hover:scale-105 transition-transform" onClick={() => setSelectedPreview(p.url)}>
                    <Image
                      src={p.url}
                      alt={p.file.name}
                      unoptimized
                      fill
                      sizes="(max-width: 640px) 100vw, 25vw"
                      style={{ objectFit: 'cover' }}
                      priority={false}
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gray-50">
                    {getFileIcon(p.file.type)}
                  </div>
                )}

                <div className="p-3 flex items-center justify-between">
                  <div className="flex-1 pr-2">
                    <p className="text-sm font-medium text-gray-700 truncate">{p.file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(p.file.size)}</p>
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
              </div>
            ))}
          </div>

          {/* Lightbox modal for larger preview */}
          {selectedPreview && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80"
              onClick={() => setSelectedPreview(null)}
            >
              <div className="relative max-w-[90vw] max-h-[90vh]">
                <button
                  className="absolute top-2 right-2 text-white bg-black bg-opacity-30 rounded-full p-1"
                  onClick={(e) => { e.stopPropagation(); setSelectedPreview(null); }}
                  aria-label="Fechar"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="relative max-w-[90vw] max-h-[90vh]">
                  <Image src={selectedPreview!} alt="Preview" unoptimized fill style={{ objectFit: 'contain' }} onClick={(e) => e.stopPropagation()} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botão de Upload removido — upload deve ser tratado pelo pai ou automaticamente */}

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