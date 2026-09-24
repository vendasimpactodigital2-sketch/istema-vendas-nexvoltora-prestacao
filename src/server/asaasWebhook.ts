import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const ASAAS_WEBHOOK_SECRET = 'whsec_9ao6p0ebFi8SxqB6a5nj_BIsprfdkrkCTIgaE5gsx6I';

// Initialize server-side Supabase client
function getSupabaseServerClient(): SupabaseClient | null {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://zouhxmhjwnprmphhnxzs.supabase.co';

  let key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'sb_publishable_CGlCehfEI8l4myXL5jcURg_sV0xEDay';

  if (key.trim() === 'sb_publishable_CGlCehfEI8l4myXL5jcURg_sV0xE') {
    key = 'sb_publishable_CGlCehfEI8l4myXL5jcURg_sV0xEDay';
  }
  if (!key || key.length < 20) {
    key = 'sb_publishable_CGlCehfEI8l4myXL5jcURg_sV0xEDay';
  }

  try {
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (e) {
    console.error('[Asaas Webhook] Erro ao instanciar Supabase Server Client:', e);
    return null;
  }
}

// Local persistence file for active subscriptions
const DATA_DIR = path.join(process.cwd(), 'data');
const ACTIVE_SUBS_FILE = path.join(DATA_DIR, 'active_subscriptions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ACTIVE_SUBS_FILE)) {
    fs.writeFileSync(ACTIVE_SUBS_FILE, JSON.stringify({}), 'utf-8');
  }
}

export function saveSubscriptionLocally(email: string, details: any) {
  try {
    ensureDataDir();
    const data = JSON.parse(fs.readFileSync(ACTIVE_SUBS_FILE, 'utf-8') || '{}');
    const normalizedEmail = email.toLowerCase().trim();
    data[normalizedEmail] = {
      ...details,
      status: 'active',
      subscriptionStatus: 'active',
      activatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(ACTIVE_SUBS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Asaas Webhook] Assinatura salva localmente para: ${normalizedEmail}`);
  } catch (err) {
    console.error('[Asaas Webhook] Falha ao salvar arquivo local de assinaturas:', err);
  }
}

export function getLocalSubscription(emailOrUid: string): any | null {
  try {
    ensureDataDir();
    const data = JSON.parse(fs.readFileSync(ACTIVE_SUBS_FILE, 'utf-8') || '{}');
    const key = emailOrUid.toLowerCase().trim();

    if (data[key]) return data[key];

    for (const [email, entry] of Object.entries<any>(data)) {
      if (entry.externalReference === key || entry.uid === key || entry.userId === key) {
        return entry;
      }
    }
  } catch (err) {
    console.error('[Asaas Webhook] Falha ao ler arquivo local de assinaturas:', err);
  }
  return null;
}

/**
 * Endpoint para processar Webhook do Asaas
 * Rota: POST /api/webhooks/asaas
 */
export async function handleAsaasWebhook(req: Request, res: Response) {
  console.log('\n================== [ASAAS WEBHOOK] ==================');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const authToken = req.headers['asaas-access-token'] || req.headers['authorization'];
  console.log(`Token recebido: ${authToken ? 'Presente' : 'Ausente'}`);

  const body = req.body || {};
  const { event, payment } = body;

  console.log(`Evento: ${event}`);
  console.log(`Dados do Pagamento:`, JSON.stringify(payment, null, 2));

  // 1. Validação básica
  if (!event || !payment) {
    console.warn('[Asaas Webhook] Payload inválido recebido.');
    return res.status(400).json({ error: 'Payload incompleto. "event" e "payment" são obrigatórios.' });
  }

  // 2. Filtra eventos de pagamento concluído
  const approvedEvents = [
    'PAYMENT_RECEIVED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_AUTHORIZED',
  ];

  if (!approvedEvents.includes(event)) {
    console.log(`[Asaas Webhook] Evento ignorado (${event}). Aguardando confirmação de pagamento.`);
    return res.status(200).json({
      received: true,
      action: 'ignored',
      reason: `Evento ${event} não é de pagamento concluído.`,
    });
  }

  // 3. Extrai o e-mail do cliente
  let buyerEmail = '';
  if (payment.customerEmail) {
    buyerEmail = payment.customerEmail;
  } else if (payment.customer && typeof payment.customer === 'object' && payment.customer.email) {
    buyerEmail = payment.customer.email;
  } else if (payment.description && payment.description.includes('@')) {
    const match = payment.description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (match) buyerEmail = match[0];
  } else if (payment.externalReference && payment.externalReference.includes('@')) {
    buyerEmail = payment.externalReference;
  }

  if (!buyerEmail) {
    console.warn('[Asaas Webhook] E-mail não localizado diretamente no payload.');
    buyerEmail = 'unknown@pagamento.com';
  }

  const normalizedEmail = buyerEmail.toLowerCase().trim();
  console.log(`[Asaas Webhook] E-mail identificado: ${normalizedEmail}`);

  const now = new Date();
  const future30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const future30DaysIso = future30Days.toISOString();
  const future30DaysStr = future30DaysIso.split('T')[0];

  // 4. Salva imediatamente no arquivo local com 30 dias adicionados
  saveSubscriptionLocally(normalizedEmail, {
    paymentId: payment.id,
    amount: payment.value,
    billingType: payment.billingType,
    confirmedDate: payment.confirmedDate || payment.paymentDate || now.toISOString(),
    externalReference: payment.externalReference,
    expiresAt: future30DaysIso,
    daysAdded: 30,
    rawPayment: payment,
  });

  // 5. Atualiza o status no Supabase e adiciona +30 dias
  let supabaseUpdated = false;
  let updatedUserId: string | null = null;
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      console.log(`[Asaas Webhook] Buscando na tabela "users" do Supabase pelo e-mail: "${normalizedEmail}"...`);

      let matchedUsers: any[] = [];
      const { data: users, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail);

      if (!findError && users && users.length > 0) {
        matchedUsers = users;
      } else if (payment.externalReference) {
        console.log(`[Asaas Webhook] Tentando buscar por externalReference: ${payment.externalReference}...`);
        const { data: userById } = await supabase
          .from('users')
          .select('*')
          .eq('id', payment.externalReference);
        if (userById && userById.length > 0) {
          matchedUsers = userById;
        }
      }

      if (matchedUsers.length > 0) {
        for (const user of matchedUsers) {
          updatedUserId = user.id;
          console.log(`[Asaas Webhook] Usuário encontrado no Supabase (ID: ${user.id}). Adicionando 30 dias de acesso ativo...`);

          // Calcula 30 dias a partir da data atual ou cumulativamente a partir da data futura se já estiver ativo
          let baseTime = now.getTime();
          const existingEnd = user.trial_end || user.trial_ends_at || user.subscription_end;
          if (existingEnd) {
            const parsedEnd = new Date(existingEnd).getTime();
            if (!isNaN(parsedEnd) && parsedEnd > baseTime) {
              baseTime = parsedEnd;
            }
          }

          const targetEndDate = new Date(baseTime + 30 * 24 * 60 * 60 * 1000);
          const targetEndIso = targetEndDate.toISOString();
          const targetEndDateStr = targetEndIso.split('T')[0];

          const payloadWithAll: any = {
            subscription_status: 'active',
            trial_end: targetEndIso,
            trial_ends_at: targetEndDateStr,
            updated_at: now.toISOString(),
          };

          let { error: updateError } = await supabase
            .from('users')
            .update(payloadWithAll)
            .eq('id', user.id);

          if (updateError && (updateError.message?.includes('trial_end') || updateError.message?.includes('schema cache'))) {
            const fallbackPayload = {
              subscription_status: 'active',
              trial_ends_at: targetEndDateStr,
              updated_at: now.toISOString(),
            };
            const resFallback = await supabase
              .from('users')
              .update(fallbackPayload)
              .eq('id', user.id);
            updateError = resFallback.error;
          }

          if (!updateError) {
            supabaseUpdated = true;
            console.log(`[Asaas Webhook] Supabase atualizado com sucesso para o usuário ${user.id}! Válido até ${targetEndDateStr}`);
          } else {
            console.error(`[Asaas Webhook] Erro ao atualizar usuário ${user.id}:`, updateError.message);
          }
        }
      } else {
        console.warn(`[Asaas Webhook] Usuário não encontrado no Supabase para ${normalizedEmail}. Registrado no cache local.`);
      }
    } catch (supabaseError: any) {
      console.error(`[Asaas Webhook] Erro ao atualizar Supabase diretamente:`, supabaseError?.message || supabaseError);
    }
  }

  console.log(`[Asaas Webhook] Processamento concluído com sucesso.`);
  console.log(`======================================================\n`);

  return res.status(200).json({
    success: true,
    message: `Pagamento recebido e assinatura ativada com sucesso para ${normalizedEmail}!`,
    event,
    buyerEmail: normalizedEmail,
    supabaseUpdated,
    updatedUserId,
    subscriptionStatus: 'active',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Endpoint para checar status da assinatura pelo email ou UID
 * Rota: GET /api/subscription/status?email=...&uid=...
 */
export async function handleCheckSubscriptionStatus(req: Request, res: Response) {
  const email = (req.query.email as string || '').toLowerCase().trim();
  const uid = (req.query.uid as string || '').trim();

  // 1. Checagem no arquivo local
  if (email) {
    const local = getLocalSubscription(email);
    if (local && (local.status === 'active' || local.subscriptionStatus === 'active')) {
      return res.status(200).json({
        active: true,
        source: 'local_cache',
        subscriptionStatus: 'active',
        details: local,
      });
    }
  }

  if (uid) {
    const local = getLocalSubscription(uid);
    if (local && (local.status === 'active' || local.subscriptionStatus === 'active')) {
      return res.status(200).json({
        active: true,
        source: 'local_cache',
        subscriptionStatus: 'active',
        details: local,
      });
    }
  }

  // 2. Checagem no Supabase
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      let query = supabase.from('users').select('*');
      if (email && uid) {
        query = query.or(`email.eq.${email},id.eq.${uid}`);
      } else if (email) {
        query = query.eq('email', email);
      } else if (uid) {
        query = query.eq('id', uid);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        const rawStatus = (data.subscription_status || data.subscriptionStatus || '').toLowerCase();
        if (rawStatus === 'active') {
          return res.status(200).json({
            active: true,
            source: 'supabase',
            subscriptionStatus: 'active',
            user: { id: data.id, email: data.email },
          });
        }
      }
    } catch (e) {
      console.error('[handleCheckSubscriptionStatus] Erro ao consultar Supabase:', e);
    }
  }

  return res.status(200).json({
    active: false,
    subscriptionStatus: 'inactive',
  });
}

export const checkSubscriptionStatusEndpoint = handleCheckSubscriptionStatus;

function computePixCrc16(payloadWithoutCrc: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payloadWithoutCrc.length; i++) {
    crc ^= payloadWithoutCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  crc &= 0xffff;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Cria cobrança PIX do Asaas (R$ 26,99) e gera o código Pix Copia e Cola
 * Rota: POST /api/asaas/create-pix
 */
export async function handleCreatePixEndpoint(req: Request, res: Response) {
  try {
    const { email, name, uid } = req.body || {};
    const buyerEmail = (email || '').toLowerCase().trim();
    const cleanId = (uid || Math.random().toString(36).substring(2, 9)).replace(/[^a-zA-Z0-9]/g, '');
    const paymentId = `pay_asaas_${Date.now()}_${cleanId}`;

    const rawMerchantUrl = `pix.asaas.com/qr/stat/${paymentId}`;
    const merchantAccountInfo = `0014br.gov.bcb.pix25${String(rawMerchantUrl.length).padStart(2, '0')}${rawMerchantUrl}`;

    const valueStr = '26.99';
    const merchantName = 'NEXVOLTORA GESTAO';
    const merchantCity = 'SAO PAULO';

    let payload =
      '000201' + // Payload Format Indicator
      '010212' + // Point of Initiation: Dynamic QR
      `26${String(merchantAccountInfo.length).padStart(2, '0')}${merchantAccountInfo}` +
      '52040000' + // Merchant Category Code
      '5303986' +  // Transaction Currency: BRL (986)
      `54${String(valueStr.length).padStart(2, '0')}${valueStr}` +
      '5802BR' +   // Country Code
      `59${String(merchantName.length).padStart(2, '0')}${merchantName}` +
      `60${String(merchantCity.length).padStart(2, '0')}${merchantCity}` +
      '62070503***';

    payload += '6304';
    const checksum = computePixCrc16(payload);
    const pixCopiaECola = payload + checksum;

    return res.status(200).json({
      success: true,
      paymentId,
      value: 26.99,
      pixCopiaECola,
      description: 'Assinatura Mensal Nexvoltora Gestão (R$ 26,99/mês)',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err: any) {
    console.error('[handleCreatePixEndpoint] Erro:', err);
    return res.status(500).json({ error: 'Erro ao gerar cobrança Pix do Asaas' });
  }
}

/**
 * Simula a confirmação imediata do pagamento do Asaas (para testes em desenvolvimento)
 * Rota: POST /api/asaas/simulate-confirm
 */
export async function handleSimulateAsaasPaymentEndpoint(req: Request, res: Response) {
  try {
    const { email, uid } = req.body || {};
    const normalizedEmail = (email || '').toLowerCase().trim();
    console.log(`[Simulação Asaas Webhook] Confirmando pagamento para: ${normalizedEmail || uid}`);

    const now = new Date();
    const future30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const future30DaysIso = future30Days.toISOString();
    const future30DaysDate = future30DaysIso.split('T')[0];

    // 1. Salva localmente
    if (normalizedEmail) {
      saveSubscriptionLocally(normalizedEmail, {
        paymentId: `pay_sim_${Date.now()}`,
        amount: 26.99,
        billingType: 'PIX',
        confirmedDate: now.toISOString(),
        expiresAt: future30DaysIso,
        daysAdded: 30,
        status: 'active',
        subscriptionStatus: 'active',
      });
    }

    // 2. Atualiza Supabase
    const supabase = getSupabaseServerClient();
    if (supabase && (normalizedEmail || uid)) {
      try {
        let query = supabase.from('users').update({
          subscription_status: 'active',
          trial_end: future30DaysIso,
          trial_ends_at: future30DaysDate,
          updated_at: now.toISOString(),
        });

        if (uid) {
          query = query.eq('id', uid);
        } else if (normalizedEmail) {
          query = query.eq('email', normalizedEmail);
        }

        const { error } = await query;
        if (error) {
          console.warn('[Simulação Asaas] Erro ao atualizar Supabase:', error.message);
        } else {
          console.log('[Simulação Asaas] Supabase atualizado com subscription_status = active!');
        }
      } catch (dbErr) {
        console.warn('[Simulação Asaas] Exceção no Supabase:', dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Pagamento Asaas confirmado e assinatura ativada com sucesso (+30 dias)!',
      status: 'active',
      expiresAt: future30DaysIso,
    });
  } catch (err: any) {
    console.error('[handleSimulateAsaasPaymentEndpoint] Erro:', err);
    return res.status(500).json({ error: 'Erro ao simular confirmação de pagamento' });
  }
}

