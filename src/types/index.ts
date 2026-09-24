export type UserRole =
  | 'ADMINISTRADOR'
  | 'GERENTE'
  | 'ORÇAMENTISTA'
  | 'FUNCIONÁRIO'
  | 'CLIENT'
  | 'client'
  | 'master'
  | 'admin'
  | 'MASTER'
  | 'ADMIN';

export interface Company {
  id: string;
  trade_name: string; // Nome fantasia
  legal_name: string; // Razão social
  cnpj: string;
  cpf?: string;
  phone: string;
  whatsapp: string;
  email: string;
  website?: string;
  instagram?: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string; // CEP
  logo_url: string;
  pix_key?: string;
}

export interface User {
  id: string;
  company_id: string;
  name: string;
  avatar: string;
  role: UserRole;
  phone: string;
  whatsapp: string;
  email: string;
  password?: string;
  active: boolean;
  created_at: string;
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'canceled' | string;
  subscription_status?: 'trial' | 'active' | 'expired' | 'canceled' | string;
  trialEndsAt?: string; // AAAA-MM-DD
  trial_ends_at?: string;
  trial_start?: string; // Data e hora atual de início do trial
  trial_end?: string; // Data e hora atual de término do trial (atual + 15 dias)
}

export interface Client {
  id: string;
  company_id: string;
  user_id?: string;
  name: string;
  document: string; // CPF ou CNPJ
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  notes?: string;
  created_at: string;
}

export type QuoteStatus = 
  | 'Novo'
  | 'Em elaboração'
  | 'Enviado'
  | 'Aguardando resposta'
  | 'Aprovado'
  | 'Recusado'
  | 'Cancelado';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string; // m², un, h, vb, km, etc.
  unit_price: number;
  unit_cost?: number; // Custo unitário para cálculo de margem
  total_price: number;
  group_id?: string;
  group_title?: string;
}

export interface ClientMaterialItem {
  id: string;
  description: string;
  quantity: number;
  unit: string; // lata, galão, barrica, saco, rolo, un, m², etc.
  estimated_price?: number; // valor unitário estimado
  total_price?: number; // valor total estimado
  notes?: string;
}

export interface ClientExtraExpense {
  id: string;
  description: string;
  quantity: number;
  unit?: string; // un, diária, taxa, viagem, etc.
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface Quote {
  id: string;
  code: string; // e.g. ORC-2025-001
  company_id: string;
  user_id?: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  client_address: string;
  date: string;
  valid_until: string;
  responsible_id: string;
  responsible_name: string;
  items: QuoteItem[];
  client_materials?: ClientMaterialItem[];
  client_expenses?: ClientExtraExpense[];
  client_materials_total?: number;
  client_expenses_total?: number;
  subtotal: number;
  discount: number;
  addition: number;
  total: number;
  status: QuoteStatus;
  notes?: string;
  payment_terms?: string;
  down_payment_percent?: number;
  down_payment_value?: number;
  remaining_balance?: number;
  execution_period?: string;
  converted_to_project_id?: string;
  created_at: string;
}

export type AppointmentStatus =
  | 'Agendado'
  | 'Confirmado'
  | 'Em atendimento'
  | 'Realizado'
  | 'Cancelado'
  | 'Reagendado';

export interface Appointment {
  id: string;
  company_id: string;
  user_id?: string;
  client_id?: string;
  client_name: string;
  phone: string;
  whatsapp: string;
  address: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  responsible_id: string;
  responsible_name: string;
  service_type: string;
  value?: number; // Valor da visita / serviço / taxa cobrada ou estimada
  notes?: string;
  status: AppointmentStatus;
  quote_id?: string;
  created_at: string;
}

export interface MonthlyGoalExpenseItem {
  id: string;
  description: string; // Ex: Conta de luz, Aluguel, Combustível, etc.
  date: string; // YYYY-MM-DD
  amount: number;
  category?: string;
}

export interface MonthlyGoal {
  month: string; // YYYY-MM
  total_expenses: number; // Gastos totais do mês
  work_days: number; // Dias trabalhados no mês (diluição)
  profit_goal?: number; // Meta de lucro adicional
  daily_goal: number; // Meta diária calculada = (total_expenses + profit_goal) / work_days
  notes?: string;
  expenses_breakdown?: MonthlyGoalExpenseItem[]; // Itens de gastos cadastrados (conta de luz, data, valor...)
}

export type AppointmentType = Appointment;

export type ProjectStatus =
  | 'Agendada'
  | 'Em andamento'
  | 'Pausada'
  | 'Atrasada'
  | 'Concluída'
  | 'Cancelada';

export interface ProjectTask {
  id: string;
  project_id?: string;
  title: string;
  responsible_name?: string;
  due_date?: string;
  status?: 'Pendente' | 'Em execução' | 'Concluído';
  completed?: boolean;
  notes?: string;
}

export interface ProjectPhoto {
  id: string;
  project_id?: string;
  stage?: 'ANTES' | 'DURANTE' | 'DEPOIS' | string;
  category?: 'Antes' | 'Durante' | 'Depois' | string;
  url: string;
  caption?: string;
  date?: string;
  created_at?: string;
}

export interface DailyLog {
  id: string;
  project_id?: string;
  date: string;
  description: string;
  workers_present?: string[];
  issues_encountered?: string;
  created_at?: string;
}

export interface Project {
  id: string;
  code: string; // e.g. OBR-2025-001
  name: string; // Nome da obra ou serviço
  company_id: string;
  user_id?: string;
  quote_id?: string;
  client_id: string;
  client_name: string;
  phone?: string;
  client_phone?: string;
  whatsapp?: string;
  address: string;
  start_date: string;
  expected_completion_date: string;
  actual_completion_date?: string;
  responsible_id: string;
  responsible_name: string;
  team_members: string[]; // nomes ou ids
  total_value: number;
  received_value: number;
  progress: number; // 0 - 100
  status: ProjectStatus;
  notes?: string;
  tasks: ProjectTask[];
  photos: ProjectPhoto[];
  daily_logs?: DailyLog[];
  created_at: string;
}

export type PaymentMethod = 'PIX' | 'Dinheiro' | 'Cartão' | 'Transferência' | 'Boleto' | 'Outro';
export type FinancialStatus = 'Recebido' | 'Pendente' | 'Vencido' | 'Pago';
export type PaymentStatus = FinancialStatus;

export interface FinancialEntry {
  id: string;
  company_id: string;
  user_id?: string;
  project_id?: string;
  project_title?: string;
  client_id?: string;
  client_name: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  status: FinancialStatus;
  created_at: string;
}

export type ExpenseCategory =
  | 'Material'
  | 'Funcionários'
  | 'Transporte'
  | 'Combustível'
  | 'Ferramentas'
  | 'Alimentação'
  | 'Terceirizados'
  | 'Impostos'
  | 'Outros';

export interface FinancialExpense {
  id: string;
  company_id: string;
  user_id?: string;
  project_id?: string;
  project_title?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  supplier?: string;
  payment_method: PaymentMethod;
  status: FinancialStatus;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: 'appointment' | 'project' | 'financial' | 'quote' | 'info';
  timestamp: string;
  read: boolean;
  action_tab?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'clients'
  | 'quotes'
  | 'appointments'
  | 'calendar'
  | 'projects'
  | 'financial'
  | 'team'
  | 'reports'
  | 'settings'
  | 'master-admin';

export interface SystemBackupData {
  backup_version: string;
  exported_at: string;
  company_id: string;
  user_id?: string;
  user_email?: string;
  system: string;
  company?: Company;
  clients?: Client[];
  quotes?: Quote[];
  appointments?: Appointment[];
  projects?: Project[];
  financialEntries?: FinancialEntry[];
  financialExpenses?: FinancialExpense[];
  monthlyGoals?: Record<string, MonthlyGoal>;
  counts?: {
    clients: number;
    quotes: number;
    appointments: number;
    projects: number;
    financialEntries: number;
    financialExpenses: number;
  };
}
