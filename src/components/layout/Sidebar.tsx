import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarCheck,
  CalendarDays,
  HardHat,
  WalletCards,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const {
    company,
    currentUser,
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    logout,
  } = useApp();

  const userRole = currentUser?.role || 'ADMINISTRADOR';

  // Role permissions checking
  const checkAccess = (tab: ActiveTab): boolean => {
    if (userRole === 'ADMINISTRADOR') return true;
    if (userRole === 'GERENTE') {
      return ['dashboard', 'projects', 'quotes', 'appointments', 'calendar', 'financial', 'reports'].includes(tab);
    }
    if (userRole === 'ORÇAMENTISTA') {
      return ['dashboard', 'clients', 'quotes', 'appointments', 'calendar'].includes(tab);
    }
    if (userRole === 'FUNCIONÁRIO') {
      return ['dashboard', 'projects', 'calendar'].includes(tab);
    }
    return true;
  };

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients' as ActiveTab, label: 'Clientes', icon: Users },
    { id: 'quotes' as ActiveTab, label: 'Orçamentos', icon: FileText },
    { id: 'appointments' as ActiveTab, label: 'Agenda', icon: CalendarCheck },
    { id: 'calendar' as ActiveTab, label: 'Calendário', icon: CalendarDays },
    { id: 'projects' as ActiveTab, label: 'Obras', icon: HardHat },
    { id: 'financial' as ActiveTab, label: 'Financeiro', icon: WalletCards },
    { id: 'team' as ActiveTab, label: 'Equipe', icon: UserCheck },
    { id: 'reports' as ActiveTab, label: 'Relatórios', icon: BarChart3 },
    { id: 'settings' as ActiveTab, label: 'Configurações', icon: Settings },
  ];

  const filteredNavItems = navItems.filter((item) => checkAccess(item.id));

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-72`}
      >
        {/* Company Header with Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200/80 dark:border-slate-800">
          <div
            onClick={() => handleSelect('dashboard')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
          >
            <img
              src="/nexvoltora.png"
              alt={company.trade_name || 'Nexvoltora'}
              className="h-10 w-10 rounded-xl object-contain shrink-0 ring-1 ring-blue-500/20 shadow-xs bg-slate-900"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo.png';
              }}
            />
            {!sidebarCollapsed && (
              <div className="truncate">
                <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight truncate block">
                  {company.trade_name || 'Nexvoltora'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 block -mt-0.5">
                  Gestão & Prestação
                </span>
              </div>
            )}
          </div>

          {/* Close for mobile, minimize for desktop */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            title={sidebarCollapsed ? 'Expandir menu' : 'Minimizar menu'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User preview banner on top when expanded */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                {currentUser?.name || 'Fábio Mendes'}
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {userRole === 'ADMINISTRADOR' ? 'ADMIN' : userRole}
            </span>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                  }`}
                />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-1">
          {!sidebarCollapsed && (
            <div className="px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 mb-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Multiempresa Ativa</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                CNPJ: {company.cnpj || '45.892.123/0001-90'}
              </p>
            </div>
          )}

          <button
            onClick={logout}
            title={sidebarCollapsed ? 'Sair' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${
              sidebarCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Sair do Sistema</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
