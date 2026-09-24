import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Quote } from '../types';

export interface CompanyInfo {
  trade_name?: string;
  legal_name?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  number?: string;
  city?: string;
  state?: string;
  logo_url?: string;
}

const formatCurrency = (val: number | undefined | null) => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
};

export async function directDownloadQuotePdf(quote: Quote, company: CompanyInfo): Promise<void> {
  // Calculos do sinal e saldo
  let downPaymentPercent = quote.down_payment_percent || 30;
  let downPaymentValue = quote.down_payment_value;
  if (!downPaymentValue && quote.total > 0) {
    downPaymentValue = Math.round(quote.total * (downPaymentPercent / 100) * 100) / 100;
  }
  const remainingPercent = 100 - downPaymentPercent;
  const remainingValue = quote.remaining_balance !== undefined 
    ? quote.remaining_balance 
    : Math.max(0, (quote.total || 0) - (downPaymentValue || 0));

  // Criar elemento container off-screen exatamente com 794px x 1123px (A4 a 96 DPI = 210mm x 297mm)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.height = '1123px';
  container.style.boxSizing = 'border-box';
  container.style.padding = '28px 36px 24px 36px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#020617';
  container.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.style.zIndex = '-999';

  // Conteúdo HTML estritamente idêntico ao modelo A4 slim
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #020617; padding-bottom: 10px; margin-bottom: 8px; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${company.logo_url 
            ? `<img src="${company.logo_url}" crossorigin="anonymous" style="height: 96px; width: 96px; min-width: 96px; border-radius: 12px; object-fit: contain; border: 1.5px solid #cbd5e1; background-color: #ffffff; padding: 2px;" />` 
            : `<div style="height: 96px; width: 96px; min-width: 96px; border-radius: 12px; background-color: #1d4ed8; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900;">OZI</div>`
          }
          <div>
            <h2 style="font-size: 22px; font-weight: 900; text-transform: uppercase; margin: 0; line-height: 1.15; color: #020617;">
              ${company.trade_name || 'OZIEL SOLUÇÕES'}
            </h2>
            <p style="font-size: 12px; color: #1e293b; font-weight: 700; margin: 3px 0 0 0;">
              ${company.legal_name || 'Serviços Especializados'}
            </p>
            <p style="font-size: 11px; color: #334155; font-weight: 600; margin: 2px 0 0 0;">
              CNPJ: ${company.cnpj || '45.892.123/0001-90'}
            </p>
          </div>
        </div>

        <div style="text-align: right; font-size: 11px; color: #020617;">
          <div style="display: inline-block; padding: 2px 10px; border-radius: 6px; background-color: #dbeafe; border: 1.5px solid #2563eb; color: #172554; font-weight: 900; font-size: 11px; letter-spacing: 0.5px; margin-bottom: 2px;">
            ORÇAMENTO ${quote.code}
          </div>
          <p style="margin: 2px 0 0 0; font-size: 10.5px; color: #334155;">
            Emissão: <strong style="font-weight: 900; color: #020617;">${formatDate(quote.date)}</strong>
          </p>
          <p style="margin: 2px 0 0 0; font-size: 10.5px; color: #334155;">
            Validade: <strong style="font-weight: 900; color: #020617;">${formatDate(quote.valid_until)}</strong>
          </p>
          <p style="margin: 2px 0 0 0; font-size: 10.5px; color: #334155;">
            Resp. técnico: <strong style="font-weight: 900; color: #020617;">${quote.responsible_name || 'Oziel'}</strong>
          </p>
        </div>
      </div>

      <!-- Dados do Cliente e Local -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 10px 14px; border-radius: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; margin-bottom: 8px; font-size: 11px;">
        <div>
          <span style="font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; font-size: 9.5px; display: block; margin-bottom: 2px;">
            Dados do Cliente
          </span>
          <p style="font-weight: 900; color: #020617; font-size: 13px; margin: 0; line-height: 1.2;">
            ${quote.client_name}
          </p>
          <p style="color: #1e293b; font-weight: 600; font-size: 11px; margin: 2px 0 0 0;">
            Telefone/WhatsApp: ${quote.client_phone || '-'}
          </p>
        </div>
        <div>
          <span style="font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; font-size: 9.5px; display: block; margin-bottom: 2px;">
            Local da Execução da Obra / Serviço
          </span>
          <p style="font-weight: 700; color: #020617; font-size: 11px; margin: 0; line-height: 1.25;">
            ${quote.client_address || 'Endereço a definir'}
          </p>
          ${quote.execution_period ? `
            <p style="color: #1e293b; font-weight: 600; font-size: 11px; margin: 2px 0 0 0;">
              Prazo estimado: <strong style="font-weight: 900; color: #020617;">${quote.execution_period}</strong>
            </p>
          ` : ''}
        </div>
      </div>

      <!-- Tabela de Serviços -->
      <div style="margin-bottom: 8px;">
        <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #020617; padding-bottom: 3px; border-bottom: 1px solid #020617; margin-bottom: 4px;">
          Discriminação dos Serviços e Materiais
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background-color: #f1f5f9; color: #020617;">
              <th style="padding: 4px 6px; font-weight: 900; width: 36px; text-align: center;">Item</th>
              <th style="padding: 4px 6px; font-weight: 900;">Descrição do Serviço</th>
              <th style="padding: 4px 6px; font-weight: 900; text-align: center; width: 44px;">Qtd</th>
              <th style="padding: 4px 6px; font-weight: 900; text-align: center; width: 44px;">Unid.</th>
              <th style="padding: 4px 6px; font-weight: 900; text-align: right; width: 85px;">Valor Unit.</th>
              <th style="padding: 4px 6px; font-weight: 900; text-align: right; width: 95px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map((item, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 5px 6px; text-align: center; font-weight: 900; color: #020617;">
                  ${(idx + 1).toString().padStart(2, '0')}
                </td>
                <td style="padding: 5px 6px; font-weight: 700; color: #020617; line-height: 1.2;">
                  ${item.description}
                </td>
                <td style="padding: 5px 6px; text-align: center; font-weight: 900; color: #020617;">
                  ${item.quantity}
                </td>
                <td style="padding: 5px 6px; text-align: center; font-weight: 700; color: #020617;">
                  ${item.unit}
                </td>
                <td style="padding: 5px 6px; text-align: right; font-weight: 600; color: #1e293b; font-family: monospace;">
                  ${formatCurrency(item.unit_price)}
                </td>
                <td style="padding: 5px 6px; text-align: right; font-weight: 900; color: #020617; font-family: monospace;">
                  ${formatCurrency(item.total_price)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Materiais a Comprar pelo Cliente -->
      ${quote.client_materials && quote.client_materials.length > 0 ? `
        <div style="margin-bottom: 6px; padding: 6px 10px; border-radius: 8px; background-color: #fffbeb; border: 1px solid #fcd34d; font-size: 10.5px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #fcd34d; padding-bottom: 3px; margin-bottom: 3px;">
            <span style="font-weight: 900; text-transform: uppercase; color: #78350f; font-size: 10px;">
              📦 Materiais a Serem Comprados pelo Cliente
            </span>
            ${quote.client_materials_total ? `
              <span style="font-family: monospace; font-weight: 900; color: #78350f; font-size: 10.5px;">
                Total Estimado: ${formatCurrency(quote.client_materials_total)}
              </span>
            ` : ''}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
            <tbody>
              ${quote.client_materials.map((m, mIdx) => `
                <tr style="border-bottom: 1px solid #fef3c7;">
                  <td style="padding: 2px 4px; font-weight: 900; width: 28px; text-align: center; color: #78350f;">
                    ${(mIdx + 1).toString().padStart(2, '0')}
                  </td>
                  <td style="padding: 2px 4px; font-weight: 700; color: #020617;">
                    ${m.description}
                  </td>
                  <td style="padding: 2px 4px; text-align: center; font-weight: 900; width: 40px; color: #020617;">
                    ${m.quantity} ${m.unit}
                  </td>
                  <td style="padding: 2px 4px; text-align: right; font-weight: 900; color: #78350f; font-family: monospace; width: 90px;">
                    ${m.total_price ? formatCurrency(m.total_price) : '-'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Gastos e Despesas do Cliente -->
      ${quote.client_expenses && quote.client_expenses.length > 0 ? `
        <div style="margin-bottom: 6px; padding: 6px 10px; border-radius: 8px; background-color: #fff1f2; border: 1px solid #fda4af; font-size: 10.5px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #fda4af; padding-bottom: 3px; margin-bottom: 3px;">
            <span style="font-weight: 900; text-transform: uppercase; color: #881337; font-size: 10px;">
              ⚠️ Gastos e Despesas Pagos pelo Cliente
            </span>
            ${quote.client_expenses_total ? `
              <span style="font-family: monospace; font-weight: 900; color: #881337; font-size: 10.5px;">
                Total de Gastos: ${formatCurrency(quote.client_expenses_total)}
              </span>
            ` : ''}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
            <tbody>
              ${quote.client_expenses.map((e, eIdx) => `
                <tr style="border-bottom: 1px solid #ffe4e6;">
                  <td style="padding: 2px 4px; font-weight: 900; width: 28px; text-align: center; color: #881337;">
                    ${(eIdx + 1).toString().padStart(2, '0')}
                  </td>
                  <td style="padding: 2px 4px; font-weight: 700; color: #020617;">
                    ${e.description}
                  </td>
                  <td style="padding: 2px 4px; text-align: center; font-weight: 900; width: 40px; color: #020617;">
                    ${e.quantity} ${e.unit || 'un'}
                  </td>
                  <td style="padding: 2px 4px; text-align: right; font-weight: 900; color: #881337; font-family: monospace; width: 90px;">
                    ${formatCurrency(e.total_price)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Condições e Totais -->
      <div style="display: grid; grid-template-columns: 1fr 1.15fr; gap: 12px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #cbd5e1; font-size: 11px;">
        <div style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <span style="font-size: 9.5px; font-weight: 900; color: #020617; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
              Condições de Pagamento:
            </span>
            <div style="padding: 6px 10px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.3;">
              ${quote.payment_terms || '30% de sinal no ato da contratação e 70% na conclusão da obra'}
            </div>
          </div>

          ${quote.notes ? `
            <div style="margin-top: 6px;">
              <span style="font-size: 9.5px; font-weight: 900; color: #020617; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
                Observações Gerais:
              </span>
              <div style="padding: 6px 10px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-size: 10.5px; font-weight: 500; color: #1e293b; font-style: italic; line-height: 1.3;">
                ${quote.notes}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Coluna de Valores e Sinal -->
        <div style="border-radius: 10px; background-color: #f8fafc; padding: 8px 12px; border: 1px solid #cbd5e1;">
          <div style="display: flex; justify-content: space-between; color: #334155; font-weight: 700; font-size: 11px; margin-bottom: 3px;">
            <span>Subtotal Serviços</span>
            <span style="font-family: monospace; font-weight: 900; color: #020617;">${formatCurrency(quote.subtotal)}</span>
          </div>

          ${quote.client_expenses_total ? `
            <div style="display: flex; justify-content: space-between; color: #881337; font-weight: 700; font-size: 11px; margin-bottom: 3px;">
              <span>Gastos do Cliente (+)</span>
              <span style="font-family: monospace; font-weight: 900; color: #be123c;">+ ${formatCurrency(quote.client_expenses_total)}</span>
            </div>
          ` : ''}

          ${quote.discount ? `
            <div style="display: flex; justify-content: space-between; color: #065f46; font-weight: 700; font-size: 11px; margin-bottom: 3px;">
              <span>Desconto</span>
              <span style="font-family: monospace; font-weight: 900; color: #047857;">- ${formatCurrency(quote.discount)}</span>
            </div>
          ` : ''}

          ${quote.addition ? `
            <div style="display: flex; justify-content: space-between; color: #78350f; font-weight: 700; font-size: 11px; margin-bottom: 3px;">
              <span>Acréscimo</span>
              <span style="font-family: monospace; font-weight: 900; color: #b45309;">+ ${formatCurrency(quote.addition)}</span>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; padding-top: 4px; border-top: 1px solid #cbd5e1; font-size: 12px; font-weight: 900; color: #020617; margin-bottom: 6px;">
            <span>Valor Total da Proposta</span>
            <span style="font-size: 15px; color: #1d4ed8; font-family: monospace; font-weight: 900;">
              ${formatCurrency(quote.total)}
            </span>
          </div>

          <!-- Sinal e Saldo Slim -->
          ${downPaymentValue && downPaymentValue > 0 ? `
            <div style="padding-top: 4px; border-top: 1px solid #cbd5e1; display: flex; flex-direction: column; gap: 3px;">
              <!-- Sinal -->
              <div style="padding: 3px 8px; border-radius: 6px; background-color: #ecfdf5; border: 1.5px solid #059669; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 900; text-transform: uppercase; background-color: #047857; color: #ffffff;">
                    Sinal ${downPaymentPercent}%
                  </span>
                  <span style="font-size: 10px; font-weight: 700; color: #064e3b;">
                    No ato da contratação
                  </span>
                </div>
                <span style="font-family: monospace; font-weight: 900; font-size: 12px; color: #064e3b;">
                  ${formatCurrency(downPaymentValue)}
                </span>
              </div>

              <!-- Saldo Restante -->
              <div style="padding: 3px 8px; border-radius: 6px; background-color: #eff6ff; border: 1.5px solid #2563eb; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 900; text-transform: uppercase; background-color: #1d4ed8; color: #ffffff;">
                    Saldo ${remainingPercent}%
                  </span>
                  <span style="font-size: 10px; font-weight: 700; color: #172554;">
                    Na entrega da obra
                  </span>
                </div>
                <span style="font-family: monospace; font-weight: 900; font-size: 12px; color: #1e40af;">
                  ${formatCurrency(remainingValue)}
                </span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Pinned Bottom Signatures & Footer -->
    <div style="margin-top: auto; padding-top: 16px; border-top: 2px solid #cbd5e1;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; text-align: center;">
        <div>
          <div style="width: 220px; margin: 0 auto 6px auto; border-bottom: 2px solid #020617;"></div>
          <p style="font-weight: 900; color: #020617; font-size: 12px; margin: 0; line-height: 1.2;">
            ${quote.client_name}
          </p>
          <p style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin: 2px 0 0 0;">
            Assinatura do Cliente
          </p>
        </div>

        <div>
          <div style="width: 220px; margin: 0 auto 6px auto; border-bottom: 2px solid #020617;"></div>
          <p style="font-weight: 900; color: #020617; font-size: 12px; margin: 0; line-height: 1.2;">
            ${company.trade_name || 'OZIEL SOLUÇÕES RESIDENCIAIS'}
          </p>
          <p style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin: 2px 0 0 0;">
            Responsável pela Empresa
          </p>
        </div>
      </div>

      <!-- Rodapé com contatos -->
      <div style="margin-top: 12px; text-align: center; font-size: 10px; font-weight: 600; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 6px;">
        ${company.trade_name || 'OZIEL SOLUÇÕES'} • ${company.phone || '(19) 98272-3118'} • ${company.email || 'contato@oziservicos.com.br'} • ${company.address || 'Rua das Indústrias'}, ${company.number || '100'} - ${company.city || 'Limeira'}/${company.state || 'SP'}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Aguardar imagens carregarem para não ficarem em branco
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
                setTimeout(resolve, 1500); // Timeout de segurança
              }
            })
        )
      );
    }

    // Aguardar fontes caso estejam carregando
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Renderizar via html2canvas-pro com suporte nativo a oklch()
    const canvas = await html2canvas(container, {
      scale: 2, // 2x escala para texto ultra nítido no PDF
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
      windowHeight: 1123,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Dimensões A4: 210mm x 297mm
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    
    // Nome limpo para o arquivo
    const safeCode = (quote.code || 'ORC').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeClient = (quote.client_name || 'Cliente').substring(0, 20).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Orcamento_${safeCode}_${safeClient}.pdf`;

    pdf.save(filename);
  } finally {
    // Remover o container off-screen
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
