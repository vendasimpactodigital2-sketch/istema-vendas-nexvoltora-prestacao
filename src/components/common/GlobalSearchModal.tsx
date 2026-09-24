import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, User, FileText, Hammer, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Badge } from './Badge';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    clients,
    quotes,
    projects,
    appointments,
    setActiveTab,
    openQuickAction,
  } = useApp();

  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { clients: [], quotes: [], projects: [], appointments: [] };

    const matchedClients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.document.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
    );

    const matchedQuotes = quotes.filter(
      (qt) =>
        qt.code.toLowerCase().includes(q) ||
        qt.client_name.toLowerCase().includes(q) ||
        qt.client_phone.toLowerCase().includes(q) ||
        qt.client_address.toLowerCase().includes(q)
    );

    const matchedProjects = projects.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );

    const matchedAppointments = appointments.filter(
      (a) =>
        a.client_name.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.service_type.toLowerCase().includes(q) ||
        a.address.toLowerCase().includes(q)
    );

    return {
      clients: matchedClients.slice(0, 5),
      quotes: matchedQuotes.slice(0, 5),
      projects: matchedProjects.slice(0, 5),
      appointments: matchedAppointments.slice(0, 5),
    };
  }, [query, clients, quotes, projects, appointments]);

  if (!isSearchOpen) return null;

  const totalResults =
    results.clients.length +
    results.quotes.length +
    results.projects.length +
    results.appointments.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquise por cliente, telefone, CPF/CNPJ, nº do orçamento, obra ou endereço..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden text-sm sm:text-base"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!query && (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              Digite um termo para pesquisar em toda a base da empresa...
            </div>
          )}

          {query && totalResults === 0 && (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              Nenhum resultado encontrado para &quot;{query}&quot;.
            </div>
          )}

          {/* Matched Clients */}
          {results.clients.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Clientes ({results.clients.length})
              </p>
              <div className="space-y-1">
                {results.clients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setActiveTab('clients');
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-blue-600">
                          {client.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {client.phone} • {client.city || 'São Paulo'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Quotes */}
          {results.quotes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Orçamentos ({results.quotes.length})
              </p>
              <div className="space-y-1">
                {results.quotes.map((quote) => (
                  <div
                    key={quote.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setActiveTab('quotes');
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600">
                            {quote.code}
                          </span>
                          <Badge status={quote.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {quote.client_name} • R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Projects */}
          {results.projects.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Obras ({results.projects.length})
              </p>
              <div className="space-y-1">
                {results.projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setActiveTab('projects');
                      openQuickAction('viewProject', project);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                        <Hammer className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-amber-600">
                            {project.code}
                          </span>
                          <span className="text-xs text-slate-500">Progresso: {project.progress}%</span>
                          <Badge status={project.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {project.client_name} • {project.address}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Appointments */}
          {results.appointments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Agenda ({results.appointments.length})
              </p>
              <div className="space-y-1">
                {results.appointments.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setActiveTab('appointments');
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-indigo-600">
                          {app.service_type} - {app.client_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {app.date} às {app.time} • {app.responsible_name}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
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
