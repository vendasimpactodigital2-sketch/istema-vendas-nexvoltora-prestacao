import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { 
 initializeFirestore,
  doc, 
  getDoc, 
  setDoc, 
  getDocFromServer,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { User, UserRole } from '../types';

const apiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_API_KEY) || 
  'AIzaSyCsjm5EGc8KDj2kYNkZraoWqi0aAUjc8tQ';

export const firebaseConfig = {
  apiKey,
  authDomain: "projeto-57b28.firebaseapp.com",
  projectId: "projeto-57b28",
  storageBucket: "projeto-57b28.firebasestorage.app",
  messagingSenderId: "951689731996",
  appId: "1:951689731996:web:d48f616efbb8cdac89b259",
  measurementId: "G-11BQLRG9E2"
};

// Inicializa o Firebase com segurança
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = initializeFirestore(app, { databaseId: 'ai-studio-graficasistemasi-60169481-87ea-46e1-bba4-d73695f2dd92' });

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: Array<{
      providerId: string;
      email: string | null;
    }> | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Teste de conexão com o Firestore
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline. Please check your network.');
    }
    return false;
  }
}

testConnection().catch((err) => console.log('Firebase connection test initial probe:', err));

// Helper para calcular a data limite do período de teste de 15 dias (formato AAAA-MM-DD)
export function calculateTrialEndsAt(days = 15): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function parseTrialDate(rawDate: any): string | null {
  if (!rawDate) return null;
  if (typeof rawDate === 'object') {
    if (typeof rawDate.toDate === 'function') {
      try {
        return rawDate.toDate().toISOString().split('T')[0];
      } catch (e) {
        // ignore
      }
    }
    if (typeof rawDate.seconds === 'number') {
      return new Date(rawDate.seconds * 1000).toISOString().split('T')[0];
    }
    if (rawDate instanceof Date) {
      return rawDate.toISOString().split('T')[0];
    }
  }
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split('/');
      return `${y}-${m}-${d}`;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  return null;
}

export interface SubscriptionStatusInfo {
  isBlocked: boolean;
  status: string; // 'trial' | 'active' | 'expired' | string
  trialEndsAt?: string;
  isExpired: boolean;
  daysRemaining?: number;
}

/**
 * Avalia o status da assinatura do usuário conforme as regras:
 * 1. Se subscriptionStatus for 'active', o acesso é permitido.
 * 2. Se subscriptionStatus for 'trial', compara a data atual com trialEndsAt.
 *    Se a data de hoje já passou do limite de 15 dias, o teste venceu e o acesso é bloqueado.
 * 3. Se subscriptionStatus não for 'active' nem teste válido, o acesso é bloqueado.
 */
export function evaluateSubscription(user: Partial<User> | null | undefined): SubscriptionStatusInfo {
  if (!user) {
    return { isBlocked: false, status: 'unknown', isExpired: false };
  }

  // Normalizar campos (suportando variações no Firestore)
  const rawStatus = (
    user.subscriptionStatus ||
    (user as any).subscription_status ||
    (user as any).status ||
    'trial'
  ).toString().trim().toLowerCase();

  const trialEndsAt = parseTrialDate(
    user.trialEndsAt ||
    (user as any).trial_ends_at ||
    (user as any).trialEndDate ||
    (user as any).trial_end
  );

  const todayStr = new Date().toISOString().split('T')[0];

  // Caso específico para o UID kU4JDgCeM6ggMHYuvnixzV quando não estiver active
  if (user.id === 'kU4JDgCeM6ggMHYuvnixzV' && rawStatus !== 'active') {
    return {
      isBlocked: true,
      status: 'expired',
      trialEndsAt: trialEndsAt || '2025-01-01',
      isExpired: true,
      daysRemaining: 0,
    };
  }

  // Se subscriptionStatus for 'active', acesso liberado
  if (rawStatus === 'active') {
    return {
      isBlocked: false,
      status: 'active',
      trialEndsAt: trialEndsAt || undefined,
      isExpired: false,
    };
  }

  // Se for explicitamente expired/vencido/bloqueado/inactive, bloqueia
  if (
    rawStatus === 'expired' ||
    rawStatus === 'vencido' ||
    rawStatus === 'bloqueado' ||
    rawStatus === 'inactive' ||
    rawStatus === 'cancelado' ||
    rawStatus === 'trial_expired'
  ) {
    return {
      isBlocked: true,
      status: 'expired',
      trialEndsAt: trialEndsAt || undefined,
      isExpired: true,
      daysRemaining: 0,
    };
  }

  // Se subscriptionStatus for 'trial', compara a data atual com trialEndsAt
  if (rawStatus === 'trial') {
    if (!trialEndsAt) {
      return {
        isBlocked: true,
        status: 'expired',
        trialEndsAt: undefined,
        isExpired: true,
        daysRemaining: 0,
      };
    }

    const isExpired = todayStr > trialEndsAt;
    if (isExpired) {
      return {
        isBlocked: true,
        status: 'expired',
        trialEndsAt,
        isExpired: true,
        daysRemaining: 0,
      };
    }

    const todayDate = new Date(todayStr);
    const endDate = new Date(trialEndsAt);
    const diffTime = endDate.getTime() - todayDate.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return {
      isBlocked: false,
      status: 'trial',
      trialEndsAt,
      isExpired: false,
      daysRemaining,
    };
  }

  // Regra 4: Qualquer outro status diferente de 'active' bloqueia o acesso
  return {
    isBlocked: true,
    status: rawStatus,
    trialEndsAt: trialEndsAt || undefined,
    isExpired: true,
    daysRemaining: 0,
  };
}

/**
 * Regra 1, 2 e 3: Verifica o documento do usuário na coleção "users" do Firestore.
 * Busca pelo UID direto doc(db, 'users', userId).
 * Se subscriptionStatus for "trial", compara a data atual com trialEndsAt.
 * Se a data de hoje já passou do limite dos 15 dias, atualiza o status para "expired" e altera o acesso.
 */
export async function verifyUserSubscriptionInFirestore(userId: string): Promise<User> {
  const userDocRef = doc(db, 'users', userId);
  const todayStr = new Date().toISOString().split('T')[0];

  console.log('[Firestore] verifyUserSubscriptionInFirestore buscando para UID:', userId);

  try {
    let snap = await getDoc(userDocRef);
    let docData: any = null;

    if (snap.exists()) {
      docData = snap.data();
      console.log('[Firestore] Documento encontrado diretamente por ID:', docData);
    } else {
      // Se não encontrou por ID direto, busca por query de uid ou email
      console.log('[Firestore] Documento não encontrado pelo ID direto, tentando query...');
      const qUid = query(collection(db, 'users'), where('uid', '==', userId));
      const qSnap = await getDocs(qUid);
      if (!qSnap.empty) {
        docData = qSnap.docs[0].data();
        console.log('[Firestore] Documento encontrado por query uid:', docData);
      } else if (auth.currentUser?.email) {
        const qEmail = query(collection(db, 'users'), where('email', '==', auth.currentUser.email));
        const emailSnap = await getDocs(qEmail);
        if (!emailSnap.empty) {
          docData = emailSnap.docs[0].data();
          console.log('[Firestore] Documento encontrado por query email:', docData);
        }
      }
    }

    if (docData) {
      const rawStatus = (
        docData.subscriptionStatus ||
        docData.subscription_status ||
        docData.status ||
        'trial'
      ).toString().trim().toLowerCase();

      const parsedTrialEndsAt = parseTrialDate(
        docData.trialEndsAt ||
        docData.trial_ends_at ||
        docData.trialEndDate ||
        docData.trial_end
      );

      let finalStatus = rawStatus;
      let finalTrialEndsAt = parsedTrialEndsAt || docData.trialEndsAt || calculateTrialEndsAt(15);

      // Regra 3: Se subscriptionStatus for igual a "trial", compara a data atual com trialEndsAt
      if (rawStatus === 'trial') {
        if (parsedTrialEndsAt && todayStr > parsedTrialEndsAt) {
          finalStatus = 'expired';
        }
      } else if (
        rawStatus === 'expired' ||
        rawStatus === 'vencido' ||
        rawStatus === 'inactive' ||
        rawStatus === 'bloqueado' ||
        rawStatus === 'trial_expired'
      ) {
        finalStatus = 'expired';
      }

      // Se for o UID informado com teste vencido
      if (userId === 'kU4JDgCeM6ggMHYuvnixzV' && rawStatus !== 'active') {
        finalStatus = 'expired';
      }

      // Verificação em tempo real: checa se o Webhook do Asaas confirmou o pagamento
      if (finalStatus !== 'active') {
        try {
          const userEmail = docData.email || auth.currentUser?.email || '';
          if (userEmail || userId) {
            const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(userEmail)}&uid=${encodeURIComponent(userId)}`);
            if (res.ok) {
              const checkData = await res.json();
              if (checkData.active || checkData.subscriptionStatus === 'active') {
                console.log('[Firestore] Pagamento confirmado pelo Webhook do Asaas! Ativando plano.');
                finalStatus = 'active';
                finalTrialEndsAt = undefined;
                try {
                  await setDoc(userDocRef, { subscriptionStatus: 'active' }, { merge: true });
                } catch (e) {
                  // ignore
                }
              }
            }
          }
        } catch (fetchErr) {
          // ignore
        }
      }

      const updatedUser: User = {
        id: userId,
        company_id: docData.company_id || 'comp_ozi_01',
        name: docData.name || auth.currentUser?.displayName || 'Usuário Sistema',
        email: docData.email || auth.currentUser?.email || '',
        phone: docData.phone || '(11) 98765-4321',
        whatsapp: docData.whatsapp || docData.phone || '(11) 98765-4321',
        role: docData.role || 'ADMINISTRADOR',
        avatar: docData.avatar || auth.currentUser?.photoURL || 'https://unsplash.com',
        active: true,
        created_at: docData.created_at || todayStr,
        subscriptionStatus: finalStatus,
        trialEndsAt: finalTrialEndsAt,
      };

      if (rawStatus === 'trial' && finalStatus === 'expired') {
        try {
          await setDoc(userDocRef, { subscriptionStatus: 'expired' }, { merge: true });
        } catch (e) {
          console.warn('[Firestore] Não foi possível salvar status expired:', e);
        }
      }

      return updatedUser;
    }
  } catch (err) {
    console.error('[Firestore] Erro ao ler documento do usuário no Firestore:', err);
  }

  // Fallback
  const isTargetExpired = userId === 'kU4JDgCeM6ggMHYuvnixzV';
  return {
    id: userId,
    company_id: 'comp_ozi_01',
    name: auth.currentUser?.displayName || 'Usuário Sistema',
    email: auth.currentUser?.email || '',
    phone: '(11) 98765-4321',
    whatsapp: '(11) 98765-4321',
    role: 'ADMINISTRADOR',
    avatar: auth.currentUser?.photoURL || 'https://unsplash.com',
    active: true,
    created_at: todayStr,
    subscriptionStatus: isTargetExpired ? 'expired' : 'trial',
    trialEndsAt: isTargetExpired ? '2025-01-01' : calculateTrialEndsAt(15),
  };
}

/**
 * Regra 5: Ativação da Assinatura Mensal (R$ 26,99/mês), atualizando o status para "active" no Firestore
 */
export async function activateUserSubscription(userId: string): Promise<User> {
  const userDocRef = doc(db, 'users', userId);
  const snap = await getDoc(userDocRef);
  const current = snap.exists() ? (snap.data() as Partial<User>) : ({} as Partial<User>);

  const updatedUser: User = {
    ...current,
    id: userId,
    company_id: current.company_id || 'comp_ozi_01',
    name: current.name || auth.currentUser?.displayName || 'Usuário Sistema',
    email: current.email || auth.currentUser?.email || '',
    phone: current.phone || '(11) 98765-4321',
    whatsapp: current.whatsapp || '(11) 98765-4321',
    role: current.role || 'ADMINISTRADOR',
    avatar: current.avatar || auth.currentUser?.photoURL || 'https://unsplash.com',
    active: true,
    created_at: current.created_at || new Date().toISOString().split('T')[0],
    subscriptionStatus: 'active',
  };

  try {
    await setDoc(userDocRef, { subscriptionStatus: 'active' }, { merge: true });
  } catch (err) {
    console.warn('Erro ao persistir assinatura ativa no Firestore:', err);
  }

  return updatedUser;
}

// Sincronizar perfil do usuário no Firestore
export async function syncUserProfileToFirestore(
  firebaseUid: string,
  userData: Partial<User>
): Promise<User> {
  const userDocRef = doc(db, 'users', firebaseUid);
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultTrialEnd = calculateTrialEndsAt(15);

  try {
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      const currentData = existingSnap.data() as User;
      let subscriptionStatus = userData.subscriptionStatus || currentData.subscriptionStatus || 'trial';
      let trialEndsAt = userData.trialEndsAt || currentData.trialEndsAt || defaultTrialEnd;

      if (subscriptionStatus === 'trial' && todayStr > trialEndsAt) {
        subscriptionStatus = 'expired';
      }

      const merged: User = {
        ...currentData,
        ...userData,
        id: firebaseUid,
        subscriptionStatus,
        trialEndsAt,
      };
      await setDoc(userDocRef, merged, { merge: true });
      return merged;
    } else {
      const fullUser: User = {
        id: firebaseUid,
        company_id: userData.company_id || 'comp_ozi_01',
        name: userData.name || auth.currentUser?.displayName || 'Usuário Sistema',
        email: userData.email || auth.currentUser?.email || '',
        phone: userData.phone || '(11) 98765-4321',
        whatsapp: userData.whatsapp || userData.phone || '(11) 98765-4321',
        role: userData.role || 'ADMINISTRADOR',
        avatar: userData.avatar || 'https://unsplash.com',
        active: true,
        created_at: todayStr,
        subscriptionStatus: userData.subscriptionStatus || 'trial',
        trialEndsAt: userData.trialEndsAt || defaultTrialEnd,
      };
      await setDoc(userDocRef, fullUser);
      return fullUser;
    }
  } catch (error) {
    console.warn('Could not sync user to Firestore directly:', error);
    return {
      id: firebaseUid,
      company_id: userData.company_id || 'comp_ozi_01',
      name: userData.name || auth.currentUser?.displayName || 'Usuário Sistema',
      email: userData.email || auth.currentUser?.email || '',
      phone: userData.phone || '(11) 98765-4321',
      whatsapp: userData.whatsapp || userData.phone || '(11) 98765-4321',
      role: userData.role || 'ADMINISTRADOR',
      avatar: userData.avatar || 'https://unsplash.com',
      active: true,
      created_at: todayStr,
      subscriptionStatus: userData.subscriptionStatus || 'trial',
      trialEndsAt: userData.trialEndsAt || defaultTrialEnd,
    };
  }
}

// Entrar com E-mail e Senha
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const fbUser = credential.user;

  // Regra 1: Toda vez que o usuário logar, verifica o documento dele na coleção "users" do Firestore
  const verifiedUser = await verifyUserSubscriptionInFirestore(fbUser.uid);
  return verifiedUser;
}

// Registrar com E-mail e Senha
export async function registerWithEmail(
  email: string,
  password: string,
  extra: {
    name: string;
    role: UserRole;
    phone?: string;
    whatsapp?: string;
    company_id?: string;
    avatar?: string;
  }
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const fbUser = credential.user;

  const newUser: User = {
    id: fbUser.uid,
    company_id: extra.company_id || 'comp_ozi_01',
    name: extra.name.trim(),
    email: fbUser.email || email.trim().toLowerCase(),
    phone: extra.phone || '(11) 98765-4321',
    whatsapp: extra.whatsapp || extra.phone || '(11) 98765-4321',
    role: extra.role || 'ADMINISTRADOR',
    avatar: extra.avatar || 'https://unsplash.com',
    active: true,
    created_at: new Date().toISOString().split('T')[0],
    subscriptionStatus: 'trial',
    trialEndsAt: calculateTrialEndsAt(15),
  };

  await syncUserProfileToFirestore(fbUser.uid, newUser);
  return newUser;
}

// Entrar com o Google
export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  const fbUser = credential.user;

  // Regra 1: Toda vez que o usuário logar, verifica o documento dele na coleção "users" do Firestore
  const verifiedUser = await verifyUserSubscriptionInFirestore(fbUser.uid);
  if (!verifiedUser.email && fbUser.email) {
    verifiedUser.email = fbUser.email;
    verifiedUser.name = fbUser.displayName || verifiedUser.name;
    await syncUserProfileToFirestore(fbUser.uid, verifiedUser);
  }
  return verifiedUser;
}

// Enviar e-mail de redefinição de senha
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

// Sair do sistema
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type FirebaseUser };
