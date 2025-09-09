"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CMSLayout from '@/components/CMSLayout';
import { useAuth } from '@/context/AuthContext';
import { getContactById, updateContact } from '@/services/contacts';
import { Save, ArrowLeft } from 'lucide-react';
import { EMOTIONS } from '@/lib/emotions';

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isAuthenticated, canAccessCMS, loading: authLoading } = useAuth();
  
  const [title, setTitle] = useState('');
  const [whenToUse, setWhenToUse] = useState('');
  const [whoAttends, setWhoAttends] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [phone3, setPhone3] = useState('');
  const [emotions, setEmotions] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [whenToSeek, setWhenToSeek] = useState('');
  const [site, setSite] = useState('');
  const [moreInfoUrl, setMoreInfoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Novos estados para idade
  const [minAge, setMinAge] = useState<number | null>(null);
  const [maxAge, setMaxAge] = useState<number | null>(null);
  const [allAges, setAllAges] = useState(false);

  // Novos estados para horários
  const [hoursAvailable, setHoursAvailable] = useState<'available' | 'unavailable' | '24h'>('available');
  const [openingDays, setOpeningDays] = useState('');
  const [openingStartTime, setOpeningStartTime] = useState('09:00');
  const [openingEndTime, setOpeningEndTime] = useState('17:00');

  // Opções de idade (5 aos 25 anos)
  const ageOptions = Array.from({ length: 21 }, (_, i) => i + 5);

  const toggleEmotion = (emo: string) => {
    setEmotions(prev => prev.includes(emo) ? prev.filter(e=>e!==emo) : [...prev, emo]);
  };

  const handleAgeChange = (type: 'min' | 'max', value: string) => {
    if (allAges) return; // ignore changes when 'all ages' is selected
    const age = value ? parseInt(value) : null;
    if (type === 'min') {
      setMinAge(age);
      // Se idade máxima for menor que a mínima, resetar a máxima
      if (maxAge && age && age > maxAge) {
        setMaxAge(null);
      }
    } else {
      setMaxAge(age);
    }
  };

  const getAvailableMaxAges = () => {
    if (!minAge) return ageOptions;
    return ageOptions.filter(age => age >= minAge);
  };

  const generateRecommendedAge = () => {
    if (allAges || !minAge) return undefined;
    if (maxAge) return `${minAge}-${maxAge}`;
    return `${minAge}+`;
  };

  // Normaliza URL: se sem esquema, adiciona https://
  const normalizeUrl = (raw?: string) => {
    if (!raw) return undefined;
    const v = raw.trim();
    if (!v) return undefined;
    try {
      // If has scheme, URL constructor will work
      new URL(v);
      return v;
    } catch {
      // try with https://
      try {
        new URL(`https://${v}`);
        return `https://${v}`;
      } catch {
        return v; // return original, backend can validate
      }
    }
  };

  const loadContact = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getContactById(id);
      if (res.success && res.data && !Array.isArray(res.data)) {
        const contact = res.data;
        setTitle(contact.title || '');
        setWhenToUse(contact.when_to_use || '');
        setWhoAttends(contact.who_attends || '');
        
        // Carregar idades
        setMinAge(contact.min_age || null);
        setMaxAge(contact.max_age || null);
        if (contact.min_age === null && contact.max_age === null) {
          setAllAges(true);
        }
        
        // Carregar telefones
        setPhone1(contact.phone1 || '');
        setPhone2(contact.phone2 || '');
        setPhone3(contact.phone3 || '');
        
        // Carregar horários
        const openingHours = contact.opening_hours;
        if (openingHours?.is_unavailable) {
          setHoursAvailable('unavailable');
        } else if (openingHours?.is_24h) {
          setHoursAvailable('24h');
        } else {
          setHoursAvailable('available');
        }
        
        setOpeningDays(openingHours?.days_text || '');
        setOpeningStartTime(openingHours?.start_time || '09:00');
        setOpeningEndTime(openingHours?.end_time || '17:00');
        
        setMoreInfoUrl(contact.more_info_url || '');
        setEmotions(contact.emotions || []);
        setLocation(contact.location || '');
        setAddress(contact.address || '');
        setEmail(contact.email || '');
        setWhenToSeek(contact.when_to_seek || '');
        setSite(contact.site || '');
      } else {
        setError(res.error || 'Contacto não encontrado');
      }
    } catch (err) {
      console.error(err);
      setError('Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && canAccessCMS && id) {
      loadContact();
    }
  }, [authLoading, canAccessCMS, id, loadContact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!title.trim()) { 
        setError('Título é obrigatório'); 
        setLoading(false); 
        return; 
      }

      // Construir opening_hours baseado na seleção
      let openingHoursData = {};
      if (hoursAvailable === 'unavailable') {
        openingHoursData = {
          is_unavailable: true,
          raw: 'Indisponível'
        };
      } else if (hoursAvailable === '24h') {
        openingHoursData = {
          is_24h: true,
          raw: '24 horas por dia',
          days_text: openingDays || 'Todos os dias'
        };
      } else {
        openingHoursData = {
          days_text: openingDays || undefined,
          start_time: openingStartTime || undefined,
          end_time: openingEndTime || undefined,
          raw: openingDays ? `${openingDays} das ${openingStartTime} às ${openingEndTime}` : `Das ${openingStartTime} às ${openingEndTime}`
        };
      }

      const payload = {
        title: title.trim(),
        when_to_use: whenToUse.trim(),
        who_attends: whoAttends.trim(),
        recommended_age: generateRecommendedAge(),
        min_age: allAges ? undefined : (minAge || undefined),
        max_age: allAges ? undefined : (maxAge || undefined),
        phone1: phone1 || undefined,
        phone2: phone2 || undefined,
        phone3: phone3 || undefined,
        opening_hours: openingHoursData,
        more_info_url: normalizeUrl(moreInfoUrl),
        emotions,
        location: location ? location : undefined,
        address: address ? address : undefined,
        email: email ? email.trim() : undefined,
        when_to_seek: whenToSeek ? whenToSeek : undefined,
        site: normalizeUrl(site)
      };

      const res = await updateContact(id, payload);
      if (res.success) {
        setSuccess('Contacto atualizado com sucesso');
        setTimeout(() => router.push('/dashboard/contacts'), 1500);
      } else {
        setError(res.error || 'Erro ao atualizar contacto');
      }
    } catch (err) {
      console.error(err);
      setError('Erro inesperado');
    } finally { 
      setLoading(false); 
    }
  };

  if (authLoading) return (<CMSLayout currentPage="contacts"><div>Verificando autenticação...</div></CMSLayout>);
  if (!isAuthenticated || !canAccessCMS) { router.push('/login'); return null; }

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

          {/* Feedback Messages */}
          {error && !loading && (
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

          {!loading && (
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
                    <p className="text-xs text-gray-500 mb-3">Selecione a faixa etária para este contacto</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Idade mínima</label>
                        <select
                          value={minAge || ''}
                          onChange={e => handleAgeChange('min', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
                          disabled={loading || allAges}
                        >
                          <option value="">Selecionar idade mínima</option>
                          {ageOptions.map(age => (
                            <option key={age} value={age}>{age} anos</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Idade máxima (opcional)</label>
                        <select
                          value={maxAge || ''}
                          onChange={e => handleAgeChange('max', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900"
                          disabled={loading || allAges || !minAge}
                        >
                          <option value="">Sem limite máximo</option>
                          {getAvailableMaxAges().map(age => (
                            <option key={age} value={age}>{age} anos</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <input id="any-age-edit" type="checkbox" checked={allAges} onChange={() => { setAllAges(prev => { const next = !prev; if (next) { setMinAge(null); setMaxAge(null); } return next; }); }} />
                      <label htmlFor="any-age-edit" className="text-sm text-gray-700">Qualquer idade</label>
                    </div>
                    {!allAges && minAge && (
                      <p className="text-xs text-gray-600 mt-2">
                        Idade recomendada: {generateRecommendedAge()}
                      </p>
                    )}
                  </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Contacto</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Telefone 1</label>
                        <input
                          type="tel"
                          value={phone1}
                          onChange={e => setPhone1(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                          placeholder="213 456 789"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Telefone 2</label>
                        <input
                          type="tel"
                          value={phone2}
                          onChange={e => setPhone2(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                          placeholder="Opcional"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Telefone 3</label>
                        <input
                          type="tel"
                          value={phone3}
                          onChange={e => setPhone3(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                          placeholder="Opcional"
                          disabled={loading}
                        />
                      </div>
                  </div>

                  <div className="grid grid-cols-1">
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
                  </div>
                  
                  <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-900 mb-2">Horário de funcionamento</label>
                      <p className="text-xs text-gray-500 mb-3">Selecione a disponibilidade deste contacto</p>
                      
                      {/* Toggle para tipo de horário */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <button
                          type="button"
                          onClick={() => setHoursAvailable('available')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            hoursAvailable === 'available'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          disabled={loading}
                        >
                          Horário específico
                        </button>
                        <button
                          type="button"
                          onClick={() => setHoursAvailable('24h')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            hoursAvailable === '24h'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          disabled={loading}
                        >
                          24 horas
                        </button>
                        <button
                          type="button"
                          onClick={() => setHoursAvailable('unavailable')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            hoursAvailable === 'unavailable'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          disabled={loading}
                        >
                          Indisponível
                        </button>
                      </div>

                      {/* Campos condicionais baseados na seleção */}
                      {hoursAvailable === 'available' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Dias de funcionamento</label>
                            <input
                              type="text"
                              value={openingDays}
                              onChange={e => setOpeningDays(e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                              placeholder="Ex: Segunda a sexta-feira"
                              disabled={loading}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
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
                      )}

                      {hoursAvailable === '24h' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Dias de funcionamento (opcional)</label>
                          <input
                            type="text"
                            value={openingDays}
                            onChange={e => setOpeningDays(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                            placeholder="Ex: Todos os dias da semana"
                            disabled={loading}
                          />
                          <p className="text-xs text-green-600 mt-1">Este contacto está disponível 24 horas por dia</p>
                        </div>
                      )}

                      {hoursAvailable === 'unavailable' && (
                        <div className="text-center py-4">
                          <p className="text-sm text-red-600 font-medium">Este contacto está marcado como indisponível</p>
                          <p className="text-xs text-gray-500 mt-1">Os horários não serão exibidos na aplicação</p>
                        </div>
                      )}
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
                      {EMOTIONS.map(e => (
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
                        type="text"
                        value={moreInfoUrl}
                        onChange={e => setMoreInfoUrl(e.target.value)}
                        onBlur={() => setMoreInfoUrl(normalizeUrl(moreInfoUrl) || '')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-gray-900 font-medium"
                        placeholder="https://exemplo.com/mais-info"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Site (URL)</label>
                      <input
                        type="text"
                        value={site}
                        onChange={e => setSite(e.target.value)}
                        onBlur={() => setSite(normalizeUrl(site) || '')}
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
