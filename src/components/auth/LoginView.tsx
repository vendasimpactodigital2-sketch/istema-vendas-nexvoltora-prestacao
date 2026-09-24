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
    addUser,
    loginWithSupabaseEmail,
    registerWithSupabaseEmail,
    resetSupabasePassword,
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
      const user = await loginWithSupabaseEmail(trimmedEmail, password);
      if (user.role === 'ORÇAMENTISTA') {
        setActiveTab('appointments');
      } else {
        setActiveTab('calendar');
      }
    } catch (err: any) {
      console.warn('Supabase login attempt:', err);
      const localMatched = users.find(
        (u) => u.email.toLowerCase() === trimmedEmail.toLowerCase()
      );
      if (localMatched && (!localMatched.password || localMatched.password === password)) {
        login(trimmedEmail, password);
        setActiveTab(localMatched.role === 'ORÇAMENTISTA' ? 'appointments' : 'calendar');
      } else {
        const rawMsg = (err?.message || '').toLowerCase();
        if (rawMsg.includes('invalid api key')) {
          try {
            const retryUser = await loginWithSupabaseEmail(trimmedEmail, password);
            setActiveTab(retryUser.role === 'ORÇAMENTISTA' ? 'appointments' : 'calendar');
            return;
          } catch {
            setErrorMessage('E-mail ou senha incorretos. Por favor, confira os dados digitados.');
          }
        } else if (rawMsg.includes('invalid login credentials') || rawMsg.includes('invalid_credentials')) {
          setErrorMessage('E-mail ou senha incorretos. Por favor, confira os dados digitados.');
        } else if (rawMsg.includes('email not confirmed')) {
          setErrorMessage('E-mail ainda não confirmado. Verifique o link de confirmação na sua caixa de entrada.');
        } else {
          setErrorMessage(
            err.message || 'Credenciais inválidas. Verifique seu e-mail e senha.'
          );
        }
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
      await registerWithSupabaseEmail(trimmedEmail, regPassword, {
        name: trimmedName,
        role: regRole,
      });

      if (regRole === 'ORÇAMENTISTA') {
        setActiveTab('appointments');
      } else {
        setActiveTab('calendar');
      }
    } catch (err: any) {
      console.error('Supabase register error:', err);
      const rawMsg = (err?.message || '').toLowerCase();
      if (rawMsg.includes('user already registered') || rawMsg.includes('already registered')) {
        setErrorMessage('Este e-mail já está cadastrado. Faça login com sua senha.');
      } else if (rawMsg.includes('password should be')) {
        setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      } else {
        // Fallback resiliente: cria o cadastro local garantindo acesso imediato ao sistema
        try {
          addUser({
            company_id: company.id || 'comp_ozi_01',
            name: trimmedName,
            email: trimmedEmail,
            role: regRole,
            phone: '(11) 98765-4321',
            whatsapp: '(11) 98765-4321',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            active: true,
            password: regPassword,
            subscriptionStatus: 'trial',
            trialEndsAt: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          });
          login(trimmedEmail, regPassword);
          if (regRole === 'ORÇAMENTISTA') {
            setActiveTab('appointments');
          } else {
            setActiveTab('calendar');
          }
        } catch (localErr: any) {
          setErrorMessage(err.message || 'Erro ao registrar usuário.');
        }
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
      await resetSupabasePassword(trimmedEmail);
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

              {/* Cadastro */}
              <div className="text-center pt-3">
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
