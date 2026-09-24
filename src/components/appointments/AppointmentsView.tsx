import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentStatus, AppointmentType } from '../../types';
import { Badge } from '../common/Badge';
import { WhatsAppButton } from '../common/WhatsAppButton';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  MapPin,
  User,
  FileText,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Phone,
  DollarSign,
} from 'lucide-react';
import { formatTime, formatDate, formatPhone, formatCurrency } from '../../lib/utils';

export const AppointmentsView: React.FC = () => {
  const {
    appointments,
    clients,
    users,
    company,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    openQuickAction,
    pendingAppointmentPrefill,
    setPendingAppointmentPrefill,
  } = useApp();

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  // Form State
  const [formData, setFormData] = useState({
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

  const handleOpenCreateWithPrefill = (prefill: { clientId?: string; clientName?: string; phone?: string; address?: string }) => {
    setEditingAppointment(null);
    const initialUser = users[0];
    setFormData({
      client_id: prefill.clientId || '',
      client_name: prefill.clientName || '',
      phone: prefill.phone || '',
      whatsapp: prefill.phone || '',
      address: prefill.address || '',
      service_type: 'Visita técnica',
      value: 0,
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      responsible_id: initialUser?.id || '',
      responsible_name: initialUser?.name || '',
      status: 'Agendado',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  React.useEffect(() => {
    if (pendingAppointmentPrefill) {
      handleOpenCreateWithPrefill(pendingAppointmentPrefill);
      setPendingAppointmentPrefill(null);
    }
  }, [pendingAppointmentPrefill]);

  const handleClientSelect = (clientId: string) => {
    const c = clients.find((client) => client.id === clientId);
    if (c) {
      setFormData({
        ...formData,
        client_id: c.id,
        client_name: c.name,
        phone: c.phone,
        whatsapp: c.whatsapp || c.phone,
        address: `${c.address}, ${c.number} - ${c.neighborhood}, ${c.city}`,
      });
    }
  };

  const handleOpenCreate = () => {
    setEditingAppointment(null);
    const initialClient = clients[0];
    const initialUser = users[0];
    setFormData({
      client_id: initialClient?.id || '',
      client_name: initialClient?.name || '',
      phone: initialClient?.phone || '',
      whatsapp: initialClient?.whatsapp || initialClient?.phone || '',
      address: initialClient ? `${initialClient.address}, ${initialClient.number} - ${initialClient.city}` : '',
      service_type: 'Visita técnica',
      value: 0,
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      responsible_id: initialUser?.id || '',
      responsible_name: initialUser?.name || '',
      status: 'Agendado',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (app: Appointment) => {
    setEditingAppointment(app);
    setFormData({
      client_id: app.client_id,
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
    setIsCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name.trim()) return;

    const payload = {
      ...formData,
      value: Number(formData.value) || 0,
    };

    if (editingAppointment) {
      updateAppointment(editingAppointment.id, payload);
    } else {
      addAppointment({
        company_id: company.id,
        ...payload,
      });
    }
    setIsCreateModalOpen(false);
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchStatus = selectedStatus === 'all' || a.status.toLowerCase() === selectedStatus.toLowerCase();
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        a.client_name.toLowerCase().includes(q) ||
        a.service_type.toLowerCase().includes(q) ||
        a.address.toLowerCase().includes(q) ||
        a.responsible_name.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [appointments, selectedStatus, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Agenda Operacional e Visitas Técnicas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Organize compromissos, visitas de orçamentos e inícios de obras com aviso via WhatsApp
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, tipo de serviço, endereço ou responsável..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['all', 'agendado', 'confirmado', 'concluído', 'cancelado'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {st === 'all' ? 'Todos' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAppointments.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Nenhum agendamento encontrado
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Marque visitas técnicas e inícios de obras para sincronizar a equipe.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar Visita
            </button>
          </div>
        ) : (
          filteredAppointments.map((app) => (
            <div
              key={app.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      <Clock className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatDate(app.date)} às {formatTime(app.time)}
                      </p>
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {app.service_type}
                      </p>
                    </div>
                  </div>

                  <Badge status={app.status} size="sm" />
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {app.client_name}
                  </p>

                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>{formatPhone(app.phone)}</span>
                  </div>

                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                    <span className="line-clamp-2">{app.address}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 pt-1">
                    <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>Responsável: <strong className="text-slate-700 dark:text-slate-300">{app.responsible_name}</strong></span>
                  </div>

                  {app.notes && (
                    <p className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-[11px] italic mt-1 line-clamp-2">
                      &quot;{app.notes}&quot;
                    </p>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 font-medium">Valor previsto:</span>
                    {app.value && app.value > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(app.value)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Não informado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <WhatsAppButton
                  phone={app.whatsapp || app.phone}
                  message={`Olá, ${app.client_name}. Confirmamos seu agendamento de ${app.service_type} para ${formatDate(app.date)} às ${formatTime(app.time)}. Qualquer dúvida estamos à disposição!`}
                  size="sm"
                  label="WhatsApp"
                />

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      openQuickAction('newQuote', {
                        clientId: app.client_id,
                        clientName: app.client_name,
                        phone: app.phone,
                        address: app.address,
                      })
                    }
                    className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
                    title="Criar orçamento a partir do agendamento"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Orçamento</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(app)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Editar agendamento"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setAppointmentToDelete(app)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Excluir agendamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Agendar */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento / Visita'}
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
                    Selecionar Cliente Cadastrado
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => handleClientSelect(e.target.value)}
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
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Endereço da Visita *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Tipo de Agendamento
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Visita técnica" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Visita técnica</option>
                    <option value="Orçamento no local" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Orçamento no local</option>
                    <option value="Início de obra" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Início de obra</option>
                    <option value="Reunião com cliente" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Reunião com cliente</option>
                    <option value="Manutenção" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Manutenção</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Agendado" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Agendado</option>
                    <option value="Confirmado" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Confirmado</option>
                    <option value="Concluído" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Concluído</option>
                    <option value="Cancelado" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Horário *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Valor da Visita / Serviço Previsto (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={formData.value || ''}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-emerald-600 dark:text-emerald-400 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Este valor entrará na contabilidade do dia selecionado e nas metas de faturamento diário no Calendário.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Responsável pela Visita
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
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Instruções para o técnico ou observações do cliente"
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
                  {editingAppointment ? 'Salvar Alterações' : 'Confirmar Agendamento'}
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
