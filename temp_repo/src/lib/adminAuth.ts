// Admin Authentication Service - Acesso e Sessão do Painel de Gestão

const ADMIN_SESSION_KEY = 'affeto_admin_active_session';
const ADMIN_USER_KEY = 'affeto_admin_user_email';

export const ADMIN_CREDENTIALS = {
  email: 'toledodias87@gmail.com',
  password: 'tamiris123',
};

export const adminAuth = {
  isAuthenticated: (): boolean => {
    try {
      const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
      return session === 'authenticated';
    } catch {
      return false;
    }
  },

  validateCredentials: (email: string, pass: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    return (
      cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase() &&
      cleanPass === ADMIN_CREDENTIALS.password
    );
  },

  login: (email: string, pass: string): { success: boolean; error?: string } => {
    if (adminAuth.validateCredentials(email, pass)) {
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
        sessionStorage.setItem(ADMIN_USER_KEY, email.trim().toLowerCase());
      } catch {
        // ignore storage quota error
      }
      return { success: true };
    }
    return {
      success: false,
      error: 'E-mail ou senha incorretos. Verifique suas credenciais de gestor.',
    };
  },

  logout: (): void => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_USER_KEY);
    } catch {
      // ignore
    }
  },

  getCurrentUser: (): string | null => {
    try {
      return sessionStorage.getItem(ADMIN_USER_KEY);
    } catch {
      return null;
    }
  },
};

