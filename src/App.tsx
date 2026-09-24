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
  const { currentTab, isAuthenticated, isSubscriptionBlocked, sidebarCollapsed, currentUser, setCurrentUser } = useApp();
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
        const loggedEmail = currentUser.email;

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

        const rawStatus = (
          dbUser?.subscription_status ||
          dbUser?.subscriptionStatus ||
          currentUser.subscription_status ||
          currentUser.subscriptionStatus ||
          'trial'
        ).toString().trim().toLowerCase();

        const rawTrialEnd =
          dbUser?.trial_end ||
          dbUser?.trial_ends_at ||
          dbUser?.trialEndsAt ||
          currentUser.trial_end ||
          currentUser.trial_ends_at ||
          currentUser.trialEndsAt;

        let shouldBlock = false;
        if (rawStatus === 'active' || rawStatus === 'ativo') {
          shouldBlock = false;
        } else if (rawStatus === 'trial' || rawStatus === 'teste') {
          // Enquanto a data atual for anterior a trial_end, o utilizador DEVE ter acesso normal e total
          if (!rawTrialEnd) {
            shouldBlock = false;
          } else {
            const isTrialValid = isTrialActive(rawTrialEnd);
            shouldBlock = !isTrialValid;
          }
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
          shouldBlock = true;
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

          const updatedUser: User = {
            ...currentUser,
            subscriptionStatus: finalStatus,
            subscription_status: finalStatus,
            trialEndsAt: effectiveTrialEndDate,
            trial_ends_at: effectiveTrialEndDate,
            trial_end: effectiveTrialEnd,
            trial_start: dbUser?.trial_start || currentUser.trial_start || new Date().toISOString(),
          };

          if (
            currentUser.subscriptionStatus !== finalStatus ||
            currentUser.trial_end !== effectiveTrialEnd
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

  // Bloqueio Total: apenas para clientes que não forem master/admin quando expirar ou estiver bloqueado
  const userRole = (currentUser?.role || '').toString().toLowerCase().trim();
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const isMasterOrAdmin =
    userRole === 'master' ||
    userRole === 'admin' ||
    userRole === 'administrador' ||
    userEmail === 'vendas.impactodigital2@gmail.com';

  const shouldBlockAccess =
    !isMasterOrAdmin &&
    (supabaseBlocked || isSubscriptionBlocked || currentUser?.subscriptionStatus === 'expired');

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
      case 'settings':
        return <SettingsView />;
      case 'master-admin':
        return <MasterAdminView />;
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
