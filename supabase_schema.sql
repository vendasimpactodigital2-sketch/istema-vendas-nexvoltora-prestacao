-- ==============================================================================
-- SISTEMA PRESTAÇÃO DE SERVIÇO NEXVOLTORA - ESQUEMA COMPLETO PARA SUPABASE
-- Execute este script completo no "SQL Editor" do seu painel do Supabase.
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA: companies (Dados cadastrais da empresa)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    trade_name TEXT NOT NULL,
    legal_name TEXT,
    cnpj TEXT,
    cpf TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    website TEXT,
    instagram TEXT,
    address TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    pix_key TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABELA: users (Perfis de usuários do sistema, vinculados ou não a auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'ADMINISTRADOR', -- ADMINISTRADOR, GERENTE, ORÇAMENTISTA, FUNCIONÁRIO
    phone TEXT,
    whatsapp TEXT,
    email TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    subscription_status TEXT DEFAULT 'trial', -- trial, active, expired
    trial_ends_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABELA: clients (Clientes cadastrados)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABELA: quotes (Orçamentos e propostas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quotes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_address TEXT,
    date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    responsible_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    responsible_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    client_materials JSONB DEFAULT '[]'::jsonb,
    client_materials_total NUMERIC(12,2) DEFAULT 0,
    client_expenses JSONB DEFAULT '[]'::jsonb,
    client_expenses_total NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    addition NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Novo', -- Novo, Em elaboração, Enviado, Aguardando resposta, Aprovado, Recusado, Cancelado
    notes TEXT,
    payment_terms TEXT,
    execution_period TEXT,
    converted_to_project_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. TABELA: appointments (Agenda de visitas e orçamentos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    responsible_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    responsible_name TEXT,
    service_type TEXT,
    value NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'Agendado', -- Agendado, Confirmado, Em atendimento, Concluído, Cancelado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. TABELA: projects (Obras e projetos em execução)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    quote_id TEXT REFERENCES public.quotes(id) ON DELETE SET NULL,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    client_phone TEXT,
    whatsapp TEXT,
    address TEXT,
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    responsible_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    responsible_name TEXT,
    team_members JSONB DEFAULT '[]'::jsonb,
    total_value NUMERIC(12,2) DEFAULT 0,
    received_value NUMERIC(12,2) DEFAULT 0,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Agendada', -- Agendada, Em andamento, Pausada, Concluída, Cancelada
    notes TEXT,
    tasks JSONB DEFAULT '[]'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb,
    daily_logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. TABELA: financial_entries (Entradas financeiras / Recebimentos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.financial_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
    project_title TEXT,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'PIX',
    status TEXT DEFAULT 'Recebido', -- Recebido, Pendente, Cancelado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. TABELA: financial_expenses (Saídas / Despesas e custos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.financial_expenses (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
    project_title TEXT,
    category TEXT NOT NULL DEFAULT 'Material',
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier TEXT,
    payment_method TEXT DEFAULT 'PIX',
    status TEXT DEFAULT 'Pago', -- Pago, Pendente
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. TABELA: notifications (Notificações do sistema)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    timestamp TEXT,
    read BOOLEAN DEFAULT FALSE,
    action_tab TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. TABELA: monthly_goals (Metas mensais)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.monthly_goals (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    total_expenses NUMERIC(12,2) DEFAULT 0,
    work_days INTEGER DEFAULT 22,
    profit_goal NUMERIC(12,2) DEFAULT 0,
    daily_goal NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    expenses_breakdown JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_company ON public.appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_entries_company ON public.financial_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON public.financial_expenses(company_id);

-- ==============================================================================
-- 13. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- Permitir operações de leitura e escrita com chave anônima ou autenticada
-- ==============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;

-- Políticas universais de acesso (permitindo que clientes com chave anon ou autenticada acessem)
DO $$
BEGIN
    DROP POLICY IF EXISTS "allow_all_companies" ON public.companies;
    CREATE POLICY "allow_all_companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "allow_all_users" ON public.users;
    CREATE POLICY "allow_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "allow_all_clients" ON public.clients;
    CREATE POLICY "allow_all_clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "allow_all_quotes" ON public.quotes;
    CREATE POLICY "allow_all_quotes" ON public.quotes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "allow_all_appointments" ON public.appointments;
    CREATE POLICY "allow_all_appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "allow_all_projects" ON public.projects;
    CREATE POLICY "allow_all_projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "allow_all_entries" ON public.financial_entries;
    CREATE POLICY "allow_all_entries" ON public.financial_entries FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "allow_all_expenses" ON public.financial_expenses;
    CREATE POLICY "allow_all_expenses" ON public.financial_expenses FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "allow_all_notifications" ON public.notifications;
    CREATE POLICY "allow_all_notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "allow_all_monthly_goals" ON public.monthly_goals;
    CREATE POLICY "allow_all_monthly_goals" ON public.monthly_goals FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- 14. TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA DO Supabase Auth (auth.users)
-- Cria automaticamente o perfil em public.users quando um usuário se cadastra
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_supabase_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    company_id,
    name,
    email,
    role,
    subscription_status,
    trial_ends_at,
    created_at
  )
  VALUES (
    new.id::text,
    'comp_ozi_01',
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'ADMINISTRADOR'),
    'trial',
    CURRENT_DATE + INTERVAL '15 days',
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    id = new.id::text,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparado na criação de usuário no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_supabase_user();

-- ==============================================================================
-- 15. DADOS INICIAIS DE DEMONSTRAÇÃO (Empresa Nexvoltora)
-- ==============================================================================
INSERT INTO public.companies (
    id, trade_name, legal_name, cnpj, phone, whatsapp, email, website, instagram,
    address, number, complement, neighborhood, city, state, zip_code, logo_url
) VALUES (
    'comp_ozi_01',
    'Nexvoltora Gestão e Prestação de Serviços',
    'Nexvoltora Gestão e Prestação de Serviços Ltda',
    '45.892.123/0001-90',
    '(11) 3456-7890',
    '(11) 98765-4321',
    'contato@nexvoltora.com.br',
    'https://nexvoltora.com.br',
    '@nexvoltora',
    'Av. Paulista',
    '1842',
    'Conjunto 142 - 14º andar',
    'Bela Vista',
    'São Paulo',
    'SP',
    '01310-200',
    '/nexvoltora.png'
) ON CONFLICT (id) DO NOTHING;
