"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/CMSLayout";
import { useAuth } from "@/context/AuthContext";
import { getAllContacts, deleteContact } from "@/services/contacts";
import { Contact } from "@/types/contacts";
import { EMOTIONS } from '@/lib/emotions';
import { DeleteConfirmationModal, NotificationModal } from "@/components/modals";
import { Plus, Search, Edit, Trash2, ExternalLink } from "lucide-react";

export default function ContactsPage() {
  const router = useRouter();
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; contactId: string | null; contactTitle: string; isLoading: boolean }>({ isOpen:false, contactId:null, contactTitle:'', isLoading:false });
  const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success'|'error'|'info'; title: string; message: string }>({ isOpen:false, type:'info', title:'', message:'' });

  useEffect(() => {
    if (!authLoading && canAccessCMS) loadContacts();
  }, [authLoading, canAccessCMS]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllContacts();
      if (response.success && response.data) setContacts(response.data as Contact[]);
      else setError(response.error || 'Erro ao carregar contactos');
    } catch (err) {
      console.error(err);
      setError('Erro inesperado ao carregar contactos');
    } finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      // Emotion filter: if an emotion is selected, contact must include it
      if (selectedEmotion) {
        if (!c.emotions || !c.emotions.includes(selectedEmotion)) return false;
      }

      if (!search) return true;
      const s = search.toLowerCase();
      return c.title.toLowerCase().includes(s) || (c.location || '').toLowerCase().includes(s) || (c.when_to_use || '').toLowerCase().includes(s);
    });
  }, [contacts, search, selectedEmotion]);

  const openDelete = (id: string, title: string) => setDeleteModal({ isOpen:true, contactId:id, contactTitle:title, isLoading:false });
  const closeDelete = () => setDeleteModal(prev => ({ ...prev, isOpen:false }));

  const confirmDelete = async () => {
    if (!deleteModal.contactId) return;
    setDeleteModal(prev => ({ ...prev, isLoading:true }));
    const response = await deleteContact(deleteModal.contactId);
    if (response.success) {
      setContacts(prev => prev.filter(p => p.id !== deleteModal.contactId));
      setNotification({ isOpen:true, type:'success', title:'Sucesso', message:'Contacto removido' });
      closeDelete();
    } else {
      setNotification({ isOpen:true, type:'error', title:'Erro', message: response.error || 'Erro ao remover' });
      setDeleteModal(prev => ({ ...prev, isLoading:false }));
    }
  };

  if (authLoading) return (
    <CMSLayout currentPage="contacts"><div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" /></div></CMSLayout>
  );

  if (!isAuthenticated || !canAccessCMS) { router.push('/login'); return null; }

  return (
    <CMSLayout currentPage="contacts">
      <div className="flex flex-col items-center justify-center py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl flex flex-col items-center">
          {/* Header */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 text-gray-900 text-center" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
            Gerir Contactos
          </h1>
          <div className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 font-medium text-center">
            Adicione e gerencie contactos úteis para a Comfy
          </div>

          {/* Search and Actions */}
          <div className="w-full mb-4 sm:mb-6 space-y-3 sm:space-y-4">
            <div className="flex items-center w-full justify-center gap-2">
              <div className="flex items-center flex-1 max-w-2xl sm:max-w-3xl">
                <span className="pl-3 pr-2 text-gray-600">
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-l-lg px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium text-sm sm:text-base"
                  placeholder="Pesquise por título ou localização..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ fontFamily: 'Inter, Quicksand, sans-serif' }}
                />
              </div>
            </div>

            {/* Emotion filter pills */}
            <div className="w-full flex justify-center">
              <div className="max-w-3xl w-full flex items-center gap-2 flex-wrap">
                {EMOTIONS.map((emo) => {
                  const isActive = selectedEmotion === emo;
                  return (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setSelectedEmotion(prev => prev === emo ? null : emo)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${isActive ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {emo}
                    </button>
                  );
                })}

                {selectedEmotion && (
                  <button
                    type="button"
                    onClick={() => setSelectedEmotion(null)}
                    className="ml-auto px-2 py-1 text-xs text-red-600 hover:text-red-800"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={() => router.push('/dashboard/contacts/create')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Contacto</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </div>
          </div>

          {/* Results counter */}
          {!loading && !error && (
            <div className="w-full max-w-4xl mb-4">
              <div className="flex justify-between items-center text-sm text-gray-700">
                <span className="font-medium">
                  {filtered.length} de {contacts.length} contactos encontrados
                </span>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
              <span className="text-gray-700 font-medium">Carregando contactos...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 w-full max-w-4xl">
              <div className="flex">
                <div className="text-red-800">
                  <p className="font-medium">Erro ao carregar contactos</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={loadContacts}
                  className="ml-auto bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">
                    {contacts.length === 0 
                      ? 'Ainda não há contactos criados.'
                      : 'Nenhum contacto encontrado com os critérios de busca.'
                    }
                  </p>
                  {contacts.length === 0 && (
                    <button
                      onClick={() => router.push('/dashboard/contacts/create')}
                      className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Criar primeiro contacto
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full space-y-4">
                  {filtered.map((contact) => (
                    <div key={contact.id} className="bg-white rounded-lg shadow border p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{contact.title}</h3>
                          </div>
                          <div className="space-y-1 mb-3">
                            {contact.location && (
                              <p className="text-gray-600 text-sm">
                                📍 {contact.location}{contact.address ? ` - ${contact.address}` : ''}
                              </p>
                            )}
                            {contact.phone && (
                              <p className="text-gray-600 text-sm">📞 {contact.phone}</p>
                            )}
                            {contact.when_to_use && (
                              <p className="text-gray-600 text-sm line-clamp-2">{contact.when_to_use}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Criado em: {new Date(contact.created_at || '').toLocaleDateString('pt-PT')}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {contact.site && (
                            <a
                              href={contact.site}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 p-2"
                              title="Abrir site"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => router.push(`/dashboard/contacts/edit/${contact.id}`)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1 p-2"
                            title="Editar contacto"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDelete(contact.id, contact.title)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1 p-2"
                            title="Remover contacto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          title={`Remover contacto`}
          message={`Tem certeza que deseja remover "${deleteModal.contactTitle}"?`}
          onClose={closeDelete}
          onConfirm={confirmDelete}
          isLoading={deleteModal.isLoading}
        />

        <NotificationModal 
          isOpen={notification.isOpen} 
          type={notification.type} 
          title={notification.title} 
          message={notification.message} 
          onClose={() => setNotification(prev=>({...prev,isOpen:false}))} 
        />
    </CMSLayout>
  );
}
