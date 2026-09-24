export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr: string | undefined | null): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

export function cleanPhone(phone?: string | null): string {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = cleanPhone(phone);
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return String(phone);
}

export function getWhatsAppLink(phone?: string | null, message?: string): string {
  let cleaned = cleanPhone(phone);
  if (!cleaned) return '#';
  if (!cleaned.startsWith('55') && cleaned.length >= 10) {
    cleaned = '55' + cleaned;
  }
  const encoded = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${cleaned}${encoded}`;
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function calculateMargin(revenue: number, costs: number): number {
  if (!revenue || revenue <= 0) return 0;
  const profit = revenue - costs;
  return Math.round((profit / revenue) * 10000) / 100;
}

export function getStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status.toLowerCase()) {
    case 'aprovado':
    case 'concluída':
    case 'concluido':
    case 'recebido':
    case 'pago':
    case 'realizado':
      return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
    case 'em andamento':
    case 'em elaboração':
    case 'em atendimento':
    case 'confirmado':
      return { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' };
    case 'novo':
    case 'agendada':
    case 'agendado':
    case 'aguardando resposta':
    case 'enviado':
    case 'pendente':
      return { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
    case 'recusado':
    case 'cancelada':
    case 'cancelado':
    case 'vencido':
    case 'atrasada':
      return { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' };
    case 'pausada':
    case 'reagendado':
      return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' };
    default:
      return { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
  }
}
