import { supabase } from '@/lib/supabase';
import { Contact, CreateContactData, UpdateContactData, ContactResponse } from '@/types/contacts';

export async function getAllContacts(): Promise<ContactResponse> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar contactos:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Contact[] };
  } catch (err) {
    console.error('Erro inesperado ao buscar contactos:', err);
    return { success: false, error: 'Erro inesperado ao buscar contactos' };
  }
}

export async function getContactById(id: string): Promise<ContactResponse> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar contacto:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Contact };
  } catch (err) {
    console.error('Erro inesperado ao buscar contacto:', err);
    return { success: false, error: 'Erro inesperado ao buscar contacto' };
  }
}

export async function createContact(payload: CreateContactData): Promise<ContactResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Build an insert payload typed as CreateContactData plus optional created_by
    // normalize email: empty string -> null, trim spaces
    const normalizedEmail = payload.email ? payload.email.trim() : null;

    const insertPayload: CreateContactData & { created_by?: string | null; email?: string | null } = {
      ...payload,
      email: normalizedEmail,
      created_by: user?.id || null
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar contacto:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Contact, message: 'Contacto criado com sucesso' };
  } catch (err) {
    console.error('Erro inesperado ao criar contacto:', err);
    return { success: false, error: 'Erro inesperado ao criar contacto' };
  }
}

export async function updateContact(id: string, payload: UpdateContactData): Promise<ContactResponse> {
  try {
    // normalize email if provided
    const updatePayload: Partial<UpdateContactData & { updated_at?: string; email?: string | null }> = { ...payload };
    if ('email' in payload) {
      updatePayload.email = payload.email ? payload.email.trim() : null;
    }
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('contacts')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar contacto:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Contact, message: 'Contacto atualizado com sucesso' };
  } catch (err) {
    console.error('Erro inesperado ao atualizar contacto:', err);
    return { success: false, error: 'Erro inesperado ao atualizar contacto' };
  }
}

export async function deleteContact(id: string): Promise<ContactResponse> {
  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover contacto:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Contacto removido com sucesso' };
  } catch (err) {
    console.error('Erro inesperado ao remover contacto:', err);
    return { success: false, error: 'Erro inesperado ao remover contacto' };
  }
}
