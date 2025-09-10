"use client";

import React, { useState } from "react";
import { toast } from 'react-hot-toast';
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import { useAuth } from "@/context/AuthContext";
import { createReference } from "@/services/references";
import TagSelector from "@/components/TagSelector";
import { ArrowLeft, Save, Link } from "lucide-react";

export default function CreateReferencePage() {
  const router = useRouter();
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  const [tagId, setTagId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // notifications via HotToaster

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  setLoading(true);
  setError(null);

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

      const response = await createReference({
        tag_id: tagId,
        title: title.trim(),
        description: description.trim(),
        url: url.trim()
      });

      if (response.success) {
        toast.success('Referência criada com sucesso!');
        // Limpar formulário
        setTagId("");
        setTitle("");
        setDescription("");
        setUrl("");

        // Redirecionar após 2 segundos
        setTimeout(() => {
          router.push("/dashboard/references");
        }, 2000);
      } else {
        setError(response.error || "Erro ao criar referência");
        toast.error(response.error || "Erro ao criar referência");
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      setError("Erro inesperado ao criar referência");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const hasChanges = tagId || title.trim() || description.trim() || url.trim();
    
    if (hasChanges) {
      const confirmLeave = window.confirm(
        "Tem alterações não guardadas. Tem certeza que deseja sair sem guardar?"
      );
      if (!confirmLeave) return;
    }
    
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
              Nova Referência
            </h1>
          </div>
          
          {/* Mensagens de feedback */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          
          {/* success handled via global toasts (HotToaster) */}

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
                  disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={
                  loading || 
                  !tagId || 
                  !title.trim() || 
                  !description.trim() || 
                  !url.trim()
                }
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Criar Referência
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </CMSLayout>
  );
}
