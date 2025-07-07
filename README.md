# CMS Comfy - Sistema de Administração

Sistema de administração com autenticação segura baseada em roles para o Comfy App.

## 🔐 Sistema de Autenticação

Este CMS implementa um sistema robusto de autenticação que verifica se o usuário tem o role "cms" para acessar o sistema.

### Características de Segurança

- ✅ **Verificação dupla**: Autenticação Supabase + Verificação de role na base de dados
- ✅ **Proteção de rotas**: Middleware automático + AuthGuard nos componentes
- ✅ **Roles granulares**: Sistema de roles "app" (mobile) vs "cms" (administração)
- ✅ **Estados de autorização**: Pendente, Autorizada, Rejeitada
- ✅ **Logs de auditoria**: Todas as ações são registadas

### Fluxo de Segurança

1. **Login**: Utilizador insere credenciais
2. **Verificação de role**: Sistema verifica se user_role = "cms"  
3. **Verificação de autorização**: Sistema verifica se authorized = TRUE
4. **Autenticação Supabase**: Login real no Supabase Auth
5. **Acesso concedido**: Utilizador acede ao dashboard

## 🚀 Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=sua_supabase_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui  
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

### 2. Base de Dados

Execute o schema SQL fornecido em `md/schema_supabase_with_roles.sql` no SQL Editor do Supabase.

### 3. Instalação

```bash
npm install
npm run dev
```

## 📊 Estrutura da Base de Dados

### Tabela `profiles`
- `user_role`: 'app' | 'cms' (define acesso ao sistema)
- `authorized`: NULL | TRUE | FALSE (estado de aprovação)
- Outros campos de perfil...

### Funções Principais
- `can_user_login_with_role(email, role)`: Verifica permissões
- `authorize_account()`: Autoriza conta pendente
- `change_user_role()`: Altera role do utilizador

## 🛡️ Proteção de Rotas

### Middleware Automático
- Protege rotas `/dashboard/*` automaticamente
- Redireciona utilizadores não autenticados para `/login`
- Redireciona utilizadores já logados para dashboard

### AuthGuard Component
- Verificação adicional de role em cada página
- Mensagens de erro específicas por tipo de rejeição
- Logout automático se access for negado

## 🎯 Como Usar

### Para Administradores

1. **Login**: Aceda a `/login` com credenciais de utilizador role "cms"
2. **Dashboard**: Navegue entre "Novo Conteúdo" e "Gerir Conteúdo" 
3. **Logout**: Use o botão "Terminar Sessão" na sidebar

### Códigos de Erro Comum

- `USER_NOT_FOUND`: Utilizador não existe
- `ACCOUNT_NOT_AUTHORIZED`: Conta não aprovada pelo responsável  
- `INSUFFICIENT_PERMISSIONS`: Role incorreto (não é "cms")
- `INVALID_CREDENTIALS`: Email/password incorretos

## 🔧 Desenvolvimento

### Tecnologias Usadas

- **Next.js 15** - Framework React
- **Supabase** - Backend e autenticação
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones

### Estrutura de Arquivos

```
src/
├── app/                    # Páginas Next.js
│   ├── dashboard/         # Páginas protegidas do CMS
│   ├── login/            # Página de login
│   └── page.tsx          # Página inicial com redirect
├── components/            # Componentes reutilizáveis
│   ├── AuthGuard.tsx     # Proteção de componentes
│   └── CMSLayout.tsx     # Layout do CMS
├── lib/                  # Configurações
│   └── supabase.ts       # Cliente Supabase
├── services/             # Lógica de negócio
│   └── auth.ts           # Serviço de autenticação
├── types/                # Tipos TypeScript
│   └── auth.ts           # Tipos de autenticação
└── middleware.ts         # Middleware de proteção
```

## 📝 Logs e Auditoria

Todas as ações importantes são registadas na tabela `authorization_logs`:
- Criação de contas
- Autorizações/Rejeições  
- Mudanças de role
- Tentativas de login

## 🚨 Importante

- **Apenas utilizadores com role "cms" podem aceder**
- **Contas devem estar autorizadas (authorized = TRUE)**
- **Todas as verificações são feitas server-side**
- **Logs de auditoria mantém histórico completo**

---

Para dúvidas ou problemas, consulte os logs da aplicação ou verifique as configurações do Supabase.
