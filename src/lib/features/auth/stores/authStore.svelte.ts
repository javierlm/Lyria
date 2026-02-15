interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified?: boolean;
}

class AuthStore {
  session = $state<AuthSession | null>(null);
  user = $state<AuthUser | null>(null);

  setAuthState(payload: { session?: AuthSession; user?: AuthUser }): void {
    this.session = payload.session ?? null;
    this.user = payload.user ?? null;
  }

  get isAuthenticated(): boolean {
    return this.user !== null && this.session !== null;
  }
}

export const authStore = new AuthStore();
