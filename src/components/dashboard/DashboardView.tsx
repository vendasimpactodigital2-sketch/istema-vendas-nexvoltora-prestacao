import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { Badge } from '../common/Badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  HardHat,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Briefcase,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatTime, formatDate } from '../../lib/utils';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    company,
    quotes,
    projects,
    appointments,
    financialEntries,
    financialExpenses,
    setActiveTab,
    openQuickAction,
  } = useApp();

  // Dynamic calculations
  const stats = useMemo(() => {
    const totalEntries = financialEntries
      .filter((e) => e.status === 'Recebido')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpenses = financialExpenses
      .filter((e) => e.status === 'Pago')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const netProfit = totalEntries - totalExpenses;
    const profitMargin = totalEntries > 0 ? ((netProfit / totalEntries) * 100).toFixed(1) : '0';

    const pendingReceivables = financialEntries
      .filter((e) => e.status === 'Pendente')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const overdueReceivables = financialEntries
      .filter((e) => e.status === 'Vencido')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Quotes
    const newQuotes = quotes.filter((q) => q.status === 'Novo').length;
    const sentQuotes = quotes.filter((q) => q.status === 'Enviado').length;
    const pendingQuotes = quotes.filter((q) => q.status === 'Aguardando resposta').length;
    const approvedQuotes = quotes.filter((q) => q.status === 'Aprovado');
    const rejectedQuotes = quotes.filter((q) => q.status === 'Recusado').length;
    const approvedTotalValue = approvedQuotes.reduce((acc, curr) => acc + curr.total, 0);
    const totalQuotesCount = quotes.length;
    const approvalRate = totalQuotesCount > 0 ? Math.round((approvedQuotes.length / totalQuotesCount) * 100) : 0;

    // Projects
    const ongoingProjects = projects.filter((p) => p.status === 'Em andamento').length;
    const scheduledProjects = projects.filter((p) => p.status === 'Agendada').length;
    const delayedProjects = projects.filter((p) => p.status === 'Atrasada').length;
    const completedProjects = projects.filter((p) => p.status === 'Concluída').length;

    // Today's appointments
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysAppointments = appointments.filter((a) => a.date === todayStr);

    return {
      totalEntries,
      totalExpenses,
      netProfit,
      profitMargin,
      pendingReceivables,
      overdueReceivables,
      newQuotes,
      sentQuotes,
      pendingQuotes,
      approvedCount: approvedQuotes.length,
      rejectedQuotes,
      approvedTotalValue,
      approvalRate,
      ongoingProjects,
      scheduledProjects,
      delayedProjects,
      completedProjects,
      todaysAppointments,
    };
  }, [quotes, projects, appointments, financialEntries, financialExpenses]);

  // Greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Painel Executivo • {company.trade_name}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <span>Função: {currentUser?.role || 'ADMINISTRADOR'}</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {greeting}, {currentUser?.name?.split(' ')[0] || 'Gestor'} 👋
            </h1>
            <p className="text-sm text-slate-300">
              Aqui está o resumo operacional e financeiro da sua empresa hoje. Suas equipes e obras estão sincronizadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openQuickAction('newQuote')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Criar Orçamento</span>
            </button>
            <button
              onClick={() => openQuickAction('newAppointment')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 transition-all flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Agendar Visita</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Main KPI Highlight Cards (Prompt requested: Faturamento, Gastos, Lucro, Obras em andamento, Orçamentos aguardando) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Faturamento do Mês"
          value={formatCurrency(stats.totalEntries)}
          subtitle="+14.2% vs mês anterior"
          icon={DollarSign}
          iconColor="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-950/40"
          trend={{ value: '+14.2%', positive: true }}
          onClick={() => setActiveTab('financial')}
        />

        <StatCard
          title="Gastos do Mês"
          value={formatCurrency(stats.totalExpenses)}
          subtitle="Materiais e equipe"
          icon={TrendingDown}
          iconColor="text-rose-600 dark:text-rose-400"
          bgColor="bg-rose-50 dark:bg-rose-950/40"
          onClick={() => setActiveTab('financial')}
        />

        <StatCard
          title="Lucro Líquido"
          value={formatCurrency(stats.netProfit)}
          subtitle={`Margem média: ${stats.profitMargin}%`}
          icon={TrendingUp}
          iconColor="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-950/40"
          trend={{ value: `${stats.profitMargin}%`, positive: true }}
          onClick={() => setActiveTab('financial')}
        />

        <StatCard
          title="Obras em Andamento"
          value={stats.ongoingProjects}
          subtitle={`${stats.scheduledProjects} agendadas p/ início`}
          icon={HardHat}
          iconColor="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-950/40"
          onClick={() => setActiveTab('projects')}
        />

        <StatCard
          title="Orçamentos Aguardando"
          value={stats.pendingQuotes}
          subtitle={`Taxa de aprovação: ${stats.approvalRate}%`}
          icon={FileText}
          iconColor="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-50 dark:bg-purple-950/40"
          onClick={() => setActiveTab('quotes')}
        />
      </div>

      {/* Grid: Agenda de Hoje + Visão Geral Operacional */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Agenda de Hoje */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Agenda e Visitas de Hoje
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compromissos, visitas técnicas e inícios de obras programados
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('appointments')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Ver agenda completa
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 mt-2">
            {stats.todaysAppointments.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                Nenhum agendamento para hoje. Clique em &quot;Agendar Visita&quot; para marcar novos clientes.
              </div>
            ) : (
              stats.todaysAppointments.map((app) => (
                <div
                  key={app.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-slate-50/70 dark:hover:bg-slate-800/30 px-3 -mx-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 shrink-0">
                      <Clock className="w-4 h-4 mb-0.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold">{formatTime(app.time)}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {app.service_type}
                        </span>
                        <Badge status={app.status} size="sm" />
                        {app.value !== undefined && app.value > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs border border-emerald-200/60 dark:border-emerald-800/40">
                            {formatCurrency(app.value)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Cliente: <span className="font-semibold">{app.client_name}</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Responsável: <span className="text-slate-700 dark:text-slate-200 font-medium">{app.responsible_name}</span> • {app.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <WhatsAppButton
                      phone={app.whatsapp || app.phone}
                      message={`Olá, ${app.client_name}. Estou confirmando nossa visita de orçamento agendada para hoje às ${app.time}.`}
                      size="sm"
                      label="WhatsApp"
                    />

                    <button
                      onClick={() => openQuickAction('newQuote', { clientName: app.client_name, phone: app.phone, address: app.address })}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Criar Orçamento
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Resumo Orçamentos e Obras */}
        <div className="space-y-6">
          {/* Status dos Orçamentos */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Status dos Orçamentos
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                Total: {quotes.length}
              </span>
            </div>

            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Aprovados
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {stats.approvedCount} ({formatCurrency(stats.approvedTotalValue)})
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Aguardando resposta
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {stats.pendingQuotes}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Enviados recentemente
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {stats.sentQuotes}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Recusados
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {stats.rejectedQuotes}
                </span>
              </div>

              {/* Approval progress bar */}
              <div className="pt-2">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                  <span>Taxa de Conversão</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {stats.approvalRate}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, stats.approvalRate))}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('quotes')}
              className="w-full mt-4 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
            >
              Gerenciar todos os orçamentos
            </button>
          </div>

          {/* Obras em Execução / Próximas Entregas */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Obras em Andamento
              </h2>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {stats.ongoingProjects} ativas
              </span>
            </div>

            <div className="space-y-4 pt-3">
              {projects.slice(0, 3).map((project) => (
                <div
                  key={project.id}
                  onClick={() => {
                    setActiveTab('projects');
                    openQuickAction('viewProject', project);
                  }}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {project.code} - {project.client_name}
                    </span>
                    <Badge status={project.status} size="sm" />
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      {project.progress}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span>Resp: {project.responsible_name}</span>
                    <span>Prazo: {formatDate(project.expected_completion_date)}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('projects')}
              className="w-full mt-4 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
            >
              Ver todas as obras
            </button>
          </div>
        </div>
      </div>

      {/* Financial Quick Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Contas a Receber
            </p>
            <p className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1">
              {formatCurrency(stats.pendingReceivables)}
            </p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
              Previsão de entrada de clientes
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-600 text-white">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
              Valores Vencidos / Atrasos
            </p>
            <p className="text-xl font-extrabold text-rose-900 dark:text-rose-200 mt-1">
              {formatCurrency(stats.overdueReceivables)}
            </p>
            <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5">
              Requer cobrança amigável
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-600 text-white">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-400 uppercase tracking-wider">
              Obras Concluídas no Ano
            </p>
            <p className="text-xl font-extrabold text-blue-900 dark:text-blue-200 mt-1">
              {stats.completedProjects} Obras
            </p>
            <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-0.5">
              100% de satisfação registrada
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-600 text-white">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
