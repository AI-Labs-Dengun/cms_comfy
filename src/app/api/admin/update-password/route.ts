import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Cliente com service role para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Cliente normal para verificar autenticação
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { user_id, new_password } = await request.json();

    console.log('🔑 Alteração de senha para user_id:', user_id);

    // Validações básicas
    if (!user_id || !new_password) {
      return NextResponse.json(
        { success: false, error: 'user_id e new_password são obrigatórios' },
        { status: 400 }
      );
    }

    if (new_password.length < 6 || new_password.length > 72) {
      return NextResponse.json(
        { success: false, error: 'A senha deve ter entre 6 e 72 caracteres' },
        { status: 400 }
      );
    }

    // Obter token de autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token de autenticação necessário' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verificar usuário autenticado usando o token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Verificar se usuário tem permissão (deve ser CMS)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_role, authorized')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Erro ao buscar perfil do usuário:', profileError);
      return NextResponse.json(
        { success: false, error: 'Perfil do usuário não encontrado' },
        { status: 403 }
      );
    }

    if (userProfile.user_role !== 'cms' || !userProfile.authorized) {
      return NextResponse.json(
        { success: false, error: 'Usuário não tem permissão para alterar senhas' },
        { status: 403 }
      );
    }

    // Usar a função SQL para alterar a senha (com service role)
    console.log('🔄 Chamando função SQL update_psicologo_password...');
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('update_psicologo_password', {
      psicologo_id_param: user_id,
      new_password_param: new_password,
      changed_by_id: user.id
    });

    if (rpcError) {
      console.error('Erro na função SQL:', rpcError);
      return NextResponse.json(
        { success: false, error: `Erro na base de dados: ${rpcError.message}` },
        { status: 500 }
      );
    }

    if (!result || !result.success) {
      const errorMessage = result?.error || 'Erro desconhecido na função SQL';
      console.error('Função SQL retornou erro:', errorMessage);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    console.log('✅ Senha alterada com sucesso via SQL:', result);
    return NextResponse.json({
      success: true,
      message: result.message,
      user_id: result.user_id,
      user_name: result.user_name,
      created: result.created || false
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Rota de teste para verificar conectividade
export async function GET() {
  try {
    // Testar se as variáveis de ambiente estão configuradas
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Testar conexão com a função SQL
    let functionExists = false;
    try {
      const { data, error } = await supabaseAdmin.rpc('test_password_update_config');
      functionExists = !error && !!data;
    } catch {
      functionExists = false;
    }

    return NextResponse.json({
      success: true,
      message: 'API funcionando - usando função SQL',
      config: {
        hasServiceRole,
        hasAnonKey, 
        hasUrl,
        functionExists
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({
      error: 'Erro no teste básico',
      message: err instanceof Error ? err.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 