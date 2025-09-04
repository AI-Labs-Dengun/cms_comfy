import { supabase } from '@/lib/supabase';
import { Reference, CreateReferenceData, UpdateReferenceData, ReferenceResponse } from '@/types/references';

export class ReferenceService {
  /**
   * Busca todas as referências
   */
  static async getAllReferences(): Promise<ReferenceResponse> {
    try {
      const { data, error } = await supabase
        .from('cms_references')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar referências:', error);
        return {
          success: false,
          error: 'Erro ao buscar referências: ' + error.message
        };
      }

      return {
        success: true,
        data: data as Reference[]
      };
    } catch (error) {
      console.error('Erro inesperado ao buscar referências:', error);
      return {
        success: false,
        error: 'Erro inesperado ao buscar referências'
      };
    }
  }

  /**
   * Busca uma referência específica por ID
   */
  static async getReferenceById(id: string): Promise<ReferenceResponse> {
    try {
      const { data, error } = await supabase
        .from('cms_references')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar referência:', error);
        return {
          success: false,
          error: 'Erro ao buscar referência: ' + error.message
        };
      }

      return {
        success: true,
        data: data as Reference
      };
    } catch (error) {
      console.error('Erro inesperado ao buscar referência:', error);
      return {
        success: false,
        error: 'Erro inesperado ao buscar referência'
      };
    }
  }

  /**
   * Cria uma nova referência
   */
  static async createReference(referenceData: CreateReferenceData): Promise<ReferenceResponse> {
    try {
      // Obter usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          error: 'Usuário não autenticado'
        };
      }

      const { data, error } = await supabase
        .from('cms_references')
        .insert({
          ...referenceData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar referência:', error);
        return {
          success: false,
          error: 'Erro ao criar referência: ' + error.message
        };
      }

      return {
        success: true,
        data: data as Reference,
        message: 'Referência criada com sucesso!'
      };
    } catch (error) {
      console.error('Erro inesperado ao criar referência:', error);
      return {
        success: false,
        error: 'Erro inesperado ao criar referência'
      };
    }
  }

  /**
   * Atualiza uma referência existente
   */
  static async updateReference(id: string, updateData: UpdateReferenceData): Promise<ReferenceResponse> {
    try {
      const { data, error } = await supabase
        .from('cms_references')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar referência:', error);
        return {
          success: false,
          error: 'Erro ao atualizar referência: ' + error.message
        };
      }

      return {
        success: true,
        data: data as Reference,
        message: 'Referência atualizada com sucesso!'
      };
    } catch (error) {
      console.error('Erro inesperado ao atualizar referência:', error);
      return {
        success: false,
        error: 'Erro inesperado ao atualizar referência'
      };
    }
  }

  /**
   * Remove uma referência
   */
  static async deleteReference(id: string): Promise<ReferenceResponse> {
    try {
      const { error } = await supabase
        .from('cms_references')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover referência:', error);
        return {
          success: false,
          error: 'Erro ao remover referência: ' + error.message
        };
      }

      return {
        success: true,
        message: 'Referência removida com sucesso!'
      };
    } catch (error) {
      console.error('Erro inesperado ao remover referência:', error);
      return {
        success: false,
        error: 'Erro inesperado ao remover referência'
      };
    }
  }

  /**
   * Busca referências por assunto
   */
  static async getReferencesBySubject(subject: string): Promise<ReferenceResponse> {
    try {
      const { data, error } = await supabase
        .from('cms_references')
        .select('*')
        .ilike('subject', `%${subject}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar referências por assunto:', error);
        return {
          success: false,
          error: 'Erro ao buscar referências por assunto: ' + error.message
        };
      }

      return {
        success: true,
        data: data as Reference[]
      };
    } catch (error) {
      console.error('Erro inesperado ao buscar referências por assunto:', error);
      return {
        success: false,
        error: 'Erro inesperado ao buscar referências por assunto'
      };
    }
  }

  /**
   * Busca referências por título
   */
  static async getReferencesByTitle(title: string): Promise<ReferenceResponse> {
    try {
      const { data, error } = await supabase
        .from('cms_references')
        .select('*')
        .ilike('title', `%${title}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar referências por título:', error);
        return {
          success: false,
          error: 'Erro ao buscar referências por título: ' + error.message
        };
      }

      return {
        success: true,
        data: data as Reference[]
      };
    } catch (error) {
      console.error('Erro inesperado ao buscar referências por título:', error);
      return {
        success: false,
        error: 'Erro inesperado ao buscar referências por título'
      };
    }
  }
}

// Funções de conveniência para uso direto
export const getAllReferences = () => ReferenceService.getAllReferences();
export const getReferenceById = (id: string) => ReferenceService.getReferenceById(id);
export const createReference = (data: CreateReferenceData) => ReferenceService.createReference(data);
export const updateReference = (id: string, data: UpdateReferenceData) => ReferenceService.updateReference(id, data);
export const deleteReference = (id: string) => ReferenceService.deleteReference(id);
export const getReferencesBySubject = (subject: string) => ReferenceService.getReferencesBySubject(subject);
export const getReferencesByTitle = (title: string) => ReferenceService.getReferencesByTitle(title);
