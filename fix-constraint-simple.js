const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de ambiente do .env.local se existir
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!');
  console.log('Configure no arquivo .env.local:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui');
  console.log('SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixConstraint() {
  console.log('🔧 Iniciando correção do constraint...');
  
  try {
    // Verificar roles existentes primeiro
    console.log('🔍 Verificando roles atuais na base de dados...');
    const { data: currentProfiles, error: selectError } = await supabase
      .from('profiles')
      .select('user_role')
      .not('user_role', 'is', null);

    if (selectError) {
      console.error('❌ Erro ao consultar profiles:', selectError);
      return;
    }

    // Contar roles
    const roleCounts = {};
    currentProfiles.forEach(p => {
      roleCounts[p.user_role] = (roleCounts[p.user_role] || 0) + 1;
    });

    console.log('📊 Roles encontrados:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`  - "${role}": ${count} registros`);
    });

    // Executar SQL para corrigir constraint via RPC
    console.log('\n🔧 Executando correção do constraint...');
    
    const sqlCommand = `
    DO $$ 
    BEGIN
        -- Remover constraint existente
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;
        
        -- Adicionar novo constraint com todos os roles válidos
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_role_check 
        CHECK (user_role IN ('app', 'cms', 'psicologo', 'psicologos'));
        
        RAISE NOTICE 'Constraint atualizado para aceitar: app, cms, psicologo, psicologos';
    END $$;
    `;

    // Tentar executar o SQL
    const { data, error } = await supabase.rpc('sql', { 
      query: sqlCommand 
    });

    if (error) {
      console.error('❌ Erro na execução SQL:', error);
      
      // Tentar método alternativo se 'sql' RPC não existir
      console.log('🔄 Tentando método alternativo...');
      
      // Método 1: Executar comandos separados
      const { error: dropError } = await supabase.rpc('sql', {
        query: 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;'
      });
      
      if (dropError && !dropError.message.includes('does not exist')) {
        console.error('❌ Erro ao remover constraint:', dropError);
        return;
      }
      
      const { error: addError } = await supabase.rpc('sql', {
        query: `ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_role_check 
                CHECK (user_role IN ('app', 'cms', 'psicologo', 'psicologos'));`
      });
      
      if (addError) {
        console.error('❌ Erro ao adicionar constraint:', addError);
        console.log('\n💡 SOLUÇÃO MANUAL:');
        console.log('Execute este SQL no Supabase SQL Editor:');
        console.log('```sql');
        console.log(sqlCommand);
        console.log('```');
        return;
      }
    }

    console.log('✅ Constraint corrigido com sucesso!');
    console.log('Agora a tabela profiles aceita os roles: app, cms, psicologo, psicologos');

  } catch (error) {
    console.error('❌ Erro geral:', error);
    console.log('\n💡 SOLUÇÃO MANUAL:');
    console.log('Execute este SQL no Supabase SQL Editor:');
    console.log('```sql');
    console.log(`
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_role_check 
    CHECK (user_role IN ('app', 'cms', 'psicologo', 'psicologos'));
    `);
    console.log('```');
  }
}

fixConstraint(); 