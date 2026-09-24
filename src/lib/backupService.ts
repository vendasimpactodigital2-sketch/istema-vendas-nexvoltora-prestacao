import {
  Company,
  Client,
  Quote,
  Appointment,
  Project,
  FinancialEntry,
  FinancialExpense,
  MonthlyGoal,
  User,
  SystemBackupData,
} from '../types';
import { getSupabase } from './supabaseClient';

export interface GenerateBackupParams {
  company: Company;
  clients: Client[];
  quotes: Quote[];
  appointments: Appointment[];
  projects: Project[];
  financialEntries: FinancialEntry[];
  financialExpenses: FinancialExpense[];
  monthlyGoals?: Record<string, MonthlyGoal>;
  currentUser?: User | null;
}

/**
 * Coleta todos os registros do usuário e empresa atual e estrutura o backup
 */
export function generateBackupData(params: GenerateBackupParams): SystemBackupData {
  const now = new Date();
  const isoDate = now.toISOString();

  const backup: SystemBackupData = {
    backup_version: '1.0',
    exported_at: isoDate,
    company_id: params.company.id || 'comp_ozi_01',
    user_id: params.currentUser?.id,
    user_email: params.currentUser?.email,
    system: 'Nexvoltora Gestão e Prestação de Serviços',
    company: params.company,
    clients: params.clients || [],
    quotes: params.quotes || [],
    appointments: params.appointments || [],
    projects: params.projects || [],
    financialEntries: params.financialEntries || [],
    financialExpenses: params.financialExpenses || [],
    monthlyGoals: params.monthlyGoals || {},
    counts: {
      clients: (params.clients || []).length,
      quotes: (params.quotes || []).length,
      appointments: (params.appointments || []).length,
      projects: (params.projects || []).length,
      financialEntries: (params.financialEntries || []).length,
      financialExpenses: (params.financialExpenses || []).length,
    },
  };

  return backup;
}

/**
 * Gera e dispara o download do arquivo JSON com o nome no formato: backup_dados_[data].json
 */
export function downloadBackupFile(backupData: SystemBackupData): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const filename = `backup_dados_${year}-${month}-${day}_${hours}h${minutes}.json`;

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Lê e valida um arquivo de backup JSON selecionado pelo usuário
 */
export async function parseAndValidateBackupFile(file: File): Promise<SystemBackupData> {
  if (!file) {
    throw new Error('Nenhum arquivo selecionado.');
  }

  if (!file.name.toLowerCase().endsWith('.json')) {
    throw new Error('Formato inválido. O arquivo de backup deve ser no formato .json.');
  }

  let text = '';
  try {
    text = await file.text();
  } catch (err: any) {
    throw new Error(`Falha ao ler arquivo: ${err?.message || 'Arquivo corrompido'}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('O arquivo selecionado não contém um JSON válido ou está corrompido.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Conteúdo do arquivo de backup inválido.');
  }

  // Verifica se possui pelo menos alguma estrutura de dados esperada
  const hasValidFields =
    parsed.backup_version !== undefined ||
    Array.isArray(parsed.clients) ||
    Array.isArray(parsed.quotes) ||
    Array.isArray(parsed.appointments) ||
    Array.isArray(parsed.projects) ||
    Array.isArray(parsed.financialEntries) ||
    parsed.company !== undefined;

  if (!hasValidFields) {
    throw new Error(
      'Estrutura de dados não reconhecida. Certifique-se de usar um arquivo de backup exportado pelo sistema.'
    );
  }

  // Normalização de coleções
  const validated: SystemBackupData = {
    backup_version: parsed.backup_version || '1.0',
    exported_at: parsed.exported_at || new Date().toISOString(),
    company_id: parsed.company_id || 'comp_ozi_01',
    user_id: parsed.user_id,
    user_email: parsed.user_email,
    system: parsed.system || 'Nexvoltora Gestão',
    company: parsed.company,
    clients: Array.isArray(parsed.clients) ? parsed.clients : [],
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
    appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    financialEntries: Array.isArray(parsed.financialEntries) ? parsed.financialEntries : [],
    financialExpenses: Array.isArray(parsed.financialExpenses) ? parsed.financialExpenses : [],
    monthlyGoals: parsed.monthlyGoals || {},
    counts: {
      clients: (parsed.clients || []).length,
      quotes: (parsed.quotes || []).length,
      appointments: (parsed.appointments || []).length,
      projects: (parsed.projects || []).length,
      financialEntries: (parsed.financialEntries || []).length,
      financialExpenses: (parsed.financialExpenses || []).length,
    },
  };

  return validated;
}

/**
 * Salva e insere todos os registros restaurados no Supabase vinculando ao usuário logado e empresa
 */
export async function restoreBackupToSupabase(
  backupData: SystemBackupData,
  currentUserId: string,
  targetCompanyId: string
): Promise<{
  successCount: {
    clients: number;
    quotes: number;
    appointments: number;
    projects: number;
    financialEntries: number;
    financialExpenses: number;
  };
  errors: string[];
}> {
  const supabase = getSupabase();
  const errors: string[] = [];
  const successCount = {
    clients: 0,
    quotes: 0,
    appointments: 0,
    projects: 0,
    financialEntries: 0,
    financialExpenses: 0,
  };

  const companyId = targetCompanyId || backupData.company_id || 'comp_ozi_01';

  // 1. Atualizar empresa se disponível
  if (supabase && backupData.company) {
    try {
      const companyPayload = {
        ...backupData.company,
        id: companyId,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('companies').upsert(companyPayload);
    } catch (err: any) {
      console.warn('[Restore] Erro ao sincronizar empresa no Supabase:', err);
    }
  }

  // 2. Restaurar Clientes
  if (backupData.clients && backupData.clients.length > 0) {
    const clientsToRestore = backupData.clients.map((c) => ({
      ...c,
      company_id: companyId,
      user_id: currentUserId || (c as any).user_id,
    }));
    successCount.clients = clientsToRestore.length;

    if (supabase) {
      try {
        const { error } = await supabase.from('clients').upsert(clientsToRestore);
        if (error) {
          console.warn('[Restore] Supabase clients upsert warning:', error.message);
          errors.push(`Aviso Clientes: ${error.message}`);
        }
      } catch (e: any) {
        console.warn('[Restore] Falha de rede clients Supabase:', e);
      }
    }
  }

  // 3. Restaurar Orçamentos
  if (backupData.quotes && backupData.quotes.length > 0) {
    const quotesToRestore = backupData.quotes.map((q) => ({
      ...q,
      company_id: companyId,
      user_id: currentUserId || (q as any).user_id,
    }));
    successCount.quotes = quotesToRestore.length;

    if (supabase) {
      try {
        const { error } = await supabase.from('quotes').upsert(quotesToRestore);
        if (error) {
          console.warn('[Restore] Supabase quotes upsert warning:', error.message);
          errors.push(`Aviso Orçamentos: ${error.message}`);
        }
      } catch (e: any) {
        console.warn('[Restore] Falha de rede quotes Supabase:', e);
      }
    }
  }

  // 4. Restaurar Agendamentos
  if (backupData.appointments && backupData.appointments.length > 0) {
    const appointmentsToRestore = backupData.appointments.map((a) => ({
      ...a,
      company_id: companyId,
      user_id: currentUserId || (a as any).user_id,
    }));
    successCount.appointments = appointmentsToRestore.length;

    if (supabase) {
      try {
        const { error } = await supabase.from('appointments').upsert(appointmentsToRestore);
        if (error) {
          console.warn('[Restore] Supabase appointments upsert warning:', error.message);
          errors.push(`Aviso Agenda: ${error.message}`);
        }
      } catch (e: any) {
        console.warn('[Restore] Falha de rede appointments Supabase:', e);
      }
    }
  }

  // 5. Restaurar Obras / Projetos
  if (backupData.projects && backupData.projects.length > 0) {
    const projectsToRestore = backupData.projects.map((p) => ({
      ...p,
      company_id: companyId,
      user_id: currentUserId || (p as any).user_id,
    }));
    successCount.projects = projectsToRestore.length;

    if (supabase) {
      try {
        const { error } = await supabase.from('projects').upsert(projectsToRestore);
        if (error) {
          console.warn('[Restore] Supabase projects upsert warning:', error.message);
          errors.push(`Aviso Obras: ${error.message}`);
        }
      } catch (e: any) {
        console.warn('[Restore] Falha de rede projects Supabase:', e);
      }
    }
  }

  // 6. Restaurar Entradas Financeiras
  if (backupData.financialEntries && backupData.financialEntries.length > 0) {
    const entriesToRestore = backupData.financialEntries.map((fe) => ({
      ...fe,
      company_id: companyId,
      user_id: currentUserId || (fe as any).user_id,
    }));
    successCount.financialEntries = entriesToRestore.length;

    if (supabase) {
      try {
        const { error } = await supabase.from('financial_entries').upsert(entriesToRestore);
        if (error) {
          console.warn('[Restore] Supabase financial_entries warning:', error.message);
        }
      } catch (e: any) {
        console.warn('[Restore] Falha financial_entries Supabase:', e);
      }
    }
  }

  // 7. Restaurar Despesas Financeiras
  if (backupData.financialExpenses && backupData.financialExpenses.length > 0) {
    const expensesToRestore = backupData.financialExpenses.map((ex) => ({
      ...ex,
      company_id: companyId,
      user_id: currentUserId || (ex as any).user_id,
    }));
    successCount.financialExpenses = expensesToRestore.length;

    if (supabase) {
      try {
        const { error } = await supabase.from('financial_expenses').upsert(expensesToRestore);
        if (error) {
          console.warn('[Restore] Supabase financial_expenses warning:', error.message);
        }
      } catch (e: any) {
        console.warn('[Restore] Falha financial_expenses Supabase:', e);
      }
    }
  }

  return { successCount, errors };
}
