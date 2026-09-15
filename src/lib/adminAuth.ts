// Admin Authentication Service for Affeto Pães Artesanais

const AUTH_STORAGE_KEY = 'affeto_admin_credentials_v1';
const SESSION_STORAGE_KEY = 'affeto_admin_session_v1';

export interface AdminUser {
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  passwordHash: string; // Plain or hashed in storage
}

const DEFAULT_SUPER_ADMIN: AdminUser = {
  email: 'toledodias87@gmail.com',
  name: 'Super Admin',
  role: 'SUPER_ADMIN',
  passwordHash: 'tamiris123',
};

export const adminAuth = {
  getUser: (): AdminUser => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    // Initialize default credentials
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(DEFAULT_SUPER_ADMIN));
    return DEFAULT_SUPER_ADMIN;
  },

  login: (emailInput: string, passwordInput: string): { success: boolean; error?: string } => {
    const user = adminAuth.getUser();
    const cleanEmail = emailInput.trim().toLowerCase();
    const expectedEmail = user.email.trim().toLowerCase();

    if (cleanEmail !== expectedEmail) {
      return { success: false, error: 'E-mail não reconhecido como administrador do sistema.' };
    }

    if (passwordInput !== user.passwordHash) {
      return { success: false, error: 'Senha incorreta. Verifique suas credenciais.' };
    }

    // Save session
    try {
      const session = {
        email: user.email,
        name: user.name,
        role: user.role,
        token: `session-${Date.now()}`,
        loggedInAt: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }

    return { success: true };
  },

  isAuthenticated: (): boolean => {
    try {
      const session = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!session) return false;
      const parsed = JSON.parse(session);
      return !!parsed?.email;
    } catch {
      return false;
    }
  },

  getCurrentUser: (): { email: string; name: string; role: string } | null => {
    try {
      const session = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!session) return null;
      return JSON.parse(session);
    } catch {
      return null;
    }
  },

  changePassword: (currentPassword: string, newPassword: string): { success: boolean; error?: string } => {
    const user = adminAuth.getUser();

    if (currentPassword !== user.passwordHash) {
      return { success: false, error: 'A senha atual informada está incorreta.' };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    user.passwordHash = newPassword;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      return { success: false, error: 'Erro ao salvar a nova senha no armazenamento local.' };
    }

    return { success: true };
  },

  logout: (): void => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
