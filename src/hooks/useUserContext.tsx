import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserType = 'embarcador' | 'transportadora' | 'motorista' | null;
export type UserCargo = 'ADMIN' | 'OPERADOR' | null;

export interface Filial {
  id: number;
  nome: string | null;
  cnpj: string | null;
  hasAccess?: boolean; // true if the user has permission to access this branch
}

export interface Empresa {
  id: number;
  nome: string | null;
  cnpj_matriz: string | null;
  tipo: 'EMBARCADOR' | 'TRANSPORTADORA';
  classe: string;
  logo_url: string | null;
  comissao_hubfrete_percent: number | null;
}

export interface CompanyInfo {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  logo_url: string | null;
}

export interface UserContextData {
  userType: UserType;
  cargo: UserCargo;
  empresa: Empresa | null;
  availableEmpresas: Empresa[];
  companyInfo: CompanyInfo | null;
  filiais: Filial[];
  filialAtiva: Filial | null;
  loading: boolean;
  switchingFilial: boolean;
  setFilialAtiva: (filial: Filial) => void;
  switchEmpresa: (empresa: Empresa) => void;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextData | undefined>(undefined);

export function UserContextProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [userType, setUserType] = useState<UserType>(null);
  const [cargo, setCargo] = useState<UserCargo>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [availableEmpresas, setAvailableEmpresas] = useState<Empresa[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filialAtiva, setFilialAtivaState] = useState<Filial | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingFilial, setSwitchingFilial] = useState(false);

  // Store user's explicit access (which filiais they belong to)
  const [userAccessibleFilialIds, setUserAccessibleFilialIds] = useState<Set<number>>(new Set());

  const setFilialAtiva = useCallback((filial: Filial) => {
    // Only allow switching to filiais the user has access to
    if (!filial.hasAccess) {
      console.warn('User does not have access to this filial:', filial.id);
      return;
    }
    // Show loading briefly when switching
    setSwitchingFilial(true);
    setFilialAtivaState(filial);
    // Persist to localStorage for page refreshes
    localStorage.setItem('hubfrete_filial_ativa', JSON.stringify(filial));
    // Small delay to allow queries to refetch
    setTimeout(() => setSwitchingFilial(false), 500);
  }, []);

  const loadFiliaisForEmpresa = useCallback(async (empresaId: number, accessibleIds: Set<number>) => {
    const { data: allFiliais } = await supabase
      .from('filiais')
      .select('id, nome, cnpj')
      .eq('empresa_id', empresaId)
      .eq('ativa', true)
      .order('is_matriz', { ascending: false })
      .order('nome', { ascending: true });

    if (allFiliais) {
      const filiaisData = allFiliais.map(f => ({
        id: f.id,
        nome: f.nome,
        cnpj: f.cnpj,
        // Access is based solely on explicit filial assignments
        hasAccess: accessibleIds.has(f.id),
      }));

      setFiliais(filiaisData);

      // Try to restore filial ativa from localStorage, or use first ACCESSIBLE one
      const accessibleFiliais = filiaisData.filter(f => f.hasAccess);
      const storedFilial = localStorage.getItem('hubfrete_filial_ativa');
      let foundStored = false;

      if (storedFilial) {
        try {
          const parsed = JSON.parse(storedFilial);
          // Only allow restoring if user has access to it AND it belongs to current company
          const found = accessibleFiliais.find(f => f.id === parsed.id);
          if (found) {
            setFilialAtivaState(found);
            foundStored = true;
          }
        } catch {
          // ignore
        }
      }

      if (!foundStored) {
        if (accessibleFiliais.length > 0) {
          setFilialAtivaState(accessibleFiliais[0]);
        } else {
          setFilialAtivaState(null);
        }
      }
    }
  }, []);

  const switchEmpresa = useCallback(async (newEmpresa: Empresa) => {
    setSwitchingFilial(true);
    try {
      setEmpresa(newEmpresa);

      // Update User Type based on company type
      const type: UserType = newEmpresa.tipo === 'EMBARCADOR'
        ? 'embarcador'
        : newEmpresa.tipo === 'TRANSPORTADORA'
          ? 'transportadora'
          : null;
      setUserType(type);

      // Update Company Info
      setCompanyInfo({
        id: String(newEmpresa.id),
        razao_social: newEmpresa.nome || 'Empresa',
        nome_fantasia: newEmpresa.nome,
        cnpj: newEmpresa.cnpj_matriz || '',
        logo_url: newEmpresa.logo_url || null,
      });

      // Persist active company preference
      localStorage.setItem('hubfrete_empresa_id', String(newEmpresa.id));

      // Reload filiais for this company
      await loadFiliaisForEmpresa(newEmpresa.id, userAccessibleFilialIds);

    } finally {
      setSwitchingFilial(false);
    }
  }, [userAccessibleFilialIds, loadFiliaisForEmpresa]);

  const loadUserContext = useCallback(async () => {
    // IMPORTANT: depend only on userId so token refreshes don't reset UI state
    if (!userId) {
      setUserType(null);
      setCargo(null);
      setEmpresa(null);
      setAvailableEmpresas([]);
      setCompanyInfo(null);
      setFiliais([]);
      setFilialAtivaState(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Check if user is a motorista first
      const { data: motorista } = await supabase
        .from('motoristas')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (motorista) {
        setUserType('motorista');
        setLoading(false);
        return;
      }

      // Load company structure for embarcador/transportadora
      // Get Usuario record and their filiais
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select(`
          id,
          cargo,
          usuarios_filiais (
            cargo_na_filial,
            filial_id,
            filiais (
              id,
              nome,
              cnpj,
              empresa_id,
              empresas (
                id,
                nome,
                cnpj_matriz,
                tipo,
                classe,
                logo_url,
                comissao_hubfrete_percent
              )
            )
          )
        `)
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (usuarioData) {
        // Set cargo (highest privilege if multiple)
        const cargos = usuarioData.usuarios_filiais?.map((uf: any) => uf.cargo_na_filial) || [];
        const userCargo = cargos.includes('ADMIN') ? 'ADMIN' : cargos[0] as UserCargo;
        setCargo(userCargo);

        // Collect all accessible companies and filiais
        const companiesMap = new Map<number, Empresa>();
        const accessibleFiliais = new Set<number>();

        usuarioData.usuarios_filiais?.forEach((uf: any) => {
          if (uf.filiais) {
            accessibleFiliais.add(uf.filiais.id);
            if (uf.filiais.empresas) {
              const emp = uf.filiais.empresas;
              if (!companiesMap.has(emp.id)) {
                companiesMap.set(emp.id, {
                  id: emp.id,
                  nome: emp.nome,
                  cnpj_matriz: emp.cnpj_matriz,
                  tipo: emp.tipo,
                  classe: emp.classe,
                  logo_url: emp.logo_url,
                  comissao_hubfrete_percent: emp.comissao_hubfrete_percent ?? null,
                });
              }
            }
          }
        });

        const companies = Array.from(companiesMap.values());
        setAvailableEmpresas(companies);
        setUserAccessibleFilialIds(accessibleFiliais);

        // Determine active company
        let activeEmpresa: Empresa | null = null;
        const storedEmpresaId = localStorage.getItem('hubfrete_empresa_id');

        if (storedEmpresaId && companiesMap.has(Number(storedEmpresaId))) {
          activeEmpresa = companiesMap.get(Number(storedEmpresaId))!;
        } else if (companies.length > 0) {
          activeEmpresa = companies[0];
        }

        if (activeEmpresa) {
          // Initialize state for the active company
          setEmpresa(activeEmpresa);

          const type: UserType = activeEmpresa.tipo === 'EMBARCADOR'
            ? 'embarcador'
            : activeEmpresa.tipo === 'TRANSPORTADORA'
              ? 'transportadora'
              : null;
          setUserType(type);

          setCompanyInfo({
            id: String(activeEmpresa.id),
            razao_social: activeEmpresa.nome || 'Empresa',
            nome_fantasia: activeEmpresa.nome,
            cnpj: activeEmpresa.cnpj_matriz || '',
            logo_url: activeEmpresa.logo_url || null,
          });

          // Load filiais for the active company
          await loadFiliaisForEmpresa(activeEmpresa.id, accessibleFiliais);
        }
      }
    } catch (error) {
      console.error('Error loading user context:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, loadFiliaisForEmpresa]);

  useEffect(() => {
    if (!authLoading) {
      loadUserContext();
    }
  }, [authLoading, loadUserContext]);

  return (
    <UserContext.Provider
      value={{
        userType,
        cargo,
        empresa,
        availableEmpresas,
        companyInfo,
        filiais,
        filialAtiva,
        loading: authLoading || loading,
        switchingFilial,
        setFilialAtiva,
        switchEmpresa,
        refresh: loadUserContext,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return context;
}
