import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateTrialEndsAt } from '../../lib/supabaseClient';
import {
  Bell,
  Search,
  Moon,
  Sun,
  Plus,
  Menu,
  ChevronDown,
  LogOut,
  Settings,
  User as UserIcon,
  CheckCheck,
  Building2,
  Calendar,
  Briefcase,
  FileText,
  DollarSign,
  Clock,
  Sparkles,
  Zap,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    company,
    currentUser,
    logout,
    darkMode,
    toggleDarkMode,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    setIsSearchOpen,
    openQuickAction,
    setActiveTab,
    subscriptionInfo,
    setSubscriptionForTesting,
    expiringClientsCount,
  } = useApp();

  const userRole = (currentUser?.role || '').toString().toLowerCase().trim();
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const isMasterUser =
    userRole === 'master' ||
    userRole === 'admin' ||
    userRole === 'administrador' ||
    userEmail === 'vendas.impactodigital2@gmail.com';

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target as Node)) {
        setShowQuickCreate(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 lg:px-8 transition-colors">
      {/* Left side: Hamburger & Global Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-hidden"
          title="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Trigger */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 transition-all w-48 sm:w-72 md:w-80 group text-left"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
          <span className="truncate">Buscar clientes, obras, orçamentos...</span>
          <kbd className="hidden sm:inline-block ml-auto text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Master Admin: Expirando em ≤ 5 dias alerta no Header */}
        {isMasterUser && expiringClientsCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('master-admin')}
            title="Clientes com período de teste prestes a vencer (≤ 5 dias) - Abrir Painel Master"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-xs transition-all animate-pulse cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Prestes a Vencer:</span>
            <span>{expiringClientsCount}</span>
          </button>
        )}

        {/* Trial Countdown Badge (when in active trial) */}
        {subscriptionInfo.status === 'trial' && !subscriptionInfo.isBlocked && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold shadow-xs animate-in fade-in">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              Teste grátis: <strong>{subscriptionInfo.daysRemaining ?? 15} dias</strong>
            </span>
          </div>
        )}

        {/* Quick Add Dropdown */}
        <div className="relative" ref={quickCreateRef}>
          <button
            onClick={() => setShowQuickCreate(!showQuickCreate)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {showQuickCreate && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Ações Rápidas
              </div>
              <button
                onClick={() => {
                  setShowQuickCreate(false);
                  openQuickAction('newClient');
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5"
              >
                <UserIcon className="w-4 h-4 text-blue-500" />
                <span>Novo Cliente</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickCreate(false);
                  openQuickAction('newQuote');
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5"
              >
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>Novo Orçamento</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickCreate(false);
                  openQuickAction('newAppointment');
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5"
              >
                <Calendar className="w-4 h-4 text-purple-500" />
                <span>Novo Agendamento</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickCreate(false);
                  openQuickAction('newProject');
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5"
              >
                <Briefcase className="w-4 h-4 text-amber-500" />
                <span>Nova Obra</span>
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                onClick={() => {
                  setShowQuickCreate(false);
                  openQuickAction('newEntry');
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5"
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Nova Entrada (Recebimento)</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickCreate(false);
                  openQuickAction('newExpense');
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5"
              >
                <DollarSign className="w-4 h-4 text-rose-500" />
                <span>Novo Gasto / Despesa</span>
              </button>
            </div>
          )}
        </div>

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">
                    Central de Notificações
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                      {unreadCount} novas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Marcar todas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationAsRead(notif.id);
                        if (notif.action_tab) {
                          setActiveTab(notif.action_tab as any);
                          setShowNotifications(false);
                        }
                      }}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                        !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        {notif.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* User Account Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
              alt={currentUser?.name || 'Usuário'}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {currentUser?.name || 'Administrador'}
              </p>
              <p className="text-[10px] font-medium text-slate-400 leading-tight">
                {currentUser?.role || 'ADMINISTRADOR'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {currentUser?.role}
                  </span>
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      subscriptionInfo.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {subscriptionInfo.status === 'active'
                      ? '✓ Assinatura Ativa'
                      : `Teste: ${subscriptionInfo.daysRemaining ?? 15}d`}
                  </span>
                </div>
              </div>

              <div className="py-1">
                {/* Botão de teste para simular expiração de teste ou ativação */}
                <div className="px-3 py-1.5 mb-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg mx-2 text-[11px]">
                  <div className="text-slate-500 font-medium mb-1">Simular Período de Teste:</div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setSubscriptionForTesting('expired', '2020-01-01');
                      }}
                      className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-[10px] transition-colors"
                      title="Simula 15 dias vencidos para testar a tela de bloqueio"
                    >
                      Expirar Teste
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setSubscriptionForTesting('trial', calculateTrialEndsAt(15));
                      }}
                      className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-[10px] transition-colors"
                      title="Ativa teste de 15 dias"
                    >
                      Resetar 15 Dias
                    </button>
                  </div>
                </div>
                {isMasterUser && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setActiveTab('master-admin');
                    }}
                    className="w-full px-4 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                      <span>Painel Master</span>
                    </div>
                    {expiringClientsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                        {expiringClientsCount} a vencer
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setActiveTab('settings');
                  }}
                  className="w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Minha Empresa</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setActiveTab('team');
                  }}
                  className="w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>Equipe / Usuários</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setActiveTab('settings');
                  }}
                  className="w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Configurações do Sistema</span>
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da conta</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
