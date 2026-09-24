import React, { useState, useMemo } from 'react';
import { Project, ProjectTask, ProjectPhoto, DailyLog, FinancialExpense, FinancialEntry, Company } from '../../types';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { formatCurrency, formatDate, generateId } from '../../lib/utils';
import {
  X,
  HardHat,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Camera,
  DollarSign,
  BookOpen,
  Users,
  Package,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose }) => {
  const {
    updateProject,
    financialEntries,
    financialExpenses,
    addFinancialEntry,
    addFinancialExpense,
    users,
    company,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'photos' | 'financial' | 'materials' | 'team' | 'diary'>('overview');

  // Task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Photo form state
  const [photoCategory, setPhotoCategory] = useState<'Antes' | 'Durante' | 'Depois'>('Antes');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Diary form state
  const [diaryDate, setDiaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [diaryDescription, setDiaryDescription] = useState('');
  const [diaryWorkers, setDiaryWorkers] = useState('');
  const [diaryIssues, setDiaryIssues] = useState('');

  // New financial expense state
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseCategory, setExpenseCategory] = useState<'Material' | 'Mão de obra' | 'Equipamento' | 'Outros'>('Material');

  if (!project) return null;

  // Real-time calculations for this project
  const projectEntries = financialEntries.filter((e) => e.project_id === project.id);
  const projectExpenses = financialExpenses.filter((e) => e.project_id === project.id);

  const totalReceived = projectEntries
    .filter((e) => e.status === 'Recebido')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSpent = projectExpenses
    .filter((e) => e.status === 'Pago')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const realProfit = totalReceived - totalSpent;
  const profitMargin = totalReceived > 0 ? ((realProfit / totalReceived) * 100).toFixed(1) : '0';

  // Task toggles
  const handleToggleTask = (taskId: string) => {
    const updatedTasks = project.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const completedCount = updatedTasks.filter((t) => t.completed).length;
    const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : project.progress;

    updateProject(project.id, {
      tasks: updatedTasks,
      progress,
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: ProjectTask = {
      id: generateId('task'),
      title: newTaskTitle.trim(),
      completed: false,
    };

    const updatedTasks = [...project.tasks, newTask];
    const completedCount = updatedTasks.filter((t) => t.completed).length;
    const progress = Math.round((completedCount / updatedTasks.length) * 100);

    updateProject(project.id, {
      tasks: updatedTasks,
      progress,
    });
    setNewTaskTitle('');
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = project.tasks.filter((t) => t.id !== taskId);
    updateProject(project.id, { tasks: updatedTasks });
  };

  // Add Photo
  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    const url = photoUrl.trim() || 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f8?w=800&auto=format&fit=crop&q=80';
    const newPhoto: ProjectPhoto = {
      id: generateId('photo'),
      category: photoCategory,
      url,
      caption: photoCaption.trim() || `Registro de obra (${photoCategory})`,
      date: new Date().toISOString().split('T')[0],
    };

    updateProject(project.id, {
      photos: [...project.photos, newPhoto],
    });

    setPhotoCaption('');
    setPhotoUrl('');
  };

  // Add Diary entry
  const handleAddDiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryDescription.trim()) return;

    const newLog: DailyLog = {
      id: generateId('log'),
      date: diaryDate,
      description: diaryDescription.trim(),
      workers_present: diaryWorkers ? diaryWorkers.split(',').map((w) => w.trim()) : [],
      issues_encountered: diaryIssues.trim() || undefined,
    };

    updateProject(project.id, {
      daily_logs: [newLog, ...project.daily_logs],
    });

    setDiaryDescription('');
    setDiaryWorkers('');
    setDiaryIssues('');
  };

  // Add direct project expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDescription.trim() || expenseAmount <= 0) return;

    addFinancialExpense({
      company_id: company.id,
      project_id: project.id,
      description: `[${project.name}] ${expenseDescription}`,
      category: expenseCategory,
      amount: expenseAmount,
      date: new Date().toISOString().split('T')[0],
      status: 'Pago',
      payment_method: 'PIX',
    });

    setExpenseDescription('');
    setExpenseAmount(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header with Project Code & Info */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                  {project.code}
                </span>
                <Badge status={project.status} size="sm" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {project.name}
              </h2>
              <p className="text-xs text-slate-500">
                Cliente: <span className="font-semibold text-slate-700 dark:text-slate-300">{project.client_name}</span> • {project.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <WhatsAppButton
              phone={project.client_phone}
              message={`Olá, ${project.client_name}! Estou entrando em contato para informar o andamento da sua obra "${project.name}".`}
              size="sm"
              label="WhatsApp"
            />
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 7 Tabs Bar (Visão geral, Etapas, Fotos, Financeiro, Materiais, Equipe, Diário) */}
        <div className="flex items-center gap-1 overflow-x-auto px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Etapas / Checklist ({project.tasks.filter((t) => t.completed).length}/{project.tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'photos'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Fotos ({project.photos.length})
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'financial'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Financeiro & Lucro
          </button>
          <button
            onClick={() => setActiveTab('diary')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'diary'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Diário de Obra ({project.daily_logs.length})
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'materials'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Materiais
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'team'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Equipe Alocada
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Progress and status */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">Progresso Geral da Execução</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                    {project.progress}% Concluído
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Início: <strong>{formatDate(project.start_date)}</strong></span>
                  <span>Previsão de Término: <strong>{formatDate(project.expected_completion_date)}</strong></span>
                  <span>Responsável: <strong>{project.responsible_name}</strong></span>
                </div>
              </div>

              {/* Financial mini summary */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 font-medium">Valor Contratado</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1">
                    {formatCurrency(project.total_value)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-emerald-600 font-medium">Recebido</span>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1">
                    {formatCurrency(totalReceived)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-rose-600 font-medium">Gastos Registrados</span>
                  <p className="text-lg font-black text-rose-700 dark:text-rose-400 font-mono mt-1">
                    {formatCurrency(totalSpent)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-blue-600 font-medium">Lucro Líquido Real</span>
                  <p className="text-lg font-black text-blue-700 dark:text-blue-400 font-mono mt-1">
                    {formatCurrency(realProfit)}
                  </p>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Margem: {profitMargin}%
                  </span>
                </div>
              </div>

              {/* Status Update Dropdown */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    Alterar Situação Operacional da Obra
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mude para &quot;Concluída&quot; quando a entrega técnica for aprovada pelo cliente.
                  </p>
                </div>
                <select
                  value={project.status}
                  onChange={(e) => updateProject(project.id, { status: e.target.value as any })}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
                >
                  <option value="Agendada" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Agendada</option>
                  <option value="Em andamento" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Em andamento</option>
                  <option value="Pausada" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Pausada</option>
                  <option value="Atrasada" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Atrasada</option>
                  <option value="Concluída" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Concluída</option>
                  <option value="Cancelada" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Cancelada</option>
                </select>
              </div>

              {project.notes && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Anotações Gerais
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {project.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ETAPAS / CHECKLIST */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Etapas e Checklist de Execução
                  </h3>
                  <p className="text-xs text-slate-500">
                    Marque as etapas conforme a equipe avança na obra para atualizar a barra de progresso
                  </p>
                </div>
              </div>

              {/* Add Task Form */}
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Instalação de pisos porcelanato, Pintura de acabamento..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </form>

              {/* Tasks List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                {project.tasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Nenhuma etapa cadastrada. Adicione acima para controlar a obra.
                  </div>
                ) : (
                  project.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className="flex items-center gap-3 text-left flex-1"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 shrink-0" />
                        )}
                        <span
                          className={`text-xs font-medium ${
                            task.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {task.title}
                        </span>
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FOTOS (Antes, Durante, Depois) */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Registro Fotográfico da Obra
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fotografe e documente as fases: Antes, Durante e Depois
                  </p>
                </div>
              </div>

              {/* Add Photo Form */}
              <form
                onSubmit={handleAddPhoto}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Fase da Foto
                    </label>
                    <select
                      value={photoCategory}
                      onChange={(e) => setPhotoCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                    >
                      <option value="Antes" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Antes</option>
                      <option value="Durante" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Durante</option>
                      <option value="Depois" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Depois</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Legenda da Foto
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Parede da sala antes da demolição"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      URL da Imagem ou Foto
                    </label>
                    <input
                      type="text"
                      placeholder="https://... (ou deixe vazio para foto demonstrativa)"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Registrar Foto
                  </button>
                </div>
              </form>

              {/* Photos Gallery Filtered by Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['Antes', 'Durante', 'Depois'] as const).map((stage) => {
                  const stagePhotos = project.photos.filter((p) => p.category === stage);
                  return (
                    <div
                      key={stage}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-blue-500" />
                          {stage} ({stagePhotos.length})
                        </span>
                      </div>

                      <div className="space-y-3">
                        {stagePhotos.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400">
                            Nenhuma foto do &quot;{stage}&quot;
                          </div>
                        ) : (
                          stagePhotos.map((p) => (
                            <div
                              key={p.id}
                              className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group relative"
                            >
                              <img
                                src={p.url}
                                alt={p.caption}
                                className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="p-2 bg-white dark:bg-slate-800">
                                <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                                  {p.caption}
                                </p>
                                <p className="text-[10px] text-slate-400">{formatDate(p.date)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: FINANCEIRO DA OBRA */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              {/* Financial Big Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-500 font-medium">Contrato Total</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1">
                    {formatCurrency(project.total_value)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Total Recebido</span>
                  <p className="text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono mt-1">
                    {formatCurrency(totalReceived)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
                  <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">Gastos Registrados</span>
                  <p className="text-lg font-black text-rose-800 dark:text-rose-300 font-mono mt-1">
                    {formatCurrency(totalSpent)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                  <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Lucro Real Líquido</span>
                  <p className="text-lg font-black text-blue-800 dark:text-blue-300 font-mono mt-1">
                    {formatCurrency(realProfit)}
                  </p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                    Margem: {profitMargin}%
                  </p>
                </div>
              </div>

              {/* Add Expense Form for this project */}
              <form
                onSubmit={handleAddExpense}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-end gap-3 text-xs"
              >
                <div className="flex-1 w-full">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Lançar Gasto Nesta Obra
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Compra de 10 sacos de argamassa, Diária de eletricista..."
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="w-full sm:w-36">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Categoria
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Material" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Material</option>
                    <option value="Mão de obra" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Mão de obra</option>
                    <option value="Equipamento" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Equipamento</option>
                    <option value="Outros" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Outros</option>
                  </select>
                </div>

                <div className="w-full sm:w-36">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={expenseAmount || ''}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-right placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    placeholder="R$ 0,00"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shrink-0 cursor-pointer shadow-xs active:scale-95"
                >
                  Lançar Gasto
                </button>
              </form>

              {/* Transactions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Lançamentos Financeiros da Obra
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 text-xs">
                  {projectExpenses.length === 0 && projectEntries.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      Nenhum lançamento vinculado a esta obra ainda.
                    </div>
                  ) : (
                    <>
                      {projectEntries.map((e) => (
                        <div key={e.id} className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                              ENTRADA
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-white">
                              {e.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-emerald-600">
                              + {formatCurrency(e.amount)}
                            </span>
                            <Badge status={e.status} size="sm" />
                          </div>
                        </div>
                      ))}

                      {projectExpenses.map((ex) => (
                        <div key={ex.id} className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-bold text-[10px]">
                              {ex.category.toUpperCase()}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-white">
                              {ex.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-rose-600">
                              - {formatCurrency(ex.amount)}
                            </span>
                            <Badge status={ex.status} size="sm" />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DIÁRIO DE OBRA */}
          {activeTab === 'diary' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Diário de Obra e Ocorrências
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registre diariamente as atividades executadas, funcionários presentes e imprevistos
                  </p>
                </div>
              </div>

              {/* Add Diary Form */}
              <form
                onSubmit={handleAddDiary}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Data do Relato
                    </label>
                    <input
                      type="date"
                      value={diaryDate}
                      onChange={(e) => setDiaryDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Equipe Presente (separar por vírgula)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: João, Marcos, Anderson"
                      value={diaryWorkers}
                      onChange={(e) => setDiaryWorkers(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    O que foi executado hoje? *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Descreva as etapas trabalhadas no dia..."
                    value={diaryDescription}
                    onChange={(e) => setDiaryDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Imprevistos ou Problemas Encontrados (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Falta de energia temporária no condomínio"
                    value={diaryIssues}
                    onChange={(e) => setDiaryIssues(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Salvar Relato Diário
                  </button>
                </div>
              </form>

              {/* Diary Entries List */}
              <div className="space-y-3">
                {project.daily_logs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    Nenhum relato diário registrado até o momento.
                  </div>
                ) : (
                  project.daily_logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {formatDate(log.date)}
                        </span>
                        {log.workers_present && log.workers_present.length > 0 && (
                          <span className="text-slate-400 text-[11px]">
                            Equipe: {log.workers_present.join(', ')}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        {log.description}
                      </p>

                      {log.issues_encountered && (
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Ocorrência: {log.issues_encountered}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: MATERIAIS */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Materiais e Insumos da Obra
              </h3>
              <p className="text-xs text-slate-500">
                Lista de materiais cotados e utilizados para a execução dos serviços
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 text-xs">
                {projectExpenses
                  .filter((e) => e.category === 'Material')
                  .map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {item.description}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                {projectExpenses.filter((e) => e.category === 'Material').length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    Nenhum material lançado ainda. Use a aba &quot;Financeiro&quot; para registrar gastos de insumos.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: EQUIPE */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Equipe Envolvida
              </h3>
              <p className="text-xs text-slate-500">
                Profissionais alocados para a gestão e execução operacional desta obra
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                    {project.responsible_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {project.responsible_name}
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                      Responsável Técnico / Encarregado
                    </p>
                  </div>
                </div>

                {users
                  .filter((u) => u.name !== project.responsible_name)
                  .slice(0, 2)
                  .map((u) => (
                    <div key={u.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {u.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {u.role}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
