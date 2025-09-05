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
      // Primeiro, buscar as referências
      const { data: referencesData, error: referencesError } = await supabase
        .from('cms_references')
        .select('*')
        .order('created_at', { ascending: false });

      if (referencesError) {
        console.error('Erro ao buscar referências:', referencesError);
        return {
          success: false,
          error: 'Erro ao buscar referências: ' + referencesError.message
        };
      }

      if (!referencesData || referencesData.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Buscar todas as tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('cms_reference_tags')
        .select('*');

      if (tagsError) {
        console.error('Erro ao buscar tags:', tagsError);
        // Retornar referências sem tags se houver erro
        return {
          success: true,
          data: referencesData as Reference[]
        };
      }

      // Criar um mapa de tags para lookup rápido
      const tagsMap = new Map();
      if (tagsData) {
        tagsData.forEach(tag => {
          tagsMap.set(tag.id, tag);
        });
      }

      // Combinar referências com suas tags
      const referencesWithTags = referencesData.map(reference => ({
        ...reference,
        tag: tagsMap.get(reference.tag_id) || null
      }));

      return {
        success: true,
        data: referencesWithTags as Reference[]
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
      // Buscar a referência
      const { data: referenceData, error: referenceError } = await supabase
        .from('cms_references')
        .select('*')
        .eq('id', id)
        .single();

      if (referenceError) {
        console.error('Erro ao buscar referência:', referenceError);
        return {
          success: false,
          error: 'Erro ao buscar referência: ' + referenceError.message
        };
      }

      if (!referenceData) {
        return {
          success: false,
          error: 'Referência não encontrada'
        };
      }

      // Buscar a tag associada se existir
      let tagData = null;
      if (referenceData.tag_id) {
        const { data: tag, error: tagError } = await supabase
          .from('cms_reference_tags')
          .select('*')
          .eq('id', referenceData.tag_id)
          .single();

        if (!tagError && tag) {
          tagData = tag;
        }
      }

      // Combinar referência com sua tag
      const referenceWithTag = {
        ...referenceData,
        tag: tagData
      };

      return {
        success: true,
        data: referenceWithTag as Reference
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
      // Buscar referências por título
      const { data: referencesData, error: referencesError } = await supabase
        .from('cms_references')
        .select('*')
        .ilike('title', `%${title}%`)
        .order('created_at', { ascending: false });

      if (referencesError) {
        console.error('Erro ao buscar referências por título:', referencesError);
        return {
          success: false,
          error: 'Erro ao buscar referências por título: ' + referencesError.message
        };
      }

      if (!referencesData || referencesData.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Buscar todas as tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('cms_reference_tags')
        .select('*');

      if (tagsError) {
        console.error('Erro ao buscar tags:', tagsError);
        // Retornar referências sem tags se houver erro
        return {
          success: true,
          data: referencesData as Reference[]
        };
      }

      // Criar um mapa de tags para lookup rápido
      const tagsMap = new Map();
      if (tagsData) {
        tagsData.forEach(tag => {
          tagsMap.set(tag.id, tag);
        });
      }

      // Combinar referências com suas tags
      const referencesWithTags = referencesData.map(reference => ({
        ...reference,
        tag: tagsMap.get(reference.tag_id) || null
      }));

      return {
        success: true,
        data: referencesWithTags as Reference[]
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
    console.log('🚀 ReferenceService.createTag: Iniciando criação de tag');
    console.log('📝 Dados recebidos:', tagData);
    
    try {
      // Obter usuário atual
      console.log('🔐 Verificando autenticação do usuário...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Erro de autenticação:', userError);
        return {
          success: false,
          error: 'Erro de autenticação: ' + userError.message
        };
      }
      
      if (!user) {
        console.error('❌ Usuário não encontrado');
        return {
          success: false,
          error: 'Usuário não autenticado'
        };
      }

      console.log('✅ Usuário autenticado:', { id: user.id, email: user.email });

      // Preparar dados para inserção
      const insertData = {
        ...tagData,
        created_by: user.id
      };

      console.log('📤 Dados para inserção na tabela cms_reference_tags:', insertData);

      // Tentar inserir na tabela
      const { data, error } = await supabase
        .from('cms_reference_tags')
        .insert(insertData)
        .select()
        .single();

      console.log('📥 Resposta do Supabase:');
      console.log('  - Data:', data);
      console.log('  - Error:', error);

      if (error) {
        console.error('❌ Erro do Supabase ao criar tag:', error);
        console.error('  - Code:', error.code);
        console.error('  - Message:', error.message);
        console.error('  - Details:', error.details);
        console.error('  - Hint:', error.hint);
        
        return {
          success: false,
          error: `Erro ao criar tag: ${error.message} (Código: ${error.code})`
        };
      }

      if (!data) {
        console.error('❌ Nenhum dado retornado após inserção');
        return {
          success: false,
          error: 'Nenhum dado retornado após criar tag'
        };
      }

      console.log('✅ Tag criada com sucesso:', data);

      return {
        success: true,
        data: data as ReferenceTag,
        message: 'Tag criada com sucesso!'
      };
    } catch (error) {
      console.error('💥 Erro inesperado ao criar tag:', error);
      console.error('  - Stack:', error instanceof Error ? error.stack : 'N/A');
      
      return {
        success: false,
        error: `Erro inesperado ao criar tag: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
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
