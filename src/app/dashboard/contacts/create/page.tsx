"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
// removed react-day-picker usage
import CMSLayout from '@/components/CMSLayout';
import { useAuth } from '@/context/AuthContext';
import { createContact } from '@/services/contacts';
// DateRangePicker removed - using a simple text field for operating days
import { Save, ArrowLeft } from 'lucide-react';

const predefinedEmotions = ['Ansiedade','Tristeza','Raiva','Medo','Alegria','Desconforto'];

export default function CreateContact() {
  const router = useRouter();
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [whenToUse, setWhenToUse] = useState('');
  const [whoAttends, setWhoAttends] = useState('');
  const [recommendedAge, setRecommendedAge] = useState('');
  const [contacts, setContacts] = useState<string[]>([]);
  const [newContactInput, setNewContactInput] = useState('');
  const [openingHours] = useState('');
  const [openingDays, setOpeningDays] = useState('');
  const [openingStartTime, setOpeningStartTime] = useState('09:00');
  const [openingEndTime, setOpeningEndTime] = useState('17:00');
  const [moreInfoUrl, setMoreInfoUrl] = useState('');
  const [emotions, setEmotions] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whenToSeek, setWhenToSeek] = useState('');
  const [site, setSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (authLoading) return (<CMSLayout currentPage="contacts"><div>Verificando autenticação...</div></CMSLayout>);
  if (!isAuthenticated || !canAccessCMS) { router.push('/login'); return null; }

  const toggleEmotion = (emo: string) => {
    setEmotions(prev => prev.includes(emo) ? prev.filter(e=>e!==emo) : [...prev, emo]);
  };

  const toggleRecommendedAge = (age: string) => {
    setRecommendedAge(prev => prev === age ? '' : age);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
      try {
      if (!title.trim()) { setError('Título é obrigatório'); setLoading(false); return; }

      const payload = {
        title: title.trim(),
        when_to_use: whenToUse.trim(),
        who_attends: whoAttends.trim(),
        recommended_age: recommendedAge ? recommendedAge : undefined,
        // map multiple contacts into expected shape
        contacts: contacts.length ? contacts.map(c => ({ type: 'primary', value: c })) : [],
        opening_hours: {
          raw: openingHours,
          days_text: openingDays ? openingDays : undefined,
          start_time: openingStartTime || undefined,
          end_time: openingEndTime || undefined,
        },
        more_info_url: moreInfoUrl ? moreInfoUrl : undefined,
        emotions,
        location: location ? location : undefined,
  address: address ? address : undefined,
  phone: phone ? phone : undefined,
  email: email ? email.trim() : undefined,
  when_to_seek: whenToSeek ? whenToSeek : undefined,
  site: site ? site : undefined
      };

      const res = await createContact(payload);
      if (res.success) {
        setSuccess('Contacto criado com sucesso');
        setTimeout(() => router.push('/dashboard/contacts'), 1500);
      } else {
        setError(res.error || 'Erro ao criar contacto');
      }
    } catch (err) {
      console.error(err);
      setError('Erro inesperado');
    } finally { setLoading(false); }
  };

  return (
    <CMSLayout currentPage="contacts">
      <div className="flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl">
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
              Novo Contacto
            </h1>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
              <p className="text-sm font-medium">{success}</p>
              <p className="text-xs mt-1">Redirecionando para lista de contactos...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Título<span className="text-red-500 ml-1">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Nome da entidade ou organização</p>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                    placeholder="Ex: Centro de Apoio Psicológico"
                    required
                    disabled={loading}
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
                    rows={3}
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Quem atende</label>
                    <input
                      type="text"
                      value={whoAttends}
                      onChange={e => setWhoAttends(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                      placeholder="Ex: Psicólogos especializados"
                      disabled={loading}
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
                        disabled={loading}
                        aria-pressed={recommendedAge === a}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Contacto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Contacto(s) principal(is)</label>
                  <p className="text-xs text-gray-500 mb-2">Adicione um contacto e pressione Enter para adicionar outro</p>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={newContactInput}
                      onChange={e => setNewContactInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = newContactInput.trim();
                          if (v && !contacts.includes(v)) {
                            setContacts(prev => [...prev, v]);
                            setNewContactInput('');
                          } else {
                            setNewContactInput('');
                          }
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                      placeholder="Ex: 213 456 789 ou email@exemplo.com"
                      disabled={loading}
                    />

                    {/* chips for added contacts */}
                    <div className="flex flex-wrap gap-2">
                      {contacts.map((c, idx) => (
                        <div key={c + idx} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm">
                          <span className="text-gray-800">{c}</span>
                          <button
                            type="button"
                            onClick={() => setContacts(prev => prev.filter((_, i) => i !== idx))}
                            className="text-gray-500 hover:text-gray-800"
                            aria-label={`Remover contacto ${c}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Telefone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                      placeholder="213 456 789"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                      placeholder="exemplo@dominio.com"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Período de funcionamento</label>
                    <p className="text-xs text-gray-500 mb-3">Selecione o período em que este contacto está disponível</p>
                    
                    <input
                      type="text"
                      value={openingDays}
                      onChange={e => setOpeningDays(e.target.value)}
                      className="mb-3 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                      placeholder="Ex: segunda a sexta, fins de semana fechado"
                      disabled={loading}
                    />

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Horário de início</label>
                        <input
                          type="time"
                          value={openingStartTime}
                          onChange={e => setOpeningStartTime(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Horário de fim</label>
                        <input
                          type="time"
                          value={openingEndTime}
                          onChange={e => setOpeningEndTime(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    </div>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Localização</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Local</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                    placeholder="Ex: Câmara Municipal de Olhão"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Morada</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                    placeholder="Ex: Rua da República, 123, 8700-307 Olhão"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Emoções associadas</label>
                  <p className="text-xs text-gray-500 mb-3">Selecione as emoções que este contacto pode ajudar</p>
                  <div className="flex flex-wrap gap-2">
                    {predefinedEmotions.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => toggleEmotion(e)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          emotions.includes(e)
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        disabled={loading}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Quando procurar</label>
                  <textarea
                    value={whenToSeek}
                    onChange={e => setWhenToSeek(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium resize-none"
                    placeholder="Ex: Em situações de crise emocional ou necessidade de apoio..."
                    rows={3}
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Mais info (URL)</label>
                    <input
                      type="url"
                      value={moreInfoUrl}
                      onChange={e => setMoreInfoUrl(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                      placeholder="https://exemplo.com/mais-info"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Site (URL)</label>
                    <input
                      type="url"
                      value={site}
                      onChange={e => setSite(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                      placeholder="https://exemplo.com"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={() => router.push('/dashboard/contacts')}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading || !title.trim()}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Criar Contacto
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
