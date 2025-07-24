// Carregar variáveis de ambiente do .env.local
require('dotenv').config({ path: '.env.local' });

console.log('ENV TEST:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('ANON KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Definida' : 'Não definida');
console.log('SERVICE ROLE:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Definida' : 'Não definida');
