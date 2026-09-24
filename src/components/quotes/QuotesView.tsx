import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Quote, QuoteItem, QuoteStatus, ClientMaterialItem, ClientExtraExpense } from '../../types';
import { Badge } from '../common/Badge';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { QuotePrintModal } from './QuotePrintModal';
import {
  FileText,
  Plus,
  Search,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  HardHat,
  Edit2,
  Trash2,
  Trash,
  Calendar,
  DollarSign,
  User,
  UserPlus,
  ArrowRight,
  X,
  Share2,
  Package,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  Receipt,
  Camera,
  Loader2,
  RotateCcw,
  Check,
} from 'lucide-react';
import { formatCurrency, formatDate, generateId } from '../../lib/utils';
import { ReceiptScannerModal } from './ReceiptScannerModal';
import { directDownloadQuotePdf } from '../../utils/pdfDownloader';

export const QuotesView: React.FC = () => {
  const {
    quotes,
    clients,
    users,
    company,
    addQuote,
    updateQuote,
    deleteQuote,
    approveQuote,
    rejectQuote,
    duplicateQuote,
    convertToProject,
    setActiveTab,
    openQuickAction,
    quickActionModal,
    closeQuickAction,
    pendingQuotePrefill,
    setPendingQuotePrefill,
    addClient,
  } = useApp();

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManualClient, setIsManualClient] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [printingQuote, setPrintingQuote] = useState<Quote | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);

  const handleDirectDownload = async (quoteToDownload: Quote) => {
    try {
      setDownloadingQuoteId(quoteToDownload.id);
      await directDownloadQuotePdf(quoteToDownload, company);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
    } finally {
      setDownloadingQuoteId(null);
    }
  };

  useEffect(() => {
    if (pendingQuotePrefill) {
      openNewModal(pendingQuotePrefill);
      setPendingQuotePrefill(null);
    } else if (quickActionModal === 'newQuote') {
      openNewModal();
      closeQuickAction();
    }
  }, [pendingQuotePrefill, quickActionModal]);

  // Extra item boxes (Itens e Serviços Adicionados - Imagem 2)
  const [extraBoxes, setExtraBoxes] = useState<{ id: string; title: string; items: QuoteItem[] }[]>([]);

  // Form State for Create / Edit
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]
  );
  const [responsibleId, setResponsibleId] = useState(users[0]?.id || '');
  const [responsibleName, setResponsibleName] = useState(users[0]?.name || '');
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('30% de sinal no ato da contratação e 70% na conclusão da obra');
  const [downPaymentOption, setDownPaymentOption] = useState<'30' | '50' | 'custom' | 'none'>('30');
  const [customSignalType, setCustomSignalType] = useState<'percent' | 'value'>('percent');
  const [customSignalValue, setCustomSignalValue] = useState<string>('');
  const [executionPeriod, setExecutionPeriod] = useState('');
  const [status, setStatus] = useState<QuoteStatus>('Novo');
  const [discount, setDiscount] = useState<number>(0);
  const [addition, setAddition] = useState<number>(0);

  // Items list
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', description: '', quantity: 1, unit: 'm²', unit_price: 0, total_price: 0 },
  ]);

  // Materiais por conta do cliente (A Comprar)
  const [clientMaterials, setClientMaterials] = useState<ClientMaterialItem[]>([]);

  // Despesas e gastos à parte pagos pelo cliente
  const [clientExpenses, setClientExpenses] = useState<ClientExtraExpense[]>([]);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState<boolean>(false);

  const handleAddExpensesFromReceipt = (
    scannedItems: Array<{
      description: string;
      quantity: number;
      unit: string;
      unit_price: number;
      total_price: number;
    }>
  ) => {
    const newItems: ClientExtraExpense[] = scannedItems.map((it) => ({
      id: generateId('exp'),
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      total_price: it.total_price,
    }));
    setClientExpenses((prev) => [...prev, ...newItems]);
  };

  // Handle client selection
  const handleClientSelect = (selectedId: string) => {
    setClientId(selectedId);
    const found = clients.find((c) => c.id === selectedId);
    if (found) {
      setClientName(found.name);
      setClientPhone(found.whatsapp || found.phone);
      setClientAddress(`${found.address}, ${found.number} - ${found.neighborhood}, ${found.city}`);
    }
  };

  // Item additions & calculations for Caixa 1 (Serviços e Materiais)
  const addItem = () => {
    const newItem: QuoteItem = {
      id: generateId('item'),
      description: '',
      quantity: 1,
      unit: 'm²',
      unit_price: 0,
      total_price: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      const q = field === 'quantity' ? Number(value) : current.quantity;
      const u = field === 'unit_price' ? Number(value) : current.unit_price;
      current.total_price = Math.round((Number(q) || 0) * (Number(u) || 0) * 100) / 100;
    }
    updated[index] = current;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      setItems([{ id: generateId('item'), description: '', quantity: 1, unit: 'm²', unit_price: 0, total_price: 0 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Extra item boxes methods (Imagem 2)
  const addExtraBox = () => {
    const boxId = generateId('box');
    setExtraBoxes((prev) => [
      ...prev,
      {
        id: boxId,
        title: 'Itens e Serviços Adicionados',
        items: [
          {
            id: generateId('item'),
            description: '',
            quantity: 1,
            unit: 'un',
            unit_cost: 0,
            unit_price: 0,
            total_price: 0,
            group_id: boxId,
            group_title: 'Itens e Serviços Adicionados',
          },
        ],
      },
    ]);
  };

  const removeExtraBox = (boxId: string) => {
    setExtraBoxes((prev) => prev.filter((b) => b.id !== boxId));
  };

  const addBoxItem = (boxId: string) => {
    setExtraBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== boxId) return box;
        return {
          ...box,
          items: [
            ...box.items,
            {
              id: generateId('item'),
              description: '',
              quantity: 1,
              unit: 'un',
              unit_cost: 0,
              unit_price: 0,
              total_price: 0,
              group_id: box.id,
              group_title: box.title,
            },
          ],
        };
      })
    );
  };

  const updateBoxItem = (boxId: string, index: number, field: keyof QuoteItem, value: any) => {
    setExtraBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== boxId) return box;
        const updated = [...box.items];
        const current = { ...updated[index], [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          const q = field === 'quantity' ? Number(value) : current.quantity;
          const u = field === 'unit_price' ? Number(value) : current.unit_price;
          current.total_price = Math.round((Number(q) || 0) * (Number(u) || 0) * 100) / 100;
        }
        updated[index] = current;
        return { ...box, items: updated };
      })
    );
  };

  const removeBoxItem = (boxId: string, index: number) => {
    setExtraBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== boxId) return box;
        if (box.items.length <= 1) {
          return {
            ...box,
            items: [
              {
                id: generateId('item'),
                description: '',
                quantity: 1,
                unit: 'un',
                unit_cost: 0,
                unit_price: 0,
                total_price: 0,
                group_id: box.id,
                group_title: box.title,
              },
            ],
          };
        }
        return {
          ...box,
          items: box.items.filter((_, i) => i !== index),
        };
      })
    );
  };

  // Materiais por conta do cliente (A Comprar) - Funções
  const addClientMaterial = () => {
    setClientMaterials((prev) => [
      ...prev,
      {
        id: generateId('mat'),
        description: '',
        quantity: 1,
        unit: 'lata',
        estimated_price: 0,
        total_price: 0,
      },
    ]);
  };

  const updateClientMaterial = (index: number, field: keyof ClientMaterialItem, value: any) => {
    setClientMaterials((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'estimated_price') {
        const q = field === 'quantity' ? Number(value) : item.quantity;
        const p = field === 'estimated_price' ? Number(value) : item.estimated_price;
        item.total_price = Math.round((Number(q) || 0) * (Number(p) || 0) * 100) / 100;
      }
      updated[index] = item;
      return updated;
    });
  };

  const removeClientMaterial = (index: number) => {
    setClientMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  const loadMaterialExamples = () => {
    const examples: ClientMaterialItem[] = [
      { id: generateId('mat'), description: 'Tinta Acrílica Fosca Lavável Premium (Lata 18L)', quantity: 2, unit: 'lata', estimated_price: 420.00, total_price: 840.00 },
      { id: generateId('mat'), description: 'Massa Corrida PVA / Acrílica para Paredes (Barrica 25kg)', quantity: 3, unit: 'barrica', estimated_price: 95.00, total_price: 285.00 },
      { id: generateId('mat'), description: 'Selador Acrílico Branco Fosco (Galão 3.6L)', quantity: 2, unit: 'galão', estimated_price: 68.00, total_price: 136.00 },
      { id: generateId('mat'), description: 'Lixas para Parede Grão 150 e 220', quantity: 15, unit: 'un', estimated_price: 3.50, total_price: 52.50 },
      { id: generateId('mat'), description: 'Fita Crepe para Pintura e Isolamento 48mm x 50m', quantity: 6, unit: 'rolo', estimated_price: 18.00, total_price: 108.00 },
      { id: generateId('mat'), description: 'Lona Plástica para Proteção de Pisos e Móveis', quantity: 2, unit: 'rolo', estimated_price: 45.00, total_price: 90.00 },
    ];
    setClientMaterials((prev) => [...prev, ...examples]);
  };

  // Despesas e Gastos Pagos à Parte pelo Cliente - Funções
  const addClientExpense = () => {
    setClientExpenses((prev) => [
      ...prev,
      {
        id: generateId('exp'),
        description: '',
        quantity: 1,
        unit: 'un',
        unit_price: 0,
        total_price: 0,
      },
    ]);
  };

  const updateClientExpense = (index: number, field: keyof ClientExtraExpense, value: any) => {
    setClientExpenses((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        const q = field === 'quantity' ? Number(value) : item.quantity;
        const p = field === 'unit_price' ? Number(value) : item.unit_price;
        item.total_price = Math.round((Number(q) || 0) * (Number(p) || 0) * 100) / 100;
      }
      updated[index] = item;
      return updated;
    });
  };

  const removeClientExpense = (index: number) => {
    setClientExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  const loadExpenseExamples = () => {
    const examples: ClientExtraExpense[] = [
      { id: generateId('exp'), description: 'Caçamba Estacionária para Descarte de Resíduos e Entulho', quantity: 1, unit: 'un', unit_price: 380.00, total_price: 380.00 },
      { id: generateId('exp'), description: 'Frete e Transporte de Materiais Pesados na Obra', quantity: 1, unit: 'viagem', unit_price: 150.00, total_price: 150.00 },
      { id: generateId('exp'), description: 'Aluguel de Andaime Tubular e Guarda-Corpo', quantity: 1, unit: 'semana', unit_price: 420.00, total_price: 420.00 },
      { id: generateId('exp'), description: 'Taxa de ART / RRT de Responsabilidade Técnica', quantity: 1, unit: 'taxa', unit_price: 250.00, total_price: 250.00 },
    ];
    setClientExpenses((prev) => [...prev, ...examples]);
  };

  const clientMaterialsTotal = useMemo(() => {
    return clientMaterials.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0);
  }, [clientMaterials]);

  const clientExpensesTotal = useMemo(() => {
    return clientExpenses.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0);
  }, [clientExpenses]);

  // Calculations across Caixa 1 and all Extra Boxes
  const subtotal = useMemo(() => {
    const primarySum = items.reduce((acc, it) => acc + (it.total_price || 0), 0);
    const extraSum = extraBoxes.reduce((acc, box) => {
      return acc + box.items.reduce((bAcc, it) => bAcc + (it.total_price || 0), 0);
    }, 0);
    return primarySum + extraSum;
  }, [items, extraBoxes]);

  const total = useMemo(() => {
    return Math.max(0, subtotal + clientExpensesTotal - Number(discount || 0) + Number(addition || 0));
  }, [subtotal, clientExpensesTotal, discount, addition]);

  // Cálculo automático do Sinal / Entrada e Saldo Restante
  const downPaymentCalculation = useMemo(() => {
    let percent = 30;
    let value = 0;

    if (downPaymentOption === '30') {
      percent = 30;
      value = Math.round(total * 0.3 * 100) / 100;
    } else if (downPaymentOption === '50') {
      percent = 50;
      value = Math.round(total * 0.5 * 100) / 100;
    } else if (downPaymentOption === 'custom') {
      const num = parseFloat(customSignalValue.replace(',', '.')) || 0;
      if (customSignalType === 'percent') {
        percent = num;
        value = Math.round(total * (num / 100) * 100) / 100;
      } else {
        value = Math.min(total, num);
        percent = total > 0 ? Math.round((value / total) * 100) : 0;
      }
    } else {
      percent = 0;
      value = 0;
    }

    const remaining = Math.max(0, total - value);
    return { percent, value, remaining };
  }, [total, downPaymentOption, customSignalValue, customSignalType]);

  const resetForm = () => {
    setEditingQuote(null);
    setIsManualClient(true);
    setClientId('');
    setClientName('');
    setClientPhone('');
    setClientAddress('');
    setDate(new Date().toISOString().split('T')[0]);
    setValidUntil(new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]);
    setResponsibleId(users[0]?.id || '');
    setResponsibleName(users[0]?.name || '');
    setNotes('');
    setDownPaymentOption('30');
    setCustomSignalType('percent');
    setCustomSignalValue('');
    setPaymentTerms('30% de sinal no ato da contratação e 70% na conclusão da obra');
    setExecutionPeriod('');
    setStatus('Novo');
    setDiscount(0);
    setAddition(0);
    setItems([
      { id: generateId('item'), description: '', quantity: 1, unit: 'm²', unit_price: 0, total_price: 0 },
    ]);
    setExtraBoxes([]);
    setClientMaterials([]);
    setClientExpenses([]);
  };

  const openNewModal = (prefill?: { clientId?: string; clientName?: string; phone?: string; address?: string }) => {
    resetForm();
    if (prefill && prefill.clientName) {
      setClientId(prefill.clientId || '');
      setClientName(prefill.clientName);
      setClientPhone(prefill.phone || '');
      setClientAddress(prefill.address || '');
      setIsManualClient(!prefill.clientId);
    }
    setIsCreateModalOpen(true);
  };

  const openEditModal = (quote: Quote) => {
    setEditingQuote(quote);
    setClientId(quote.client_id);
    setClientName(quote.client_name);
    setIsManualClient(!quote.client_id);
    setClientPhone(quote.client_phone);
    setClientAddress(quote.client_address);
    setDate(quote.date);
    setValidUntil(quote.valid_until);
    setResponsibleId(quote.responsible_id);
    setResponsibleName(quote.responsible_name);
    setNotes(quote.notes || '');
    setPaymentTerms(quote.payment_terms || '');
    setExecutionPeriod(quote.execution_period || '');
    setStatus(quote.status);
    setDiscount(quote.discount || 0);
    setAddition(quote.addition || 0);
    setClientMaterials(quote.client_materials ? [...quote.client_materials] : []);
    setClientExpenses(quote.client_expenses ? [...quote.client_expenses] : []);

    // Identificar e restaurar opção de sinal
    if (quote.down_payment_percent === 30) {
      setDownPaymentOption('30');
      setCustomSignalValue('');
    } else if (quote.down_payment_percent === 50) {
      setDownPaymentOption('50');
      setCustomSignalValue('');
    } else if (quote.down_payment_percent && quote.down_payment_percent > 0) {
      setDownPaymentOption('custom');
      setCustomSignalType('percent');
      setCustomSignalValue(String(quote.down_payment_percent));
    } else if (quote.down_payment_value && quote.down_payment_value > 0) {
      setDownPaymentOption('custom');
      setCustomSignalType('value');
      setCustomSignalValue(String(quote.down_payment_value));
    } else if (quote.payment_terms && quote.payment_terms.includes('50%')) {
      setDownPaymentOption('50');
      setCustomSignalValue('');
    } else if (quote.payment_terms && quote.payment_terms.includes('30%')) {
      setDownPaymentOption('30');
      setCustomSignalValue('');
    } else {
      setDownPaymentOption('30');
      setCustomSignalValue('');
    }

    // Group items into primary box and extra boxes
    const primary: QuoteItem[] = [];
    const boxesMap: Record<string, { title: string; items: QuoteItem[] }> = {};

    (quote.items || []).forEach((it) => {
      if (it.group_id && it.group_id !== 'primary') {
        if (!boxesMap[it.group_id]) {
          boxesMap[it.group_id] = {
            title: it.group_title || 'Itens e Serviços Adicionados',
            items: [],
          };
        }
        boxesMap[it.group_id].items.push(it);
      } else {
        primary.push(it);
      }
    });

    setItems(
      primary.length > 0
        ? primary
        : quote.items && quote.items.length > 0
        ? quote.items
        : [{ id: '1', description: 'Serviço técnico geral', quantity: 1, unit: 'un', unit_price: quote.total, total_price: quote.total }]
    );

    setExtraBoxes(
      Object.entries(boxesMap).map(([id, val]) => ({
        id,
        title: val.title,
        items: val.items,
      }))
    );

    setIsCreateModalOpen(true);
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    // Se o cliente foi digitado manualmente e não tem ID cadastrado, salva/cadastra o cliente
    let finalClientId = clientId;
    if (!finalClientId && clientName.trim()) {
      const existing = clients.find(
        (c) => c.name.trim().toLowerCase() === clientName.trim().toLowerCase()
      );
      if (existing) {
        finalClientId = existing.id;
      } else {
        const created = addClient({
          company_id: company.id || 'comp_ozi_01',
          name: clientName.trim(),
          document: '',
          email: '',
          phone: clientPhone.trim() || '(00) 00000-0000',
          whatsapp: clientPhone.trim() || '(00) 00000-0000',
          address: clientAddress.trim() || 'Não informado',
          number: '',
          neighborhood: '',
          city: 'Local',
          state: 'UF',
          zip_code: '',
          notes: 'Cadastrado automaticamente a partir do Orçamento de Serviço',
        });
        finalClientId = created.id;
      }
    }

    // Combine items from Caixa 1 and all extra boxes
    const allItems: QuoteItem[] = [
      ...items.map((it) => ({
        ...it,
        group_id: 'primary',
        group_title: 'Serviços e Materiais',
      })),
      ...extraBoxes.flatMap((box) =>
        box.items.map((it) => ({
          ...it,
          group_id: box.id,
          group_title: box.title || 'Itens e Serviços Adicionados',
        }))
      ),
    ];

    if (editingQuote) {
      updateQuote(editingQuote.id, {
        client_id: finalClientId,
        client_name: clientName,
        client_phone: clientPhone,
        client_address: clientAddress,
        date,
        valid_until: validUntil,
        responsible_id: responsibleId,
        responsible_name: responsibleName,
        notes,
        payment_terms: paymentTerms,
        down_payment_percent: downPaymentCalculation.percent,
        down_payment_value: downPaymentCalculation.value,
        remaining_balance: downPaymentCalculation.remaining,
        execution_period: executionPeriod,
        status,
        items: allItems,
        client_materials: clientMaterials,
        client_materials_total: clientMaterialsTotal,
        client_expenses: clientExpenses,
        client_expenses_total: clientExpensesTotal,
        subtotal,
        discount: Number(discount || 0),
        addition: Number(addition || 0),
        total,
      });
    } else {
      addQuote({
        company_id: company.id,
        client_id: finalClientId,
        client_name: clientName,
        client_phone: clientPhone,
        client_address: clientAddress,
        date,
        valid_until: validUntil,
        responsible_id: responsibleId,
        responsible_name: responsibleName,
        notes,
        payment_terms: paymentTerms,
        down_payment_percent: downPaymentCalculation.percent,
        down_payment_value: downPaymentCalculation.value,
        remaining_balance: downPaymentCalculation.remaining,
        execution_period: executionPeriod,
        status,
        items: allItems,
        client_materials: clientMaterials,
        client_materials_total: clientMaterialsTotal,
        client_expenses: clientExpenses,
        client_expenses_total: clientExpensesTotal,
        subtotal,
        discount: Number(discount || 0),
        addition: Number(addition || 0),
        total,
      });
    }
    resetForm();
    setIsCreateModalOpen(false);
  };

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchStatus = selectedStatus === 'all' || q.status.toLowerCase() === selectedStatus.toLowerCase();
      const qLower = searchTerm.trim().toLowerCase();
      const matchSearch =
        !qLower ||
        q.code.toLowerCase().includes(qLower) ||
        q.client_name.toLowerCase().includes(qLower) ||
        q.client_phone.toLowerCase().includes(qLower);
      return matchStatus && matchSearch;
    });
  }, [quotes, selectedStatus, searchTerm]);

  const statuses = [
    { id: 'all', label: 'Todos' },
    { id: 'novo', label: 'Novos' },
    { id: 'em elaboração', label: 'Em elaboração' },
    { id: 'enviado', label: 'Enviados' },
    { id: 'aguardando resposta', label: 'Aguardando resposta' },
    { id: 'aprovado', label: 'Aprovados' },
    { id: 'recusado', label: 'Recusados' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Orçamentos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Crie, envie via WhatsApp, imprima em PDF e converta orçamentos aprovados diretamente em obras
          </p>
        </div>

        <button
          onClick={() => openNewModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Orçamento</span>
        </button>
      </div>

      {/* Status Tabs and Search */}
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
            placeholder="Buscar por nº do orçamento (ex: ORC-2025-001) ou cliente..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Quotes List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredQuotes.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Nenhum orçamento encontrado
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Crie uma proposta agora com cálculos automáticos de serviços por m² ou horas.
            </p>
            <button
              onClick={() => openNewModal()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Novo Orçamento
            </button>
          </div>
        ) : (
          filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                        {quote.code}
                      </span>
                      <Badge status={quote.status} size="sm" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {quote.client_name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {quote.client_address}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Valor Total</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                      {formatCurrency(quote.total)}
                    </span>
                    {quote.down_payment_value ? (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-semibold">
                        Sinal: {formatCurrency(quote.down_payment_value)} ({quote.down_payment_percent || 30}%)
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Services mini summary */}
                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-xs space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    {quote.items.length} Serviços inclusos:
                  </p>
                  {quote.items.slice(0, 2).map((it, idx) => (
                    <div key={it.id || idx} className="flex justify-between text-slate-600 dark:text-slate-400 text-xs truncate">
                      <span className="truncate">• {it.description}</span>
                      <span className="font-mono shrink-0 ml-2 font-medium">{formatCurrency(it.total_price)}</span>
                    </div>
                  ))}
                  {quote.items.length > 2 && (
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      + {quote.items.length - 2} outros serviços...
                    </p>
                  )}
                </div>

                {/* Materiais do Cliente e Gastos à parte se existirem */}
                {((quote.client_materials && quote.client_materials.length > 0) || (quote.client_expenses && quote.client_expenses.length > 0)) && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100/70 dark:border-slate-800/70 flex flex-wrap items-center gap-1.5">
                    {quote.client_materials && quote.client_materials.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold text-[10px] border border-amber-200/80 dark:border-amber-800/50">
                        <Package className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        {quote.client_materials.length} materiais a comprar
                        {quote.client_materials_total ? ` (~${formatCurrency(quote.client_materials_total)})` : ''}
                      </span>
                    )}
                    {quote.client_expenses && quote.client_expenses.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-semibold text-[10px] border border-rose-200/80 dark:border-rose-800/50">
                        <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        {quote.client_expenses.length} gastos à parte
                        {quote.client_expenses_total ? ` (${formatCurrency(quote.client_expenses_total)})` : ''}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Data: {formatDate(quote.date)}</span>
                  <span>Válido até: <strong>{formatDate(quote.valid_until)}</strong></span>
                  <span>Resp: {quote.responsible_name}</span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <WhatsAppButton
                    phone={quote.client_phone}
                    message={`Olá, ${quote.client_name}. Tudo bem? Segue seu orçamento ${quote.code} referente ao serviço solicitado.`}
                    size="sm"
                    label="WhatsApp"
                  />

                  <button
                    onClick={() => handleDirectDownload(quote)}
                    disabled={downloadingQuoteId === quote.id}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                    title="Baixar PDF diretamente no dispositivo"
                  >
                    {downloadingQuoteId === quote.id ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                    <span>{downloadingQuoteId === quote.id ? 'Baixando...' : 'Baixar PDF'}</span>
                  </button>

                  <button
                    onClick={() => setPrintingQuote(quote)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    title="Imprimir Orçamento"
                  >
                    <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span>Imprimir</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {quote.status !== 'Aprovado' && (
                    <button
                      onClick={() => approveQuote(quote.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-semibold flex items-center gap-1"
                      title="Aprovar Orçamento"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Aprovar</span>
                    </button>
                  )}

                  {quote.status === 'Aprovado' && !quote.converted_to_project_id && (
                    <button
                      onClick={() => {
                        const newPrj = convertToProject(quote.id);
                        if (newPrj) {
                          setActiveTab('projects');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 animate-pulse"
                      title="Transformar automaticamente em obra"
                    >
                      <HardHat className="w-3.5 h-3.5" />
                      <span>Transformar em Obra</span>
                    </button>
                  )}

                  {quote.converted_to_project_id && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-lg">
                      <HardHat className="w-3.5 h-3.5" />
                      Obra Criada
                    </span>
                  )}

                  <button
                    onClick={() => openEditModal(quote)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setQuoteToDelete(quote)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Criar / Editar Orçamento */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingQuote ? `Editar Orçamento: ${editingQuote.code}` : 'Novo Orçamento de Serviço'}
              </h2>
              <div className="flex items-center gap-2">
                {!editingQuote && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Zerar todos os dados para preencher novo cliente"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Zerar Campos</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveQuote} className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              {/* Client and basic data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Linha única de Adicionar / Cadastrar Cliente */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Cliente *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isManualClient;
                        setIsManualClient(next);
                        if (next) {
                          setClientId('');
                          setClientName('');
                        } else if (clients.length > 0) {
                          handleClientSelect(clients[0].id);
                        }
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {isManualClient ? 'Selecionar da Lista de Clientes' : '+ Cadastrar Novo Cliente'}
                    </button>
                  </div>

                  {!isManualClient ? (
                    <div className="flex gap-2">
                      <select
                        value={clientId}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            setIsManualClient(true);
                            setClientId('');
                            setClientName('');
                          } else {
                            handleClientSelect(e.target.value);
                          }
                        }}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer font-medium"
                      >
                        <option value="">Selecione um cliente cadastrado...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                            {c.name} {c.phone ? `- ${c.phone}` : ''}
                          </option>
                        ))}
                        <option value="__new__" className="bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold">
                          + Cadastrar Novo Cliente...
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setIsManualClient(true);
                          setClientId('');
                          setClientName('');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 active:scale-95"
                        title="Cadastrar novo cliente"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Cadastrar Cliente</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        autoFocus
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Digite o nome completo do novo cliente para cadastrar..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualClient(false);
                          if (clients.length > 0 && !clientId) {
                            handleClientSelect(clients[0].id);
                          }
                        }}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold shrink-0 transition-colors"
                      >
                        Escolher da Lista
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Endereço da Obra
                  </label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Rua, número, bairro, cidade"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Validade da Proposta
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Responsável Técnico
                  </label>
                  <select
                    value={responsibleId}
                    onChange={(e) => {
                      setResponsibleId(e.target.value);
                      const u = users.find((user) => user.id === e.target.value);
                      if (u) setResponsibleName(u.name);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Status Atual
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Novo" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Novo</option>
                    <option value="Em elaboração" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Em elaboração</option>
                    <option value="Enviado" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Enviado</option>
                    <option value="Aguardando resposta" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Aguardando resposta</option>
                    <option value="Aprovado" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Aprovado</option>
                    <option value="Recusado" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Recusado</option>
                    <option value="Cancelado" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Multi-service Items Table */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Serviços e Materiais
                    </h3>
                    <p className="text-xs text-slate-500">
                      Adicione quantos itens desejar com cálculo automático por quantidade e unidade
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Serviço
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center gap-2"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Ex: Pintura de parede, Instalação de piso, etc."
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="flex-1 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="w-20">
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            className="w-full px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs text-center focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                            placeholder="Qtd"
                          />
                        </div>

                        <div className="w-18">
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className="w-full px-1.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                          >
                            <option value="m²" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">m²</option>
                            <option value="m³" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">m³</option>
                            <option value="m" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">m</option>
                            <option value="un" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">un</option>
                            <option value="h" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">hora</option>
                            <option value="vb" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">verba</option>
                            <option value="dia" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">dia</option>
                          </select>
                        </div>

                        <div className="w-28">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                            className="w-full px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs text-right font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                            placeholder="Unit R$"
                          />
                        </div>

                        <div className="w-28 text-right font-mono font-bold text-slate-900 dark:text-white text-xs shrink-0">
                          {formatCurrency(item.total_price)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Remover linha"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Boxes (Itens e Serviços Adicionados - Conforme Imagem 2) */}
              {extraBoxes.map((box) => {
                const boxSum = box.items.reduce((acc, it) => acc + (it.total_price || 0), 0);
                return (
                  <div
                    key={box.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-700/80 bg-[#0b1329] text-white shadow-lg space-y-3 transition-all"
                  >
                    {/* Header Imagem 2 */}
                    <div className="flex items-center justify-between gap-2 pb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-sky-400 shrink-0 inline-block" />
                        <h4 className="text-sm font-bold text-white tracking-wide">
                          {box.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addBoxItem(box.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-500/60 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Linha</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeExtraBox(box.id)}
                          title="Excluir esta caixa"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Rows */}
                    <div className="space-y-2.5">
                      {box.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3 rounded-xl border border-slate-700/80 bg-[#070d1e] flex flex-wrap md:flex-nowrap items-center gap-2.5 shadow-2xs"
                        >
                          {/* Row Number Badge (1) */}
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700/60 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>

                          {/* Description Input */}
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateBoxItem(box.id, idx, 'description', e.target.value)}
                            placeholder="Descrição do produto ou serviço"
                            className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-slate-700/80 bg-[#070d1e] text-white placeholder:text-slate-500 text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                          />

                          {/* Quantity */}
                          <div className="w-16 shrink-0">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity || ''}
                              onChange={(e) => updateBoxItem(box.id, idx, 'quantity', e.target.value)}
                              placeholder="1"
                              className="w-full px-2 py-2 rounded-xl border border-slate-700/80 bg-[#070d1e] text-white text-center text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                            />
                          </div>

                          {/* Unit Cost */}
                          <div className="w-28 shrink-0">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_cost || ''}
                              onChange={(e) => updateBoxItem(box.id, idx, 'unit_cost', e.target.value)}
                              placeholder="R$ Custo Unit"
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-700/80 bg-[#070d1e] text-rose-300 placeholder:text-slate-500 text-right font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                            />
                          </div>

                          {/* Unit Sale Price */}
                          <div className="w-32 shrink-0">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price || ''}
                              onChange={(e) => updateBoxItem(box.id, idx, 'unit_price', e.target.value)}
                              placeholder="R$ Preço Venda"
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-700/80 bg-[#070d1e] text-emerald-300 placeholder:text-slate-500 text-right font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                            />
                          </div>

                          {/* Total */}
                          <div className="w-24 text-right shrink-0 px-1">
                            <span className="block text-[9px] text-slate-400 font-medium uppercase">Total</span>
                            <span className="font-mono font-bold text-xs text-white">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>

                          {/* Remove row */}
                          <button
                            type="button"
                            onClick={() => removeBoxItem(box.id, idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Excluir linha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Footer Imagem 2 */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Soma Parcial dos Itens:</span>
                      <span className="font-mono font-black text-sm text-white">
                        {formatCurrency(boxSum)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Button to add extra box */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={addExtraBox}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-sky-500/40 hover:border-sky-500 bg-sky-500/5 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Mais uma Caixa (Itens e Serviços Adicionados)</span>
                </button>
              </div>

              {/* Totals & Adjustments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Prazo Estimado da Obra
                    </label>
                    <input
                      type="text"
                      value={executionPeriod}
                      onChange={(e) => setExecutionPeriod(e.target.value)}
                      placeholder="Ex: 15 dias úteis"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        Condições de Pagamento
                      </label>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tique a opção de sinal:
                      </span>
                    </div>

                    {/* Botões para ticar: 30%, 50% e Espaço para valor opcional */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDownPaymentOption('30');
                          setPaymentTerms('30% de sinal no ato da contratação e 70% na conclusão da obra');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          downPaymentOption === '30'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px] ${
                          downPaymentOption === '30' ? 'border-white bg-white text-blue-600 font-bold' : 'border-slate-400'
                        }`}>
                          {downPaymentOption === '30' ? '✓' : ''}
                        </span>
                        30% Sinal
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDownPaymentOption('50');
                          setPaymentTerms('50% de sinal no ato da contratação e 50% na conclusão da obra');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          downPaymentOption === '50'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px] ${
                          downPaymentOption === '50' ? 'border-white bg-white text-blue-600 font-bold' : 'border-slate-400'
                        }`}>
                          {downPaymentOption === '50' ? '✓' : ''}
                        </span>
                        50% Sinal
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDownPaymentOption('custom');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                          downPaymentOption === 'custom'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px] ${
                          downPaymentOption === 'custom' ? 'border-white bg-white text-blue-600 font-bold' : 'border-slate-400'
                        }`}>
                          {downPaymentOption === 'custom' ? '✓' : ''}
                        </span>
                        Outro % ou R$ (Opcional)
                      </button>
                    </div>

                    {/* Espaço para colocar o valor opcional (% ou R$) */}
                    {downPaymentOption === 'custom' && (
                      <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-blue-300 dark:border-blue-700/60">
                        <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 text-xs shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomSignalType('percent');
                              if (customSignalValue) {
                                setPaymentTerms(`${customSignalValue}% de sinal no ato e restante na conclusão`);
                              }
                            }}
                            className={`px-2.5 py-1 font-bold ${
                              customSignalType === 'percent'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomSignalType('value');
                              if (customSignalValue) {
                                setPaymentTerms(`Sinal de R$ ${customSignalValue} no ato e restante na conclusão`);
                              }
                            }}
                            className={`px-2.5 py-1 font-bold ${
                              customSignalType === 'value'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            R$
                          </button>
                        </div>
                        <input
                          type="number"
                          step={customSignalType === 'percent' ? '1' : '0.01'}
                          min="0"
                          value={customSignalValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomSignalValue(val);
                            if (val) {
                              if (customSignalType === 'percent') {
                                setPaymentTerms(`${val}% de sinal no ato da contratação e ${Math.max(0, 100 - Number(val))}% na conclusão`);
                              } else {
                                setPaymentTerms(`Sinal de R$ ${val} no ato da contratação e o saldo restante na entrega`);
                              }
                            }
                          }}
                          placeholder={customSignalType === 'percent' ? 'Digite a porcentagem opcional (ex: 20 ou 40)' : 'Digite o valor em R$ (ex: 1500.00)'}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="Ex: 30% sinal + 70% na entrega"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Observações
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas adicionais sobre garantias, materiais inclusos, etc."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Calculation box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>Subtotal Serviços:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  {clientExpensesTotal > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                          Gastos
                        </span>
                        <span className="font-bold text-rose-950 dark:text-rose-200">
                          Gastos do Cliente (+):
                        </span>
                      </div>
                      <span className="font-mono font-black text-rose-700 dark:text-rose-400">
                        + {formatCurrency(clientExpensesTotal)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">Desconto (R$):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-32 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-amber-700 dark:text-amber-400 font-bold">Acréscimo (R$):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addition}
                      onChange={(e) => setAddition(Number(e.target.value))}
                      className="w-32 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-right font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
                    <div className="flex flex-col">
                      <span>Valor Total a Pagar:</span>
                      {clientExpensesTotal > 0 && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          (Inclui serviços + gastos do cliente)
                        </span>
                      )}
                    </div>
                    <span className="text-lg text-blue-600 dark:text-blue-400 font-mono font-black">
                      {formatCurrency(total)}
                    </span>
                  </div>

                  {/* Valor do Sinal e Saldo Restante diferenciados em cores */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-300 dark:border-slate-700 space-y-2">
                    {/* Destaque Sinal (Verde) */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                          {downPaymentCalculation.percent > 0 ? `${downPaymentCalculation.percent}%` : 'Sinal'}
                        </span>
                        <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          Sinal de Entrada:
                        </span>
                      </div>
                      <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                        {formatCurrency(downPaymentCalculation.value)}
                      </span>
                    </div>

                    {/* Destaque Saldo Restante (Azul) */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">
                          {downPaymentCalculation.percent > 0 ? `${100 - downPaymentCalculation.percent}%` : 'Saldo'}
                        </span>
                        <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
                          Saldo Restante:
                        </span>
                      </div>
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">
                        {formatCurrency(downPaymentCalculation.remaining)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gastos que o Cliente vai Pagar à Parte (Na sequência de Observação) */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Gastos a Pagar pelo Cliente
                    </h3>
                    <p className="text-xs text-slate-500">
                      Adicione quantos itens desejar com cálculo automático por quantidade e unidade
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsReceiptScannerOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Tirar foto ou anexar notinha para discriminar itens automaticamente com IA"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Bater Foto da Notinha</span>
                    </button>
                    <button
                      type="button"
                      onClick={loadExpenseExamples}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Inserir exemplos comuns de gastos à parte"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Exemplos
                    </button>
                    <button
                      type="button"
                      onClick={addClientExpense}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Gasto
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {clientExpenses.map((expense, index) => (
                    <div
                      key={expense.id || index}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Ex: Aluguel de andaime, Caçamba de entulho, Frete, etc."
                        value={expense.description}
                        onChange={(e) => updateClientExpense(index, 'description', e.target.value)}
                        className="flex-1 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="w-20">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={expense.quantity || ''}
                            onChange={(e) => updateClientExpense(index, 'quantity', e.target.value)}
                            className="w-full px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs text-center focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs font-bold"
                            placeholder="Qtd"
                          />
                        </div>

                        <div className="w-18">
                          <select
                            value={expense.unit || 'un'}
                            onChange={(e) => updateClientExpense(index, 'unit', e.target.value)}
                            className="w-full px-1.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                          >
                            <option value="un" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">un</option>
                            <option value="dia" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">dia</option>
                            <option value="semana" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">semana</option>
                            <option value="mês" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">mês</option>
                            <option value="viagem" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">viagem</option>
                            <option value="taxa" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">taxa</option>
                            <option value="vb" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">verba</option>
                            <option value="m²" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">m²</option>
                            <option value="lata" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">lata</option>
                            <option value="galão" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">galão</option>
                          </select>
                        </div>

                        <div className="w-28">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={expense.unit_price || ''}
                            onChange={(e) => updateClientExpense(index, 'unit_price', e.target.value)}
                            className="w-full px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs text-right font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
                            placeholder="Unit R$"
                          />
                        </div>

                        <div className="w-28 text-right font-mono font-bold text-xs text-slate-900 dark:text-white shrink-0">
                          {formatCurrency(expense.total_price || 0)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeClientExpense(index)}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                          title="Excluir gasto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {clientExpenses.length === 0 && (
                    <div className="py-4 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            Nenhum gasto à parte adicionado ainda
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Bata foto do cupom/notinha ou adicione manualmente os gastos que o cliente pagará.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsReceiptScannerOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Bater Foto da Notinha</span>
                        </button>
                        <button
                          type="button"
                          onClick={addClientExpense}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          + Manual
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {clientExpenses.length > 0 && clientExpensesTotal > 0 && (
                  <div className="flex justify-end items-center gap-2 pt-1 text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[11px]">
                      Total de Gastos do Cliente:
                    </span>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                      {formatCurrency(clientExpensesTotal)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  {!editingQuote && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpar / Zerar Dados</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingQuote ? 'Salvar Alterações' : 'Cadastrar Orçamento'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quote Print / PDF Modal */}
      {printingQuote && (
        <QuotePrintModal
          quote={printingQuote}
          company={company}
          onClose={() => setPrintingQuote(null)}
        />
      )}

      {/* Modal de Confirmação para Excluir Orçamento */}
      {quoteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Excluir Orçamento
                </h3>
                <p className="text-xs text-slate-500">
                  Ação definitiva e irreversível
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir o orçamento <strong className="text-slate-900 dark:text-white font-mono">{quoteToDelete.code}</strong> do cliente <strong className="text-slate-900 dark:text-white">{quoteToDelete.client_name}</strong>? Esta ação não poderá ser desfeita.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuoteToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteQuote(quoteToDelete.id);
                  setQuoteToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Sim, Excluir Orçamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner com IA de Notinha / Cupom Fiscal */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onAddExpenses={handleAddExpensesFromReceipt}
      />
    </div>
  );
};
