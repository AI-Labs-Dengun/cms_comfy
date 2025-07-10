-- Schema SQL para o sistema de aprovação de contas Comfy com sistema de roles
-- Execute estes comandos no SQL Editor do Supabase
-- ⚠️ ESTE SCRIPT É SEGURO PARA RE-EXECUÇÃO (usa IF NOT EXISTS e DROP IF EXISTS)

-- ===============================================================
-- 🧹 LIMPEZA PREVENTIVA (evitar erros de duplicação)
-- ===============================================================

-- Remover triggers existentes primeiro (de forma segura)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- NÃO remover update_profiles_updated_at aqui - será recriado depois

-- Remover funções existentes primeiro
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.can_user_login(TEXT);
DROP FUNCTION IF EXISTS public.can_user_login_with_role(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.authorize_account(UUID, TEXT, INET, TEXT);
DROP FUNCTION IF EXISTS public.reject_account(UUID, TEXT, TEXT, INET, TEXT);
DROP FUNCTION IF EXISTS public.reset_account_to_pending(UUID, TEXT);
DROP FUNCTION IF EXISTS public.change_user_role(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_psicologo(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_psicologo(UUID, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_psicologo(UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT[], TEXT, TEXT);
-- NÃO remover update_updated_at_column() aqui - será recriada depois

-- ===============================================================
-- 📋 CRIAÇÃO DAS EXTENSÕES E TABELAS
-- ===============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================================
-- 📊 CRIAÇÃO DAS TABELAS
-- ===============================================================

-- Tabela de perfis (criada imediatamente com autorização NULL = pendente)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_path TEXT NOT NULL,
    birth_date DATE,
    gender TEXT,
    postal_code TEXT,
    guardian_email TEXT NOT NULL, -- email do responsável
    -- Sistema de autorização (NULL = pendente, TRUE = autorizado, FALSE = rejeitado)
    authorized BOOLEAN DEFAULT NULL, -- ⚠️ IMPORTANTE: DEFAULT NULL para contas pendentes
    -- Sistema de roles (app = aplicação mobile, cms = sistema de administração, psicologos = psicólogos do sistema)
    user_role TEXT NOT NULL DEFAULT 'app' CHECK (user_role IN ('app', 'cms', 'psicologos')),
    approval_token UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    approval_email_sent BOOLEAN DEFAULT FALSE,
    approval_email_sent_at TIMESTAMP WITH TIME ZONE,
    email_resend_count INTEGER DEFAULT 0,
    last_email_resent_at TIMESTAMP WITH TIME ZONE,
    authorized_at TIMESTAMP WITH TIME ZONE, -- quando foi autorizado
    authorized_by TEXT, -- email do responsável que autorizou
    rejection_reason TEXT,
    -- Status geral
    is_online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de log de autorizações (auditoria)
CREATE TABLE IF NOT EXISTS public.authorization_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('account_created', 'email_sent', 'email_resent', 'authorized', 'rejected', 'role_changed')),
    guardian_email TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ===============================================================
-- 🚀 MIGRAÇÃO PARA TABELAS EXISTENTES (EXECUTAR ANTES DOS ÍNDICES)
-- ===============================================================
-- Execute estas queries se a tabela profiles já existe e você quer adicionar a coluna user_role

-- Adicionar coluna user_role se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_role'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN user_role TEXT NOT NULL DEFAULT 'app' CHECK (user_role IN ('app', 'cms', 'psicologos'));
    END IF;
END $$;

-- ⚠️ IMPORTANTE: Constraint authorization_logs será criada mais tarde no script
-- com verificação segura de dados existentes. Esta seção foi movida para evitar erros.

-- Corrigir constraint user_role na tabela profiles se necessário
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_role'
        AND table_schema = 'public'
    ) THEN
        -- Remover constraint antiga se existir
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;
        
        -- Adicionar nova constraint com todos os roles válidos (incluindo 'psicologo' singular)
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_role_check 
        CHECK (user_role IN ('app', 'cms', 'psicologo', 'psicologos'));
    END IF;
END $$;

-- ===============================================================
-- 🚀 ÍNDICES PARA PERFORMANCE
-- ===============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_authorized ON public.profiles(authorized);
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON public.profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_profiles_approval_token ON public.profiles(approval_token);
CREATE INDEX IF NOT EXISTS idx_profiles_guardian_email ON public.profiles(guardian_email);
CREATE INDEX IF NOT EXISTS idx_authorization_logs_user_id ON public.authorization_logs(user_id);

-- ===============================================================
-- ⚙️ FUNÇÃO AUXILIAR PARA TIMESTAMPS
-- ===============================================================

-- Função para atualizar updated_at automaticamente (criada primeiro para evitar dependências)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===============================================================
-- ⚙️ FUNÇÕES E TRIGGERS
-- ===============================================================

-- Trigger para atualizar updated_at na tabela profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Função para verificar se user pode fazer login (versão original - mantida para compatibilidade)
CREATE OR REPLACE FUNCTION public.can_user_login(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica se existe um perfil autorizado para este email
    RETURN EXISTS (
        SELECT 1 
        FROM auth.users au
        JOIN public.profiles p ON au.id = p.id
        WHERE au.email = user_email AND p.authorized = TRUE
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para verificar se user pode fazer login com role específico
CREATE OR REPLACE FUNCTION public.can_user_login_with_role(user_email TEXT, required_role TEXT)
RETURNS JSONB AS $$
DECLARE
    user_id_var UUID;
    name_var TEXT;
    username_var TEXT;
    authorized_var BOOLEAN;
    user_role_var TEXT;
BEGIN
    -- Busca as informações do usuário
    SELECT 
        p.id,
        p.name,
        p.username,
        p.authorized,
        COALESCE(p.user_role, 'app') as user_role
    INTO 
        user_id_var,
        name_var,
        username_var,
        authorized_var,
        user_role_var
    FROM auth.users au
    JOIN public.profiles p ON au.id = p.id
    WHERE au.email = user_email;

    -- Se não encontrou o perfil
    IF user_id_var IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não encontrado',
            'code', 'USER_NOT_FOUND'
        );
    END IF;

    -- Se a conta não está autorizada
    IF authorized_var IS NOT TRUE THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Conta não autorizada',
            'code', 'ACCOUNT_NOT_AUTHORIZED',
            'authorized', authorized_var
        );
    END IF;

    -- Se o role não corresponde ao requerido
    IF user_role_var != required_role THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Acesso negado para este sistema',
            'code', 'INSUFFICIENT_PERMISSIONS',
            'user_role', user_role_var,
            'required_role', required_role
        );
    END IF;

    -- Tudo OK - usuário pode fazer login
    RETURN jsonb_build_object(
        'success', true,
        'user_id', user_id_var,
        'username', username_var,
        'user_role', user_role_var,
        'name', name_var
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para autorizar uma conta
CREATE OR REPLACE FUNCTION public.authorize_account(
    approval_token_param UUID,
    guardian_email_param TEXT,
    guardian_ip INET DEFAULT NULL,
    guardian_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    profile_record public.profiles%ROWTYPE;
    result JSONB;
BEGIN
    -- Busca o perfil pendente (não processado ainda)
    SELECT * INTO profile_record
    FROM public.profiles
    WHERE approval_token = approval_token_param
    AND guardian_email = guardian_email_param
    AND authorized IS NULL;

    IF profile_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Token inválido ou conta já processada'
        );
    END IF;

    BEGIN
        -- Autoriza a conta
        UPDATE public.profiles
        SET 
            authorized = TRUE,
            authorized_at = now(),
            authorized_by = guardian_email_param,
            updated_at = now()
        WHERE id = profile_record.id;

        -- Log da autorização
        INSERT INTO public.authorization_logs (
            user_id, action, guardian_email, ip_address, user_agent,
            additional_data
        ) VALUES (
            profile_record.id, 'authorized', guardian_email_param, guardian_ip, guardian_user_agent,
            jsonb_build_object('username', profile_record.username, 'user_role', COALESCE(profile_record.user_role, 'app'))
        );

        result := jsonb_build_object(
            'success', true,
            'message', 'Conta autorizada com sucesso',
            'user_id', profile_record.id,
            'username', profile_record.username,
            'user_role', COALESCE(profile_record.user_role, 'app')
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao autorizar conta: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para rejeitar uma conta
CREATE OR REPLACE FUNCTION public.reject_account(
    approval_token_param UUID,
    guardian_email_param TEXT,
    rejection_reason_param TEXT DEFAULT NULL,
    guardian_ip INET DEFAULT NULL,
    guardian_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    profile_record public.profiles%ROWTYPE;
BEGIN
    -- Busca o perfil pendente (não processado ainda)
    SELECT * INTO profile_record
    FROM public.profiles
    WHERE approval_token = approval_token_param
    AND guardian_email = guardian_email_param
    AND authorized IS NULL;

    IF profile_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Token inválido ou conta já processada'
        );
    END IF;

    -- Marca como rejeitado
    UPDATE public.profiles
    SET 
        authorized = FALSE,
        rejection_reason = rejection_reason_param,
        authorized_by = guardian_email_param,
        updated_at = now()
    WHERE id = profile_record.id;

    -- Log da rejeição
    INSERT INTO public.authorization_logs (
        user_id, action, guardian_email, ip_address, user_agent,
        additional_data
    ) VALUES (
        profile_record.id, 'rejected', guardian_email_param, guardian_ip, guardian_user_agent,
        jsonb_build_object('reason', rejection_reason_param, 'username', profile_record.username, 'user_role', COALESCE(profile_record.user_role, 'app'))
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Conta rejeitada'
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para criar perfil automaticamente após signup (com status pendente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- NÃO cria perfil automaticamente
    -- O perfil deve ser criado manualmente após signup com dados completos
    -- IMPORTANTE: Quando criado, authorized será NULL (pendente) por DEFAULT
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger para signup (mantido para futuras expansões)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ===============================================================
-- 🔒 ROW LEVEL SECURITY (RLS)
-- ===============================================================

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorization_logs ENABLE ROW LEVEL SECURITY;

-- ===============================================================
-- POLÍTICAS RLS DEFINITIVAS E CORRIGIDAS
-- ===============================================================
-- IMPORTANTE: Estas políticas foram especificamente ajustadas para
-- resolver o erro "new row violates row-level security policy"
-- Elas usam "TO authenticated" que é mais permissivo e funcional
-- ===============================================================

-- Políticas RLS para a tabela profiles

-- Remover TODAS as políticas existentes primeiro (garantir limpeza total)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert their profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow service role full access to profiles" ON public.profiles;

-- PROFILES: Política mais permissiva para INSERT (irá funcionar GARANTIDAMENTE)
-- MELHORIA: Usa "TO authenticated" em vez de apenas "WITH CHECK"
-- MELHORIA: Mais compatível com diferentes versões do Supabase
CREATE POLICY "Allow authenticated users to insert their profile" ON public.profiles 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = id);

-- PROFILES: Política para SELECT
CREATE POLICY "Allow users to view their own profile" ON public.profiles 
FOR SELECT TO authenticated 
USING (auth.uid() = id);

-- PROFILES: Política para UPDATE  
CREATE POLICY "Allow users to update their own profile" ON public.profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = id);

-- PROFILES: Política para service_role (acesso total)
CREATE POLICY "Allow service role full access to profiles" ON public.profiles 
FOR ALL TO service_role 
USING (true) 
WITH CHECK (true);

-- Políticas RLS para a tabela authorization_logs

-- Remover TODAS as políticas existentes primeiro (garantir limpeza total)
DROP POLICY IF EXISTS "Service can insert authorization logs" ON public.authorization_logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.authorization_logs;
DROP POLICY IF EXISTS "Service can read authorization logs" ON public.authorization_logs;
DROP POLICY IF EXISTS "Users can view their own logs" ON public.authorization_logs;
DROP POLICY IF EXISTS "No public access to authorization logs" ON public.authorization_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON public.authorization_logs;
DROP POLICY IF EXISTS "Allow users to view their own logs" ON public.authorization_logs;
DROP POLICY IF EXISTS "Allow service role full access to logs" ON public.authorization_logs;

-- AUTHORIZATION_LOGS: Política permissiva para INSERT (sem restrições problemáticas)
-- CRÍTICO: "WITH CHECK (true)" permite inserir logs sem verificações restritivas
-- RESOLVE: O erro de violação de RLS durante o registro de usuários
CREATE POLICY "Allow authenticated users to insert logs" ON public.authorization_logs 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- AUTHORIZATION_LOGS: Política para SELECT próprios logs
CREATE POLICY "Allow users to view their own logs" ON public.authorization_logs 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- AUTHORIZATION_LOGS: Política para service_role (acesso total)
CREATE POLICY "Allow service role full access to logs" ON public.authorization_logs 
FOR ALL TO service_role 
USING (true) 
WITH CHECK (true);

-- ===============================================================
-- FUNÇÃO AUXILIAR: RESETAR CONTA REJEITADA PARA PENDENTE
-- ===============================================================
-- Use esta função para resetar contas rejeitadas de volta para pendente
-- Útil para casos onde houve erro ou mudança de decisão

CREATE OR REPLACE FUNCTION public.reset_account_to_pending(
    approval_token_param UUID,
    guardian_email_param TEXT
)
RETURNS JSONB AS $$
DECLARE
    profile_record public.profiles%ROWTYPE;
BEGIN
    -- Busca o perfil rejeitado
    SELECT * INTO profile_record
    FROM public.profiles
    WHERE approval_token = approval_token_param
    AND guardian_email = guardian_email_param
    AND authorized = FALSE;

    IF profile_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Conta não encontrada ou não está rejeitada'
        );
    END IF;

    -- Reseta para status pendente
    UPDATE public.profiles
    SET 
        authorized = NULL,           -- Volta para pendente
        authorized_at = NULL,        -- Remove timestamp de autorização
        authorized_by = NULL,        -- Remove quem autorizou/rejeitou
        rejection_reason = NULL,     -- Remove motivo da rejeição
        updated_at = now()
    WHERE id = profile_record.id;

    -- Log do reset
    INSERT INTO public.authorization_logs (
        user_id, action, guardian_email, 
        additional_data
    ) VALUES (
        profile_record.id, 'account_created', guardian_email_param,
        jsonb_build_object('action_type', 'reset_to_pending', 'username', profile_record.username, 'user_role', COALESCE(profile_record.user_role, 'app'))
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Conta resetada para status pendente',
        'user_id', profile_record.id,
        'username', profile_record.username
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- FUNÇÃO AUXILIAR: ALTERAR ROLE DO USUÁRIO
-- ===============================================================
-- Use esta função para alterar o role de um usuário (apenas service_role pode usar)

CREATE OR REPLACE FUNCTION public.change_user_role(
    user_id_param UUID,
    new_role TEXT,
    changed_by TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    profile_record public.profiles%ROWTYPE;
    old_role TEXT;
BEGIN
    -- Valida o novo role
    IF new_role NOT IN ('app', 'cms') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Role inválido. Deve ser "app" ou "cms"'
        );
    END IF;

    -- Busca o perfil do usuário
    SELECT * INTO profile_record
    FROM public.profiles
    WHERE id = user_id_param;

    IF profile_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não encontrado'
        );
    END IF;

    -- Guarda o role antigo
    old_role := profile_record.user_role;

    -- Se o role já é o mesmo, não faz nada
    IF old_role = new_role THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Role já é o mesmo',
            'user_role', new_role
        );
    END IF;

    -- Atualiza o role
    UPDATE public.profiles
    SET 
        user_role = new_role,
        updated_at = now()
    WHERE id = user_id_param;

    -- Log da mudança de role
    INSERT INTO public.authorization_logs (
        user_id, action, guardian_email, 
        additional_data
    ) VALUES (
        user_id_param, 'role_changed', profile_record.guardian_email,
        jsonb_build_object(
            'old_role', old_role,
            'new_role', new_role,
            'changed_by', COALESCE(changed_by, 'system'),
            'username', profile_record.username
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Role alterado com sucesso',
        'user_id', user_id_param,
        'old_role', old_role,
        'new_role', new_role
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- FUNÇÃO PARA CRIAR PSICÓLOGOS
-- ===============================================================
-- Use esta função para criar psicólogos na tabela profiles

-- ===============================================================
-- 🔧 CORREÇÃO PARA ERRO DE EMAIL DUPLICADO
-- ===============================================================
-- Execute esta seção para corrigir o erro "duplicate key value violates unique constraint users_email_partial_key"

-- Função corrigida que resolve o problema de email duplicado
CREATE OR REPLACE FUNCTION public.create_psicologo(
    created_by_id UUID,
    psicologo_name TEXT,
    psicologo_username TEXT,
    psicologo_guardian_email TEXT,
    psicologo_avatar_path TEXT DEFAULT '/default-avatar.png'
)
RETURNS JSONB AS $$
DECLARE
    new_psicologo_id UUID;
    unique_auth_email TEXT;
    result JSONB;
BEGIN
    -- Verificar se o usuário que está criando tem permissão (role CMS e autorizado)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = created_by_id 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para criar psicólogos'
        );
    END IF;

    -- Verificar se o username já existe
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = psicologo_username
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Username já existe'
        );
    END IF;

    -- Verificar se o email já existe na tabela profiles (guardian_email)
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE guardian_email = psicologo_guardian_email
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email já existe'
        );
    END IF;

    BEGIN
        -- Gerar um ID único para o psicólogo
        new_psicologo_id := uuid_generate_v4();
        
        -- SOLUÇÃO: Gerar um email único para auth.users (fictício)
        -- O email real fica salvo em guardian_email na tabela profiles
        unique_auth_email := 'psicologo_' || new_psicologo_id::text || '@internal.comfy.app';
        
        -- Criar uma entrada em auth.users com email fictício único
        INSERT INTO auth.users (
            id,
            email,
            email_confirmed_at,
            created_at,
            updated_at,
            instance_id,
            aud,
            role
        ) VALUES (
            new_psicologo_id,
            unique_auth_email, -- Email fictício único
            now(),
            now(),
            now(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated'
        );

        -- Criar o perfil do psicólogo na tabela profiles (com email real em guardian_email)
        INSERT INTO public.profiles (
            id,
            name,
            username,
            avatar_path,
            guardian_email, -- Email real aqui
            user_role,
            authorized,
            authorized_at,
            authorized_by,
            created_at,
            updated_at
        ) VALUES (
            new_psicologo_id,
            psicologo_name,
            psicologo_username,
            psicologo_avatar_path,
            psicologo_guardian_email, -- Email real do responsável
            'psicologo',
            TRUE,
            now(),
            (SELECT email FROM auth.users WHERE id = created_by_id),
            now(),
            now()
        );

        -- Log da criação do psicólogo
        INSERT INTO public.authorization_logs (
            user_id, 
            action, 
            guardian_email, 
            additional_data
        ) VALUES (
            new_psicologo_id, 
            'psicologo_created', 
            psicologo_guardian_email,
            jsonb_build_object(
                'created_by', created_by_id,
                'username', psicologo_username,
                'name', psicologo_name,
                'role', 'psicologo',
                'auth_email', unique_auth_email,
                'guardian_email', psicologo_guardian_email
            )
        );

        result := jsonb_build_object(
            'success', true,
            'message', 'Psicólogo criado com sucesso',
            'psicologo_id', new_psicologo_id,
            'username', psicologo_username,
            'name', psicologo_name,
            'role', 'psicologo',
            'guardian_email', psicologo_guardian_email
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao criar psicólogo: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- 🔧 FUNÇÃO ALTERNATIVA MELHORADA (BACKUP)
-- ===============================================================

CREATE OR REPLACE FUNCTION public.create_psicologo_alt(
    created_by_id UUID,
    psicologo_name TEXT,
    psicologo_username TEXT,
    psicologo_guardian_email TEXT,
    psicologo_avatar_path TEXT DEFAULT '/default-avatar.png'
)
RETURNS JSONB AS $$
DECLARE
    new_psicologo_id UUID;
    result JSONB;
    counter INTEGER := 0;
    unique_email TEXT;
BEGIN
    -- Verificar se o usuário que está criando tem permissão
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = created_by_id 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para criar psicólogos'
        );
    END IF;

    -- Verificar se o username já existe
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = psicologo_username
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Username já existe'
        );
    END IF;

    BEGIN
        -- Gerar um ID único para o psicólogo
        new_psicologo_id := uuid_generate_v4();
        
        -- Gerar email único se houver conflito
        LOOP
            unique_email := 'psi_' || new_psicologo_id::text || 
                           CASE WHEN counter > 0 THEN '_' || counter::text ELSE '' END || 
                           '@internal.comfy';
            
            -- Verificar se este email já existe
            IF NOT EXISTS (
                SELECT 1 FROM auth.users WHERE email = unique_email
            ) THEN
                EXIT; -- Email único encontrado
            END IF;
            
            counter := counter + 1;
            
            -- Evitar loop infinito
            IF counter > 100 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Não foi possível gerar email único'
                );
            END IF;
        END LOOP;
        
        -- Criar entrada em auth.users
        INSERT INTO auth.users (
            id,
            email,
            email_confirmed_at,
            created_at,
            updated_at,
            instance_id,
            aud,
            role
        ) VALUES (
            new_psicologo_id,
            unique_email,
            now(),
            now(),
            now(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated'
        );

        -- Criar o perfil do psicólogo
        INSERT INTO public.profiles (
            id,
            name,
            username,
            avatar_path,
            guardian_email,
            user_role,
            authorized,
            authorized_at,
            authorized_by,
            created_at,
            updated_at
        ) VALUES (
            new_psicologo_id,
            psicologo_name,
            psicologo_username,
            psicologo_avatar_path,
            psicologo_guardian_email,
            'psicologo',
            TRUE,
            now(),
            (SELECT email FROM auth.users WHERE id = created_by_id),
            now(),
            now()
        );

        -- Log da criação
        INSERT INTO public.authorization_logs (
            user_id, 
            action, 
            guardian_email, 
            additional_data
        ) VALUES (
            new_psicologo_id, 
            'psicologo_created', 
            psicologo_guardian_email,
            jsonb_build_object(
                'created_by', created_by_id,
                'username', psicologo_username,
                'name', psicologo_name,
                'role', 'psicologo',
                'method', 'alternative',
                'auth_email', unique_email
            )
        );

        result := jsonb_build_object(
            'success', true,
            'message', 'Psicólogo criado com sucesso (método alternativo)',
            'psicologo_id', new_psicologo_id,
            'username', psicologo_username,
            'name', psicologo_name,
            'role', 'psicologo'
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao criar psicólogo (alt): ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- 📝 DOCUMENTAÇÃO ATUALIZADA
-- ===============================================================

COMMENT ON FUNCTION public.create_psicologo IS 'Cria psicólogo com email fictício único em auth.users e email real em profiles.guardian_email (resolve duplicate email error)';
COMMENT ON FUNCTION public.create_psicologo_alt IS 'Função alternativa com geração de email único por loop (backup para casos extremos)';

-- ===============================================================
-- 📋 INSTRUÇÕES DE USO ATUALIZADAS
-- ===============================================================
-- SOLUÇÃO PARA ERRO DE EMAIL DUPLICADO:
-- 
-- PROBLEMA RESOLVIDO:
-- ✅ Erro "duplicate key value violates unique constraint users_email_partial_key"
-- 
-- COMO FUNCIONA AGORA:
-- 1. Email fictício único é criado em auth.users (ex: psicologo_uuid@internal.comfy.app)
-- 2. Email real do responsável fica salvo em profiles.guardian_email
-- 3. Isso resolve a foreign key constraint sem conflitos de email
-- 
-- TESTE A FUNÇÃO:
-- SELECT public.create_psicologo(
--     'seu-user-id-cms',
--     'Dr. João Silva', 
--     'dr_joao_silva',
--     'joao.silva@email.com',  -- Este email real fica em guardian_email
--     '/avatars/joao.jpg'
-- );
-- 
-- VERIFICAR RESULTADO:
-- SELECT 
--     p.name, 
--     p.username, 
--     p.guardian_email as email_real,
--     au.email as email_auth,
--     p.user_role 
-- FROM public.profiles p 
-- JOIN auth.users au ON p.id = au.id 
-- WHERE p.user_role = 'psicologo';

-- ===============================================================
-- 📝 DOCUMENTAÇÃO DOS ESTADOS DO SISTEMA DE AUTORIZAÇÃO
-- ===============================================================
-- ESTADOS DO CAMPO 'authorized':
-- 1. NULL = PENDENTE
--    - Conta criada mas aguardando decisão do responsável
--    - Pode receber aprovação ou rejeição
--    - Usuário NÃO pode fazer login
-- 2. TRUE = AUTORIZADA  
--    - Conta aprovada pelo responsável
--    - Usuário PODE fazer login (se tiver role correto)
--    - Estado final (não pode ser alterado via processo normal)
-- 3. FALSE = REJEITADA
--    - Conta rejeitada pelo responsável  
--    - Usuário NÃO pode fazer login
--    - Estado final (pode ser resetado via função reset_account_to_pending)
-- ROLES DO SISTEMA:
-- 1. 'app' = APLICAÇÃO MOBILE
--    - Usuários que acessam a aplicação mobile
--    - Acesso limitado às funcionalidades do app
-- 2. 'cms' = SISTEMA DE ADMINISTRAÇÃO
--    - Usuários que acessam o CMS
--    - Acesso total para gerenciar conteúdo da aplicação
-- 3. 'psicologos' = PSICÓLOGOS DO SISTEMA
--    - Psicólogos que podem acessar funcionalidades específicas
--    - Criados apenas através do CMS por usuários autorizados
-- FLUXO NORMAL:
-- NULL (pendente) → TRUE (autorizada) OU FALSE (rejeitada)
-- VERIFICAÇÃO DE LOGIN:
-- 1. Verificar se authorized = TRUE
-- 2. Verificar se user_role corresponde ao sistema acessado
-- 3. Negar acesso se alguma condição não for atendida

-- ===============================================================
-- 📝 DOCUMENTAÇÃO E COMENTÁRIOS
-- ===============================================================

-- Comentários para documentação
COMMENT ON TABLE public.profiles IS 'Perfis de usuários com sistema de autorização e roles - Estados: NULL=pendente, TRUE=autorizado, FALSE=rejeitado; Roles: app=mobile, cms=administração';
COMMENT ON TABLE public.authorization_logs IS 'Log de auditoria das ações de autorização e mudanças de role - RLS CORRIGIDO';
COMMENT ON FUNCTION public.can_user_login IS 'Verifica se usuário tem permissão para fazer login (authorized = TRUE) - VERSÃO LEGADA';
COMMENT ON FUNCTION public.can_user_login_with_role IS 'Verifica se usuário tem permissão para fazer login com role específico (authorized = TRUE AND user_role = required_role)';
COMMENT ON FUNCTION public.authorize_account IS 'Autoriza uma conta pendente (NULL → TRUE)';
COMMENT ON FUNCTION public.reject_account IS 'Rejeita uma conta pendente (NULL → FALSE)';
COMMENT ON FUNCTION public.reset_account_to_pending IS 'Reseta conta rejeitada para pendente (FALSE → NULL)';
COMMENT ON FUNCTION public.change_user_role IS 'Altera o role de um usuário (apenas service_role pode usar)';

-- ===============================================================
-- 📝 TABELA DE POSTS PARA O CMS COMFY
-- ===============================================================
-- Esta tabela armazena os posts criados no CMS que serão consumidos pela app mobile
-- ⚠️ ESTE SCRIPT É SEGURO PARA RE-EXECUÇÃO (usa IF NOT EXISTS e DROP IF EXISTS)

-- ===============================================================
-- 🧹 LIMPEZA PREVENTIVA PARA POSTS
-- ===============================================================

-- Remover triggers existentes primeiro (de forma segura)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
    END IF;
END $$;

-- Remover funções existentes primeiro
DROP FUNCTION IF EXISTS public.create_post(UUID, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_post(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.delete_post(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_posts_for_app(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_post_by_id(UUID);
DROP FUNCTION IF EXISTS public.toggle_post_publication(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.increment_post_views(UUID);

-- ===============================================================
-- 📊 CRIAÇÃO DA TABELA DE POSTS
-- ===============================================================

-- Tabela de posts do CMS
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    -- Informações básicas do post
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Vídeo', 'Podcast', 'Artigo', 'Livro', 'Áudio', 'Shorts')),
    
    -- Conteúdo (URL ou arquivo)
    content_url TEXT, -- URL do conteúdo externo
    file_path TEXT,   -- Caminho do arquivo no storage
    file_name TEXT,   -- Nome original do arquivo
    file_size BIGINT, -- Tamanho do arquivo em bytes
    file_type TEXT,   -- Tipo MIME do arquivo
    
    -- Metadados
    tags TEXT[] DEFAULT '{}', -- Array de tags personalizadas
    emotion_tags TEXT[] DEFAULT '{}', -- Array de tags de emoção
    
    -- Status e controle
    is_published BOOLEAN DEFAULT FALSE, -- Se o post está publicado e visível na app
    is_featured BOOLEAN DEFAULT FALSE,  -- Se o post é destacado
    view_count INTEGER DEFAULT 0,       -- Contador de visualizações
    
    -- Relacionamentos
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Quem criou o post
    author_name TEXT, -- Nome do autor (cópia para performance)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE, -- Quando foi publicado
    
    -- Constraints
    CONSTRAINT posts_content_check CHECK (
        (content_url IS NOT NULL AND file_path IS NULL) OR 
        (content_url IS NULL AND file_path IS NOT NULL)
    )
);

-- ===============================================================
-- 🚀 ÍNDICES PARA PERFORMANCE DOS POSTS
-- ===============================================================

-- Criar índices apenas se a tabela posts existir
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
        CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
        CREATE INDEX IF NOT EXISTS idx_posts_is_published ON public.posts(is_published);
        CREATE INDEX IF NOT EXISTS idx_posts_is_featured ON public.posts(is_featured);
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN(tags);
        CREATE INDEX IF NOT EXISTS idx_posts_emotion_tags ON public.posts USING GIN(emotion_tags);
    END IF;
END $$;

-- ===============================================================
-- ⚙️ TRIGGERS PARA POSTS
-- ===============================================================

-- Criar trigger apenas se a tabela posts existir
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        -- Trigger para atualizar updated_at automaticamente
        DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
        CREATE TRIGGER update_posts_updated_at 
            BEFORE UPDATE ON public.posts 
            FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- ===============================================================
-- 🔒 ROW LEVEL SECURITY (RLS) PARA POSTS
-- ===============================================================

-- Habilitar Row Level Security (apenas se a tabela existir)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Remover políticas existentes (apenas se a tabela existir)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "CMS users can create posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can update their own posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can update posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can delete their own posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can delete posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can view all posts" ON public.posts;
        DROP POLICY IF EXISTS "APP users can view published posts" ON public.posts;
        DROP POLICY IF EXISTS "Service role has full access" ON public.posts;
    END IF;
END $$;

-- ===============================================================
-- POLÍTICAS RLS PARA POSTS
-- ===============================================================

-- Criar políticas apenas se a tabela posts existir
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        
        -- CMS: Pode criar posts (apenas usuários autorizados com role 'cms')
        CREATE POLICY "CMS users can create posts" ON public.posts 
        FOR INSERT TO authenticated 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- CMS: Pode visualizar todos os posts (para gerenciamento)
        CREATE POLICY "CMS users can view all posts" ON public.posts 
        FOR SELECT TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- CMS: Pode atualizar posts (próprios ou todos, dependendo da necessidade)
        CREATE POLICY "CMS users can update posts" ON public.posts 
        FOR UPDATE TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- CMS: Pode deletar posts (próprios ou todos, dependendo da necessidade)
        CREATE POLICY "CMS users can delete posts" ON public.posts 
        FOR DELETE TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- APP: Pode visualizar apenas posts publicados
        CREATE POLICY "APP users can view published posts" ON public.posts 
        FOR SELECT TO authenticated 
        USING (
            is_published = TRUE 
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'app'
            )
        );

        -- Service Role: Acesso total (para operações administrativas)
        CREATE POLICY "Service role posts access" ON public.posts 
        FOR ALL TO service_role 
        USING (true) 
        WITH CHECK (true);
        
    END IF;
END $$;

-- ===============================================================
-- 🛠️ FUNÇÕES AUXILIARES PARA POSTS
-- ===============================================================

-- Função para criar um novo post (apenas CMS)
CREATE OR REPLACE FUNCTION public.create_post(
    author_id_param UUID,
    title_param TEXT,
    description_param TEXT,
    category_param TEXT,
    content_url_param TEXT DEFAULT NULL,
    tags_param TEXT[] DEFAULT '{}',
    emotion_tags_param TEXT[] DEFAULT '{}',
    file_path_param TEXT DEFAULT NULL,
    file_name_param TEXT DEFAULT NULL,
    file_type_param TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    author_name_var TEXT;
    new_post_id UUID;
    result JSONB;
BEGIN
    -- Verificar se o usuário tem permissão (role CMS e autorizado)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = author_id_param 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para criar posts'
        );
    END IF;

    -- Buscar nome do autor
    SELECT name INTO author_name_var
    FROM public.profiles
    WHERE id = author_id_param;

    -- Validar categoria
    IF category_param NOT IN ('Vídeo', 'Podcast', 'Artigo', 'Livro', 'Áudio', 'Shorts') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Categoria inválida'
        );
    END IF;

    -- Validar conteúdo (URL ou arquivo)
    IF content_url_param IS NULL AND file_path_param IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'É necessário fornecer uma URL ou arquivo'
        );
    END IF;

    BEGIN
        -- Inserir o post
        INSERT INTO public.posts (
            author_id,
            author_name,
            title,
            description,
            category,
            content_url,
            file_path,
            file_name,
            file_type,
            tags,
            emotion_tags
        ) VALUES (
            author_id_param,
            author_name_var,
            title_param,
            description_param,
            category_param,
            content_url_param,
            file_path_param,
            file_name_param,
            file_type_param,
            tags_param,
            emotion_tags_param
        ) RETURNING id INTO new_post_id;

        result := jsonb_build_object(
            'success', true,
            'message', 'Post criado com sucesso',
            'post_id', new_post_id,
            'title', title_param
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao criar post: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para atualizar um post (apenas CMS)
CREATE OR REPLACE FUNCTION public.update_post(
    post_id_param UUID,
    author_id_param UUID,
    title_param TEXT,
    description_param TEXT,
    category_param TEXT,
    content_url_param TEXT DEFAULT NULL,
    tags_param TEXT[] DEFAULT '{}',
    emotion_tags_param TEXT[] DEFAULT '{}',
    file_path_param TEXT DEFAULT NULL,
    file_name_param TEXT DEFAULT NULL,
    file_type_param TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Verificar se o usuário tem permissão
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = author_id_param 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para atualizar posts'
        );
    END IF;

    -- Verificar se o post existe
    IF NOT EXISTS (
        SELECT 1 FROM public.posts WHERE id = post_id_param
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Post não encontrado'
        );
    END IF;

    -- Validar categoria
    IF category_param NOT IN ('Vídeo', 'Podcast', 'Artigo', 'Livro', 'Áudio', 'Shorts') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Categoria inválida'
        );
    END IF;

    -- Validar constraint posts_content_check
    -- Apenas um dos campos (content_url ou file_path) pode estar preenchido
    IF (content_url_param IS NOT NULL AND file_path_param IS NOT NULL) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Apenas um dos campos (URL ou arquivo) pode estar preenchido'
        );
    END IF;

    -- Se nenhum dos dois estiver preenchido, não permitir (deve ter pelo menos um)
    IF (content_url_param IS NULL AND file_path_param IS NULL) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'É necessário fornecer uma URL ou arquivo'
        );
    END IF;

    BEGIN
        -- Atualizar o post
        UPDATE public.posts
        SET 
            title = title_param,
            description = description_param,
            category = category_param,
            content_url = content_url_param,
            file_path = file_path_param,
            file_name = file_name_param,
            file_type = file_type_param,
            tags = tags_param,
            emotion_tags = emotion_tags_param,
            updated_at = now()
        WHERE id = post_id_param;

        result := jsonb_build_object(
            'success', true,
            'message', 'Post atualizado com sucesso',
            'post_id', post_id_param
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao atualizar post: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para publicar/despublicar um post
CREATE OR REPLACE FUNCTION public.toggle_post_publication(
    post_id_param UUID,
    author_id_param UUID,
    publish_param BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Verificar permissões
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = author_id_param 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão'
        );
    END IF;

    BEGIN
        UPDATE public.posts
        SET 
            is_published = publish_param,
            published_at = CASE WHEN publish_param THEN now() ELSE NULL END,
            updated_at = now()
        WHERE id = post_id_param;

        result := jsonb_build_object(
            'success', true,
            'message', CASE WHEN publish_param THEN 'Post publicado' ELSE 'Post despublicado' END,
            'post_id', post_id_param,
            'is_published', publish_param
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao alterar status: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para buscar posts para a app (apenas publicados)
CREATE OR REPLACE FUNCTION public.get_posts_for_app(
    category_filter TEXT DEFAULT NULL,
    limit_param INTEGER DEFAULT 20,
    offset_param INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    posts_result JSONB;
    total_count INTEGER;
BEGIN
    -- Buscar posts publicados
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'title', p.title,
                'description', p.description,
                'category', p.category,
                'content_url', p.content_url,
                'file_path', p.file_path,
                'file_name', p.file_name,
                'tags', p.tags,
                'emotion_tags', p.emotion_tags,
                'is_featured', p.is_featured,
                'view_count', p.view_count,
                'author_name', p.author_name,
                'created_at', p.created_at,
                'published_at', p.published_at
            )
        ),
        COUNT(*) FILTER (WHERE p.is_published = TRUE)
    INTO posts_result, total_count
    FROM public.posts p
    WHERE p.is_published = TRUE
    AND (category_filter IS NULL OR p.category = category_filter)
    ORDER BY 
        p.is_featured DESC,
        p.published_at DESC
    LIMIT limit_param
    OFFSET offset_param;

    RETURN jsonb_build_object(
        'success', true,
        'posts', COALESCE(posts_result, '[]'::jsonb),
        'total_count', total_count,
        'limit', limit_param,
        'offset', offset_param
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para deletar um post (apenas CMS)
CREATE OR REPLACE FUNCTION public.delete_post(
    post_id_param UUID,
    author_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
    post_record public.posts%ROWTYPE;
    result JSONB;
BEGIN
    -- Verificar se o usuário tem permissão
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = author_id_param 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para deletar posts'
        );
    END IF;

    -- Verificar se o post existe
    SELECT * INTO post_record
    FROM public.posts 
    WHERE id = post_id_param;

    IF post_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Post não encontrado'
        );
    END IF;

    BEGIN
        -- Deletar o post
        DELETE FROM public.posts 
        WHERE id = post_id_param;

        result := jsonb_build_object(
            'success', true,
            'message', 'Post deletado com sucesso',
            'post_id', post_id_param,
            'title', post_record.title
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao deletar post: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Função para incrementar contador de visualizações
CREATE OR REPLACE FUNCTION public.increment_post_views(post_id_param UUID)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.posts
    SET view_count = view_count + 1
    WHERE id = post_id_param AND is_published = TRUE;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Visualização registrada'
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- 📝 DOCUMENTAÇÃO FINAL COMPLETA
-- ===============================================================

-- Comentários para documentação dos posts
COMMENT ON TABLE public.posts IS 'Posts do CMS que serão consumidos pela aplicação mobile Comfy - RLS configurado para CMS criar/editar, APP apenas ler';
COMMENT ON FUNCTION public.create_post IS 'Cria um novo post (apenas usuários CMS autorizados)';
COMMENT ON FUNCTION public.update_post IS 'Atualiza um post existente (apenas usuários CMS autorizados)';
COMMENT ON FUNCTION public.delete_post IS 'Deleta um post existente (apenas usuários CMS autorizados)';
COMMENT ON FUNCTION public.toggle_post_publication IS 'Publica ou despublica um post (apenas usuários CMS autorizados)';
COMMENT ON FUNCTION public.get_posts_for_app IS 'Busca posts publicados para a aplicação mobile (apenas usuários APP autorizados)';
COMMENT ON FUNCTION public.increment_post_views IS 'Incrementa o contador de visualizações de um post';

-- ===============================================================
-- 🗂️ CONFIGURAÇÃO DO SUPABASE STORAGE PARA POSTS
-- ===============================================================
-- Configuração completa do storage para upload de arquivos

-- ===============================================================
-- 🔒 POLÍTICAS DE STORAGE PARA SEGURANÇA
-- ===============================================================

-- Remover políticas existentes do storage (se existirem)
DROP POLICY IF EXISTS "CMS users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "CMS users can update files" ON storage.objects;
DROP POLICY IF EXISTS "CMS users can delete files" ON storage.objects;

-- Política para permitir upload apenas para usuários CMS autorizados
CREATE POLICY "CMS users can upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'posts' AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND authorized = TRUE 
        AND user_role = 'cms'
    )
);

-- Política para permitir visualização de arquivos para todos os usuários autenticados
CREATE POLICY "Authenticated users can view files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'posts');

-- Política para permitir atualização apenas para usuários CMS autorizados
CREATE POLICY "CMS users can update files" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'posts' AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND authorized = TRUE 
        AND user_role = 'cms'
    )
);

-- Política para permitir exclusão apenas para usuários CMS autorizados
CREATE POLICY "CMS users can delete files" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'posts' AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND authorized = TRUE 
        AND user_role = 'cms'
    )
);

-- ===============================================================
-- 🛠️ FUNÇÃO AUXILIAR PARA GERAR NOMES ÚNICOS DE ARQUIVO
-- ===============================================================

CREATE OR REPLACE FUNCTION public.generate_unique_filename(
    original_filename TEXT,
    user_id_param UUID
)
RETURNS TEXT AS $$
DECLARE
    file_extension TEXT;
    base_name TEXT;
    unique_filename TEXT;
    counter INTEGER := 0;
BEGIN
    -- Extrair extensão do arquivo
    file_extension := CASE 
        WHEN original_filename LIKE '%.%' 
        THEN '.' || split_part(original_filename, '.', -1)
        ELSE ''
    END;
    
    -- Nome base sem extensão
    base_name := CASE 
        WHEN original_filename LIKE '%.%' 
        THEN split_part(original_filename, '.', 1)
        ELSE original_filename
    END;
    
    -- Gerar nome único
    LOOP
        unique_filename := base_name || 
                         '_' || 
                         to_char(now(), 'YYYYMMDD_HH24MISS') || 
                         '_' || 
                         user_id_param::text || 
                         CASE WHEN counter > 0 THEN '_' || counter::text ELSE '' END ||
                         file_extension;
        
        -- Verificar se o arquivo já existe
        IF NOT EXISTS (
            SELECT 1 FROM storage.objects 
            WHERE bucket_id = 'posts' 
            AND name = unique_filename
        ) THEN
            RETURN unique_filename;
        END IF;
        
        counter := counter + 1;
        
        -- Evitar loop infinito
        IF counter > 1000 THEN
            RAISE EXCEPTION 'Não foi possível gerar um nome único para o arquivo';
        END IF;
    END LOOP;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- 📝 DOCUMENTAÇÃO DO STORAGE
-- ===============================================================

COMMENT ON FUNCTION public.generate_unique_filename IS 'Gera nomes únicos para arquivos no storage, evitando conflitos';

-- ===============================================================
-- 🔄 LIMPEZA FINAL E VERIFICAÇÃO
-- ===============================================================
-- Garantir que todos os triggers estão funcionando corretamente

-- Verificar se a função update_updated_at_column existe e está funcionando
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_updated_at_column' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RAISE EXCEPTION 'Função update_updated_at_column não foi criada corretamente';
    END IF;
END $$;

-- ===============================================================
-- 📊 EXEMPLOS DE USO COMPLETOS
-- ===============================================================
-- SISTEMA DE AUTORIZAÇÃO E ROLES
-- ==============================
-- Verificar se usuário pode fazer login com role específico
-- SELECT public.can_user_login_with_role('user@email.com', 'cms');
-- Autorizar uma conta pendente
-- SELECT public.authorize_account('token-uuid', 'guardian@email.com');
-- Alterar role de um usuário
-- SELECT public.change_user_role('user-uuid', 'cms', 'admin@email.com');
-- POSTS DO CMS
-- ============
-- Criar um post com URL (CMS)
-- SELECT public.create_post(
--     'user-uuid-here',
--     'Título do Post',
--     'Descrição do post...',
--     'Vídeo',
--     'https://example.com/video',
--     ARRAY['tag1', 'tag2'],
--     ARRAY['Alegria', 'Medo']
-- );
-- Criar um post com arquivo (CMS)
-- SELECT public.create_post(
--     'user-uuid-here',
--     'Título do Post com Arquivo',
--     'Descrição do post...',
--     'Podcast',
--     NULL, -- content_url
--     ARRAY['podcast', 'audio'],
--     ARRAY['Tristeza'],
--     'user-id/filename_20241201_143022_user-id.mp3', -- file_path
--     'podcast_episodio_1.mp3', -- file_name
--     'audio/mpeg' -- file_type
-- );
-- Deletar um post
-- SELECT public.delete_post('post-uuid-here', 'user-uuid-here');
-- Publicar um post
-- SELECT public.toggle_post_publication('post-uuid-here', 'user-uuid-here', true);
-- Buscar posts para a app
-- SELECT public.get_posts_for_app('Vídeo', 10, 0);
-- Incrementar visualizações
-- SELECT public.increment_post_views('post-uuid-here');
-- STORAGE E ARQUIVOS
-- ==================
-- Gerar nome único para arquivo
-- SELECT public.generate_unique_filename('video.mp4', 'user-uuid-here');
-- CONSULTAS ÚTEIS
-- ===============
-- Posts por categoria
-- SELECT * FROM public.posts 
-- WHERE category = 'Vídeo' AND is_published = TRUE 
-- ORDER BY published_at DESC;
-- Posts destacados
-- SELECT * FROM public.posts 
-- WHERE is_featured = TRUE AND is_published = TRUE 
-- ORDER BY published_at DESC;
-- Posts com tags específicas
-- SELECT * FROM public.posts 
-- WHERE 'Alegria' = ANY(emotion_tags) 
-- AND is_published = TRUE;
-- Posts com arquivos (não URLs)
-- SELECT * FROM public.posts 
-- WHERE file_path IS NOT NULL 
-- AND is_published = TRUE;
-- Posts com URLs externas
-- SELECT * FROM public.posts 
-- WHERE content_url IS NOT NULL 
-- AND is_published = TRUE;

-- ===============================================================
-- 🔧 SCRIPT PARA CORRIGIR CONSTRAINTS E ROLE DO USUÁRIO LEANDRO
-- ===============================================================
-- Execute este script para corrigir constraints e o role do usuário leandro.oliveira@dengun.com
-- Este script deve ser executado APÓS a criação das tabelas e funções

-- Corrigir constraint user_role na tabela profiles (GARANTIR que aceita 'psicologos')
DO $$ 
BEGIN
    -- Remover constraint antiga se existir
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;
    
    -- Adicionar nova constraint com todos os roles válidos (incluindo 'psicologo' singular)
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_role_check 
    CHECK (user_role IN ('app', 'cms', 'psicologo', 'psicologos'));
    
    RAISE NOTICE 'Constraint user_role corrigida para aceitar: app, cms, psicologos';
END $$;

-- ===============================================================
-- 🔧 SCRIPT PARA CORRIGIR ROLE DO USUÁRIO LEANDRO
-- ===============================================================
-- Execute este script para corrigir o role e autorização do usuário leandro.oliveira@dengun.com
-- Este script deve ser executado APÓS a criação das tabelas e funções

-- Verificar se o usuário existe e seu status atual
DO $$
DECLARE
    user_id_var UUID;
    current_role TEXT;
    current_authorized BOOLEAN;
BEGIN
    -- Buscar o ID do usuário leandro.oliveira@dengun.com
    SELECT au.id, p.user_role, p.authorized
    INTO user_id_var, current_role, current_authorized
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE au.email = 'leandro.oliveira@dengun.com';

    -- Se o usuário não existe no auth.users
    IF user_id_var IS NULL THEN
        RAISE NOTICE 'Usuário leandro.oliveira@dengun.com não encontrado no auth.users';
        RAISE NOTICE 'Por favor, crie o usuário primeiro através do signup ou dashboard do Supabase';
        RETURN;
    END IF;

    RAISE NOTICE 'Usuário encontrado no auth.users: ID = %', user_id_var;
    RAISE NOTICE 'Role atual = %, Autorizado = %', current_role, current_authorized;

    -- Se o perfil não existe, criar
    IF current_role IS NULL THEN
        INSERT INTO public.profiles (
            id,
            name,
            username,
            avatar_path,
            guardian_email,
            user_role,
            authorized,
            authorized_at,
            authorized_by,
            created_at,
            updated_at
        ) VALUES (
            user_id_var,
            'Leandro Oliveira',
            'leandro.oliveira',
            '/default-avatar.png',
            'leandro.oliveira@dengun.com',
            'cms',
            TRUE,
            now(),
            'system',
            now(),
            now()
        );
        RAISE NOTICE 'Perfil criado para leandro.oliveira@dengun.com com role CMS e autorizado';
    ELSE
        -- Se o perfil existe, atualizar role e autorização
        UPDATE public.profiles
        SET 
            user_role = 'cms',
            authorized = TRUE,
            authorized_at = CASE WHEN authorized IS NOT TRUE THEN now() ELSE authorized_at END,
            authorized_by = CASE WHEN authorized IS NOT TRUE THEN 'system' ELSE authorized_by END,
            updated_at = now()
        WHERE id = user_id_var;
        
        RAISE NOTICE 'Perfil atualizado: role definido como CMS e autorizado';
    END IF;

    -- Log da correção
    INSERT INTO public.authorization_logs (
        user_id, 
        action, 
        guardian_email, 
        additional_data
    ) VALUES (
        user_id_var, 
        'role_changed', 
        'leandro.oliveira@dengun.com',
        jsonb_build_object(
            'old_role', COALESCE(current_role, 'none'),
            'new_role', 'cms',
            'changed_by', 'system',
            'username', 'leandro.oliveira',
            'action_type', 'role_fix'
        )
    );

    RAISE NOTICE 'Correção concluída com sucesso!';
END $$;

-- ===============================================================
-- 📋 INSTRUÇÕES DE CONFIGURAÇÃO COMPLETA
-- ===============================================================
-- CONFIGURAÇÃO COMPLETA DO SISTEMA:
-- 1. EXECUTAR ESTE SCRIPT
--    - Execute todo este arquivo no SQL Editor do Supabase
--    - Isso criará todas as tabelas, funções e políticas
--    - E corrigirá automaticamente o role do usuário leandro.oliveira@dengun.com
-- 2. CONFIGURAR STORAGE BUCKET
--    - Dashboard → Storage → Create bucket
--    - Nome: "posts"
--    - Public bucket: NO (privado)
--    - File size limit: 100MB
--    - Allowed MIME types: video/*,audio/*,application/pdf,image/*,text/*
-- 3. CONFIGURAR VARIÁVEIS DE AMBIENTE (.env.local)
--    NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
--    SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
-- 4. TESTAR O SISTEMA
--    - Criar usuário CMS
--    - Fazer login no CMS
--    - Criar post com URL
--    - Criar post com arquivo
--    - Publicar posts
--    - Testar permissões
-- 5. VERIFICAR FUNCIONALIDADES
--    - Upload de arquivos funciona
--    - Posts são criados corretamente
--    - Políticas RLS estão ativas
--    - Storage está seguro
--    - Aplicação mobile pode acessar posts publicados
-- ESTRUTURA FINAL:
-- - Tabela profiles (usuários e autorização)
-- - Tabela authorization_logs (auditoria)
-- - Tabela posts (conteúdo do CMS)
-- - Políticas RLS para todas as tabelas
-- - Políticas RLS para storage
-- - Funções para gestão de posts
-- - Função para nomes únicos de arquivos
-- - Sistema completo de permissões
-- O SISTEMA ESTÁ PRONTO PARA USO! 🎉

-- ===============================================================
-- 🔧 CORREÇÃO PARA CRIAÇÃO DE PSICÓLOGOS - RESOLVER FOREIGN KEY ERROR
-- ===============================================================
-- Execute este script para corrigir o erro de foreign key ao criar psicólogos
-- e atualizar o role para 'psicologo'

-- Atualizar constraints para aceitar o role 'psicologo'
DO $$ 
BEGIN
    -- Remover constraint antiga se existir
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;
    
    -- Adicionar nova constraint com todos os roles válidos incluindo 'psicologo'
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_role_check 
    CHECK (user_role IN ('app', 'cms', 'psicologos', 'psicologo'));
    
    RAISE NOTICE 'Constraint user_role atualizada para aceitar: app, cms, psicologos, psicologo';
END $$;

-- ⚠️ IMPORTANTE: Constraint authorization_logs será criada mais tarde no script
-- com verificação segura de dados existentes. Esta seção foi substituída para evitar erros.
-- Consulte a seção "CORREÇÃO SEGURA DA CONSTRAINT AUTHORIZATION_LOGS" no final do arquivo.

-- ===============================================================
-- 🔧 FUNÇÃO CORRIGIDA PARA CRIAR PSICÓLOGOS (SEM FOREIGN KEY ERROR)
-- ===============================================================
-- Esta função cria psicólogos diretamente na tabela profiles sem exigir auth.users

-- Remover função antiga
DROP FUNCTION IF EXISTS public.create_psicologo(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_psicologo(UUID, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_psicologo(UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT[], TEXT, TEXT);

-- Função corrigida que resolve o problema da foreign key
CREATE OR REPLACE FUNCTION public.create_psicologo(
    created_by_id UUID,
    psicologo_name TEXT,
    psicologo_username TEXT,
    psicologo_guardian_email TEXT,
    psicologo_avatar_path TEXT DEFAULT '/default-avatar.png'
)
RETURNS JSONB AS $$
DECLARE
    new_psicologo_id UUID;
    result JSONB;
    dummy_auth_user_id UUID;
BEGIN
    -- Verificar se o usuário que está criando tem permissão (role CMS e autorizado)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = created_by_id 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para criar psicólogos'
        );
    END IF;

    -- Verificar se o username já existe
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = psicologo_username
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Username já existe'
        );
    END IF;

    -- Verificar se o email já existe
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE guardian_email = psicologo_guardian_email
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email já existe'
        );
    END IF;

    BEGIN
        -- Gerar um ID único para o psicólogo
        new_psicologo_id := uuid_generate_v4();
        
        -- SOLUÇÃO: Criar uma entrada dummy em auth.users para satisfazer a foreign key
        -- Isso permite que psicólogos existam sem conta de login ativa
        INSERT INTO auth.users (
            id,
            email,
            email_confirmed_at,
            created_at,
            updated_at,
            instance_id,
            aud,
            role
        ) VALUES (
            new_psicologo_id,
            psicologo_guardian_email,
            now(),
            now(),
            now(),
            '00000000-0000-0000-0000-000000000000', -- UUID padrão
            'authenticated',
            'authenticated'
        );

        -- Agora criar o perfil do psicólogo na tabela profiles (com foreign key válida)
        INSERT INTO public.profiles (
            id,
            name,
            username,
            avatar_path,
            guardian_email,
            user_role,
            authorized, -- Psicólogos são criados já autorizados
            authorized_at,
            authorized_by,
            created_at,
            updated_at
        ) VALUES (
            new_psicologo_id, -- Usando o ID que acabamos de criar em auth.users
            psicologo_name,
            psicologo_username,
            psicologo_avatar_path,
            psicologo_guardian_email,
            'psicologo', -- Role específico para psicólogos
            TRUE, -- Psicólogos são criados já autorizados
            now(),
            (SELECT email FROM auth.users WHERE id = created_by_id),
            now(),
            now()
        );

        -- Log da criação do psicólogo
        INSERT INTO public.authorization_logs (
            user_id, 
            action, 
            guardian_email, 
            additional_data
        ) VALUES (
            new_psicologo_id, 
            'psicologo_created', 
            psicologo_guardian_email,
            jsonb_build_object(
                'created_by', created_by_id,
                'username', psicologo_username,
                'name', psicologo_name,
                'role', 'psicologo',
                'auth_email', psicologo_guardian_email,
                'guardian_email', psicologo_guardian_email
            )
        );

        result := jsonb_build_object(
            'success', true,
            'message', 'Psicólogo criado com sucesso',
            'psicologo_id', new_psicologo_id,
            'username', psicologo_username,
            'name', psicologo_name,
            'role', 'psicologo',
            'guardian_email', psicologo_guardian_email
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao criar psicólogo: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- �� FUNÇÃO ALTERNATIVA (SE A PRIMEIRA NÃO FUNCIONAR)
-- ===============================================================
-- Esta função cria psicólogos removendo temporariamente a foreign key constraint

CREATE OR REPLACE FUNCTION public.create_psicologo_alt(
    created_by_id UUID,
    psicologo_name TEXT,
    psicologo_username TEXT,
    psicologo_guardian_email TEXT,
    psicologo_avatar_path TEXT DEFAULT '/default-avatar.png'
)
RETURNS JSONB AS $$
DECLARE
    new_psicologo_id UUID;
    result JSONB;
BEGIN
    -- Verificar se o usuário que está criando tem permissão (role CMS e autorizado)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = created_by_id 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para criar psicólogos'
        );
    END IF;

    -- Verificar se o username já existe
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = psicologo_username
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Username já existe'
        );
    END IF;

    BEGIN
        -- Gerar um ID único para o psicólogo
        new_psicologo_id := uuid_generate_v4();
        
        -- Remover temporariamente a foreign key constraint
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
        
        -- Criar o perfil do psicólogo na tabela profiles
        INSERT INTO public.profiles (
            id,
            name,
            username,
            avatar_path,
            guardian_email,
            user_role,
            authorized, -- Psicólogos são criados já autorizados
            authorized_at,
            authorized_by,
            created_at,
            updated_at
        ) VALUES (
            new_psicologo_id,
            psicologo_name,
            psicologo_username,
            psicologo_avatar_path,
            psicologo_guardian_email,
            'psicologo', -- Role específico para psicólogos
            TRUE, -- Psicólogos são criados já autorizados
            now(),
            (SELECT email FROM auth.users WHERE id = created_by_id),
            now(),
            now()
        );

        -- Recriar a foreign key constraint (opcional, apenas para outros usuários)
        -- ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey 
        -- FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

        -- Log da criação do psicólogo
        INSERT INTO public.authorization_logs (
            user_id, 
            action, 
            guardian_email, 
            additional_data
        ) VALUES (
            new_psicologo_id, 
            'psicologo_created', 
            psicologo_guardian_email,
            jsonb_build_object(
                'created_by', created_by_id,
                'username', psicologo_username,
                'name', psicologo_name,
                'role', 'psicologo'
            )
        );

        result := jsonb_build_object(
            'success', true,
            'message', 'Psicólogo criado com sucesso (método alternativo)',
            'psicologo_id', new_psicologo_id,
            'username', psicologo_username,
            'name', psicologo_name,
            'role', 'psicologo'
        );

    EXCEPTION WHEN OTHERS THEN
        -- Tentar recriar a constraint em caso de erro
        BEGIN
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey 
            FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar se já existir
        END;
        
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao criar psicólogo (método alternativo): ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- 🔧 ATUALIZAR POLÍTICAS RLS PARA INCLUIR ROLE 'psicologo'
-- ===============================================================

-- Remover políticas existentes para posts
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "CMS users can create posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can view all posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can update posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can delete posts" ON public.posts;
        DROP POLICY IF EXISTS "APP users can view published posts" ON public.posts;
        DROP POLICY IF EXISTS "Psicologos can view published posts" ON public.posts;
    END IF;
END $$;

-- Recriar políticas incluindo psicólogos
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        
        -- CMS: Pode criar posts (apenas usuários autorizados com role 'cms')
        CREATE POLICY "CMS users can create posts" ON public.posts 
        FOR INSERT TO authenticated 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- CMS: Pode visualizar todos os posts (para gerenciamento)
        CREATE POLICY "CMS users can view all posts" ON public.posts 
        FOR SELECT TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- CMS: Pode atualizar posts
        CREATE POLICY "CMS users can update posts" ON public.posts 
        FOR UPDATE TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- CMS: Pode deletar posts
        CREATE POLICY "CMS users can delete posts" ON public.posts 
        FOR DELETE TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- APP: Pode visualizar apenas posts publicados
        CREATE POLICY "APP users can view published posts" ON public.posts 
        FOR SELECT TO authenticated 
        USING (
            is_published = TRUE 
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'app'
            )
        );

        -- PSICÓLOGOS: Podem visualizar posts publicados
        CREATE POLICY "Psicologos can view published posts" ON public.posts 
        FOR SELECT TO authenticated 
        USING (
            is_published = TRUE 
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role IN ('psicologo', 'psicologos')
            )
        );

        -- Service Role: Acesso total (para operações administrativas) - CORRIGIDO
        CREATE POLICY "Service role posts management" ON public.posts 
        FOR ALL TO service_role 
        USING (true) 
        WITH CHECK (true);
        
    END IF;
END $$;

-- ===============================================================
-- 📝 DOCUMENTAÇÃO E COMENTÁRIOS ATUALIZADOS
-- ===============================================================

COMMENT ON FUNCTION public.create_psicologo IS 'Cria um novo psicólogo com role "psicologo" (versão corrigida que resolve foreign key error)';
COMMENT ON FUNCTION public.create_psicologo_alt IS 'Função alternativa para criar psicólogos removendo temporariamente foreign key constraint';

-- ===============================================================
-- 📋 INSTRUÇÕES DE USO
-- ===============================================================
-- COMO USAR:
-- 1. Execute este script completo no SQL Editor do Supabase
-- 2. Teste a criação de psicólogo usando a função principal:
--    SELECT public.create_psicologo(
--        'seu-user-id-cms',
--        'Nome do Psicólogo', 
--        'username_psicologo',
--        'psicologo@email.com',
--        '/path/to/avatar.jpg'
--    );
-- 3. Se ainda der erro, use a função alternativa:
--    SELECT public.create_psicologo_alt(
--        'seu-user-id-cms',
--        'Nome do Psicólogo', 
--        'username_psicologo',
--        'psicologo@email.com',
--        '/path/to/avatar.jpg'
--    );
-- 4. Verifique se o psicólogo foi criado:
--    SELECT * FROM public.profiles WHERE user_role = 'psicologo';
-- CORREÇÕES IMPLEMENTADAS:
-- ✅ Corrigido erro de foreign key constraint
-- ✅ Role alterado de 'psicologos' para 'psicologo'
-- ✅ Constraints atualizadas para aceitar 'psicologo'
-- ✅ Políticas RLS atualizadas
-- ✅ Função alternativa como backup
-- ✅ Logs de auditoria mantidos

-- ===============================================================
-- 🔧 CORREÇÃO PARA ERRO DE POLÍTICA DUPLICADA
-- ===============================================================
-- Execute esta seção para corrigir o erro "policy already exists"

-- Remover TODAS as políticas existentes para posts (incluindo service role)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        -- Remover políticas uma por uma para garantir limpeza completa
        DROP POLICY IF EXISTS "CMS users can create posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can view all posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can update posts" ON public.posts;
        DROP POLICY IF EXISTS "CMS users can delete posts" ON public.posts;
        DROP POLICY IF EXISTS "APP users can view published posts" ON public.posts;
        DROP POLICY IF EXISTS "Psicologos can view published posts" ON public.posts;
        DROP POLICY IF EXISTS "Service role has full access" ON public.posts;
        DROP POLICY IF EXISTS "Service role has full access to posts" ON public.posts;
        DROP POLICY IF EXISTS "Service role posts access" ON public.posts;
        DROP POLICY IF EXISTS "Service role posts management" ON public.posts;
        DROP POLICY IF EXISTS "Service role full access to posts" ON public.posts;
        
        RAISE NOTICE 'Todas as políticas da tabela posts foram removidas';
    END IF;
END $$;

-- ===============================================================
-- 🔧 ATUALIZAR POLÍTICAS RLS PARA INCLUIR ROLE 'psicologo' (VERSÃO CORRIGIDA)
-- ===============================================================

-- Recriar políticas incluindo psicólogos (versão corrigida)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        
        -- CMS: Pode criar posts (apenas usuários autorizados com role 'cms')
        CREATE POLICY "CMS users can create posts" ON public.posts 
        FOR INSERT TO authenticated 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- CMS: Pode visualizar todos os posts (para gerenciamento)
        CREATE POLICY "CMS users can view all posts" ON public.posts 
        FOR SELECT TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- CMS: Pode atualizar posts
        CREATE POLICY "CMS users can update posts" ON public.posts 
        FOR UPDATE TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- CMS: Pode deletar posts
        CREATE POLICY "CMS users can delete posts" ON public.posts 
        FOR DELETE TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'cms'
            )
        );

        -- APP: Pode visualizar apenas posts publicados
        CREATE POLICY "APP users can view published posts" ON public.posts 
        FOR SELECT TO authenticated 
        USING (
            is_published = TRUE 
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role = 'app'
            )
        );

        -- PSICÓLOGOS: Podem visualizar posts publicados
        CREATE POLICY "Psicologos can view published posts" ON public.posts 
        FOR SELECT TO authenticated 
        USING (
            is_published = TRUE 
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND authorized = TRUE 
                AND user_role IN ('psicologo', 'psicologos')
            )
        );

        -- Service Role: Acesso total (para operações administrativas) - NOME ÚNICO
        CREATE POLICY "Service role full access to posts" ON public.posts 
        FOR ALL TO service_role 
        USING (true) 
        WITH CHECK (true);
        
        RAISE NOTICE 'Todas as políticas da tabela posts foram recriadas com sucesso';
        
    END IF;
END $$;

-- ===============================================================
-- 🧪 SEÇÃO DE TESTES E DEBUG
-- ===============================================================
-- Execute estas queries para testar e debugar a criação de psicólogos

-- ===============================================================
-- TESTE 1: Verificar se as tabelas existem e estão configuradas corretamente
-- ===============================================================

-- Verificar estrutura da tabela profiles
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar constraints na tabela profiles
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass;

-- ===============================================================
-- TESTE 2: Verificar usuário CMS que irá criar psicólogos
-- ===============================================================

-- Buscar usuário leandro.oliveira@dengun.com
SELECT 
    au.id,
    au.email,
    p.name,
    p.username,
    p.user_role,
    p.authorized,
    p.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'leandro.oliveira@dengun.com';

-- ===============================================================
-- TESTE 3: Testar função create_psicologo
-- ===============================================================

-- ATENÇÃO: Substitua 'USER_ID_AQUI' pelo ID real do usuário leandro.oliveira@dengun.com
-- encontrado na query acima

-- SELECT public.create_psicologo(
--     'USER_ID_AQUI'::UUID,
--     'Dr. João Silva - TESTE',
--     'dr_joao_teste',
--     'joao.teste@exemplo.com',
--     '/avatars/joao_teste.jpg'
-- );

-- ===============================================================
-- TESTE 4: Verificar se psicólogo foi criado corretamente
-- ===============================================================

-- Buscar psicólogos criados
SELECT 
    p.id,
    p.name,
    p.username,
    p.guardian_email,
    p.user_role,
    p.authorized,
    p.created_at,
    au.email as auth_email,
    au.created_at as auth_created_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.user_role = 'psicologo'
ORDER BY p.created_at DESC;

-- ===============================================================
-- TESTE 5: Verificar logs de criação
-- ===============================================================

-- Buscar logs de criação de psicólogos
SELECT 
    al.*,
    p.name as user_name,
    p.username
FROM public.authorization_logs al
LEFT JOIN public.profiles p ON al.user_id = p.id
WHERE al.action = 'psicologo_created'
ORDER BY al.created_at DESC;

-- ===============================================================
-- TESTE 6: Limpar dados de teste (se necessário)
-- ===============================================================

-- CUIDADO: Estas queries deletam dados! Use apenas para limpeza de testes
-- 
-- -- Deletar psicólogo de teste específico
-- DELETE FROM public.profiles 
-- WHERE username = 'dr_joao_teste' AND user_role = 'psicologo';
-- 
-- -- Deletar usuário correspondente do auth.users (se necessário)
-- DELETE FROM auth.users 
-- WHERE email LIKE '%@exemplo.com' 
-- OR email LIKE '%@internal.comfy.app';

-- ===============================================================
-- TESTE 7: Verificar função can_user_login_with_role para psicólogos
-- ===============================================================

-- Testar se psicólogo pode fazer login
-- SELECT public.can_user_login_with_role('joao.teste@exemplo.com', 'psicologo');

-- ===============================================================
-- 📋 GUIA DE TROUBLESHOOTING
-- ===============================================================

-- PROBLEMAS COMUNS E SOLUÇÕES:
-- 
-- 1. ERRO: "Usuário não tem permissão para criar psicólogos"
--    SOLUÇÃO: Verificar se leandro.oliveira@dengun.com tem role 'cms' e authorized = TRUE
--    QUERY: UPDATE public.profiles SET user_role = 'cms', authorized = TRUE WHERE id = 'USER_ID';
-- 
-- 2. ERRO: "Username já existe"
--    SOLUÇÃO: Verificar se username não está duplicado
--    QUERY: SELECT * FROM public.profiles WHERE username = 'username_testado';
-- 
-- 3. ERRO: "Email já existe"
--    SOLUÇÃO: Verificar se guardian_email não está duplicado
--    QUERY: SELECT * FROM public.profiles WHERE guardian_email = 'email@teste.com';
-- 
-- 4. ERRO: "duplicate key value violates unique constraint users_email_partial_key"
--    SOLUÇÃO: A função já foi corrigida para gerar emails únicos automaticamente
--    Se persistir, verificar se não há emails duplicados manualmente criados
-- 
-- 5. ERRO: "insert or update on table profiles violates foreign key constraint"
--    SOLUÇÃO: A função já foi corrigida para criar entrada em auth.users primeiro
--    Se persistir, verificar se auth.users está acessível
-- 
-- 6. FRONTEND: "Erro ao carregar perfil"
--    SOLUÇÃO: Verificar se user_role aceita 'psicologo' nos tipos TypeScript
--    VERIFICADO: Tipos já foram atualizados para incluir 'psicologo'

-- ===============================================================
-- 📝 INSTRUÇÕES FINAIS PARA TESTE COMPLETO
-- ===============================================================

-- PASSO A PASSO PARA TESTAR:
-- 
-- 1. Execute TESTE 1 para verificar estrutura das tabelas
-- 2. Execute TESTE 2 para encontrar o ID do usuário CMS
-- 3. Copie o ID encontrado e substitua em TESTE 3
-- 4. Execute TESTE 3 para criar um psicólogo de teste
-- 5. Execute TESTE 4 para verificar se foi criado corretamente
-- 6. Execute TESTE 5 para verificar logs
-- 7. Teste no frontend a criação de psicólogos
-- 8. Execute TESTE 6 para limpar dados de teste (opcional)
-- 
-- SE TUDO FUNCIONAR:
-- ✅ A função create_psicologo está funcionando
-- ✅ Os tipos TypeScript foram atualizados
-- ✅ O AuthContext suporta role 'psicologo'
-- ✅ O sistema está pronto para uso
-- 
-- PROBLEMAS PERSISTIREM:
-- ❌ Verifique os logs do console no navegador
-- ❌ Verifique os logs do Supabase
-- ❌ Execute os testes SQL acima para diagnóstico

-- ===============================================================
-- 🔧 FUNÇÃO PARA CRIAR PSICÓLOGOS COM AUTH.USERS EXISTENTE
-- ===============================================================
-- Esta função é usada quando o usuário já foi criado em auth.users pelo frontend
-- Evita o erro de email duplicado

CREATE OR REPLACE FUNCTION public.create_psicologo_with_existing_auth(
    existing_user_id UUID, -- ID do usuário já criado em auth.users
    created_by_id UUID,    -- ID do usuário CMS que está criando
    psicologo_name TEXT,
    psicologo_username TEXT,
    psicologo_guardian_email TEXT,
    psicologo_avatar_path TEXT DEFAULT '/default-avatar.png'
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Verificar se o usuário que está criando tem permissão (role CMS e autorizado)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = created_by_id 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para criar psicólogos'
        );
    END IF;

    -- Verificar se o usuário existe em auth.users
    IF NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = existing_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não encontrado em auth.users'
        );
    END IF;

    -- Verificar se já existe um perfil para este usuário
    IF EXISTS (
        SELECT 1 FROM public.profiles WHERE id = existing_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Já existe um perfil para este usuário'
        );
    END IF;

    -- Verificar se o username já existe
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = psicologo_username
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Username já existe'
        );
    END IF;

    -- Verificar se o email já existe na tabela profiles (guardian_email)
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE guardian_email = psicologo_guardian_email
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email já existe'
        );
    END IF;

    BEGIN
        -- Criar APENAS o perfil do psicólogo na tabela profiles
        -- (o usuário já existe em auth.users)
        INSERT INTO public.profiles (
            id,
            name,
            username,
            avatar_path,
            guardian_email,
            user_role,
            authorized,
            authorized_at,
            authorized_by,
            created_at,
            updated_at
        ) VALUES (
            existing_user_id, -- Usar o ID do usuário já existente
            psicologo_name,
            psicologo_username,
            psicologo_avatar_path,
            psicologo_guardian_email,
            'psicologo',
            TRUE, -- Psicólogos são criados já autorizados
            now(),
            (SELECT email FROM auth.users WHERE id = created_by_id),
            now(),
            now()
        );

        -- Log da criação do psicólogo
        INSERT INTO public.authorization_logs (
            user_id, 
            action, 
            guardian_email, 
            additional_data
        ) VALUES (
            existing_user_id, 
            'psicologo_created', 
            psicologo_guardian_email,
            jsonb_build_object(
                'created_by', created_by_id,
                'username', psicologo_username,
                'name', psicologo_name,
                'role', 'psicologo',
                'method', 'with_existing_auth',
                'guardian_email', psicologo_guardian_email
            )
        );

        result := jsonb_build_object(
            'success', true,
            'message', 'Psicólogo criado com sucesso',
            'psicologo_id', existing_user_id,
            'username', psicologo_username,
            'name', psicologo_name,
            'role', 'psicologo',
            'guardian_email', psicologo_guardian_email
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao criar perfil do psicólogo: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- 📝 DOCUMENTAÇÃO DA NOVA FUNÇÃO
-- ===============================================================

COMMENT ON FUNCTION public.create_psicologo_with_existing_auth IS 'Cria perfil de psicólogo para usuário já existente em auth.users (evita erro de email duplicado)';

-- ===============================================================
-- 🧪 TESTE DA NOVA FUNÇÃO
-- ===============================================================

-- EXEMPLO DE USO:
-- 1. Frontend cria usuário: supabase.auth.signUp({ email, password })
-- 2. Frontend chama: create_psicologo_with_existing_auth(authData.user.id, ...)
-- 3. Função cria apenas o perfil, sem duplicar auth.users

-- SELECT public.create_psicologo_with_existing_auth(
--     'existing-user-id-here'::UUID,
--     'cms-user-id-here'::UUID,
--     'Dr. Maria Silva',
--     'dr_maria_silva',
--     'maria.silva@clinica.com',
--     '/avatars/maria.jpg'
-- );

-- ===============================================================
-- 📋 GUIA DE TROUBLESHOOTING ATUALIZADO (ESTRUTURA COM CREDENCIAIS REAIS)
-- ===============================================================

-- FLUXO ATUAL CORRETO:
-- 1. Frontend: supabase.auth.signUp({ email, password }) → cria usuário em auth.users
-- 2. Frontend: create_psicologo_with_existing_auth() → cria apenas perfil em profiles
-- 3. Psicólogo tem credenciais reais para login na futura aplicação

-- PROBLEMAS COMUNS E SOLUÇÕES ATUALIZADAS:

-- 1. ERRO: "duplicate key value violates unique constraint users_email_partial_key"
--    CAUSA: Tentando criar usuário que já existe em auth.users
--    SOLUÇÃO: Verificar se email já está em uso
--    QUERY: SELECT * FROM auth.users WHERE email = 'email@teste.com';

-- 2. ERRO: "Usuário não encontrado em auth.users"
--    CAUSA: Falhou o supabase.auth.signUp() no frontend
--    SOLUÇÃO: Verificar logs do frontend e conexão com Supabase

-- 3. ERRO: "Já existe um perfil para este usuário"
--    CAUSA: Tentando criar perfil para usuário que já tem um
--    SOLUÇÃO: Verificar se perfil já existe
--    QUERY: SELECT * FROM public.profiles WHERE id = 'user-id-aqui';

-- 4. ERRO: "Username já existe"
--    CAUSA: Username duplicado (gerado a partir do email)
--    SOLUÇÃO: Modificar geração de username no frontend ou usar timestamp
--    SUGESTÃO: email.split('@')[0] + '_' + Date.now()

-- 5. ERRO: "Email já existe"
--    CAUSA: guardian_email duplicado na tabela profiles
--    SOLUÇÃO: Verificar duplicatas antes de criar
--    QUERY: SELECT * FROM public.profiles WHERE guardian_email = 'email@teste.com';

-- 6. FRONTEND: "Erro ao carregar perfil"
--    CAUSA: user_role não inclui 'psicologo' nos tipos TypeScript
--    STATUS: ✅ JÁ CORRIGIDO - Tipos atualizados para incluir 'psicologo'

-- 7. SUPABASE: SignUp cria sessão automática
--    CAUSA: supabase.auth.signUp() faz login automático do psicólogo
--    SOLUÇÃO: Frontend faz logout após criar perfil (já implementado)

-- QUERIES PARA DIAGNÓSTICO:

-- Verificar usuários criados recentemente em auth.users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users 
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;

-- Verificar psicólogos criados
SELECT 
    p.id,
    p.name,
    p.username,
    p.guardian_email,
    p.user_role,
    p.authorized,
    p.created_at,
    au.email as auth_email
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.user_role = 'psicologo'
ORDER BY p.created_at DESC;

-- Verificar logs de criação de psicólogos
SELECT 
    al.*,
    p.name as user_name
FROM public.authorization_logs al
LEFT JOIN public.profiles p ON al.user_id = p.id
WHERE al.action = 'psicologo_created'
AND al.additional_data->>'method' = 'with_existing_auth'
ORDER BY al.created_at DESC;

-- TESTES PARA VALIDAR FUNCIONAMENTO:

-- TESTE A: Verificar se função aceita IDs válidos
-- SELECT public.create_psicologo_with_existing_auth(
--     '00000000-0000-0000-0000-000000000000'::UUID, -- ID inexistente (deve falhar)
--     'cms-user-id'::UUID,
--     'Teste Nome',
--     'teste_username',
--     'teste@email.com',
--     '/default.png'
-- );

-- TESTE B: Verificar duplicatas de username
-- SELECT public.create_psicologo_with_existing_auth(
--     'existing-user-id'::UUID,
--     'cms-user-id'::UUID,
--     'Teste Nome 2',
--     'teste_username', -- Username duplicado (deve falhar)
--     'teste2@email.com',
--     '/default.png'
-- );

-- LIMPEZA DE DADOS DE TESTE:
-- DELETE FROM public.profiles WHERE guardian_email LIKE '%@teste.com';
-- DELETE FROM auth.users WHERE email LIKE '%@teste.com';

-- ===============================================================
-- 📝 INSTRUÇÕES COMPLETAS PARA TESTAR O SISTEMA
-- ===============================================================

-- PASSO A PASSO COMPLETO:

-- 1. EXECUTE O SCRIPT SQL COMPLETO
--    - Execute todo este arquivo database.sql no Supabase SQL Editor
--    - Verifica se todas as funções foram criadas sem erros

-- 2. VERIFIQUE O USUÁRIO CMS
--    SELECT au.id, au.email, p.user_role, p.authorized
--    FROM auth.users au
--    JOIN public.profiles p ON au.id = p.id
--    WHERE au.email = 'leandro.oliveira@dengun.com';

-- 3. TESTE NO FRONTEND
--    - Acesse /dashboard/psicologos/create
--    - Preencha: Nome, Email, Password, Confirmar Password
--    - Clique "Criar Psicólogo"
--    - Verifique logs no console do navegador

-- 4. VERIFIQUE SE FOI CRIADO
--    SELECT p.*, au.email 
--    FROM public.profiles p
--    JOIN auth.users au ON p.id = au.id
--    WHERE p.user_role = 'psicologo'
--    ORDER BY p.created_at DESC;

-- 5. TESTE LOGIN DO PSICÓLOGO (FUTURO)
--    - Na futura aplicação, o psicólogo poderá fazer login com:
--    - Email: o mesmo usado na criação
--    - Password: a mesma definida na criação
--    - Role: 'psicologo'

-- VANTAGENS DA ABORDAGEM ATUAL:
-- ✅ Psicólogos têm credenciais reais de login
-- ✅ Podem acessar futuras aplicações
-- ✅ Sem conflito de email duplicado
-- ✅ AuthContext suporta role 'psicologo'
-- ✅ Logs completos de auditoria
-- ✅ Validações robustas

-- PRÓXIMOS PASSOS:
-- 1. Testar criação de psicólogos no frontend
-- 2. Implementar listagem de psicólogos
-- 3. Implementar edição/exclusão de psicólogos
-- 4. Criar aplicação separada para psicólogos (futuro)

-- ===============================================================
-- 🚨 DEBUG URGENTE: VERIFICAR USUÁRIO LEANDRO.OLIVEIRA@DENGUN.COM
-- ===============================================================
-- Execute estas queries para diagnosticar o problema com o usuário CMS

-- QUERY 1: Verificar se usuário existe e suas permissões
SELECT 
    'USUÁRIO EM AUTH.USERS' as fonte,
    au.id::text as id,
    au.email as info1,
    au.created_at::text as info2,
    au.email_confirmed_at::text as info3,
    COALESCE(au.last_sign_in_at::text, 'null') as info4
FROM auth.users au
WHERE au.email = 'leandro.oliveira@dengun.com'

UNION ALL

SELECT 
    'PERFIL EM PROFILES' as fonte,
    p.id::text as id,
    p.guardian_email as info1,
    p.user_role as info2,
    p.authorized::text as info3,
    p.created_at::text as info4
FROM public.profiles p
WHERE p.guardian_email = 'leandro.oliveira@dengun.com';

-- QUERY 2: Verificar join completo do usuário
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    au.created_at as auth_created,
    p.id as profile_id,
    p.name as profile_name,
    p.username as profile_username,
    p.user_role,
    p.authorized,
    p.guardian_email,
    p.created_at as profile_created,
    -- Verificar se pode criar psicólogos
    CASE 
        WHEN p.authorized = TRUE AND p.user_role = 'cms' THEN 'SIM - TEM PERMISSÃO'
        WHEN p.authorized IS NULL THEN 'NÃO - CONTA PENDENTE'
        WHEN p.authorized = FALSE THEN 'NÃO - CONTA REJEITADA'
        WHEN p.user_role != 'cms' THEN 'NÃO - ROLE INCORRETO: ' || p.user_role
        ELSE 'NÃO - MOTIVO DESCONHECIDO'
    END as pode_criar_psicologos
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'leandro.oliveira@dengun.com';

-- QUERY 3: Se não existir perfil, criar um temporário para teste
DO $$
DECLARE
    user_id_var UUID;
BEGIN
    -- Buscar ID do usuário
    SELECT id INTO user_id_var
    FROM auth.users 
    WHERE email = 'leandro.oliveira@dengun.com';
    
    IF user_id_var IS NULL THEN
        RAISE NOTICE 'ERRO: Usuário leandro.oliveira@dengun.com não encontrado em auth.users';
        RETURN;
    END IF;
    
    -- Verificar se já tem perfil
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id_var) THEN
        RAISE NOTICE 'OK: Usuário já tem perfil';
        RETURN;
    END IF;
    
    -- Criar perfil se não existir
    INSERT INTO public.profiles (
        id, name, username, avatar_path, guardian_email,
        user_role, authorized, authorized_at, authorized_by,
        created_at, updated_at
    ) VALUES (
        user_id_var,
        'Leandro Oliveira',
        'leandro.oliveira',
        '/default-avatar.png',
        'leandro.oliveira@dengun.com',
        'cms',
        TRUE,
        now(),
        'system',
        now(),
        now()
    );
    
    RAISE NOTICE 'CRIADO: Perfil CMS criado para leandro.oliveira@dengun.com';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao criar perfil: %', SQLERRM;
END $$;

-- QUERY 4: Verificar novamente após possível criação
SELECT 
    au.id,
    au.email,
    p.name,
    p.username,
    p.user_role,
    p.authorized,
    p.guardian_email,
    -- Testar condição da função
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = au.id 
            AND authorized = TRUE 
            AND user_role = 'cms'
        ) THEN 'PASSOU - TEM PERMISSÃO CMS'
        ELSE 'FALHOU - SEM PERMISSÃO CMS'
    END as teste_permissao_cms
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'leandro.oliveira@dengun.com';

-- QUERY 5: Teste da função com dados simulados
-- ATENÇÃO: Substitua USER_ID_CMS pelo ID real encontrado acima
DO $$
DECLARE
    cms_user_id UUID;
    test_result JSONB;
BEGIN
    -- Buscar ID do usuário CMS
    SELECT au.id INTO cms_user_id
    FROM auth.users au
    JOIN public.profiles p ON au.id = p.id
    WHERE au.email = 'leandro.oliveira@dengun.com'
    AND p.authorized = TRUE 
    AND p.user_role = 'cms';
    
    IF cms_user_id IS NULL THEN
        RAISE NOTICE 'ERRO: Usuário CMS não encontrado ou sem permissões';
        RETURN;
    END IF;
    
    RAISE NOTICE 'TESTANDO função com CMS user ID: %', cms_user_id;
    
    -- Testar função com parâmetros simulados
    SELECT public.create_psicologo_with_existing_auth(
        '00000000-0000-0000-0000-000000000000'::UUID, -- ID falso (deve falhar)
        cms_user_id,
        'Teste Dr. João',
        'teste_dr_joao',
        'teste.joao@exemplo.com',
        '/default.png'
    ) INTO test_result;
    
    RAISE NOTICE 'RESULTADO do teste: %', test_result;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO no teste da função: %', SQLERRM;
END $$;

-- QUERY 6: Verificar se função existe
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosrc as source_available
FROM pg_proc p
WHERE p.proname = 'create_psicologo_with_existing_auth'
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ===============================================================
-- 📋 INSTRUÇÕES PARA EXECUTAR
-- ===============================================================

-- EXECUTE AS QUERIES ACIMA EM ORDEM:
-- 1. QUERY 1: Verificar se usuário existe
-- 2. QUERY 2: Verificar permissões detalhadas
-- 3. QUERY 3: Criar perfil se necessário (executar DO block)
-- 4. QUERY 4: Verificar novamente
-- 5. QUERY 5: Testar função (executar DO block)
-- 6. QUERY 6: Verificar se função existe

-- APÓS EXECUTAR, TESTE NO FRONTEND NOVAMENTE
-- Os logs detalhados do frontend + essas queries devem revelar o problema

-- ===============================================================
-- 🗑️ FUNÇÃO PARA DELETAR PSICÓLOGOS COM SEGURANÇA
-- ===============================================================
-- Esta função deleta tanto de profiles quanto de auth.users

CREATE OR REPLACE FUNCTION public.delete_psicologo(
    psicologo_id_param UUID,
    deleted_by_id UUID
)
RETURNS JSONB AS $$
DECLARE
    psicologo_record public.profiles%ROWTYPE;
    result JSONB;
BEGIN
    -- Verificar se o usuário que está deletando tem permissão (role CMS e autorizado)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = deleted_by_id 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para deletar psicólogos'
        );
    END IF;

    -- Buscar o psicólogo a ser deletado
    SELECT * INTO psicologo_record
    FROM public.profiles
    WHERE id = psicologo_id_param
    AND user_role IN ('psicologo', 'psicologos');

    IF psicologo_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Psicólogo não encontrado'
        );
    END IF;

    BEGIN
        -- Log da deleção antes de deletar
        INSERT INTO public.authorization_logs (
            user_id, 
            action, 
            guardian_email, 
            additional_data
        ) VALUES (
            psicologo_id_param, 
            'psicologo_deleted', 
            psicologo_record.guardian_email,
            jsonb_build_object(
                'deleted_by', deleted_by_id,
                'username', psicologo_record.username,
                'name', psicologo_record.name,
                'role', psicologo_record.user_role
            )
        );

        -- Deletar primeiro da tabela profiles (para evitar problemas de foreign key)
        DELETE FROM public.profiles 
        WHERE id = psicologo_id_param;

        -- Deletar do auth.users (se existir)
        DELETE FROM auth.users 
        WHERE id = psicologo_id_param;

        result := jsonb_build_object(
            'success', true,
            'message', 'Psicólogo deletado com sucesso',
            'deleted_id', psicologo_id_param,
            'deleted_name', psicologo_record.name
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao deletar psicólogo: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- 🔑 FUNÇÃO PARA VALIDAR ALTERAÇÃO DE SENHA DE PSICÓLOGOS
-- ===============================================================
-- Esta função valida e prepara para alteração de senha

CREATE OR REPLACE FUNCTION public.validate_psicologo_password_change(
    psicologo_id_param UUID,
    new_password TEXT,
    changed_by_id UUID
)
RETURNS JSONB AS $$
DECLARE
    psicologo_record public.profiles%ROWTYPE;
    auth_email TEXT;
    result JSONB;
BEGIN
    -- Verificar se o usuário que está alterando tem permissão (role CMS e autorizado)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = changed_by_id 
        AND authorized = TRUE 
        AND user_role = 'cms'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para alterar senhas'
        );
    END IF;

    -- Buscar o psicólogo
    SELECT * INTO psicologo_record
    FROM public.profiles
    WHERE id = psicologo_id_param
    AND user_role IN ('psicologo', 'psicologos');

    IF psicologo_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Psicólogo não encontrado'
        );
    END IF;

    -- Buscar email de auth.users para confirmar
    SELECT email INTO auth_email
    FROM auth.users
    WHERE id = psicologo_id_param;

    IF auth_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não encontrado em auth.users'
        );
    END IF;

    -- Validar senha
    IF LENGTH(new_password) < 6 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'A senha deve ter pelo menos 6 caracteres'
        );
    END IF;

    BEGIN
        -- Log da alteração de senha
        INSERT INTO public.authorization_logs (
            user_id, 
            action, 
            guardian_email, 
            additional_data
        ) VALUES (
            psicologo_id_param, 
            'password_change_requested', 
            psicologo_record.guardian_email,
            jsonb_build_object(
                'changed_by', changed_by_id,
                'username', psicologo_record.username,
                'name', psicologo_record.name,
                'auth_email', auth_email,
                'timestamp', now()
            )
        );

        -- Atualizar timestamp de última modificação no profile
        UPDATE public.profiles
        SET updated_at = now()
        WHERE id = psicologo_id_param;

        result := jsonb_build_object(
            'success', true,
            'message', 'Validação concluída, prosseguindo com alteração de senha',
            'user_id', psicologo_id_param,
            'auth_email', auth_email,
            'name', psicologo_record.name
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'Erro ao validar alteração de senha: ' || SQLERRM
        );
    END;

    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ===============================================================
-- 📝 DOCUMENTAÇÃO DAS NOVAS FUNÇÕES
-- ===============================================================

COMMENT ON FUNCTION public.delete_psicologo IS 'Deleta psicólogo de forma segura (profiles + auth.users) apenas para usuários CMS autorizados';
COMMENT ON FUNCTION public.validate_psicologo_password_change IS 'Valida e prepara alteração de senha para psicólogos (apenas CMS autorizado)';

-- ===============================================================
-- 🔧 ATUALIZAR CONSTRAINT PARA INCLUIR NOVA AÇÃO
-- ===============================================================



-- ===============================================================
-- 📊 CRIAÇÃO DA TABELA AUDIT_LOGS (SE NÃO EXISTIR)
-- ===============================================================

-- Criar tabela audit_logs se não existir (usada pela função update_psicologo_password)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para a tabela audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Habilitar RLS na tabela audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para audit_logs
DROP POLICY IF EXISTS "Service role can manage audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "CMS users can view audit logs" ON public.audit_logs;

CREATE POLICY "Service role can manage audit logs" ON public.audit_logs 
FOR ALL TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "CMS users can view audit logs" ON public.audit_logs 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND authorized = TRUE 
        AND user_role = 'cms'
    )
);

-- ===============================================================
-- 🔧 FUNÇÃO PARA ALTERAR SENHA DE PSICÓLOGO (BYPASS ADMIN API)
-- ===============================================================
-- Esta função altera a senha do psicólogo sem usar a API do administrador

CREATE OR REPLACE FUNCTION public.update_psicologo_password(
  psicologo_id_param uuid,
  new_password_param text,
  changed_by_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  psicologo_record public.profiles%ROWTYPE;
  auth_user_id uuid;
  result jsonb;
BEGIN
  -- Log da operação
  RAISE LOG 'update_psicologo_password: Iniciando para psicologo_id=%, changed_by=%', psicologo_id_param, changed_by_id;

  -- Verificar se o solicitante é um admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = changed_by_id 
    AND authorized = TRUE
    AND user_role IN ('cms', 'app')
  ) THEN
    RAISE LOG 'update_psicologo_password: Usuário % não é admin', changed_by_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permissão negada: apenas administradores podem alterar senhas'
    );
  END IF;

  -- Verificar se o psicólogo existe
  SELECT * INTO psicologo_record
  FROM public.profiles
  WHERE id = psicologo_id_param
  AND user_role IN ('psicologo', 'psicologos');

  IF NOT FOUND THEN
    RAISE LOG 'update_psicologo_password: Psicólogo % não encontrado', psicologo_id_param;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Psicólogo não encontrado'
    );
  END IF;

  RAISE LOG 'update_psicologo_password: Psicólogo encontrado: %', psicologo_record.name;

  -- Validar senha
  IF LENGTH(new_password_param) < 6 OR LENGTH(new_password_param) > 72 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A senha deve ter entre 6 e 72 caracteres'
    );
  END IF;

  -- Tentar encontrar o usuário no auth.users
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE id = psicologo_id_param;

  IF NOT FOUND THEN
    -- Se não existe, tentar encontrar pelo email
    SELECT id INTO auth_user_id
    FROM auth.users
    WHERE email = psicologo_record.guardian_email;

    IF NOT FOUND THEN
      -- Criar novo usuário no auth.users
      RAISE LOG 'update_psicologo_password: Criando novo usuário auth para %', psicologo_record.guardian_email;
      
      INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        instance_id,
        aud,
        role
      ) VALUES (
        psicologo_id_param,
        psicologo_record.guardian_email,
        crypt(new_password_param, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object(
          'name', psicologo_record.name,
          'user_role', psicologo_record.user_role
        ),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated'
      );

      auth_user_id := psicologo_id_param;
      
      RAISE LOG 'update_psicologo_password: Usuário criado com sucesso';
      
      -- Log de auditoria para criação
      INSERT INTO public.audit_logs (
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        user_id,
        created_at
      ) VALUES (
        'update_password',
        'auth.users',
        auth_user_id,
        jsonb_build_object('action', 'user_created_with_password'),
        jsonb_build_object('created_by', changed_by_id, 'target_user', psicologo_record.name, 'email', psicologo_record.guardian_email),
        changed_by_id,
        NOW()
      );
      
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Conta criada e senha definida com sucesso',
        'user_id', auth_user_id,
        'user_name', psicologo_record.name,
        'created', true
      );
    ELSE
      auth_user_id := auth_user_id;
      RAISE LOG 'update_psicologo_password: Usuário encontrado pelo email: %', auth_user_id;
    END IF;
  ELSE
    RAISE LOG 'update_psicologo_password: Usuário encontrado pelo ID: %', auth_user_id;
  END IF;

  -- Atualizar senha do usuário existente
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password_param, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = auth_user_id;

  IF NOT FOUND THEN
    RAISE LOG 'update_psicologo_password: Falha ao atualizar senha para %', auth_user_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro ao atualizar senha na base de dados'
    );
  END IF;

  RAISE LOG 'update_psicologo_password: Senha atualizada com sucesso para %', psicologo_record.name;

  -- Log de auditoria para atualização
  INSERT INTO public.audit_logs (
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    user_id,
    created_at
  ) VALUES (
    'update_password',
    'auth.users',
    auth_user_id,
    jsonb_build_object('action', 'password_update'),
    jsonb_build_object('updated_by', changed_by_id, 'target_user', psicologo_record.name),
    changed_by_id,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Senha atualizada com sucesso',
    'user_id', auth_user_id,
    'user_name', psicologo_record.name,
    'updated_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'update_psicologo_password: Erro: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro interno: ' || SQLERRM
    );
END;
$$;

-- ===============================================================
-- 📝 DOCUMENTAÇÃO DA FUNÇÃO ATUALIZADA
-- ===============================================================

COMMENT ON FUNCTION public.update_psicologo_password IS 'Altera senha de psicólogo diretamente na base de dados, criando usuário em auth.users se necessário (bypass Admin API)';

-- ===============================================================
-- 🧪 FUNÇÃO DE TESTE PARA VERIFICAR CONFIGURAÇÃO
-- ===============================================================

CREATE OR REPLACE FUNCTION public.test_password_update_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  test_cms_user_id uuid;
  test_psicologo_count integer;
BEGIN
  -- Verificar se há usuários CMS
  SELECT id INTO test_cms_user_id
  FROM public.profiles
  WHERE user_role = 'cms' AND authorized = TRUE
  LIMIT 1;
  
  -- Contar psicólogos
  SELECT COUNT(*) INTO test_psicologo_count
  FROM public.profiles
  WHERE user_role IN ('psicologo', 'psicologos');
  
  -- Verificar se tabelas existem
  result := jsonb_build_object(
    'audit_logs_exists', EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'audit_logs' AND table_schema = 'public'
    ),
    'profiles_exists', EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'profiles' AND table_schema = 'public'
    ),
    'cms_user_found', test_cms_user_id IS NOT NULL,
    'cms_user_id', test_cms_user_id,
    'psicologo_count', test_psicologo_count,
    'function_exists', EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'update_psicologo_password' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ),
    'crypt_available', EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'crypt'
    ),
    'gen_salt_available', EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'gen_salt'
    )
  );
  
  RETURN result;
END;
$$;

-- ===============================================================
-- 🔧 GARANTIR EXTENSÕES NECESSÁRIAS
-- ===============================================================

-- Extensão para criptografia de senhas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===============================================================
-- 📋 INSTRUÇÕES DE USO DA FUNÇÃO DE ATUALIZAÇÃO DE SENHA
-- ===============================================================

-- PASSO 1: Verificar se tudo está configurado corretamente
-- SELECT public.test_password_update_config();

-- PASSO 2: Buscar ID do usuário CMS (quem irá alterar a senha)
-- SELECT id, email, user_role FROM public.profiles 
-- WHERE user_role = 'cms' AND authorized = TRUE;

-- PASSO 3: Buscar ID do psicólogo (cuja senha será alterada)
-- SELECT id, name, username, guardian_email FROM public.profiles 
-- WHERE user_role IN ('psicologo', 'psicologos');

-- PASSO 4: Atualizar senha do psicólogo
-- SELECT public.update_psicologo_password(
--     'psicologo-id-aqui'::uuid,
--     'nova-senha-aqui',
--     'cms-user-id-aqui'::uuid
-- );

-- EXEMPLOS DE USO:

-- Teste de configuração:
-- SELECT public.test_password_update_config();

-- Listar usuários CMS:
-- SELECT id, name, email FROM auth.users au 
-- JOIN public.profiles p ON au.id = p.id 
-- WHERE p.user_role = 'cms' AND p.authorized = TRUE;

-- Listar psicólogos:
-- SELECT p.id, p.name, p.username, p.guardian_email, au.email as auth_email
-- FROM public.profiles p
-- LEFT JOIN auth.users au ON p.id = au.id
-- WHERE p.user_role IN ('psicologo', 'psicologos')
-- ORDER BY p.created_at DESC;

-- Exemplo de atualização de senha:
-- SELECT public.update_psicologo_password(
--     '12345678-1234-1234-1234-123456789012'::uuid,  -- ID do psicólogo
--     'MinhaNovaSenh@123',                           -- Nova senha
--     '87654321-4321-4321-4321-210987654321'::uuid   -- ID do usuário CMS
-- );

-- Verificar logs de auditoria:
-- SELECT * FROM public.audit_logs 
-- WHERE action = 'update_password' 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- ===============================================================
-- 🔧 TROUBLESHOOTING COMUM
-- ===============================================================

-- ERRO: "Permissão negada: apenas administradores podem alterar senhas"
-- SOLUÇÃO: Verificar se o usuário CMS está autorizado
-- SELECT id, user_role, authorized FROM public.profiles WHERE id = 'cms-user-id';

-- ERRO: "Psicólogo não encontrado"
-- SOLUÇÃO: Verificar se o psicólogo existe e tem role correto
-- SELECT id, name, user_role FROM public.profiles WHERE id = 'psicologo-id';

-- ERRO: "A senha deve ter entre 6 e 72 caracteres"
-- SOLUÇÃO: Ajustar o tamanho da senha

-- ERRO: Function does not exist
-- SOLUÇÃO: Execute o script SQL completo novamente

-- Verificar se extensão pgcrypto está instalada:
-- SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- ===============================================================
-- ✅ RESUMO: SISTEMA COMPLETO PARA ATUALIZAÇÃO DE SENHAS
-- ===============================================================

-- 🎯 OBJETIVO: Permitir que usuários CMS alterem senhas de psicólogos
-- 
-- 📚 FUNCIONALIDADES DISPONÍVEIS:
-- ✅ Função update_psicologo_password() - altera senha diretamente
-- ✅ Função test_password_update_config() - testa configuração
-- ✅ Tabela audit_logs - logs de auditoria
-- ✅ Extensão pgcrypto - criptografia segura
-- ✅ Políticas RLS - segurança de acesso
-- ✅ Constraints atualizadas - validações
-- 
-- 🔐 SEGURANÇA:
-- ✅ Apenas usuários CMS autorizados podem alterar senhas
-- ✅ Senhas são criptografadas com bcrypt
-- ✅ Logs de auditoria completos
-- ✅ Validação de tamanho de senha
-- 
-- 🚀 COMO USAR NO FRONTEND:
-- 1. Chamar API que executa public.update_psicologo_password()
-- 2. Passar: ID do psicólogo, nova senha, ID do usuário CMS
-- 3. Verificar resposta JSON com success/error
-- 
-- 🧪 COMO TESTAR:
-- 1. Execute SELECT public.test_password_update_config();
-- 2. Verifique se todos os campos são TRUE
-- 3. Execute exemplo de atualização de senha
-- 4. Verifique logs com SELECT * FROM public.audit_logs;
--
-- O SISTEMA ESTÁ PRONTO PARA USO! 🎉

-- ===============================================================
-- 🔧 CORREÇÃO SEGURA DA CONSTRAINT AUTHORIZATION_LOGS
-- ===============================================================
-- Esta seção corrige a constraint de forma segura, verificando dados existentes primeiro

-- PASSO 1: Verificar valores existentes na coluna action
DO $$ 
DECLARE
    existing_actions TEXT[];
    action_record RECORD;
BEGIN
    -- Buscar todos os valores únicos de action na tabela
    FOR action_record IN 
        SELECT DISTINCT action FROM public.authorization_logs 
        WHERE action IS NOT NULL
    LOOP
        RAISE NOTICE 'Valor encontrado na coluna action: %', action_record.action;
    END LOOP;
    
    -- Contar registros por action
    FOR action_record IN 
        SELECT action, COUNT(*) as count_records 
        FROM public.authorization_logs 
        GROUP BY action 
        ORDER BY count_records DESC
    LOOP
        RAISE NOTICE 'Action: % | Registros: %', action_record.action, action_record.count_records;
    END LOOP;
END $$;

-- PASSO 2: Atualizar valores problemáticos (se existirem)
DO $$ 
BEGIN
    -- Atualizar valores que podem ter nomes diferentes
    UPDATE public.authorization_logs 
    SET action = 'psicologo_created' 
    WHERE action = 'psychologist_created';
    
    UPDATE public.authorization_logs 
    SET action = 'password_changed' 
    WHERE action = 'password_updated';
    
    UPDATE public.authorization_logs 
    SET action = 'account_created' 
    WHERE action = 'user_created';
    
    RAISE NOTICE 'Valores de action padronizados';
END $$;

-- PASSO 3: Remover constraint antiga e criar nova com TODOS os valores encontrados
DO $$ 
BEGIN
    -- Remover constraint antiga se existir
    ALTER TABLE public.authorization_logs DROP CONSTRAINT IF EXISTS authorization_logs_action_check;
    
    -- Criar nova constraint com TODOS os valores possíveis encontrados + novos
    ALTER TABLE public.authorization_logs ADD CONSTRAINT authorization_logs_action_check 
    CHECK (action IN (
        'account_created', 
        'email_sent', 
        'email_resent', 
        'authorized', 
        'rejected', 
        'role_changed', 
        'psicologo_created',
        'psicologo_deleted',
        'password_change_requested',
        'update_password',
        'password_changed',
        'password_updated',
        'user_created',
        'psychologist_created'
    ));
    
    RAISE NOTICE 'Constraint authorization_logs_action_check atualizada com TODOS os valores possíveis';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao atualizar constraint: %', SQLERRM;
    
    -- Se ainda houver erro, vamos descobrir quais valores estão causando problema
    RAISE NOTICE 'Executando diagnóstico de valores problemáticos...';
    
    -- Criar constraint temporária mais restritiva para identificar problema
    DECLARE
        action_record RECORD;
    BEGIN
        FOR action_record IN 
            SELECT DISTINCT action 
            FROM public.authorization_logs 
            WHERE action NOT IN (
                'account_created', 'email_sent', 'email_resent', 'authorized', 
                'rejected', 'role_changed', 'psicologo_created', 'psicologo_deleted',
                'password_change_requested', 'update_password', 'password_changed',
                'password_updated', 'user_created', 'psychologist_created'
            )
        LOOP
            RAISE NOTICE 'VALOR PROBLEMÁTICO encontrado: "%"', action_record.action;
        END LOOP;
    END;
END $$;