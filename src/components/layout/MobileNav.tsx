import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  CalendarCheck,
  Plus,
  HardHat,
  WalletCards,
  User,
  FileText,
  DollarSign,
  X,
} from 'lucide-react';
import { ActiveTab } from '../../types';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, openQuickAction } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Início', icon: LayoutDashboard },
    { id: 'appointments' as ActiveTab, label: 'Agenda', icon: CalendarCheck },
    // Center button is handled separately
    { id: 'projects' as ActiveTab, label: 'Obras', icon: HardHat },
    { id: 'financial' as ActiveTab, label: 'Financeiro', icon: WalletCards },
  ];

  return (
    <>
      {/* Quick Action Bottom Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSheetOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <Plus className="w-4 h-4" />
                </span>
                <p className="font-bold text-slate-900 dark:text-white text-base">
                  Nova Operação
                </p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={() => {
                  setSheetOpen(false);
                  openQuickAction('newClient');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Novo Cliente</p>
                  <p className="text-[10px] text-slate-500">Cadastrar contato</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSheetOpen(false);
                  openQuickAction('newQuote');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Novo Orçamento</p>
                  <p className="text-[10px] text-slate-500">Gerar proposta</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSheetOpen(false);
                  openQuickAction('newAppointment');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-left hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-purple-500 text-white shadow-xs">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Agendamento</p>
                  <p className="text-[10px] text-slate-500">Visita ou reunião</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSheetOpen(false);
                  openQuickAction('newProject');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                  <HardHat className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Nova Obra</p>
                  <p className="text-[10px] text-slate-500">Iniciar projeto</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSheetOpen(false);
                  openQuickAction('newEntry');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Nova Entrada</p>
                  <p className="text-[10px] text-slate-500">Recebimento PIX/Card</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSheetOpen(false);
                  openQuickAction('newExpense');
                }}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-xs">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Novo Gasto</p>
                  <p className="text-[10px] text-slate-500">Material ou equipe</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2 py-1.5 safe-area-pb">
        <div className="flex items-center justify-around">
          {/* Item 1: Início */}
          <button
            onClick={() => setActiveTab(navItems[0].id)}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
              activeTab === navItems[0].id
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{navItems[0].label}</span>
          </button>

          {/* Item 2: Agenda */}
          <button
            onClick={() => setActiveTab(navItems[1].id)}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
              activeTab === navItems[1].id
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <CalendarCheck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{navItems[1].label}</span>
          </button>

          {/* Center "+" Floating Button */}
          <div className="-mt-5">
            <button
              onClick={() => setSheetOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/40 hover:bg-blue-700 active:scale-95 transition-transform"
              aria-label="Ações Rápidas"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Item 3: Obras */}
          <button
            onClick={() => setActiveTab(navItems[2].id)}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
              activeTab === navItems[2].id
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <HardHat className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{navItems[2].label}</span>
          </button>

          {/* Item 4: Financeiro */}
          <button
            onClick={() => setActiveTab(navItems[3].id)}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
              activeTab === navItems[3].id
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <WalletCards className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{navItems[3].label}</span>
          </button>
        </div>
      </div>
    </>
  );
};
