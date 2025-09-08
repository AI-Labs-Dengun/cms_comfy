"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CMSLayout from '@/components/CMSLayout';
import { useAuth } from '@/context/AuthContext';
import { getContactById, updateContact } from '@/services/contacts';
import { Save, ArrowLeft, ExternalLink } from 'lucide-react';

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [whenToUse, setWhenToUse] = useState('');
  const [site, setSite] = useState('');
  const [email, setEmail] = useState('');
  const [recommendedAge, setRecommendedAge] = useState('');

  const toggleRecommendedAge = (age: string) => {
    setRecommendedAge(prev => prev === age ? '' : age);
  }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getContactById(id);
  if (res.success && res.data && !Array.isArray(res.data)) {
  const c = res.data;
  setTitle(c.title || '');
  setWhenToUse(c.when_to_use || '');
  setSite(c.site || '');
  setEmail(c.email || '');
  setRecommendedAge(c.recommended_age || '');
      } else {
        setError(res.error || 'Contacto não encontrado');
      }
    } catch (err) { console.error(err); setError('Erro inesperado'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    if (!authLoading && canAccessCMS && id) load();
  }, [authLoading, canAccessCMS, id, load]);

  if (authLoading) return (<CMSLayout currentPage="contacts"><div>Verificando autenticação...</div></CMSLayout>);
  if (!isAuthenticated || !canAccessCMS) { router.push('/login'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!title.trim()) { setError('Título é obrigatório'); setSaving(false); return; }
  const res = await updateContact(id, { title: title.trim(), when_to_use: whenToUse ? whenToUse : undefined, recommended_age: recommendedAge ? recommendedAge : undefined, site: site ? site : undefined, email: email ? email.trim() : undefined });
      if (res.success) {
        setTimeout(() => router.push('/dashboard/contacts'), 1200);
      } else {
        setError(res.error || 'Erro ao salvar');
      }
    } catch (err) { console.error(err); setError('Erro inesperado'); }
    finally { setSaving(false); }
  };

  return (
    <CMSLayout currentPage="contacts">
      <div className="flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/dashboard/contacts')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium shadow cursor-pointer flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Quicksand, Inter, sans-serif' }}>
              Editar Contacto
            </h1>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
              <span className="text-gray-700 font-medium">Carregando contacto...</span>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex">
                <div className="text-red-800">
                  <p className="font-medium">Erro ao carregar contacto</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={load}
                  className="ml-auto bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {!loading && !error && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Contacto</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Título
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Nome da entidade ou organização</p>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                      placeholder="Ex: Centro de Apoio Psicológico"
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Quando usar</label>
                    <p className="text-xs text-gray-500 mb-2">Breve descrição de quando este contacto é útil</p>
                    <textarea
                      value={whenToUse}
                      onChange={e => setWhenToUse(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium resize-none"
                      placeholder="Ex: Para apoio psicológico de urgência..."
                      rows={4}
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Idade recomendada</label>
                    <p className="text-xs text-gray-500 mb-3">Selecione a idade mínima recomendada para visualizar este conteúdo</p>
                    <div className="flex flex-wrap gap-2">
                      {['12+','16+'].map(a => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleRecommendedAge(a)}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${recommendedAge === a ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                          disabled={saving}
                          aria-pressed={recommendedAge === a}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Site (URL)</label>
                    <p className="text-xs text-gray-500 mb-2">Link para o site oficial da entidade</p>
                    <input
                      type="url"
                      value={site}
                      onChange={e => setSite(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                      placeholder="https://exemplo.com"
                      disabled={saving}
                    />
                    {site && (
                      <div className="mt-2">
                        <a
                          href={site}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                      placeholder="exemplo@dominio.com"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-6">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/contacts')}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-300 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={saving || !title.trim()}
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
