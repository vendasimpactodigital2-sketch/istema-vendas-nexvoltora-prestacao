import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  Save,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  QrCode,
  ShieldCheck,
  Database,
  Key,
  Copy,
  Check,
  ExternalLink,
  Code,
  RefreshCw,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  getSupabase,
  SUPABASE_SQL_SCHEMA,
} from '../../lib/supabaseClient';

export const SettingsView: React.FC = () => {
  const {
    company,
    updateCompany,
    resetToDemoData,
    currentUser,
    renewTrial15Days,
    activateSubscription,
    subscriptionInfo,
    setActiveTab,
    expiringClientsCount,
  } = useApp();

  const userRole = (currentUser?.role || '').toString().toLowerCase().trim();
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const isMasterUser =
    userRole === 'master' ||
    userRole === 'admin' ||
    userRole === 'administrador' ||
    userEmail === 'vendas.impactodigital2@gmail.com';

  const [isRenewingTrial, setIsRenewingTrial] = useState(false);
  const [isActivatingDirect, setIsActivatingDirect] = useState(false);

  const [formData, setFormData] = useState({
    trade_name: company.trade_name,
    legal_name: company.legal_name,
    cnpj: company.cnpj,
    phone: company.phone,
    whatsapp: company.whatsapp,
    email: company.email,
    address: company.address,
    number: company.number,
    neighborhood: company.neighborhood,
    city: company.city,
    state: company.state,
    zip_code: company.zip_code,
    pix_key: company.pix_key,
    logo_url: company.logo_url,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Supabase Configuration State
  const initialSupabaseConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialSupabaseConfig.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialSupabaseConfig.anonKey || '');
  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Logo preset suggestions for construction & services
  const logoPresets = [
    { label: 'OZI Engenharia (Azul Moderno)', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f8?w=120&auto=format&fit=crop&q=80' },
    { label: 'OZI Reformas (Minimalista)', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=120&auto=format&fit=crop&q=80' },
    { label: 'OZI Construções (Premium)', url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=120&auto=format&fit=crop&q=80' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupabaseStatus('testing');
    setSupabaseStatusMsg('Testando conexão com Supabase...');

    const trimmedUrl = supabaseUrl.trim();
    const trimmedKey = supabaseAnonKey.trim();

    saveSupabaseConfig({
      url: trimmedUrl,
      anonKey: trimmedKey,
      enabled: Boolean(trimmedUrl && trimmedKey),
    });

    try {
      const client = getSupabase();
      if (!client) {
        throw new Error('Preencha a URL e a Chave Anon para conectar.');
      }

      // Test query
      const { error } = await client.from('companies').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        if (error.message?.includes('relation "public.companies" does not exist') || error.code === '42P01') {
          setSupabaseStatus('success');
          setSupabaseStatusMsg('Conectado ao Supabase com sucesso! Observação: execute o script SQL para criar as tabelas.');
          return;
        }
        throw error;
      }

      setSupabaseStatus('success');
      setSupabaseStatusMsg('Conexão estabelecida com sucesso com o Supabase!');
    } catch (err: any) {
      console.warn('Erro ao testar conexão Supabase:', err);
      setSupabaseStatus('error');
      setSupabaseStatusMsg(err?.message || 'Falha ao conectar ao Supabase. Verifique a URL e a Chave Anon.');
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Configurações do Sistema
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cadastre os dados da empresa, logotipo oficial, chave PIX e integração com banco de dados Supabase
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            Configurações salvas com sucesso!
          </div>
        )}
      </div>

      {/* INTEGRAÇÃO COM SUPABASE (BANCO DE DADOS & AUTENTICAÇÃO) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Integração Supabase (Banco de Dados & Auth)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  ATIVO
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                O Firebase foi 100% substituído pelo Supabase para autenticação e persistência de dados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <Code className="w-4 h-4" />
            Ver Script SQL do Supabase
          </button>
        </div>

        <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                SUPABASE_URL
              </label>
              <div className="relative">
                <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://seu-projeto.supabase.co"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 shadow-2xs font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                SUPABASE_ANON_KEY
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 shadow-2xs font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {supabaseStatusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                supabaseStatus === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : supabaseStatus === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
              }`}
            >
              {supabaseStatus === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {supabaseStatus === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
              {supabaseStatus === 'testing' && <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />}
              <span>{supabaseStatusMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={supabaseStatus === 'testing'}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${supabaseStatus === 'testing' ? 'animate-spin' : ''}`} />
              Testar e Salvar Conexão Supabase
            </button>
          </div>
        </form>
      </div>

      {/* CONTROLE DE ASSINATURA E TESTE GRÁTIS (15 DIAS) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Assinatura & Período de Teste Grátis (15 Dias)
              </h2>
              <p className="text-xs text-slate-500">
                Gerencie o período de avaliação de 15 dias e a sincronização com Asaas / Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                (currentUser?.subscription_status || currentUser?.subscriptionStatus) === 'active'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Status: {((currentUser?.subscription_status || currentUser?.subscriptionStatus) === 'active') ? 'Assinatura Ativa' : 'Teste Grátis (15 Dias)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 block mb-1">Conta Conectada</span>
            <p className="font-bold text-slate-900 dark:text-white truncate">
              {currentUser?.name || 'Administrador'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || 'email@sistema.com'}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 block mb-1">Início do Período</span>
            <p className="font-bold text-slate-900 dark:text-white">
              {currentUser?.trial_start ? new Date(currentUser.trial_start).toLocaleDateString('pt-BR') : 'Hoje'}
            </p>
            <p className="text-[11px] text-slate-400">
              {currentUser?.trial_start ? new Date(currentUser.trial_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '00:00'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-500 block mb-1">Término do Período (15 Dias)</span>
            <p className="font-bold text-slate-900 dark:text-white">
              {currentUser?.trial_end
                ? new Date(currentUser.trial_end).toLocaleDateString('pt-BR')
                : (currentUser?.trialEndsAt || 'Válido')}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {subscriptionInfo.daysRemaining !== undefined
                ? `${subscriptionInfo.daysRemaining} dias restantes`
                : '15 dias de acesso liberado'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500 max-w-md">
            Enquanto a data atual for anterior à data de término do trial, o acesso é normal e total a todas as funcionalidades do sistema.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isRenewingTrial}
              onClick={async () => {
                setIsRenewingTrial(true);
                try {
                  await renewTrial15Days();
                } finally {
                  setIsRenewingTrial(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRenewingTrial ? 'animate-spin' : ''}`} />
              <span>{isRenewingTrial ? 'Renovando...' : 'Renovar 15 Dias a partir de Hoje'}</span>
            </button>

            <button
              type="button"
              disabled={isActivatingDirect}
              onClick={async () => {
                setIsActivatingDirect(true);
                try {
                  await activateSubscription();
                } finally {
                  setIsActivatingDirect(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Ativar Assinatura Imediata</span>
            </button>
          </div>
        </div>

        {/* Banner de Acesso ao Painel Administrativo Master */}
        {isMasterUser && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Painel Administrativo Master de Assinantes
                </p>
                <p className="text-[11px] text-slate-500">
                  {expiringClientsCount > 0
                    ? `Atenção: ${expiringClientsCount} cliente(s) com teste prestes a vencer nos próximos 5 dias!`
                    : 'Monitore prazos de teste, vencimentos, envie avisos por WhatsApp e estenda prazos (+5, +15 dias).'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('master-admin')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span>Abrir Painel Master</span>
              {expiringClientsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 text-white font-extrabold">
                  {expiringClientsCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* LOGOTIPO DA EMPRESA */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Logotipo da Empresa
              </h2>
              <p className="text-xs text-slate-500">
                A logo cadastrada aparecerá automaticamente no Menu, Dashboard, Orçamentos, PDFs e Tela de Login
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-2 bg-slate-50 dark:bg-slate-800/50 relative group shrink-0 overflow-hidden">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/nexvoltora.png';
                  }}
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  URL da Imagem da Logo
                </label>
                <input
                  type="text"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://exemplo.com/sua-logo.png ou /nexvoltora.png"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 text-xs shadow-2xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Enviar arquivo do computador
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logo_url: '/nexvoltora.png' })}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Usar Logo Padrão Nexvoltora
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DADOS BÁSICOS & FISCAIS */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Identificação & CNPJ
              </h2>
              <p className="text-xs text-slate-500">
                Informações impressas no cabeçalho das propostas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Nome Fantasia *
              </label>
              <input
                type="text"
                required
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                placeholder="Ex: Nexvoltora Engenharia e Reformas"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Razão Social
              </label>
              <input
                type="text"
                value={formData.legal_name || ''}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                placeholder="Ex: Nexvoltora Soluções Prediais Ltda"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                CNPJ ou CPF
              </label>
              <input
                type="text"
                value={formData.cnpj || ''}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Chave PIX Oficial
              </label>
              <div className="relative">
                <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.pix_key || ''}
                  onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                  placeholder="CNPJ, E-mail, Celular ou Chave Aleatória"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CONTATOS */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Phone className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Canais de Contato
              </h2>
              <p className="text-xs text-slate-500">
                Telefone, WhatsApp e e-mail comercial
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Telefone Fixo
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 3456-7890"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                WhatsApp Comercial
              </label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                E-mail Comercial
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@nexvoltora.com.br"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* ENDEREÇO */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Endereço da Sede
              </h2>
              <p className="text-xs text-slate-500">
                Localização da empresa para inclusão em propostas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="sm:col-span-3">
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Logradouro
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Av. Paulista"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Número e Sala
              </label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                placeholder="1842, Conj 142"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Bairro
              </label>
              <input
                type="text"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                placeholder="Bela Vista"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Cidade
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="São Paulo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                Estado (UF)
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="SP"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                CEP
              </label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="01310-200"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar dados de demonstração
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>

      {/* Modal do Script SQL Supabase */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-white">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Script SQL para o Supabase
                  </h3>
                  <p className="text-xs text-slate-400">
                    Copie e cole este script no SQL Editor do seu dashboard Supabase
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedSql ? 'Copiado!' : 'Copiar Script SQL'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-950/80 font-mono text-[11px] text-slate-300 leading-relaxed space-y-2">
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 text-xs">
                💡 <strong>Instruções rápidas:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1 text-[11px] text-emerald-200">
                  <li>Acesse o painel do seu projeto no Supabase (<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold">supabase.com/dashboard</a>).</li>
                  <li>Clique no menu lateral esquerdo em <strong>SQL Editor</strong>.</li>
                  <li>Clique em <strong>New query</strong>, cole o script abaixo e clique em <strong>Run</strong> (ou aperte Ctrl + Enter).</li>
                  <li>Pronto! Todas as tabelas, índices e triggers de autenticação serão criados.</li>
                </ol>
              </div>

              <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Restaurar Dados */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Restaurar Demonstração
                </h3>
                <p className="text-xs text-slate-500">
                  Substituirá os dados atuais
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Deseja restaurar os dados originais de demonstração de clientes, orçamentos, obras e agendamentos?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToDemoData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Sim, Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
