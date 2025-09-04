"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import { useAuth } from "@/context/AuthContext";
import { getAllReferences, deleteReference } from "@/services/references";
import { Reference } from "@/types/references";
import { DeleteConfirmationModal, NotificationModal } from "@/components/modals";
import { Plus, Search, Edit, Trash2, ExternalLink, Filter } from "lucide-react";

export default function ReferencesPage() {
  const router = useRouter();
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados dos modais
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    referenceId: string | null;
    referenceTitle: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    referenceId: null,
    referenceTitle: "",
    isLoading: false
  });

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });

  // Buscar referências ao carregar o componente
  useEffect(() => {
    if (!authLoading && canAccessCMS) {
      loadReferences();
    }
  }, [authLoading, canAccessCMS]);

  const loadReferences = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAllReferences();
      
      if (response.success && response.data) {
        setReferences(response.data as Reference[]);
      } else {
        setError(response.error || 'Erro ao carregar referências');
      }
    } catch (err) {
      setError('Erro inesperado ao carregar referências');
      console.error('Erro ao carregar referências:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar referências
  const filteredReferences = useMemo(() => {
    return references.filter((reference) => {
      const matchesSearch = search === "" || 
        reference.title.toLowerCase().includes(search.toLowerCase()) ||
        reference.subject.toLowerCase().includes(search.toLowerCase()) ||
        reference.description.toLowerCase().includes(search.toLowerCase());

      const matchesSubject = filterSubject === "" || 
        reference.subject.toLowerCase().includes(filterSubject.toLowerCase());

      return matchesSearch && matchesSubject;
    });
  }, [references, search, filterSubject]);

  // Obter assuntos únicos para filtro
  const uniqueSubjects = useMemo(() => {
    const subjects = references.map(ref => ref.subject);
    return [...new Set(subjects)].sort();
  }, [references]);

  // Função para mostrar notificação
  const showNotification = (type: "success" | "error" | "info", title: string, message: string) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    });
  };

  // Função para fechar notificação
  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  // Função para abrir modal de exclusão
  const openDeleteModal = (referenceId: string, referenceTitle: string) => {
    setDeleteModal({
      isOpen: true,
      referenceId,
      referenceTitle,
      isLoading: false
    });
  };

  // Função para fechar modal de exclusão
  const closeDeleteModal = () => {
    setDeleteModal(prev => ({ ...prev, isOpen: false }));
  };

  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!deleteModal.referenceId) return;

    setDeleteModal(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await deleteReference(deleteModal.referenceId);
      
      if (response.success) {
        // Remover do estado local
        setReferences(prev => prev.filter(ref => ref.id !== deleteModal.referenceId));
        closeDeleteModal();
        showNotification("success", "Sucesso!", "Referência removida com sucesso!");
      } else {
        showNotification("error", "Erro", response.error || 'Erro ao remover referência');
      }
    } catch (err) {
      console.error('Erro ao remover referência:', err);
      showNotification("error", "Erro", 'Erro inesperado ao remover referência');
    } finally {
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setSearch("");
    setFilterSubject("");
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = () => {
    return search !== "" || filterSubject !== "";
  };

  // Formatação de data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    <>
      <CMSLayout currentPage="references">
        <div className="flex flex-col items-center justify-center py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-6xl flex flex-col items-center">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 text-gray-900 text-center" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
              Gerir Referências
            </h1>
            <div className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 font-medium text-center">
              Adicione e gerencie referências úteis para a Comfy
            </div>
            
            {/* Barra de busca e filtros */}
            <div className="w-full mb-4 sm:mb-6 space-y-3 sm:space-y-4">
              {/* Barra de busca principal */}
              <div className="flex items-center w-full justify-center">
                <span className="pl-3 pr-2 text-gray-600">
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  className="w-full max-w-2xl sm:max-w-3xl border border-gray-300 rounded-lg px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium text-sm sm:text-base"
                  placeholder="Pesquise por título, assunto ou descrição..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ fontFamily: 'Inter, Quicksand, sans-serif' }}
                />
              </div>

              {/* Botões de controle */}
              <div className="flex justify-center gap-2 flex-wrap">
                <button
                  onClick={() => router.push('/dashboard/references/create')}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nova Referência</span>
                  <span className="sm:hidden">Nova</span>
                </button>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">{showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
                  <span className="sm:hidden">{showFilters ? 'Ocultar' : 'Filtros'}</span>
                </button>
                
                {hasActiveFilters() && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>

              {/* Painel de filtros */}
              {showFilters && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {/* Filtro por assunto */}
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                        Assunto
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                        value={filterSubject}
                        onChange={e => setFilterSubject(e.target.value)}
                      >
                        <option value="">Todos os assuntos</option>
                        {uniqueSubjects.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contador de resultados */}
            {!loading && !error && (
              <div className="w-full max-w-4xl mb-4">
                <div className="flex justify-between items-center text-sm text-gray-700">
                  <span className="font-medium">
                    {filteredReferences.length} de {references.length} referências encontradas
                  </span>
                  {hasActiveFilters() && (
                    <span className="text-blue-600 font-semibold">
                      Filtros ativos
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Estados de carregamento e erro */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
                <span className="text-gray-700 font-medium">Carregando referências...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 w-full max-w-4xl">
                <div className="flex">
                  <div className="text-red-800">
                    <p className="font-medium">Erro ao carregar referências</p>
                    <p className="text-sm">{error}</p>
                  </div>
                  <button
                    onClick={loadReferences}
                    className="ml-auto bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            )}

            {/* Lista de referências */}
            {!loading && !error && (
              <>
                {filteredReferences.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 mb-4">
                      {references.length === 0 
                        ? 'Ainda não há referências criadas.'
                        : hasActiveFilters()
                        ? 'Nenhuma referência encontrada com os filtros aplicados.'
                        : 'Nenhuma referência encontrada com os critérios de busca.'
                      }
                    </p>
                    {references.length === 0 && (
                      <button
                        onClick={() => router.push('/dashboard/references/create')}
                        className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Criar primeira referência
                      </button>
                    )}
                    {hasActiveFilters() && references.length > 0 && (
                      <button
                        onClick={clearFilters}
                        className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-200 flex items-center gap-2"
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    {filteredReferences.map((reference) => (
                      <div key={reference.id} className="bg-white rounded-lg shadow border p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{reference.title}</h3>
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                {reference.subject}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{reference.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Criado em: {formatDate(reference.created_at)}</span>
                              {reference.updated_at !== reference.created_at && (
                                <span>Atualizado em: {formatDate(reference.updated_at)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <a
                              href={reference.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                              title="Abrir link"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span className="hidden sm:inline">Abrir</span>
                            </a>
                            <button
                              onClick={() => router.push(`/dashboard/references/edit/${reference.id}`)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                              title="Editar referência"
                            >
                              <Edit className="w-4 h-4" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                            <button
                              onClick={() => openDeleteModal(reference.id, reference.title)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                              title="Remover referência"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline">Remover</span>
                            </button>
                          </div>
                        </div>
                        <div className="border-t pt-3">
                          <a
                            href={reference.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm break-all"
                          >
                            {reference.url}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CMSLayout>

      {/* Modais */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja remover a referência "${deleteModal.referenceTitle}"? Esta ação não pode ser desfeita.`}
        isLoading={deleteModal.isLoading}
      />
      
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </>
  );
}
