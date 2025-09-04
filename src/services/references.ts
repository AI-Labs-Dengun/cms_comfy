import { supabase } from '@/lib/supabase';
import { Reference, CreateReferenceData, UpdateReferenceData, ReferenceResponse, ReferenceTag, CreateTagData, UpdateTagData, TagResponse } from '@/types/references';

// Re-exportar tipos para uso em componentes
export type { ReferenceTag } from '@/types/references';

export class ReferenceService {
  /**
   * Busca todas as referências
   */
  static async getAllReferences(): Promise<ReferenceResponse> {
    try {
      const { data, error } = await supabase
        .from('cms_references')
        .select(`
          *,
          tag:cms_reference_tags(*)
        `)
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
        .select(`
          *,
          tag:cms_reference_tags(*)
        `)
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
        .select(`
          *,
          tag:cms_reference_tags(*)
        `)
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

  // ===== MÉTODOS PARA GERENCIAR TAGS =====

  /**
   * Busca todas as tags
   */
  static async getAllTags(): Promise<TagResponse> {
    try {
      const { data, error } = await supabase
        .from('cms_reference_tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar tags:', error);
        return {
          success: false,
          error: 'Erro ao buscar tags: ' + error.message
        };
      }

      return {
        success: true,
        data: data as ReferenceTag[]
      };
    } catch (error) {
      console.error('Erro inesperado ao buscar tags:', error);
      return {
        success: false,
        error: 'Erro inesperado ao buscar tags'
      };
    }
  }

  /**
   * Busca uma tag específica por ID
   */
  static async getTagById(id: string): Promise<TagResponse> {
    try {
      const { data, error } = await supabase
        .from('cms_reference_tags')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar tag:', error);
        return {
          success: false,
          error: 'Erro ao buscar tag: ' + error.message
        };
      }

      return {
        success: true,
        data: data as ReferenceTag
      };
    } catch (error) {
      console.error('Erro inesperado ao buscar tag:', error);
      return {
        success: false,
        error: 'Erro inesperado ao buscar tag'
      };
    }
  }

  /**
   * Cria uma nova tag
   */
  static async createTag(tagData: CreateTagData): Promise<TagResponse> {
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
        .from('cms_reference_tags')
        .insert({
          ...tagData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar tag:', error);
        return {
          success: false,
          error: 'Erro ao criar tag: ' + error.message
        };
      }

      return {
        success: true,
        data: data as ReferenceTag,
        message: 'Tag criada com sucesso!'
      };
    } catch (error) {
      console.error('Erro inesperado ao criar tag:', error);
      return {
        success: false,
        error: 'Erro inesperado ao criar tag'
      };
    }
  }

  /**
   * Atualiza uma tag existente
   */
  static async updateTag(id: string, updateData: UpdateTagData): Promise<TagResponse> {
    try {
      const { data, error } = await supabase
        .from('cms_reference_tags')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar tag:', error);
        return {
          success: false,
          error: 'Erro ao atualizar tag: ' + error.message
        };
      }

      return {
        success: true,
        data: data as ReferenceTag,
        message: 'Tag atualizada com sucesso!'
      };
    } catch (error) {
      console.error('Erro inesperado ao atualizar tag:', error);
      return {
        success: false,
        error: 'Erro inesperado ao atualizar tag'
      };
    }
  }

  /**
   * Verifica se uma tag tem referências associadas
   */
  static async checkTagUsage(tagId: string): Promise<{ hasReferences: boolean; count: number }> {
    try {
      const { data, error } = await supabase
        .from('cms_references')
        .select('id', { count: 'exact' })
        .eq('tag_id', tagId);

      if (error) {
        console.error('Erro ao verificar uso da tag:', error);
        return { hasReferences: false, count: 0 };
      }

      return {
        hasReferences: (data && data.length > 0),
        count: data ? data.length : 0
      };
    } catch (error) {
      console.error('Erro inesperado ao verificar uso da tag:', error);
      return { hasReferences: false, count: 0 };
    }
  }

  /**
   * Remove uma tag (apenas se não tiver referências associadas)
   */
  static async deleteTag(id: string): Promise<TagResponse> {
    try {
      // Verificar se a tag tem referências associadas
      const usage = await this.checkTagUsage(id);
      
      if (usage.hasReferences) {
        return {
          success: false,
          error: `Não é possível remover esta tag. Ela está sendo usada em ${usage.count} referência(s).`
        };
      }

      const { error } = await supabase
        .from('cms_reference_tags')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao remover tag:', error);
        return {
          success: false,
          error: 'Erro ao remover tag: ' + error.message
        };
      }

      return {
        success: true,
        message: 'Tag removida com sucesso!'
      };
    } catch (error) {
      console.error('Erro inesperado ao remover tag:', error);
      return {
        success: false,
        error: 'Erro inesperado ao remover tag'
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
export const getReferencesByTitle = (title: string) => ReferenceService.getReferencesByTitle(title);

// Funções de conveniência para tags
export const getAllTags = () => ReferenceService.getAllTags();
export const getTagById = (id: string) => ReferenceService.getTagById(id);
export const createTag = (data: CreateTagData) => ReferenceService.createTag(data);
export const updateTag = (id: string, data: UpdateTagData) => ReferenceService.updateTag(id, data);
export const deleteTag = (id: string) => ReferenceService.deleteTag(id);
export const checkTagUsage = (id: string) => ReferenceService.checkTagUsage(id);
