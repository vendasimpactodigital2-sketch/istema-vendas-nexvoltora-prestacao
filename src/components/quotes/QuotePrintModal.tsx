import React, { useState } from 'react';
import { Quote, Company } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Printer, X, Download, Share2, ExternalLink, Check, Copy, Loader2 } from 'lucide-react';
import { WhatsAppButton } from '../common/WhatsAppButton';
import { directDownloadQuotePdf } from '../../utils/pdfDownloader';

interface QuotePrintModalProps {
  quote: Quote | null;
  company: Company;
  onClose: () => void;
}

export const QuotePrintModal: React.FC<QuotePrintModalProps> = ({ quote, company, onClose }) => {
  if (!quote) return null;

  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await directDownloadQuotePdf(quote, company);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Identificar valor do sinal e saldo restante (com suporte retroativo a textos como 30% ou 50%)
  const extractPercentFromTerms = (terms?: string): number | null => {
    if (!terms) return null;
    const match = terms.match(/(\d+)\s*%/);
    if (match && match[1]) {
      const p = parseInt(match[1], 10);
      if (p > 0 && p <= 100) return p;
    }
    return null;
  };

  const parsedTermsPercent = extractPercentFromTerms(quote.payment_terms);

  const downPaymentValue =
    quote.down_payment_value !== undefined && quote.down_payment_value > 0
      ? quote.down_payment_value
      : quote.down_payment_percent && quote.down_payment_percent > 0
      ? Math.round(quote.total * (quote.down_payment_percent / 100) * 100) / 100
      : parsedTermsPercent
      ? Math.round(quote.total * (parsedTermsPercent / 100) * 100) / 100
      : null;

  const downPaymentPercent =
    quote.down_payment_percent !== undefined && quote.down_payment_percent > 0
      ? quote.down_payment_percent
      : parsedTermsPercent || (downPaymentValue && quote.total > 0 ? Math.round((downPaymentValue / quote.total) * 100) : null);

  const remainingPercent = downPaymentPercent ? Math.max(0, 100 - downPaymentPercent) : null;

  const remainingValue =
    downPaymentValue !== null
      ? (quote.remaining_balance ?? Math.max(0, quote.total - downPaymentValue))
      : null;

  const handlePrint = () => {
    try {
      const printable = document.getElementById('printable-quote');
      if (!printable) {
        window.print();
        return;
      }

      // Try printing via dedicated print window first to bypass iframe restrictions
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Orçamento ${quote.code} - ${quote.client_name}</title>
              <meta charset="utf-8" />
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @page {
                  size: A4 portrait;
                  margin: 8mm 10mm;
                }
                html, body {
                  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  background: #fff;
                  color: #020617;
                  margin: 0;
                  padding: 0;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  box-sizing: border-box;
                }
                .a4-sheet {
                  width: 100%;
                  height: 280mm;
                  max-height: 280mm;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  box-sizing: border-box;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                strong, b { font-weight: 800 !important; }
              </style>
            </head>
            <body>
              <div class="a4-sheet">
                ${printable.innerHTML}
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 350);
                };
              </script>
            </body>
          </html>
        `);
        printWin.document.close();
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const copyAsText = () => {
    const lines = [
      `*PROPOSTA COMERCIAL: ${quote.code}*`,
      `Empresa: ${company.trade_name}`,
      `Cliente: ${quote.client_name}`,
      `Telefone: ${quote.client_phone}`,
      `Data: ${formatDate(quote.date)} | Validade: ${formatDate(quote.valid_until)}`,
      `Responsável: ${quote.responsible_name}`,
      '',
      '*SERVIÇOS / ITENS:*',
      ...quote.items.map((it, idx) => `• ${it.description} (${it.quantity} ${it.unit}) - ${formatCurrency(it.total_price)}`),
      ...(quote.client_materials && quote.client_materials.length > 0
        ? [
            '',
            '*📦 MATERIAIS A COMPRAR PELO CLIENTE:*',
            ...quote.client_materials.map(
              (m) => `• ${m.description} (${m.quantity} ${m.unit})${m.total_price ? ` - Est. ${formatCurrency(m.total_price)}` : ''}`
            ),
            quote.client_materials_total ? `Total Estimado de Materiais: ${formatCurrency(quote.client_materials_total)}` : '',
          ].filter(Boolean)
        : []),
      ...(quote.client_expenses && quote.client_expenses.length > 0
        ? [
            '',
            '*⚠️ GASTOS E DESPESAS À PARTE DO CLIENTE:*',
            ...quote.client_expenses.map(
              (e) => `• ${e.description} (${e.quantity} ${e.unit || 'un'}) - ${formatCurrency(e.total_price)}`
            ),
            quote.client_expenses_total ? `Total de Gastos à Parte: ${formatCurrency(quote.client_expenses_total)}` : '',
          ].filter(Boolean)
        : []),
      '',
      `Subtotal: ${formatCurrency(quote.subtotal)}`,
      quote.discount ? `Desconto: -${formatCurrency(quote.discount)}` : null,
      quote.addition ? `Acréscimo: +${formatCurrency(quote.addition)}` : null,
      `*VALOR TOTAL: ${formatCurrency(quote.total)}*`,
      downPaymentValue ? `• *Sinal de Entrada (${downPaymentPercent || 30}%):* ${formatCurrency(downPaymentValue)}` : null,
      remainingValue ? `• *Saldo Restante na Conclusão:* ${formatCurrency(remainingValue)}` : null,
      quote.payment_terms ? `Pagamento: ${quote.payment_terms}` : null,
      quote.execution_period ? `Prazo Estimado: ${quote.execution_period}` : null,
      quote.notes ? `Observações: ${quote.notes}` : null,
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[96vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="no-print flex flex-wrap items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-white text-sm">
              Proposta Comercial / PDF
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
              {quote.code}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyAsText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all"
              title="Copiar resumo do orçamento"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <WhatsAppButton
              phone={quote.client_phone}
              message={`Olá, ${quote.client_name}. Tudo bem? Segue sua proposta comercial ${quote.code} referente aos serviços solicitados no valor total de ${formatCurrency(quote.total)}.`}
              size="sm"
              label="Enviar WhatsApp"
            />

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
              title="Baixar proposta em PDF diretamente"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloadingPdf ? 'Baixando...' : 'Baixar PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Imprimir proposta comercial"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body (A4 Style Paper 210x297mm vertical) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/90 dark:bg-slate-950 flex justify-center">
          <div
            id="printable-quote"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-950 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-300 print:border-none print:shadow-none print:p-0 flex flex-col justify-between"
            style={{ width: '210mm', minHeight: '297mm', color: '#020617' }}
          >
            <div className="flex-1 flex flex-col">
              {/* Header: Company Logo & Info */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-slate-900 gap-3">
                <div className="flex items-center gap-3.5">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.trade_name}
                      className="h-24 w-24 rounded-xl object-contain ring-1 ring-slate-300 shrink-0 bg-white p-1"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-xl bg-blue-700 text-white flex items-center justify-center text-2xl font-black shrink-0">
                      OZI
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase leading-snug">
                      {company.trade_name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-800 font-bold mt-0.5">
                      {company.legal_name || 'Serviços Especializados'}
                    </p>
                    <p className="text-xs text-slate-700 font-semibold">
                      CNPJ: {company.cnpj || '45.892.123/0001-90'}
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-0.5 text-xs text-slate-900 shrink-0">
                  <div
                    className="inline-block px-2.5 py-0.5 rounded-lg text-blue-950 font-black text-xs tracking-wider mb-0.5"
                    style={{
                      backgroundColor: '#dbeafe',
                      border: '1.5px solid #2563eb',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    ORÇAMENTO {quote.code}
                  </div>
                  <p className="font-semibold text-slate-800 text-[11px]">
                    Emissão: <strong className="font-black text-slate-950">{formatDate(quote.date)}</strong>
                  </p>
                  <p className="font-semibold text-slate-800 text-[11px]">
                    Validade: <strong className="font-black text-slate-950">{formatDate(quote.valid_until)}</strong>
                  </p>
                  <p className="font-semibold text-slate-800 text-[11px]">
                    Resp. técnico: <strong className="font-black text-slate-950">{quote.responsible_name}</strong>
                  </p>
                </div>
              </div>

              {/* Client & Work Location Box (Slim) */}
              <div className="my-2 grid grid-cols-2 gap-3 p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs">
                <div>
                  <span className="font-black text-blue-900 uppercase tracking-wider text-[10px] block mb-0.5">
                    Dados do Cliente
                  </span>
                  <p className="font-black text-slate-950 text-sm leading-tight">{quote.client_name}</p>
                  <p className="text-slate-800 font-semibold text-xs mt-0.5">Telefone/WhatsApp: {quote.client_phone}</p>
                </div>
                <div>
                  <span className="font-black text-blue-900 uppercase tracking-wider text-[10px] block mb-0.5">
                    Local da Execução da Obra / Serviço
                  </span>
                  <p className="font-bold text-slate-950 text-xs leading-snug">{quote.client_address}</p>
                  {quote.execution_period && (
                    <p className="text-slate-800 font-semibold text-xs mt-0.5">
                      Prazo estimado: <strong className="font-black text-slate-950">{quote.execution_period}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Services Table (Slim) */}
              <div className="my-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 mb-1 pb-1 border-b border-slate-900">
                  Discriminação dos Serviços e Materiais
                </h3>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-y border-slate-300 bg-slate-100 text-slate-950">
                      <th className="py-1 px-2 font-black w-10 text-center">Item</th>
                      <th className="py-1 px-2 font-black">Descrição do Serviço</th>
                      <th className="py-1 px-2 font-black text-center w-14">Qtd</th>
                      <th className="py-1 px-2 font-black text-center w-14">Unid.</th>
                      <th className="py-1 px-2 font-black text-right w-24">Valor Unit.</th>
                      <th className="py-1 px-2 font-black text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {quote.items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-1.5 px-2 text-center text-slate-950 font-black">
                          {(idx + 1).toString().padStart(2, '0')}
                        </td>
                        <td className="py-1.5 px-2 font-bold text-slate-950 leading-snug">
                          {item.description}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-950 font-black">
                          {item.quantity}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-950 font-bold">
                          {item.unit}
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-900 font-semibold font-mono">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-black text-slate-950 font-mono text-xs sm:text-sm">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Materiais por conta do Cliente (A Comprar) - Compact */}
              {quote.client_materials && quote.client_materials.length > 0 && (
                <div className="my-1.5 p-2 rounded-xl bg-amber-50/50 border border-amber-300 text-xs">
                  <div className="flex items-center justify-between mb-1 pb-1 border-b border-amber-300">
                    <h4 className="font-black uppercase text-amber-950 text-[11px] flex items-center gap-1.5">
                      <span>📦</span> Materiais a Serem Comprados pelo Cliente
                    </h4>
                    {quote.client_materials_total !== undefined && quote.client_materials_total > 0 && (
                      <span className="font-mono font-black text-amber-950 text-xs">
                        Total Estimado: {formatCurrency(quote.client_materials_total)}
                      </span>
                    )}
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-100/80 text-amber-950">
                        <th className="py-0.5 px-2 font-black w-8 text-center text-[10px]">Item</th>
                        <th className="py-0.5 px-2 font-black text-[10px]">Descrição do Material</th>
                        <th className="py-0.5 px-2 font-black text-center w-12 text-[10px]">Qtd</th>
                        <th className="py-0.5 px-2 font-black text-center w-12 text-[10px]">Unid.</th>
                        <th className="py-0.5 px-2 font-black text-right w-20 text-[10px]">Est. Unit.</th>
                        <th className="py-0.5 px-2 font-black text-right w-24 text-[10px]">Total Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-200">
                      {quote.client_materials.map((mat, mIdx) => (
                        <tr key={mat.id || mIdx}>
                          <td className="py-1 px-2 text-center text-amber-950 font-black text-[11px]">
                            {(mIdx + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="py-1 px-2 font-bold text-slate-950 text-[11px]">
                            {mat.description}
                          </td>
                          <td className="py-1 px-2 text-center text-slate-950 font-black text-[11px]">
                            {mat.quantity}
                          </td>
                          <td className="py-1 px-2 text-center text-slate-900 font-bold text-[11px]">
                            {mat.unit}
                          </td>
                          <td className="py-1 px-2 text-right text-slate-900 font-semibold font-mono text-[11px]">
                            {mat.estimated_price ? formatCurrency(mat.estimated_price) : '-'}
                          </td>
                          <td className="py-1 px-2 text-right font-black text-amber-950 font-mono text-[11px]">
                            {mat.total_price ? formatCurrency(mat.total_price) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Despesas Pagas à Parte pelo Cliente - Compact */}
              {quote.client_expenses && quote.client_expenses.length > 0 && (
                <div className="my-1.5 p-2 rounded-xl bg-rose-50/50 border border-rose-300 text-xs">
                  <div className="flex items-center justify-between mb-1 pb-1 border-b border-rose-300">
                    <h4 className="font-black uppercase text-rose-950 text-[11px] flex items-center gap-1.5">
                      <span>⚠️</span> Gastos e Despesas Pagos pelo Cliente
                    </h4>
                    {quote.client_expenses_total !== undefined && quote.client_expenses_total > 0 && (
                      <span className="font-mono font-black text-rose-950 text-xs">
                        Total de Gastos: {formatCurrency(quote.client_expenses_total)}
                      </span>
                    )}
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-rose-100/80 text-rose-950">
                        <th className="py-0.5 px-2 font-black w-8 text-center text-[10px]">Item</th>
                        <th className="py-0.5 px-2 font-black text-[10px]">Descrição do Gasto</th>
                        <th className="py-0.5 px-2 font-black text-center w-12 text-[10px]">Qtd</th>
                        <th className="py-0.5 px-2 font-black text-center w-12 text-[10px]">Unid.</th>
                        <th className="py-0.5 px-2 font-black text-right w-20 text-[10px]">Valor Unit.</th>
                        <th className="py-0.5 px-2 font-black text-right w-24 text-[10px]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-200">
                      {quote.client_expenses.map((exp, eIdx) => (
                        <tr key={exp.id || eIdx}>
                          <td className="py-1 px-2 text-center text-rose-950 font-black text-[11px]">
                            {(eIdx + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="py-1 px-2 font-bold text-slate-950 text-[11px]">
                            {exp.description}
                          </td>
                          <td className="py-1 px-2 text-center text-slate-950 font-black text-[11px]">
                            {exp.quantity}
                          </td>
                          <td className="py-1 px-2 text-center text-slate-900 font-bold text-[11px]">
                            {exp.unit || 'un'}
                          </td>
                          <td className="py-1 px-2 text-right text-slate-900 font-semibold font-mono text-[11px]">
                            {formatCurrency(exp.unit_price)}
                          </td>
                          <td className="py-1 px-2 text-right font-black text-rose-950 font-mono text-[11px]">
                            {formatCurrency(exp.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals & Payment Terms Box (Ultra Slim & Compact) */}
              <div className="grid grid-cols-2 gap-3 my-2 pt-2 border-t border-slate-300 text-xs">
                <div className="space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-950 uppercase tracking-wider block mb-0.5">
                      Condições de Pagamento:
                    </span>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 leading-snug">
                      {quote.payment_terms || 'À combinar • Aceitamos PIX, Transferência e Cartão.'}
                    </div>
                  </div>

                  {quote.notes && (
                    <div>
                      <span className="text-[10px] font-black text-slate-950 uppercase tracking-wider block mb-0.5">
                        Observações Gerais:
                      </span>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 italic leading-snug">
                        {quote.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Totals Breakdown (Slim) */}
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-300 space-y-1 text-xs font-medium">
                  <div className="flex justify-between text-slate-700 font-bold">
                    <span>Subtotal Serviços</span>
                    <span className="font-mono font-black text-slate-950">{formatCurrency(quote.subtotal)}</span>
                  </div>

                  {quote.client_expenses_total !== undefined && quote.client_expenses_total > 0 && (
                    <div className="flex justify-between text-rose-900 font-bold">
                      <span>Gastos do Cliente (+)</span>
                      <span className="font-mono font-black text-rose-700">+ {formatCurrency(quote.client_expenses_total)}</span>
                    </div>
                  )}

                  {quote.discount > 0 && (
                    <div className="flex justify-between text-emerald-800 font-bold">
                      <span>Desconto</span>
                      <span className="font-mono font-black text-emerald-700">- {formatCurrency(quote.discount)}</span>
                    </div>
                  )}

                  {quote.addition > 0 && (
                    <div className="flex justify-between text-amber-800 font-bold">
                      <span>Acréscimo</span>
                      <span className="font-mono font-black text-amber-700">+ {formatCurrency(quote.addition)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1 border-t border-slate-300 text-xs sm:text-sm font-black text-slate-950">
                    <span>Valor Total da Proposta</span>
                    <span className="text-base text-blue-700 font-mono font-black">
                      {formatCurrency(quote.total)}
                    </span>
                  </div>

                  {downPaymentValue !== null && downPaymentValue > 0 && (
                    <div className="pt-1.5 mt-1 border-t border-slate-300 space-y-1">
                      {/* SINAL DE ENTRADA (SLIM) */}
                      <div
                        className="p-1 px-2 rounded-md border flex items-center justify-between"
                        style={{
                          backgroundColor: '#ecfdf5',
                          borderColor: '#059669',
                          borderWidth: '1.5px',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white"
                            style={{
                              backgroundColor: '#047857',
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact',
                            }}
                          >
                            Sinal {downPaymentPercent ? `${downPaymentPercent}%` : ''}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-950">
                            No ato da contratação
                          </span>
                        </div>
                        <span
                          className="font-mono font-black text-xs sm:text-sm text-emerald-900"
                          style={{
                            color: '#065f46',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                          }}
                        >
                          {formatCurrency(downPaymentValue)}
                        </span>
                      </div>

                      {/* SALDO RESTANTE (SLIM) */}
                      <div
                        className="p-1 px-2 rounded-md border flex items-center justify-between"
                        style={{
                          backgroundColor: '#eff6ff',
                          borderColor: '#2563eb',
                          borderWidth: '1.5px',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white"
                            style={{
                              backgroundColor: '#1d4ed8',
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact',
                            }}
                          >
                            Saldo {remainingPercent ? `${remainingPercent}%` : ''}
                          </span>
                          <span className="text-[10px] font-bold text-blue-950">
                            Na entrega da obra
                          </span>
                        </div>
                        <span
                          className="font-mono font-black text-xs sm:text-sm text-blue-900"
                          style={{
                            color: '#1e40af',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                          }}
                        >
                          {formatCurrency(remainingValue ?? Math.max(0, quote.total - downPaymentValue))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Signature & Footer (Pinned to the very end of the A4 page) */}
            <div className="mt-auto pt-4 border-t-2 border-slate-300">
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="w-52 sm:w-60 mx-auto border-b-2 border-slate-900 mb-1.5" />
                  <p className="font-black text-slate-950 text-xs sm:text-sm leading-tight">{quote.client_name}</p>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wide">Assinatura do Cliente</p>
                </div>

                <div>
                  <div className="w-52 sm:w-60 mx-auto border-b-2 border-slate-900 mb-1.5" />
                  <p className="font-black text-slate-950 text-xs sm:text-sm leading-tight">{company.trade_name}</p>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wide">Responsável pela Empresa</p>
                </div>
              </div>

              {/* Footer company contacts */}
              <div className="mt-3 text-center text-[10px] sm:text-[11px] font-semibold text-slate-600 border-t border-slate-200 pt-2">
                {company.trade_name} • {company.phone} • {company.email} • {company.address}, {company.number} - {company.city}/{company.state}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
