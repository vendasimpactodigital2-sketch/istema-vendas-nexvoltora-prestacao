import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { ToastContainer } from './components/common/Toast';
import { LoginView } from './components/auth/LoginView';
import { SubscriptionBlockedView } from './components/subscription/SubscriptionBlockedView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ClientsView } from './components/clients/ClientsView';
import { QuotesView } from './components/quotes/QuotesView';
import { ProjectsView } from './components/projects/ProjectsView';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { CalendarView } from './components/calendar/CalendarView';
import { FinancialView } from './components/financial/FinancialView';
import { TeamView } from './components/team/TeamView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { MasterAdminView } from './components/admin/MasterAdminView';
import { getSupabase, parseTrialDate, isTrialActive } from './lib/supabaseClient';
import { User } from './types';

const MainLayout: React.FC = () => {
  const {
    currentTab,
    isAuthenticated,
    isSubscriptionBlocked,
    sidebarCollapsed,
    currentUser,
    setCurrentUser,
    subscriptionInfo,
  } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isVerifyingSupabase, setIsVerifyingSupabase] = useState(false);
  const [supabaseBlocked, setSupabaseBlocked] = useState(false);

  // Verificação direta no Supabase para a rota usando o UID/e-mail do usuário logado
  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();

    if (!currentUser) {
      setSupabaseBlocked(false);
      setIsVerifyingSupabase(false);
      return;
    }

    const checkSubscription = async () => {
      setIsVerifyingSupabase(true);
      try {
        const loggedId = currentUser.id;
        const loggedEmail = (currentUser.email || '').toLowerCase().trim();
        const userIsMaster = loggedEmail === 'vendas.impactodigital2@gmail.com';

        // 1. O Master (vendas.impactodigital2@gmail.com) NUNCA é bloqueado
        if (userIsMaster) {
          if (isMounted) {
            setSupabaseBlocked(false);
            if (currentUser.role !== 'MASTER') {
              const masterUser = { ...currentUser, role: 'MASTER' as const, subscriptionStatus: 'active' as const };
              setCurrentUser(masterUser);
              localStorage.setItem('ozi_current_user', JSON.stringify(masterUser));
            }
          }
          return;
        }

        let dbUser: any = null;
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .or(`id.eq.${loggedId},email.eq.${loggedEmail}`)
              .maybeSingle();

            if (!error && data) {
              dbUser = data;
            }
          } catch (e) {
            console.warn('[App.tsx] Erro na consulta do Supabase:', e);
          }
        }

        // 2. Para qualquer outro utilizador: NUNCA usar role para dar isenção!
        const rawStatus = (
          dbUser?.subscription_status ||
          dbUser?.subscriptionStatus ||
          currentUser.subscription_status ||
          currentUser.subscriptionStatus ||
          ''
        ).toString().trim().toLowerCase();

        const rawTrialEnd =
          dbUser?.trial_end ||
          dbUser?.trial_ends_at ||
          dbUser?.trialEndsAt ||
          currentUser.trial_end ||
          currentUser.trial_ends_at ||
          currentUser.trialEndsAt;

        let shouldBlock = false;

        // Se estiver marcado como bloqueado no banco
        if (dbUser?.is_blocked === true || dbUser?.isBlocked === true || (currentUser as any)?.is_blocked === true) {
          shouldBlock = true;
        } else if (rawStatus === 'active' || rawStatus === 'ativo') {
          shouldBlock = false;
        } else if (
          rawStatus === 'expired' ||
          rawStatus === 'vencido' ||
          rawStatus === 'bloqueado' ||
          rawStatus === 'inactive' ||
          rawStatus === 'cancelado' ||
          rawStatus === 'trial_expired'
        ) {
          shouldBlock = true;
        } else {
          // Em período de teste: se não tiver data, ou data for passada, ou dias restantes for <= 0 -> BLOQUEIA
          if (!rawTrialEnd) {
            shouldBlock = true;
          } else {
            const isTrialValid = isTrialActive(rawTrialEnd);
            if (!isTrialValid) {
              shouldBlock = true;
            } else {
              try {
                const now = new Date();
                const endDate = rawTrialEnd.includes('T') ? new Date(rawTrialEnd) : new Date(`${rawTrialEnd}T23:59:59.999Z`);
                const diffMs = endDate.getTime() - now.getTime();
                const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                if (days <= 0) {
                  shouldBlock = true;
                }
              } catch (e) {
                shouldBlock = true;
              }
            }
          }
        }

        // Checagem em tempo real com o webhook do Asaas se estiver bloqueado
        if (shouldBlock) {
          try {
            const checkEmail = dbUser?.email || loggedEmail || '';
            const res = await fetch(
              `/api/subscription/status?email=${encodeURIComponent(checkEmail)}&uid=${encodeURIComponent(loggedId)}`
            );
            if (res.ok) {
              const subStatus = await res.json();
              if (subStatus.active || subStatus.subscriptionStatus === 'active') {
                console.log('[App.tsx] Pagamento confirmado pelo Asaas Webhook! Desbloqueando acesso.');
                shouldBlock = false;
              }
            }
          } catch (checkErr) {
            // segue fluxo normal
          }
        }

        if (isMounted) {
          setSupabaseBlocked(shouldBlock);

          const finalStatus = shouldBlock
            ? 'expired'
            : (rawStatus === 'active' ? 'active' : 'trial');

          const effectiveTrialEnd = rawTrialEnd || new Date(Date.now() + 15 * 86400000).toISOString();
          const effectiveTrialEndDate = effectiveTrialEnd.split('T')[0];

          // Rebaixar qualquer utilizador comum para 'CLIENT'
          const updatedUser: User = {
            ...currentUser,
            role: 'CLIENT',
            subscriptionStatus: finalStatus,
            subscription_status: finalStatus,
            trialEndsAt: effectiveTrialEndDate,
            trial_ends_at: effectiveTrialEndDate,
            trial_end: effectiveTrialEnd,
            trial_start: dbUser?.trial_start || currentUser.trial_start || new Date().toISOString(),
          };

          if (
            currentUser.subscriptionStatus !== finalStatus ||
            currentUser.trial_end !== effectiveTrialEnd ||
            currentUser.role !== 'CLIENT'
          ) {
            setCurrentUser(updatedUser);
            localStorage.setItem('ozi_current_user', JSON.stringify(updatedUser));
          }
        }
      } catch (err) {
        console.error('[App.tsx] Erro ao verificar assinatura:', err);
      } finally {
        if (isMounted) setIsVerifyingSupabase(false);
      }
    };

    checkSubscription();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUser?.email]);

  // Sempre que abrir o programa sem usuário autenticado, exibe a tela de login por padrão
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  // Enquanto valida o Supabase para o usuário recém-logado
  if (isVerifyingSupabase) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-300">Validando permissões e assinatura...</p>
      </div>
    );
  }

  // 1. EXCLUSIVIDADE ABSOLUTA DO MASTER:
  // Apenas e estritamente o e-mail 'vendas.impactodigital2@gmail.com' tem acesso irrestrito
  const isMaster = currentUser.email?.toLowerCase().trim() === 'vendas.impactodigital2@gmail.com';

  // 2. BLOQUEIO OBRIGATÓRIO (SUBSCRIPTION / TRIAL):
  // Se o e-mail NÃO for 'vendas.impactodigital2@gmail.com':
  // Se trial_end estiver vencido (ou Teste: 0d), is_blocked === true, ou subscription_status === 'expired', bloqueie IMEDIATAMENTE.
  const isTrialFinished = () => {
    if (isMaster) return false;
    const endVal = currentUser.trial_end || currentUser.trial_ends_at || currentUser.trialEndsAt;
    if (!endVal) return true;
    if (!isTrialActive(endVal)) return true;
    try {
      const now = new Date();
      const endDate = endVal.includes('T') ? new Date(endVal) : new Date(`${endVal}T23:59:59.999Z`);
      const diffMs = endDate.getTime() - now.getTime();
      const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (days <= 0) return true;
    } catch (e) {
      return true;
    }
    return false;
  };

  const shouldBlockAccess =
    !isMaster &&
    (supabaseBlocked ||
      isSubscriptionBlocked ||
      subscriptionInfo.isBlocked ||
      subscriptionInfo.isExpired ||
      (subscriptionInfo.daysRemaining !== undefined &&
        subscriptionInfo.daysRemaining <= 0 &&
        subscriptionInfo.status !== 'active') ||
      currentUser.subscriptionStatus === 'expired' ||
      (currentUser as any).subscription_status === 'expired' ||
      (currentUser as any).is_blocked === true ||
      (currentUser as any).isBlocked === true ||
      (currentUser.subscriptionStatus !== 'active' &&
        (currentUser as any).subscription_status !== 'active' &&
        isTrialFinished()));

  if (shouldBlockAccess) {
    return (
      <>
        <SubscriptionBlockedView />
        <ToastContainer />
      </>
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'clients':
        return <ClientsView />;
      case 'quotes':
        return <QuotesView />;
      case 'projects':
        return <ProjectsView />;
      case 'appointments':
        return <AppointmentsView />;
      case 'calendar':
        return <CalendarView />;
      case 'financial':
        return <FinancialView />;
      case 'team':
        return <TeamView />;
      case 'reports':
        return <ReportsView />;
      case 'master-admin':
        // Apenas e estritamente 'vendas.impactodigital2@gmail.com' pode renderizar o MasterAdminView
        if (!isMaster) {
          return <DashboardView />;
        }
        return <MasterAdminView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Desktop */}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Mobile Navigation Drawer */}
        <MobileNav
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
          }`}
        >
          <Header onOpenMobileMenu={() => setMobileSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-7xl mx-auto w-full">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      <GlobalSearchModal />
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;
