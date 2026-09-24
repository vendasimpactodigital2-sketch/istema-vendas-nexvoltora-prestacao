import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

const CONFIG_STORAGE_KEY = 'ozi_supabase_config';

export function getSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse supabase config:', e);
  }
  return {
    url: '',
    anonKey: '',
    enabled: false,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.enabled || !config.url || !config.anonKey) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey);
    } catch (e) {
      console.error('Error creating Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
}

export const SUPABASE_SQL_SCHEMA = `-- OZI Gestão de Serviços - Schema e Políticas RLS para Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela: companies
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela: users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'ADMINISTRADOR', -- ADMINISTRADOR, GERENTE, ORÇAMENTISTA, FUNCIONÁRIO
    phone TEXT,
    whatsapp TEXT,
    email TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela: clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela: quotes (Orçamentos)
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_address TEXT,
    date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    responsible_id UUID REFERENCES public.users(id),
    responsible_name TEXT,
    subtotal NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    addition NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Novo', -- Novo, Em elaboração, Enviado, Aguardando resposta, Aprovado, Recusado, Cancelado
    notes TEXT,
    payment_terms TEXT,
    execution_period TEXT,
    converted_to_project_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela: quote_items
CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 1,
    unit TEXT DEFAULT 'un',
    unit_price NUMERIC(12,2) DEFAULT 0,
    total_price NUMERIC(12,2) DEFAULT 0
);

-- 7. Tabela: appointments (Agenda de visitas e orçamentos)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    responsible_id UUID REFERENCES public.users(id),
    responsible_name TEXT,
    service_type TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Agendado',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela: projects (Obras)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    responsible_id UUID REFERENCES public.users(id),
    responsible_name TEXT,
    team_members JSONB DEFAULT '[]'::jsonb,
    total_value NUMERIC(12,2) DEFAULT 0,
    received_value NUMERIC(12,2) DEFAULT 0,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Agendada',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela: project_tasks
CREATE TABLE IF NOT EXISTS public.project_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    responsible_name TEXT,
    due_date DATE,
    status TEXT DEFAULT 'Pendente',
    notes TEXT
);

-- 10. Tabela: project_photos
CREATE TABLE IF NOT EXISTS public.project_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    stage TEXT NOT NULL, -- ANTES, DURANTE, DEPOIS
    url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tabela: financial_entries (Entradas)
CREATE TABLE IF NOT EXISTS public.financial_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    project_title TEXT,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL,
    payment_method TEXT DEFAULT 'PIX',
    status TEXT DEFAULT 'Recebido',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Tabela: financial_expenses (Gastos)
CREATE TABLE IF NOT EXISTS public.financial_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    project_title TEXT,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL,
    supplier TEXT,
    payment_method TEXT DEFAULT 'PIX',
    status TEXT DEFAULT 'Pago',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Tabela: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    action_tab TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ISOLAMENTO POR EMPRESA
-- Exemplo: Cada usuário só tem acesso aos registros do seu company_id
CREATE POLICY "company_isolation_clients" ON public.clients
    FOR ALL
    USING (company_id IN (SELECT company_id FROM public.users WHERE email = auth.jwt()->>'email'));

CREATE POLICY "company_isolation_projects" ON public.projects
    FOR ALL
    USING (company_id IN (SELECT company_id FROM public.users WHERE email = auth.jwt()->>'email'));
`;
