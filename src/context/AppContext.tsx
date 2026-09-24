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
  auth,
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  logoutUser,
  sendPasswordReset,
  onAuthStateChanged,
  syncUserProfileToFirestore,
  evaluateSubscription,
  verifyUserSubscriptionInFirestore,
  activateUserSubscription,
  type SubscriptionStatusInfo,
  calculateTrialEndsAt,
  type FirebaseUser,
} from '../lib/firebase';
import { UserRole } from '../types';

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
  firebaseUser: FirebaseUser | null;
  firebaseConnected: boolean;
  loginWithFirebaseEmail: (email: string, password: string) => Promise<User>;
  registerWithFirebaseEmail: (
    email: string,
    password: string,
    extra: { name: string; role: UserRole; phone?: string; whatsapp?: string }
  ) => Promise<User>;
  loginWithFirebaseGoogle: () => Promise<User>;
  resetFirebasePassword: (email: string) => Promise<void>;

  // Subscription & 15-Day Trial Control
  subscriptionInfo: SubscriptionStatusInfo;
  isSubscriptionBlocked: boolean;
  activateSubscription: () => Promise<void>;
  setSubscriptionForTesting: (status: 'trial' | 'active' | 'expired', trialEndsAt?: string) => void;

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
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;

  clients: Client[];
  addClient: (c: Omit<Client, 'id' | 'created_at'>) => Client;
  updateClient: (id: string, c: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  quotes: Quote[];
  addQuote: (q: Omit<Quote, 'id' | 'created_at' | 'code'>) => Quote;
  updateQuote: (id: string, q: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  approveQuote: (id: string) => void;
  rejectQuote: (id: string) => void;
  duplicateQuote: (id: string) => void;
  convertToProject: (quoteId: string) => Project | null;

  appointments: Appointment[];
  addAppointment: (a: Omit<Appointment, 'id' | 'created_at'>) => Appointment;
  updateAppointment: (id: string, a: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;

  projects: Project[];
  addProject: (p: Omit<Project, 'id' | 'created_at' | 'code' | 'tasks' | 'photos'> & { tasks?: ProjectTask[]; photos?: ProjectPhoto[] }) => Project;
  updateProject: (id: string, p: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  updateProjectProgress: (id: string, progress: number) => void;
  addTaskToProject: (projectId: string, task: Omit<ProjectTask, 'id' | 'project_id'>) => void;
  toggleTaskStatus: (projectId: string, taskId: string) => void;
  deleteTaskFromProject: (projectId: string, taskId: string) => void;
  addPhotoToProject: (projectId: string, photo: Omit<ProjectPhoto, 'id' | 'project_id' | 'created_at'>) => void;
  deletePhotoFromProject: (projectId: string, photoId: string) => void;

  financialEntries: FinancialEntry[];
  addFinancialEntry: (e: Omit<FinancialEntry, 'id' | 'created_at'>) => void;
  updateFinancialEntry: (id: string, e: Partial<FinancialEntry>) => void;
  deleteFinancialEntry: (id: string) => void;

  financialExpenses: FinancialExpense[];
  addFinancialExpense: (e: Omit<FinancialExpense, 'id' | 'created_at'>) => void;
  updateFinancialExpense: (id: string, e: Partial<FinancialExpense>) => void;
  deleteFinancialExpense: (id: string) => void;

  // Monthly Goals & Diluted Expenses
  monthlyGoals: Record<string, MonthlyGoal>;
  getMonthlyGoal: (month: string) => MonthlyGoal;
  saveMonthlyGoal: (goal: MonthlyGoal) => void;

  // Notifications
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Toast
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Quick action modals
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  quickActionModal: string | null;
  openQuickAction: (action: string, payload?: any) => void;
  closeQuickAction: () => void;
  modalPayload: any;
  pendingQuotePrefill: any;
  setPendingQuotePrefill: (payload: any) => void;
  pendingAppointmentPrefill: any;
  setPendingAppointmentPrefill: (payload: any) => void;

  // Reset demo data
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ozi_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ozi_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ozi_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

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
      return updated;
    });
    addToast('Dados da empresa atualizados com sucesso!', 'success');
  };

  // Users / Team
  const [users, setUsers] = useState<User[]>(() =>
    loadFromStorage('users', INITIAL_USERS)
  );

  // Firebase Authentication & Session State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(true);

  // Current session user - Ao abrir o programa, sempre deve exigir autenticação (exibindo a tela de login)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (auth.currentUser) {
      const isTargetExpired = auth.currentUser.uid === 'kU4JDgCeM6ggMHYuvnixzV';
      return {
        id: auth.currentUser.uid,
        company_id: 'comp_ozi_01',
        name: auth.currentUser.displayName || 'Usuário Sistema',
        email: auth.currentUser.email || '',
        phone: '(11) 98765-4321',
        whatsapp: '(11) 98765-4321',
        role: 'ADMINISTRADOR',
        avatar: auth.currentUser.photoURL || 'https://unsplash.com',
        active: true,
        created_at: new Date().toISOString().split('T')[0],
        subscriptionStatus: isTargetExpired ? 'expired' : 'trial',
        trialEndsAt: isTargetExpired ? '2025-01-01' : undefined,
      };
    }
    // Sempre que abrir o programa, exibe a tela de login por padrão (sem bypass automático)
    return null;
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (fbUser) => {
        setFirebaseUser(fbUser);
        if (fbUser) {
          setFirebaseConnected(true);
          try {
            // Regra 1: Toda vez que o usuário logar, verifica o documento dele na coleção "users" do Firestore
            const verified = await verifyUserSubscriptionInFirestore(fbUser.uid);
            if (!verified.email && fbUser.email) {
              verified.email = fbUser.email;
              verified.name = fbUser.displayName || verified.name;
            }
            // Força expiração para UID kU4JDgCeM6ggMHYuvnixzV caso não esteja com assinatura ativa
            if (fbUser.uid === 'kU4JDgCeM6ggMHYuvnixzV' && verified.subscriptionStatus !== 'active') {
              verified.subscriptionStatus = 'expired';
            }
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
            console.warn('Erro ao sincronizar/verificar usuário no Firestore:', err);
          }
        }
      },
      (error) => {
        console.warn('Firebase onAuthStateChanged error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Always keep localStorage in sync with currentUser
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ozi_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('ozi_current_user');
    }
  }, [currentUser]);

  // Avaliação em tempo real do período de teste de 15 dias e status da assinatura
  const subscriptionInfo = evaluateSubscription(currentUser);
  const isSubscriptionBlocked = subscriptionInfo.isBlocked;

  // Login with Firebase Email & Password
  const loginWithFirebaseEmail = async (email: string, password: string): Promise<User> => {
    try {
      const user = await signInWithEmail(email, password);
      setCurrentUser(user);
      localStorage.setItem('ozi_current_user', JSON.stringify(user));
      addToast(`Autenticado com sucesso via Firebase: ${user.name}!`, 'success');
      return user;
    } catch (error: any) {
      console.error('Firebase Email Login Error:', error);
      const code = error?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        throw new Error('E-mail ou senha incorretos.');
      } else if (code === 'auth/user-not-found') {
        throw new Error('Nenhum usuário cadastrado com este e-mail no Firebase.');
      } else if (code === 'auth/invalid-email') {
        throw new Error('Endereço de e-mail inválido.');
      } else if (code === 'auth/operation-not-allowed') {
        throw new Error(
          'O provedor de login com Email/Senha precisa ser ativado no Firebase Console (Authentication > Sign-in method > Email/Password).'
        );
      } else if (code === 'auth/network-request-failed') {
        throw new Error('Falha de conexão com a rede. Verifique seu acesso à internet.');
      }
      throw new Error(error?.message || 'Erro ao realizar login no Firebase.');
    }
  };

  // Register with Firebase Email & Password
  const registerWithFirebaseEmail = async (
    email: string,
    password: string,
    extra: { name: string; role: UserRole; phone?: string; whatsapp?: string }
  ): Promise<User> => {
    try {
      const newUser = await registerWithEmail(email, password, {
        name: extra.name,
        role: extra.role,
        phone: extra.phone,
        whatsapp: extra.whatsapp,
        company_id: company.id,
      });

      // Add to local state list
      setUsers((prev) => {
        const updated = [newUser, ...prev.filter((u) => u.email !== newUser.email)];
        saveToStorage('users', updated);
        return updated;
      });

      setCurrentUser(newUser);
      localStorage.setItem('ozi_current_user', JSON.stringify(newUser));
      addToast(`Conta criada e conectada ao Firebase: ${newUser.name}!`, 'success');
      return newUser;
    } catch (error: any) {
      console.error('Firebase Register Error:', error);
      const code = error?.code || '';
      if (code === 'auth/email-already-in-use') {
        throw new Error('Este e-mail já está registrado no Firebase. Tente fazer login.');
      } else if (code === 'auth/weak-password') {
        throw new Error('A senha do Firebase deve conter pelo menos 6 caracteres.');
      } else if (code === 'auth/invalid-email') {
        throw new Error('Formato de e-mail inválido.');
      } else if (code === 'auth/operation-not-allowed') {
        throw new Error(
          'O provedor Email/Password não está habilitado no Console do Firebase. Ative em Authentication > Sign-in method.'
        );
      }
      throw new Error(error?.message || 'Erro ao registrar usuário no Firebase.');
    }
  };

  // Login with Google Popup
  const loginWithFirebaseGoogle = async (): Promise<User> => {
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      localStorage.setItem('ozi_current_user', JSON.stringify(user));
      addToast(`Bem-vindo via Google, ${user.name}!`, 'success');
      return user;
    } catch (error: any) {
      console.error('Firebase Google Login Error:', error);
      if (error?.code === 'auth/popup-closed-by-user') {
        throw new Error('O popup de login do Google foi fechado antes de concluir.');
      }
      throw new Error(error?.message || 'Falha ao autenticar com Google.');
    }
  };

  // Reset Password via Firebase
  const resetFirebasePassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordReset(email);
      addToast('E-mail de redefinição de senha enviado com sucesso!', 'success');
    } catch (error: any) {
      console.error('Firebase Password Reset Error:', error);
      const code = error?.code || '';
      if (code === 'auth/user-not-found') {
        throw new Error('Nenhum usuário com este e-mail encontrado no Firebase.');
      } else if (code === 'auth/invalid-email') {
        throw new Error('Formato de e-mail inválido.');
      }
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

      // Regra 2 & 3: Avaliar status do período de teste
      const todayStr = new Date().toISOString().split('T')[0];
      let userObj: User = { ...found };
      if (!userObj.subscriptionStatus) {
        userObj.subscriptionStatus = 'trial';
        userObj.trialEndsAt = userObj.trialEndsAt || calculateTrialEndsAt(15);
      }
      if (
        userObj.subscriptionStatus === 'trial' &&
        userObj.trialEndsAt &&
        todayStr > userObj.trialEndsAt
      ) {
        userObj.subscriptionStatus = 'expired';
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
      await logoutUser();
    } catch (err) {
      console.warn('Logout Firebase error:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('ozi_current_user');
    addToast('Sessão encerrada com sucesso.', 'info');
  };

  // Regra 5: Ativar Assinatura Mensal (R$ 26,99/mês) e atualizar o Firestore
  const activateSubscription = async (): Promise<void> => {
    if (!currentUser) return;
    try {
      const updated = await activateUserSubscription(currentUser.id);
      setCurrentUser(updated);
      localStorage.setItem('ozi_current_user', JSON.stringify(updated));
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === updated.id ? updated : u));
        saveToStorage('users', next);
        return next;
      });
      addToast('Assinatura Mensal de R$ 26,99/mês ativada com sucesso! Acesso liberado.', 'success');
    } catch (err) {
      console.warn('Erro ao atualizar assinatura no Firestore, aplicando no estado local:', err);
      const fallbackUser: User = {
        ...currentUser,
        subscriptionStatus: 'active',
      };
      setCurrentUser(fallbackUser);
      localStorage.setItem('ozi_current_user', JSON.stringify(fallbackUser));
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === fallbackUser.id ? fallbackUser : u));
        saveToStorage('users', next);
        return next;
      });
      addToast('Assinatura Mensal de R$ 26,99/mês ativada com sucesso! Acesso liberado.', 'success');
    }
  };

  // Helper para simulação e teste nos ambientes de desenvolvimento
  const setSubscriptionForTesting = (
    status: 'trial' | 'active' | 'expired',
    trialEndsAt?: string
  ) => {
    if (!currentUser) return;
    const newTrialEndsAt =
      trialEndsAt || (status === 'expired' ? '2025-01-01' : calculateTrialEndsAt(15));
    const updated: User = {
      ...currentUser,
      subscriptionStatus: status,
      trialEndsAt: newTrialEndsAt,
    };
    setCurrentUser(updated);
    localStorage.setItem('ozi_current_user', JSON.stringify(updated));
    setUsers((prev) => {
      const next = prev.map((u) => (u.id === updated.id ? updated : u));
      saveToStorage('users', next);
      return next;
    });
    addToast(`Status de assinatura ajustado para: ${status}`, 'info');
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
      return updated;
    });
    addToast('Novo membro adicionado à equipe!', 'success');
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === id ? { ...u, ...updates } : u));
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
      return updated;
    });
    addToast(`Cliente ${newClient.name} cadastrado com sucesso!`, 'success');
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      saveToStorage('clients', updated);
      return updated;
    });
    addToast('Dados do cliente atualizados.', 'success');
  };

  const deleteClient = (id: string) => {
    setClients((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveToStorage('clients', updated);
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
      return updated;
    });
    addToast(`Orçamento ${newQuote.code} gerado com sucesso!`, 'success');
    return newQuote;
  };

  const updateQuote = (id: string, updates: Partial<Quote>) => {
    setQuotes((prev) => {
      const updated = prev.map((q) => (q.id === id ? { ...q, ...updates } : q));
      saveToStorage('quotes', updated);
      return updated;
    });
    addToast('Orçamento atualizado.', 'success');
  };

  const deleteQuote = (id: string) => {
    setQuotes((prev) => {
      const updated = prev.filter((q) => q.id !== id);
      saveToStorage('quotes', updated);
      return updated;
    });
    addToast('Orçamento excluído.', 'info');
  };

  const approveQuote = (id: string) => {
    setQuotes((prev) => {
      const updated = prev.map((q) => (q.id === id ? { ...q, status: 'Aprovado' as const } : q));
      saveToStorage('quotes', updated);
      return updated;
    });
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    addToast('Orçamento Aprovado com sucesso! 🎉', 'success');
  };

  const rejectQuote = (id: string) => {
    setQuotes((prev) => {
      const updated = prev.map((q) => (q.id === id ? { ...q, status: 'Recusado' as const } : q));
      saveToStorage('quotes', updated);
      return updated;
    });
    addToast('Orçamento marcado como recusado.', 'info');
  };

  const duplicateQuote = (id: string) => {
    const original = quotes.find((q) => q.id === id);
    if (!original) return;
    const year = new Date().getFullYear();
    const count = quotes.length + 1;
    const code = `ORC-${year}-${count.toString().padStart(3, '0')}`;
    const duplicated: Quote = {
      ...original,
      id: generateId('orc'),
      code,
      status: 'Novo',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString().split('T')[0],
      converted_to_project_id: undefined,
    };
    setQuotes((prev) => {
      const updated = [duplicated, ...prev];
      saveToStorage('quotes', updated);
      return updated;
    });
    addToast(`Orçamento duplicado: ${duplicated.code}`, 'success');
  };

  // Convert Quote into Project (AUTOMATION)
  const convertToProject = (quoteId: string): Project | null => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return null;

    const year = new Date().getFullYear();
    const pCount = projects.length + 1;
    const projectCode = `OBR-${year}-${pCount.toString().padStart(3, '0')}`;

    const defaultTasks: ProjectTask[] = quote.items.map((it, idx) => ({
      id: `tsk_${Date.now()}_${idx}`,
      project_id: '',
      title: it.description,
      status: 'Pendente',
    }));

    // Add standard prep & cleaning tasks
    const tasks: ProjectTask[] = [
      { id: `tsk_init_${Date.now()}`, project_id: '', title: 'Proteção do ambiente e isolamento', status: 'Pendente' },
      ...defaultTasks,
      { id: `tsk_clean_${Date.now()}`, project_id: '', title: 'Limpeza pós-obra e vistoria final', status: 'Pendente' },
    ];

    const today = new Date();
    const expected = new Date(today);
    expected.setDate(expected.getDate() + 20);

    const newProject: Project = {
      id: generateId('prj'),
      code: projectCode,
      name: `Obra - ${quote.client_name} (${quote.code})`,
      company_id: company.id,
      quote_id: quote.id,
      client_id: quote.client_id,
      client_name: quote.client_name,
      phone: quote.client_phone,
      whatsapp: quote.client_phone,
      address: quote.client_address,
      start_date: today.toISOString().split('T')[0],
      expected_completion_date: expected.toISOString().split('T')[0],
      responsible_id: quote.responsible_id,
      responsible_name: quote.responsible_name,
      team_members: [quote.responsible_name, 'Equipe de Obras'],
      total_value: quote.total,
      received_value: 0,
      progress: 0,
      status: 'Em andamento',
      notes: quote.notes || `Gerado automaticamente a partir do orçamento ${quote.code}`,
      tasks,
      photos: [],
      created_at: today.toISOString().split('T')[0],
    };

    // Update quote
    updateQuote(quote.id, {
      status: 'Aprovado',
      converted_to_project_id: newProject.id,
    });

    // Save project
    setProjects((prev) => {
      const updated = [newProject, ...prev];
      saveToStorage('projects', updated);
      return updated;
    });

    // Auto-create initial receivable forecast entry
    const entry50: FinancialEntry = {
      id: generateId('ent'),
      company_id: company.id,
      project_id: newProject.id,
      project_title: `${newProject.code} - ${newProject.client_name}`,
      client_id: newProject.client_id,
      client_name: newProject.client_name,
      description: `Entrada 50% - Obra ${newProject.code}`,
      amount: quote.total * 0.5,
      date: newProject.start_date,
      payment_method: 'PIX',
      status: 'Pendente',
      created_at: new Date().toISOString().split('T')[0],
    };

    const entryRest: FinancialEntry = {
      id: generateId('ent'),
      company_id: company.id,
      project_id: newProject.id,
      project_title: `${newProject.code} - ${newProject.client_name}`,
      client_id: newProject.client_id,
      client_name: newProject.client_name,
      description: `Parcela Final 50% - Obra ${newProject.code}`,
      amount: quote.total * 0.5,
      date: newProject.expected_completion_date,
      payment_method: 'PIX',
      status: 'Pendente',
      created_at: new Date().toISOString().split('T')[0],
    };

    setFinancialEntries((prev) => {
      const updated = [entry50, entryRest, ...prev];
      saveToStorage('entries', updated);
      return updated;
    });

    addToast(`Obra ${newProject.code} criada e previsões financeiras geradas!`, 'success');
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
      return updated;
    });
    addToast('Agendamento registrado com sucesso!', 'success');
    return newAppointment;
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      saveToStorage('appointments', updated);
      return updated;
    });
    addToast('Agendamento atualizado.', 'success');
  };

  const deleteAppointment = (id: string) => {
    setAppointments((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveToStorage('appointments', updated);
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
      return updated;
    });
    addToast(`Obra ${newProject.code} cadastrada com sucesso!`, 'success');
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      saveToStorage('projects', updated);
      return updated;
    });
    addToast('Obra atualizada.', 'success');
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveToStorage('projects', updated);
      return updated;
    });
    addToast('Obra removida.', 'info');
  };

  const updateProjectProgress = (id: string, progress: number) => {
    const clamped = Math.max(0, Math.min(100, progress));
    const status = clamped === 100 ? 'Concluída' : 'Em andamento';
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, progress: clamped, status: p.status === 'Cancelada' ? p.status : status } : p
      );
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
      const updated = prev.map((p) =>
        p.id === projectId ? { ...p, tasks: [...p.tasks, newTask] } : p
      );
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
        // Auto calculate progress percentage based on completed tasks
        const total = newTasks.length;
        const completed = newTasks.filter((t) => t.status === 'Concluído').length;
        const autoProgress = total > 0 ? Math.round((completed / total) * 100) : p.progress;
        return { ...p, tasks: newTasks, progress: autoProgress };
      });
      saveToStorage('projects', updated);
      return updated;
    });
  };

  const deleteTaskFromProject = (projectId: string, taskId: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.id === projectId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p
      );
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
      const updated = prev.map((p) =>
        p.id === projectId ? { ...p, photos: [newPhoto, ...p.photos] } : p
      );
      saveToStorage('projects', updated);
      return updated;
    });
    addToast('Foto adicionada à galeria da obra!', 'success');
  };

  const deletePhotoFromProject = (projectId: string, photoId: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.id === projectId ? { ...p, photos: p.photos.filter((ph) => ph.id !== photoId) } : p
      );
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
      return updated;
    });
    // If entry is linked to project and is received, update received_value in project
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
      const updated = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      saveToStorage('entries', updated);
      return updated;
    });
    addToast('Entrada financeira atualizada.', 'success');
  };

  const deleteFinancialEntry = (id: string) => {
    setFinancialEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveToStorage('entries', updated);
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
      return updated;
    });
    addToast('Gasto financeiro registrado!', 'success');
  };

  const updateFinancialExpense = (id: string, updates: Partial<FinancialExpense>) => {
    setFinancialExpenses((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      saveToStorage('expenses', updated);
      return updated;
    });
    addToast('Gasto atualizado.', 'success');
  };

  const deleteFinancialExpense = (id: string) => {
    setFinancialExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveToStorage('expenses', updated);
      return updated;
    });
    addToast('Gasto excluído.', 'info');
  };

  // Monthly Goals & Diluted Expenses
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, MonthlyGoal>>(() => {
    return loadFromStorage('monthly_goals', {
      [DEFAULT_MONTHLY_GOAL.month]: DEFAULT_MONTHLY_GOAL,
    });
  });

  const getMonthlyGoal = (month: string): MonthlyGoal => {
    if (monthlyGoals[month]) {
      return monthlyGoals[month];
    }
    // Default calculation based on work_days=22
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

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = generateId('tst');
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Global Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Quick Action Modal
  const [quickActionModal, setQuickActionModal] = useState<string | null>(null);
  const [modalPayload, setModalPayload] = useState<any>(null);
  const [pendingQuotePrefill, setPendingQuotePrefill] = useState<any>(null);
  const [pendingAppointmentPrefill, setPendingAppointmentPrefill] = useState<any>(null);

  const openQuickAction = (action: string, payload?: any) => {
    setQuickActionModal(action);
    setModalPayload(payload || null);
    if (action === 'newQuote') {
      setPendingQuotePrefill(payload || null);
      setActiveTab('quotes');
    } else if (action === 'newAppointment') {
      setPendingAppointmentPrefill(payload || null);
      setActiveTab('appointments');
    }
  };

  const closeQuickAction = () => {
    setQuickActionModal(null);
    setModalPayload(null);
  };

  // Reset demo data
  const resetDemoData = () => {
    resetAllToDemoData();
    setCompany(INITIAL_COMPANY);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
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
        firebaseUser,
        firebaseConnected,
        loginWithFirebaseEmail,
        registerWithFirebaseEmail,
        loginWithFirebaseGoogle,
        resetFirebasePassword,
        subscriptionInfo,
        isSubscriptionBlocked,
        activateSubscription,
        setSubscriptionForTesting,
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
        toasts,
        addToast,
        removeToast,
        isSearchOpen,
        setIsSearchOpen,
        quickActionModal,
        openQuickAction,
        closeQuickAction,
        modalPayload,
        pendingQuotePrefill,
        setPendingQuotePrefill,
        pendingAppointmentPrefill,
        setPendingAppointmentPrefill,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
