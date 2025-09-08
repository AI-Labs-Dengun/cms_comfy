export interface ContactEntry {
  type?: string; // ex: 'telefone', 'email', 'linha direta'
  value: string;
}

export interface OpeningHours {
  days?: string[]; // ex: ['Mon','Tue']
  periods?: { from: string; to: string }[];
  raw?: string; // fallback textual description
}

export interface Contact {
  id: string;
  title: string;
  when_to_use?: string;
  who_attends?: string;
  recommended_age?: string; // ex: '12+'
  contacts?: ContactEntry[]; // múltiplos contactos
  opening_hours?: OpeningHours | null;
  more_info_url?: string | null;
  emotions?: string[]; // lista de emoções associadas
  location?: string;
  address?: string;
  phone?: string;
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
  contacts?: ContactEntry[];
  opening_hours?: OpeningHours | null;
  more_info_url?: string | null;
  emotions?: string[];
  location?: string;
  address?: string;
  phone?: string;
  email?: string | null;
  when_to_seek?: string;
  site?: string;
}

export interface UpdateContactData {
  title?: string;
  when_to_use?: string;
  who_attends?: string;
  recommended_age?: string;
  contacts?: ContactEntry[];
  opening_hours?: OpeningHours | null;
  more_info_url?: string | null;
  emotions?: string[];
  location?: string;
  address?: string;
  phone?: string;
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
