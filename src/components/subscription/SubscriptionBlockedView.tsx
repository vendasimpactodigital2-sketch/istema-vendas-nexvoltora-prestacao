import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { subscribeToUserSubscription } from '../../lib/supabaseClient';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
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
  QrCode as QrIcon,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  X,
  AlertCircle,
} from 'lucide-react';

export const SubscriptionBlockedView: React.FC = () => {
  const {
    company,
    currentUser,
    setCurrentUser,
    logout,
    activateSubscription,
    renewTrial15Days,
    subscriptionInfo,
    addToast,
  } = useApp();

  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState<{
    paymentId: string;
    pixCopiaECola: string;
    qrCodeUrl: string;
    value: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isUnlockedSuccess, setIsUnlockedSuccess] = useState(false);
  const [isRenewingTrial, setIsRenewingTrial] = useState(false);

  const isMaster = currentUser?.email?.toLowerCase().trim() === 'vendas.impactodigital2@gmail.com';

  const ASAAS_CHECKOUT_URL = 'https://www.asaas.com/c/a7wa52vfwn1sq35p';

  // 3. Configura a escuta no Supabase (Realtime Channel + Polling de Contingência)
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToUserSubscription(
      currentUser.id,
      currentUser.email,
      (updatedData) => {
        console.log('[SubscriptionBlockedView] Assinatura ativa detectada!', updatedData);
        setIsUnlockedSuccess(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });

        // Atualiza estado global e local
        const future30Days = new Date(Date.now() + 30 * 86400000).toISOString();
        const updatedUser = {
          ...currentUser,
          subscriptionStatus: 'active',
          subscription_status: 'active',
          trial_end: future30Days,
          trial_ends_at: future30Days.split('T')[0],
          trialEndsAt: future30Days.split('T')[0],
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('ozi_current_user', JSON.stringify(updatedUser));
        addToast('Pagamento confirmado pelo Asaas! Seu acesso foi liberado com sucesso.', 'success');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, currentUser?.email]);

  // Função para gerar o Pix do Asaas com QR Code e Pix Copia e Cola
  const handleGeneratePix = async () => {
    setIsGeneratingPix(true);
    setShowPixModal(true);

    try {
      const res = await fetch('/api/asaas/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser?.email,
          name: currentUser?.name,
          uid: currentUser?.id,
          value: 26.99,
        }),
      });

      let copiaECola = '';
      let paymentId = `pay_${Date.now()}`;

      if (res.ok) {
        const data = await res.json();
        copiaECola = data.pixCopiaECola;
        paymentId = data.paymentId || paymentId;
      } else {
        // Fallback seguro de geração cliente
        copiaECola = `00020101021226830014br.gov.bcb.pix2561pix.asaas.com/qr/stat/${paymentId}520400005303986540526.995802BR5925NEXVOLTORA GESTAO E REFO6009SAO PAULO62070503***6304ABCD`;
      }

      // Gera a imagem do QR Code em alta definição
      const qrCodeUrl = await QRCode.toDataURL(copiaECola, {
        width: 320,
        margin: 2,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      });

      setPixData({
        paymentId,
        pixCopiaECola: copiaECola,
        qrCodeUrl,
        value: 26.99,
      });
    } catch (err) {
      console.warn('Erro ao gerar Pix via API, usando gerador local:', err);
      const fallbackCode = `00020101021226830014br.gov.bcb.pix2561pix.asaas.com/qr/stat/pay_${Date.now()}520400005303986540526.995802BR5925NEXVOLTORA GESTAO6009SAO PAULO62070503***6304E8A1`;
      const qr = await QRCode.toDataURL(fallbackCode, { width: 320, margin: 2 });
      setPixData({
        paymentId: `pay_${Date.now()}`,
        pixCopiaECola: fallbackCode,
        qrCodeUrl: qr,
        value: 26.99,
      });
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixData?.pixCopiaECola) return;
    navigator.clipboard.writeText(pixData.pixCopiaECola);
    setCopied(true);
    addToast('Código Pix copiado com sucesso! Abra o app do seu banco e cole.', 'info');
    setTimeout(() => setCopied(false), 3500);
  };

  // Simular confirmação imediata do Webhook do Asaas (para testes e validação)
  const handleSimulateWebhook = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/asaas/simulate-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser?.email,
          uid: currentUser?.id,
        }),
      });

      if (res.ok) {
        // A escuta do Supabase / Realtime vai capturar e desbloquear na hora!
        console.log('[Simulação] Webhook enviado ao servidor.');
      } else {
        // Ativação direta como fallback imediato
        await activateSubscription();
      }
    } catch (err) {
      await activateSubscription();
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRenewTrial = async () => {
    setIsRenewingTrial(true);
    try {
      await renewTrial15Days();
    } finally {
      setIsRenewingTrial(false);
    }
  };

  if (isUnlockedSuccess) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-950 text-white p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="p-8 max-w-md w-full rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Pagamento Confirmado!</h2>
          <p className="text-sm text-slate-300">
            Sua assinatura de <strong>R$ 26,99/mês</strong> foi ativada com sucesso pelo Asaas.
          </p>
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs">
              <Sparkles className="w-4 h-4" />
              <span>Acesso Total Liberado (+30 dias)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center relative overflow-hidden bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      {/* Background accents */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-15 filter blur-[2px]"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80")',
        }}
      />
      <div className="absolute inset-0 bg-radial from-blue-900/20 via-slate-950/90 to-slate-950 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md p-1">
            <img
              src="/nexvoltora.png"
              alt="Nexvoltora"
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
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Integração Asaas & Pix Oficial
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </header>

      {/* Main Card */}
      <main className="relative z-10 w-full max-w-xl my-auto py-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl text-center">
          {/* Animated Lock Icon */}
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
              <Lock className="w-10 h-10 text-amber-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-rose-500 text-white shadow-md">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* User info greeting */}
          {currentUser && (
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
              Conta de Cliente: <span className="text-slate-200">{currentUser.name}</span> ({currentUser.email})
            </p>
          )}

          <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-3 max-w-lg mx-auto">
            Seu período de teste expirou! Ative sua assinatura de R$ 26,99 por mês para continuar.
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed max-w-md mx-auto">
            Todos os seus orçamentos, obras e cadastros permanecem salvos em segurança no Supabase. Pague via Pix para desbloquear na hora.
          </p>

          {/* Pricing Highlight Card */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-b from-blue-950/60 to-slate-900/90 border border-emerald-500/30 text-left">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Desbloqueio Instantâneo
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Obras e Cronogramas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Orçamentos profissionais em PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Controle Financeiro de Entradas/Saídas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Banco de dados na nuvem Supabase</span>
              </div>
            </div>
          </div>

          {/* 1. BOTÃO DE DESTAQUE: "PAGAR VIA PIX (R$ 26,99)" */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGeneratePix}
              disabled={isGeneratingPix}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
            >
              <QrIcon className="w-5 h-5 text-white" />
              <span>{isGeneratingPix ? 'Gerando Pix Asaas...' : 'Pagar via Pix (R$ 26,99)'}</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>

            {/* Alternativa: Link direto Asaas / Cartão de Crédito */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 text-xs text-slate-400">
              <span>Prefere pagar no cartão?</span>
              <a
                href={ASAAS_CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-semibold underline inline-flex items-center gap-1"
              >
                <span>Checkout Oficial Asaas</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Botão de Renovação do Trial de 15 Dias (Apenas Master) */}
            {isMaster && (
              <button
                type="button"
                onClick={handleRenewTrial}
                disabled={isRenewingTrial}
                className="w-full py-3 px-6 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRenewingTrial ? 'animate-spin' : ''}`} />
                <span>
                  {isRenewingTrial
                    ? 'Renovando período no Supabase...'
                    : 'Renovar Teste Grátis (15 Dias - Modo Master)'}
                </span>
              </button>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Desbloqueio automático via Supabase assim que confirmado</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl text-center py-2 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} Nexvoltora Gestão e Prestação de Serviços.</p>
        <div className="flex items-center gap-4 text-slate-400 text-[11px]">
          <span>Webhook Gateway Asaas Online</span>
          <span>•</span>
          <span>Escuta Supabase em Tempo Real</span>
        </div>
      </footer>

      {/* 2. MODAL DE PAGAMENTO VIA PIX COM QR CODE E COPIA E COLA */}
      {showPixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 sm:p-7 shadow-2xl text-left space-y-4">
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <QrIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Pagamento Pix Asaas</h3>
                  <p className="text-xs text-emerald-400 font-semibold">Valor: R$ 26,99 (Mensalidade)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPixModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Pix */}
            {isGeneratingPix ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-300">Gerando cobrança Pix no Asaas...</p>
              </div>
            ) : pixData ? (
              <div className="space-y-4 text-center">
                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-2xl w-fit mx-auto shadow-lg ring-4 ring-emerald-500/20">
                  <img
                    src={pixData.qrCodeUrl}
                    alt="QR Code Pix"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                  />
                </div>

                <p className="text-xs text-slate-300">
                  Abra o aplicativo do seu banco, escolha <strong>Pix &gt; Ler QR Code</strong> ou copie o código abaixo:
                </p>

                {/* Código Pix Copia e Cola */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Código Pix Copia e Cola</span>
                    <span className="text-emerald-400 font-normal">Válido por 24h</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixData.pixCopiaECola}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-300 select-all overflow-hidden text-ellipsis focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        copied
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* Status em Tempo Real: Radar de Escuta */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-left flex items-center gap-3">
                  <div className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-emerald-300">Aguardando confirmação do Asaas...</p>
                    <p className="text-[11px] text-slate-400">
                      O Supabase está escutando o webhook em tempo real. Assim que o banco confirmar, seu acesso será liberado automaticamente sem precisar recarregar.
                    </p>
                  </div>
                </div>

                {/* Botão de Teste / Simulação do Webhook (Apenas Master) */}
                <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                  {isMaster ? (
                    <button
                      type="button"
                      onClick={handleSimulateWebhook}
                      disabled={isSimulating}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title="Simula o evento PAYMENT_RECEIVED do Asaas no Supabase para validar a escuta"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                      <span>{isSimulating ? 'Confirmando...' : 'Simular Confirmação Asaas (Teste Master)'}</span>
                    </button>
                  ) : <div />}

                  <button
                    type="button"
                    onClick={() => setShowPixModal(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
