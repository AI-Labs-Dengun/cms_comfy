"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, X, Tag } from "lucide-react";
import { ReferenceTag } from "@/services/references";

interface TagFilterSelectorProps {
  selectedTagIds: string[];
  onTagSelect: (tagIds: string[]) => void;
  disabled?: boolean;
  availableTags?: ReferenceTag[]; // Tags que têm referências
}

export default function TagFilterSelector({ 
  selectedTagIds, 
  onTagSelect, 
  disabled = false,
  availableTags = []
}: TagFilterSelectorProps) {
  const [tags, setTags] = useState<ReferenceTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Usar tags disponíveis se fornecidas, senão não carregar nada
  useEffect(() => {
    if (availableTags.length > 0) {
      setTags(availableTags);
      setLoading(false);
    } else {
      setTags([]);
      setLoading(false);
    }
  }, [availableTags]);



  // Obter tags selecionadas
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  // Alternar seleção de tag
  const toggleTag = (tagId: string) => {
    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    
    onTagSelect(newSelectedIds);
  };

  // Remover tag específica
  const removeTag = (tagId: string) => {
    const newSelectedIds = selectedTagIds.filter(id => id !== tagId);
    onTagSelect(newSelectedIds);
  };

  // Limpar todas as tags
  const clearAllTags = () => {
    onTagSelect([]);
  };

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.tag-filter-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="tag-filter-selector relative">
      {/* Botão do seletor */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-2 py-1 rounded-md border transition-colors ${
          disabled 
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' 
            : selectedTagIds.length > 0
            ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Tag className="w-4 h-4" />
        <span className="text-xs font-medium">
          {selectedTagIds.length > 0 ? `${selectedTagIds.length} tag(s)` : `Filtrar por tag (${tags.length})`}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Tags selecionadas */}
      {selectedTags.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-2 min-w-48 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Tags selecionadas:</span>
            <button
              type="button"
              onClick={clearAllTags}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Limpar todas
            </button>
          </div>
          <div className="space-y-1">
            {selectedTags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2 p-1 bg-gray-50 rounded">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-xs text-gray-900 flex-1">{tag.name}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown de seleção */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto min-w-48 z-50">
          {loading ? (
            <div className="px-3 py-2 text-xs text-gray-500">
              Carregando tags...
            </div>
          ) : (
            <div className="py-1">
              {tags.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  Nenhuma tag com referências encontrada
                </div>
              ) : (
                tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 transition-colors ${
                      selectedTagIds.includes(tag.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-xs font-medium text-gray-900">{tag.name}</span>
                    {selectedTagIds.includes(tag.id) && (
                      <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
