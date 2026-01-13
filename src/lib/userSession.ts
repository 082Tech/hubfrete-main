// User session management with user type
export type UserType = 'embarcador' | 'transportadora' | 'motorista';

export interface UserBranch {
  id: string;
  nome: string;
}

export interface UserCompany {
  id: string;
  nome: string;
  filiais: UserBranch[];
}

export interface UserSession {
  email: string;
  tipo: UserType;
  nome?: string;
  empresa?: UserCompany;
  filialAtiva?: UserBranch; // Filial selecionada atualmente
}

const USER_SESSION_KEY = 'hubfrete_user_session';

export function setUserSession(session: UserSession) {
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
}

export function getUserSession(): UserSession | null {
  const data = localStorage.getItem(USER_SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserSession;
  } catch {
    return null;
  }
}

export function clearUserSession() {
  localStorage.removeItem(USER_SESSION_KEY);
}

export function setActiveFilial(filial: UserBranch) {
  const session = getUserSession();
  if (session) {
    session.filialAtiva = filial;
    setUserSession(session);
  }
}

export function getRedirectByUserType(tipo: UserType): string {
  switch (tipo) {
    case 'embarcador':
      return '/embarcador';
    case 'transportadora':
      return '/transportadora';
    case 'motorista':
      return '/motorista';
    default:
      return '/login';
  }
}
