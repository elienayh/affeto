import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { adminAuth } from '../lib/adminAuth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor, informe o e-mail de acesso.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Por favor, digite sua senha de gestor.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const result = adminAuth.login(email, password);
      setIsSubmitting(false);

      if (result.success) {
        setEmail('');
        setPassword('');
        setErrorMessage(null);
        onSuccess();
      } else {
        setErrorMessage(result.error || 'Credenciais inválidas.');
      }
    }, 300);
  };

  const handleFillCredentials = () => {
    setEmail('toledodias87@gmail.com');
    setPassword('tamiris123');
    setErrorMessage(null);
  };

  return (
    <div
      id="modal-admin-login-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="modal-admin-login-card"
        className="bg-[#FAF7F0] border border-[#3A2E1F]/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-[#3A2E1F] text-[#F3ECDD] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B8623F] flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#F3ECDD]">
                Painel do Gestor
              </h3>
              <p className="text-[11px] text-[#C4B7A6]">
                Área Restrita da Padaria Affeto
              </p>
            </div>
          </div>
          <button
            id="btn-fechar-login-gestor"
            onClick={onClose}
            className="text-[#C4B7A6] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[#F3ECDD]/80 border border-[#3A2E1F]/10 rounded-xl p-3.5 text-xs text-[#554432] space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-[#3A2E1F]">
              <Lock className="w-3.5 h-3.5 text-[#B8623F]" />
              Identificação de Administrador
            </p>
            <p className="text-[11px] text-[#7E6C58]">
              Insira o e-mail e a senha cadastrados da gerência para gerenciar pedidos, fornadas e catálogo.
            </p>
          </div>

          {errorMessage && (
            <div
              id="admin-login-error"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="input-admin-email"
              className="block text-xs font-semibold text-[#3A2E1F]"
            >
              E-mail do Gestor
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E6C58]" />
              <input
                id="input-admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e-mail"
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#3A2E1F]/20 rounded-xl text-sm text-[#3A2E1F] placeholder:text-[#7E6C58]/60 focus:outline-none focus:ring-2 focus:ring-[#B8623F] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="input-admin-password"
                className="block text-xs font-semibold text-[#3A2E1F]"
              >
                Senha de Acesso
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E6C58]" />
              <input
                id="input-admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#3A2E1F]/20 rounded-xl text-sm text-[#3A2E1F] placeholder:text-[#7E6C58]/60 focus:outline-none focus:ring-2 focus:ring-[#B8623F] focus:border-transparent transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7E6C58] hover:text-[#3A2E1F] p-0.5 cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Helper Button for authorized account */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-[#7E6C58]">
            <button
              type="button"
              id="btn-preencher-credenciais-demo"
              onClick={handleFillCredentials}
              className="text-[#B8623F] hover:underline cursor-pointer font-medium"
            >
              Preencher credenciais da conta
            </button>
            <span className="text-[10px] text-[#7E6C58]/80">Segurança Ativa</span>
          </div>

          {/* Submit Button */}
          <button
            id="btn-submit-admin-login"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-[#B8623F] hover:bg-[#994E30] active:scale-[0.99] text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Validando Acesso...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Entrar no Painel do Gestor</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
