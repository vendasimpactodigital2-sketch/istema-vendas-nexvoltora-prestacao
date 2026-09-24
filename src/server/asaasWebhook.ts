import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';

export const ASAAS_WEBHOOK_SECRET = 'whsec_9ao6p0ebFi8SxqB6a5nj_BIsprfdkrkCTIgaE5gsx6I';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCsjm5EGc8KDj2kYNkZraoWqi0aAUjc8tQ',
  authDomain: 'projeto-57b28.firebaseapp.com',
  projectId: 'projeto-57b28',
  storageBucket: 'projeto-57b28.firebasestorage.app',
  messagingSenderId: '951689731996',
  appId: '1:951689731996:web:d48f616efbb8cdac89b259',
  measurementId: 'G-11BQLRG9E2',
};

// Initialize server-side Firebase app
const serverFirebaseApp = getApps().some((app) => app.name === 'asaas-server')
  ? getApp('asaas-server')
  : initializeApp(firebaseConfig, 'asaas-server');

const firestoreDb = getFirestore(serverFirebaseApp);

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
    console.error('[Asaas Webhook] Erro ao salvar assinatura localmente:', err);
  }
}

export function isSubscriptionActiveLocally(emailOrUid: string): boolean {
  try {
    ensureDataDir();
    const data = JSON.parse(fs.readFileSync(ACTIVE_SUBS_FILE, 'utf-8') || '{}');
    const key = emailOrUid.toLowerCase().trim();
    if (data[key] && data[key].subscriptionStatus === 'active') {
      return true;
    }
    // Check if any record has this email or uid
    return Object.values(data).some(
      (sub: any) =>
        sub.email?.toLowerCase().trim() === key ||
        sub.uid === emailOrUid ||
        sub.id === emailOrUid
    );
  } catch (err) {
    return false;
  }
}

/**
 * Handler do Webhook do Asaas
 * Rota: POST /api/webhooks/asaas
 */
export async function handleAsaasWebhook(req: Request, res: Response) {
  const timestamp = new Date().toISOString();
  console.log(`\n======================================================`);
  console.log(`[Asaas Webhook] [${timestamp}] Nova requisição recebida`);
  console.log(`======================================================`);

  // 1. Validação do Token de Segurança
  // O Asaas envia o token de autenticação configurado no header 'asaas-access-token'
  const receivedToken =
    req.headers['asaas-access-token'] ||
    req.headers['x-asaas-access-token'] ||
    (typeof req.headers['authorization'] === 'string'
      ? req.headers['authorization'].replace(/^Bearer\s+/i, '').trim()
      : null) ||
    req.query.token ||
    req.query.accessToken ||
    req.body?.token;

  if (!receivedToken || receivedToken !== ASAAS_WEBHOOK_SECRET) {
    console.warn(`[Asaas Webhook] ⚠️ Token de autenticação inválido ou ausente:`, {
      received: receivedToken ? `${String(receivedToken).slice(0, 10)}...` : 'Nenhum',
      expected: `${ASAAS_WEBHOOK_SECRET.slice(0, 10)}...`,
    });
    return res.status(401).json({
      error: 'Unauthorized: Token de webhook inválido.',
      message: 'O token fornecido não corresponde ao configurado.',
    });
  }

  console.log(`[Asaas Webhook] Token validado com sucesso!`);

  // 2. Verificação do Evento
  // O usuário solicitou escutar o evento 'PAYMENT_RECEIVED'
  const event = req.body?.event;
  console.log(`[Asaas Webhook] Evento recebido: ${event}`);

  // Se for teste do painel do Asaas ou outro evento secundário, responde 200 para confirmar recebimento
  if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
    console.log(`[Asaas Webhook] Evento '${event}' recebido e confirmado (apenas 'PAYMENT_RECEIVED' ativa a assinatura).`);
    return res.status(200).json({
      received: true,
      event,
      message: `Evento '${event}' recebido. O sistema aguarda 'PAYMENT_RECEIVED' para ativação.`,
    });
  }

  // 3. Extração do E-mail do Cliente Comprador que vem no body
  const payment = req.body?.payment || {};
  const customer = req.body?.customer || {};

  const extractedEmail: string | undefined = (
    payment.customerEmail ||
    payment.clientEmail ||
    payment.email ||
    payment.customer?.email ||
    customer.email ||
    req.body?.customerEmail ||
    req.body?.email ||
    payment.creditCard?.creditCardHolderEmail ||
    payment.externalReference ||
    req.body?.externalReference
  );

  console.log(`[Asaas Webhook] Dados do pagamento:`, {
    paymentId: payment.id,
    value: payment.value,
    billingType: payment.billingType,
    status: payment.status,
    customer: payment.customer,
    extractedEmail,
  });

  if (!extractedEmail || typeof extractedEmail !== 'string' || !extractedEmail.includes('@')) {
    console.warn(`[Asaas Webhook] ⚠️ Não foi possível identificar o e-mail do cliente no body:`, req.body);
    return res.status(400).json({
      error: 'E-mail do comprador não encontrado no payload do pagamento.',
      receivedPayload: req.body,
    });
  }

  const normalizedEmail = extractedEmail.toLowerCase().trim();
  console.log(`[Asaas Webhook] E-mail do comprador identificado: "${normalizedEmail}"`);

  // 4. Salva imediatamente na persistência local e memória para liberação garantida
  saveSubscriptionLocally(normalizedEmail, {
    email: normalizedEmail,
    paymentId: payment.id,
    value: payment.value,
    billingType: payment.billingType,
    event,
  });

  // 5. Busca esse e-mail na coleção "users" do Firestore e altera o 'subscriptionStatus' para 'active'
  let firestoreUpdated = false;
  let updatedUserId: string | null = null;

  try {
    console.log(`[Asaas Webhook] Buscando na coleção "users" do Firestore pelo e-mail: "${normalizedEmail}"...`);
    
    // Consulta por e-mail exato
    const usersRef = collection(firestoreDb, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const snap = await getDocs(q);

    if (!snap.empty) {
      for (const userDoc of snap.docs) {
        updatedUserId = userDoc.id;
        const currentData = userDoc.data();
        console.log(`[Asaas Webhook] Usuário encontrado no Firestore (ID: ${userDoc.id}). Atualizando subscriptionStatus para 'active'...`);

        await updateDoc(doc(firestoreDb, 'users', userDoc.id), {
          subscriptionStatus: 'active',
          trialEndsAt: null,
          lastPaymentId: payment.id || null,
          lastPaymentDate: new Date().toISOString(),
          paymentMethod: payment.billingType || 'ASAAS',
          updatedAt: new Date().toISOString(),
        });

        firestoreUpdated = true;
        console.log(`[Asaas Webhook] Firestore atualizado com sucesso para o usuário ${userDoc.id}!`);
      }
    } else {
      console.log(`[Asaas Webhook] Nenhum usuário encontrado com query exata. Tentando busca por ID ou prefixo...`);
      // Tentativa de buscar pelo doc direto se for igual ao email ou externalReference
      if (payment.externalReference) {
        try {
          const directRef = doc(firestoreDb, 'users', payment.externalReference);
          const directSnap = await getDocs(query(usersRef, where('uid', '==', payment.externalReference)));
          if (!directSnap.empty) {
            for (const d of directSnap.docs) {
              await updateDoc(doc(firestoreDb, 'users', d.id), {
                subscriptionStatus: 'active',
                trialEndsAt: null,
                lastPaymentId: payment.id || null,
                updatedAt: new Date().toISOString(),
              });
              firestoreUpdated = true;
              updatedUserId = d.id;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (firestoreError: any) {
    console.error(`[Asaas Webhook] Erro ao atualizar Firestore diretamente:`, firestoreError?.message || firestoreError);
    // Mesmo se houver erro de permissão ou rede no Firestore, a assinatura foi gravada localmente
    // e será sincronizada assim que o cliente autenticado entrar no sistema.
  }

  console.log(`[Asaas Webhook] Processamento concluído com sucesso.`);
  console.log(`======================================================\n`);

  return res.status(200).json({
    success: true,
    message: `Pagamento recebido e assinatura ativada com sucesso para ${normalizedEmail}!`,
    event,
    buyerEmail: normalizedEmail,
    firestoreUpdated,
    updatedUserId,
    subscriptionStatus: 'active',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Endpoint para checar status da assinatura pelo email ou UID
 * Rota: GET /api/subscription/status?email=...&uid=...
 */
export async function checkSubscriptionStatusEndpoint(req: Request, res: Response) {
  const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : '';
  const uid = typeof req.query.uid === 'string' ? req.query.uid.trim() : '';

  if (!email && !uid) {
    return res.status(400).json({ error: 'Parâmetro email ou uid é obrigatório.' });
  }

  const isLocallyActive = (email && isSubscriptionActiveLocally(email)) || (uid && isSubscriptionActiveLocally(uid));

  return res.json({
    email,
    uid,
    active: isLocallyActive,
    subscriptionStatus: isLocallyActive ? 'active' : 'trial',
  });
}
