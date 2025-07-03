import { supabase, supabaseAdmin } from '@/lib/supabase';
import { AuthResponse } from '@/types/auth';

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
   * Usa a função can_user_login_with_role do banco de dados
   */
  static async canUserLoginWithRole(email: string, requiredRole: 'cms' | 'app'): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.rpc('can_user_login_with_role', {
        user_email: email,
        required_role: requiredRole
      });

      if (error) {
        return {
          success: false,
          error: 'Erro na verificação de permissões',
          code: 'PERMISSION_CHECK_ERROR'
        };
      }

      return data as AuthResponse;

    } catch {
      return {
        success: false,
        error: 'Erro interno do servidor',
        code: 'SERVER_ERROR'
      };
    }
  }

  /**
   * Faz logout do usuário
   */
  static async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  /**
   * Verifica se há um usuário logado
   */
  static async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Verifica se o usuário atual tem acesso ao CMS
   */
  static async checkCMSAccess(): Promise<AuthResponse> {
    const user = await this.getUser();
    
    if (!user?.email) {
      return {
        success: false,
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      };
    }

    return await this.canUserLoginWithRole(user.email, 'cms');
  }

  /**
   * Obter sessão atual
   */
  static async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
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