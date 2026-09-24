import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Building,
  LogOut,
  Zap,
  ArrowRight,
  Clock,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

export const SubscriptionBlockedView: React.FC = () => {
  const {
    company,
    currentUser,
    logout,
    activateSubscription,
    setSubscriptionForTesting,
    subscriptionInfo,
  } = useApp();

  const [isActivating, setIsActivating] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');

  const ASAAS_PAYMENT_URL = 'https://www.asaas.com/c/a7wa52vfwn1sq35p';

  const handleOpenPayment = () => {
    window.open(ASAAS_PAYMENT_URL, '_blank', 'noopener,noreferrer');
  };

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      await activateSubscription();
      setShowCheckoutModal(false);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center relative overflow-hidden bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      {/* Background visual accents */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-15 filter blur-[2px]"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80")',
        }}
      />
      <div className="absolute inset-0 bg-radial from-blue-900/20 via-slate-950/90 to-slate-950 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar with company branding and logout */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md p-1">
            <img
              src="/nexvoltora.png"
              alt="Nexvoltora Gestão e Prestação de Serviços"
              className="w-full h-full rounded-lg object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo.png';
              }}
            />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white leading-tight">
              Nexvoltora Gestão e Prestação de Serviços
            </h2>
            <p className="text-[11px] text-blue-400">Controle de Assinatura & Acesso</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          title="Sair da conta"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </header>

      {/* Main card */}
      <main className="relative z-10 w-full max-w-xl my-auto py-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl text-center">
          {/* Animated Lock & Expiration Icon */}
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-blue-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10 animate-pulse">
              <Lock className="w-10 h-10 text-amber-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-rose-500 text-white shadow-md">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* User info greeting */}
          {currentUser && (
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
              Olá, <span className="text-slate-200">{currentUser.name}</span> ({currentUser.email})
            </p>
          )}

          {/* Mensagem de bloqueio atualizada para o padrão do sistema Nexvoltora */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-4 max-w-lg mx-auto">
            Seu período de teste expirou! Ative sua assinatura de R$ 26,99 por mês para continuar usando o Nexvoltora Gestão e Prestação de Serviços.
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed max-w-md mx-auto">
            Todos os seus orçamentos, clientes, obras e registros financeiros permanecem salvos em segurança na nuvem. Ative agora para desbloquear seu acesso instantâneo.
          </p>

          {/* Pricing Highlight Card */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-b from-blue-950/60 to-slate-900/90 border border-blue-500/30 text-left">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-blue-400" /> Plano Profissional Completo
                </span>
                <h3 className="text-base font-bold text-white">Assinatura Mensal Ilimitada</h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 line-through">R$ 49,90</span>
                <div className="text-2xl font-black text-emerald-400">
                  R$ 26,99<span className="text-xs font-normal text-slate-400">/mês</span>
                </div>
              </div>
            </div>

            {/* Included features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Gestão completa de Obras e Cronogramas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Orçamentos profissionais em PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Controle Financeiro de Entradas e Saídas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Backup em nuvem no Firebase</span>
              </div>
            </div>
          </div>

          {/* Regra 5: Botão destacado chamado "Ativar Assinatura Mensal" */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleOpenPayment}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
              <span>Ativar Assinatura Mensal</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sem fidelidade • Cancele quando quiser • Desbloqueio imediato</span>
            </div>
          </div>

          {/* Dev/Testing simulation controls */}
          <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Status atual: <code className="text-amber-400 font-mono">{currentUser?.subscriptionStatus || 'trial'}</code>
              {currentUser?.trialEndsAt && (
                <span className="ml-1 text-slate-400 font-mono">({currentUser.trialEndsAt})</span>
              )}
            </span>

            <button
              type="button"
              onClick={handleActivate}
              className="text-blue-400 hover:text-blue-300 underline font-medium"
            >
              Ativar Direto (1-Clique)
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl text-center py-2 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} Nexvoltora Gestão e Prestação de Serviços. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Dúvidas? Entre em contato com o suporte</span>
        </div>
      </footer>

      {/* Modal de Confirmação & Pagamento da Assinatura */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ativação da Assinatura</h3>
                  <p className="text-xs text-slate-400">R$ 26,99 / mês • Cobrança Mensal</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Benefícios */}
            <div className="space-y-2 mb-5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Desbloqueio instantâneo do sistema e todas as telas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sincronização contínua com banco de dados Firebase</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Suporte prioritário e novas funcionalidades</span>
              </div>
            </div>

            {/* Escolha da Forma de Pagamento */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Forma de Pagamento Preferida
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'pix'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>PIX Instantâneo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'credit_card'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Cartão de Crédito</span>
                </button>
              </div>
            </div>

            {/* Resumo do Pedido */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 mb-6 flex items-center justify-between text-xs">
              <span className="text-slate-300">Total a faturar hoje:</span>
              <span className="text-base font-extrabold text-emerald-400">R$ 26,99</span>
            </div>

            {/* Botão de confirmação destacado */}
            <button
              onClick={handleActivate}
              disabled={isActivating}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isActivating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando ativação...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirmar & Ativar Assinatura Mensal</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowCheckoutModal(false)}
              className="w-full mt-2.5 py-2 text-center text-xs text-slate-400 hover:text-white"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
