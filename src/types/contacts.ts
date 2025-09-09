export interface ContactEntry {
  type?: string; // ex: 'telefone', 'email', 'linha direta'
  value: string;
}

export interface OpeningHours {
  days?: string[]; // ex: ['Mon','Tue']
  periods?: { from: string; to: string }[];
  raw?: string; // fallback textual description
  is_24h?: boolean; // indica se funciona 24h
  is_unavailable?: boolean; // indica se está indisponível
  days_text?: string; // texto livre para dias
  start_time?: string; // horário de início
  end_time?: string; // horário de fim
}

export interface Contact {
  id: string;
  title: string;
  when_to_use?: string;
  who_attends?: string;
  recommended_age?: string; // ex: '12+' ou '16-18' para range
  min_age?: number; // idade mínima
  max_age?: number; // idade máxima (opcional)
  phone1?: string;
  phone2?: string;
  phone3?: string;
  opening_hours?: OpeningHours | null;
  more_info_url?: string | null;
  emotions?: string[]; // lista de emoções associadas
  location?: string;
  address?: string;
  email?: string | null;
  when_to_seek?: string;
  site?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateContactData {
  title: string;
  when_to_use?: string;
  who_attends?: string;
  recommended_age?: string;
  min_age?: number;
  max_age?: number;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  opening_hours?: OpeningHours | null;
  more_info_url?: string | null;
  emotions?: string[];
  location?: string;
  address?: string;
  email?: string | null;
  when_to_seek?: string;
  site?: string;
}

export interface UpdateContactData {
  title?: string;
  when_to_use?: string;
  who_attends?: string;
  recommended_age?: string;
  min_age?: number;
  max_age?: number;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  opening_hours?: OpeningHours | null;
  more_info_url?: string | null;
  emotions?: string[];
  location?: string;
  address?: string;
  email?: string | null;
  when_to_seek?: string;
  site?: string;
}

export interface ContactResponse {
  success: boolean;
  data?: Contact | Contact[];
  error?: string;
  message?: string;
}
