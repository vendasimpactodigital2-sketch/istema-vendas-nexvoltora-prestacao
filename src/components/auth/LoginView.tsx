import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Building,
  User as UserIcon,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    company,
    users,
    setActiveTab,
    login,
    loginWithFirebaseEmail,
    registerWithFirebaseEmail,
    loginWithFirebaseGoogle,
    resetFirebasePassword,
  } = useApp();

  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('ADMINISTRADOR');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessInfo('');
    setIsLoading(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Por favor, informe seu e-mail.');
      setIsLoading(false);
      return;
    }
    if (!password) {
      setErrorMessage('Por favor, digite sua senha.');
      setIsLoading(false);
      return;
    }

    try {
      const user = await loginWithFirebaseEmail(trimmedEmail, password);
      if (user.role === 'ORÇAMENTISTA') {
        setActiveTab('appointments');
      } else {
        setActiveTab('calendar');
      }
    } catch (err: any) {
      console.warn('Firebase login attempt:', err);
      const localMatched = users.find(
        (u) => u.email.toLowerCase() === trimmedEmail.toLowerCase()
      );
      if (localMatched && (!localMatched.password || localMatched.password === password)) {
        login(trimmedEmail, password);
        setActiveTab(localMatched.role === 'ORÇAMENTISTA' ? 'appointments' : 'calendar');
      } else if (err?.code === 'auth/api-key-not-valid' || err?.message?.includes('api-key-not-valid')) {
        setErrorMessage(
          'Chave de API do Firebase inválida (auth/api-key-not-valid). Verifique as configurações no Firebase Console.'
        );
      } else {
        setErrorMessage(
          err.message || 'Credenciais inválidas. Verifique seu e-mail e senha.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessInfo('');

    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim().toLowerCase();

    if (!trimmedName) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      await registerWithFirebaseEmail(trimmedEmail, regPassword, {
        name: trimmedName,
        role: regRole,
      });

      if (regRole === 'ORÇAMENTISTA') {
        setActiveTab('appointments');
      } else {
        setActiveTab('calendar');
      }
    } catch (err: any) {
      console.error('Firebase register error:', err);
      if (err?.code === 'auth/api-key-not-valid' || err?.message?.includes('api-key-not-valid')) {
        setErrorMessage(
          'Chave de API do Firebase inválida (auth/api-key-not-valid).'
        );
      } else {
        setErrorMessage(err.message || 'Erro ao registrar usuário.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setSuccessInfo('');
    setIsLoading(true);
    try {
      const user = await loginWithFirebaseGoogle();
      if (user.role === 'ORÇAMENTISTA') {
        setActiveTab('appointments');
      } else {
        setActiveTab('calendar');
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Falha ao conectar com conta Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Informe seu e-mail no campo acima para redefinir a senha.');
      return;
    }
    try {
      setIsLoading(true);
      await resetFirebasePassword(trimmedEmail);
      setSuccessInfo(`E-mail de recuperação de senha enviado para ${trimmedEmail}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao solicitar recuperação de senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center relative overflow-hidden bg-slate-950 p-4">
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-[1px]"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80")',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/90" />

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-sm my-auto">
        <div className="p-7 sm:p-8 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl text-white">
          
          {/* Logo com o nome em baixo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-1 rounded-2xl bg-slate-800/80 border border-blue-500/30 mb-3 shadow-xl shadow-blue-500/10">
              <img
                src="/nexvoltora.png"
                alt="Nexvoltora Gestão e Prestação de Serviços"
                className="w-16 h-16 rounded-xl object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
              Nexvoltora Gestão e Prestação de Serviços
            </h1>
            <p className="text-[11px] text-blue-400 font-semibold tracking-wide mt-1 uppercase">
              Mais Visibilidade • Mais Clientes • Mais Resultados
            </p>
          </div>

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <p className="font-medium leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Mensagem de Sucesso */}
          {successInfo && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-medium">{successInfo}</span>
            </div>
          )}

          {authMode === 'login' ? (
            /* Formulário de Login */
            <form onSubmit={handleLogin} className="space-y-4">
              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Esqueceu a senha */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Acessando...</span>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Separador */}
              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <span className="relative bg-slate-900 px-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  ou
                </span>
              </div>

              {/* Entre com a conta do Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-white text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Entre com a conta do Google</span>
              </button>

              {/* Cadastro */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  Não possui conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setErrorMessage('');
                      setSuccessInfo('');
                    }}
                    className="font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Cadastre-se
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* Formulário de Cadastro */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome completo
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha (mínimo 6 dígitos)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cargo
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="ORÇAMENTISTA">Orçamentista</option>
                  <option value="FUNCIONÁRIO">Funcionário</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? <span>Cadastrando...</span> : <span>Criar Conta</span>}
              </button>

              <div className="text-center pt-1">
                <span className="inline-flex items-center text-[11px] text-emerald-400 font-medium">
                  ✓ Inclui 15 dias de teste grátis com todas as funcionalidades liberadas
                </span>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  Já possui conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMessage('');
                      setSuccessInfo('');
                    }}
                    className="font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Entrar
                  </button>
                </p>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
