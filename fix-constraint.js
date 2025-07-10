const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (você precisa configurar as variáveis de ambiente)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!');
  console.log('Configure:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixConstraint() {
  console.log('🔧 Corrigindo constraint profiles_user_role_check...');
  
  try {
    // Primeiro remover constraint existente
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;'
    });

    if (dropError) {
      console.log('⚠️ Aviso ao remover constraint:', dropError.message);
    }

    // Criar novo constraint com todos os roles
    const { error: addError } = await supabase.rpc('exec_sql', {
      query: `ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_role_check 
              CHECK (user_role IN ('app', 'cms', 'psicologo', 'psicologos'));`
    });

    if (addError) {
      console.error('❌ Erro ao criar constraint:', addError);
      
      // Vamos verificar os dados existentes
      console.log('🔍 Verificando dados existentes...');
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_role, count(*)')
        .group('user_role');
      
      if (profiles) {
        console.log('📊 Roles encontrados na base de dados:');
        profiles.forEach(p => {
          console.log(`  - ${p.user_role}: ${p.count} registros`);
        });
      }
      
      return;
    }

    console.log('✅ Constraint corrigido com sucesso!');
    console.log('Agora aceita: app, cms, psicologo, psicologos');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
  fixConstraint();
}

module.exports = { fixConstraint }; 