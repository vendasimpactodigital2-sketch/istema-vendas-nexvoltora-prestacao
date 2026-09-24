import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LogOut,
  Download,
  ShieldCheck,
  X,
  Users,
  FileText,
  HardHat,
  CalendarCheck,
  WalletCards,
  CheckCircle2,
} from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({ isOpen, onClose }) => {
  const {
    logout,
    exportFullBackup,
    clients,
    quotes,
    projects,
    appointments,
    financialEntries,
    financialExpenses,
    currentUser,
    addToast,
  } = useApp();

  const [isExportingAndLoggingOut, setIsExportingAndLoggingOut] = useState(false);

  if (!isOpen) return null;

  const totalFinance = (financialEntries?.length || 0) + (financialExpenses?.length || 0);

  const handleDownloadAndLogout = async () => {
    setIsExportingAndLoggingOut(true);
    try {
      const filename = exportFullBackup();
      addToast(`Backup ${filename} baixado com sucesso!`, 'success');
      // Pequeno intervalo para o navegador disparar o download
      setTimeout(async () => {
        onClose();
        await logout();
      }, 700);
    } catch (err: any) {
      addToast('Erro ao gerar backup antes de sair: ' + (err?.message || 'Falha'), 'error');
      setIsExportingAndLoggingOut(false);
    }
  };

  const handleDirectLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl text-left text-white space-y-5 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <LogOut className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Encerrar Sessão</h3>
              <p className="text-xs text-slate-400">
                {currentUser?.name ? `Conectado como ${currentUser.name}` : 'Sua sessão atual'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <p className="text-sm text-slate-300 font-medium leading-relaxed">
            Deseja salvar um <strong>backup completo em arquivo JSON</strong> de todos os seus dados antes de sair?
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Você poderá restaurar este backup a qualquer momento na tela de Configurações, vinculando os registros automaticamente à sua conta.
          </p>
        </div>

        {/* Resumo dos Dados que serão Salvos */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Dados incluídos no backup</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sincronizado
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{clients?.length || 0} Clientes</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{quotes?.length || 0} Orçamentos</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <HardHat className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{projects?.length || 0} Obras</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <CalendarCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>{appointments?.length || 0} Agendas</span>
            </div>
            <div className="col-span-2 flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <WalletCards className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>{totalFinance} Lançamentos Financeiros & Configurações</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-1">
          {/* Opção 1: Baixar Backup e Sair */}
          <button
            type="button"
            onClick={handleDownloadAndLogout}
            disabled={isExportingAndLoggingOut}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{isExportingAndLoggingOut ? 'Exportando e Saindo...' : 'Baixar Backup e Sair'}</span>
          </button>

          {/* Opção 2 e Cancelar em linha */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDirectLogout}
              disabled={isExportingAndLoggingOut}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-rose-300 hover:text-rose-200 transition-colors cursor-pointer text-center"
            >
              Sair sem Backup
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isExportingAndLoggingOut}
              className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Formato JSON seguro compatível com restauração do Supabase</span>
        </div>
      </div>
    </div>
  );
};
