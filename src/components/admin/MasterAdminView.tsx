import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import { calculateExpirationMetrics } from '../../lib/supabaseClient';
import { formatPhone } from '../../lib/utils';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Users,
  Search,
  RefreshCw,
  Plus,
  MessageCircle,
  Zap,
  Calendar,
  Sparkles,
  ExternalLink,
  Phone,
  Mail,
  MoreVertical,
  Check,
  X,
  Lock,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const MasterAdminView: React.FC = () => {
  const {
    users,
    currentUser,
    extendUserSubscription,
    activateUserSubscriptionAdmin,
    blockUserSubscriptionAdmin,
    refreshUsersFromSupabase,
    addUser,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'expiring5' | 'expired' | 'active' | 'trial'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // EXCLUSIVIDADE ABSOLUTA DO MASTER
  const isMaster = currentUser?.email?.toLowerCase().trim() === 'vendas.impactodigital2@gmail.com';
  if (!isMaster) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 my-8">
        <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Acesso Exclusivo do Usuário Master</h2>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          Esta área é de acesso restrito e confidencial, exclusiva para a conta master do sistema.
        </p>
      </div>
    );
  }

  // WhatsApp Message Customization Modal
  const [whatsappModalUser, setWhatsappModalUser] = useState<{ user: User; message: string; phone: string } | null>(null);

  // New Client Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('ADMINISTRADOR');
  const [newInitialStatus, setNewInitialStatus] = useState<'trial' | 'active'>('trial');

  // Calculate metrics for each user
  const enrichedUsers = useMemo(() => {
    return users.map((u) => {
      const metrics = calculateExpirationMetrics(u);
      return {
        user: u,
        metrics,
      };
    });
  }, [users]);

  // Counts for cards
  const stats = useMemo(() => {
    let expiring5Count = 0;
    let expiredCount = 0;
    let activeCount = 0;
    let trialCount = 0;

    enrichedUsers.forEach(({ metrics }) => {
      if (metrics.status === 'active') {
        activeCount++;
      } else if (metrics.isExpired) {
        expiredCount++;
      } else {
        trialCount++;
      }

      // Prestes a vencer (≤ 5 dias)
      if (metrics.isExpiringSoon && !metrics.isExpired && metrics.status !== 'active') {
        expiring5Count++;
      }
    });

    return {
      total: enrichedUsers.length,
      expiring5: expiring5Count,
      expired: expiredCount,
      active: activeCount,
      trial: trialCount,
    };
  }, [enrichedUsers]);

  // Filtered list
  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return enrichedUsers.filter(({ user, metrics }) => {
      // Text search
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.phone && user.phone.includes(q)) ||
        (user.whatsapp && user.whatsapp.includes(q));

      if (!matchesSearch) return false;

      // Category filter
      if (filterMode === 'expiring5') {
        return metrics.isExpiringSoon && !metrics.isExpired && metrics.status !== 'active';
      }
      if (filterMode === 'expired') {
        return metrics.isExpired;
      }
      if (filterMode === 'active') {
        return metrics.status === 'active';
      }
      if (filterMode === 'trial') {
        return metrics.status === 'trial' && !metrics.isExpired;
      }

      return true;
    });
  }, [enrichedUsers, searchTerm, filterMode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUsersFromSupabase();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExtendDays = async (userId: string, days: number) => {
    setProcessingId(userId);
    try {
      await extendUserSubscription(userId, days);
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (userId: string) => {
    setProcessingId(userId);
    try {
      await activateUserSubscriptionAdmin(userId);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBlock = async (userId: string) => {
    setProcessingId(userId);
    try {
      await blockUserSubscriptionAdmin(userId);
    } finally {
      setProcessingId(null);
    }
  };

  // Open WhatsApp with pre-filled message
  const handleOpenWhatsApp = (user: User) => {
    const metrics = calculateExpirationMetrics(user);
    const cleanPhone = (user.whatsapp || user.phone || '').replace(/\D/g, '');
    const clientFirstName = user.name.split(' ')[0] || 'Cliente';

    let urgencyText = 'nos próximos dias';
    if (metrics.isExpired) {
      urgencyText = 'já expirou';
    } else if (metrics.daysRemaining <= 1) {
      urgencyText = 'expira hoje / amanhã';
    } else if (metrics.daysRemaining <= 5) {
      urgencyText = `expira em ${metrics.daysRemaining} dias`;
    }

    const defaultMsg = `Olá, ${clientFirstName}! Sou da equipe de suporte do Nexvoltora Gestão. Notamos que o seu período de teste do sistema ${urgencyText}. Gostaria de renovar seu acesso ou ativar a assinatura mensal ilimitada por apenas R$ 26,99/mês? Conte conosco para qualquer dúvida!`;

    setWhatsappModalUser({
      user,
      phone: cleanPhone || '11987654321',
      message: defaultMsg,
    });
  };

  const sendWhatsAppDirect = (phone: string, msg: string) => {
    const targetPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setWhatsappModalUser(null);
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const now = new Date();
    const future15Days = new Date(now.getTime() + 15 * 86400000).toISOString();
    const future30Days = new Date(now.getTime() + 30 * 86400000).toISOString();

    const created = addUser({
      company_id: 'comp_ozi_01',
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      phone: newPhone.trim() || '(11) 98765-4321',
      whatsapp: newPhone.trim() || '(11) 98765-4321',
      role: newRole,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      active: true,
      subscriptionStatus: newInitialStatus,
      subscription_status: newInitialStatus,
      trial_start: now.toISOString(),
      trial_end: newInitialStatus === 'active' ? future30Days : future15Days,
      trialEndsAt: (newInitialStatus === 'active' ? future30Days : future15Days).split('T')[0],
      trial_ends_at: (newInitialStatus === 'active' ? future30Days : future15Days).split('T')[0],
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
              Ambiente Master Admin
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Painel Administrativo Master
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
            Alerta e monitorização em tempo real de clientes a expirar nos próximos 5 dias, gestão de assinaturas e desbloqueio de acessos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-all border border-white/10 shadow-xs cursor-pointer disabled:opacity-50"
            title="Recarregar clientes do Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Atualizando...' : 'Sincronizar Supabase'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* 1. CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD DESTACADO: PRESTES A VENCER (≤ 5 DIAS) */}
        <div
          onClick={() => setFilterMode(filterMode === 'expiring5' ? 'all' : 'expiring5')}
          className={`cursor-pointer transition-all p-5 rounded-3xl border-2 relative overflow-hidden group ${
            filterMode === 'expiring5'
              ? 'ring-4 ring-amber-500/30 border-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow-lg'
              : 'border-amber-400/80 dark:border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white dark:to-slate-900 shadow-md hover:border-amber-500 hover:shadow-lg'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-xs flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Alerta Crítico
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
              ≤ 5 dias
            </span>
          </div>

          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Prestes a Vencer (≤ 5 dias)
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {stats.expiring5}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.expiring5 === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
            <span>{filterMode === 'expiring5' ? 'Filtro Ativado ✓' : 'Clique para filtrar clientes'}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD: VENCIDOS / BLOQUEADOS */}
        <div
          onClick={() => setFilterMode(filterMode === 'expired' ? 'all' : 'expired')}
          className={`cursor-pointer transition-all p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-xs hover:shadow-md ${
            filterMode === 'expired'
              ? 'border-red-500 ring-2 ring-red-500/30'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <AlertOctagon className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
              Bloqueados
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Expirados / Bloqueados</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-red-600 dark:text-red-400 tracking-tight">
              {stats.expired}
            </span>
            <span className="text-xs text-slate-400 font-medium">contas</span>
          </div>
          <p className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 truncate">
            Acesso bloqueado pelo sistema
          </p>
        </div>

        {/* CARD: ASSINATURAS ATIVAS */}
        <div
          onClick={() => setFilterMode(filterMode === 'active' ? 'all' : 'active')}
          className={`cursor-pointer transition-all p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-xs hover:shadow-md ${
            filterMode === 'active'
              ? 'border-emerald-500 ring-2 ring-emerald-500/30'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              R$ 26,99/mês
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Assinaturas Ativas</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {stats.active}
            </span>
            <span className="text-xs text-slate-400 font-medium">assinantes</span>
          </div>
          <p className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-emerald-600 dark:text-emerald-400 truncate font-medium">
            Pagamentos confirmados Asaas
          </p>
        </div>

        {/* CARD: TOTAL DE CLIENTES */}
        <div
          onClick={() => setFilterMode('all')}
          className={`cursor-pointer transition-all p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-xs hover:shadow-md ${
            filterMode === 'all'
              ? 'border-blue-500 ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Base Total
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Total de Clientes / Usuários</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.total}
            </span>
            <span className="text-xs text-slate-400 font-medium">registros</span>
          </div>
          <p className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 truncate">
            {stats.trial} em teste de 15 dias
          </p>
        </div>
      </div>

      {/* 3. BARRA DE PESQUISA & FILTRO RÁPIDO */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, e-mail, telefone ou empresa..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Buttons (FILTRO RÁPIDO JUNTO À BARRA DE PESQUISA) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* BOTÃO DE FILTRO RÁPIDO DESTACADO: PRESTES A VENCER (≤ 5 DIAS) */}
          <button
            type="button"
            onClick={() => setFilterMode(filterMode === 'expiring5' ? 'all' : 'expiring5')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              filterMode === 'expiring5'
                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-md'
                : 'bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Prestes a Vencer (≤ 5 dias)</span>
            <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              filterMode === 'expiring5'
                ? 'bg-slate-950 text-white'
                : 'bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100'
            }`}>
              {stats.expiring5}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Todos ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('trial')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterMode === 'trial'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Em Teste ({stats.trial})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('expired')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterMode === 'expired'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            🚨 Expirados ({stats.expired})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('active')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterMode === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            ✓ Ativos ({stats.active})
          </button>
        </div>
      </div>

      {/* 2. TABELA DE CLIENTES COM INDICADOR VISUAL DE VENCIMENTO E AÇÕES */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-5">Cliente / Usuário</th>
                <th className="py-3.5 px-4">Contato</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Término Previsto</th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Vencimento / Tempo Restante</span>
                  </div>
                </th>
                <th className="py-3.5 px-5 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm">Nenhum cliente encontrado</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {filterMode === 'expiring5'
                        ? 'Nenhum cliente com bloqueio previsto para os próximos 5 dias.'
                        : 'Tente ajustar sua busca ou filtros.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(({ user, metrics }) => {
                  const isProcessing = processingId === user.id;
                  const isCurrentLogged = currentUser?.id === user.id;

                  // Render visual indicator badge based on requirements:
                  // 1) Se já estiver expirado: tag vermelha "Expirado"
                  // 2) Se faltar 1 dia ou menos: tag/badge vermelha de urgência (ex.: "🚨 Expira hoje / amanhã")
                  // 3) Se faltarem entre 2 e 5 dias: tag/badge amarela de alerta (ex.: "⚠️ Restam X dias")
                  // 4) Outros: tag normal ou ativa
                  let badgeElement: React.ReactNode = null;

                  if (metrics.status === 'active') {
                    badgeElement = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>✓ Ativo ({metrics.daysRemaining}d)</span>
                      </span>
                    );
                  } else if (metrics.isExpired) {
                    badgeElement = (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 shadow-2xs animate-in fade-in">
                        <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                        <span>🚨 Expirado</span>
                      </span>
                    );
                  } else if (metrics.isUrgent) {
                    badgeElement = (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-2 border-red-400 dark:border-red-600 shadow-xs animate-pulse">
                        <span>{metrics.label}</span>
                      </span>
                    );
                  } else if (metrics.badgeType === 'warning') {
                    badgeElement = (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-600 shadow-2xs">
                        <span>{metrics.label}</span>
                      </span>
                    );
                  } else {
                    badgeElement = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{metrics.label}</span>
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        metrics.isExpiringSoon && !metrics.isExpired && metrics.status !== 'active'
                          ? 'bg-amber-50/40 dark:bg-amber-950/10'
                          : ''
                      } ${metrics.isExpired ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}
                    >
                      {/* Cliente / Usuário */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                            alt={user.name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {user.name}
                              </p>
                              {isCurrentLogged && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                  Você
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contato */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">
                            {user.whatsapp || user.phone || 'Sem telefone'}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {user.role?.toLowerCase() || 'usuário'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {metrics.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                            Assinatura Ativa
                          </span>
                        ) : metrics.isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">
                            Expirado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                            Teste (15 Dias)
                          </span>
                        )}
                      </td>

                      {/* Término Previsto */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                        {user.trial_end ? (
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              {new Date(user.trial_end).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(user.trial_end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ) : user.trialEndsAt ? (
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {user.trialEndsAt}
                          </p>
                        ) : (
                          <span className="text-slate-400">Padrão 15d</span>
                        )}
                      </td>

                      {/* VENCIMENTO / TEMPO RESTANTE (COLUNA REQUERIDA) */}
                      <td className="py-3.5 px-4">
                        {badgeElement}
                      </td>

                      {/* AÇÕES RÁPIDAS (COLUNA REQUERIDA) */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* BOTÃO DE WHATSAPP (Aviso de renovação) */}
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(user)}
                            title="Enviar aviso de renovação por WhatsApp"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4 fill-emerald-500/20" />
                          </button>

                          {/* BOTÃO +5 DIAS */}
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleExtendDays(user.id, 5)}
                            title="Estender prazo em +5 dias no Supabase"
                            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800/60 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            +5d
                          </button>

                          {/* BOTÃO +15 DIAS */}
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleExtendDays(user.id, 15)}
                            title="Estender prazo em +15 dias (Renovar trial)"
                            className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800/60 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            +15d
                          </button>

                          {/* BOTÃO ATIVAR MANUALMENTE */}
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleActivate(user.id)}
                            title="Ativar assinatura manualmente (+30 dias / ativa)"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3 fill-white" />
                            <span>Ativar</span>
                          </button>

                          {/* BLOQUEAR OU OPÇÕES */}
                          {!metrics.isExpired && metrics.status !== 'active' && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleBlock(user.id)}
                              title="Bloquear imediatamente (Expirar)"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            Exibindo <strong>{filteredUsers.length}</strong> de <strong>{users.length}</strong> clientes registrados.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              ≤ 1 dia / Expirado (Crítico)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              2 a 5 dias (Atenção)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Assinatura Ativa
            </span>
          </div>
        </div>
      </div>

      {/* WHATSAPP MESSAGE PREVIEW & SEND MODAL */}
      {whatsappModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950">
                  <MessageCircle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Enviar Aviso pelo WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cliente: <strong>{whatsappModalUser.user.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModalUser(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Número do WhatsApp (DDD + Número)
                </label>
                <input
                  type="text"
                  value={whatsappModalUser.phone}
                  onChange={(e) =>
                    setWhatsappModalUser({ ...whatsappModalUser, phone: e.target.value })
                  }
                  placeholder="Ex: 11987654321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mensagem de Notificação de Assinatura
                </label>
                <textarea
                  rows={4}
                  value={whatsappModalUser.message}
                  onChange={(e) =>
                    setWhatsappModalUser({ ...whatsappModalUser, message: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWhatsappModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  sendWhatsAppDirect(whatsappModalUser.phone, whatsappModalUser.message)
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Abrir WhatsApp & Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR NOVO CLIENTE / ASSINANTE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Novo Assinante / Cliente SaaS
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cadastre uma conta na plataforma com trial de 15 dias
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Cliente / Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: João Eletricista ou ABC Reformas"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail de Acesso *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nível de Acesso
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="ORÇAMENTISTA">Orçamentista</option>
                    <option value="FUNCIONÁRIO">Funcionário</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={newInitialStatus}
                    onChange={(e) => setNewInitialStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="trial">Trial (15 Dias)</option>
                    <option value="active">Assinatura Ativa</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
