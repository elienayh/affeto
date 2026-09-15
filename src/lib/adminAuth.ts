// Admin Authentication Service - Acesso e Sessão do Painel de Gestão

const ADMIN_SESSION_KEY = 'affeto_admin_active_session';

export const adminAuth = {
  isAuthenticated: (): boolean => {
    try {
      const val = sessionStorage.getItem(ADMIN_SESSION_KEY);
      return val !== 'logged_out';
    } catch {
      return true;
    }
  },
  login: (): void => {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'active');
    } catch {
      // ignore
    }
  },
  logout: (): void => {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'logged_out');
    } catch {
      // ignore
    }
  },
};

