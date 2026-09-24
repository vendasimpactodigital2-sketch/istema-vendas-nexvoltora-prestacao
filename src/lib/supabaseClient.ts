import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import {
  Company,
  User,
  Client,
  Quote,
  Appointment,
  Project,
  FinancialEntry,
  FinancialExpense,
  UserRole,
} from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

const CONFIG_STORAGE_KEY = 'ozi_supabase_config';
export const DEFAULT_SUPABASE_URL = 'https://zouhxmhjwnprmphhnxzs.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_CGlCehfEI8l4myXL5jcURg_sV0xEDay';

export function sanitizeAnonKey(key?: string): string {
  if (!key) return DEFAULT_SUPABASE_ANON_KEY;
  const trimmed = key.trim();
  // Se a chave estiver truncada (faltando 'Day' no final)
  if (trimmed === 'sb_publishable_CGlCehfEI8l4myXL5jcURg_sV0xE') {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  if (trimmed.length < 20) {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  return trimmed;
}

// Recupera variáveis de ambiente configuradas ou salvas
export function getSupabaseEnvConfig(): { url: string; anonKey: string } {
  const envUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
    DEFAULT_SUPABASE_URL;

  const rawKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
    '';

  const anonKey = sanitizeAnonKey(rawKey);

  return {
    url: envUrl || DEFAULT_SUPABASE_URL,
    anonKey: anonKey || DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseConfig(): SupabaseConfig {
  const env = getSupabaseEnvConfig();
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        const sanitized = sanitizeAnonKey(parsed.anonKey);
        if (sanitized !== parsed.anonKey) {
          parsed.anonKey = sanitized;
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(parsed));
        }
        return {
          url: parsed.url,
          anonKey: sanitized,
          enabled: true,
        };
      }
    }
  } catch (e) {
    console.error('Falha ao ler configuração local do Supabase:', e);
  }

  return {
    url: env.url,
    anonKey: env.anonKey,
    enabled: Boolean(env.url && env.anonKey),
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  const sanitizedConfig = {
    ...config,
    anonKey: sanitizeAnonKey(config.anonKey),
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(sanitizedConfig));
  supabaseInstance = null; // Reinicializa instância
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(forceFresh = false): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }
  if (!supabaseInstance || forceFresh) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (e) {
      console.error('Erro ao inicializar cliente Supabase:', e);
      return null;
    }
  }
  return supabaseInstance;
}

export function isSupabaseConnected(): boolean {
  const client = getSupabase();
  return Boolean(client);
}

// ==============================================================================
// 1. MÉTODOS DE AUTENTICAÇÃO SUPABASE (supabase.auth)
// ==============================================================================

export type SupabaseUser = SupabaseAuthUser;

export async function signInWithSupabase(email: string, password: string): Promise<User> {
  let supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado. Adicione a URL e Chave Anon nas Configurações.');
  }

  let res = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  // Se erro de API Key inválida, corrige a chave e tenta novamente
  if (res.error && res.error.message?.includes('Invalid API key')) {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    supabaseInstance = null;
    supabase = getSupabase(true);
    if (supabase) {
      res = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
    }
  }

  if (res.error) {
    throw new Error(res.error.message || 'Falha ao autenticar com Supabase.');
  }

  if (!res.data?.user) {
    throw new Error('Usuário não encontrado na resposta do Supabase.');
  }

  return await verifyUserSubscriptionInSupabase(res.data.user.id, res.data.user.email || email);
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  extra: {
    name: string;
    role: UserRole;
    phone?: string;
    whatsapp?: string;
    company_id?: string;
  }
): Promise<User> {
  let supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado. Adicione a URL e Chave Anon nas Configurações.');
  }

  let res = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        name: extra.name.trim(),
        role: extra.role,
        phone: extra.phone || '',
        whatsapp: extra.whatsapp || '',
        company_id: extra.company_id || 'comp_ozi_01',
      },
    },
  });

  // Se erro de API Key inválida, corrige a chave e tenta novamente
  if (res.error && res.error.message?.includes('Invalid API key')) {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    supabaseInstance = null;
    supabase = getSupabase(true);
    if (supabase) {
      res = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: extra.name.trim(),
            role: extra.role,
            phone: extra.phone || '',
            whatsapp: extra.whatsapp || '',
            company_id: extra.company_id || 'comp_ozi_01',
          },
        },
      });
    }
  }

  if (res.error) {
    throw new Error(res.error.message || 'Falha ao cadastrar usuário no Supabase.');
  }

  const userId = res.data.user?.id || `usr_${Date.now()}`;
  const trialDates = calculateTrialEndDates(15);

  const newUser: User = {
    id: userId,
    company_id: extra.company_id || 'comp_ozi_01',
    name: extra.name.trim(),
    email: email.trim().toLowerCase(),
    phone: extra.phone || '(11) 98765-4321',
    whatsapp: extra.whatsapp || extra.phone || '(11) 98765-4321',
    role: extra.role,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    active: true,
    created_at: trialDates.trial_start,
    subscriptionStatus: 'trial',
    subscription_status: 'trial',
    trial_start: trialDates.trial_start,
    trial_end: trialDates.trial_end,
    trial_ends_at: trialDates.trial_ends_at,
    trialEndsAt: trialDates.trial_ends_at,
  };

  await syncUserProfileToSupabase(newUser);
  return newUser;
}

export async function signInWithGoogleOAuth(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message || 'Falha ao autenticar com Google no Supabase.');
  }
}

export async function sendSupabasePasswordReset(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/#reset-password`,
  });

  if (error) {
    throw new Error(error.message || 'Falha ao solicitar redefinição de senha.');
  }
}

export async function signOutSupabase(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Erro ao sair do Supabase:', e);
    }
  }
}

// ==============================================================================
// 2. CONTROLE DE ASSINATURA E PERÍODO DE TESTE (15 DIAS)
// ==============================================================================

export interface TrialDates {
  trial_start: string; // ISO string data/hora atual
  trial_end: string;   // ISO string data/hora atual + 15 dias
  trial_ends_at: string; // YYYY-MM-DD
  trialEndsAt: string;   // YYYY-MM-DD
}

export function calculateTrialEndDates(days = 15): TrialDates {
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const endIso = end.toISOString();
  const endDateStr = endIso.split('T')[0];

  return {
    trial_start: now.toISOString(),
    trial_end: endIso,
    trial_ends_at: endDateStr,
    trialEndsAt: endDateStr,
  };
}

export function calculateTrialEndsAt(days = 15): string {
  return calculateTrialEndDates(days).trial_ends_at;
}

export function isTrialActive(trialEndStr?: string | null): boolean {
  if (!trialEndStr) return true; // Se não definido ainda, permite acesso inicial de teste
  const now = new Date();
  let trialEndDate: Date;

  const trimmed = trialEndStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // Para data pura AAAA-MM-DD, concede até 23:59:59.999 do dia
    trialEndDate = new Date(`${trimmed}T23:59:59.999Z`);
  } else {
    trialEndDate = new Date(trimmed);
  }

  if (isNaN(trialEndDate.getTime())) return true;
  return now.getTime() <= trialEndDate.getTime();
}

export function parseTrialDate(rawDate: any): string | null {
  if (!rawDate) return null;
  if (typeof rawDate === 'object') {
    if (typeof rawDate.toDate === 'function') {
      try {
        return rawDate.toDate().toISOString();
      } catch (e) {}
    }
    if (typeof rawDate.seconds === 'number') {
      return new Date(rawDate.seconds * 1000).toISOString();
    }
    if (rawDate instanceof Date) {
      return rawDate.toISOString();
    }
  }
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split('/');
      return `${y}-${m}-${d}`;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return null;
}

export interface SubscriptionStatusInfo {
  isBlocked: boolean;
  status: string; // 'trial' | 'active' | 'expired' | string
  trialEndsAt?: string;
  trialEnd?: string;
  isExpired: boolean;
  daysRemaining?: number;
}

export function evaluateSubscription(user: Partial<User> | null | undefined): SubscriptionStatusInfo {
  if (!user) {
    return { isBlocked: false, status: 'unknown', isExpired: false };
  }

  const rawStatus = (
    user.subscriptionStatus ||
    user.subscription_status ||
    (user as any).status ||
    'trial'
  ).toString().trim().toLowerCase();

  const trialEndVal =
    user.trial_end ||
    user.trial_ends_at ||
    user.trialEndsAt ||
    (user as any).trialEndDate;

  const now = new Date();

  // Status ativo: acesso garantido e irrestrito
  if (rawStatus === 'active' || rawStatus === 'ativo') {
    return {
      isBlocked: false,
      status: 'active',
      trialEndsAt: trialEndVal ? trialEndVal.split('T')[0] : undefined,
      trialEnd: trialEndVal || undefined,
      isExpired: false,
    };
  }

  // Período de teste grátis (trial)
  if (rawStatus === 'trial' || rawStatus === 'teste' || !rawStatus) {
    const effectiveTrialEnd = trialEndVal || new Date(now.getTime() + 15 * 86400000).toISOString();
    const active = isTrialActive(effectiveTrialEnd);

    if (active) {
      let daysRemaining = 15;
      try {
        const endDate = effectiveTrialEnd.includes('T')
          ? new Date(effectiveTrialEnd)
          : new Date(`${effectiveTrialEnd}T23:59:59.999Z`);
        const diffMs = endDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } catch (e) {
        daysRemaining = 15;
      }

      return {
        isBlocked: false, // Acesso normal e irrestrito durante o período de teste
        status: 'trial',
        trialEndsAt: effectiveTrialEnd.split('T')[0],
        trialEnd: effectiveTrialEnd,
        isExpired: false,
        daysRemaining,
      };
    } else {
      // Período de teste efetivamente expirou (data atual posterior a trial_end)
      return {
        isBlocked: true,
        status: 'expired',
        trialEndsAt: effectiveTrialEnd.split('T')[0],
        trialEnd: effectiveTrialEnd,
        isExpired: true,
        daysRemaining: 0,
      };
    }
  }

  // Casos explicitamente expirados ou cancelados
  if (
    rawStatus === 'expired' ||
    rawStatus === 'vencido' ||
    rawStatus === 'bloqueado' ||
    rawStatus === 'inactive' ||
    rawStatus === 'cancelado' ||
    rawStatus === 'trial_expired'
  ) {
    return {
      isBlocked: true,
      status: 'expired',
      trialEndsAt: trialEndVal ? trialEndVal.split('T')[0] : undefined,
      trialEnd: trialEndVal || undefined,
      isExpired: true,
      daysRemaining: 0,
    };
  }

  // Fallback: se trialEndVal estiver ativo com base no tempo atual, concede acesso
  if (trialEndVal && isTrialActive(trialEndVal)) {
    return {
      isBlocked: false,
      status: 'trial',
      trialEndsAt: trialEndVal.split('T')[0],
      trialEnd: trialEndVal,
      isExpired: false,
      daysRemaining: 15,
    };
  }

  return {
    isBlocked: true,
    status: rawStatus,
    trialEndsAt: trialEndVal ? trialEndVal.split('T')[0] : undefined,
    trialEnd: trialEndVal || undefined,
    isExpired: true,
    daysRemaining: 0,
  };
}

export async function verifyUserSubscriptionInSupabase(userId: string, email?: string): Promise<User> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const supabase = getSupabase();

  if (supabase) {
    try {
      let query = supabase.from('users').select('*');
      if (userId) {
        query = query.or(`id.eq.${userId},email.eq.${email || ''}`);
      } else if (email) {
        query = query.eq('email', email);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        const rawStatus = (data.subscription_status || data.subscriptionStatus || 'trial').toLowerCase().trim();
        const rawTrialEnd = data.trial_end || data.trial_ends_at || data.trialEndsAt;

        let finalStatus = rawStatus;
        let effectiveTrialEnd = rawTrialEnd;

        if (rawStatus === 'active' || rawStatus === 'ativo') {
          finalStatus = 'active';
        } else if (rawStatus === 'trial' || rawStatus === 'teste') {
          if (!rawTrialEnd) {
            // Se registro de trial não tinha data, cria 15 dias a partir de hoje
            const trialDates = calculateTrialEndDates(15);
            effectiveTrialEnd = trialDates.trial_end;
            finalStatus = 'trial';
            try {
              await supabase
                .from('users')
                .update({
                  subscription_status: 'trial',
                  trial_start: trialDates.trial_start,
                  trial_end: trialDates.trial_end,
                  trial_ends_at: trialDates.trial_ends_at,
                  updated_at: now.toISOString(),
                })
                .eq('id', data.id);
            } catch (e) {}
          } else {
            const isValid = isTrialActive(rawTrialEnd);
            finalStatus = isValid ? 'trial' : 'expired';
          }
        } else if (
          rawStatus === 'expired' ||
          rawStatus === 'vencido' ||
          rawStatus === 'bloqueado' ||
          rawStatus === 'inactive'
        ) {
          finalStatus = 'expired';
        } else {
          finalStatus = 'expired';
        }

        // Checar webhook em tempo real se o status estiver expired
        if (finalStatus === 'expired') {
          try {
            const checkEmail = data.email || email || '';
            const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(checkEmail)}&uid=${encodeURIComponent(userId)}`);
            if (res.ok) {
              const checkData = await res.json();
              if (checkData.active || checkData.subscriptionStatus === 'active') {
                finalStatus = 'active';
                try {
                  await supabase
                    .from('users')
                    .update({ subscription_status: 'active', updated_at: now.toISOString() })
                    .eq('id', data.id);
                } catch (e) {}
              }
            }
          } catch (e) {}
        }

        const effectiveTrialEndsAtDate = effectiveTrialEnd
          ? effectiveTrialEnd.split('T')[0]
          : calculateTrialEndsAt(15);

        return {
          id: data.id,
          company_id: data.company_id || 'comp_ozi_01',
          name: data.name || email?.split('@')[0] || 'Usuário Sistema',
          email: data.email || email || '',
          phone: data.phone || '(11) 98765-4321',
          whatsapp: data.whatsapp || data.phone || '(11) 98765-4321',
          role: data.role || 'ADMINISTRADOR',
          avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          active: data.active ?? true,
          created_at: data.created_at || now.toISOString(),
          subscriptionStatus: finalStatus,
          subscription_status: finalStatus,
          trial_start: data.trial_start || now.toISOString(),
          trial_end: effectiveTrialEnd || undefined,
          trialEndsAt: effectiveTrialEndsAtDate,
          trial_ends_at: effectiveTrialEndsAtDate,
        };
      }
    } catch (err) {
      console.warn('Erro ao verificar usuário no Supabase:', err);
    }
  }

  // Fallback seguro: 15 dias de teste a partir de hoje
  const trialDates = calculateTrialEndDates(15);
  return {
    id: userId,
    company_id: 'comp_ozi_01',
    name: email?.split('@')[0] || 'Usuário Sistema',
    email: email || '',
    phone: '(11) 98765-4321',
    whatsapp: '(11) 98765-4321',
    role: 'ADMINISTRADOR',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    active: true,
    created_at: trialDates.trial_start,
    subscriptionStatus: 'trial',
    subscription_status: 'trial',
    trial_start: trialDates.trial_start,
    trial_end: trialDates.trial_end,
    trialEndsAt: trialDates.trial_ends_at,
    trial_ends_at: trialDates.trial_ends_at,
  };
}

/**
 * Escuta em tempo real no Supabase (Realtime Channel + polling resiliente)
 * para desbloqueio imediato da assinatura assim que o webhook do Asaas confirmar o pagamento
 */
export function subscribeToUserSubscription(
  userId: string,
  userEmail: string,
  onStatusActive: (userData: any) => void
): () => void {
  const supabase = getSupabase();
  let channel: any = null;
  let isSubscribed = true;
  const cleanEmail = (userEmail || '').toLowerCase().trim();

  if (supabase) {
    try {
      const channelName = `sub_realtime_${userId || cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
          },
          (payload: any) => {
            if (!isSubscribed) return;
            const updated = payload?.new;
            if (!updated) return;

            const matchesId = userId && updated.id === userId;
            const matchesEmail = cleanEmail && (updated.email || '').toLowerCase().trim() === cleanEmail;

            if (matchesId || matchesEmail) {
              const rawSt = (updated.subscription_status || updated.subscriptionStatus || '').toLowerCase();
              if (rawSt === 'active' || rawSt === 'ativo') {
                console.log('[Supabase Realtime] Pagamento confirmado! subscription_status = active!');
                onStatusActive(updated);
              }
            }
          }
        )
        .subscribe((status: string) => {
          console.log(`[Supabase Realtime] Canal de assinatura ativo status: ${status}`);
        });
    } catch (e) {
      console.warn('[Supabase Realtime] Falha ao registrar canal:', e);
    }
  }

  // Polling de redundância a cada 2 segundos via endpoint do Webhook do Asaas e consulta direta
  const pollInterval = setInterval(async () => {
    if (!isSubscribed) return;
    try {
      // 1. Checar endpoint do webhook do Asaas
      if (cleanEmail || userId) {
        const res = await fetch(
          `/api/subscription/status?email=${encodeURIComponent(cleanEmail)}&uid=${encodeURIComponent(userId || '')}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.active || data.subscriptionStatus === 'active') {
            console.log('[Escuta Asaas Webhook] Pagamento confirmado! Desbloqueando...');
            onStatusActive(data.user || data.details || { subscription_status: 'active' });
            return;
          }
        }
      }

      // 2. Checar Supabase diretamente
      if (supabase && (userId || cleanEmail)) {
        let q = supabase.from('users').select('*');
        if (userId && cleanEmail) {
          q = q.or(`id.eq.${userId},email.eq.${cleanEmail}`);
        } else if (userId) {
          q = q.eq('id', userId);
        } else if (cleanEmail) {
          q = q.eq('email', cleanEmail);
        }
        const { data: dbUser } = await q.maybeSingle();
        if (dbUser) {
          const st = (dbUser.subscription_status || dbUser.subscriptionStatus || '').toLowerCase();
          if (st === 'active' || st === 'ativo') {
            console.log('[Escuta Supabase Polling] subscription_status = active encontrado no banco!');
            onStatusActive(dbUser);
          }
        }
      }
    } catch (err) {
      // Silencioso em caso de oscilações normais de rede
    }
  }, 2000);

  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    if (channel && supabase) {
      supabase.removeChannel(channel);
    }
  };
}

export async function activateUserSubscriptionInSupabase(userId: string): Promise<User> {
  const supabase = getSupabase();
  const now = new Date();
  const future30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const future30DaysDate = future30Days.split('T')[0];

  if (supabase) {
    try {
      const payload: any = {
        subscription_status: 'active',
        trial_end: future30Days,
        trial_ends_at: future30DaysDate,
        updated_at: now.toISOString(),
      };
      let { error } = await supabase.from('users').update(payload).eq('id', userId);
      if (error && error.message?.includes('trial_end')) {
        await supabase
          .from('users')
          .update({
            subscription_status: 'active',
            trial_ends_at: future30DaysDate,
            updated_at: now.toISOString(),
          })
          .eq('id', userId);
      }
    } catch (e) {
      console.warn('Erro ao atualizar status para active no Supabase:', e);
    }
  }

  return {
    id: userId,
    company_id: 'comp_ozi_01',
    name: 'Usuário Ativo',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
    phone: '(11) 98765-4321',
    whatsapp: '(11) 98765-4321',
    email: '',
    role: 'ADMINISTRADOR',
    active: true,
    created_at: now.toISOString(),
    subscriptionStatus: 'active',
    subscription_status: 'active',
    trial_end: future30Days,
    trial_ends_at: future30DaysDate,
    trialEndsAt: future30DaysDate,
  };
}

export async function renewUserTrialInSupabase(userId: string, email?: string): Promise<User> {
  const supabase = getSupabase();
  const trialDates = calculateTrialEndDates(15);
  const nowIso = new Date().toISOString();

  if (supabase) {
    try {
      const payloadWithAll: any = {
        subscription_status: 'trial',
        trial_start: trialDates.trial_start,
        trial_end: trialDates.trial_end,
        trial_ends_at: trialDates.trial_ends_at,
        updated_at: nowIso,
      };

      let query = supabase.from('users').update(payloadWithAll);
      if (userId) {
        query = query.eq('id', userId);
      } else if (email) {
        query = query.eq('email', email);
      }

      let { error } = await query;
      if (error && (error.message?.includes('trial_start') || error.message?.includes('trial_end'))) {
        let fallbackQuery = supabase.from('users').update({
          subscription_status: 'trial',
          trial_ends_at: trialDates.trial_ends_at,
          updated_at: nowIso,
        });
        if (userId) fallbackQuery = fallbackQuery.eq('id', userId);
        else if (email) fallbackQuery = fallbackQuery.eq('email', email);
        await fallbackQuery;
      }
    } catch (e) {
      console.warn('Erro ao renovar trial no Supabase:', e);
    }
  }

  return {
    id: userId,
    company_id: 'comp_ozi_01',
    name: email?.split('@')[0] || 'Usuário Trial',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    phone: '(11) 98765-4321',
    whatsapp: '(11) 98765-4321',
    email: email || '',
    role: 'ADMINISTRADOR',
    active: true,
    created_at: trialDates.trial_start,
    subscriptionStatus: 'trial',
    subscription_status: 'trial',
    trial_start: trialDates.trial_start,
    trial_end: trialDates.trial_end,
    trial_ends_at: trialDates.trial_ends_at,
    trialEndsAt: trialDates.trial_ends_at,
  };
}

export async function extendUserTrialInSupabase(
  userId: string,
  additionalDays: number,
  email?: string,
  currentTrialEnd?: string
): Promise<{ trial_end: string; trial_ends_at: string }> {
  const supabase = getSupabase();
  const now = new Date();

  // Se já tinha data futura, soma os dias a ela; se já venceu ou é inválida, soma a partir de agora
  let baseDate = now;
  if (currentTrialEnd) {
    const parsed = new Date(currentTrialEnd);
    if (!isNaN(parsed.getTime()) && parsed.getTime() > now.getTime()) {
      baseDate = parsed;
    }
  }

  const newEndTime = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
  const newTrialEnd = newEndTime.toISOString();
  const newTrialEndsAt = newTrialEnd.split('T')[0];
  const nowIso = now.toISOString();

  if (supabase) {
    try {
      const payloadWithAll: any = {
        subscription_status: 'trial',
        trial_end: newTrialEnd,
        trial_ends_at: newTrialEndsAt,
        updated_at: nowIso,
      };

      let query = supabase.from('users').update(payloadWithAll);
      if (userId) {
        query = query.eq('id', userId);
      } else if (email) {
        query = query.eq('email', email);
      }

      const { error } = await query;
      if (error && error.message?.includes('trial_end')) {
        let fallbackQuery = supabase.from('users').update({
          subscription_status: 'trial',
          trial_ends_at: newTrialEndsAt,
          updated_at: nowIso,
        });
        if (userId) fallbackQuery = fallbackQuery.eq('id', userId);
        else if (email) fallbackQuery = fallbackQuery.eq('email', email);
        await fallbackQuery;
      }
    } catch (e) {
      console.warn('Erro ao estender prazo no Supabase:', e);
    }
  }

  return { trial_end: newTrialEnd, trial_ends_at: newTrialEndsAt };
}

export async function activateUserInSupabaseAdmin(
  userId: string,
  email?: string
): Promise<{ trial_end: string; trial_ends_at: string }> {
  const supabase = getSupabase();
  const now = new Date();
  const future30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const future30DaysDate = future30Days.split('T')[0];
  const nowIso = now.toISOString();

  if (supabase) {
    try {
      let query = supabase.from('users').update({
        subscription_status: 'active',
        trial_end: future30Days,
        trial_ends_at: future30DaysDate,
        updated_at: nowIso,
      });

      if (userId) query = query.eq('id', userId);
      else if (email) query = query.eq('email', email);

      const { error } = await query;
      if (error && error.message?.includes('trial_end')) {
        let fallback = supabase.from('users').update({
          subscription_status: 'active',
          trial_ends_at: future30DaysDate,
          updated_at: nowIso,
        });
        if (userId) fallback = fallback.eq('id', userId);
        else if (email) fallback = fallback.eq('email', email);
        await fallback;
      }
    } catch (e) {
      console.warn('Erro ao ativar usuário no Supabase:', e);
    }
  }

  return { trial_end: future30Days, trial_ends_at: future30DaysDate };
}

export async function blockUserInSupabaseAdmin(
  userId: string,
  email?: string
): Promise<void> {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  if (supabase) {
    try {
      let query = supabase.from('users').update({
        subscription_status: 'expired',
        updated_at: nowIso,
      });
      if (userId) query = query.eq('id', userId);
      else if (email) query = query.eq('email', email);
      await query;
    } catch (e) {
      console.warn('Erro ao bloquear usuário no Supabase:', e);
    }
  }
}

export function calculateExpirationMetrics(user: {
  subscriptionStatus?: string;
  subscription_status?: string;
  trial_end?: string;
  trial_ends_at?: string;
  trialEndsAt?: string;
}) {
  const status = (user.subscription_status || user.subscriptionStatus || 'trial').toLowerCase().trim();
  const rawEnd = user.trial_end || user.trial_ends_at || user.trialEndsAt;

  if (status === 'active' || status === 'ativo') {
    if (rawEnd) {
      const endDate = new Date(rawEnd);
      const diffMs = endDate.getTime() - Date.now();
      const days = Math.ceil(diffMs / 86400000);
      return {
        status: 'active' as const,
        daysRemaining: Math.max(0, days),
        isExpiringSoon: false,
        isUrgent: false,
        isExpired: false,
        badgeType: 'active' as const,
        label: `✓ Assinatura Ativa (${days > 0 ? `${days}d` : '30d'})`,
      };
    }
    return {
      status: 'active' as const,
      daysRemaining: 30,
      isExpiringSoon: false,
      isUrgent: false,
      isExpired: false,
      badgeType: 'active' as const,
      label: '✓ Assinatura Ativa',
    };
  }

  if (
    status === 'expired' ||
    status === 'vencido' ||
    status === 'bloqueado' ||
    status === 'inactive' ||
    status === 'trial_expired' ||
    status === 'canceled'
  ) {
    return {
      status: 'expired' as const,
      daysRemaining: 0,
      isExpiringSoon: false,
      isUrgent: true,
      isExpired: true,
      badgeType: 'expired' as const,
      label: 'Expirado',
    };
  }

  // Trial / Teste
  if (!rawEnd) {
    return {
      status: 'trial' as const,
      daysRemaining: 15,
      isExpiringSoon: false,
      isUrgent: false,
      isExpired: false,
      badgeType: 'normal' as const,
      label: 'Restam 15 dias',
    };
  }

  const endDate = new Date(rawEnd);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs <= 0) {
    return {
      status: 'expired' as const,
      daysRemaining: 0,
      isExpiringSoon: false,
      isUrgent: true,
      isExpired: true,
      badgeType: 'expired' as const,
      label: 'Expirado',
    };
  }

  // Se faltar 1 dia ou menos: tag/badge vermelha de urgência (ex.: "🚨 Expira hoje / amanhã")
  if (daysRemaining <= 1 || hoursRemaining <= 24) {
    const label = hoursRemaining <= 12
      ? `🚨 Expira hoje (${Math.max(1, hoursRemaining)}h)`
      : `🚨 Expira hoje / amanhã`;
    return {
      status: 'trial' as const,
      daysRemaining,
      isExpiringSoon: true,
      isUrgent: true,
      isExpired: false,
      badgeType: 'urgent' as const,
      label,
    };
  }

  // Se faltarem entre 2 e 5 dias: tag/badge amarela de alerta (ex.: "⚠️ Restam X dias")
  if (daysRemaining >= 2 && daysRemaining <= 5) {
    return {
      status: 'trial' as const,
      daysRemaining,
      isExpiringSoon: true,
      isUrgent: false,
      isExpired: false,
      badgeType: 'warning' as const,
      label: `⚠️ Restam ${daysRemaining} dias`,
    };
  }

  // Mais de 5 dias
  return {
    status: 'trial' as const,
    daysRemaining,
    isExpiringSoon: false,
    isUrgent: false,
    isExpired: false,
    badgeType: 'normal' as const,
    label: `Restam ${daysRemaining} dias`,
  };
}

export async function syncUserProfileToSupabase(user: User): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const now = new Date();
  const trialStart = user.trial_start || now.toISOString();
  const trialEnd = user.trial_end || (user.trialEndsAt ? `${user.trialEndsAt}T23:59:59.999Z` : new Date(now.getTime() + 15 * 86400000).toISOString());
  const trialEndsAtDate = user.trial_ends_at || user.trialEndsAt || trialEnd.split('T')[0];

  const payloadWithAll: any = {
    id: user.id,
    company_id: user.company_id || 'comp_ozi_01',
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    whatsapp: user.whatsapp || user.phone || '',
    role: user.role,
    avatar: user.avatar || '',
    active: user.active ?? true,
    subscription_status: user.subscription_status || user.subscriptionStatus || 'trial',
    trial_start: trialStart,
    trial_end: trialEnd,
    trial_ends_at: trialEndsAtDate,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('users').upsert(payloadWithAll);
    if (error) {
      if (error.message?.includes('trial_start') || error.message?.includes('trial_end')) {
        const payloadFallback = { ...payloadWithAll };
        delete payloadFallback.trial_start;
        delete payloadFallback.trial_end;
        await supabase.from('users').upsert(payloadFallback);
      } else {
        console.warn('Erro ao sincronizar perfil no Supabase:', error.message);
      }
    }
  } catch (err: any) {
    console.warn('Erro ao sincronizar perfil no Supabase:', err?.message || err);
  }
}

// ==============================================================================
// 3. PERSISTÊNCIA E SINCRONIZAÇÃO DE DADOS NO SUPABASE
// ==============================================================================

// Clientes
export async function fetchClientsFromSupabase(companyId: string): Promise<Client[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Client[]) || [];
  } catch (e) {
    console.warn('Supabase fetch clients error:', e);
    return null;
  }
}

export async function saveClientToSupabase(client: Client): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('clients').upsert(client);
  } catch (e) {
    console.warn('Supabase save client error:', e);
  }
}

export async function deleteClientFromSupabase(clientId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('clients').delete().eq('id', clientId);
  } catch (e) {
    console.warn('Supabase delete client error:', e);
  }
}

// Orçamentos
export async function fetchQuotesFromSupabase(companyId: string): Promise<Quote[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Quote[]) || [];
  } catch (e) {
    console.warn('Supabase fetch quotes error:', e);
    return null;
  }
}

export async function saveQuoteToSupabase(quote: Quote): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('quotes').upsert(quote);
  } catch (e) {
    console.warn('Supabase save quote error:', e);
  }
}

export async function deleteQuoteFromSupabase(quoteId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('quotes').delete().eq('id', quoteId);
  } catch (e) {
    console.warn('Supabase delete quote error:', e);
  }
}

// Agendamentos
export async function fetchAppointmentsFromSupabase(companyId: string): Promise<Appointment[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: true });
    if (error) throw error;
    return (data as Appointment[]) || [];
  } catch (e) {
    console.warn('Supabase fetch appointments error:', e);
    return null;
  }
}

export async function saveAppointmentToSupabase(appointment: Appointment): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('appointments').upsert(appointment);
  } catch (e) {
    console.warn('Supabase save appointment error:', e);
  }
}

export async function deleteAppointmentFromSupabase(appointmentId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('appointments').delete().eq('id', appointmentId);
  } catch (e) {
    console.warn('Supabase delete appointment error:', e);
  }
}

// Projetos / Obras
export async function fetchProjectsFromSupabase(companyId: string): Promise<Project[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Project[]) || [];
  } catch (e) {
    console.warn('Supabase fetch projects error:', e);
    return null;
  }
}

export async function saveProjectToSupabase(project: Project): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('projects').upsert(project);
  } catch (e) {
    console.warn('Supabase save project error:', e);
  }
}

export async function deleteProjectFromSupabase(projectId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('projects').delete().eq('id', projectId);
  } catch (e) {
    console.warn('Supabase delete project error:', e);
  }
}

// Financeiro
export async function fetchFinancialEntriesFromSupabase(companyId: string): Promise<FinancialEntry[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data as FinancialEntry[]) || [];
  } catch (e) {
    console.warn('Supabase fetch entries error:', e);
    return null;
  }
}

export async function saveFinancialEntryToSupabase(entry: FinancialEntry): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('financial_entries').upsert(entry);
  } catch (e) {
    console.warn('Supabase save entry error:', e);
  }
}

export async function deleteFinancialEntryFromSupabase(entryId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('financial_entries').delete().eq('id', entryId);
  } catch (e) {
    console.warn('Supabase delete entry error:', e);
  }
}

export async function fetchFinancialExpensesFromSupabase(companyId: string): Promise<FinancialExpense[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('financial_expenses')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data as FinancialExpense[]) || [];
  } catch (e) {
    console.warn('Supabase fetch expenses error:', e);
    return null;
  }
}

export async function saveFinancialExpenseToSupabase(expense: FinancialExpense): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('financial_expenses').upsert(expense);
  } catch (e) {
    console.warn('Supabase save expense error:', e);
  }
}

export async function deleteFinancialExpenseFromSupabase(expenseId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('financial_expenses').delete().eq('id', expenseId);
  } catch (e) {
    console.warn('Supabase delete expense error:', e);
  }
}

// Empresa
export async function fetchCompanyFromSupabase(companyId: string): Promise<Company | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle();
    if (error) throw error;
    return (data as Company) || null;
  } catch (e) {
    console.warn('Supabase fetch company error:', e);
    return null;
  }
}

export async function saveCompanyToSupabase(company: Company): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('companies').upsert(company);
  } catch (e) {
    console.warn('Supabase save company error:', e);
  }
}

// Usuários da Equipe
export async function fetchUsersFromSupabase(companyId: string): Promise<User[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId);
    if (error) throw error;
    return (data as any[]).map((u) => ({
      id: u.id,
      company_id: u.company_id,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      phone: u.phone,
      whatsapp: u.whatsapp,
      email: u.email,
      active: u.active,
      created_at: u.created_at,
      subscriptionStatus: u.subscription_status || u.subscriptionStatus || 'trial',
      subscription_status: u.subscription_status || u.subscriptionStatus || 'trial',
      trial_start: u.trial_start,
      trial_end: u.trial_end,
      trialEndsAt: parseTrialDate(u.trial_ends_at || u.trialEndsAt) || undefined,
      trial_ends_at: parseTrialDate(u.trial_ends_at || u.trialEndsAt) || undefined,
    }));
  } catch (e) {
    console.warn('Supabase fetch users error:', e);
    return null;
  }
}

// Master Admin: Buscar todos os usuários/clientes da plataforma
export async function fetchAllPlatformUsersFromSupabase(): Promise<User[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[]).map((u) => ({
      id: u.id,
      company_id: u.company_id,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      phone: u.phone,
      whatsapp: u.whatsapp,
      email: u.email,
      active: u.active,
      created_at: u.created_at,
      subscriptionStatus: u.subscription_status || u.subscriptionStatus || 'trial',
      subscription_status: u.subscription_status || u.subscriptionStatus || 'trial',
      trial_start: u.trial_start,
      trial_end: u.trial_end,
      trialEndsAt: parseTrialDate(u.trial_ends_at || u.trialEndsAt) || undefined,
      trial_ends_at: parseTrialDate(u.trial_ends_at || u.trialEndsAt) || undefined,
    }));
  } catch (e) {
    console.warn('Supabase fetch all platform users error:', e);
    return null;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SISTEMA PRESTAÇÃO DE SERVIÇO NEXVOLTORA - ESQUEMA COMPLETO PARA SUPABASE
-- Execute este script completo no "SQL Editor" do seu painel do Supabase.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'ADMINISTRADOR',
    phone TEXT,
    whatsapp TEXT,
    email TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    subscription_status TEXT DEFAULT 'trial',
    trial_ends_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    status TEXT DEFAULT 'Novo',
    notes TEXT,
    payment_terms TEXT,
    execution_period TEXT,
    converted_to_project_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    status TEXT DEFAULT 'Agendado',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    status TEXT DEFAULT 'Agendada',
    notes TEXT,
    tasks JSONB DEFAULT '[]'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb,
    daily_logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    status TEXT DEFAULT 'Recebido',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    status TEXT DEFAULT 'Pago',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
`;
