import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import {
  Users,
  Plus,
  Search,
  ShieldCheck,
  Phone,
  Mail,
  Edit2,
  Trash2,
  UserCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { formatPhone, generateId } from '../../lib/utils';

export const TeamView: React.FC = () => {
  const { users, currentUser, setCurrentUser, company, addUser, updateUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('FUNCIONÁRIO');
  const [avatar, setAvatar] = useState('');

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('FUNCIONÁRIO');
    setAvatar('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone || '');
    setRole(u.role);
    setAvatar(u.avatar || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (editingUser) {
      updateUser(editingUser.id, {
        name,
        email,
        phone,
        whatsapp: phone,
        role,
        avatar,
      });
    } else {
      addUser({
        company_id: company.id,
        name,
        email,
        phone,
        whatsapp: phone,
        role,
        avatar: avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        active: true,
      });
    }
    setIsModalOpen(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Equipe e Níveis de Permissão
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Controle de acesso granular por papel (Administrador, Gerente, Orçamentista e Funcionário)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Membro da Equipe</span>
        </button>
      </div>

      {/* Role explanation banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs">
        <div>
          <span className="font-bold text-blue-900 dark:text-blue-300 block mb-0.5">ADMINISTRADOR</span>
          <p className="text-slate-600 dark:text-slate-400">Acesso completo a todas as funções, relatórios e configurações.</p>
        </div>
        <div>
          <span className="font-bold text-blue-900 dark:text-blue-300 block mb-0.5">GERENTE</span>
          <p className="text-slate-600 dark:text-slate-400">Supervisão de Obras, Orçamentos, Agenda e Financeiro da empresa.</p>
        </div>
        <div>
          <span className="font-bold text-blue-900 dark:text-blue-300 block mb-0.5">ORÇAMENTISTA</span>
          <p className="text-slate-600 dark:text-slate-400">Gerenciamento de Clientes, Propostas Comerciais e Agendamento de visitas.</p>
        </div>
        <div>
          <span className="font-bold text-blue-900 dark:text-blue-300 block mb-0.5">FUNCIONÁRIO</span>
          <p className="text-slate-600 dark:text-slate-400">Visualiza exclusivamente obras, tarefas atribuídas e diário operacional.</p>
        </div>
      </div>

      {/* Simulation Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold">Simular Perfil no Sistema</p>
            <p className="text-[11px] text-slate-300">
              Alterne seu perfil ativo para testar a experiência e as permissões de cada função em tempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Logado como:</span>
          <select
            value={currentUser?.id}
            onChange={(e) => {
              const u = users.find((user) => user.id === e.target.value);
              if (u) setCurrentUser(u);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredUsers.map((user) => {
          const isMe = user.id === currentUser?.id;
          return (
            <div
              key={user.id}
              className={`rounded-2xl border p-5 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between transition-all ${
                isMe
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                    alt={user.name}
                    className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {user.name}
                      </h3>
                      {isMe && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          VOCÊ
                        </span>
                      )}
                    </div>
                    <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{formatPhone(user.phone)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setCurrentUser(user)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    isMe
                      ? 'text-slate-400 cursor-default'
                      : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                  }`}
                >
                  {isMe ? 'Ativo no momento' : 'Usar este perfil'}
                </button>

                <button
                  onClick={() => handleOpenEdit(user)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Editar membro"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Cadastrar / Editar Membro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingUser ? 'Editar Membro da Equipe' : 'Cadastrar Membro'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Lucas Ferreira"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  E-mail de Login *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lucas@ozigestao.com.br"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Nível de Acesso (Cargo)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="ADMINISTRADOR" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">ADMINISTRADOR (Acesso Total)</option>
                  <option value="GERENTE" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">GERENTE (Obras, Orçamentos, Agenda, Financeiro)</option>
                  <option value="ORÇAMENTISTA" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">ORÇAMENTISTA (Clientes, Orçamentos, Agenda)</option>
                  <option value="FUNCIONÁRIO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">FUNCIONÁRIO (Obras e Tarefas)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Foto de Perfil (URL)
                </label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
