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
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, parseTrialDate } from './lib/firebase';
import { User } from './types';

const MainLayout: React.FC = () => {
  const { currentTab, isAuthenticated, isSubscriptionBlocked, sidebarCollapsed, currentUser, setCurrentUser } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isVerifyingFirestore, setIsVerifyingFirestore] = useState(true);
  const [firestoreBlocked, setFirestoreBlocked] = useState(false);

  // Verificação direta no Firestore para a rota usando o UID correto do usuário logado
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      const loggedUid = fbUser?.uid || auth.currentUser?.uid || currentUser?.id;

      if (!loggedUid) {
        if (isMounted) setIsVerifyingFirestore(false);
        return;
      }

      console.log('[App.tsx] Buscando documento na coleção "users" usando o UID correto do usuário logado:', loggedUid);

      try {
        const userDocRef = doc(db, 'users', loggedUid);
        const snap = await getDoc(userDocRef);

        let data: any = null;
        if (snap.exists()) {
          data = snap.data();
          console.log('[App.tsx] Documento do Firestore encontrado para o UID:', loggedUid, data);
        } else {
          // Busca secundária por query se o documento tiver ID gerado diferente do UID
          const q = query(collection(db, 'users'), where('uid', '==', loggedUid));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            data = qSnap.docs[0].data();
            console.log('[App.tsx] Documento encontrado por query uid no Firestore:', data);
          } else if (fbUser?.email) {
            const qEmail = query(collection(db, 'users'), where('email', '==', fbUser.email));
            const emailSnap = await getDocs(qEmail);
            if (!emailSnap.empty) {
              data = emailSnap.docs[0].data();
              console.log('[App.tsx] Documento encontrado por query email no Firestore:', data);
            }
          }
        }

        const todayStr = new Date().toISOString().split('T')[0];

        if (data) {
          const rawStatus = (
            data.subscriptionStatus ||
            data.subscription_status ||
            data.status ||
            'trial'
          ).toString().trim().toLowerCase();

          const parsedTrialEndsAt = parseTrialDate(
            data.trialEndsAt ||
            data.trial_ends_at ||
            data.trialEndDate ||
            data.trial_end
          );

          console.log('[App.tsx] Verificação de assinatura:', {
            loggedUid,
            rawStatus,
            parsedTrialEndsAt,
            todayStr,
          });

          // Regra de validação: bloqueia se estiver marcado como expirado/vencido/suspenso ou trial fora do prazo
          let isExpired = false;
          if (
            rawStatus === 'expired' ||
            rawStatus === 'vencido' ||
            rawStatus === 'bloqueado' ||
            rawStatus === 'inactive' ||
            rawStatus === 'trial_expired' ||
            rawStatus === 'cancelado' ||
            rawStatus === 'suspenso'
          ) {
            isExpired = true;
          } else if (rawStatus === 'trial') {
            if (!parsedTrialEndsAt || todayStr > parsedTrialEndsAt) {
              isExpired = true;
            }
          } else if (rawStatus !== 'active') {
            isExpired = true;
          }

          let shouldBlock = isExpired || rawStatus !== 'active';

          // Checagem em tempo real com o webhook do Asaas
          if (shouldBlock) {
            try {
              const checkEmail = data.email || fbUser?.email || currentUser?.email || '';
              const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(checkEmail)}&uid=${encodeURIComponent(loggedUid)}`);
              if (res.ok) {
                const subStatus = await res.json();
                if (subStatus.active || subStatus.subscriptionStatus === 'active') {
                  console.log('[App.tsx] Pagamento confirmado pelo Asaas Webhook! Desbloqueando acesso.');
                  shouldBlock = false;
                  isExpired = false;
                }
              }
            } catch (checkErr) {
              // segue fluxo normal
            }
          }

          if (isMounted) {
            setFirestoreBlocked(shouldBlock);
            
            const updatedUser: User = {
              ...currentUser,
              id: loggedUid,
              subscriptionStatus: shouldBlock ? 'expired' : 'active',
              trialEndsAt: shouldBlock ? (parsedTrialEndsAt || currentUser?.trialEndsAt) : undefined,
            } as User;
            
            setCurrentUser(updatedUser);
            localStorage.setItem('ozi_current_user', JSON.stringify(updatedUser));
          }
        } else {
          // Se o documento não foi encontrado de forma direta, verifica com o webhook antes de bloquear
          let shouldBlock = true;
          try {
            const checkEmail = fbUser?.email || currentUser?.email || '';
            const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(checkEmail)}&uid=${encodeURIComponent(loggedUid)}`);
            if (res.ok) {
              const subStatus = await res.json();
              if (subStatus.active || subStatus.subscriptionStatus === 'active') {
                shouldBlock = false;
              }
            }
          } catch (e) {}

          if (isMounted) setFirestoreBlocked(shouldBlock);
        }
      } catch (err) {
        console.error('[App.tsx] Erro ao ler documento do usuário no Firestore:', err);
        if (isMounted) setFirestoreBlocked(true);
      } finally {
        if (isMounted) setIsVerifyingFirestore(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Sempre que abrir o programa sem usuário autenticado, exibe a tela de login por padrão
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  // Enquanto valida o Firestore para o usuário recém-logado
  if (isVerifyingFirestore) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-300">Validando permissões e assinatura...</p>
      </div>
    );
  }

  // Bloqueio Total: se o Firestore indicou bloqueio ou se o estado local aponta expiração
  const shouldBlockAccess = firestoreBlocked || isSubscriptionBlocked || currentUser?.subscriptionStatus === 'expired';

  if (shouldBlockAccess) {
    return (
      <>
        <SubscriptionBlockedView />
        <ToastContainer />
      </>
    );
  }

  const renderCurrentView = () => {
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
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Sidebar navigation */}
      <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <Header onOpenMobileMenu={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto pb-24 md:pb-12">
          {renderCurrentView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav />

      {/* Global Search Modal (Ctrl+K or Header search) */}
      <GlobalSearchModal />

      {/* Notification and Action Toasts */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
