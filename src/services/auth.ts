import { supabase, supabaseAdmin, getCachedQuery, setCachedQuery } from '@/lib/supabase';
import { AuthResponse } from '@/types/auth';

interface CachedUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

export class AuthService {
  /**
   * Faz login verificando se o usuário tem o role correto para acessar o CMS
   */
  static async loginWithRole(email: string, password: string, requiredRole: 'cms' | 'app' = 'cms'): Promise<AuthResponse> {
    try {
      // Primeiro, verificar se o usuário pode fazer login com o role requerido
      const roleCheck = await this.canUserLoginWithRole(email, requiredRole);
      
      if (!roleCheck.success) {
        return roleCheck;
      }

      // Se passou na verificação de role, fazer login no Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        return {
          success: false,
          error: 'Credenciais inválidas',
          code: 'INVALID_CREDENTIALS'
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Erro no login',
          code: 'LOGIN_ERROR'
        };
      }

      // Retornar sucesso com dados do usuário
      return {
        success: true,
        user_id: roleCheck.user_id,
        username: roleCheck.username,
        user_role: roleCheck.user_role,
        name: roleCheck.name
      };

    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: 'Erro interno do servidor',
        code: 'SERVER_ERROR'
      };
    }
  }

  /**
   * Verifica se um usuário pode fazer login com o role específico
   * Usa cache para evitar múltiplas consultas
   */
  static async canUserLoginWithRole(email: string, requiredRole: 'cms' | 'app'): Promise<AuthResponse> {
    const cacheKey = `role_check_${email}_${requiredRole}`;
    
    // Tentar cache primeiro
    const cached = getCachedQuery(cacheKey);
    if (cached && typeof cached === 'object' && cached !== null && 'success' in cached) {
      return cached as AuthResponse;
    }

    try {
      const { data, error } = await supabase.rpc('can_user_login_with_role', {
        user_email: email,
        required_role: requiredRole
      });

      if (error) {
        const response = {
          success: false,
          error: 'Erro na verificação de permissões',
          code: 'PERMISSION_CHECK_ERROR'
        };
        return response;
      }

      const response = data as AuthResponse;
      
      // Cachear apenas respostas de sucesso
      if (response.success) {
        setCachedQuery(cacheKey, response);
      }
      
      return response;

    } catch {
      return {
        success: false,
        error: 'Erro interno do servidor',
        code: 'SERVER_ERROR'
      };
    }
  }

  /**
   * Faz logout do usuário com limpeza completa
   */
  static async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚪 AuthService - Fazendo logout...');
      
      // Encerrar sessão no Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ AuthService - Erro ao fazer logout:', error);
        return { success: false, error: error.message };
      }
      
      // Limpar cache de queries
      try {
        const { clearQueryCache } = await import('@/lib/supabase');
        clearQueryCache();
      } catch {
        // Ignorar erro se função não estiver disponível
      }
      
      console.log('✅ AuthService - Logout realizado com sucesso');
      return { success: true };
    } catch (error) {
      console.error('❌ AuthService - Erro inesperado no logout:', error);
      return { success: false, error: 'Erro de conexão ao fazer logout' };
    }
  }

  /**
   * Verifica se há um usuário logado (com cache)
   */
  static async getUser() {
    const cacheKey = 'current_user';
    const cached = getCachedQuery(cacheKey);
    
    if (cached && typeof cached === 'object' && cached !== null && 'id' in cached) {
      return cached as CachedUser;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setCachedQuery(cacheKey, user);
    }
    
    return user;
  }

  /**
   * Verifica se o usuário atual tem acesso ao CMS (otimizado)
   */
  static async checkCMSAccess(): Promise<AuthResponse> {
    const user = await this.getUser();
    
    if (!user || typeof user !== 'object' || !('email' in user) || !user.email) {
      return {
        success: false,
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      };
    }

    return await this.canUserLoginWithRole(user.email as string, 'cms');
  }

  /**
   * Obter sessão atual (com cache leve)
   */
  static async getSession() {
    const cacheKey = 'current_session';
    const cached = getCachedQuery(cacheKey);
    
    if (cached) {
      return cached;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Cache por apenas 1 minuto para sessões
      setCachedQuery(cacheKey, session);
    }
    
    return session;
  }

  /**
   * Cria uma nova conta de usuário para o CMS
   */
  static async signupCMS(name: string, email: string, password: string): Promise<AuthResponse> {
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        return {
          success: false,
          error: authError.message || 'Erro ao criar conta',
          code: 'SIGNUP_ERROR'
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Erro ao criar conta',
          code: 'SIGNUP_ERROR'
        };
      }

      // 2. Criar perfil na tabela profiles com role CMS
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: name,
          username: email.split('@')[0], // Usar parte do email como username
          avatar_path: '/default-avatar.png', // Avatar padrão
          guardian_email: email, // Para CMS, usar o próprio email como guardian
          authorized: true, // CMS users são autorizados automaticamente
          user_role: 'cms',
          authorized_at: new Date().toISOString(),
          authorized_by: 'system'
        })
        .select()
        .single();

      if (profileError) {
        // Se falhou ao criar perfil, tentar deletar o usuário criado
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        } catch {
          // Ignorar erro de deleção
        }
        
        return {
          success: false,
          error: 'Erro ao criar perfil de usuário',
          code: 'PROFILE_CREATION_ERROR'
        };
      }

      // 3. Log da criação da conta
      try {
        await supabaseAdmin
          .from('authorization_logs')
          .insert({
            user_id: authData.user.id,
            action: 'account_created',
            guardian_email: email,
            additional_data: {
              username: profileData.username,
              user_role: 'cms',
              created_via: 'cms_signup'
            }
          });
      } catch {
        // Ignorar erro de log (não crítico)
      }

      return {
        success: true,
        user_id: authData.user.id,
        username: profileData.username,
        user_role: 'cms',
        name: profileData.name
      };

    } catch {
      return {
        success: false,
        error: 'Erro interno do servidor',
        code: 'SERVER_ERROR'
      };
    }
  }

  /**
   * Verifica se um email já está em uso
   * Usa uma abordagem mais simples verificando na tabela profiles
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      // Verificar se existe um usuário com este email na tabela auth.users
      // Usando uma query mais simples que não requer permissões admin
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('guardian_email', email)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        return false;
      }

      return !!data; // Se encontrou dados, email existe
    } catch {
      return false;
    }
  }

  /**
   * Verifica se um username já está em uso
   */
  static async checkUsernameExists(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        return false;
      }

      return !!data; // Se encontrou dados, username existe
    } catch {
      return false;
    }
  }
} 