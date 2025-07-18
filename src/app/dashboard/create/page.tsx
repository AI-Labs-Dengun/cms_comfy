"use client";

import React, { useState, useEffect } from "react";
import { CloudUpload, X, Plus } from "lucide-react";
import CMSLayout from "@/components/CMSLayout";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { createPost, CreatePostData, uploadFileForPost, getAllReadingTags, associateTagWithPost, createReadingTag } from "@/services/posts";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const emotionTags = [
  "Raiva",
  "Alegria",
  "Inveja",
  "Medo",
  "Tristeza",
];

// Componente do Editor Markdown
const MarkdownEditor = ({ value, onChange, placeholder, showToolbar = true }: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
  showToolbar?: boolean;
}) => {
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setSelectionStart(e.target.selectionStart);
    setSelectionEnd(e.target.selectionEnd);
  };

  const handleTextAreaSelect = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSelectionStart(e.target.selectionStart);
    setSelectionEnd(e.target.selectionEnd);
  };

  const insertText = (before: string, after: string = "") => {
    const textArea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    if (!textArea) return;

    const beforeText = value.substring(0, selectionStart);
    const selectedText = value.substring(selectionStart, selectionEnd);
    const afterText = value.substring(selectionEnd);

    // Remover espaços desnecessários do texto selecionado para garantir formatação correta
    const trimmedSelectedText = selectedText.trim();
    
    // Se não há texto selecionado, apenas inserir os marcadores
    if (trimmedSelectedText === "") {
      const newText = beforeText + before + after + afterText;
      onChange(newText);
      
      // Posicionar cursor entre os marcadores
      setTimeout(() => {
        textArea.focus();
        const newCursorPos = selectionStart + before.length;
        textArea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
      return;
    }

    // Aplicar formatação ao texto trimmed
    const newText = beforeText + before + trimmedSelectedText + after + afterText;
    onChange(newText);

    // Restaurar foco e seleção
    setTimeout(() => {
      textArea.focus();
      const newCursorPos = selectionStart + before.length;
      textArea.setSelectionRange(newCursorPos, newCursorPos + trimmedSelectedText.length);
    }, 0);
  };

  const insertLine = (prefix: string) => {
    const textArea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    if (!textArea) return;

    const beforeText = value.substring(0, selectionStart);
    const selectedText = value.substring(selectionStart, selectionEnd);
    const afterText = value.substring(selectionEnd);

    // Se há texto selecionado, aplicar o prefixo ao texto selecionado
    if (selectedText.trim()) {
      const trimmedSelectedText = selectedText.trim();
      const newText = beforeText + prefix + trimmedSelectedText + afterText;
      onChange(newText);
      
      setTimeout(() => {
        textArea.focus();
        const newCursorPos = selectionStart + prefix.length;
        textArea.setSelectionRange(newCursorPos, newCursorPos + trimmedSelectedText.length);
      }, 0);
      return;
    }

    // Se não há texto selecionado, trabalhar com a linha atual
    const lines = value.split('\n');
    const currentLineIndex = value.substring(0, selectionStart).split('\n').length - 1;
    const currentLine = lines[currentLineIndex] || '';
    
    // Se a linha já tem o prefixo, remover. Senão, adicionar.
    if (currentLine.startsWith(prefix)) {
      lines[currentLineIndex] = currentLine.substring(prefix.length);
    } else {
      lines[currentLineIndex] = prefix + currentLine;
    }

    const newText = lines.join('\n');
    onChange(newText);

    // Restaurar foco
    setTimeout(() => {
      textArea.focus();
      const newCursorPos = selectionStart + (currentLine.startsWith(prefix) ? -prefix.length : prefix.length);
      textArea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {/* Barra de ferramentas - apenas se showToolbar for true */}
      {showToolbar && (
        <div className="bg-gray-100 border-b border-gray-300 p-2 flex flex-wrap gap-1">
          {/* Títulos */}
          <button
            type="button"
            onClick={() => insertLine('# ')}
            className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
            title="Título H1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertLine('## ')}
            className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
            title="Título H2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertLine('### ')}
            className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
            title="Título H3"
          >
            H3
          </button>
          
          <div className="w-px h-6 bg-gray-400 mx-1"></div>
          
          {/* Formatação de texto */}
          <button
            type="button"
            onClick={() => insertText('**', '**')}
            className="px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
            title="Negrito"
          >
            <strong className="text-gray-900">B</strong>
          </button>
          <button
            type="button"
            onClick={() => insertText('*', '*')}
            className="px-2 py-1 text-xs italic bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
            title="Itálico"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => insertText('~~', '~~')}
            className="px-2 py-1 text-xs line-through bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm"
            title="Riscado"
          >
            S
          </button>
          
          <div className="w-px h-6 bg-gray-400 mx-1"></div>
          
          {/* Listas */}
          <button
            type="button"
            onClick={() => insertLine('- ')}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm font-medium"
            title="Lista com marcadores"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => insertLine('1. ')}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm font-medium"
            title="Lista numerada"
          >
            1.
          </button>
          
          <div className="w-px h-6 bg-gray-400 mx-1"></div>
          
          {/* Citação */}
          <button
            type="button"
            onClick={() => insertLine('> ')}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm font-medium"
            title="Citação"
          >
            &quot;
          </button>
          
          {/* Código */}
          <button
            type="button"
            onClick={() => insertText('`', '`')}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-200 transition-colors text-gray-800 shadow-sm font-mono"
            title="Código inline"
          >
            &lt;/&gt;
          </button>
        </div>
      )}
      
      {/* Área de texto */}
      <textarea
        id="markdown-editor"
        value={value}
        onChange={handleTextAreaChange}
        onSelect={handleTextAreaSelect}
        placeholder={placeholder}
        className="w-full px-3 py-2 focus:outline-none text-gray-900 font-medium resize-none"
        rows={6}
      />
    </div>
  );
};

// Modal para criar nova categoria de leitura
const CreateReadingTagModal = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome da categoria é obrigatório");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createReadingTag({
        name: name.trim(),
        description: description.trim() || undefined,
        color: color
      });

      // Limpar formulário
      setName("");
      setDescription("");
      setColor("#3B82F6");
      
      // Mostrar mensagem de sucesso
      setSuccess("Categoria criada com sucesso!");
      
      // Aguardar um pouco e depois fechar modal e atualizar lista
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 1500);
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      setError(error instanceof Error ? error.message : "Erro ao criar categoria");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName("");
      setDescription("");
      setColor("#3B82F6");
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Nova Categoria de Leitura</h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">
              Nome da Categoria *
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
              placeholder="Ex: Ansiedade, Meditação, Autoestima..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">
              Descrição (opcional)
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
              placeholder="Breve descrição da categoria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900">
              Cor da Categoria
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isCreating}
              />
              <span className="text-sm text-gray-600">Escolha uma cor para identificar a categoria</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              <p className="text-sm font-medium">{success}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1 bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Criando..." : "Criar Categoria"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CreateContent() {
  const router = useRouter();
  const { canAccessCMS, loading: authLoading, error: authError } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(""); // ✅ ADICIONANDO ESTADO PARA CONTENT
  const [category, setCategory] = useState<"Vídeo" | "Podcast" | "Artigo" | "Livro" | "Áudio" | "Shorts" | "Leitura">("Vídeo");
  // Removido readingCategory pois não é mais necessário
  const [contentUrl, setContentUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [readingTags, setReadingTags] = useState<{id: string, name: string, color?: string}[]>([]);
  const [selectedReadingTags, setSelectedReadingTags] = useState<string[]>([]);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);

  // Função para recarregar as categorias de leitura
  const reloadReadingTags = async () => {
    if (category === 'Leitura') {
      try {
        const tags = await getAllReadingTags();
        setReadingTags(tags);
      } catch (error) {
        console.error('Erro ao recarregar categorias:', error);
        setReadingTags([]);
      }
    }
  };

  useEffect(() => {
    if (category === 'Leitura') {
      getAllReadingTags().then(setReadingTags).catch(() => setReadingTags([]));
    }
  }, [category]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleEmotionChange = (emotion: string) => {
    setEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validar dados obrigatórios
      if (!title.trim()) {
        setError("Título é obrigatório");
        return;
      }

      if (!description.trim()) {
        setError("Descrição é obrigatória");
        return;
      }

      // Validar conteúdo textual (exceto para Shorts)
      if (category !== "Shorts" && !content.trim()) {
        setError("Conteúdo textual é obrigatório");
        return;
      }

      // Validar tags
      if (tags.length === 0) {
        setError("É obrigatório adicionar pelo menos uma tag");
        return;
      }

      // Validar tags de emoção
      if (emotions.length === 0) {
        setError("É obrigatório selecionar pelo menos uma tag de emoção");
        return;
      }

      // Validar conteúdo (URL ou arquivo) - obrigatório para todas as categorias
      if (!contentUrl.trim() && !file) {
        setError("Conteúdo é obrigatório. Forneça uma URL ou faça upload de um arquivo");
        return;
      }

      if (contentUrl.trim() && file) {
        setError("Escolha apenas uma opção: URL ou arquivo, não ambos");
        return;
      }

      // Validar que Shorts não pode ter conteúdo textual
      if (category === "Shorts" && content.trim()) {
        setError("Posts da categoria Shorts não podem ter conteúdo textual");
        return;
      }

      // Validar que posts de Leitura devem ter pelo menos uma categoria selecionada
      if (category === "Leitura" && selectedReadingTags.length === 0) {
        setError("É obrigatório selecionar pelo menos uma categoria de leitura");
        return;
      }

      // Preparar dados do post
      const postData: CreatePostData = {
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tags, // ✅ TODAS AS CATEGORIAS AGORA TÊM TAGS
        emotion_tags: emotions,
        // categoria_leitura será preenchida automaticamente pelo trigger quando as tags forem associadas
      };

      // Adicionar conteúdo se fornecido
      if (content.trim()) { // ✅ ADICIONANDO CONTEÚDO AO POST DATA
        postData.content = content.trim();
      }

      // Removido código de reading_category pois não é mais necessário

      // Adicionar URL se fornecida
      if (contentUrl.trim()) {
        postData.content_url = contentUrl.trim();
      }

      // Upload de arquivo se fornecido
      if (file && !contentUrl.trim()) {
        setUploadProgress(0);
        setError(null);
        
        // Simular progresso de upload
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
          const uploadResult = await uploadFileForPost(file);
          
          if (uploadResult.success && uploadResult.data) {
            postData.file_path = uploadResult.data.path;
            postData.file_name = uploadResult.data.file_name;
            postData.file_type = uploadResult.data.file_type;
            postData.file_size = uploadResult.data.file_size;
            setUploadProgress(100);
          } else {
            setError(uploadResult.error || "Erro no upload do arquivo");
            return;
          }
        } catch (uploadError) {
          console.error("Erro no upload:", uploadError);
          setError("Erro inesperado no upload do arquivo");
          return;
        } finally {
          clearInterval(progressInterval);
        }
      }

      // Criar o post
      const result = await createPost(postData);

      if (result.success && result.data?.id && category === 'Leitura' && selectedReadingTags.length > 0) {
        // Associar tags de leitura ao post
        if (category === 'Leitura' && selectedReadingTags.length > 0) {
          for (const tagId of selectedReadingTags) {
            try {
              await associateTagWithPost(result.data.id, tagId);
            } catch (error) {
              console.error('Erro ao associar tag:', error);
            }
          }
        }
        
        // Garantir que a coluna categoria_leitura seja preenchida corretamente
        try {
          await supabase.rpc('sync_categoria_leitura', { post_id_param: result.data.id });
        } catch {
          console.log('Função sync_categoria_leitura não disponível, continuando...');
        }
      }

      if (result.success) {
        setSuccess(result.message || "Post criado com sucesso!");
        
        // Limpar formulário
        setTitle("");
        setDescription("");
        setContent(""); // ✅ LIMPAR ESTADO PARA CONTENT
        // Removido setReadingCategory pois não é mais necessário
        setContentUrl("");
        setCategory("Vídeo");
        setTags([]);
        setEmotions([]);
        setFile(null);
        setTagInput("");
        setSelectedReadingTags([]); // Limpar tags de leitura selecionadas

        // Redirecionar para página de detalhes do post criado após 2 segundos
        if (result.data?.id) {
          const postId = result.data.id;
          setTimeout(() => {
            router.push(`/dashboard/details/${postId}`);
          }, 2000);
        } else {
          // Fallback para página de gestão se não conseguir obter o ID
          setTimeout(() => {
            router.push("/dashboard/management");
          }, 2000);
        }
      } else {
        setError(result.error || "Erro desconhecido ao criar post");
      }
    } catch (error) {
      console.error("Erro inesperado:", error);
      setError("Erro inesperado ao criar post");
    } finally {
      setIsUploading(false);
    }
  };

  // Função para adicionar tag
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Verificar carregamento de autenticação
  if (authLoading) {
    return (
      <CMSLayout currentPage="create">
        <div className="flex flex-col items-center justify-center py-12 px-8 min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando permissões...</p>
          </div>
        </div>
      </CMSLayout>
    );
  }

  // Verificar se o usuário tem permissão para acessar o CMS
  if (!canAccessCMS) {
    return (
      <CMSLayout currentPage="create">
        <div className="flex flex-col items-center justify-center py-12 px-8 min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600 mb-4">
              Você não tem permissão para acessar esta página. <br />
              É necessário ter uma conta CMS autorizada.
            </p>
            {authError && (
              <p className="text-red-600 text-sm">{authError}</p>
            )}
            <button
              onClick={() => router.push('/login')}
              className="bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors"
            >
              Fazer Login
            </button>
          </div>
        </div>
      </CMSLayout>
    );
  }

  return (
    <CMSLayout currentPage="create">
      <div className="flex flex-col items-center py-12 px-8">
        <div className="w-full max-w-xl">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 text-center" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
            Adicionar Novo Conteúdo
          </h1>
          
          {/* Mensagens de feedback */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
              <p className="text-sm font-medium">{success}</p>
              <p className="text-xs mt-1">Redirecionando para gestão de posts...</p>
            </div>
          )}

          {/* Aviso para categoria de leitura sem categorias selecionadas */}
          {category === 'Leitura' && selectedReadingTags.length === 0 && readingTags.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-4">
              <p className="text-sm font-medium">
                ⚠️ Selecione pelo menos uma categoria de leitura para continuar
              </p>
            </div>
          )}


          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Categoria - agora em primeiro lugar */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Categoria</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value as "Vídeo" | "Podcast" | "Artigo" | "Livro" | "Áudio" | "Shorts" | "Leitura")}
              >
                <option value="Vídeo">Vídeo</option>
                <option value="Podcast">Podcast</option>
                <option value="Artigo">Artigo</option>
                <option value="Livro">Livro</option>
                <option value="Áudio">Áudio</option>
                <option value="Shorts">Shorts</option>
                <option value="Leitura">Leitura</option>
              </select>
            </div>

            {/* Removido campo de categoria de leitura pois não é mais necessário */}
            {/* Conteúdo dividido em URL ou Ficheiro */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Conteúdo
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">Insira uma URL ou faça upload de um ficheiro para o seu post. <span className="text-red-500 font-medium">* Obrigatório</span></p>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1 text-gray-900">
                  URL do Conteúdo: {contentUrl.trim() ? contentUrl : "(nenhum url inserido)"}
                </label>
                <div className={`flex items-center border border-gray-300 rounded-md px-3 py-2 ${file ? 'bg-gray-100' : 'bg-gray-50'} ${file ? 'opacity-50' : ''}`}>
                  <span className="text-gray-400 mr-2">🌐</span>
                  <input
                    type="url"
                    className="flex-1 bg-transparent outline-none text-gray-900 disabled:cursor-not-allowed"
                    placeholder={file ? "Remova o ficheiro para inserir URL" : "www.exemplo.com/conteudo"}
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    disabled={!!file}
                  />
                  {file && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="ml-2 text-red-500 hover:text-red-700 text-xs font-medium"
                      title="Remover ficheiro para permitir URL"
                    >
                      Remover ficheiro
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center my-2">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="mx-4 text-gray-400 text-xs font-medium">Ou</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-900">
                  Ficheiro: {file ? file.name : "(nenhum ficheiro selecionado)"}
                </label>
                <div className={`border-2 border-gray-300 border-dashed rounded-lg flex flex-col items-center justify-center py-6 transition-colors relative ${contentUrl.trim() ? 'bg-gray-400 opacity-50 cursor-not-allowed' : 'bg-black cursor-pointer hover:border-gray-400'}`}>
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    disabled={isUploading || !!contentUrl.trim()}
                  />
                  <CloudUpload className={`w-8 h-8 mb-2 ${contentUrl.trim() ? 'text-gray-600' : 'text-white'}`} />
                  <span className={contentUrl.trim() ? 'text-gray-600' : 'text-white'}>
                    {contentUrl.trim() ? "Remova a URL para fazer upload" : 
                     isUploading ? "A fazer upload..." : "Escolher um ficheiro"}
                  </span>
                  {contentUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => setContentUrl("")}
                      className="mt-2 text-red-400 hover:text-red-300 text-xs font-medium"
                      title="Remover URL para permitir upload"
                    >
                      Remover URL
                    </button>
                  )}
                  {file && !contentUrl.trim() && (
                    <div className="mt-2 text-center">
                      <span className="text-xs text-gray-200 block">{file.name}</span>
                      <span className="text-xs text-gray-400 block">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                  
                  {/* Barra de progresso */}
                  {isUploading && uploadProgress > 0 && !contentUrl.trim() && (
                    <div className="w-full max-w-xs mt-3">
                      <div className="bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-300 mt-1 block">
                        {uploadProgress}% completo
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Título */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Título
                <span className="text-red-500 ml-1">*</span>
              </label>
                              <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                  placeholder="Escreva aqui um título"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
            </div>
            {/* Descrição com Editor Markdown */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Descrição
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Digite a descrição do seu post
              </p>

              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Escreva aqui uma descrição..."
                showToolbar={false}
              />
            </div>

            {/* Conteúdo Textual (não disponível para Shorts) */}
            {category !== "Shorts" && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Conteúdo Textual
                  <span className="text-red-500 ml-1">*</span>
                  <span className="text-xs text-gray-500 ml-2">(não disponível para Shorts)</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Este campo é para o conteúdo textual completo do post. Use markdown para formatação.
                </p>

                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Escreva aqui o conteúdo completo do post usando markdown..."
                />
                
                {/* Prévia do Conteúdo */}
                {content.trim() && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                    <div className="text-xs text-gray-500 font-bold mb-2">Prévia do conteúdo:</div>
                    <div className="bg-white p-3 rounded border">
                      <MarkdownRenderer content={content} />
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Categorias de Leitura (apenas para categoria Leitura) */}
            {category === 'Leitura' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">
                  Categorias de Leitura
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {readingTags.length === 0 ? (
                    <div className="w-full text-center py-4 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 mb-2">Nenhuma categoria cadastrada</p>
                      <p className="text-xs text-gray-400 mb-3">Crie uma nova categoria para organizar seus posts de leitura</p>
                      <button
                        type="button"
                        onClick={() => setShowCreateTagModal(true)}
                        className="flex items-center gap-2 mx-auto text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Criar Primeira Categoria
                      </button>
                    </div>
                  ) : (
                    readingTags.map(tag => (
                      <label key={tag.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-200 transition-all duration-200" style={{ 
                        background: selectedReadingTags.includes(tag.id) ? (tag.color || '#3B82F6') : '#f3f4f6', 
                        color: selectedReadingTags.includes(tag.id) ? '#fff' : '#222', 
                        borderRadius: '9999px', 
                        padding: '0.25rem 0.75rem' 
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedReadingTags.includes(tag.id)}
                          onChange={() => setSelectedReadingTags(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                          className="accent-black cursor-pointer"
                        />
                        {tag.name}
                      </label>
                    ))
                  )}
                </div>
                {readingTags.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500 mt-1">
                      Selecione pelo menos uma categoria que melhor represente o post de leitura.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateTagModal(true)}
                      className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Nova Categoria
                    </button>
                  </>
                )}
              </div>
            )}
            {/* Campo de tags para todas as categorias */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Tags
                <span className="text-red-500 ml-1">*</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                {category === 'Leitura' 
                  ? 'Tags gerais para o post (além das categorias de leitura específicas)' 
                  : 'Adicione tags que descrevam o conteúdo'
                }
              </p>

              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                placeholder="Adicione tags e pressione Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              {/* Exibir tags abaixo do input */}
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.length === 0 ? (
                  <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full flex items-center text-sm font-medium opacity-80 select-none pointer-events-none">
                    Exemplo
                  </span>
                ) : (
                  tags.map((tag) => (
                    <span key={tag} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full flex items-center text-sm font-medium">
                      {tag}
                      <button type="button" className="ml-2 text-gray-500 hover:text-red-500" onClick={() => removeTag(tag)}>
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>


            {/* Emotion Tags */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">
                Tags de Emoção
                <span className="text-red-500 ml-1">*</span>

                <p className="text-xs text-gray-500 mt-2 mb-4">
                Selecione as emoções que o conteúdo desperta
              </p>

              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {emotionTags.map((emotion) => (
                  <label key={emotion} className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                    <input
                      type="checkbox"
                      checked={emotions.includes(emotion)}
                      onChange={() => handleEmotionChange(emotion)}
                      className="accent-black cursor-pointer"
                    />
                    {emotion}
                  </label>
                ))}
              </div>
            </div>
            {/* Upload Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-black text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={
                  isUploading || 
                  success !== null || 
                  !title.trim() ||
                  !description.trim() ||
                  (!contentUrl.trim() && !file) ||
                  (category !== "Shorts" && !content.trim()) ||
                  tags.length === 0 ||
                  emotions.length === 0 ||
                  (category === "Leitura" && selectedReadingTags.length === 0)
                }
                              >
                  {isUploading 
                    ? uploadProgress > 0 
                      ? `A fazer upload... ${uploadProgress}%` 
                      : "A enviar..." 
                    : success 
                      ? "Enviado!" 
                      : !title.trim()
                        ? "Adicione um título"
                        : !description.trim()
                          ? "Adicione uma descrição"
                          : (!contentUrl.trim() && !file)
                            ? "Adicione URL ou arquivo"
                            : category !== "Shorts" && !content.trim()
                              ? "Adicione conteúdo textual"
                              : tags.length === 0
                                ? "Adicione pelo menos uma tag"
                                : emotions.length === 0
                                  ? "Selecione uma tag de emoção"
                                  : category === "Leitura" && selectedReadingTags.length === 0
                                    ? "Selecione uma categoria de leitura"
                                    : "Enviar Conteúdo"
                  }
                </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal para criar nova categoria de leitura */}
      <CreateReadingTagModal
        isOpen={showCreateTagModal}
        onClose={() => setShowCreateTagModal(false)}
        onSuccess={reloadReadingTags}
      />
    </CMSLayout>
  );
} 