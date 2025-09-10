"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, Plus, X, Trash2 } from "lucide-react";
import { getAllTags, createTag, deleteTag, checkTagUsage, ReferenceTag } from "@/services/references";

interface TagSelectorProps {
  selectedTagId: string;
  onTagSelect: (tagId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function TagSelector({ 
  selectedTagId, 
  onTagSelect, 
  disabled = false,
  placeholder = "Selecione uma tag..." 
}: TagSelectorProps) {
  const [tags, setTags] = useState<ReferenceTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [creatingTag, setCreatingTag] = useState(false);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [tagUsageInfo, setTagUsageInfo] = useState<{[key: string]: { hasReferences: boolean; count: number }}>({});

  // Cores pré-definidas para facilitar a seleção
  const predefinedColors = [
    "#3B82F6", // Azul
    "#10B981", // Verde
    "#F59E0B", // Amarelo/Laranja
    "#8B5CF6", // Roxo
    "#EF4444", // Vermelho
    "#06B6D4", // Ciano
    "#84CC16", // Verde lima
    "#F97316", // Laranja
    "#EC4899", // Rosa
    "#6B7280", // Cinza
  ];

  // Carregar tags
  useEffect(() => {
    loadTags();
  }, []);

  const checkTagsUsage = useCallback(async () => {
    const usageInfo: {[key: string]: { hasReferences: boolean; count: number }} = {};
    
    for (const tag of tags) {
      try {
        const usage = await checkTagUsage(tag.id);
        usageInfo[tag.id] = usage;
      } catch (error) {
        console.error(`Erro ao verificar uso da tag ${tag.name}:`, error);
        usageInfo[tag.id] = { hasReferences: false, count: 0 };
      }
    }
    
    setTagUsageInfo(usageInfo);
  }, [tags]);

  // Verificar uso das tags
  useEffect(() => {
    if (tags.length > 0) {
      checkTagsUsage();
    }
  }, [checkTagsUsage, tags.length]);

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Tem certeza que deseja remover a tag "${tagName}"?`)) {
      return;
    }

    setDeletingTag(tagId);

    try {
      const response = await deleteTag(tagId);
      
      if (response.success) {
        // Remover tag da lista local
        setTags(prev => prev.filter(tag => tag.id !== tagId));
        // Limpar tag selecionada se for a que foi removida
        if (selectedTagId === tagId) {
          onTagSelect("");
        }
        // Atualizar informações de uso
        setTagUsageInfo(prev => {
          const newInfo = { ...prev };
          delete newInfo[tagId];
          return newInfo;
        });
      } else {
        alert(response.error || 'Erro ao remover tag');
      }
    } catch (error) {
      console.error('Erro ao remover tag:', error);
      alert('Erro inesperado ao remover tag');
    } finally {
      setDeletingTag(null);
    }
  };

  const loadTags = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAllTags();
      
      if (response.success && response.data) {
        setTags(response.data as ReferenceTag[]);
      } else {
        setError(response.error || 'Erro ao carregar tags');
      }
    } catch (err) {
      setError('Erro inesperado ao carregar tags');
      console.error('Erro ao carregar tags:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar nova tag (sem usar <form> interno)
  const handleCreateTagClick = async () => {
    if (!newTagName.trim()) {
      console.warn('TagSelector: Nome da tag está vazio');
      return;
    }

    console.log('🏷️ TagSelector: Iniciando criação de tag', {
      name: newTagName.trim(),
      color: newTagColor
    });

    setCreatingTag(true);
    setError(null); // Limpar erros anteriores

    try {
      const tagData = {
        name: newTagName.trim(),
        color: newTagColor
      };

      console.log('📤 TagSelector: Enviando dados para createTag:', tagData);

      const response = await createTag(tagData);

      console.log('📥 TagSelector: Resposta recebida:', response);

      if (response.success && response.data) {
        console.log('✅ TagSelector: Tag criada com sucesso:', response.data);
        
        // Adicionar nova tag à lista
        setTags(prev => {
          const newTags = [...prev, response.data as ReferenceTag];
          console.log('📋 TagSelector: Lista de tags atualizada:', newTags);
          return newTags;
        });
        
        // Selecionar a nova tag
        const newTagId = (response.data as ReferenceTag).id;
        console.log('🎯 TagSelector: Selecionando nova tag:', newTagId);
        onTagSelect(newTagId);
        
        // Limpar formulário
        setNewTagName("");
        setNewTagColor("#3B82F6");
        setShowCreateForm(false);
        setIsOpen(false);
        
        console.log('🧹 TagSelector: Formulário limpo e fechado');
      } else {
        console.error('❌ TagSelector: Falha na criação da tag:', response.error);
        setError(response.error || 'Erro ao criar tag');
        
        // Exibir alerta para debug
        alert(`Erro ao criar tag: ${response.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('💥 TagSelector: Erro inesperado ao criar tag:', err);
      setError('Erro inesperado ao criar tag');
      
      // Exibir alerta para debug
      alert(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setCreatingTag(false);
      console.log('🏁 TagSelector: Processo de criação finalizado');
    }
  };

  // Obter tag selecionada
  const selectedTag = tags.find(tag => tag.id === selectedTagId);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.tag-selector')) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="tag-selector relative">
      {/* Campo de seleção */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-black transition-colors ${
          disabled 
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
            : 'bg-white text-gray-900 hover:border-gray-400 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3">
          {selectedTag ? (
            <>
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedTag.color }}
              />
              <span className="font-semibold text-gray-900">{selectedTag.name}</span>
            </>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Carregando tags...
            </div>
          ) : error ? (
            <div className="px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : (
            <>
              {/* Lista de tags */}
              {tags.length > 0 && (
                <div className="py-1">
                                    {tags.map((tag) => {
                    const usage = tagUsageInfo[tag.id];
                    const canDelete = usage && !usage.hasReferences;
                    
                    return (
                      <div
                        key={tag.id}
                        className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-100 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onTagSelect(tag.id);
                            setIsOpen(false);
                          }}
                          className="flex-1 flex items-center gap-3 text-left"
                        >
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm font-semibold text-gray-900">{tag.name}</span>
                        </button>
                        
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTag(tag.id, tag.name);
                            }}
                            disabled={deletingTag === tag.id}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Remover tag"
                          >
                            {deletingTag === tag.id ? (
                              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        
                        {usage && usage.hasReferences && (
                          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded" title={`Usada em ${usage.count} referência(s)`}>
                            {usage.count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Separador */}
              {tags.length > 0 && (
                <div className="border-t border-gray-200 my-1" />
              )}

              {/* Botão para criar nova tag */}
              {!showCreateForm ? (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left text-blue-600 hover:bg-blue-50 transition-colors border-t border-gray-200 bg-blue-50/30"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-semibold">➕ Criar nova tag</span>
                </button>
              ) : (
                <div className="p-3 border-t border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nome da Tag
                      </label>
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!creatingTag && newTagName.trim()) {
                              handleCreateTagClick();
                            }
                          }
                        }}
                        placeholder="Digite o nome da tag..."
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        disabled={creatingTag}
                        autoFocus
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cor
                      </label>
                      <div className="space-y-2">
                        {/* Cores pré-definidas */}
                        <div className="flex flex-wrap gap-1">
                          {predefinedColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewTagColor(color)}
                              className={`w-6 h-6 rounded-full border-2 transition-all ${
                                newTagColor === color 
                                  ? 'border-gray-800 scale-110' 
                                  : 'border-gray-300 hover:border-gray-500'
                              }`}
                              style={{ backgroundColor: color }}
                              disabled={creatingTag}
                              title={`Selecionar cor ${color}`}
                            />
                          ))}
                        </div>
                        
                        {/* Seletor de cor personalizada */}
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newTagColor}
                            onChange={(e) => setNewTagColor(e.target.value)}
                            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            disabled={creatingTag}
                          />
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500">
                              Ou escolha uma cor personalizada
                            </span>
                            <span className="text-xs text-gray-400">
                              Cor selecionada: {newTagColor}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateTagClick}
                        disabled={creatingTag || !newTagName.trim()}
                        className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingTag ? 'Criando...' : 'Criar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewTagName("");
                          setNewTagColor("#3B82F6");
                        }}
                        disabled={creatingTag}
                        className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
