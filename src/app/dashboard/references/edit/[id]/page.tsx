"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import { useAuth } from "@/context/AuthContext";
import { getReferenceById, updateReference } from "@/services/references";
import TagSelector from "@/components/TagSelector";
import { ArrowLeft, Save, Link, ExternalLink } from "lucide-react";

export default function EditReferencePage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  const [tagId, setTagId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const referenceId = params.id as string;

  const loadReference = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getReferenceById(referenceId);
      
      if (response.success && response.data && !Array.isArray(response.data)) {
        const reference = response.data;
        setTagId(reference.tag_id);
        setTitle(reference.title);
        setDescription(reference.description);
        setUrl(reference.url);
      } else {
        setError(response.error || 'Referência não encontrada');
      }
    } catch (err) {
      setError('Erro inesperado ao carregar referência');
      console.error('Erro ao carregar referência:', err);
    } finally {
      setLoading(false);
    }
  }, [referenceId]);

  // Carregar referência ao montar componente
  useEffect(() => {
    if (!authLoading && canAccessCMS && referenceId) {
      loadReference();
    }
  }, [authLoading, canAccessCMS, referenceId, loadReference]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validações
      if (!tagId) {
        setError("Tag é obrigatória");
        return;
      }

      if (!title.trim()) {
        setError("Título é obrigatório");
        return;
      }

      if (!description.trim()) {
        setError("Descrição é obrigatória");
        return;
      }

      if (!url.trim()) {
        setError("URL é obrigatória");
        return;
      }

      // Validar URL
      try {
        new URL(url);
      } catch {
        setError("URL inválida. Deve ser uma URL completa (ex: https://exemplo.com)");
        return;
      }

      const response = await updateReference(referenceId, {
        tag_id: tagId,
        title: title.trim(),
        description: description.trim(),
        url: url.trim()
      });

      if (response.success) {
        setSuccess("Referência atualizada com sucesso!");
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
          router.push("/dashboard/references");
        }, 2000);
      } else {
        setError(response.error || "Erro ao atualizar referência");
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      setError("Erro inesperado ao atualizar referência");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/references");
  };

  // Verificações de segurança
  if (authLoading) {
    return (
      <CMSLayout currentPage="references">
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando autenticação...</p>
          </div>
        </div>
      </CMSLayout>
    );
  }

  if (!isAuthenticated || !canAccessCMS) {
    router.push('/login');
    return null;
  }

  return (
    <CMSLayout currentPage="references">
      <div className="flex flex-col items-center py-12 px-8">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={handleCancel}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium shadow cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
              Editar Referência
            </h1>
          </div>
          
          {/* Estados de carregamento e erro */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
              <span className="text-gray-700 font-medium">Carregando referência...</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex">
                <div className="text-red-800">
                  <p className="font-medium">Erro ao carregar referência</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={loadReference}
                  className="ml-auto bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
              <p className="text-sm font-medium">{success}</p>
              <p className="text-xs mt-1">Redirecionando para lista de referências...</p>
            </div>
          )}

          {/* Formulário */}
          {!loading && !error && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tag */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Tag
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Selecione uma tag existente ou crie uma nova para categorizar a referência
                </p>
                <div className="space-y-2">
                  <TagSelector
                    selectedTagId={tagId}
                    onTagSelect={setTagId}
                    disabled={saving}
                    placeholder="Selecione uma tag..."
                  />
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                  </div>
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Título
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Título descritivo da referência
                </p>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                  placeholder="Ex: Guia Completo sobre Ansiedade"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  Descrição
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Breve descrição do conteúdo da referência
                </p>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium resize-none"
                  placeholder="Descreva brevemente o que esta referência contém..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                  disabled={saving}
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">
                  URL
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Link completo para a referência (deve começar com http:// ou https://)
                </p>
                <div className="flex items-center border border-gray-300 rounded-md px-3 py-2">
                  <Link className="w-4 h-4 text-gray-400 mr-2" />
                  <input
                    type="url"
                    className="flex-1 bg-transparent outline-none text-gray-900 font-medium"
                    placeholder="https://exemplo.com/referencia"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>
                {url && (
                  <div className="mt-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Testar link
                    </a>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex justify-between pt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-300 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={
                    saving || 
                    !tagId || 
                    !title.trim() || 
                    !description.trim() || 
                    !url.trim()
                  }
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </CMSLayout>
  );
}
