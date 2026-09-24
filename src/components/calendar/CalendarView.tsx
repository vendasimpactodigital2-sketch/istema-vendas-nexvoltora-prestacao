import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentStatus, MonthlyGoal, MonthlyGoalExpenseItem } from '../../types';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { Badge } from '../common/Badge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  MapPin,
  User,
  FileText,
  DollarSign,
  Target,
  TrendingUp,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Phone,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  HelpCircle,
  Check,
  Receipt,
  Zap,
} from 'lucide-react';
import { formatTime, formatDate, formatCurrency, formatPhone, generateId } from '../../lib/utils';

export const CalendarView: React.FC = () => {
  const {
    appointments,
    clients,
    users,
    company,
    financialExpenses,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getMonthlyGoal,
    saveMonthlyGoal,
    openQuickAction,
    quickActionModal,
    closeQuickAction,
  } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals state
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null); // Opens Day Agenda modal
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null); // Detail modal
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false); // Create/Edit Visit modal
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false); // Monthly Goals modal
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  // Form State for Visit creation/editing
  const [visitFormData, setVisitFormData] = useState({
    client_id: '',
    client_name: '',
    phone: '',
    whatsapp: '',
    address: '',
    service_type: 'Visita técnica',
    value: 0,
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    responsible_id: '',
    responsible_name: '',
    status: 'Agendado' as AppointmentStatus,
    notes: '',
  });

  // Current month string: YYYY-MM
  const currentMonthStr = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }, [currentDate]);

  // Current monthly goal
  const currentGoal: MonthlyGoal = useMemo(() => {
    return getMonthlyGoal(currentMonthStr);
  }, [getMonthlyGoal, currentMonthStr]);

  // Goal Form State
  const [goalForm, setGoalForm] = useState<{
    total_expenses: number;
    work_days: number;
    profit_goal: number;
    notes: string;
    expenses_breakdown: MonthlyGoalExpenseItem[];
  }>({
    total_expenses: currentGoal.total_expenses,
    work_days: currentGoal.work_days,
    profit_goal: currentGoal.profit_goal || 0,
    notes: currentGoal.notes || '',
    expenses_breakdown: currentGoal.expenses_breakdown ? [...currentGoal.expenses_breakdown] : [],
  });

  // State for registering new expense item in the modal
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  // Keep goalForm in sync when month changes
  useEffect(() => {
    setGoalForm({
      total_expenses: currentGoal.total_expenses,
      work_days: currentGoal.work_days,
      profit_goal: currentGoal.profit_goal || 0,
      notes: currentGoal.notes || '',
      expenses_breakdown: currentGoal.expenses_breakdown ? [...currentGoal.expenses_breakdown] : [],
    });
  }, [currentGoal]);

  // Handlers for managing expense items (luz, água, aluguel, etc.)
  const handleAddExpenseItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const desc = newExpenseDesc.trim();
    if (!desc) return;
    const amountVal = parseFloat(newExpenseAmount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    const newItem: MonthlyGoalExpenseItem = {
      id: generateId('exp'),
      description: desc,
      date: newExpenseDate || new Date().toISOString().split('T')[0],
      amount: amountVal,
    };

    const updated = [...(goalForm.expenses_breakdown || []), newItem];
    const newSum = Math.round(updated.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) * 100) / 100;

    setGoalForm((prev) => ({
      ...prev,
      expenses_breakdown: updated,
      total_expenses: newSum,
    }));

    setNewExpenseDesc('');
    setNewExpenseAmount('');
  };

  const handleRemoveExpenseItem = (id: string) => {
    const updated = (goalForm.expenses_breakdown || []).filter((item) => item.id !== id);
    const newSum = Math.round(updated.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) * 100) / 100;
    setGoalForm((prev) => ({
      ...prev,
      expenses_breakdown: updated,
      total_expenses: newSum,
    }));
  };

  // Listen for global quick action 'newAppointment'
  useEffect(() => {
    if (quickActionModal === 'newAppointment') {
      openNewVisitModal();
      closeQuickAction();
    }
  }, [quickActionModal, closeQuickAction]);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const isCurrentMonth =
    today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  // Type Color mapping
  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'Visita técnica':
        return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'Início de obra':
        return 'bg-emerald-500 text-white hover:bg-emerald-600';
      case 'Orçamento no local':
        return 'bg-amber-500 text-white hover:bg-amber-600';
      case 'Reunião com cliente':
        return 'bg-purple-500 text-white hover:bg-purple-600';
      default:
        return 'bg-slate-600 text-white hover:bg-slate-700';
    }
  };

  // Month grid calculations
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // blanks before month start
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, dateStr: null, isCurrentMonth: false });
    }
    // days of month
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = (month + 1).toString().padStart(2, '0');
      const dayStr = d.toString().padStart(2, '0');
      const fullDate = `${year}-${monthStr}-${dayStr}`;
      days.push({ dayNumber: d, dateStr: fullDate, isCurrentMonth: true });
    }
    return days;
  }, [currentDate]);

  // Appointments in current month
  const monthAppointments = useMemo(() => {
    return appointments.filter((a) => a.date && a.date.startsWith(currentMonthStr));
  }, [appointments, currentMonthStr]);

  // Total value of all visits in current month
  const totalMonthValue = useMemo(() => {
    return monthAppointments.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  }, [monthAppointments]);

  // Target total for the month (expenses + profit)
  const targetMonthTotal = currentGoal.total_expenses + (currentGoal.profit_goal || 0);

  // Month Goal Progress %
  const monthProgressPct = useMemo(() => {
    if (targetMonthTotal <= 0) return 0;
    return Math.min(100, Math.round((totalMonthValue / targetMonthTotal) * 100));
  }, [totalMonthValue, targetMonthTotal]);

  // Today's appointments and value
  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === todayStr);
  }, [appointments, todayStr]);

  const todayTotalValue = useMemo(() => {
    return todayAppointments.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  }, [todayAppointments]);

  // Today's Goal Status
  const isTodayGoalAchieved = todayTotalValue >= currentGoal.daily_goal && currentGoal.daily_goal > 0;

  // Real expenses in this month from financialExpenses module
  const expensesInFinancial = useMemo(() => {
    return financialExpenses
      .filter((e) => e.date && e.date.startsWith(currentMonthStr))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [financialExpenses, currentMonthStr]);

  // Open Visit Create modal pre-filled with date
  const openNewVisitModal = (targetDate?: string) => {
    setEditingAppointment(null);
    const initialClient = clients[0];
    const initialUser = users[0];
    const dateToUse = targetDate || selectedDayDate || todayStr;

    setVisitFormData({
      client_id: initialClient?.id || '',
      client_name: initialClient?.name || '',
      phone: initialClient?.phone || '',
      whatsapp: initialClient?.whatsapp || initialClient?.phone || '',
      address: initialClient ? `${initialClient.address}, ${initialClient.number} - ${initialClient.city}` : '',
      service_type: 'Visita técnica',
      value: 0,
      date: dateToUse,
      time: '09:00',
      responsible_id: initialUser?.id || '',
      responsible_name: initialUser?.name || '',
      status: 'Agendado',
      notes: '',
    });
    setIsVisitModalOpen(true);
  };

  // Open Visit Edit modal
  const openEditVisitModal = (app: Appointment) => {
    setEditingAppointment(app);
    setVisitFormData({
      client_id: app.client_id || '',
      client_name: app.client_name,
      phone: app.phone,
      whatsapp: app.whatsapp,
      address: app.address,
      service_type: app.service_type,
      value: app.value || 0,
      date: app.date,
      time: app.time,
      responsible_id: app.responsible_id,
      responsible_name: app.responsible_name,
      status: app.status,
      notes: app.notes || '',
    });
    setIsVisitModalOpen(true);
  };

  // Handle client selection inside Visit Form
  const handleClientSelect = (clientId: string) => {
    const c = clients.find((client) => client.id === clientId);
    if (c) {
      setVisitFormData({
        ...visitFormData,
        client_id: c.id,
        client_name: c.name,
        phone: c.phone,
        whatsapp: c.whatsapp || c.phone,
        address: `${c.address}, ${c.number} - ${c.neighborhood}, ${c.city}`,
      });
    }
  };

  // Save Visit (create or update)
  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitFormData.client_name.trim()) return;

    const payload = {
      ...visitFormData,
      value: Number(visitFormData.value) || 0,
    };

    if (editingAppointment) {
      updateAppointment(editingAppointment.id, payload);
    } else {
      addAppointment({
        company_id: company.id,
        ...payload,
      });
    }

    setIsVisitModalOpen(false);
  };

  // Save Goal Form
  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const expenses = Number(goalForm.total_expenses) || 0;
    const days = Math.max(1, Number(goalForm.work_days) || 22);
    const profit = Number(goalForm.profit_goal) || 0;
    const daily = Math.round(((expenses + profit) / days) * 100) / 100;

    saveMonthlyGoal({
      month: currentMonthStr,
      total_expenses: expenses,
      work_days: days,
      profit_goal: profit,
      daily_goal: daily,
      notes: goalForm.notes,
      expenses_breakdown: goalForm.expenses_breakdown,
    });
    setIsGoalsModalOpen(false);
  };

  // Appointments of the currently selected day for the Day Agenda modal
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDayDate) return [];
    return appointments.filter((a) => a.date === selectedDayDate);
  }, [appointments, selectedDayDate]);

  const selectedDayTotal = useMemo(() => {
    return selectedDayAppointments.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  }, [selectedDayAppointments]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Calendário Visual
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Gestão Diária de Visitas & Metas
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Clique em qualquer dia para agendar ou ver visitas. Acompanhe os valores diários e a meta diluída dos gastos do mês.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsGoalsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-bold shadow-2xs transition-all"
            title="Definir gastos do mês e meta diária diluída"
          >
            <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Configurar Metas & Gastos</span>
          </button>

          <button
            onClick={() => openNewVisitModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Visita / Agendamento</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE METAS & PONTO DE EQUILÍBRIO DO MÊS (Diluição por Dias) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsGoalsModalOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsGoalsModalOpen(true);
          }
        }}
        className="rounded-3xl p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative overflow-hidden cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 group active:scale-[0.998]"
        title="Clique para abrir e configurar gastos fixos, contas e metas"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left stats info */}
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                Metas & Ponto de Equilíbrio do Mês ({monthName})
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200/80 dark:border-blue-800/80 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-2xs">
                <Edit2 className="w-3 h-3" />
                Configurar Gastos & Metas
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Gastos totais do mês de <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(currentGoal.total_expenses)}</strong> diluídos por{' '}
              <strong className="text-slate-800 dark:text-slate-200">{currentGoal.work_days} dias úteis</strong> de trabalho.
              Cada dia precisa cobrir no mínimo <strong className="text-blue-600 dark:text-blue-400">{formatCurrency(currentGoal.daily_goal)}</strong> para atingir o equilíbrio da operação.
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Gastos do Mês */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 group-hover:border-blue-300 dark:group-hover:border-blue-700/60 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gastos Mês</span>
                <span className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </span>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {formatCurrency(currentGoal.total_expenses)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {currentGoal.expenses_breakdown && currentGoal.expenses_breakdown.length > 0
                  ? `${currentGoal.expenses_breakdown.length} contas somadas`
                  : `${currentGoal.work_days} dias de trabalho`}
              </p>
            </div>

            {/* Meta Diária Diluída */}
            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/50 group-hover:border-blue-400 dark:group-hover:border-blue-600 transition-colors">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase block">
                Meta Diária
              </span>
              <p className="text-sm font-black text-blue-700 dark:text-blue-400 mt-1">
                {formatCurrency(currentGoal.daily_goal)}
              </p>
              <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">por dia trabalhado</p>
            </div>

            {/* Faturado no Mês (Visitas/Serviços) */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 group-hover:border-emerald-400 transition-colors">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block">
                Realizado no Mês
              </span>
              <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {formatCurrency(totalMonthValue)}
              </p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                {monthProgressPct}% da meta batida
              </p>
            </div>

            {/* Faturado Hoje vs Meta */}
            <div
              className={`p-3 rounded-2xl border transition-colors ${
                isTodayGoalAchieved
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/50 text-amber-800 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase block">Hoje ({formatDate(todayStr)})</span>
                {isTodayGoalAchieved && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
              </div>
              <p className="text-sm font-black mt-1">{formatCurrency(todayTotalValue)}</p>
              <p className="text-[10px] font-semibold mt-0.5">
                {isTodayGoalAchieved ? '🎉 Meta batida hoje!' : `Faltam ${formatCurrency(Math.max(0, currentGoal.daily_goal - todayTotalValue))}`}
              </p>
            </div>
          </div>
        </div>

        {/* Month progress bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              Progresso do Mês ({formatCurrency(totalMonthValue)} de {formatCurrency(targetMonthTotal)})
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{monthProgressPct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                monthProgressPct >= 100
                  ? 'bg-emerald-500'
                  : monthProgressPct >= 50
                  ? 'bg-blue-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, monthProgressPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Calendar Controls & Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white capitalize">
              {monthName}
            </h2>
          </div>

          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            <button
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className={`px-2.5 py-0.5 text-xs font-bold rounded-lg transition-colors ${
                isCurrentMonth
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3.5 flex-wrap text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-600 dark:text-slate-300">Visita técnica</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300">Início de obra</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-300">Orçamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-600 dark:text-slate-300">Reunião</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              🎯 Meta batida
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Grid (Month View) */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {/* Days of week */}
        <div className="grid grid-cols-7 text-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 py-3 text-xs font-bold text-slate-600 dark:text-slate-400">
          <span>Dom</span>
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
        </div>

        {/* Month days cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
          {daysInMonth.map((item, index) => {
            if (!item.isCurrentMonth || !item.dateStr) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[120px] p-2 bg-slate-50/40 dark:bg-slate-950/30"
                />
              );
            }

            const dayAppointments = appointments.filter((a) => a.date === item.dateStr);
            const dayTotalValue = dayAppointments.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
            const isToday = item.dateStr === todayStr;
            const isDayGoalMet = dayTotalValue >= currentGoal.daily_goal && currentGoal.daily_goal > 0;

            return (
              <div
                key={item.dateStr}
                onClick={() => setSelectedDayDate(item.dateStr)}
                className={`group min-h-[125px] p-2 flex flex-col justify-between transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer relative border-2 border-transparent hover:border-blue-400/40 dark:hover:border-blue-500/40 ${
                  isToday ? 'bg-blue-50/30 dark:bg-blue-950/20 ring-1 ring-blue-500/30 inset-0' : ''
                }`}
                title={`Clique para ver ou agendar visitas em ${formatDate(item.dateStr)}`}
              >
                {/* Day Header */}
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-105 ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}
                    >
                      {item.dayNumber}
                    </span>

                    {/* Quick + Visita on hover/touch */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNewVisitModal(item.dateStr!);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center gap-0.5"
                      title={`Agendar nova visita no dia ${formatDate(item.dateStr)}`}
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden sm:inline">Visita</span>
                    </button>
                  </div>

                  {/* Day total value badge (ESSE VALOR ENTRARA NO DIA) */}
                  {dayTotalValue > 0 && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 shrink-0 ${
                        isDayGoalMet
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                      title={
                        isDayGoalMet
                          ? `Total do dia: ${formatCurrency(dayTotalValue)} (Meta de ${formatCurrency(currentGoal.daily_goal)} batida! 🎯)`
                          : `Total do dia: ${formatCurrency(dayTotalValue)} (Meta diária: ${formatCurrency(currentGoal.daily_goal)})`
                      }
                    >
                      {isDayGoalMet && <Target className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />}
                      {formatCurrency(dayTotalValue)}
                    </span>
                  )}
                </div>

                {/* Day events pills */}
                <div className="space-y-1 my-1.5 overflow-y-auto max-h-[85px] scrollbar-none">
                  {dayAppointments.slice(0, 3).map((app) => (
                    <div
                      key={app.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(app);
                      }}
                      className={`px-1.5 py-1 rounded-md text-[10px] font-bold truncate shadow-2xs transition-transform hover:scale-[1.02] flex items-center justify-between gap-1 ${getTypeBadgeStyle(
                        app.service_type
                      )}`}
                      title={`${app.time} - ${app.client_name} (${app.service_type}) • ${
                        app.value ? formatCurrency(app.value) : 'Sem valor'
                      }`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <Clock className="w-2.5 h-2.5 shrink-0 opacity-80" />
                        <span className="truncate">{app.time} {app.client_name}</span>
                      </div>
                      {app.value !== undefined && app.value > 0 && (
                        <span className="shrink-0 text-[9px] bg-black/20 px-1 rounded font-black">
                          {formatCurrency(app.value)}
                        </span>
                      )}
                    </div>
                  ))}

                  {dayAppointments.length > 3 && (
                    <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 text-center hover:underline">
                      +{dayAppointments.length - 3} mais visita(s)
                    </p>
                  )}

                  {dayAppointments.length === 0 && (
                    <div className="h-full flex items-center justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3 text-blue-500" />
                        Clique para agendar
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Day Footer */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/60 dark:border-slate-800/40">
                  <span>{dayAppointments.length > 0 ? `${dayAppointments.length} agendamento(s)` : ''}</span>
                  {dayAppointments.length === 0 && isToday && (
                    <span className="text-blue-600 dark:text-blue-400 font-bold">Hoje</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: AGENDA DO DIA (CLICAR NO DIA OU DATA E JÁ IR PARA VISITA) */}
      {selectedDayDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    Agenda do Dia: {formatDate(selectedDayDate)}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Resumo das visitas agendadas, faturamento do dia e meta diária
                </p>
              </div>

              <button
                onClick={() => setSelectedDayDate(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Status of the Day */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Faturamento Previsto no Dia
                </span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(selectedDayTotal)}
                </p>
                <p className="text-[10px] text-slate-500">{selectedDayAppointments.length} visita(s) agendada(s)</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Meta Diária Diluída
                </span>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  {formatCurrency(currentGoal.daily_goal)}
                </p>
                <p className="text-[10px] text-slate-500">Ponto de equilíbrio diário</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status da Meta</span>
                {selectedDayTotal >= currentGoal.daily_goal && currentGoal.daily_goal > 0 ? (
                  <div className="mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-xs">
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                      Meta Batida! 🎯
                    </span>
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                      +{formatCurrency(selectedDayTotal - currentGoal.daily_goal)} acima
                    </p>
                  </div>
                ) : (
                  <div className="mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      Faltam {formatCurrency(Math.max(0, currentGoal.daily_goal - selectedDayTotal))}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">para o ponto de equilíbrio</p>
                  </div>
                )}
              </div>
            </div>

            {/* Visits List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Visitas & Serviços do Dia
                </h3>
                <button
                  onClick={() => openNewVisitModal(selectedDayDate)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Visita neste dia</span>
                </button>
              </div>

              {selectedDayAppointments.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Nenhuma visita agendada para {formatDate(selectedDayDate)}.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
                    Agende uma visita técnica ou orçamento para começar a pontuar na meta do dia!
                  </p>
                  <button
                    onClick={() => openNewVisitModal(selectedDayDate)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agendar Primeira Visita</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDayAppointments.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {formatTime(app.time)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${getTypeBadgeStyle(
                              app.service_type
                            )}`}
                          >
                            {app.service_type}
                          </span>
                          <Badge status={app.status} size="sm" />
                        </div>

                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {app.client_name}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {app.address}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            Resp: {app.responsible_name}
                          </span>
                        </div>
                      </div>

                      {/* Right actions and Value */}
                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                        {/* Value tag */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Valor da Visita
                          </span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {app.value && app.value > 0 ? formatCurrency(app.value) : 'R$ 0,00'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <WhatsAppButton
                            phone={app.whatsapp || app.phone}
                            message={`Olá, ${app.client_name}! Confirmamos seu agendamento de ${app.service_type} em ${formatDate(app.date)} às ${formatTime(app.time)}.`}
                            size="sm"
                            label="WhatsApp"
                          />

                          <button
                            onClick={() => openEditVisitModal(app)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Editar visita e alterar valor"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setAppointmentToDelete(app)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Excluir agendamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedDayDate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Fechar
              </button>

              <button
                onClick={() => openNewVisitModal(selectedDayDate)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agendar Visita para {formatDate(selectedDayDate)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CRIAR OU EDITAR VISITA COM CAMPO DE VALOR (ESSE VALOR ENTRARA NO DIA) */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    {editingAppointment ? 'Editar Visita / Agendamento' : 'Novo Agendamento de Visita'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Preencha os dados da visita e o valor estimado/cobrado para o dia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVisitModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="space-y-4 text-xs">
              {/* Client Selection */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Cliente Cadastrado (Opcional)
                </label>
                <select
                  value={visitFormData.client_id}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-2xs"
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">-- Selecionar ou digitar cliente avulso --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                      {c.name} - {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={visitFormData.client_name}
                    onChange={(e) => setVisitFormData({ ...visitFormData, client_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 99999-9999"
                    value={visitFormData.phone}
                    onChange={(e) =>
                      setVisitFormData({
                        ...visitFormData,
                        phone: e.target.value,
                        whatsapp: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Endereço da Visita / Local *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rua das Palmeiras, 350 - Moema, SP"
                  value={visitFormData.address}
                  onChange={(e) => setVisitFormData({ ...visitFormData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>

              {/* Service Type & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Tipo de Serviço / Visita *
                  </label>
                  <select
                    value={visitFormData.service_type}
                    onChange={(e) => setVisitFormData({ ...visitFormData, service_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="Visita técnica" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Visita técnica (Azul)</option>
                    <option value="Início de obra" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Início de obra (Verde)</option>
                    <option value="Orçamento no local" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Orçamento no local (Amarelo)</option>
                    <option value="Reunião com cliente" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Reunião com cliente (Roxo)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Status do Agendamento
                  </label>
                  <select
                    value={visitFormData.status}
                    onChange={(e) =>
                      setVisitFormData({ ...visitFormData, status: e.target.value as AppointmentStatus })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="Agendado" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Agendado</option>
                    <option value="Confirmado" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Confirmado</option>
                    <option value="Em atendimento" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Em atendimento</option>
                    <option value="Concluído" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Concluído</option>
                    <option value="Cancelado" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Data da Visita *
                  </label>
                  <input
                    type="date"
                    required
                    value={visitFormData.date}
                    onChange={(e) => setVisitFormData({ ...visitFormData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Horário *
                  </label>
                  <input
                    type="time"
                    required
                    value={visitFormData.time}
                    onChange={(e) => setVisitFormData({ ...visitFormData, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* VALOR DA VISITA / SERVIÇO (CAMPO DE VALOR SOLICITADO PELO USUÁRIO) */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-emerald-900 dark:text-emerald-300 text-xs uppercase tracking-wide">
                    💰 Valor da Visita / Serviço (R$)
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-200/80 dark:bg-emerald-900/80 px-2 py-0.5 rounded-md">
                    Entrará no dia selecionado
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-bold text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={visitFormData.value || ''}
                    onChange={(e) =>
                      setVisitFormData({
                        ...visitFormData,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-800 text-sm font-black text-emerald-700 dark:text-emerald-300 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Esse valor será somado ao total do dia <strong>{formatDate(visitFormData.date)}</strong> e contabilizado na <strong>meta diária diluída ({formatCurrency(currentGoal.daily_goal)})</strong>.
                </p>
              </div>

              {/* Responsible */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Responsável Técnico
                </label>
                <select
                  value={visitFormData.responsible_name}
                  onChange={(e) => {
                    const u = users.find((user) => user.name === e.target.value);
                    setVisitFormData({
                      ...visitFormData,
                      responsible_id: u?.id || '',
                      responsible_name: e.target.value,
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-2xs"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Observações / Itens a verificar na visita
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Levar catálogo de tintas e verificar tomadas..."
                  value={visitFormData.notes}
                  onChange={(e) => setVisitFormData({ ...visitFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>

              {/* Submit / Cancel buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  {editingAppointment ? 'Atualizar Visita' : 'Salvar Visita no Calendário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DETALHES DE UMA VISITA ESPECÍFICA */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  Detalhes do Agendamento
                </span>
                <Badge status={selectedAppointment.status} size="sm" />
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Value Highlight */}
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">
                    Valor Deste Agendamento
                  </span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {selectedAppointment.value && selectedAppointment.value > 0
                      ? formatCurrency(selectedAppointment.value)
                      : 'R$ 0,00'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const app = selectedAppointment;
                    setSelectedAppointment(null);
                    openEditVisitModal(app);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center gap-1 shadow-2xs"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Alterar Valor</span>
                </button>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tipo de Serviço</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedAppointment.service_type}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cliente</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {selectedAppointment.client_name}
                </p>
                <p className="text-slate-500 mt-0.5">{selectedAppointment.phone}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Data e Horário</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(selectedAppointment.date)} às {formatTime(selectedAppointment.time)}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Endereço da Visita</span>
                <p className="text-slate-700 dark:text-slate-300">{selectedAppointment.address}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Responsável</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedAppointment.responsible_name}
                </p>
              </div>

              {selectedAppointment.notes && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 italic">
                  &quot;{selectedAppointment.notes}&quot;
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <WhatsAppButton
                phone={selectedAppointment.whatsapp || selectedAppointment.phone}
                message={`Olá, ${selectedAppointment.client_name}! Confirmando nosso agendamento de ${selectedAppointment.service_type} em ${formatDate(selectedAppointment.date)} às ${formatTime(selectedAppointment.time)}.`}
                size="sm"
                label="WhatsApp"
              />

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const app = selectedAppointment;
                    setSelectedAppointment(null);
                    openEditVisitModal(app);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => {
                    const app = selectedAppointment;
                    setSelectedAppointment(null);
                    openQuickAction('newQuote', {
                      clientId: app.client_id,
                      clientName: app.client_name,
                      phone: app.phone,
                      address: app.address,
                    });
                  }}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Gerar Orçamento</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIGURAÇÃO DE METAS & GASTOS DO MÊS (DILUÍDO POR DIAS) */}
      {isGoalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Metas de Gastos & Ponto de Equilíbrio ({monthName})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cadastre suas contas (luz, água, aluguel, etc.) para somatória total e cálculo da meta diária
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGoalsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-5 text-xs">
              {/* SEÇÃO 1: CADASTRO DE CONTAS E CUSTOS FIXOS */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                      Cadastrar Contas & Despesas do Mês
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {goalForm.expenses_breakdown?.length || 0} conta(s)
                  </span>
                </div>

                {/* Sugestões rápidas de contas */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sugestões Rápidas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '⚡ Conta de Luz', name: 'Conta de Luz' },
                      { label: '💧 Conta de Água', name: 'Conta de Água' },
                      { label: '🏢 Aluguel', name: 'Aluguel do Ponto' },
                      { label: '📶 Internet / Tel', name: 'Internet e Telefonia' },
                      { label: '⛽ Combustível', name: 'Combustível / Deslocamento' },
                      { label: '👥 Equipe / Folha', name: 'Folha de Pagamento' },
                      { label: '🧾 Impostos / DAS', name: 'Impostos e Tributos' },
                    ].map((sug) => (
                      <button
                        key={sug.name}
                        type="button"
                        onClick={() => setNewExpenseDesc(sug.name)}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-2xs"
                      >
                        {sug.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formulário de Nova Conta */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                  {/* Descrição */}
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Conta / Despesa
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Conta de luz, aluguel..."
                      value={newExpenseDesc}
                      onChange={(e) => setNewExpenseDesc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExpenseItem();
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Data */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Data / Vencimento
                    </label>
                    <input
                      type="date"
                      value={newExpenseDate}
                      onChange={(e) => setNewExpenseDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Valor */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExpenseItem();
                        }
                      }}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-black focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Botão Adicionar */}
                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddExpenseItem}
                      disabled={!newExpenseDesc.trim() || !newExpenseAmount}
                      className="w-full h-[38px] flex items-center justify-center gap-1 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>

                {/* Lista de Contas Cadastradas */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Contas Cadastradas ({goalForm.expenses_breakdown?.length || 0}):
                  </span>

                  {goalForm.expenses_breakdown && goalForm.expenses_breakdown.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {goalForm.expenses_breakdown.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <DollarSign className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {item.description}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {item.date ? formatDate(item.date) : 'Data não informada'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                              {formatCurrency(item.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExpenseItem(item.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Remover esta conta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-xs">
                      Nenhuma conta cadastrada ainda. Adicione as contas acima para somar automaticamente!
                    </div>
                  )}
                </div>

                {/* SOMATÓRIA TOTAL DOS GASTOS CADASTRADOS */}
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                      Somatória Total dos Gastos
                    </span>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                      Soma de todas as contas cadastradas acima
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(goalForm.total_expenses)}
                    </span>
                  </div>
                </div>

                {/* Opção para puxar do financeiro */}
                {expensesInFinancial > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Existe {formatCurrency(expensesInFinancial)} em despesas já salvas no Financeiro.
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setGoalForm({
                          ...goalForm,
                          total_expenses: expensesInFinancial,
                        })
                      }
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      title="Substituir total pelo valor registrado na aba Financeiro"
                    >
                      <Sparkles className="w-3 h-3" />
                      Puxar Total do Financeiro ({formatCurrency(expensesInFinancial)})
                    </button>
                  </div>
                )}
              </div>

              {/* SEÇÃO 2: DIAS TRABALHADOS NO MÊS (DILUIÇÃO) */}
              <div className="space-y-1.5">
                <label className="block font-black text-slate-800 dark:text-slate-200">
                  Dias Trabalhados no Mês (Diluição dos Gastos) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGoalForm({ ...goalForm, work_days: 22 })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      goalForm.work_days === 22
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black ring-1 ring-blue-500/30'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <p className="text-xs font-black">22 dias</p>
                    <p className="text-[10px] text-slate-400">Seg a Sex (Úteis)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGoalForm({ ...goalForm, work_days: 26 })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      goalForm.work_days === 26
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black ring-1 ring-blue-500/30'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <p className="text-xs font-black">26 dias</p>
                    <p className="text-[10px] text-slate-400">Seg a Sábado</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGoalForm({ ...goalForm, work_days: 30 })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      goalForm.work_days === 30
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black ring-1 ring-blue-500/30'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <p className="text-xs font-black">30 dias</p>
                    <p className="text-[10px] text-slate-400">Mês Corrido</p>
                  </button>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    Ou digite o número exato de dias:
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={goalForm.work_days || ''}
                    onChange={(e) =>
                      setGoalForm({
                        ...goalForm,
                        work_days: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* SEÇÃO 3: META DE LUCRO LÍQUIDO ADICIONAL */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Meta de Lucro Líquido Desejado (R$) <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={goalForm.profit_goal || ''}
                    onChange={(e) =>
                      setGoalForm({
                        ...goalForm,
                        profit_goal: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* SEÇÃO 4: DEMONSTRATIVO DA DILUIÇÃO EM TEMPO REAL */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-2">
                <span className="text-[10px] uppercase font-black text-blue-700 dark:text-blue-300 block tracking-wider">
                  Cálculo da Diluição Diária
                </span>

                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Meta Diária Calculada:</span>
                  <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                    {formatCurrency(
                      ((Number(goalForm.total_expenses) || 0) + (Number(goalForm.profit_goal) || 0)) /
                        Math.max(1, Number(goalForm.work_days) || 1)
                    )}{' '}
                    <span className="text-xs font-semibold text-slate-500">/ dia</span>
                  </span>
                </div>

                <p className="text-[11px] text-blue-900/80 dark:text-blue-300/80 leading-relaxed">
                  Fórmula: ({formatCurrency(Number(goalForm.total_expenses) || 0)} gastos +{' '}
                  {formatCurrency(Number(goalForm.profit_goal) || 0)} lucro) ÷ {goalForm.work_days || 1} dias de trabalho.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Anotações da Meta (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Meta baseada em 22 dias úteis com 2 equipes"
                  value={goalForm.notes}
                  onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGoalsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  Salvar e Aplicar no Calendário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Confirmação para Excluir Agendamento */}
      {appointmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Excluir Agendamento
                </h3>
                <p className="text-xs text-slate-500">
                  Ação definitiva e irreversível
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Deseja realmente cancelar e excluir o agendamento de <strong className="text-slate-900 dark:text-white">{appointmentToDelete.client_name}</strong> ({appointmentToDelete.service_type})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAppointmentToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAppointment(appointmentToDelete.id);
                  setAppointmentToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Sim, Excluir Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
