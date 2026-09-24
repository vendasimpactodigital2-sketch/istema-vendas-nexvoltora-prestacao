import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Company,
  User,
  Client,
  Quote,
  Appointment,
  Project,
  FinancialEntry,
  FinancialExpense,
  AppNotification,
  ActiveTab,
  ProjectTask,
  ProjectPhoto,
  MonthlyGoal,
  UserRole,
} from '../types';
import {
  INITIAL_COMPANY,
  INITIAL_USERS,
  INITIAL_CLIENTS,
  INITIAL_QUOTES,
  INITIAL_APPOINTMENTS,
  INITIAL_PROJECTS,
  INITIAL_FINANCIAL_ENTRIES,
  INITIAL_FINANCIAL_EXPENSES,
  INITIAL_NOTIFICATIONS,
  DEFAULT_MONTHLY_GOAL,
  loadFromStorage,
  saveToStorage,
  resetAllToDemoData,
} from '../lib/storage';
import { generateId } from '../lib/utils';
import {
  getSupabase,
  isSupabaseConnected,
  getSupabaseConfig,
  saveSupabaseConfig,
  signInWithSupabase,
  signUpWithSupabase,
  signInWithGoogleOAuth,
  sendSupabasePasswordReset,
  signOutSupabase,
  verifyUserSubscriptionInSupabase,
  activateUserSubscriptionInSupabase,
  syncUserProfileToSupabase,
  calculateTrialEndsAt,
  calculateTrialEndDates,
  renewUserTrialInSupabase,
  extendUserTrialInSupabase,
  activateUserInSupabaseAdmin,
  blockUserInSupabaseAdmin,
  fetchAllPlatformUsersFromSupabase,
  calculateExpirationMetrics,
  isTrialActive,
  evaluateSubscription,
  type SubscriptionStatusInfo,
  type SupabaseUser,
  fetchClientsFromSupabase,
  saveClientToSupabase,
  deleteClientFromSupabase,
  fetchQuotesFromSupabase,
  saveQuoteToSupabase,
  deleteQuoteFromSupabase,
  fetchAppointmentsFromSupabase,
  saveAppointmentToSupabase,
  deleteAppointmentFromSupabase,
  fetchProjectsFromSupabase,
  saveProjectToSupabase,
  deleteProjectFromSupabase,
  fetchFinancialEntriesFromSupabase,
  saveFinancialEntryToSupabase,
  deleteFinancialEntryFromSupabase,
  fetchFinancialExpensesFromSupabase,
  saveFinancialExpenseToSupabase,
  deleteFinancialExpenseFromSupabase,
  fetchCompanyFromSupabase,
  saveCompanyToSupabase,
  fetchUsersFromSupabase,
} from '../lib/supabaseClient';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  // Auth & Session
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  login: (email: string, role?: string) => boolean;
  logout: () => void;

  // Supabase Auth & Session
  supabaseUser: SupabaseUser | null;
  supabaseConnected: boolean;
  loginWithSupabaseEmail: (email: string, password: string) => Promise<User>;
  registerWithSupabaseEmail: (
    email: string,
    password: string,
    extra: { name: string; role: UserRole; phone?: string; whatsapp?: string }
  ) => Promise<User>;
  loginWithSupabaseGoogle: () => Promise<void>;
  resetSupabasePassword: (email: string) => Promise<void>;

  // Backwards compatibility aliases
  firebaseUser: SupabaseUser | null;
  firebaseConnected: boolean;
  loginWithFirebaseEmail: (email: string, password: string) => Promise<User>;
  registerWithFirebaseEmail: (
    email: string,
    password: string,
    extra: { name: string; role: UserRole; phone?: string; whatsapp?: string }
  ) => Promise<User>;
  loginWithFirebaseGoogle: () => Promise<void>;
  resetFirebasePassword: (email: string) => Promise<void>;

  // Subscription & 15-Day Trial Control
  subscriptionInfo: SubscriptionStatusInfo;
  isSubscriptionBlocked: boolean;
  activateSubscription: () => Promise<void>;
  renewTrial15Days: (targetUser?: User) => Promise<User | null>;
  setSubscriptionForTesting: (status: 'trial' | 'active' | 'expired', trialEndsAt?: string) => void;

  // Master Admin: Subscription & Expiration Monitoring
  expiringClientsCount: number;
  extendUserSubscription: (userId: string, additionalDays: number) => Promise<void>;
  activateUserSubscriptionAdmin: (userId: string) => Promise<void>;
  blockUserSubscriptionAdmin: (userId: string) => Promise<void>;
  refreshUsersFromSupabase: () => Promise<void>;

  // Company
  company: Company;
  updateCompany: (company: Partial<Company>) => void;

  // Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentTab: ActiveTab;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;

  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Data
  users: User[];
  addUser: (u: Omit<User, 'id' | 'created_at'>) => User;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  clients: Client[];
  addClient: (c: Omit<Client, 'id' | 'created_at'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  quotes: Quote[];
  addQuote: (q: Omit<Quote, 'id' | 'created_at' | 'code'>) => Quote;
  updateQuote: (id: string, updates: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  approveQuote: (id: string) => void;
  rejectQuote: (id: string) => void;
  duplicateQuote: (id: string) => Quote;
  convertToProject: (quoteId: string) => Project | null;

  appointments: Appointment[];
  addAppointment: (a: Omit<Appointment, 'id' | 'created_at'>) => Appointment;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;

  projects: Project[];
  addProject: (
    p: Omit<Project, 'id' | 'created_at' | 'code' | 'tasks' | 'photos'> & {
      tasks?: ProjectTask[];
      photos?: ProjectPhoto[];
    }
  ) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  updateProjectProgress: (id: string, progress: number) => void;
  addTaskToProject: (projectId: string, task: Omit<ProjectTask, 'id' | 'project_id'>) => void;
  toggleTaskStatus: (projectId: string, taskId: string) => void;
  deleteTaskFromProject: (projectId: string, taskId: string) => void;
  addPhotoToProject: (
    projectId: string,
    photo: Omit<ProjectPhoto, 'id' | 'project_id' | 'created_at'>
  ) => void;
  deletePhotoFromProject: (projectId: string, photoId: string) => void;

  financialEntries: FinancialEntry[];
  addFinancialEntry: (e: Omit<FinancialEntry, 'id' | 'created_at'>) => void;
  updateFinancialEntry: (id: string, updates: Partial<FinancialEntry>) => void;
  deleteFinancialEntry: (id: string) => void;

  financialExpenses: FinancialExpense[];
  addFinancialExpense: (e: Omit<FinancialExpense, 'id' | 'created_at'>) => void;
  updateFinancialExpense: (id: string, updates: Partial<FinancialExpense>) => void;
  deleteFinancialExpense: (id: string) => void;

  monthlyGoals: Record<string, MonthlyGoal>;
  getMonthlyGoal: (month: string) => MonthlyGoal;
  saveMonthlyGoal: (goal: MonthlyGoal) => void;

  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Global Search Modal
  searchModalOpen: boolean;
  setSearchModalOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Quick Action Modals & Pre-fills
  openQuickAction: (action: string, prefill?: any) => void;
  quickActionModal: string | null;
  closeQuickAction: () => void;
  pendingAppointmentPrefill: any;
  setPendingAppointmentPrefill: (prefill: any) => void;
  pendingQuotePrefill: any;
  setPendingQuotePrefill: (prefill: any) => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Reset
  resetToDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return loadFromStorage('dark_mode', false);
  });

  useEffect(() => {
    saveToStorage('dark_mode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = generateId('toast');
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Company profile
  const [company, setCompany] = useState<Company>(() => {
    const loaded = loadFromStorage('company', INITIAL_COMPANY);
    if (!loaded || loaded.trade_name?.includes('OZI') || !loaded.logo_url || loaded.logo_url.includes('unsplash')) {
      saveToStorage('company', INITIAL_COMPANY);
      return INITIAL_COMPANY;
    }
    return loaded;
  });

  const updateCompany = (updates: Partial<Company>) => {
    setCompany((prev) => {
      const updated = { ...prev, ...updates };
      saveToStorage('company', updated);
      saveCompanyToSupabase(updated);
      return updated;
    });
    addToast('Dados da empresa atualizados com sucesso!', 'success');
  };

  // Users / Team
  const [users, setUsers] = useState<User[]>(() =>
    loadFromStorage('users', INITIAL_USERS)
  );

  // Supabase Authentication & Session State
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(() => isSupabaseConnected());

  // Current session user
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('ozi_current_user');
    if (cached) {
      try {
        const parsed: User = JSON.parse(cached);
        const rawStatus = (parsed.subscription_status || parsed.subscriptionStatus || 'trial').toLowerCase();
        // Se for trial e estiver sem data ou com período expirado, atualiza imediatamente para valer 15 dias a partir de hoje
        if (rawStatus === 'trial' || !parsed.subscriptionStatus) {
          const rawEnd = parsed.trial_end || parsed.trial_ends_at || parsed.trialEndsAt;
          if (!rawEnd || !isTrialActive(rawEnd)) {
            const trialDates = calculateTrialEndDates(15);
            parsed.subscription_status = 'trial';
            parsed.subscriptionStatus = 'trial';
            parsed.trial_start = trialDates.trial_start;
            parsed.trial_end = trialDates.trial_end;
            parsed.trial_ends_at = trialDates.trial_ends_at;
            parsed.trialEndsAt = trialDates.trialEndsAt;
            localStorage.setItem('ozi_current_user', JSON.stringify(parsed));
          }
        }
        return parsed;
      } catch (e) {}
    }
    return null;
  });

  // Listen to Supabase Auth state & Session
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setSupabaseConnected(false);
      return;
    }
    setSupabaseConnected(true);

    // Checar sessão ativa
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error && session?.user) {
        setSupabaseUser(session.user);
        verifyUserSubscriptionInSupabase(session.user.id, session.user.email || '').then((verified) => {
          setCurrentUser(verified);
          localStorage.setItem('ozi_current_user', JSON.stringify(verified));
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Supabase Auth Event]:', event);
      if (session?.user) {
        setSupabaseUser(session.user);
        setSupabaseConnected(true);
        try {
          const verified = await verifyUserSubscriptionInSupabase(session.user.id, session.user.email || '');
          setCurrentUser(verified);
          localStorage.setItem('ozi_current_user', JSON.stringify(verified));
          setUsers((prev) => {
            const exists = prev.some((u) => u.id === verified.id || u.email === verified.email);
            const updated = exists
              ? prev.map((u) => (u.id === verified.id || u.email === verified.email ? verified : u))
              : [verified, ...prev];
            saveToStorage('users', updated);
            return updated;
          });
        } catch (err) {
          console.warn('Erro ao sincronizar usuário no Supabase:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUser(null);
        setCurrentUser(null);
        localStorage.removeItem('ozi_current_user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync Supabase data when connected
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !company.id) return;

    let isMounted = true;
    const syncData = async () => {
      try {
        const [cloudClients, cloudQuotes, cloudAppointments, cloudProjects, cloudEntries, cloudExpenses] =
          await Promise.all([
            fetchClientsFromSupabase(company.id),
            fetchQuotesFromSupabase(company.id),
            fetchAppointmentsFromSupabase(company.id),
            fetchProjectsFromSupabase(company.id),
            fetchFinancialEntriesFromSupabase(company.id),
            fetchFinancialExpensesFromSupabase(company.id),
          ]);

        if (isMounted) {
          if (cloudClients && cloudClients.length > 0) {
            setClients(cloudClients);
            saveToStorage('clients', cloudClients);
          }
          if (cloudQuotes && cloudQuotes.length > 0) {
            setQuotes(cloudQuotes);
            saveToStorage('quotes', cloudQuotes);
          }
          if (cloudAppointments && cloudAppointments.length > 0) {
            setAppointments(cloudAppointments);
            saveToStorage('appointments', cloudAppointments);
          }
          if (cloudProjects && cloudProjects.length > 0) {
            setProjects(cloudProjects);
            saveToStorage('projects', cloudProjects);
          }
          if (cloudEntries && cloudEntries.length > 0) {
            setFinancialEntries(cloudEntries);
            saveToStorage('entries', cloudEntries);
          }
          if (cloudExpenses && cloudExpenses.length > 0) {
            setFinancialExpenses(cloudExpenses);
            saveToStorage('expenses', cloudExpenses);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do Supabase:', err);
      }
    };

    syncData();
    return () => {
      isMounted = false;
    };
  }, [company.id]);

  // Always keep localStorage in sync with currentUser
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ozi_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('ozi_current_user');
    }
  }, [currentUser]);

  // Avaliação do período de teste de 15 dias e status da assinatura
  const subscriptionInfo = evaluateSubscription(currentUser);
  const isSubscriptionBlocked = subscriptionInfo.isBlocked;

  // Login via Supabase
  const loginWithSupabaseEmail = async (email: string, password: string): Promise<User> => {
    try {
      const user = await signInWithSupabase(email, password);
      setCurrentUser(user);
      localStorage.setItem('ozi_current_user', JSON.stringify(user));
      addToast(`Autenticado com sucesso via Supabase: ${user.name}!`, 'success');
      return user;
    } catch (error: any) {
      console.error('Supabase Email Login Error:', error);
      throw new Error(error?.message || 'Falha ao autenticar com Supabase.');
    }
  };

  // Register via Supabase
  const registerWithSupabaseEmail = async (
    email: string,
    password: string,
    extra: { name: string; role: UserRole; phone?: string; whatsapp?: string }
  ): Promise<User> => {
    try {
      const newUser = await signUpWithSupabase(email, password, {
        name: extra.name,
        role: extra.role,
        phone: extra.phone,
        whatsapp: extra.whatsapp,
        company_id: company.id,
      });

      setUsers((prev) => {
        const updated = [newUser, ...prev.filter((u) => u.email !== newUser.email)];
        saveToStorage('users', updated);
        return updated;
      });

      setCurrentUser(newUser);
      localStorage.setItem('ozi_current_user', JSON.stringify(newUser));
      addToast(`Conta criada e autenticada no Supabase: ${newUser.name}!`, 'success');
      return newUser;
    } catch (error: any) {
      console.error('Supabase Register Error:', error);
      throw new Error(error?.message || 'Erro ao registrar usuário no Supabase.');
    }
  };

  // Login with Google OAuth via Supabase
  const loginWithSupabaseGoogle = async (): Promise<void> => {
    try {
      await signInWithGoogleOAuth();
    } catch (error: any) {
      console.error('Supabase Google Login Error:', error);
      throw new Error(error?.message || 'Falha ao autenticar com Google no Supabase.');
    }
  };

  // Reset Password via Supabase
  const resetSupabasePassword = async (email: string): Promise<void> => {
    try {
      await sendSupabasePasswordReset(email);
      addToast('E-mail de redefinição de senha enviado com sucesso!', 'success');
    } catch (error: any) {
      console.error('Supabase Password Reset Error:', error);
      throw new Error(error?.message || 'Falha ao enviar e-mail de redefinição.');
    }
  };

  const login = (email: string, password?: string): boolean => {
    const trimmed = email.trim().toLowerCase();
    const found = users.find((u) => u.email.toLowerCase() === trimmed);
    if (found) {
      if (password && found.password && found.password !== password) {
        addToast('Senha incorreta.', 'error');
        return false;
      }

      let userObj: User = { ...found };
      const rawStatus = (userObj.subscription_status || userObj.subscriptionStatus || 'trial').toLowerCase();

      if (!userObj.subscriptionStatus && !userObj.subscription_status) {
        const trialDates = calculateTrialEndDates(15);
        userObj.subscriptionStatus = 'trial';
        userObj.subscription_status = 'trial';
        userObj.trial_start = trialDates.trial_start;
        userObj.trial_end = trialDates.trial_end;
        userObj.trialEndsAt = trialDates.trial_ends_at;
        userObj.trial_ends_at = trialDates.trial_ends_at;
      } else if (rawStatus === 'trial') {
        const trialEnd = userObj.trial_end || userObj.trial_ends_at || userObj.trialEndsAt;
        if (trialEnd) {
          const isValid = isTrialActive(trialEnd);
          if (!isValid) {
            userObj.subscriptionStatus = 'expired';
            userObj.subscription_status = 'expired';
          }
        }
      }

      setCurrentUser(userObj);
      localStorage.setItem('ozi_current_user', JSON.stringify(userObj));
      addToast(`Bem-vindo(a), ${userObj.name}!`, 'success');
      return true;
    }
    addToast('Usuário não encontrado com este e-mail.', 'error');
    return false;
  };

  const logout = async () => {
    try {
      await signOutSupabase();
    } catch (err) {
      console.warn('Logout Supabase error:', err);
    }
    setCurrentUser(null);
    setSupabaseUser(null);
    localStorage.removeItem('ozi_current_user');
    addToast('Sessão encerrada com sucesso.', 'info');
  };

  // Ativar Assinatura Mensal (R$ 26,99/mês) e atualizar Supabase
  const activateSubscription = async (): Promise<void> => {
    if (!currentUser) return;
    try {
      const updated = await activateUserSubscriptionInSupabase(currentUser.id);
      const finalUser: User = {
        ...currentUser,
        subscriptionStatus: 'active',
        subscription_status: 'active',
        trialEndsAt: undefined,
        trial_ends_at: undefined,
      };
      setCurrentUser(finalUser);
      localStorage.setItem('ozi_current_user', JSON.stringify(finalUser));
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === finalUser.id ? finalUser : u));
        saveToStorage('users', next);
        return next;
      });
      addToast('Assinatura Mensal de R$ 26,99/mês ativada com sucesso! Acesso liberado.', 'success');
    } catch (err) {
      console.warn('Erro ao atualizar assinatura no Supabase, aplicando no estado local:', err);
      const fallbackUser: User = {
        ...currentUser,
        subscriptionStatus: 'active',
        subscription_status: 'active',
      };
      setCurrentUser(fallbackUser);
      localStorage.setItem('ozi_current_user', JSON.stringify(fallbackUser));
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === fallbackUser.id ? fallbackUser : u));
        saveToStorage('users', next);
        return next;
      });
      addToast('Acesso ativado com sucesso!', 'info');
    }
  };

  // Renovar período de teste grátis (15 dias a partir de hoje)
  const renewTrial15Days = async (targetUser?: User): Promise<User | null> => {
    const userToRenew = targetUser || currentUser;
    if (!userToRenew) return null;

    const trialDates = calculateTrialEndDates(15);
    try {
      await renewUserTrialInSupabase(userToRenew.id, userToRenew.email);
    } catch (err) {
      console.warn('Erro ao atualizar trial no Supabase:', err);
    }

    const updatedUser: User = {
      ...userToRenew,
      subscriptionStatus: 'trial',
      subscription_status: 'trial',
      trial_start: trialDates.trial_start,
      trial_end: trialDates.trial_end,
      trialEndsAt: trialDates.trial_ends_at,
      trial_ends_at: trialDates.trial_ends_at,
    };

    if (!targetUser || targetUser.id === currentUser?.id) {
      setCurrentUser(updatedUser);
      localStorage.setItem('ozi_current_user', JSON.stringify(updatedUser));
    }

    setUsers((prev) => {
      const next = prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      saveToStorage('users', next);
      return next;
    });

    addToast('Período de teste grátis (15 dias) renovado a partir de hoje com acesso total!', 'success');
    return updatedUser;
  };

  // Ajuste do período de teste / simulação
  const setSubscriptionForTesting = (
    status: 'trial' | 'active' | 'expired',
    trialEndsAt?: string
  ) => {
    if (!currentUser) return;
    const now = new Date();
    const trialDates = calculateTrialEndDates(15);
    const end = trialEndsAt
      ? (trialEndsAt.includes('T') ? trialEndsAt : `${trialEndsAt}T23:59:59.999Z`)
      : trialDates.trial_end;

    const updated: User = {
      ...currentUser,
      subscriptionStatus: status,
      subscription_status: status,
      trial_start: status === 'trial' ? now.toISOString() : currentUser.trial_start,
      trial_end: status === 'trial' ? end : undefined,
      trialEndsAt: status === 'trial' ? end.split('T')[0] : undefined,
      trial_ends_at: status === 'trial' ? end.split('T')[0] : undefined,
    };
    setCurrentUser(updated);
    localStorage.setItem('ozi_current_user', JSON.stringify(updated));
    syncUserProfileToSupabase(updated);
    setUsers((prev) => {
      const next = prev.map((u) => (u.id === updated.id ? updated : u));
      saveToStorage('users', next);
      return next;
    });
    addToast(`Status de assinatura ajustado para: ${status}`, 'info');
  };

  // Contagem de clientes que expiram em até 5 dias
  const expiringClientsCount = users.filter((u) => {
    const metrics = calculateExpirationMetrics(u);
    return metrics.isExpiringSoon && !metrics.isExpired;
  }).length;

  // Master Admin: Estender prazo (+5, +15 dias)
  const extendUserSubscription = async (userId: string, additionalDays: number) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    try {
      const res = await extendUserTrialInSupabase(
        target.id,
        additionalDays,
        target.email,
        target.trial_end || (target.trialEndsAt ? `${target.trialEndsAt}T23:59:59.999Z` : undefined)
      );

      const updatedUser: User = {
        ...target,
        subscriptionStatus: 'trial',
        subscription_status: 'trial',
        trial_end: res.trial_end,
        trial_ends_at: res.trial_ends_at,
        trialEndsAt: res.trial_ends_at,
      };

      if (currentUser && currentUser.id === target.id) {
        setCurrentUser(updatedUser);
        localStorage.setItem('ozi_current_user', JSON.stringify(updatedUser));
      }

      setUsers((prev) => {
        const next = prev.map((u) => (u.id === target.id ? updatedUser : u));
        saveToStorage('users', next);
        return next;
      });

      addToast(`Prazo de ${target.name} estendido com sucesso (+${additionalDays} dias)!`, 'success');
    } catch (e) {
      console.warn('Erro ao estender prazo do usuário:', e);
      addToast('Erro ao estender prazo.', 'error');
    }
  };

  // Master Admin: Ativar assinatura manualmente (+30 dias / ativa)
  const activateUserSubscriptionAdmin = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    try {
      const res = await activateUserInSupabaseAdmin(target.id, target.email);
      const updatedUser: User = {
        ...target,
        subscriptionStatus: 'active',
        subscription_status: 'active',
        trial_end: res.trial_end,
        trial_ends_at: res.trial_ends_at,
        trialEndsAt: res.trial_ends_at,
      };

      if (currentUser && currentUser.id === target.id) {
        setCurrentUser(updatedUser);
        localStorage.setItem('ozi_current_user', JSON.stringify(updatedUser));
      }

      setUsers((prev) => {
        const next = prev.map((u) => (u.id === target.id ? updatedUser : u));
        saveToStorage('users', next);
        return next;
      });

      addToast(`Assinatura de ${target.name} ativada manualmente!`, 'success');
    } catch (e) {
      console.warn('Erro ao ativar usuário no Supabase:', e);
      addToast('Erro ao ativar usuário.', 'error');
    }
  };

  // Master Admin: Bloquear / Expirar assinatura manualmente
  const blockUserSubscriptionAdmin = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    try {
      await blockUserInSupabaseAdmin(target.id, target.email);
      const updatedUser: User = {
        ...target,
        subscriptionStatus: 'expired',
        subscription_status: 'expired',
      };

      if (currentUser && currentUser.id === target.id) {
        setCurrentUser(updatedUser);
        localStorage.setItem('ozi_current_user', JSON.stringify(updatedUser));
      }

      setUsers((prev) => {
        const next = prev.map((u) => (u.id === target.id ? updatedUser : u));
        saveToStorage('users', next);
        return next;
      });

      addToast(`Acesso de ${target.name} bloqueado/expirado com sucesso.`, 'info');
    } catch (e) {
      console.warn('Erro ao bloquear usuário no Supabase:', e);
      addToast('Erro ao atualizar status no servidor.', 'error');
    }
  };

  // Master Admin: Recarregar lista completa de usuários do Supabase
  const refreshUsersFromSupabase = async () => {
    try {
      const allUsers = await fetchAllPlatformUsersFromSupabase();
      if (allUsers && allUsers.length > 0) {
        setUsers((prev) => {
          const merged = [...allUsers];
          for (const localU of prev) {
            if (!merged.some((m) => m.id === localU.id || m.email === localU.email)) {
              merged.push(localU);
            }
          }
          saveToStorage('users', merged);
          return merged;
        });
        addToast('Lista de clientes e assinaturas atualizada do Supabase!', 'success');
      } else {
        addToast('Sincronização concluída.', 'info');
      }
    } catch (e) {
      console.warn('Erro ao recarregar usuários:', e);
    }
  };

  const addUser = (u: Omit<User, 'id' | 'created_at'>): User => {
    const newUser: User = {
      ...u,
      id: generateId('usr'),
      created_at: new Date().toISOString().split('T')[0],
    };
    setUsers((prev) => {
      const updated = [newUser, ...prev];
      saveToStorage('users', updated);
      syncUserProfileToSupabase(newUser);
      return updated;
    });
    addToast('Novo membro adicionado à equipe!', 'success');
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === id) {
          const merged = { ...u, ...updates };
          syncUserProfileToSupabase(merged);
          return merged;
        }
        return u;
      });
      saveToStorage('users', updated);
      return updated;
    });
    addToast('Dados do usuário atualizados.', 'success');
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      saveToStorage('users', updated);
      return updated;
    });
    addToast('Usuário removido.', 'info');
  };

  // Clients
  const [clients, setClients] = useState<Client[]>(() =>
    loadFromStorage('clients', INITIAL_CLIENTS)
  );

  const addClient = (c: Omit<Client, 'id' | 'created_at'>): Client => {
    const newClient: Client = {
      ...c,
      id: generateId('cli'),
      created_at: new Date().toISOString().split('T')[0],
    };
    setClients((prev) => {
      const updated = [newClient, ...prev];
      saveToStorage('clients', updated);
      saveClientToSupabase(newClient);
      return updated;
    });
    addToast(`Cliente ${newClient.name} cadastrado com sucesso!`, 'success');
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id) {
          const merged = { ...c, ...updates };
          saveClientToSupabase(merged);
          return merged;
        }
        return c;
      });
      saveToStorage('clients', updated);
      return updated;
    });
    addToast('Dados do cliente atualizados.', 'success');
  };

  const deleteClient = (id: string) => {
    setClients((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveToStorage('clients', updated);
      deleteClientFromSupabase(id);
      return updated;
    });
    addToast('Cliente removido.', 'info');
  };

  // Quotes
  const [quotes, setQuotes] = useState<Quote[]>(() =>
    loadFromStorage('quotes', INITIAL_QUOTES)
  );

  const addQuote = (q: Omit<Quote, 'id' | 'created_at' | 'code'>): Quote => {
    const year = new Date().getFullYear();
    const count = quotes.length + 1;
    const code = `ORC-${year}-${count.toString().padStart(3, '0')}`;
    const newQuote: Quote = {
      ...q,
      id: generateId('orc'),
      code,
      created_at: new Date().toISOString().split('T')[0],
    };
    setQuotes((prev) => {
      const updated = [newQuote, ...prev];
      saveToStorage('quotes', updated);
      saveQuoteToSupabase(newQuote);
      return updated;
    });
    addToast(`Orçamento ${newQuote.code} gerado com sucesso!`, 'success');
    return newQuote;
  };

  const updateQuote = (id: string, updates: Partial<Quote>) => {
    setQuotes((prev) => {
      const updated = prev.map((q) => {
        if (q.id === id) {
          const merged = { ...q, ...updates };
          saveQuoteToSupabase(merged);
          return merged;
        }
        return q;
      });
      saveToStorage('quotes', updated);
      return updated;
    });
    addToast('Orçamento atualizado.', 'success');
  };

  const deleteQuote = (id: string) => {
    setQuotes((prev) => {
      const updated = prev.filter((q) => q.id !== id);
      saveToStorage('quotes', updated);
      deleteQuoteFromSupabase(id);
      return updated;
    });
    addToast('Orçamento removido.', 'info');
  };

  const approveQuote = (id: string) => {
    updateQuote(id, { status: 'Aprovado' });
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    addToast('Orçamento aprovado com sucesso! 🎉', 'success');
  };

  const rejectQuote = (id: string) => {
    updateQuote(id, { status: 'Recusado' });
    addToast('Orçamento marcado como recusado.', 'info');
  };

  const duplicateQuote = (id: string): Quote => {
    const source = quotes.find((q) => q.id === id);
    if (!source) throw new Error('Orçamento de origem não encontrado.');

    const year = new Date().getFullYear();
    const count = quotes.length + 1;
    const code = `ORC-${year}-${count.toString().padStart(3, '0')}`;

    const cloned: Quote = {
      ...source,
      id: generateId('orc'),
      code,
      status: 'Novo',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString().split('T')[0],
    };

    setQuotes((prev) => {
      const updated = [cloned, ...prev];
      saveToStorage('quotes', updated);
      saveQuoteToSupabase(cloned);
      return updated;
    });

    addToast(`Orçamento duplicado com código ${code}!`, 'success');
    return cloned;
  };

  const convertToProject = (quoteId: string): Project | null => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return null;

    const year = new Date().getFullYear();
    const count = projects.length + 1;
    const code = `OBR-${year}-${count.toString().padStart(3, '0')}`;

    const newProject: Project = {
      id: generateId('prj'),
      code,
      name: `Obra - ${quote.client_name}`,
      company_id: quote.company_id,
      quote_id: quote.id,
      client_id: quote.client_id,
      client_name: quote.client_name,
      phone: quote.client_phone || '',
      client_phone: quote.client_phone || '',
      whatsapp: quote.client_phone || '',
      address: quote.client_address || '',
      start_date: new Date().toISOString().split('T')[0],
      expected_completion_date: quote.valid_until || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      responsible_id: quote.responsible_id,
      responsible_name: quote.responsible_name,
      team_members: [],
      total_value: quote.total,
      received_value: 0,
      progress: 0,
      status: 'Em andamento',
      notes: quote.notes || '',
      tasks: quote.items.map((it, idx) => ({
        id: generateId('tsk'),
        project_id: '',
        title: it.description,
        status: 'Pendente',
        completed: false,
        due_date: quote.valid_until,
      })),
      photos: [],
      daily_logs: [],
      created_at: new Date().toISOString().split('T')[0],
    };

    newProject.tasks = newProject.tasks.map((t) => ({ ...t, project_id: newProject.id }));

    setProjects((prev) => {
      const updated = [newProject, ...prev];
      saveToStorage('projects', updated);
      saveProjectToSupabase(newProject);
      return updated;
    });

    updateQuote(quoteId, { converted_to_project_id: newProject.id, status: 'Aprovado' });
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    addToast(`Obra ${newProject.code} criada a partir do orçamento! 🏗️`, 'success');
    return newProject;
  };

  // Appointments
  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    loadFromStorage('appointments', INITIAL_APPOINTMENTS)
  );

  const addAppointment = (a: Omit<Appointment, 'id' | 'created_at'>): Appointment => {
    const newAppointment: Appointment = {
      ...a,
      id: generateId('app'),
      created_at: new Date().toISOString().split('T')[0],
    };
    setAppointments((prev) => {
      const updated = [newAppointment, ...prev];
      saveToStorage('appointments', updated);
      saveAppointmentToSupabase(newAppointment);
      return updated;
    });
    addToast('Agendamento cadastrado com sucesso!', 'success');
    return newAppointment;
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments((prev) => {
      const updated = prev.map((a) => {
        if (a.id === id) {
          const merged = { ...a, ...updates };
          saveAppointmentToSupabase(merged);
          return merged;
        }
        return a;
      });
      saveToStorage('appointments', updated);
      return updated;
    });
    addToast('Agendamento atualizado.', 'success');
  };

  const deleteAppointment = (id: string) => {
    setAppointments((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveToStorage('appointments', updated);
      deleteAppointmentFromSupabase(id);
      return updated;
    });
    addToast('Agendamento removido.', 'info');
  };

  // Projects
  const [projects, setProjects] = useState<Project[]>(() =>
    loadFromStorage('projects', INITIAL_PROJECTS)
  );

  const addProject = (
    p: Omit<Project, 'id' | 'created_at' | 'code' | 'tasks' | 'photos'> & {
      tasks?: ProjectTask[];
      photos?: ProjectPhoto[];
    }
  ): Project => {
    const year = new Date().getFullYear();
    const count = projects.length + 1;
    const code = `OBR-${year}-${count.toString().padStart(3, '0')}`;
    const newProject: Project = {
      ...p,
      id: generateId('prj'),
      code,
      tasks: p.tasks || [],
      photos: p.photos || [],
      created_at: new Date().toISOString().split('T')[0],
    };
    setProjects((prev) => {
      const updated = [newProject, ...prev];
      saveToStorage('projects', updated);
      saveProjectToSupabase(newProject);
      return updated;
    });
    addToast(`Obra ${newProject.code} cadastrada com sucesso!`, 'success');
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          const merged = { ...p, ...updates };
          saveProjectToSupabase(merged);
          return merged;
        }
        return p;
      });
      saveToStorage('projects', updated);
      return updated;
    });
    addToast('Obra atualizada.', 'success');
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveToStorage('projects', updated);
      deleteProjectFromSupabase(id);
      return updated;
    });
    addToast('Obra removida.', 'info');
  };

  const updateProjectProgress = (id: string, progress: number) => {
    const clamped = Math.max(0, Math.min(100, progress));
    const status = clamped === 100 ? 'Concluída' : 'Em andamento';
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          const merged = { ...p, progress: clamped, status: p.status === 'Cancelada' ? p.status : status };
          saveProjectToSupabase(merged);
          return merged;
        }
        return p;
      });
      saveToStorage('projects', updated);
      return updated;
    });
    if (clamped === 100) {
      confetti({ particleCount: 80, spread: 60 });
      addToast('Obra marcada como 100% Concluída! 🚀', 'success');
    } else {
      addToast(`Progresso atualizado para ${clamped}%`, 'info');
    }
  };

  const addTaskToProject = (projectId: string, taskData: Omit<ProjectTask, 'id' | 'project_id'>) => {
    const newTask: ProjectTask = {
      ...taskData,
      id: generateId('tsk'),
      project_id: projectId,
    };
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === projectId) {
          const merged = { ...p, tasks: [...p.tasks, newTask] };
          saveProjectToSupabase(merged);
          return merged;
        }
        return p;
      });
      saveToStorage('projects', updated);
      return updated;
    });
    addToast('Tarefa adicionada à obra.', 'success');
  };

  const toggleTaskStatus = (projectId: string, taskId: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== projectId) return p;
        const newTasks = p.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const nextStatus = t.status === 'Concluído' ? 'Pendente' : 'Concluído';
          return { ...t, status: nextStatus as 'Pendente' | 'Concluído' };
        });
        const total = newTasks.length;
        const completed = newTasks.filter((t) => t.status === 'Concluído').length;
        const autoProgress = total > 0 ? Math.round((completed / total) * 100) : p.progress;
        const merged = { ...p, tasks: newTasks, progress: autoProgress };
        saveProjectToSupabase(merged);
        return merged;
      });
      saveToStorage('projects', updated);
      return updated;
    });
  };

  const deleteTaskFromProject = (projectId: string, taskId: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === projectId) {
          const merged = { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) };
          saveProjectToSupabase(merged);
          return merged;
        }
        return p;
      });
      saveToStorage('projects', updated);
      return updated;
    });
    addToast('Tarefa removida.', 'info');
  };

  const addPhotoToProject = (
    projectId: string,
    photoData: Omit<ProjectPhoto, 'id' | 'project_id' | 'created_at'>
  ) => {
    const newPhoto: ProjectPhoto = {
      ...photoData,
      id: generateId('pht'),
      project_id: projectId,
      created_at: new Date().toISOString().split('T')[0],
    };
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === projectId) {
          const merged = { ...p, photos: [newPhoto, ...p.photos] };
          saveProjectToSupabase(merged);
          return merged;
        }
        return p;
      });
      saveToStorage('projects', updated);
      return updated;
    });
    addToast('Foto adicionada à galeria da obra!', 'success');
  };

  const deletePhotoFromProject = (projectId: string, photoId: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === projectId) {
          const merged = { ...p, photos: p.photos.filter((ph) => ph.id !== photoId) };
          saveProjectToSupabase(merged);
          return merged;
        }
        return p;
      });
      saveToStorage('projects', updated);
      return updated;
    });
    addToast('Foto removida.', 'info');
  };

  // Financial Entries
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>(() =>
    loadFromStorage('entries', INITIAL_FINANCIAL_ENTRIES)
  );

  const addFinancialEntry = (e: Omit<FinancialEntry, 'id' | 'created_at'>) => {
    const newEntry: FinancialEntry = {
      ...e,
      id: generateId('ent'),
      created_at: new Date().toISOString().split('T')[0],
    };
    setFinancialEntries((prev) => {
      const updated = [newEntry, ...prev];
      saveToStorage('entries', updated);
      saveFinancialEntryToSupabase(newEntry);
      return updated;
    });
    if (newEntry.project_id && newEntry.status === 'Recebido') {
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === newEntry.project_id ? { ...p, received_value: p.received_value + newEntry.amount } : p
        );
        saveToStorage('projects', updated);
        return updated;
      });
    }
    addToast('Entrada financeira registrada!', 'success');
  };

  const updateFinancialEntry = (id: string, updates: Partial<FinancialEntry>) => {
    setFinancialEntries((prev) => {
      const updated = prev.map((e) => {
        if (e.id === id) {
          const merged = { ...e, ...updates };
          saveFinancialEntryToSupabase(merged);
          return merged;
        }
        return e;
      });
      saveToStorage('entries', updated);
      return updated;
    });
    addToast('Entrada financeira atualizada.', 'success');
  };

  const deleteFinancialEntry = (id: string) => {
    setFinancialEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveToStorage('entries', updated);
      deleteFinancialEntryFromSupabase(id);
      return updated;
    });
    addToast('Lançamento excluído.', 'info');
  };

  // Financial Expenses
  const [financialExpenses, setFinancialExpenses] = useState<FinancialExpense[]>(() =>
    loadFromStorage('expenses', INITIAL_FINANCIAL_EXPENSES)
  );

  const addFinancialExpense = (e: Omit<FinancialExpense, 'id' | 'created_at'>) => {
    const newExpense: FinancialExpense = {
      ...e,
      id: generateId('exp'),
      created_at: new Date().toISOString().split('T')[0],
    };
    setFinancialExpenses((prev) => {
      const updated = [newExpense, ...prev];
      saveToStorage('expenses', updated);
      saveFinancialExpenseToSupabase(newExpense);
      return updated;
    });
    addToast('Gasto financeiro registrado!', 'success');
  };

  const updateFinancialExpense = (id: string, updates: Partial<FinancialExpense>) => {
    setFinancialExpenses((prev) => {
      const updated = prev.map((e) => {
        if (e.id === id) {
          const merged = { ...e, ...updates };
          saveFinancialExpenseToSupabase(merged);
          return merged;
        }
        return e;
      });
      saveToStorage('expenses', updated);
      return updated;
    });
    addToast('Gasto atualizado.', 'success');
  };

  const deleteFinancialExpense = (id: string) => {
    setFinancialExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveToStorage('expenses', updated);
      deleteFinancialExpenseFromSupabase(id);
      return updated;
    });
    addToast('Gasto excluído.', 'info');
  };

  // Monthly Goals
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, MonthlyGoal>>(() => {
    return loadFromStorage('monthly_goals', {
      [DEFAULT_MONTHLY_GOAL.month]: DEFAULT_MONTHLY_GOAL,
    });
  });

  const getMonthlyGoal = (month: string): MonthlyGoal => {
    if (monthlyGoals[month]) {
      return monthlyGoals[month];
    }
    const totalExp = DEFAULT_MONTHLY_GOAL.total_expenses;
    const workDays = DEFAULT_MONTHLY_GOAL.work_days;
    return {
      month,
      total_expenses: totalExp,
      work_days: workDays,
      profit_goal: 0,
      daily_goal: Math.round((totalExp / workDays) * 100) / 100,
      notes: `Meta diluída por ${workDays} dias úteis`,
      expenses_breakdown: DEFAULT_MONTHLY_GOAL.expenses_breakdown ? [...DEFAULT_MONTHLY_GOAL.expenses_breakdown] : [],
    };
  };

  const saveMonthlyGoal = (goal: MonthlyGoal) => {
    setMonthlyGoals((prev) => {
      const updated = {
        ...prev,
        [goal.month]: goal,
      };
      saveToStorage('monthly_goals', updated);
      return updated;
    });
    addToast(`Metas de ${goal.month} salvas com sucesso!`, 'success');
  };

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadFromStorage('notifications', INITIAL_NOTIFICATIONS)
  );

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveToStorage('notifications', updated);
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveToStorage('notifications', updated);
      return updated;
    });
    addToast('Todas as notificações foram marcadas como lidas.', 'info');
  };

  // Global Search Modal
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Quick Action Modals & Pre-fills
  const [quickActionModal, setQuickActionModal] = useState<string | null>(null);
  const [pendingAppointmentPrefill, setPendingAppointmentPrefill] = useState<any>(null);
  const [pendingQuotePrefill, setPendingQuotePrefill] = useState<any>(null);

  const openQuickAction = (action: string, prefill?: any) => {
    if (action === 'appointment' && prefill) {
      setPendingAppointmentPrefill(prefill);
    } else if (action === 'quote' && prefill) {
      setPendingQuotePrefill(prefill);
    }
    setQuickActionModal(action);
  };

  const closeQuickAction = () => {
    setQuickActionModal(null);
  };

  // Reset to Demo Data
  const resetToDemoData = () => {
    resetAllToDemoData();
    setCompany(INITIAL_COMPANY);
    setUsers(INITIAL_USERS);
    setClients(INITIAL_CLIENTS);
    setQuotes(INITIAL_QUOTES);
    setAppointments(INITIAL_APPOINTMENTS);
    setProjects(INITIAL_PROJECTS);
    setFinancialEntries(INITIAL_FINANCIAL_ENTRIES);
    setFinancialExpenses(INITIAL_FINANCIAL_EXPENSES);
    setNotifications(INITIAL_NOTIFICATIONS);
    addToast('Dados demonstrativos restaurados com sucesso!', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated: !!currentUser,
        setIsAuthenticated: (auth: boolean) => {
          if (!auth) logout();
        },
        login,
        logout,

        // Supabase Auth
        supabaseUser,
        supabaseConnected,
        loginWithSupabaseEmail,
        registerWithSupabaseEmail,
        loginWithSupabaseGoogle,
        resetSupabasePassword,

        // Aliases for compatibility
        firebaseUser: supabaseUser,
        firebaseConnected: supabaseConnected,
        loginWithFirebaseEmail: loginWithSupabaseEmail,
        registerWithFirebaseEmail: registerWithSupabaseEmail,
        loginWithFirebaseGoogle: loginWithSupabaseGoogle,
        resetFirebasePassword: resetSupabasePassword,

        subscriptionInfo,
        isSubscriptionBlocked,
        activateSubscription,
        renewTrial15Days,
        setSubscriptionForTesting,
        expiringClientsCount,
        extendUserSubscription,
        activateUserSubscriptionAdmin,
        blockUserSubscriptionAdmin,
        refreshUsersFromSupabase,
        company,
        updateCompany,
        activeTab,
        setActiveTab,
        currentTab: activeTab,
        sidebarCollapsed,
        setSidebarCollapsed,
        darkMode,
        toggleDarkMode,
        users,
        addUser,
        updateUser,
        deleteUser,
        clients,
        addClient,
        updateClient,
        deleteClient,
        quotes,
        addQuote,
        updateQuote,
        deleteQuote,
        approveQuote,
        rejectQuote,
        duplicateQuote,
        convertToProject,
        appointments,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        projects,
        addProject,
        updateProject,
        deleteProject,
        updateProjectProgress,
        addTaskToProject,
        toggleTaskStatus,
        deleteTaskFromProject,
        addPhotoToProject,
        deletePhotoFromProject,
        financialEntries,
        addFinancialEntry,
        updateFinancialEntry,
        deleteFinancialEntry,
        financialExpenses,
        addFinancialExpense,
        updateFinancialExpense,
        deleteFinancialExpense,
        monthlyGoals,
        getMonthlyGoal,
        saveMonthlyGoal,
        notifications,
        markNotificationAsRead,
        clearAllNotifications,
        searchModalOpen,
        setSearchModalOpen,
        isSearchOpen,
        setIsSearchOpen,
        openQuickAction,
        quickActionModal,
        closeQuickAction,
        pendingAppointmentPrefill,
        setPendingAppointmentPrefill,
        pendingQuotePrefill,
        setPendingQuotePrefill,
        toasts,
        addToast,
        removeToast,
        resetToDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
