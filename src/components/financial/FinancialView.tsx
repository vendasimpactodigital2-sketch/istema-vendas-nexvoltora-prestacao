import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { FinancialEntry, FinancialExpense, ExpenseCategory, PaymentMethod, PaymentStatus } from '../../types';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Building,
  HardHat,
  X,
  Upload,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDate, generateId } from '../../lib/utils';

export const FinancialView: React.FC = () => {
  const {
    financialEntries,
    financialExpenses,
    projects,
    clients,
    company,
    addFinancialEntry,
    addFinancialExpense,
    updateFinancialEntry,
    updateFinancialExpense,
    deleteFinancialEntry,
    deleteFinancialExpense,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'entries' | 'expenses' | 'receivables' | 'payables'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; isEntry: boolean; description: string; amount: number } | null>(null);

  // New Entry Form State
  const [entryForm, setEntryForm] = useState({
    client_name: '',
    project_id: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    payment_method: 'PIX' as PaymentMethod,
    status: 'Recebido' as PaymentStatus,
    notes: '',
  });

  // New Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'Material' as ExpenseCategory,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    project_id: '',
    payment_method: 'PIX' as PaymentMethod,
    status: 'Pago' as PaymentStatus,
    receipt_url: '',
  });

  // Calculate High-level KPIs
  const kpis = useMemo(() => {
    const receivedEntries = financialEntries.filter((e) => e.status === 'Recebido');
    const totalReceived = receivedEntries.reduce((acc, curr) => acc + curr.amount, 0);

    const paidExpenses = financialExpenses.filter((e) => e.status === 'Pago');
    const totalPaid = paidExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    const netProfit = totalReceived - totalPaid;
    const profitMargin = totalReceived > 0 ? ((netProfit / totalReceived) * 100).toFixed(1) : '0';

    const pendingReceivables = financialEntries
      .filter((e) => e.status === 'Pendente')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const pendingPayables = financialExpenses
      .filter((e) => e.status === 'Pendente')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      totalReceived,
      totalPaid,
      netProfit,
      profitMargin,
      pendingReceivables,
      pendingPayables,
    };
  }, [financialEntries, financialExpenses]);

  // Handle Entry submit
  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForm.description.trim() || entryForm.amount <= 0) return;

    addFinancialEntry({
      company_id: company.id,
      ...entryForm,
    });
    setIsEntryModalOpen(false);
  };

  // Handle Expense submit
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description.trim() || expenseForm.amount <= 0) return;

    addFinancialExpense({
      company_id: company.id,
      ...expenseForm,
    });
    setIsExpenseModalOpen(false);
  };

  // Filtered List
  const unifiedList = useMemo(() => {
    let list: Array<
      | (FinancialEntry & { type: 'entry' })
      | (FinancialExpense & { type: 'expense' })
    > = [];

    if (activeSubTab === 'all' || activeSubTab === 'entries') {
      list = list.concat(financialEntries.map((e) => ({ ...e, type: 'entry' as const })));
    }
    if (activeSubTab === 'all' || activeSubTab === 'expenses') {
      list = list.concat(financialExpenses.map((ex) => ({ ...ex, type: 'expense' as const })));
    }
    if (activeSubTab === 'receivables') {
      list = financialEntries.filter((e) => e.status === 'Pendente').map((e) => ({ ...e, type: 'entry' as const }));
    }
    if (activeSubTab === 'payables') {
      list = financialExpenses.filter((ex) => ex.status === 'Pendente').map((ex) => ({ ...ex, type: 'expense' as const }));
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const desc = item.description.toLowerCase();
        const client = 'client_name' in item && item.client_name ? item.client_name.toLowerCase() : '';
        const cat = 'category' in item && item.category ? item.category.toLowerCase() : '';
        return desc.includes(q) || client.includes(q) || cat.includes(q);
      });
    }

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [financialEntries, financialExpenses, activeSubTab, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Gestão Financeira e Fluxo de Caixa
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Controle de entradas, despesas operacionais por obra, contas a pagar e a receber
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEntryForm({
                client_name: clients[0]?.name || '',
                project_id: projects[0]?.id || '',
                description: '',
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
                payment_method: 'PIX',
                status: 'Recebido',
                notes: '',
              });
              setIsEntryModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Entrada</span>
          </button>

          <button
            onClick={() => {
              setExpenseForm({
                description: '',
                category: 'Material',
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                project_id: projects[0]?.id || '',
                payment_method: 'PIX',
                status: 'Pago',
                receipt_url: '',
              });
              setIsExpenseModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Gasto</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Recebido (Entradas)"
          value={formatCurrency(kpis.totalReceived)}
          subtitle="Recebimentos de clientes"
          icon={TrendingUp}
          iconColor="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-950/40"
        />

        <StatCard
          title="Total Gasto (Despesas)"
          value={formatCurrency(kpis.totalPaid)}
          subtitle="Materiais, equipe e custos"
          icon={TrendingDown}
          iconColor="text-rose-600 dark:text-rose-400"
          bgColor="bg-rose-50 dark:bg-rose-950/40"
        />

        <StatCard
          title="Lucro Líquido Real"
          value={formatCurrency(kpis.netProfit)}
          subtitle={`Margem média de lucro: ${kpis.profitMargin}%`}
          icon={DollarSign}
          iconColor="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-950/40"
          trend={{ value: `${kpis.profitMargin}%`, positive: true }}
        />

        <StatCard
          title="Contas a Receber"
          value={formatCurrency(kpis.pendingReceivables)}
          subtitle="Aguardando compensação"
          icon={CreditCard}
          iconColor="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-950/40"
        />
      </div>

      {/* Sub Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Todos os Lançamentos' },
            { id: 'entries', label: 'Entradas (Recebimentos)' },
            { id: 'expenses', label: 'Saídas (Gastos)' },
            { id: 'receivables', label: 'Contas a Receber' },
            { id: 'payables', label: 'Contas a Pagar' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição, cliente..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Unified Transactions Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">Tipo</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Obra / Cliente</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Pagamento</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center w-16">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {unifiedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum lançamento financeiro encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                unifiedList.map((item) => {
                  const isEntry = item.type === 'entry';
                  const projectName = projects.find((p) => p.id === item.project_id)?.name;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedTransaction(item)}
                      className="hover:bg-blue-50/60 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group"
                      title="Clique para ver os detalhes deste lançamento"
                    >
                      <td className="py-3 px-4 text-center">
                        {isEntry ? (
                          <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 inline-block" title="Entrada">
                            <ArrowUpRight className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 inline-block" title="Despesa">
                            <ArrowDownRight className="w-4 h-4" />
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {item.description}
                        {!isEntry && 'category' in item && (
                          <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {item.category}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {projectName ? (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {projectName}
                          </span>
                        ) : 'client_name' in item && item.client_name ? (
                          <span>{item.client_name}</span>
                        ) : (
                          <span className="text-slate-400">Despesa Geral da Empresa</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(item.date)}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {item.payment_method}
                      </td>

                      <td className="py-3 px-4">
                        <Badge status={item.status} size="sm" />
                      </td>

                      <td className={`py-3 px-4 text-right font-mono font-black text-sm ${
                        isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isEntry ? '+' : '-'} {formatCurrency(item.amount)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete({
                              id: item.id,
                              isEntry,
                              description: item.description,
                              amount: item.amount,
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Entrada */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
                Registrar Entrada (Recebimento de Cliente)
              </h2>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Descrição do Recebimento *
                </label>
                <input
                  type="text"
                  required
                  value={entryForm.description}
                  onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                  placeholder="Ex: Entrada de 40% - Obra Reforma Cozinha"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Cliente
                  </label>
                  <select
                    value={entryForm.client_name}
                    onChange={(e) => setEntryForm({ ...entryForm, client_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Selecione...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Obra Vinculada
                  </label>
                  <select
                    value={entryForm.project_id}
                    onChange={(e) => setEntryForm({ ...entryForm, project_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Nenhuma (Geral)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={entryForm.amount || ''}
                    onChange={(e) => setEntryForm({ ...entryForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    placeholder="R$ 0,00"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={entryForm.payment_method}
                    onChange={(e) => setEntryForm({ ...entryForm, payment_method: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="PIX" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">PIX</option>
                    <option value="Cartão de Crédito" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Cartão de Crédito</option>
                    <option value="Boleto" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Boleto</option>
                    <option value="Dinheiro" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Dinheiro</option>
                    <option value="Transferência" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Transferência</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Data do Recebimento
                  </label>
                  <input
                    type="date"
                    value={entryForm.date}
                    onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Situação
                  </label>
                  <select
                    value={entryForm.status}
                    onChange={(e) => setEntryForm({ ...entryForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Recebido" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Recebido</option>
                    <option value="Pendente" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Pendente (A receber)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Salvar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Gasto */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-600 text-white">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
                Registrar Gasto / Despesa
              </h2>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Descrição do Gasto *
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Ex: Compra de tintas e rolos - Loja São Pedro"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Categoria do Gasto
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Material" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Material</option>
                    <option value="Ferramenta" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Ferramenta</option>
                    <option value="Combustível" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Combustível</option>
                    <option value="Alimentação" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Alimentação</option>
                    <option value="Mão de obra" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Mão de obra</option>
                    <option value="Transporte" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Transporte</option>
                    <option value="Equipamento" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Equipamento</option>
                    <option value="Outros" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Obra Vinculada (ou Geral)
                  </label>
                  <select
                    value={expenseForm.project_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, project_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Gasto Geral da Empresa</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Valor do Gasto (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={expenseForm.amount || ''}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    placeholder="R$ 0,00"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={expenseForm.payment_method}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="PIX" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">PIX</option>
                    <option value="Cartão de Crédito" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Cartão de Crédito</option>
                    <option value="Dinheiro" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Dinheiro</option>
                    <option value="Boleto" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Boleto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Data do Pagamento
                  </label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Status
                  </label>
                  <select
                    value={expenseForm.status}
                    onChange={(e) => setExpenseForm({ ...expenseForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Pago" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Pago</option>
                    <option value="Pendente" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Pendente (A pagar)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
                >
                  Salvar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer de Detalhes do Lançamento Financeiro */}
      {selectedTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 text-left text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    selectedTransaction.type === 'entry'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-500'
                  }`}
                >
                  {selectedTransaction.type === 'entry' ? (
                    <ArrowUpRight className="w-6 h-6" />
                  ) : (
                    <ArrowDownRight className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        selectedTransaction.type === 'entry'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                      }`}
                    >
                      {selectedTransaction.type === 'entry' ? 'Receita / Entrada' : 'Despesa / Saída'}
                    </span>
                    <Badge status={selectedTransaction.status} size="sm" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    Detalhes do Lançamento
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Valor com destaque */}
            <div
              className={`p-4 rounded-2xl border text-center ${
                selectedTransaction.type === 'entry'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400'
              }`}
            >
              <span className="text-xs uppercase font-bold tracking-wider block opacity-75">
                Valor Total do Lançamento
              </span>
              <p className="text-3xl font-black font-mono tracking-tight mt-0.5">
                {selectedTransaction.type === 'entry' ? '+' : '-'} {formatCurrency(selectedTransaction.amount)}
              </p>
            </div>

            {/* Informações Estruturadas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Descrição</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedTransaction.description}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Data do Registro</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {formatDate(selectedTransaction.date)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Forma de Pagamento</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{selectedTransaction.payment_method || 'PIX'}</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Obra / Projeto</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    {projects.find((p) => p.id === selectedTransaction.project_id)?.name || 'Despesa Geral da Empresa'}
                  </span>
                </p>
              </div>

              {'client_name' in selectedTransaction && selectedTransaction.client_name && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Cliente Vinculado</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedTransaction.client_name}
                  </p>
                </div>
              )}

              {'category' in selectedTransaction && selectedTransaction.category && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Categoria da Despesa</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedTransaction.category}
                  </p>
                </div>
              )}

              {'notes' in selectedTransaction && selectedTransaction.notes && (
                <div className="col-span-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Observações</span>
                  <p className="text-slate-700 dark:text-slate-300 italic">
                    {selectedTransaction.notes}
                  </p>
                </div>
              )}

              <div className="col-span-full p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/30 text-[11px] text-slate-400 flex items-center justify-between">
                <span>ID do Lançamento:</span>
                <span className="font-mono">{selectedTransaction.id}</span>
              </div>
            </div>

            {/* Ações no Rodapé */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Botão Alternar Status */}
                <button
                  type="button"
                  onClick={() => {
                    const newStatus: PaymentStatus =
                      selectedTransaction.status === 'Pendente'
                        ? selectedTransaction.type === 'entry' ? 'Recebido' : 'Pago'
                        : 'Pendente';

                    if (selectedTransaction.type === 'entry') {
                      updateFinancialEntry(selectedTransaction.id, { status: newStatus });
                    } else {
                      updateFinancialExpense(selectedTransaction.id, { status: newStatus });
                    }
                    setSelectedTransaction((prev: any) => (prev ? { ...prev, status: newStatus } : null));
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>
                    {selectedTransaction.status === 'Pendente'
                      ? selectedTransaction.type === 'entry' ? 'Marcar como Recebido' : 'Marcar como Pago'
                      : 'Marcar como Pendente'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const toDel = selectedTransaction;
                    setSelectedTransaction(null);
                    setItemToDelete({
                      id: toDel.id,
                      isEntry: toDel.type === 'entry',
                      description: toDel.description,
                      amount: toDel.amount,
                    });
                  }}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Lançamento */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Excluir Lançamento
                </h3>
                <p className="text-xs text-slate-500">
                  {itemToDelete.isEntry ? 'Receita / Entrada' : 'Despesa / Saída'}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir o lançamento <strong className="text-slate-900 dark:text-white">{itemToDelete.description}</strong> no valor de <strong className="text-slate-900 dark:text-white">{formatCurrency(itemToDelete.amount)}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (itemToDelete.isEntry) {
                    deleteFinancialEntry(itemToDelete.id);
                  } else {
                    deleteFinancialExpense(itemToDelete.id);
                  }
                  setItemToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Sim, Excluir Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
