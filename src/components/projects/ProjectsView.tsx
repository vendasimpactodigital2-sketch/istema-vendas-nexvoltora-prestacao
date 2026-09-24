import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Project, ProjectStatus } from '../../types';
import { Badge } from '../common/Badge';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { ProjectDetailModal } from './ProjectDetailModal';
import {
  HardHat,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { formatCurrency, formatDate, generateId } from '../../lib/utils';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    clients,
    users,
    company,
    addProject,
    updateProject,
    deleteProject,
    financialEntries,
    financialExpenses,
  } = useApp();

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    client_name: '',
    client_phone: '',
    address: '',
    start_date: new Date().toISOString().split('T')[0],
    expected_completion_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    responsible_id: '',
    responsible_name: '',
    status: 'Em andamento' as ProjectStatus,
    total_value: 0,
    progress: 0,
    notes: '',
  });

  // Client select pre-fill
  const handleClientChange = (cId: string) => {
    const c = clients.find((client) => client.id === cId);
    if (c) {
      setFormData({
        ...formData,
        client_id: c.id,
        client_name: c.name,
        client_phone: c.whatsapp || c.phone,
        address: `${c.address}, ${c.number} - ${c.neighborhood}, ${c.city}`,
      });
    }
  };

  const handleOpenCreate = () => {
    setEditingProject(null);
    const initialClient = clients[0];
    const initialUser = users[0];
    setFormData({
      name: '',
      client_id: initialClient?.id || '',
      client_name: initialClient?.name || '',
      client_phone: initialClient?.whatsapp || initialClient?.phone || '',
      address: initialClient ? `${initialClient.address}, ${initialClient.number} - ${initialClient.city}` : '',
      start_date: new Date().toISOString().split('T')[0],
      expected_completion_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      responsible_id: initialUser?.id || '',
      responsible_name: initialUser?.name || '',
      status: 'Em andamento',
      total_value: 10000,
      progress: 0,
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setFormData({
      name: p.name,
      client_id: p.client_id,
      client_name: p.client_name,
      client_phone: p.client_phone,
      address: p.address,
      start_date: p.start_date,
      expected_completion_date: p.expected_completion_date,
      responsible_id: p.responsible_id,
      responsible_name: p.responsible_name,
      status: p.status,
      total_value: p.total_value,
      progress: p.progress,
      notes: p.notes || '',
    });
    setIsCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProject) {
      updateProject(editingProject.id, formData);
    } else {
      addProject({
        company_id: company.id,
        ...formData,
        tasks: [
          { id: generateId('task'), title: 'Alinhamento e início operacional', completed: false },
          { id: generateId('task'), title: 'Execução das etapas principais', completed: false },
          { id: generateId('task'), title: 'Vistoria e entrega técnica final', completed: false },
        ],
        photos: [],
        daily_logs: [],
      });
    }
    setIsCreateModalOpen(false);
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchStatus = selectedStatus === 'all' || p.status.toLowerCase() === selectedStatus.toLowerCase();
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [projects, selectedStatus, searchTerm]);

  const statuses = [
    { id: 'all', label: 'Todas as Obras' },
    { id: 'agendada', label: 'Agendadas' },
    { id: 'em andamento', label: 'Em andamento' },
    { id: 'atrasada', label: 'Atrasadas' },
    { id: 'pausada', label: 'Pausadas' },
    { id: 'concluída', label: 'Concluídas' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Gestão de Obras e Reformas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhe progresso, diário de obra, fotos de antes/depois e o lucro real de cada projeto
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Obra</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStatus(s.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === s.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar obra por código (ex: OBR-2025-001), nome, cliente ou endereço..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Projects Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
            <HardHat className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Nenhuma obra encontrada
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Cadastre sua primeira obra ou converta um orçamento aprovado com 1 clique.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar Obra
            </button>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const projectEntries = financialEntries.filter((e) => e.project_id === project.id);
            const projectExpenses = financialExpenses.filter((e) => e.project_id === project.id);

            const received = projectEntries
              .filter((e) => e.status === 'Recebido')
              .reduce((acc, curr) => acc + curr.amount, 0);

            const spent = projectExpenses
              .filter((e) => e.status === 'Pago')
              .reduce((acc, curr) => acc + curr.amount, 0);

            const profit = received - spent;

            return (
              <div
                key={project.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                          {project.code}
                        </span>
                        <Badge status={project.status} size="sm" />
                      </div>
                      <h3
                        onClick={() => setSelectedProject(project)}
                        className="text-base font-bold text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {project.name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                        Cliente: {project.client_name}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{project.address}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(project)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Editar obra"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setProjectToDelete(project)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Excluir obra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Progresso</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Mini Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Contratado</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(project.total_value)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-500 font-medium block">Gastos</span>
                      <span className="font-mono font-bold text-rose-600">
                        {formatCurrency(spent)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-500 font-medium block">Lucro Real</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatCurrency(profit)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Início: {formatDate(project.start_date)}</span>
                    <span>Prazo: {formatDate(project.expected_completion_date)}</span>
                    <span>Resp: {project.responsible_name}</span>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <WhatsAppButton
                    phone={project.client_phone}
                    message={`Olá, ${project.client_name}! Atualização sobre o andamento da sua obra "${project.name}": estamos com ${project.progress}% concluído.`}
                    size="sm"
                    label="WhatsApp"
                  />

                  <button
                    onClick={() => setSelectedProject(project)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Ver Detalhes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Criar / Editar Obra */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingProject ? `Editar Obra: ${editingProject.code}` : 'Cadastrar Nova Obra'}
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Nome / Título da Obra *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Reforma de Cozinha e Banheiro - Res. Jardins"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Cliente Cadastrado
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Selecione um cliente...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {c.name} - {c.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Telefone / WhatsApp do Cliente
                  </label>
                  <input
                    type="text"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Endereço da Obra *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número, complemento, bairro e cidade"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Previsão de Término
                  </label>
                  <input
                    type="date"
                    value={formData.expected_completion_date}
                    onChange={(e) => setFormData({ ...formData, expected_completion_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Responsável / Encarregado
                  </label>
                  <select
                    value={formData.responsible_name}
                    onChange={(e) => {
                      const u = users.find((user) => user.name === e.target.value);
                      setFormData({
                        ...formData,
                        responsible_id: u?.id || '',
                        responsible_name: e.target.value,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Status Operacional
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Agendada" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Agendada</option>
                    <option value="Em andamento" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Em andamento</option>
                    <option value="Pausada" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Pausada</option>
                    <option value="Atrasada" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Atrasada</option>
                    <option value="Concluída" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Concluída</option>
                    <option value="Cancelada" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Valor Total da Obra (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_value}
                    onChange={(e) => setFormData({ ...formData, total_value: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Progresso Inicial (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Notas e Instruções da Obra
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Instruções de acesso ao imóvel, regras do condomínio, etc."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  {editingProject ? 'Salvar Alterações' : 'Cadastrar Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project 7-Tab Details Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {/* Modal de Confirmação para Excluir Obra */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Excluir Obra
                </h3>
                <p className="text-xs text-slate-500">
                  Ação definitiva e irreversível
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir a obra <strong className="text-slate-900 dark:text-white">{projectToDelete.name}</strong> ({projectToDelete.code})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Sim, Excluir Obra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
